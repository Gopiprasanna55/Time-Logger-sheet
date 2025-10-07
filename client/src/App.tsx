import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import EmployeeDashboard from "@/pages/employee-dashboard";
import HRDashboard from "@/pages/hr-dashboard";
import ManagerDashboard from "@/pages/manager-dashboard";
import AuthPage from "@/pages/auth-page";
import Navigation from "@/components/navigation";

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/" component={() => (
          <>
            <Navigation />
            <EmployeeDashboard />
          </>
        )} />
        <ProtectedRoute path="/employee" component={() => (
          <>
            <Navigation />
            <EmployeeDashboard />
          </>
        )} />
        <ProtectedRoute path="/hr" component={() => (
          <>
            <Navigation />
            <HRDashboard />
          </>
        )} />
        <ProtectedRoute path="/manager" component={() => (
          <>
            <Navigation />
            <ManagerDashboard />
          </>
        )} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
