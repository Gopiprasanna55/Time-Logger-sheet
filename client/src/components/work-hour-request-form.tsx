import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Clock, Send, User } from "lucide-react";
import { format, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { WorkHourRequestWithUser } from "@shared/schema";

const requestSchema = z.object({
  requestedDate: z.string().min(1, "Date is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

type RequestFormData = z.infer<typeof requestSchema>;

export default function WorkHourRequestForm() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get my work hour requests
  const { data: myRequests = [] } = useQuery<WorkHourRequestWithUser[]>({
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

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      requestedDate: "",
      reason: "",
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: RequestFormData) => {
      return await apiRequest("POST", "/api/work-hour-requests", data);
    },
    onSuccess: () => {
      toast({
        title: "Request submitted",
        description: "Your work hour request has been sent to your manager for approval.",
      });
      form.reset();
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/work-hour-requests/my"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RequestFormData) => {
    createRequestMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "approved":
        return "text-green-600 bg-green-100";
      case "rejected":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <Card data-testid="work-hour-request-form">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Work Hour Requests
          </CardTitle>
          <Button
            onClick={() => setIsOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-new-request"
          >
            <Send className="h-4 w-4 mr-2" />
            Request Late Entry
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Request Form Modal */}
        {isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Request Work Hour Entry</h3>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="requestedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date you missed</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                                data-testid="input-requested-date"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {field.value ? format(new Date(field.value), "PPP") : "Select date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  field.onChange(format(date, "yyyy-MM-dd"));
                                }
                              }}
                              disabled={(date) => {
                                // Disable future dates and weekends
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                if (date >= today) return true;
                                
                                const dayOfWeek = date.getDay();
                                return dayOfWeek === 0 || dayOfWeek === 6;
                              }}
                              initialFocus
                              data-testid="calendar-requested-date"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for late entry</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Please explain why you need to add work hours for this date..."
                            {...field}
                            data-testid="input-reason"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsOpen(false);
                        form.reset();
                      }}
                      className="flex-1"
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createRequestMutation.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      data-testid="button-submit-request"
                    >
                      {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        )}

        {/* Request History */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-600">Recent Requests</h4>
          
          {myRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No work hour requests yet</p>
              <p className="text-sm">Request permission to add missed work hours</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {myRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-3 text-sm"
                  data-testid={`request-${request.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">
                        {format(new Date(request.requestedDate), "MMM dd, yyyy")}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-2">{request.reason}</p>
                  
                  {request.managerComments && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <p className="font-medium text-gray-700">Manager's Comments:</p>
                      <p className="text-gray-600">{request.managerComments}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    <span>Requested: {format(new Date(request.requestedAt), "MMM dd, HH:mm")}</span>
                    {request.reviewedAt && (
                      <span>Reviewed: {format(new Date(request.reviewedAt), "MMM dd, HH:mm")}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}