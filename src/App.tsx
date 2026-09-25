import { Router, Route, Switch, useLocation } from 'wouter'
import { QueryProvider } from '@/lib/query-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import CreditPassport from '@/pages/CreditPassport'
import PublicPassport from '@/pages/PublicPassport'
import SamplePassport from '@/pages/SamplePassport'
import PrivacyPolicy from '@/pages/PrivacyPolicy'
import TermsOfService from '@/pages/TermsOfService'
import { useAuth } from '@/hooks/useAuth'

export function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const [, setLocation] = useLocation()

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
          <div className="min-h-screen bg-white">
            <Switch>
              {/* Public landing page — redirects authenticated users to /dashboard */}
              <Route path="/" component={HomeRoute} />
              <Route path="/login" component={Login} />
              <Route path="/privacy-policy" component={PrivacyPolicy} />
              <Route path="/terms-of-service" component={TermsOfService} />

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
            </Switch>
          </div>
        </Router>
        <Toaster />
      </QueryProvider>
    </ThemeProvider>
  )
}

export default App
