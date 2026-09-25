# Firebase Authentication setup

The browser app uses Firebase Authentication's email/password and Google popup flows (`src/firebase.ts` and `src/pages/Login.tsx`). The browser sends a Firebase ID token to `/api/auth/firebase-sync`; the Express server verifies its signature, audience, issuer, and expiry using Firebase Admin and `FIREBASE_PROJECT_ID` before creating a session.

Enable the desired providers and authorize the frontend hostname in the Firebase Authentication project. For local development, authorize `localhost`. The popup flow **does not** use `/api/auth/google` or `/api/auth/google/callback`; do not configure those as redirect URIs for this app.

The client Firebase config is public. Configure the server with the matching `FIREBASE_PROJECT_ID` (bundled client project: `cushportal`) and a private `SESSION_SECRET` using the host's environment settings. A matching email is not enough to attach a Firebase UID to an existing password account; that requires a separate, authenticated linking flow.