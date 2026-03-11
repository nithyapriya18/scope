/**
 * Authentication Service
 * Handles Google OAuth and user session management
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getSql } from '../lib/sql';

export function setupPassport() {
  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const sql = getSql();

          // Check if user exists
          const existingUser = await sql`
            SELECT * FROM users WHERE google_id = ${profile.id}
          `;

          if (existingUser.length > 0) {
            // User exists, return it
            console.log(`✅ Existing user logged in: ${existingUser[0].email}`);
            return done(null, existingUser[0]);
          }

          // Create new user
          const newUser = await sql`
            INSERT INTO users (
              google_id,
              email,
              name,
              avatar_url,
              created_at,
              updated_at
            ) VALUES (
              ${profile.id},
              ${profile.emails?.[0]?.value || null},
              ${profile.displayName || null},
              ${profile.photos?.[0]?.value || null},
              now(),
              now()
            )
            RETURNING *
          `;

          console.log(`✅ New user created: ${newUser[0].email}`);
          return done(null, newUser[0]);
        } catch (error) {
          console.error('Google OAuth error:', error);
          return done(error as Error);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const sql = getSql();
      const users = await sql`SELECT * FROM users WHERE id = ${id}`;
      done(null, users[0] || null);
    } catch (error) {
      done(error);
    }
  });
}
