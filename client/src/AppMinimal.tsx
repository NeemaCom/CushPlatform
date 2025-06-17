import React from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Homepage from "@/pages/homepage";

// Minimal components for testing
const TestDashboard = () => <div>Test Dashboard</div>;
const NotFound = () => <div>404 - Page Not Found</div>;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Homepage} />
      <Route path="/dashboard" component={TestDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppMinimal() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default AppMinimal;