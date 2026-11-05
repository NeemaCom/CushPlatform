import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import type { User as FirebaseUser } from 'firebase/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from '@/lib/api-base'
import {
  auth,
  googleProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
  signOut,
} from '@/firebase.js'
import { LOGIN_SUPPORT_EMAIL } from '@shared/auth-constants'

type GoogleSignInDiagnostic = {
  stage: string
  code: string
  message: string
  appOrigin: string
  authDomain: string
  projectId: string
  callbackUrl: string
}

type GoogleRedirectIntent = {
  mode: 'signin' | 'signup'
  marketingConsent: boolean
}

const GOOGLE_REDIRECT_INTENT_KEY = 'cush.google-signin-intent'

function isMobileAuthBrowser() {
  return typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

function clearGoogleRedirectIntent() {
  try {
    sessionStorage.removeItem(GOOGLE_REDIRECT_INTENT_KEY)
  } catch {
    // Storage may be unavailable in a restricted browser context.
  }
}

function readGoogleRedirectIntent(): GoogleRedirectIntent | null {
  try {
    const value = sessionStorage.getItem(GOOGLE_REDIRECT_INTENT_KEY)
    if (!value) return null
    const parsed = JSON.parse(value)
    if ((parsed.mode !== 'signin' && parsed.mode !== 'signup') || typeof parsed.marketingConsent !== 'boolean') {
      clearGoogleRedirectIntent()
      return null
    }
    return parsed
  } catch {
    clearGoogleRedirectIntent()
    return null
  }
}

function safeDiagnosticText(value: unknown, fallback: string) {
  return String(value ?? fallback)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted email]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[redacted URL]')
    .replace(/\beyJ[a-zA-Z0-9._-]{20,}\b/g, '[redacted token]')
    .replace(/\bBearer\s+[a-zA-Z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
    .slice(0, 240)
}

function createGoogleSignInDiagnostic(stage: string, error: unknown): GoogleSignInDiagnostic {
  const authError = error && typeof error === 'object'
    ? error as { code?: unknown; message?: unknown }
    : {}
  const authOptions = auth?.app?.options
  const authDomain = authOptions?.authDomain || 'not configured'

  return {
    stage,
    code: safeDiagnosticText(authError.code, 'not provided'),
    message: safeDiagnosticText(authError.message, 'No error message provided'),
    appOrigin: window.location.origin,
    authDomain,
    projectId: authOptions?.projectId || 'not configured',
    callbackUrl: authDomain === 'not configured'
      ? 'not available'
      : `https://${authDomain}/__/auth/handler`,
  }
}

function formatGoogleSignInDiagnostic(diagnostic: GoogleSignInDiagnostic) {
  return [
    'Cush Google sign-in diagnostic',
    `Stage: ${diagnostic.stage}`,
    `Error code: ${diagnostic.code}`,
    `Message: ${diagnostic.message}`,
    `App origin: ${diagnostic.appOrigin}`,
    `Firebase auth domain: ${diagnostic.authDomain}`,
    `Expected callback: ${diagnostic.callbackUrl}`,
    `Firebase project: ${diagnostic.projectId}`,
  ].join('\n')
}

function getAuthActionSettings(returnTo: 'emailVerified' | 'passwordReset') {
  const url = new URL('/login', window.location.origin)
  url.searchParams.set(returnTo, '1')
  return { url: url.toString() }
}

async function firebaseSync(fbUser: { getIdToken: () => Promise<string> }, extra?: Record<string, unknown>) {
  const idToken = await fbUser.getIdToken()
  const res = await fetch(`${API_BASE_URL}/api/auth/firebase-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      idToken,
      ...extra,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
      const error = new Error(body.message || body.error || 'Auth failed') as Error & {
      requiresEmailVerification?: boolean
        code?: string
    }
    error.requiresEmailVerification = body.requiresEmailVerification === true
      error.code = body.code
    throw error
  }
  return body
}

export default function Login() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const [loading, setLoading] = useState(false)
  const [pendingVerificationUser, setPendingVerificationUser] = useState<FirebaseUser | null>(null)
  const [passwordLoginPending, setPasswordLoginPending] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [signInMessage, setSignInMessage] = useState<{ text: string; support: boolean } | null>(null)
  const [googleSignInDiagnostic, setGoogleSignInDiagnostic] = useState<GoogleSignInDiagnostic | null>(null)
  const [diagnosticCopied, setDiagnosticCopied] = useState(false)
  const [resetLinkSent, setResetLinkSent] = useState(false)
  const [consent, setConsent] = useState({ terms: false, privacy: false, marketing: false })
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('emailVerified') === '1') {
      toast({ title: 'Email verified', description: 'Sign in to activate your Cush account.' })
    }
    if (params.get('passwordReset') === '1') {
      toast({ title: 'Password updated', description: 'Sign in using your new password.' })
    }
  }, [toast])

  useEffect(() => {
    const intent = readGoogleRedirectIntent()
    if (!intent) return
    const redirectIntent: GoogleRedirectIntent = { ...intent }

    clearGoogleRedirectIntent()
    setMode(redirectIntent.mode)
    let stage = 'Reading Google redirect result'

    async function completeRedirectSignIn() {
      setLoading(true)
      setGoogleSignInDiagnostic(null)
      setDiagnosticCopied(false)
      try {
        const result = await getRedirectResult(auth)
        if (!result) {
          toast({
            title: 'Google sign-in was cancelled',
            description: 'You can try again whenever you’re ready.',
          })
          return
        }

        const fbUser = result.user
        stage = 'Refreshing Google account'
        await reload(fbUser)

        if (!fbUser.emailVerified) {
          if (redirectIntent.mode === 'signup') {
            stage = 'Syncing new Google account'
            try {
              const syncResult = await firebaseSync(fbUser, {
                acceptTerms: true,
                acceptPrivacy: true,
                marketingConsent: redirectIntent.marketingConsent,
              })
              if (!syncResult.requiresEmailVerification) {
                throw new Error('Email verification is required before signing in.')
              }
            } catch (syncError: any) {
              if (!syncError.requiresEmailVerification) throw syncError
            }
          }

          showVerificationPending(fbUser)
          try {
            stage = 'Sending verification email'
            await sendEmailVerification(fbUser, getAuthActionSettings('emailVerified'))
          } catch (sendError: any) {
            setGoogleSignInDiagnostic(createGoogleSignInDiagnostic(stage, sendError))
            toast({
              title: 'Verification email not sent',
              description: sendError.code === 'auth/unauthorized-continue-uri'
                ? 'Add this website domain to Firebase Authentication’s authorized domains, then resend the link.'
                : sendError.message || 'Please try resending the verification email.',
              variant: 'destructive',
            })
          }
          return
        }

        stage = 'Refreshing Firebase sign-in token'
        await fbUser.getIdToken(true)
        stage = 'Syncing Google account with Cush'
        await firebaseSync(fbUser, redirectIntent.mode === 'signup'
          ? {
              acceptTerms: true,
              acceptPrivacy: true,
              marketingConsent: redirectIntent.marketingConsent,
            }
          : undefined)
        stage = 'Finishing sign-in'
        await afterLogin()
      } catch (err: any) {
        setGoogleSignInDiagnostic(createGoogleSignInDiagnostic(stage, err))
        if (err.code === 'PERMANENT_ACCOUNT_LOCK' || err.code === 'TEMPORARY_ACCOUNT_LOCK') {
          setSignInMessage({
            text: err.message,
            support: err.code === 'PERMANENT_ACCOUNT_LOCK',
          })
          return
        }
        toast({ title: 'Google sign-in failed', description: err.message, variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    void completeRedirectSignIn()
  }, [toast])

  function showVerificationPending(user: FirebaseUser) {
    setPendingVerificationUser(user)
    setPasswordLoginPending(false)
    setVerificationEmail(user.email || form.email)
  }

  function hasRequiredConsent() {
    if (consent.terms && consent.privacy) return true
    toast({
      title: 'Consent required',
      description: 'Please accept the Terms of Service and Privacy Policy to create an account.',
      variant: 'destructive',
    })
    return false
  }

  async function afterLogin() {
    await qc.invalidateQueries({ queryKey: ['/api/auth/me'] })
    setLocation('/dashboard')
  }

  async function handleGoogle() {
    if (mode === 'signup' && !hasRequiredConsent()) return

    let stage = isMobileAuthBrowser() ? 'Starting mobile Google redirect' : 'Opening Google sign-in'
    setGoogleSignInDiagnostic(null)
    setDiagnosticCopied(false)
    setLoading(true)
    try {
      if (isMobileAuthBrowser()) {
        sessionStorage.setItem(GOOGLE_REDIRECT_INTENT_KEY, JSON.stringify({
          mode,
          marketingConsent: consent.marketing,
        }))
        await signInWithRedirect(auth, googleProvider)
        return
      }

      const result = await signInWithPopup(auth, googleProvider)
      const fbUser = result.user
      stage = 'Refreshing Google account'
      await reload(fbUser)
      if (!fbUser.emailVerified) {
        if (mode === 'signup') {
          stage = 'Syncing new Google account'
          try {
            const syncResult = await firebaseSync(fbUser, {
              acceptTerms: true,
              acceptPrivacy: true,
              marketingConsent: consent.marketing,
            })
            if (!syncResult.requiresEmailVerification) {
              throw new Error('Email verification is required before signing in.')
            }
          } catch (syncError: any) {
            if (!syncError.requiresEmailVerification) throw syncError
          }
        }
        showVerificationPending(fbUser)
        try {
          stage = 'Sending verification email'
          await sendEmailVerification(fbUser, getAuthActionSettings('emailVerified'))
        } catch (sendError: any) {
          setGoogleSignInDiagnostic(createGoogleSignInDiagnostic(stage, sendError))
          toast({
            title: 'Verification email not sent',
            description: sendError.code === 'auth/unauthorized-continue-uri'
              ? 'Add this website domain to Firebase Authentication’s authorized domains, then resend the link.'
              : sendError.message || 'Please try resending the verification email.',
            variant: 'destructive',
          })
        }
        return
      }
      stage = 'Refreshing Firebase sign-in token'
      await fbUser.getIdToken(true)
      stage = 'Syncing Google account with Cush'
      await firebaseSync(fbUser, mode === 'signup'
        ? {
            acceptTerms: true,
            acceptPrivacy: true,
            marketingConsent: consent.marketing,
          }
        : undefined)
      stage = 'Finishing sign-in'
      await afterLogin()
    } catch (err: any) {
      clearGoogleRedirectIntent()
      setGoogleSignInDiagnostic(createGoogleSignInDiagnostic(stage, err))
      if (err.code === 'PERMANENT_ACCOUNT_LOCK' || err.code === 'TEMPORARY_ACCOUNT_LOCK') {
        setSignInMessage({
          text: err.message,
          support: err.code === 'PERMANENT_ACCOUNT_LOCK',
        })
        return
      }
      toast({ title: 'Google sign-in failed', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function performPasswordSignIn() {
    const response = await fetch(`${API_BASE_URL}/api/auth/password-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: form.email.trim(), password: form.password }),
    })
    const body = await response.json().catch(() => ({}))

    if (body.requiresEmailVerification === true) {
      setPendingVerificationUser(null)
      setPasswordLoginPending(true)
      setVerificationEmail(body.email || form.email.trim())
      setSignInMessage(body.verificationEmailSent
        ? null
        : { text: 'We could not send the activation email. Try resending it, or contact support if this continues.', support: true })
      if (body.verificationEmailSent) {
        toast({
          title: 'Verify your email',
          description: `We sent an activation link to ${body.email || form.email.trim()}.`,
        })
      }
      return
    }

    if (!response.ok) {
      setSignInMessage({
        text: body.message || 'Sign-in could not be completed. Please try again.',
        support: body.code === 'PERMANENT_ACCOUNT_LOCK',
      })
      return
    }

    setSignInMessage(null)
    setPasswordLoginPending(false)
    await afterLogin()
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    setSignInMessage(null)
    setLoading(true)
    try {
      await performPasswordSignIn()
    } catch (err: any) {
      toast({
        title: 'Sign-in unavailable',
        description: err.message || 'Please check your connection and try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!hasRequiredConsent()) return

    setLoading(true)
    try {
      const result = await createUserWithEmailAndPassword(auth, form.email, form.password)
      const syncResult = await firebaseSync(result.user, {
        firstName: form.firstName,
        lastName: form.lastName,
        acceptTerms: true,
        acceptPrivacy: true,
        marketingConsent: consent.marketing,
      })
      if (!result.user.emailVerified || syncResult.requiresEmailVerification) {
        showVerificationPending(result.user)
        try {
          await sendEmailVerification(result.user, getAuthActionSettings('emailVerified'))
          toast({
            title: 'Check your email',
            description: `We sent an activation link to ${result.user.email || form.email}.`,
          })
        } catch (sendError: any) {
          toast({
            title: 'Verification email not sent',
            description: sendError.code === 'auth/unauthorized-continue-uri'
              ? 'Add this website domain to Firebase Authentication’s authorized domains, then resend the link.'
              : sendError.message || 'Please try resending the verification email.',
            variant: 'destructive',
          })
        }
        return
      }
      toast({ title: 'Account created!', description: 'Welcome to Cush Passport.' })
      await afterLogin()
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'An account with this email already exists.'
          : err.code === 'auth/weak-password'
          ? 'Password must be at least 6 characters.'
          : err.code === 'auth/password-does-not-meet-requirements'
          ? 'Password needs upper & lowercase letters, a number, and a special character.'
          : err.message
      toast({ title: 'Sign-up failed', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleResendVerification() {
    if (passwordLoginPending) {
      setLoading(true)
      try {
        await performPasswordSignIn()
      } catch (err: any) {
        toast({
          title: 'Could not resend verification email',
          description: err.message || 'Please try again shortly.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
      return
    }
    const user = pendingVerificationUser || auth.currentUser
    if (!user) {
      toast({ title: 'Sign in to resend', description: 'Enter your email and password, then choose resend verification.' })
      setPendingVerificationUser(null)
      setMode('signin')
      return
    }

    setLoading(true)
    try {
      await reload(user)
      if (user.emailVerified) {
        await handleContinueAfterVerification(user)
        return
      }
      await sendEmailVerification(user, getAuthActionSettings('emailVerified'))
      toast({
        title: 'Verification link sent',
        description: `Check ${user.email || verificationEmail} for the activation link.`,
      })
    } catch (err: any) {
      toast({
        title: 'Could not send verification link',
        description: err.code === 'auth/unauthorized-continue-uri'
          ? 'Add this website domain to Firebase Authentication’s authorized domains.'
          : err.message || 'Please try again shortly.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleContinueAfterVerification(user = pendingVerificationUser) {
    if (!user && passwordLoginPending) {
      setLoading(true)
      try {
        await performPasswordSignIn()
      } catch (err: any) {
        toast({
          title: 'Account activation failed',
          description: err.message || 'Please sign in again after verifying your email.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
      return
    }
    if (!user) return
    setLoading(true)
    try {
      await reload(user)
      if (!user.emailVerified) {
        toast({
          title: 'Verification not detected yet',
          description: 'Open the link in your email, then try this button again.',
          variant: 'destructive',
        })
        return
      }
      await user.getIdToken(true)
      await firebaseSync(user)
      setPendingVerificationUser(null)
      await afterLogin()
    } catch (err: any) {
      toast({
        title: 'Account activation failed',
        description: err.message || 'Sign in again after verifying your email.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleUseAnotherAccount() {
    setLoading(true)
    try {
      await signOut(auth)
      setPendingVerificationUser(null)
      setPasswordLoginPending(false)
      setSignInMessage(null)
      setVerificationEmail('')
      setMode('signin')
      setForm({ email: '', password: '', firstName: '', lastName: '' })
    } catch (err: any) {
      toast({ title: 'Could not switch accounts', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSendPasswordReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, form.email.trim(), getAuthActionSettings('passwordReset'))
      setResetLinkSent(true)
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        setResetLinkSent(true)
      } else {
        toast({
          title: 'Could not send reset link',
          description: err.code === 'auth/unauthorized-continue-uri'
            ? 'Add this website domain to Firebase Authentication’s authorized domains.'
            : err.message || 'Please try again shortly.',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center">
          <img
            src="/cush-wordmark.png"
            alt="Cush Passport"
            className="mx-auto mb-4 h-9 w-40 object-cover object-center"
            width={160}
            height={36}
          />
          <p className="text-sm text-slate-500">Your global credit identity — verified anywhere</p>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          {!pendingVerificationUser && !passwordLoginPending && mode !== 'forgot' && (
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              {(['signin', 'signup'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setMode(t)
                    setSignInMessage(null)
                    setGoogleSignInDiagnostic(null)
                    setDiagnosticCopied(false)
                  }}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    mode === t
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {t === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>
          )}

          {pendingVerificationUser || passwordLoginPending ? (
            <CardContent className="space-y-4 pt-6">
              <div role="status" aria-live="polite" className="space-y-2 text-center">
                <CardTitle className="text-xl">Verify your email to activate your account</CardTitle>
                <CardDescription>
                  Open the verification link sent to <strong>{verificationEmail}</strong>. You can resend it if needed.
                </CardDescription>
              </div>
              {signInMessage && (
                <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                  <p>{signInMessage.text}</p>
                  {signInMessage.support && (
                    <a className="mt-1 inline-block font-medium underline" href={`mailto:${LOGIN_SUPPORT_EMAIL}`}>
                      Contact support
                    </a>
                  )}
                </div>
              )}
              <Button
                className="w-full"
                disabled={loading}
                onClick={() => handleContinueAfterVerification()}
              >
                {loading ? 'Checking verification…' : 'I’ve verified my email'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={handleResendVerification}
              >
                Resend verification email
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={loading}
                onClick={handleUseAnotherAccount}
              >
                Use another account
              </Button>
            </CardContent>
          ) : mode === 'forgot' ? (
            <>
              <CardHeader>
                <CardTitle>Reset your password</CardTitle>
                <CardDescription>
                  We’ll email a secure link if an account exists for that address.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {resetLinkSent ? (
                  <div role="status" aria-live="polite" className="space-y-4 text-sm text-slate-600">
                    <p>If an account exists for that email, a password reset link has been sent.</p>
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => {
                        setResetLinkSent(false)
                        setMode('signin')
                      }}
                    >
                      Back to Sign In
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSendPasswordReset} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="reset-email" className="text-xs">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                    <Button type="submit" className="w-full h-9" disabled={loading}>
                      {loading ? 'Sending link…' : 'Send reset link'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      disabled={loading}
                      onClick={() => setMode('signin')}
                    >
                      Back to Sign In
                    </Button>
                  </form>
                )}
              </CardContent>
            </>
          ) : (
          <CardContent className="pt-6 space-y-4">
            {googleSignInDiagnostic && (
              <section
                role="alert"
                aria-live="assertive"
                className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
              >
                <div>
                  <p className="font-semibold">Sign-in diagnostic</p>
                  <p className="mt-1"><strong>Stage:</strong> {googleSignInDiagnostic.stage}</p>
                  <p><strong>Error code:</strong> {googleSignInDiagnostic.code}</p>
                  <p className="break-words"><strong>Message:</strong> {googleSignInDiagnostic.message}</p>
                  <p className="break-all"><strong>App origin:</strong> {googleSignInDiagnostic.appOrigin}</p>
                  <p className="break-all"><strong>Firebase auth domain:</strong> {googleSignInDiagnostic.authDomain}</p>
                  <p className="break-all"><strong>Expected callback:</strong> {googleSignInDiagnostic.callbackUrl}</p>
                  <p><strong>Firebase project:</strong> {googleSignInDiagnostic.projectId}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-10 w-full border-amber-700 bg-white text-amber-950 hover:bg-amber-100 dark:bg-slate-900 dark:text-amber-100"
                  onClick={async () => {
                    const text = formatGoogleSignInDiagnostic(googleSignInDiagnostic)
                    try {
                      await navigator.clipboard.writeText(text)
                      setDiagnosticCopied(true)
                    } catch {
                      const textarea = document.createElement('textarea')
                      textarea.value = text
                      textarea.setAttribute('readonly', '')
                      textarea.style.position = 'fixed'
                      textarea.style.opacity = '0'
                      document.body.appendChild(textarea)
                      textarea.select()
                      const copied = document.execCommand('copy')
                      textarea.remove()
                      setDiagnosticCopied(copied)
                    }
                  }}
                >
                  {diagnosticCopied ? 'Diagnostic copied' : 'Copy diagnostic details'}
                </Button>
                <p className="text-[11px]">
                  These details exclude your email, password, and sign-in tokens.
                </p>
              </section>
            )}
            {/* Google Button */}
            <Button
              onClick={handleGoogle}
              variant="outline"
              className="w-full font-medium"
              disabled={loading}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 px-2 text-xs text-slate-400">
                or
              </span>
            </div>

            {mode === 'signup' && (
              <fieldset className="space-y-3 rounded-md border border-slate-200 p-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
                <legend className="sr-only">Required agreements and optional marketing preference</legend>
                <label htmlFor="accept-terms" className="flex cursor-pointer items-start gap-2 leading-relaxed">
                  <input
                    id="accept-terms"
                    type="checkbox"
                    required
                    checked={consent.terms}
                    disabled={loading}
                    onChange={(e) => setConsent({ ...consent, terms: e.target.checked })}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                  />
                  <span>
                    I agree to the{' '}
                    <a href="/terms-of-service" target="_blank" rel="noreferrer" className="underline hover:text-blue-600">
                      Terms of Service
                    </a>.
                  </span>
                </label>
                <label htmlFor="accept-privacy" className="flex cursor-pointer items-start gap-2 leading-relaxed">
                  <input
                    id="accept-privacy"
                    type="checkbox"
                    required
                    checked={consent.privacy}
                    disabled={loading}
                    onChange={(e) => setConsent({ ...consent, privacy: e.target.checked })}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                  />
                  <span>
                    I have read and agree to the{' '}
                    <a href="/privacy-policy" target="_blank" rel="noreferrer" className="underline hover:text-blue-600">
                      Privacy Policy
                    </a>.
                  </span>
                </label>
                <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                  <label htmlFor="marketing-consent" className="flex cursor-pointer items-start gap-2 leading-relaxed">
                    <input
                      id="marketing-consent"
                      type="checkbox"
                      checked={consent.marketing}
                      disabled={loading}
                      onChange={(e) => setConsent({ ...consent, marketing: e.target.checked })}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                    />
                    <span>
                      Email me product updates and offers.{' '}
                      <span className="text-slate-500 dark:text-slate-400">
                        Optional; this does not affect account creation.
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>
            )}

            {mode === 'signin' ? (
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-xs">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                {signInMessage && (
                  <div role="alert" className={`rounded-md border p-3 text-sm ${
                    signInMessage.support
                      ? 'border-rose-300 bg-rose-50 text-rose-900'
                      : 'border-amber-300 bg-amber-50 text-amber-950'
                  }`}>
                    <p>{signInMessage.text}</p>
                    {signInMessage.support && (
                      <a className="mt-1 inline-block font-medium underline" href={`mailto:${LOGIN_SUPPORT_EMAIL}`}>
                        Contact support
                      </a>
                    )}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto px-0 text-xs"
                    onClick={() => {
                      setResetLinkSent(false)
                      setMode('forgot')
                    }}
                  >
                    Forgot password?
                  </Button>
                </div>
                <Button type="submit" className="w-full h-9" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleEmailSignUp} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="firstName" className="text-xs">First Name</Label>
                    <Input
                      id="firstName"
                      required
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                    <Input
                      id="lastName"
                      required
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signup-email" className="text-xs">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signup-password" className="text-xs">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-slate-400">Min 8 chars, include uppercase, number & symbol</p>
                </div>
                <Button type="submit" className="w-full h-9" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create Account'}
                </Button>
              </form>
            )}
          </CardContent>
          )}
        </Card>

        <p className="text-center text-xs text-slate-400">
          By continuing you agree to our{' '}
          <a href="/terms-of-service" className="underline hover:text-slate-700">Terms</a> and{' '}
          <a href="/privacy-policy" className="underline hover:text-slate-700">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
