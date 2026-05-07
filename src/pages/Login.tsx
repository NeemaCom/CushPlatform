import { useState } from 'react'
import { useLocation } from 'wouter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from '@/firebase.js'

const API_BASE = import.meta.env.VITE_API_URL || '';

async function firebaseSync(fbUser: { uid: string; email: string | null; displayName: string | null }, extra?: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/auth/firebase-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      ...extra,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Auth failed')
  }
  return res.json()
}

export default function Login() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' })

  async function afterLogin() {
    await qc.invalidateQueries({ queryKey: ['/api/auth/me'] })
    setLocation('/dashboard')
  }

  async function handleGoogle() {
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const fbUser = result.user
      await firebaseSync(fbUser, {
        firstName: fbUser.displayName?.split(' ')[0] ?? '',
        lastName: fbUser.displayName?.split(' ').slice(1).join(' ') ?? '',
        photoURL: fbUser.photoURL,
        emailVerified: fbUser.emailVerified,
      })
      await afterLogin()
    } catch (err: any) {
      toast({ title: 'Google sign-in failed', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await signInWithEmailAndPassword(auth, form.email, form.password)
      await firebaseSync(result.user, { emailVerified: result.user.emailVerified })
      await afterLogin()
    } catch (err: any) {
      const msg =
        err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found'
          ? 'Invalid email or password.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please wait and try again.'
          : err.message
      toast({ title: 'Sign-in failed', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await firebaseSync(result.user, {
        firstName: form.firstName,
        lastName: form.lastName,
        emailVerified: false,
        isNewUser: false, // create session immediately
      })
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">Cush Passport</span>
          </div>
          <p className="text-sm text-slate-500">Your global credit identity — verified anywhere</p>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Tab Toggle */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            {(['signin', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {t === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <CardContent className="pt-6 space-y-4">
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

            {tab === 'signin' ? (
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
