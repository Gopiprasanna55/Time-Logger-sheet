import { Eye, Edit, Trash2, Check, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

import type { WorkEntry, WorkEntryWithUser } from "@shared/schema";

interface TimesheetTableProps {
  timesheets: WorkEntry[] | WorkEntryWithUser[];
  title: string;
  showEmployeeInfo?: boolean;
  showActions?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export default function TimesheetTable({ 
  timesheets, 
  title, 
  showEmployeeInfo = false, 
  showActions = true,
  selectedIds = [],
  onSelectionChange
}: TimesheetTableProps) {
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
        description: error.message || "Failed to update timesheet status",
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

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? timesheets.map(t => t.id) : []);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (onSelectionChange) {
      const newSelection = checked 
        ? [...selectedIds, id]
        : selectedIds.filter(selectedId => selectedId !== id);
      onSelectionChange(newSelection);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Card data-testid="timesheet-table">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {onSelectionChange && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === timesheets.length && timesheets.length > 0}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                )}
                {showEmployeeInfo && <TableHead>Employee</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead>Time Spent</TableHead>
                <TableHead>Work Type</TableHead>
                <TableHead>Status</TableHead>
                {showActions && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheets.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={showEmployeeInfo ? 6 : 5} 
                    className="text-center text-muted-foreground py-8"
                    data-testid="empty-state"
                  >
                    No timesheet entries found
                  </TableCell>
                </TableRow>
              ) : (
                timesheets.map((timesheet) => (
                  <TableRow key={timesheet.id} className="hover:bg-muted/50" data-testid={`timesheet-row-${timesheet.id}`}>
                    {onSelectionChange && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(timesheet.id)}
                          onCheckedChange={(checked) => handleSelectOne(timesheet.id, checked as boolean)}
                          data-testid={`checkbox-${timesheet.id}`}
                        />
                      </TableCell>
                    )}
                    {showEmployeeInfo && 'user' in timesheet && (
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium mr-3">
                            {getUserInitials(timesheet.user.name)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground" data-testid={`employee-name-${timesheet.id}`}>
                              {timesheet.user.name}
                            </div>
                            <div className="text-sm text-muted-foreground" data-testid={`employee-dept-${timesheet.id}`}>
                              {timesheet.user.department}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-foreground" data-testid={`date-${timesheet.id}`}>
                      {formatDate(timesheet.date)}
                    </TableCell>
                    <TableCell className="text-sm text-foreground" data-testid={`time-spent-${timesheet.id}`}>
                      {timesheet.timeSpent} hrs
                    </TableCell>
                    <TableCell className="text-sm text-foreground" data-testid={`work-type-${timesheet.id}`}>
                      {timesheet.workType}
                    </TableCell>
                    <TableCell data-testid={`status-${timesheet.id}`}>
                      {getStatusBadge(timesheet.status)}
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-sm space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                          data-testid={`button-view-${timesheet.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {timesheet.status === "pending" && (
                          <>
                            {!showEmployeeInfo ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:text-primary/80"
                                  title="Edit"
                                  data-testid={`button-edit-${timesheet.id}`}
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
                                      deleteWorkEntryMutation.mutate(timesheet.id);
                                    }
                                  }}
                                  data-testid={`button-delete-${timesheet.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-800"
                                  title="Approve"
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to approve this timesheet entry?")) {
                                      updateStatusMutation.mutate({ id: timesheet.id, status: "approved" });
                                    }
                                  }}
                                  disabled={updateStatusMutation.isPending}
                                  data-testid={`button-approve-${timesheet.id}`}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-800"
                                  title="Reject"
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to reject this timesheet entry?")) {
                                      updateStatusMutation.mutate({ id: timesheet.id, status: "rejected" });
                                    }
                                  }}
                                  disabled={updateStatusMutation.isPending}
                                  data-testid={`button-reject-${timesheet.id}`}
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
