export type FirebaseEmailAction = 'emailVerified' | 'passwordReset'

const PRODUCTION_APP_ORIGIN = 'https://app.we-cush.com'

export function getFirebaseEmailActionSettings(
  action: FirebaseEmailAction,
  currentOrigin: string,
  isProduction: boolean,
): { url: string } {
  const origin = isProduction ? PRODUCTION_APP_ORIGIN : currentOrigin
  const url = new URL('/login', origin)
  url.searchParams.set(action, '1')
  return { url: url.toString() }
}
