/**
 * Authentication API Routes
 * Handles Google OAuth login, callback, and token management
 */

import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { getSql } from '../lib/sql';

const router = express.Router();

// Google OAuth login
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
    session: false,
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { userId: (req.user as any).id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      console.log(`✅ OAuth callback successful for user ${(req.user as any).email}`);

      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
    }
  }
);

// Get current user (with JWT token)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const sql = getSql();
    const users = await sql`
      SELECT id, email, name, avatar_url as "avatarUrl"
      FROM users
      WHERE id = ${decoded.userId}
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error: any) {
    console.error('Auth /me error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  // Client-side will remove token from localStorage
  res.json({ message: 'Logged out successfully' });
});

export default router;
