import { useQuery } from "@tanstack/react-query";
import { Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import StatsCard from "@/components/stats-card";
import SimpleWorkTable from "@/components/simple-work-table";
import UserManagement from "@/components/user-management";
import UserManagementWithForm from "@/components/user-management-with-form";
import WorkHourRequestManagement from "@/components/work-hour-request-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { WorkEntryWithUser, User } from "@shared/schema";

interface ManagerDashboardStats {
  totalEmployees: number;
  submitted: number;
  notSubmitted: number;
  totalWorkHours: string;
}

export default function ManagerDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<ManagerDashboardStats>({
    queryKey: ["/api/manager-dashboard-stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  const { data: allWorkEntries = [], isLoading: entriesLoading } = useQuery<WorkEntryWithUser[]>({
    queryKey: ["/api/work-entries"],
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  if (statsLoading || entriesLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 h-20"></div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-lg p-6 h-96 mb-6"></div>
          <div className="bg-card border border-border rounded-lg p-6 h-96"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="manager-dashboard">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-dashboard-title">
            Manager Dashboard
          </h1>
          <div className="text-sm text-muted-foreground">
            Welcome back, {user?.firstName} {user?.lastName}
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="requests" data-testid="tab-requests">Work Requests</TabsTrigger>
            <TabsTrigger value="user-management" data-testid="tab-user-management">User Management</TabsTrigger>
            <TabsTrigger value="employees" data-testid="tab-employees">Employee Management</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatsCard
                  title="Total Employees"
                  value={stats?.totalEmployees?.toString() || "0"}
                  icon={Users}
                  testId="card-total-employees"
                />
                <StatsCard
                  title="Employees Submitted Today"
                  value={stats?.submitted?.toString() || "0"}
                  icon={CheckCircle}
                  testId="card-submitted"
                />
                <StatsCard
                  title="Not Submitted"
                  value={stats?.notSubmitted?.toString() || "0"}
                  icon={XCircle}
                  testId="card-not-submitted"
                />
                <StatsCard
                  title="Total Hours Today"
                  value={stats?.totalWorkHours || "0"}
                  icon={Clock}
                  testId="card-total-hours"
                />
              </div>

              {/* Recent Work Entries Preview */}
              <SimpleWorkTable 
                workEntries={allWorkEntries.slice(0, 10)} 
                title="Recent Work Entries"
                showEmployeeInfo={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <WorkHourRequestManagement />
          </TabsContent>

          <TabsContent value="user-management">
            <UserManagementWithForm />
          </TabsContent>

          <TabsContent value="employees">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}