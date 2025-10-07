import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Clock, User, ChevronDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function Navigation() {
  const [location] = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logoutMutation } = useAuth();

  const isHRView = location === "/hr";
  const isEmployeeView = location === "/" || location === "/employee";

  // Only show HR link if user has hr or manager role
  const canViewHR = user?.role === "hr" || user?.role === "manager";
  
  // Only show My Timesheet for employees and HR (not managers)
  const canViewTimesheet = user?.role === "employee" || user?.role === "hr";

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logoutMutation.mutateAsync();
  };

  return (
    <nav className="bg-card border-b border-border shadow-sm" data-testid="navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Clock className="text-primary text-2xl" />
              <h1 className="text-xl font-bold text-foreground">TimeTracker Pro</h1>
            </div>
            <div className="hidden md:flex space-x-6">
              {canViewTimesheet && (
                <Link href="/employee">
                  <button 
                    className={`${
                      isEmployeeView 
                        ? "text-primary font-medium border-b-2 border-primary pb-1" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="nav-employee"
                  >
                    My Timesheet
                  </button>
                </Link>
              )}
              {canViewHR && (
                <Link href="/hr">
                  <button 
                    className={`${
                      isHRView 
                        ? "text-primary font-medium border-b-2 border-primary pb-1" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="nav-hr"
                  >
                    {user?.role === "manager" ? "Manager Dashboard" : "HR Dashboard"}
                  </button>
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, <span className="font-medium" data-testid="user-name">
                {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
              </span>
            </span>
            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {user?.role?.toUpperCase()}
            </div>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
                data-testid="user-menu-button"
              >
                <User className="h-4 w-4" />
                <ChevronDown className="h-3 w-3" />
              </Button>
              
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-md shadow-lg z-[9999]" data-testid="user-menu">
                  <div className="py-2">
                    <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border break-words">
                      {user?.email}
                    </div>
                    <button
                      onClick={handleLogout}
                      disabled={logoutMutation.isPending}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      data-testid="logout-button"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {logoutMutation.isPending ? "Logging out..." : "Logout"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-border">
        <div className="px-4 py-2 space-x-4">
          {canViewTimesheet && (
            <Link href="/employee">
              <button 
                className={isEmployeeView ? "text-primary font-medium" : "text-muted-foreground"}
                data-testid="nav-employee-mobile"
              >
                My Timesheet
              </button>
            </Link>
          )}
          {canViewHR && (
            <Link href="/hr">
              <button 
                className={isHRView ? "text-primary font-medium" : "text-muted-foreground"}
                data-testid="nav-hr-mobile"
              >
                {user?.role === "manager" ? "Manager Dashboard" : "HR Dashboard"}
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
