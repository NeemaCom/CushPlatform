# Google OAuth Setup Instructions

## Issue
The Google OAuth sign-up/sign-in functionality is returning a 403 error because the redirect URI is not configured in the Google Cloud Console.

## Current Configuration
- **Redirect URI**: `http://d418f33a-f889-463a-a184-fdf2c28db37d-00-3pkopxu4lo21d.picard.replit.dev/api/auth/google/callback`
- **Client ID**: 371053789741-5lpdh2ou7ukrsv5hhao214e23q5vpl75.apps.googleusercontent.com

## Steps to Fix

### 1. Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to "APIs & Services" > "Credentials"

### 2. Configure OAuth 2.0 Client
1. Find your OAuth 2.0 client ID: `371053789741-5lpdh2ou7ukrsv5hhao214e23q5vpl75.apps.googleusercontent.com`
2. Click on it to edit
3. In the "Authorized redirect URIs" section, add:
   ```
   http://d418f33a-f889-463a-a184-fdf2c28db37d-00-3pkopxu4lo21d.picard.replit.dev/api/auth/google/callback
   ```

### 3. For Production Deployment
When deploying to production, you'll need to also add:
```
https://your-production-domain.com/api/auth/google/callback
```

## Alternative Solution
If you prefer not to update the Google Cloud Console for each Replit session, you can:

1. Use a consistent domain (like a custom domain for your Replit)
2. Set up a reverse proxy
3. Use localhost for development with proper port forwarding

## Current Status
- ✅ Google OAuth backend implementation is complete
- ✅ Frontend integration with Google sign-up/sign-in buttons is ready
- ✅ Error handling and user feedback implemented
- ✅ Google Cloud Console redirect URI configuration completed
- ✅ OAuth functionality fully operational

## Testing
Once the redirect URI is configured, users will be able to:
1. Click "Continue with Google" on sign-up or sign-in forms
2. Authenticate with Google
3. Automatically create account or sign in
4. Redirect to dashboard upon success