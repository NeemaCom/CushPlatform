import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Homepage from "@/pages/homepage";
import Dashboard from "@/pages/dashboard";
import Analytics from "@/pages/analytics";
import Imisi from "@/pages/imisi";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Subscribe from "@/pages/subscribe";
import Community from "@/pages/community";
import InsightDetail from "@/pages/insight-detail";
import MentorProfile from "@/pages/mentor-profile";
import CreateInsight from "@/pages/create-insight";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Homepage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/imisi" component={Imisi} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/community" component={Community} />
      <Route path="/community/insights/:id" component={InsightDetail} />
      <Route path="/community/mentors/:id" component={MentorProfile} />
      <Route path="/community/create-insight" component={CreateInsight} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
