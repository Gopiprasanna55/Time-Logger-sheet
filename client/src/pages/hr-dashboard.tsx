import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Users, BarChart3, FileText } from "lucide-react";
import { format, isToday } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import StatsCard from "@/components/stats-card";
import SimpleWorkTable from "@/components/simple-work-table";
import UserManagement from "@/components/user-management";
import UserManagementAdmin from "@/components/user-management-admin";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import type { WorkEntryWithUser, User } from "@shared/schema";

interface HRStats {
  totalEmployees: number;
  totalEntries: number;
  avgHours: string;
  totalHours: string;
  submittedToday: number;
  notSubmittedToday: number;
}

export default function HRDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const isManager = user?.role === "manager";
  
  // No longer need selectedUserForReport since we show inline worksheets

  const { data: stats, isLoading: statsLoading } = useQuery<HRStats>({
    queryKey: ["/api/stats"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: allWorkEntries = [], isLoading: entriesLoading } = useQuery<WorkEntryWithUser[]>({
    queryKey: ["/api/work-entries"],
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="hr-dashboard">
      <div className="space-y-6">
        <Tabs defaultValue={isManager ? "reports" : "dashboard"} className="w-full">
          <TabsList className={`grid w-full ${isManager ? "grid-cols-2" : "grid-cols-2"}`}>
            {!isManager && (
              <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            )}
            <TabsTrigger value="reports" data-testid="tab-reports">Employee Work Reports</TabsTrigger>
            {isManager && (
              <TabsTrigger value="users" data-testid="tab-users">User Management</TabsTrigger>
            )}
          </TabsList>
          
          {!isManager && (
            <TabsContent value="dashboard" className="space-y-6">
              {/* HR Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                title="Total Employees"
                value={stats?.totalEmployees || 0}
                icon={Users}
                className="text-blue-600"
                testId="stat-total-employees"
              />
              <StatsCard
                title="Submitted Today"
                value={stats?.submittedToday || 0}
                icon={Clock}
                className="text-green-600"
                testId="stat-submitted-today"
              />
              <StatsCard
                title="Not Submitted Today"
                value={stats?.notSubmittedToday || 0}
                icon={Clock}
                className="text-red-600"
                testId="stat-not-submitted-today"
              />
              <StatsCard
                title="Total Hours"
                value={stats?.totalHours || "0.0"}
                icon={BarChart3}
                className="text-purple-600"
                testId="stat-total-hours"
              />
            </div>

            </TabsContent>
          )}

          <TabsContent value="reports" className="space-y-6">
            {/* Employee Work Hours Reports */}
            <UserManagement />
          </TabsContent>
          
          {isManager && (
            <TabsContent value="users" className="space-y-6">
              <UserManagementAdmin />
            </TabsContent>
          )}
        </Tabs>
        
        {/* No longer need modal since worksheets are shown inline */}
      </div>
    </div>
  );
}
