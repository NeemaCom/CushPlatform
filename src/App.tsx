import { Router, Route, Switch, Link } from 'wouter'
import { QueryProvider } from '@/lib/query-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { PWAManager } from '@/components/PWAComponents'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { ImisiChatHead } from '@/components/imisi-chat'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'
import Settings from '@/pages/Settings'
import Achievements from '@/pages/Achievements'
import Loans from '@/pages/Loans'
import Jobs from '@/pages/Jobs'
import RailsrPay from '@/pages/RailsrPay'
import PrivacyPolicy from '@/pages/PrivacyPolicy'
import TermsOfService from '@/pages/TermsOfService'
import { useAuth } from '@/hooks/useAuth'

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }
  
  if (!user) {
    return <Login />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" enableSystem>
      <QueryProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <PWAManager />
            <PWAInstallPrompt />
            <PWAUpdatePrompt />
            <OfflineIndicator />
            
            <Switch>
              <Route path="/login" component={Login} />
              <Route path="/privacy-policy" component={PrivacyPolicy} />
              <Route path="/terms-of-service" component={TermsOfService} />
              
              <Route path="/dashboard">
                <AuthRoute>
                  <Dashboard />
                </AuthRoute>
              </Route>
              
              <Route path="/achievements">
                <AuthRoute>
                  <Achievements />
                </AuthRoute>
              </Route>
              
              <Route path="/settings">
                <AuthRoute>
                  <Settings />
                </AuthRoute>
              </Route>
              
              <Route path="/loans">
                <AuthRoute>
                  <Loans />
                </AuthRoute>
              </Route>
              
              <Route path="/jobs">
                <AuthRoute>
                  <Jobs />
                </AuthRoute>
              </Route>
              
              <Route path="/railsr-pay">
                <AuthRoute>
                  <RailsrPay />
                </AuthRoute>
              </Route>
              
              <Route path="/">
                <AuthRoute>
                  <Dashboard />
                </AuthRoute>
              </Route>
            </Switch>
            
            <ImisiChatHead />
          </div>
        </Router>
        <Toaster />
      </QueryProvider>
    </ThemeProvider>
  )
}

export default App