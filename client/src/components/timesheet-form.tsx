import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, X, Calendar } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
import { z } from "zod";
import { insertWorkEntrySchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkHourRequestWithUser, WorkEntry } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const workEntryFormSchema = insertWorkEntrySchema.extend({
  date: z.string().min(1, "Date is required"),
  workType: z.string().min(1, "Work type is required"),
  description: z.string().min(1, "Description is required"),
  timeSpent: z.string().min(1, "Time spent is required"),
});

type WorkEntryFormData = z.infer<typeof workEntryFormSchema>;

export default function WorkEntryForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const todayDate = new Date().toISOString().split('T')[0];

  // Get approved work hour requests
  const { data: approvedRequests = [] } = useQuery<WorkHourRequestWithUser[]>({
    queryKey: ["/api/work-hour-requests/my"],
    queryFn: async () => {
      const response = await fetch("/api/work-hour-requests/my");
      if (!response.ok) {
        throw new Error("Failed to fetch work hour requests");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  // Get my existing work entries to check for duplicates
  const { data: myWorkEntries = [] } = useQuery<WorkEntry[]>({
    queryKey: ["/api/work-entries/my"],
    queryFn: async () => {
      const response = await fetch("/api/work-entries/my");
      if (!response.ok) {
        throw new Error("Failed to fetch work entries");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  // Get approved dates that haven't been filled yet
  const approvedDates = approvedRequests
    .filter(request => request.status === "approved")
    .map(request => request.requestedDate);

  // Get dates that already have work entries
  const existingEntryDates = myWorkEntries.map(entry => entry.date);

  // Filter out approved dates that already have entries
  const availableApprovedDates = approvedDates.filter(date => !existingEntryDates.includes(date));

  const form = useForm<WorkEntryFormData>({
    resolver: zodResolver(workEntryFormSchema),
    defaultValues: {
      date: todayDate,
      workType: "",
      description: "",
      timeSpent: "",
    },
  });

  const createWorkEntryMutation = useMutation({
    mutationFn: async (data: WorkEntryFormData) => {
      const response = await apiRequest("POST", "/api/work-entries", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-entries/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Work entry saved successfully!",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save work entry",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WorkEntryFormData) => {
    // Validate that time spent is a valid number
    const timeSpentNum = parseFloat(data.timeSpent);
    if (isNaN(timeSpentNum) || timeSpentNum <= 0) {
      toast({
        title: "Validation Error",
        description: "Time spent must be a valid number greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Allow today's date and available approved request dates
    const today = new Date().toISOString().split('T')[0];
    const isToday = data.date === today;
    const isAvailableApprovedDate = availableApprovedDates.includes(data.date);
    
    if (!isToday && !isAvailableApprovedDate) {
      // Check if it's an approved date that already has an entry
      if (approvedDates.includes(data.date) && existingEntryDates.includes(data.date)) {
        toast({
          title: "Validation Error",
          description: "You have already added a work entry for this approved date",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Validation Error",
          description: "You can only add entries for today's date or approved work hour request dates",
          variant: "destructive",
        });
      }
      return;
    }

    createWorkEntryMutation.mutate(data);
  };

  const handleClear = () => {
    form.reset({
      date: todayDate,
      workType: "",
      description: "",
      timeSpent: "",
    });
  };

  return (
    <Card data-testid="work-entry-form">
      <CardHeader>
        <CardTitle>Log Work Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            data-testid="button-date-picker-form"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {field.value ? format(new Date(field.value), "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(format(date, 'yyyy-MM-dd'));
                            }
                          }}
                          disabled={(date) => {
                            // Get today's date at start of day for proper comparison
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const compareDate = new Date(date);
                            compareDate.setHours(0, 0, 0, 0);
                            
                            // Check if date is today
                            const isToday = compareDate.getTime() === today.getTime();
                            
                            // Check if date is an available approved request date (not already filled)
                            const dateStr = format(date, 'yyyy-MM-dd');
                            const isAvailableApprovedDate = availableApprovedDates.includes(dateStr);
                            
                            // Also check if it's a weekend (Saturday = 6, Sunday = 0)
                            const dayOfWeek = date.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            
                            // Only disable weekends if the date is NOT approved (approved dates can be any weekday that was requested)
                            if (isAvailableApprovedDate) {
                              return false; // Always allow available approved dates regardless of day of week
                            }
                            
                            // For non-approved dates, allow only today and disable weekends
                            return !isToday || isWeekend;
                          }}
                          initialFocus
                          data-testid="calendar-date-picker-form"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="workType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-work-type">
                          <SelectValue placeholder="Select work type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Task">Task</SelectItem>
                        <SelectItem value="Project">Project</SelectItem>
                        <SelectItem value="Meeting">Meeting</SelectItem>
                        <SelectItem value="Skill-up">Skill-up</SelectItem>
                        <SelectItem value="Partial Leave">Partial Leave</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="timeSpent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Spent (hours)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.5"
                        min="0.5"
                        max="12"
                        placeholder="e.g. 2.5"
                        {...field}
                        data-testid="input-time-spent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field}
                      value={field.value || ""}
                      rows={3}
                      placeholder="Brief description of work performed..."
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClear}
                data-testid="button-clear"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button 
                type="submit" 
                disabled={createWorkEntryMutation.isPending}
                data-testid="button-save"
              >
                <Save className="w-4 h-4 mr-2" />
                {createWorkEntryMutation.isPending ? "Saving..." : "Add Entry"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
