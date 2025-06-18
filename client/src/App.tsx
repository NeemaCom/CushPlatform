import React from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Homepage from "@/pages/homepage";
import DashboardNew from "@/pages/dashboard-new";
import Analytics from "@/pages/analytics";
import Imisi from "@/pages/imisi";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Subscribe from "@/pages/subscribe";
import Community from "@/pages/community";
import Loans from "@/pages/loans";
import Jobs from "@/pages/jobs";
import Housing from "@/pages/housing";
import Settings from "@/pages/settings";
import Admin from "@/pages/admin";
import InsightDetail from "@/pages/insight-detail";
import MentorProfile from "@/pages/mentor-profile";
import CreateInsight from "@/pages/create-insight";
import PWASettings from "@/pages/pwa-settings";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";
import WidgetMarketplace from "@/pages/widget-marketplace";
import TestPage from "@/pages/test-page";
import SimpleTest from "@/pages/simple-test";
import LegalTest from "@/pages/legal-test";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Homepage} />
      <Route path="/dashboard" component={DashboardNew} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/imisi" component={Imisi} />
      <Route path="/loans" component={Loans} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/housing" component={Housing} />
      <Route path="/widget-marketplace" component={WidgetMarketplace} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={Admin} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/community" component={Community} />
      <Route path="/community/insights/:id" component={InsightDetail} />
      <Route path="/community/mentors/:id" component={MentorProfile} />
      <Route path="/community/create-insight" component={CreateInsight} />
      <Route path="/settings/pwa" component={PWASettings} />
      <Route path="/legal-test" component={LegalTest} />
      <Route path="/simple-test" component={SimpleTest} />
      <Route path="/test-page" component={TestPage} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
