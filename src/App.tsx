import { Router, Route, Switch } from 'wouter'
import { QueryProvider } from '@/lib/query-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'
import Settings from '@/pages/Settings'
import CreditPassport from '@/pages/CreditPassport'
import PublicPassport from '@/pages/PublicPassport'
import PrivacyPolicy from '@/pages/PrivacyPolicy'
import TermsOfService from '@/pages/TermsOfService'
import { useAuth } from '@/hooks/useAuth'

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Login />
  return <>{children}</>
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" enableSystem>
      <QueryProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <OfflineIndicator />

            <Switch>
              {/* Public routes */}
              <Route path="/login" component={Login} />
              <Route path="/privacy-policy" component={PrivacyPolicy} />
              <Route path="/terms-of-service" component={TermsOfService} />

              {/* Public passport — unauthenticated shareable view */}
              <Route path="/passport/:token" component={PublicPassport} />

              {/* Authenticated routes */}
              <Route path="/dashboard">
                <AuthRoute><Dashboard /></AuthRoute>
              </Route>

              <Route path="/passport">
                <AuthRoute><CreditPassport /></AuthRoute>
              </Route>

              <Route path="/settings">
                <AuthRoute><Settings /></AuthRoute>
              </Route>

              {/* Default — redirect to passport as the core product */}
              <Route path="/">
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
