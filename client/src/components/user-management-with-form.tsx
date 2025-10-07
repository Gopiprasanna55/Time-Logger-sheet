import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AddUserForm from "@/components/add-user-form";

import type { User } from "@shared/schema";

export default function UserManagementWithForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manager-dashboard-stats"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  // Show all users: employees, HR users, and managers
  const employees = users.filter(user => user.role === "employee" || user.role === "hr" || user.role === "manager");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-card border border-border rounded-lg p-6 h-40"></div>
        <div className="animate-pulse bg-card border border-border rounded-lg p-6 h-60"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="user-management-with-form">
      {/* Add Employee Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" data-testid="text-user-management-title">
          Employee Management
        </h2>
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-employee">
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <AddUserForm onSuccess={() => setShowAddForm(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Employee List Table */}
      <Card data-testid="employee-list-card">
        <CardHeader>
          <CardTitle data-testid="text-employee-list-title">Employee List</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-employees">
              No employees found. Add your first employee to get started.
            </div>
          ) : (
            <Table data-testid="employee-table" className="border border-gray-300 border-collapse bg-white [&_th]:border [&_td]:border [&_th]:border-gray-300 [&_td]:border-gray-300 [&_th]:bg-gray-50 [&_th]:text-gray-900 [&_th]:font-semibold [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 [&_tr:nth-child(even)]:bg-gray-50/50 [&_tr:hover]:bg-blue-50">
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="header-name" className="text-left">Name</TableHead>
                  <TableHead data-testid="header-email" className="text-left">Email</TableHead>
                  <TableHead data-testid="header-designation" className="text-left">Designation</TableHead>
                  <TableHead data-testid="header-role" className="text-center">Role</TableHead>
                  <TableHead data-testid="header-actions" className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                    <TableCell data-testid={`cell-name-${employee.id}`} className="font-medium">
                      {employee.firstName} {employee.lastName}
                    </TableCell>
                    <TableCell data-testid={`cell-email-${employee.id}`}>
                      {employee.email}
                    </TableCell>
                    <TableCell data-testid={`cell-designation-${employee.id}`}>
                      {employee.designation}
                    </TableCell>
                    <TableCell data-testid={`cell-role-${employee.id}`} className="text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        employee.role === 'manager' ? 'bg-purple-100 text-purple-800' :
                        employee.role === 'hr' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {employee.role.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingUser(employee)}
                              data-testid={`button-edit-${employee.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Employee</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                              <AddUserForm 
                                editingUser={editingUser} 
                                onSuccess={() => {
                                  setEditingUser(null);
                                }}
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteUser(employee.id)}
                          disabled={deleteUserMutation.isPending}
                          data-testid={`button-delete-${employee.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}