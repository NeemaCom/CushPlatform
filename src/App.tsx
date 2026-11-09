import { Router, Route, Switch, useLocation } from 'wouter'
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
const AccountCenter = lazy(() => import('@/pages/AccountCenter'))
const CushVerify = lazy(() => import('@/pages/CushVerify'))
import { useAuth } from '@/hooks/useAuth'
import VisitorAnalytics from '@/components/visitor-intelligence/VisitorAnalytics'

export function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const [, setLocation] = useLocation()

  useEffect(() => {
    if (!isLoading && !user) setLocation('/login')
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

function App() {
  return (
    <ThemeProvider defaultTheme="light" enableSystem={false}>
      <QueryProvider>
        <Router>
          <VisitorAnalytics />
          <div className="min-h-screen bg-white">
            <Switch>
              {/* Public landing page — redirects authenticated users to /dashboard */}
              <Route path="/" component={HomeRoute} />
              <Route path="/login" component={Login} />
              <Route path="/privacy-policy" component={PrivacyPolicy} />
              <Route path="/terms-of-service" component={TermsOfService} />
              <Route path="/verify">
                <Suspense fallback={<PageLoading />}>
                  <CushVerify />
                </Suspense>
              </Route>

              {/* Sample passport — public demo */}
              <Route path="/sample" component={SamplePassport} />

              {/* Shareable passport — unauthenticated landlord view */}
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
