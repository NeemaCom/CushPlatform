# Firebase email activation and password reset

Cush uses Firebase Authentication for email/password accounts. Email verification and password-reset links are sent by Firebase; the app does not create or log its own reset tokens.

## Account activation

1. A new user accepts the required Terms and Privacy Policy and creates a Firebase account.
2. Cush records the account and consent as pending, but does not issue an application session.
3. Firebase sends a verification link. After the user verifies, they can return to Cush and continue to sign in.
4. The server verifies Firebase's signed `email_verified` claim before creating a session. Protected requests also reject unverified Firebase accounts.

Google sign-in continues to use Firebase's provider-reported email verification state.

## Password reset

The Sign In page's **Forgot password?** action calls Firebase's password-reset email service. Firebase's hosted action page validates the one-time code and updates the Firebase password, then returns the user to Sign In. Responses do not reveal whether an email address has an account.

## Delivery and end-to-end checks

These activation and password-reset messages are delivered by Firebase Authentication, not Resend. The Resend sender configured for Cush account-status notices does not change Firebase Auth's sender or templates.

Use a dedicated test inbox and account in the `cushportal` project:

1. Register with email/password and accepted required consent. Confirm the pending screen appears and no Cush dashboard session is created.
2. Check inbox and spam for Firebase's verification message. Open its link and confirm it returns to `/login?emailVerified=1`.
3. Try signing in before opening the link; it must remain pending. After opening the link, sign in again; the server must see Firebase's verified claim before it creates a Cush session.
4. Request a password reset for the test account, confirm the generic success message, open Firebase's reset link, and set a new password.
5. Confirm the new password signs in and the old password does not. Firebase validates and consumes the reset code; Cush never stores it.

Automated tests mock Firebase's mail service. They verify the request, continuation URL, generic reset response, and the server-side verified-claim gate; they do not deliver real email. Confirm inbox delivery with the dedicated test account before relying on production delivery.

## Firebase Console setup

In Firebase Console for the `cushportal` project:

1. Open **Authentication → Sign-in method** and ensure **Email/Password** is enabled.
2. Open **Authentication → Settings → Authorized domains** and add the exact website hosts used for the production frontend and any preview environment where email links will be tested. The link's return URL uses the current website origin.
3. Open **Authentication → Templates** and review the **Email address verification** and **Password reset** templates, including sender name and support contact.
4. Test both flows from the deployed website. Verification and reset emails should return to `/login` after Firebase completes the action.

No Supabase migration or application mail-provider secret is needed for these Firebase-managed emails. If Firebase rejects a return URL, add that host to Authorized domains and resend the link.
