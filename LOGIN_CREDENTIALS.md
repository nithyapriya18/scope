# Lumina Scope - Login Credentials

## Hardcoded Demo Login

For testing and development, use these credentials:

- **Email**: `demo@lumina.com`
- **Password**: `demo123`

## User Information

- **Name**: Demo User
- **User ID**: `a14bc04f-7d40-4ad2-bcb8-ec0ea08b7da0`
- **Role**: user

## How to Use

1. Navigate to http://localhost:3000
2. Click "Sign In" or "Get Started"
3. Enter the credentials above
4. You'll be redirected to the dashboard

## Authentication Flow

- Login is handled by `/app/login/page.tsx`
- User info is stored in `localStorage` as `lumina_user`
- Protected routes (like `/dashboard`) check for authentication
- Header shows user name and logout button when logged in

## Logout

Click the "Logout" button in the header to sign out. This will:
- Clear localStorage
- Redirect to `/login`

---

**Note**: This is a temporary authentication system for MVP testing. Google OAuth integration is planned for Phase 1 completion.
