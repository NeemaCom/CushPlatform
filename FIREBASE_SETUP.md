# Firebase Authentication Setup Instructions - Production Configuration

## Production Domain Configuration

### 1. Firebase Console Configuration Required
Go to [Firebase Console](https://console.firebase.google.com/) → Select "cushportal" project → Authentication → Settings → Authorized domains

**Production Configuration:**
- **Authorized JavaScript Origins:** `https://portal.we-cush.com`
- **Authorized Redirect URIs:** `https://portal.we-cush.com/__/auth/handler`

### 1.1 Firebase Custom Domain Setup (Required for Custom URL in Popup)
To show "portal.we-cush.com" instead of "cushportal.firebase.com" in the Google Sign-In popup:

Go to [Firebase Console](https://console.firebase.google.com/) → Project "cushportal" → Hosting → Custom domain

**Add Custom Domain:**
1. Click "Add custom domain"
2. Enter: `portal.we-cush.com`
3. Follow DNS verification steps (add TXT record to your domain DNS)
4. Add A and AAAA records provided by Firebase to point portal.we-cush.com to Firebase hosting
5. Wait for SSL certificate provisioning (can take up to 24 hours)

### 2. Google Cloud Console OAuth Configuration Required
Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client IDs

**Required Settings:**
- **Authorized JavaScript Origins:** `https://portal.we-cush.com`
- **Authorized Redirect URIs:** `https://portal.we-cush.com/__/auth/handler`

### 3. Current Firebase Configuration
- **Project ID:** cushportal
- **API Key:** AIzaSyD06ZHGJlv-1g0WqfymtGkiHAHeX1O1UGI
- **Auth Domain:** portal.we-cush.com (Updated for production)
- **App ID:** 1:304174661302:web:8bc1e5f413aae91336f017

### 3. What Works Now
- ✅ Email/password authentication (both login and signup)
- ✅ Password reset functionality
- ✅ User synchronization with backend database
- ✅ Automatic redirect to dashboard after authentication
- ✅ Enhanced error handling with Firebase-specific messages

### 4. What Needs Domain Authorization
- ❌ Google Sign-In (requires domain authorization)
- ❌ Google Sign-Up (requires domain authorization)

## Temporary Workaround
The system now shows a clear error message: "Google Sign-In is temporarily unavailable. Please use email/password authentication or contact support. Domain authorization is pending."

## Test Accounts Available
- **Demo Account:** demo@cush.com / demo123
- **Admin Account:** admin@cush.com / admin123
- **Customer Account:** customer@cush.com / customer123

## Current Status
- Firebase authentication is fully integrated
- Email/password authentication works perfectly
- Google OAuth requires domain authorization in Firebase console
- All error handling is comprehensive with user-friendly messages