# Google OAuth Setup Documentation

## Overview
This document describes the Google OAuth 2.0 authentication setup for the Cush platform, enabling users to sign in with their Google accounts.

## Current Configuration

### Environment Variables
The following environment variables are configured for Google OAuth:

- `GOOGLE_CLIENT_ID`: Currently using `397927087684-js33ib9f5b1jebhvna7m2p2on4mk8vj4.apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET`: Configured and present

### OAuth Flow Implementation

#### 1. OAuth Initiation (`/api/auth/google`)
- Validates that both client ID and secret are present
- Constructs the appropriate redirect URI based on the environment (development/production)
- Redirects users to Google's OAuth authorization endpoint
- Includes scopes: `openid profile email`

#### 2. OAuth Callback (`/api/auth/google/callback`)
- Handles the authorization code returned by Google
- Exchanges the code for an access token
- Retrieves user profile information from Google
- Creates a new user account if one doesn't exist
- Establishes a session for the authenticated user

### Google Cloud Console Configuration

#### Required Settings:
1. **Authorized JavaScript Origins**:
   - Development: `http://localhost:5000`
   - Production: `https://[your-domain].replit.app`

2. **Authorized Redirect URIs**:
   - Development: `http://localhost:5000/api/auth/google/callback`
   - Production: `https://[your-domain].replit.app/api/auth/google/callback`

## Integration Points

### Frontend Integration
The Google OAuth is integrated into the authentication flow through:
- Sign-in page with "Continue with Google" button
- Registration page with Google OAuth option
- Automatic account creation and session establishment

### Backend Integration
- Express.js routes handle OAuth flow
- User storage integration for account creation/retrieval
- Session management for authenticated users

## Security Features

### Enhanced Error Handling
- Comprehensive validation of OAuth responses
- Detailed logging for debugging (client ID partially masked)
- User-friendly error messages for OAuth failures
- Fallback error handling for network issues

### Session Security
- Secure session establishment with user ID and role
- Activity tracking for session management
- Proper session cleanup on logout

## Testing and Debugging

### Debug Logging
The system includes comprehensive logging for:
- OAuth configuration validation
- Authorization URL construction
- Token exchange process
- User profile retrieval
- Account creation/login events

### Testing Endpoints
- Test OAuth initiation: `GET /api/auth/google`
- Monitor server logs for detailed OAuth flow information

## Error Handling

### Common Error Scenarios
1. **Missing Credentials**: Redirects to signin with config error
2. **Authorization Denied**: Handles user cancellation gracefully
3. **Token Exchange Failure**: Logs detailed error information
4. **Profile Retrieval Issues**: Comprehensive error logging
5. **Account Creation Failures**: Database error handling

### Error Messages
All OAuth errors redirect users to the signin page with appropriate error parameters for user feedback.

## Maintenance

### Updating Credentials
1. Update environment variables in Replit Secrets
2. Restart the application server
3. Verify OAuth flow with test authentication
4. Update Google Cloud Console settings if domain changes

### Monitoring
- Monitor server logs for OAuth-related errors
- Check Google Cloud Console for API usage and errors
- Validate redirect URI configurations match deployment URLs

## Current Status
✅ OAuth flow implemented and functional
✅ Enhanced error handling and logging
✅ User account creation and session management
✅ Frontend integration complete
✅ Security validations in place

## Next Steps
- Verify OAuth credentials are correctly updated
- Test complete authentication flow
- Monitor for any OAuth-related errors
- Update redirect URIs for production deployment

---
*Last Updated: July 9, 2025*
*Configuration: Development Environment*