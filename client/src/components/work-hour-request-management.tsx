import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, CheckCircle, XCircle, User, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { WorkHourRequestWithUser } from "@shared/schema";

interface ApprovalModalProps {
  request: WorkHourRequestWithUser;
  action: "approve" | "reject";
  onClose: () => void;
  onSubmit: (id: string, status: string, comments?: string) => void;
  isPending: boolean;
}

function ApprovalModal({ request, action, onClose, onSubmit, isPending }: ApprovalModalProps) {
  const [comments, setComments] = useState("");

  const handleSubmit = () => {
    onSubmit(request.id, action === "approve" ? "approved" : "rejected", comments);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">
          {action === "approve" ? "Approve" : "Reject"} Request
        </h3>
        
        <div className="space-y-4 mb-6">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4" />
              <span className="font-medium">{request.employee?.firstName} {request.employee?.lastName}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(request.requestedDate), "MMMM dd, yyyy")}</span>
            </div>
            <p className="text-sm text-gray-600">{request.reason}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Comments {action === "reject" ? "(required)" : "(optional)"}
            </label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={`Add your comments for ${action === "approve" ? "approving" : "rejecting"} this request...`}
              rows={3}
              data-testid="input-manager-comments"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            data-testid="button-cancel-action"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || (action === "reject" && !comments.trim())}
            className={`flex-1 ${
              action === "approve" 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-red-600 hover:bg-red-700"
            }`}
            data-testid={`button-${action}-request`}
          >
            {isPending ? "Processing..." : (action === "approve" ? "Approve" : "Reject")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function WorkHourRequestManagement() {
  const [selectedRequest, setSelectedRequest] = useState<WorkHourRequestWithUser | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all work hour requests for this manager
  const { data: requests = [], isLoading } = useQuery<WorkHourRequestWithUser[]>({
    queryKey: ["/api/work-hour-requests"],
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, comments }: { id: string; status: string; comments?: string }) => {
      return await apiRequest("PUT", `/api/work-hour-requests/${id}`, {
        status,
        managerComments: comments || undefined,
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: `Request ${variables.status}`,
        description: `The work hour request has been ${variables.status}.`,
      });
      setSelectedRequest(null);
      setActionType(null);
      queryClient.invalidateQueries({ queryKey: ["/api/work-hour-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update request",
        variant: "destructive",
      });
    },
  });

  const handleAction = (request: WorkHourRequestWithUser, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
  };

  const handleSubmit = (id: string, status: string, comments?: string) => {
    updateRequestMutation.mutate({ id, status, comments });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const reviewedRequests = requests.filter(r => r.status !== "pending");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="bg-card border border-border rounded-lg p-6 h-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="work-hour-request-management">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Work Hour Requests
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No pending requests</p>
              <p className="text-sm">All work hour requests have been reviewed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 bg-yellow-50 border-yellow-200"
                  data-testid={`pending-request-${request.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">
                            {request.employee?.firstName} {request.employee?.lastName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {format(new Date(request.requestedDate), "MMM dd, yyyy")}
                          </span>
                        </div>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-700">{request.reason}</p>
                      
                      <div className="text-xs text-gray-500">
                        Requested: {format(new Date(request.requestedAt), "MMM dd, HH:mm")}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => handleAction(request, "approve")}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid={`button-approve-${request.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(request, "reject")}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        data-testid={`button-reject-${request.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviewed Requests */}
      {reviewedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Recently Reviewed Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {reviewedRequests.slice(0, 10).map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-3 text-sm"
                  data-testid={`reviewed-request-${request.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        {request.employee?.firstName} {request.employee?.lastName}
                      </span>
                      <span className="text-gray-500">•</span>
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(request.requestedDate), "MMM dd")}</span>
                    </div>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </div>
                  
                  {request.managerComments && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <p className="font-medium text-gray-700">Your Comments:</p>
                      <p className="text-gray-600">{request.managerComments}</p>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    Reviewed: {request.reviewedAt ? format(new Date(request.reviewedAt), "MMM dd, HH:mm") : "N/A"}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Modal */}
      {selectedRequest && actionType && (
        <ApprovalModal
          request={selectedRequest}
          action={actionType}
          onClose={() => {
            setSelectedRequest(null);
            setActionType(null);
          }}
          onSubmit={handleSubmit}
          isPending={updateRequestMutation.isPending}
        />
      )}
    </div>
  );
}