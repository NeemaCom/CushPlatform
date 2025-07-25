# Production Deployment Configuration for https://portal.we-cush.com

## Firebase Configuration Updates

### ✅ Completed
- Updated Firebase `authDomain` from "cushportal.firebaseapp.com" to "portal.we-cush.com"
- Updated both `src/firebase.js` and `public/firebase-init-coordinator.js` configuration files
- PWA install prompt fixed to stop appearing after installation

### 🔧 Required Manual Configuration

#### 1. Firebase Console Configuration
Go to [Firebase Console](https://console.firebase.google.com/) → Project "cushportal" → Authentication → Settings → Authorized domains

**Add these domains:**
- `portal.we-cush.com`
- `www.portal.we-cush.com` (optional, for www redirect)

#### 1.1 Firebase Custom Domain Setup (For Custom Popup URL)
To display "portal.we-cush.com" in Google Sign-In popup instead of "cushportal.firebase.com":

Go to [Firebase Console](https://console.firebase.google.com/) → Project "cushportal" → Hosting → Custom domain

**Steps:**
1. Add custom domain: `portal.we-cush.com`
2. Complete DNS verification (TXT record)
3. Add A and AAAA records to DNS
4. Wait for SSL certificate provisioning (up to 24 hours)
5. Firebase will serve authentication flows from custom domain

#### 2. Google Cloud Console OAuth Client Configuration
Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client IDs

**Update the OAuth client with:**
- **Authorized JavaScript Origins:** `https://portal.we-cush.com`
- **Authorized Redirect URIs:** `https://portal.we-cush.com/__/auth/handler`

## Current Status

### ✅ Working Features
- Email/password authentication (login/signup)
- PWA functionality with proper install detection
- Imisi 2.0 chatbot with mobile-responsive interface
- User dashboard and all platform features
- Firebase Analytics integration

### ⏳ Pending Manual Setup
- Google OAuth authorization (requires Firebase Console and Google Cloud Console updates)
- Firebase Custom Domain setup for portal.we-cush.com (to show custom domain in popup)
- DNS configuration for custom domain pointing to Firebase
- Production domain SSL certificate (handled by deployment platform)

## Post-Deployment Verification

After deploying to `https://portal.we-cush.com`, verify:

1. **Google Sign-In:** Test Google authentication flow
2. **Custom Domain in Popup:** Confirm popup shows portal.we-cush.com URL
3. **PWA Installation:** Confirm install prompt behavior
4. **Analytics:** Check Firebase Analytics data collection
5. **Mobile Responsiveness:** Test on various devices
6. **SSL Certificate:** Ensure HTTPS is working properly

## Environment Variables

Ensure these are set in production:
- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - Google Gemini AI API key
- `NODE_ENV=production`

## Deployment Ready

The application is now configured for production deployment at `https://portal.we-cush.com` with proper Firebase authentication domain settings.