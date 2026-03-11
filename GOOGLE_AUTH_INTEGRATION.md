# Google OAuth Integration Guide

Complete step-by-step guide to integrate Google OAuth authentication into Lumina Scope.

---

## Prerequisites

1. Google Cloud account
2. Existing Lumina Scope project running

---

## Part 1: Google Cloud Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a Project** → **New Project**
3. Enter project name: `Lumina Scope`
4. Click **Create**

### Step 2: Enable Google+ API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (for testing) or **Internal** (for organization only)
3. Click **Create**

**App Information**:
- App name: `Lumina Scope`
- User support email: Your email
- App logo: (optional - upload PetaSight logo)
- App domain: `localhost:3000` (for development)
- Authorized domains: (leave empty for localhost)
- Developer contact: Your email

4. Click **Save and Continue**

**Scopes**: Click **Save and Continue** (use default scopes)

**Test Users** (if External):
- Add your email and team emails
- Click **Save and Continue**

5. Click **Back to Dashboard**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Lumina Scope Web Client`

**Authorized JavaScript origins**:
```
http://localhost:3000
http://localhost:59673
http://127.0.0.1:3000
```

**Authorized redirect URIs**:
```
http://localhost:3000/api/auth/callback/google
http://localhost:59673/api/auth/callback/google
http://127.0.0.1:3000/api/auth/callback/google
```

5. Click **Create**
6. **IMPORTANT**: Copy the **Client ID** and **Client Secret** - you'll need these!

---

## Part 2: Backend Implementation

### Step 1: Install Dependencies

```bash
cd /home/nithya/app-lumina-scope/backend
npm install passport passport-google-oauth20 express-session jsonwebtoken
npm install --save-dev @types/passport @types/passport-google-oauth20 @types/express-session
```

### Step 2: Update Environment Variables

Edit `backend/.env`:
```bash
# Existing variables...

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/callback/google

# JWT Secret
JWT_SECRET=your-random-secret-key-here-generate-with-openssl
SESSION_SECRET=your-random-session-secret-here

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:3000
```

Generate secrets:
```bash
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For SESSION_SECRET
```

##


