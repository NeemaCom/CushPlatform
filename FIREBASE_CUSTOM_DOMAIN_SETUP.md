# Firebase Custom Authentication Domain

## Domains and purpose

- `app.we-cush.com` serves the Cush web application.
- `auth.we-cush.com` serves Firebase's authentication callback.

Keep the DNS for `app.we-cush.com` unchanged. Do not enable a redirect from
`auth.we-cush.com` to the app; Firebase must serve its handler path.

## Firebase Hosting

In the `cushportal` Firebase project, add `auth.we-cush.com` under Hosting
custom domains. Follow the exact DNS instructions displayed in Firebase and
wait for the domain and HTTPS certificate to be ready. DNS record types and
values must come from the Firebase setup screen; do not substitute guessed
records.

The handler endpoint was verified from the command line:

```text
https://auth.we-cush.com/__/auth/handler
HTTP 200 over HTTPS
```

## Firebase Authentication

In Authentication → Settings → Authorized domains, include both:

```text
app.we-cush.com
auth.we-cush.com
```

Keep the Firebase default authorized domain if it is still used by other
environments or flows.

## Google OAuth client

For the Google OAuth Web client used by Firebase, configure:

- Authorized JavaScript origin: `https://app.we-cush.com`
- Authorized redirect URI: `https://auth.we-cush.com/__/auth/handler`

Preserve any other origins and redirect URIs required for development.

## Application configuration and test

The app's Firebase config must use:

```ts
authDomain: "auth.we-cush.com"
```

After deploying, hard-refresh `https://app.we-cush.com`, run Google sign-in,
and verify that it returns to the app with the user signed in.