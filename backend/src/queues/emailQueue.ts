import { Queue } from 'bullmq';
import { redisConnection } from '../lib/redis';

export const EMAIL_QUEUE_NAME = 'email-send';

/**
 * The main BullMQ queue for email sending.
 * Jobs are added with a delay based on the scheduled time.
 * Redis persistence means jobs survive server restarts.
 */
export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs for visibility
    },
    removeOnFail: {
      count: 500,
    },
  },
});

export interface EmailJobData {
  emailId: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  senderEmail: string;
  etherealUser: string;
  etherealPass: string;
  idempotencyKey: string;
}
