import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { createEtherealAccount } from '../services/emailService';

const router = Router();
const googleClient = new OAuth2Client(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri
);

/**
 * GET /api/auth/google
 * Returns the Google OAuth authorization URL.
 */
router.get('/google', (_req: Request, res: Response) => {
  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });
  res.json({ url });
});

/**
 * GET /api/auth/google/callback
 * Handles the OAuth callback, creates/finds user, issues JWT.
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Missing authorization code' });
      return;
    }

    // Exchange code for tokens
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Get user info
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({ error: 'Failed to get user info' });
      return;
    }

    const { sub: googleId, name, email, picture } = payload;

    // Upsert user
    const user = await prisma.user.upsert({
      where: { googleId: googleId! },
      update: {
        name: name || '',
        email: email || '',
        avatar: picture || null,
      },
      create: {
        googleId: googleId!,
        name: name || '',
        email: email || '',
        avatar: picture || null,
      },
    });

    // Create a default Ethereal sender if user has none
    const existingSenders = await prisma.sender.findMany({
      where: { userId: user.id },
    });

    if (existingSenders.length === 0) {
      const ethereal = await createEtherealAccount();
      await prisma.sender.create({
        data: {
          userId: user.id,
          email: ethereal.email,
          etherealUser: ethereal.user,
          etherealPass: ethereal.pass,
          displayName: name || 'Default Sender',
        },
      });
    }

    // Issue JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Set httpOnly cookie and redirect to frontend
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.redirect(`${config.frontendUrl}/dashboard?token=${token}`);
  } catch (err: any) {
    console.error('[Auth] Google callback error:', err.message);
    res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
  }
});

/**
 * GET /api/auth/me
 * Returns the current authenticated user.
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/dev-login
 * Instant demo login for evaluation/local testing without Google credentials
 */
router.post('/dev-login', async (_req: Request, res: Response) => {
  try {
    const user = await prisma.user.upsert({
      where: { email: 'demo@reachinbox.ai' },
      update: {},
      create: {
        googleId: 'demo-user-12345',
        name: 'ReachInbox Demo User',
        email: 'demo@reachinbox.ai',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      },
    });

    // Ensure a default Ethereal sender exists
    const existingSenders = await prisma.sender.findMany({
      where: { userId: user.id },
    });

    if (existingSenders.length === 0) {
      try {
        const ethereal = await createEtherealAccount();
        await prisma.sender.create({
          data: {
            userId: user.id,
            email: ethereal.email,
            etherealUser: ethereal.user,
            etherealPass: ethereal.pass,
            displayName: 'ReachInbox Demo Sender',
          },
        });
      } catch (err: any) {
        console.warn('[DevLogin] Ethereal creation warning, creating fallback sender:', err.message);
        await prisma.sender.create({
          data: {
            userId: user.id,
            email: 'demo-outreach@reachinbox.ai',
            etherealUser: 'test_user',
            etherealPass: 'test_pass',
            displayName: 'ReachInbox Demo Sender',
          },
        });
      }
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token, user });
  } catch (err: any) {
    console.error('[DevLogin] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

export default router;
