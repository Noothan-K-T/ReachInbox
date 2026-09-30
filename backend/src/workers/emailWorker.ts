import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData } from '../queues/emailQueue';
import { redisConnection } from '../lib/redis';
import { config } from '../config';
import prisma from '../lib/prisma';
import { sendEmail } from '../services/emailService';
import { RateLimiter } from '../services/rateLimiter';
import { SlackService } from '../services/slackService';
import { indexEmail } from '../lib/elasticsearch';

export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId, userId, senderId, recipient, subject, body, senderEmail, etherealUser, etherealPass } = job.data;

      // Idempotency check: guard against duplicate sends
      const email = await prisma.email.findUnique({ where: { id: emailId } });
      if (!email) {
        return;
      }
      if (email.status === 'SENT') {
        return;
      }

      // Check per-sender rate limit window
      const rateResult = await RateLimiter.tryConsume(senderId);
      if (!rateResult.allowed) {
        // Fire Slack alert asynchronously without failing email queue
        SlackService.notifyRateLimitHit({
          userId,
          senderEmail,
          currentCount: rateResult.count,
          limit: rateResult.limit,
          hourWindow: new Date().toISOString().slice(0, 13),
        }).catch(() => {});

        // Re-queue for next rate window instead of discarding
        await job.moveToDelayed(Date.now() + (rateResult.retryAfterMs || 60000), job.token);
        throw new Error('RATE_LIMITED');
      }

      await prisma.email.update({
        where: { id: emailId },
        data: { status: 'PROCESSING' },
      });

      // Throttle gap between sends
      const delayMs = config.worker.emailMinDelayMs;
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      try {
        const result = await sendEmail({
          from: senderEmail,
          to: recipient,
          subject,
          html: body,
          etherealUser,
          etherealPass,
        });

        const updatedEmail = await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
          include: { sender: true },
        });

        await indexEmail({
          id: updatedEmail.id,
          userId: updatedEmail.userId,
          senderId: updatedEmail.senderId,
          senderEmail: updatedEmail.sender.email,
          recipient: updatedEmail.recipient,
          subject: updatedEmail.subject,
          body: updatedEmail.body,
          status: 'SENT',
          scheduledAt: updatedEmail.scheduledAt.toISOString(),
          sentAt: updatedEmail.sentAt?.toISOString() || null,
          batchId: updatedEmail.batchId,
          createdAt: updatedEmail.createdAt.toISOString(),
        });
      } catch (smtpError: any) {
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'FAILED',
            failureReason: smtpError.message,
          },
        });

        const failedEmail = await prisma.email.findUnique({
          where: { id: emailId },
          include: { sender: true },
        });

        if (failedEmail) {
          await indexEmail({
            id: failedEmail.id,
            userId: failedEmail.userId,
            senderId: failedEmail.senderId,
            senderEmail: failedEmail.sender.email,
            recipient: failedEmail.recipient,
            subject: failedEmail.subject,
            body: failedEmail.body,
            status: 'FAILED',
            scheduledAt: failedEmail.scheduledAt.toISOString(),
            sentAt: null,
            batchId: failedEmail.batchId,
            createdAt: failedEmail.createdAt.toISOString(),
          });
        }

        throw smtpError;
      }
    },
    {
      connection: redisConnection,
      concurrency: config.worker.concurrency,
      limiter: {
        max: 10,
        duration: config.worker.emailMinDelayMs * 10,
      },
    }
  );

  worker.on('failed', (job, err) => {
    if (err.message === 'RATE_LIMITED') {
      console.log(`Job ${job?.id} re-delayed due to rate limit window`);
    } else {
      console.error(`Job ${job?.id} failed:`, err.message);
    }
  });

  return worker;
}
