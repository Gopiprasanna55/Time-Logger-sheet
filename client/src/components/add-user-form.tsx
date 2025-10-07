import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import type { User } from "@shared/schema";

const addUserSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  designation: z.string().min(1, "Designation is required"),
  department: z.string().min(1, "Department is required"),
  role: z.enum(["employee", "hr", "manager"])
});

type AddUserFormData = z.infer<typeof addUserSchema>;

interface AddUserFormProps {
  editingUser?: User | null;
  onSuccess?: () => void;
}

export default function AddUserForm({ editingUser, onSuccess }: AddUserFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddUserFormData>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      employeeId: "",
      firstName: "",
      lastName: "",
      email: "",
      designation: "",
      department: "",
      role: "employee"
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (editingUser) {
      form.reset({
        employeeId: editingUser.employeeId,
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
        designation: editingUser.designation,
        department: editingUser.department,
        role: editingUser.role as "employee" | "hr" | "manager"
      });
    }
  }, [editingUser, form]);

  const saveUserMutation = useMutation({
    mutationFn: async (userData: AddUserFormData) => {
      if (editingUser) {
        // Update existing user
        const response = await apiRequest("PUT", `/api/users/${editingUser.id}`, userData);
        return response.json();
      } else {
        // Create new user
        const response = await apiRequest("POST", "/api/users", userData);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manager-dashboard-stats"] });
      toast({
        title: "Success",
        description: editingUser ? "User updated successfully" : "User created successfully",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || (editingUser ? "Failed to update user" : "Failed to create user"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddUserFormData) => {
    saveUserMutation.mutate(data);
  };


  return (
    <Card data-testid="add-user-form">
      <CardHeader>
        <CardTitle data-testid="text-add-user-title">
          {editingUser ? "Edit User" : "Add New User"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., EMP001" 
                        data-testid="input-employee-id"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="First name" 
                        data-testid="input-first-name"
                        {...field}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Last name" 
                        data-testid="input-last-name"
                        {...field}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="user@company.com" 
                        data-testid="input-email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Senior Developer" 
                        data-testid="input-designation"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Software Development" 
                        data-testid="input-department"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={saveUserMutation.isPending}
                data-testid="button-save-user"
              >
                {saveUserMutation.isPending 
                  ? (editingUser ? "Updating User..." : "Adding User...")
                  : (editingUser ? "Update User" : "Add User")
                }
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}