import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';
import { SlackService } from '../services/slackService';

const router = Router();

/**
 * GET /api/slack/connect
 * Initiates Slack OAuth flow. Returns the authorization URL.
 */
router.get('/connect', authMiddleware, (req: AuthRequest, res: Response) => {
  // Encode userId in state for the callback
  const state = jwt.sign({ userId: req.userId }, config.jwt.secret, { expiresIn: '10m' });
  const url = SlackService.getAuthUrl(state);
  res.json({ url });
});

/**
 * GET /api/slack/callback
 * Handles Slack OAuth callback.
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      res.status(400).json({ error: 'Missing code or state' });
      return;
    }

    // Verify state token to get userId
    const decoded = jwt.verify(state, config.jwt.secret) as { userId: string };
    const userId = decoded.userId;

    // Exchange code for token
    const slackData = await SlackService.exchangeCode(code);

    // Upsert Slack connection
    await prisma.slackConnection.upsert({
      where: { userId },
      update: {
        accessToken: slackData.accessToken,
        teamId: slackData.teamId,
        teamName: slackData.teamName,
        webhookUrl: slackData.webhookUrl || null,
        channelId: slackData.channelId || null,
        connectedAt: new Date(),
      },
      create: {
        userId,
        accessToken: slackData.accessToken,
        teamId: slackData.teamId,
        teamName: slackData.teamName,
        webhookUrl: slackData.webhookUrl || null,
        channelId: slackData.channelId || null,
      },
    });

    // Redirect back to frontend
    res.redirect(`${config.frontendUrl}/dashboard?slack=connected`);
  } catch (err: any) {
    console.error('[Slack] Callback error:', err.message);
    res.redirect(`${config.frontendUrl}/dashboard?slack=error`);
  }
});

/**
 * GET /api/slack/status
 * Check if Slack is connected for the current user.
 */
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const connection = await prisma.slackConnection.findUnique({
      where: { userId: req.userId },
      select: {
        teamName: true,
        connectedAt: true,
      },
    });

    res.json({
      connected: !!connection,
      teamName: connection?.teamName || null,
      connectedAt: connection?.connectedAt || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/slack/disconnect
 * Disconnect Slack for the current user.
 */
router.post('/disconnect', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.slackConnection.deleteMany({
      where: { userId: req.userId },
    });

    res.json({ message: 'Slack disconnected' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
