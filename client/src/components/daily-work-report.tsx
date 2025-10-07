import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Edit, Trash2, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { WorkEntry, WorkEntryWithUser } from "@shared/schema";

interface DailyWorkReportProps {
  workEntries: WorkEntry[] | WorkEntryWithUser[];
  title: string;
  showEmployeeInfo?: boolean;
  showActions?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

interface GroupedEntries {
  [date: string]: (WorkEntry | WorkEntryWithUser)[];
}

export default function DailyWorkReport({ 
  workEntries, 
  title, 
  showEmployeeInfo = false, 
  showActions = true,
  selectedIds = [],
  onSelectionChange
}: DailyWorkReportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/work-entries/${id}/status`, { status });
      return response.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: `Work entry ${status === "approved" ? "approved" : "rejected"} successfully!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update work entry status",
        variant: "destructive",
      });
    },
  });

  const deleteWorkEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/work-entries/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-entries/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Work entry deleted successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete work entry",
        variant: "destructive",
      });
    },
  });

  // Group entries by date
  const groupedEntries: GroupedEntries = workEntries.reduce((groups, entry) => {
    const date = entry.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as GroupedEntries);

  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800" data-testid="status-approved">
            <Check className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" data-testid="status-rejected">
            <X className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800" data-testid="status-pending">
            Pending
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTotalHoursForDate = (entries: (WorkEntry | WorkEntryWithUser)[]) => {
    return entries.reduce((total, entry) => total + parseFloat(entry.timeSpent), 0).toFixed(1);
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const canEditEntry = (entry: WorkEntry | WorkEntryWithUser) => {
    const today = new Date().toISOString().split('T')[0];
    return entry.date === today && entry.status === "pending";
  };

  return (
    <Card data-testid="daily-work-report">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedDates.length === 0 ? (
          <div className="text-center text-muted-foreground py-8" data-testid="empty-state">
            No work entries found
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => {
              const entries = groupedEntries[date];
              const totalHours = getTotalHoursForDate(entries);
              
              return (
                <div key={date} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-3 border-b">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <h3 className="text-lg font-semibold text-foreground" data-testid={`date-header-${date}`}>
                          {formatDate(date)}
                        </h3>
                        {showEmployeeInfo && 'user' in entries[0] && (
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium mr-3">
                              {getUserInitials(entries[0].user.firstName + ' ' + entries[0].user.lastName)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {entries[0].user.firstName} {entries[0].user.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {entries[0].user.employeeId} - {entries[0].user.designation}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-medium text-foreground" data-testid={`total-hours-${date}`}>
                        Total: {totalHours} hrs
                      </div>
                    </div>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Work Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[100px]">Hours</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        {showActions && <TableHead className="w-[120px]">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id} className="hover:bg-muted/50" data-testid={`entry-row-${entry.id}`}>
                          <TableCell className="font-medium" data-testid={`work-type-${entry.id}`}>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              entry.workType === 'Task' ? 'bg-blue-100 text-blue-800' :
                              entry.workType === 'Project' ? 'bg-purple-100 text-purple-800' :
                              entry.workType === 'Meeting' ? 'bg-green-100 text-green-800' :
                              entry.workType === 'Skill-up' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {entry.workType}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-foreground" data-testid={`description-${entry.id}`}>
                            {entry.description}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-foreground" data-testid={`hours-${entry.id}`}>
                            {entry.timeSpent}
                          </TableCell>
                          <TableCell data-testid={`status-${entry.id}`}>
                            {getStatusBadge(entry.status)}
                          </TableCell>
                          {showActions && (
                            <TableCell className="text-sm space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-800"
                                title="View Details"
                                data-testid={`button-view-${entry.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              
                              {entry.status === "pending" && (
                                <>
                                  {!showEmployeeInfo && canEditEntry(entry) ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-primary hover:text-primary/80"
                                        title="Edit"
                                        data-testid={`button-edit-${entry.id}`}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive/80"
                                        title="Delete"
                                        onClick={() => {
                                          if (window.confirm("Are you sure you want to delete this work entry?")) {
                                            deleteWorkEntryMutation.mutate(entry.id);
                                          }
                                        }}
                                        data-testid={`button-delete-${entry.id}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </>
                                  ) : showEmployeeInfo && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-green-600 hover:text-green-800"
                                        title="Approve"
                                        onClick={() => {
                                          if (window.confirm("Are you sure you want to approve this work entry?")) {
                                            updateStatusMutation.mutate({ id: entry.id, status: "approved" });
                                          }
                                        }}
                                        disabled={updateStatusMutation.isPending}
                                        data-testid={`button-approve-${entry.id}`}
                                      >
                                        <Check className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-800"
                                        title="Reject"
                                        onClick={() => {
                                          if (window.confirm("Are you sure you want to reject this work entry?")) {
                                            updateStatusMutation.mutate({ id: entry.id, status: "rejected" });
                                          }
                                        }}
                                        disabled={updateStatusMutation.isPending}
                                        data-testid={`button-reject-${entry.id}`}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                </>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}