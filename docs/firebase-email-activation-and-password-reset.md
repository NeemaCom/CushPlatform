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

## Firebase Console setup

In Firebase Console for the `cushportal` project:

1. Open **Authentication → Sign-in method** and ensure **Email/Password** is enabled.
2. Open **Authentication → Settings → Authorized domains** and add the exact website hosts used for the production frontend and any preview environment where email links will be tested. The link's return URL uses the current website origin.
3. Open **Authentication → Templates** and review the **Email address verification** and **Password reset** templates, including sender name and support contact.
4. Test both flows from the deployed website. Verification and reset emails should return to `/login` after Firebase completes the action.

No Supabase migration or application mail-provider secret is needed for these Firebase-managed emails. If Firebase rejects a return URL, add that host to Authorized domains and resend the link.
