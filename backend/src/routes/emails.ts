import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';
import { emailQueue, EmailJobData } from '../queues/emailQueue';
import { indexEmail } from '../lib/elasticsearch';
import { searchEmails } from '../lib/elasticsearch';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All email routes require authentication
router.use(authMiddleware);

/**
 * POST /api/emails/schedule
 *
 * Schedule a batch of emails to be sent.
 * Creates DB records and BullMQ delayed jobs.
 *
 * Body:
 * {
 *   senderId: string,
 *   recipients: string[],
 *   subject: string,
 *   body: string,
 *   scheduledAt: string (ISO date),
 *   delayBetweenEmails: number (seconds),
 *   hourlyLimit?: number
 * }
 */
router.post('/schedule', async (req: AuthRequest, res: Response) => {
  try {
    const { senderId, recipients, subject, body, scheduledAt, delayBetweenEmails = 2 } = req.body;
    const userId = req.userId!;

    // Validate
    if (!senderId || !recipients?.length || !subject || !body || !scheduledAt) {
      res.status(400).json({ error: 'Missing required fields: senderId, recipients, subject, body, scheduledAt' });
      return;
    }

    // Verify sender belongs to user
    const sender = await prisma.sender.findFirst({
      where: { id: senderId, userId },
    });

    if (!sender) {
      res.status(404).json({ error: 'Sender not found or does not belong to you' });
      return;
    }

    const batchId = uuidv4();
    const baseTime = new Date(scheduledAt).getTime();
    const now = Date.now();

    const createdEmails = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i].trim();
      if (!recipient) continue;

      // Calculate the scheduled time for this email:
      // Base time + (index * delay between emails)
      const emailScheduledAt = new Date(baseTime + i * delayBetweenEmails * 1000);

      // Generate a unique idempotency key
      const idempotencyKey = `${batchId}:${recipient}:${subject}`;

      // Check for existing email with same idempotency key (prevent duplicates)
      const existing = await prisma.email.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        console.log(`[Schedule] Duplicate detected for ${recipient}, skipping`);
        continue;
      }

      // Create DB record
      const email = await prisma.email.create({
        data: {
          userId,
          senderId: sender.id,
          recipient,
          subject,
          body,
          scheduledAt: emailScheduledAt,
          status: 'SCHEDULED',
          idempotencyKey,
          batchId,
        },
      });

      // Calculate delay for BullMQ job
      const delayMs = Math.max(0, emailScheduledAt.getTime() - now);

      // Create BullMQ delayed job
      const jobData: EmailJobData = {
        emailId: email.id,
        userId,
        senderId: sender.id,
        recipient,
        subject,
        body,
        senderEmail: sender.email,
        etherealUser: sender.etherealUser,
        etherealPass: sender.etherealPass,
        idempotencyKey,
      };

      const job = await emailQueue.add(`send-${email.id}`, jobData, {
        delay: delayMs,
        jobId: email.id, // Use email ID as job ID for deduplication
      });

      // Update email with BullMQ job ID
      await prisma.email.update({
        where: { id: email.id },
        data: { bullJobId: job.id },
      });

      // Index in Elasticsearch
      await indexEmail({
        id: email.id,
        userId,
        senderId: sender.id,
        senderEmail: sender.email,
        recipient,
        subject,
        body,
        status: 'SCHEDULED',
        scheduledAt: emailScheduledAt.toISOString(),
        sentAt: null,
        batchId,
        createdAt: email.createdAt.toISOString(),
      });

      createdEmails.push(email);
    }

    res.status(201).json({
      message: `${createdEmails.length} emails scheduled successfully`,
      batchId,
      count: createdEmails.length,
      emails: createdEmails.map((e) => ({
        id: e.id,
        recipient: e.recipient,
        scheduledAt: e.scheduledAt,
        status: e.status,
      })),
    });
  } catch (err: any) {
    console.error('[Schedule] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/emails/upload-csv
 * Upload a CSV file and extract email addresses.
 */
router.post('/upload-csv', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const content = req.file.buffer.toString('utf-8');

    // Extract email addresses using regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = content.match(emailRegex) || [];

    // Deduplicate
    const uniqueEmails = [...new Set(matches.map((e) => e.toLowerCase()))];

    res.json({
      count: uniqueEmails.length,
      emails: uniqueEmails,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/scheduled
 * Get all scheduled (pending) emails for the current user.
 */
router.get('/scheduled', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: {
          userId: req.userId,
          status: { in: ['SCHEDULED', 'PROCESSING'] },
        },
        include: {
          sender: { select: { email: true, displayName: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.email.count({
        where: {
          userId: req.userId,
          status: { in: ['SCHEDULED', 'PROCESSING'] },
        },
      }),
    ]);

    res.json({ emails, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/sent
 * Get all sent emails for the current user.
 */
router.get('/sent', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: {
          userId: req.userId,
          status: { in: ['SENT', 'FAILED'] },
        },
        include: {
          sender: { select: { email: true, displayName: true } },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.email.count({
        where: {
          userId: req.userId,
          status: { in: ['SENT', 'FAILED'] },
        },
      }),
    ]);

    res.json({ emails, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/search
 * Search emails using Elasticsearch.
 */
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const status = req.query.status as string | undefined;
    const from = parseInt(req.query.from as string) || 0;
    const size = parseInt(req.query.size as string) || 50;

    const results = await searchEmails(req.userId!, query, status, from, size);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/senders/list
 * Also support /api/emails/senders
 * Get all senders for the current user.
 */
router.get(['/senders', '/senders/list'], async (req: AuthRequest, res: Response) => {
  try {
    const senders = await prisma.sender.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
      },
    });

    res.json({ senders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/:id
 * Get a single email by ID.
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const email = await prisma.email.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        sender: { select: { email: true, displayName: true } },
      },
    });

    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    res.json({ email });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/emails/senders
 * Create a new Ethereal sender.
 */
router.post('/senders', async (req: AuthRequest, res: Response) => {
  try {
    const { displayName } = req.body;

    // Create Ethereal account
    const { createEtherealAccount } = await import('../services/emailService');
    const ethereal = await createEtherealAccount();

    const sender = await prisma.sender.create({
      data: {
        userId: req.userId!,
        email: ethereal.email,
        etherealUser: ethereal.user,
        etherealPass: ethereal.pass,
        displayName: displayName || 'Sender',
      },
    });

    res.status(201).json({
      sender: {
        id: sender.id,
        email: sender.email,
        displayName: sender.displayName,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
