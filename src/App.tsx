import { Router, Redirect, Route, Switch, useLocation } from 'wouter'
import { lazy, Suspense, useEffect } from 'react'
import { QueryProvider } from '@/lib/query-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import CreditPassport from '@/pages/CreditPassport'
import AdminDashboard from '@/pages/AdminDashboard'
import PublicPassport from '@/pages/PublicPassport'
import SamplePassport from '@/pages/SamplePassport'
import PrivacyPolicy from '@/pages/PrivacyPolicy'
import TermsOfService from '@/pages/TermsOfService'
import PassportConsentInvite from '@/pages/PassportConsentInvite'
const AccountCenter = lazy(() => import('@/pages/AccountCenter'))
const CushVerify = lazy(() => import('@/pages/CushVerify'))
const CushVerifyPricing = lazy(() => import('@/pages/CushVerifyPricing'))
const CushVerifyApi = lazy(() => import('@/pages/CushVerifyApi'))
const CushVerifyApiReference = lazy(() => import('@/pages/CushVerifyApiReference'))
const CushVerifyHowItWorks = lazy(() => import('@/pages/CushVerifyHowItWorks'))
const CushVerifyApplication = lazy(() => import('@/pages/CushVerifyApplication'))
const CushVerifyWorkspace = lazy(() => import('@/pages/CushVerifyWorkspace'))
const CushVerifyLogin = lazy(() => import('@/pages/CushVerifyAuth').then((module) => ({ default: module.CushVerifyLogin })))
const CushVerifyActivation = lazy(() => import('@/pages/CushVerifyAuth').then((module) => ({ default: module.CushVerifyActivation })))
const CushVerifyInvitationRegistration = lazy(() => import('@/pages/CushVerifyAuth').then((module) => ({ default: module.CushVerifyInvitationRegistration })))
const CushVerifyCompleteRegistration = lazy(() => import('@/pages/CushVerifyAuth').then((module) => ({ default: module.CushVerifyCompleteRegistration })))
import { useAuth } from '@/hooks/useAuth'
import VisitorAnalytics from '@/components/visitor-intelligence/VisitorAnalytics'
import SessionInactivityGuard from '@/components/auth/SessionInactivityGuard'
import CushVerifyInactivityGuard from '@/components/auth/CushVerifyInactivityGuard'
import { auth, onAuthStateChanged, signOut } from '@/firebase'
import {
  buildCushVerifyUrl,
  isCushVerifyHost,
  isCushVerifyPath,
} from '@/lib/cush-verify-domain'

export function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const [, setLocation] = useLocation()

  useEffect(() => {
    if (!isLoading && !user) {
      const next = window.location.pathname === '/passport/consent-invite'
        ? `${window.location.pathname}${window.location.search}`
        : ''
      setLocation(next ? `/login?next=${encodeURIComponent(next)}` : '/login')
      if (user === null) {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) void signOut(auth).catch(() => undefined)
        })
        return unsubscribe
      }
    }
  }, [isLoading, user, setLocation])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Login />
  return <>{children}</>
}

function HomeRoute() {
  const { user, isLoading } = useAuth()
  const [, setLocation] = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    setLocation('/dashboard')
    return null
  }

  return <Home />
}

function CushVerifyRoutes({ redirectRootToVerify = false }: { redirectRootToVerify?: boolean }) {
  return (
    <>
      <CushVerifyInactivityGuard />
      <div className="min-h-screen bg-white">
        <Switch>
          <Route path="/">
            {redirectRootToVerify
              ? <Redirect to="/verify" />
              : <Suspense fallback={<PageLoading />}><CushVerify /></Suspense>}
          </Route>
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/terms-of-service" component={TermsOfService} />
          <Route path="/verify/pricing">
            <Suspense fallback={<PageLoading />}><CushVerifyPricing /></Suspense>
          </Route>
          <Route path="/verify/api">
            <Suspense fallback={<PageLoading />}><CushVerifyApi /></Suspense>
          </Route>
          <Route path="/verify/api-reference">
            <Suspense fallback={<PageLoading />}><CushVerifyApiReference /></Suspense>
          </Route>
          <Route path="/verify/how-it-works">
            <Suspense fallback={<PageLoading />}><CushVerifyHowItWorks /></Suspense>
          </Route>
          <Route path="/verify">
            <Suspense fallback={<PageLoading />}><CushVerify /></Suspense>
          </Route>
          <Route path="/verify/apply">
            <Suspense fallback={<PageLoading />}><CushVerifyApplication /></Suspense>
          </Route>
          <Route path="/verify/activate">
            <Suspense fallback={<PageLoading />}><CushVerifyActivation /></Suspense>
          </Route>
          <Route path="/verify/login">
            <Suspense fallback={<PageLoading />}><CushVerifyLogin /></Suspense>
          </Route>
          <Route path="/verify/register">
            <Suspense fallback={<PageLoading />}><CushVerifyInvitationRegistration /></Suspense>
          </Route>
          <Route path="/verify/complete">
            <Suspense fallback={<PageLoading />}><CushVerifyCompleteRegistration /></Suspense>
          </Route>
          <Route path="/verify/workspace">
            <Suspense fallback={<PageLoading />}><CushVerifyWorkspace /></Suspense>
          </Route>
        </Switch>
      </div>
    </>
  )
}

function CushVerifyHostRedirect() {
  useEffect(() => {
    window.location.replace(buildCushVerifyUrl(
      window.location.pathname,
      window.location.search,
      window.location.hash,
    ))
  }, [])

  return <PageLoading />
}

function PassportRoutes() {
  return (
    <>
      <SessionInactivityGuard />
      <VisitorAnalytics />
      <div className="min-h-screen bg-white">
        <Switch>
          <Route path="/">
            <HomeRoute />
          </Route>
          <Route path="/login" component={Login} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/terms-of-service" component={TermsOfService} />

          {/* Sample passport — public demo */}
          <Route path="/sample" component={SamplePassport} />

          {/* Shareable passport — unauthenticated landlord view */}
          <Route path="/passport/consent-invite">
            <AuthRoute><PassportConsentInvite /></AuthRoute>
          </Route>
          <Route path="/passport/:token" component={PublicPassport} />

          {/* Dashboard — authenticated */}
          <Route path="/dashboard">
            <AuthRoute><CreditPassport /></AuthRoute>
          </Route>
          <Route path="/passport">
            <AuthRoute><CreditPassport /></AuthRoute>
          </Route>

          {/* Admin surface is authenticated; APIs enforce permissions server-side. */}
          <Route path="/admin">
            <AuthRoute><AdminDashboard /></AuthRoute>
          </Route>

          {/* Account management and support are authenticated and owner-scoped. */}
          <Route path="/account/:section">
            {(params) => <Suspense fallback={<AccountLoading />}><AuthRoute><AccountCenter section={params.section} /></AuthRoute></Suspense>}
          </Route>
          <Route path="/support">
            <Suspense fallback={<AccountLoading />}><AuthRoute><AccountCenter section="support" /></AuthRoute></Suspense>
          </Route>
          <Route path="/contact">
            <Suspense fallback={<AccountLoading />}><AuthRoute><AccountCenter section="contact" /></AuthRoute></Suspense>
          </Route>
        </Switch>
      </div>
    </>
  )
}

function AppRoutes() {
  const [location] = useLocation()
  const dedicatedVerifyHost = isCushVerifyHost(window.location.hostname)
  const stagingVerifyBuild = import.meta.env.VITE_DEFAULT_APP === 'verify'
  const verifyExperience = dedicatedVerifyHost || stagingVerifyBuild

  useEffect(() => {
    document.title = verifyExperience
      ? 'Cush Verify | Institutional Verification'
      : 'Cush Passport — Global Credit Identity'
    if (verifyExperience) {
      document.querySelector('meta[name="description"]')?.setAttribute(
        'content',
        'Cush Verify helps approved institutions request consent-led identity and financial reports.',
      )
    }
  }, [verifyExperience])

  if (dedicatedVerifyHost || (import.meta.env.DEV && isCushVerifyPath(location))) {
    return <CushVerifyRoutes />
  }
  if (stagingVerifyBuild) return <CushVerifyRoutes redirectRootToVerify />
  if (isCushVerifyPath(location) && !import.meta.env.DEV) return <CushVerifyHostRedirect />
  return <PassportRoutes />
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" enableSystem={false}>
      <QueryProvider>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryProvider>
    </ThemeProvider>
  )
}

function AccountLoading() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading account…</div>
}

function PageLoading() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading Cush Verify…</div>
}

export default App
