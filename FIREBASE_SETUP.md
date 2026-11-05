# Firebase Authentication Setup

## Production domains

- App: `https://app.we-cush.com`
- Firebase authentication handler: `https://auth.we-cush.com`
- Firebase project: `cushportal`

The app domain and auth-handler domain serve different purposes. Do not point
`app.we-cush.com` at Firebase Hosting or redirect `auth.we-cush.com` to the app.

## Firebase Authentication authorized domains

In Firebase Console → Authentication → Settings → Authorized domains, keep the
Firebase default domain and include:

- `app.we-cush.com`
- `auth.we-cush.com`

## Firebase Hosting custom domain

`auth.we-cush.com` must be configured as a Firebase Hosting custom domain so
Firebase can serve the OAuth handler at
`https://auth.we-cush.com/__/auth/handler`. DNS records must be the exact ones
shown by Firebase for the `auth` subdomain.

The handler URL was checked and returned HTTP 200 over HTTPS.

## Google OAuth client

In Google Cloud Console → APIs & Services → Credentials → the OAuth 2.0 Web
client used by Firebase, configure:

- Authorized JavaScript origin: `https://app.we-cush.com`
- Authorized redirect URI: `https://auth.we-cush.com/__/auth/handler`

Do not remove other required origins or redirect URIs used by development or
other Firebase environments.

## App configuration

The web app uses `auth.we-cush.com` as its Firebase `authDomain`. After
publishing, test Google sign-in on `https://app.we-cush.com` and confirm the
callback returns to the app and completes sign-in.