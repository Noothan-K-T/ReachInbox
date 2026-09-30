import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { emailQueue } from '../queues/emailQueue';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/queue/stats
 * Get current BullMQ queue statistics.
 */
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
      emailQueue.getDelayedCount(),
    ]);

    res.json({
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
