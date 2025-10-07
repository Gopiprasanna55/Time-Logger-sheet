import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, startOfWeek, addDays, subWeeks } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronLeft, ChevronRight, Calendar, Download, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import SimpleWorkTable from "./simple-work-table";
import type { User, WorkEntryWithUser } from "@shared/schema";
import * as React from "react";

interface UserManagementProps {
  // No longer need onViewReport since we're showing inline
}

export default function UserManagement({}: UserManagementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isManager = user?.role === "manager";
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  
  // Manager-specific state for multi-select dropdown
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  
  // Calculate the selected week range for highlighting
  const getWorkWeekRange = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    const weekEnd = addDays(weekStart, 4); // Friday
    return { from: weekStart, to: weekEnd };
  };
  
  const [selectedRange, setSelectedRange] = useState(() => getWorkWeekRange(new Date()));
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const daysInWeek = 5; // Monday to Friday only

  // Calculate date range for selected week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday as start of week
  const startDate = weekStart; // Use the selected week's Monday directly
  const endDate = addDays(startDate, daysInWeek - 1); // Friday of the week
  
  // Update selected range when week offset changes
  const updateSelectedRangeForWeek = () => {
    const newRange = getWorkWeekRange(startDate);
    setSelectedRange(newRange);
  };

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  const { data: allWorkEntries = [] } = useQuery<WorkEntryWithUser[]>({
    queryKey: ["/api/work-entries"],
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });
  
  // Manager preferences queries
  const { data: managerPreferences } = useQuery({
    queryKey: ["/api/manager-preferences"],
    enabled: isManager,
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  // For employee selection dropdown: Include only employees and HR, exclude managers
  const selectableUsers = users.filter(user => user.role === "employee" || user.role === "hr");
  
  // Initialize with all employees by default for this week's reports
  React.useEffect(() => {
    if (users.length > 0) {
      // Get all selectable users (employees and HR, exclude managers)
      const allSelectableUserIds = selectableUsers.map(user => user.id);
      
      if (isManager) {
        // For managers: check if there are saved preferences, otherwise show all employees
        if (managerPreferences && typeof managerPreferences === 'object' && managerPreferences !== null) {
          const savedSelectedIds = (managerPreferences as any).selectedEmployeeIds;
          if (Array.isArray(savedSelectedIds) && savedSelectedIds.length > 0) {
            setSelectedEmployees(savedSelectedIds);
            setSelectedUsers(new Set(savedSelectedIds));
          } else {
            // No saved preferences, show all employees by default
            setSelectedEmployees(allSelectableUserIds);
            setSelectedUsers(new Set(allSelectableUserIds));
          }
        } else {
          // No preferences loaded yet, show all employees by default
          setSelectedEmployees(allSelectableUserIds);
          setSelectedUsers(new Set(allSelectableUserIds));
        }
      } else {
        // For HR: show all employees by default
        setSelectedUsers(new Set(allSelectableUserIds));
      }
    }
  }, [isManager, managerPreferences, users.length, selectableUsers]);
  
  const savePreferencesMutation = useMutation({
    mutationFn: async (selectedEmployeeIds: string[]) => {
      const res = await apiRequest("POST", "/api/manager-preferences", { selectedEmployeeIds });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manager-preferences"] });
      toast({
        title: "Preferences saved",
        description: "Your employee selection has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving preferences",
        description: "There was an error saving your preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle user toggle for HR (using Set)
  const handleUserToggle = (userId: string) => {
    const newSelectedUsers = new Set(selectedUsers);
    if (newSelectedUsers.has(userId)) {
      newSelectedUsers.delete(userId);
    } else {
      newSelectedUsers.add(userId);
    }
    setSelectedUsers(newSelectedUsers);
  };

  // Handle employee selection for managers (using array and auto-save)
  const handleEmployeeSelection = (employeeId: string) => {
    const newSelected = selectedEmployees.includes(employeeId)
      ? selectedEmployees.filter(id => id !== employeeId)
      : [...selectedEmployees, employeeId];
    
    setSelectedEmployees(newSelected);
    setSelectedUsers(new Set(newSelected));
    
    // Auto-save preferences for managers
    if (isManager) {
      savePreferencesMutation.mutate(newSelected);
    }
  };

  // Get filtered work entries for selected date range
  const getFilteredWorkEntries = (userId: string) => {
    return allWorkEntries.filter(entry => 
      entry.userId === userId &&
      entry.date >= format(startDate, 'yyyy-MM-dd') &&
      entry.date <= format(endDate, 'yyyy-MM-dd')
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Employee Work Hours Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="user-management">
      <CardHeader className="py-2 px-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium">Employee Work Hours Reports</CardTitle>
          {!isManager && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs text-green-600 hover:text-green-800"
                data-testid="button-export-employees"
              >
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
            </div>
          )}
        </div>

        {/* Date Selection and Week Navigation */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center space-x-2">
            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-56 justify-start text-left font-normal h-8 text-xs"
                  data-testid="date-picker-trigger"
                >
                  <Calendar className="mr-2 h-3 w-3" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      // When user selects any date, calculate the work week for that date
                      setSelectedDate(date);
                      const newRange = getWorkWeekRange(date);
                      setSelectedRange(newRange);
                      // Reset week offset when selecting a specific date
                      setWeekOffset(0);
                    }
                  }}
                  modifiers={{
                    range_start: selectedRange.from,
                    range_middle: (date: Date) => {
                      if (!selectedRange.from || !selectedRange.to) return false;
                      return date > selectedRange.from && date < selectedRange.to;
                    },
                    range_end: selectedRange.to,
                  }}
                  modifiersClassNames={{
                    range_start: "bg-primary text-primary-foreground rounded-l-md",
                    range_middle: "bg-primary text-primary-foreground", 
                    range_end: "bg-primary text-primary-foreground rounded-r-md",
                  }}
                  disabled={(date) => {
                    // Disable future dates
                    if (date > new Date()) return true;
                    // Disable weekends (Saturday = 6, Sunday = 0)
                    const dayOfWeek = date.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    return isWeekend;
                  }}
                  initialFocus
                  data-testid="calendar-component"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                const newOffset = weekOffset + 1;
                setWeekOffset(newOffset);
                // Calculate from current date (today) and go back by newOffset weeks
                const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
                const newWeekStart = subWeeks(currentWeekStart, newOffset);
                const newSelectedDate = newWeekStart; // Use Monday of the new week
                setSelectedDate(newSelectedDate);
                setSelectedRange(getWorkWeekRange(newSelectedDate));
              }}
              data-testid="week-prev"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            
            <span className="text-xs font-medium px-2 whitespace-nowrap" data-testid="week-range">
              {format(startDate, "MMM dd")} - {format(endDate, "MMM dd")}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                const newOffset = Math.max(0, weekOffset - 1);
                setWeekOffset(newOffset);
                // Calculate from current date (today) and go back by newOffset weeks
                const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
                const newWeekStart = subWeeks(currentWeekStart, newOffset);
                const newSelectedDate = newWeekStart; // Use Monday of the new week
                setSelectedDate(newSelectedDate);
                setSelectedRange(getWorkWeekRange(newSelectedDate));
              }}
              disabled={weekOffset === 0}
              data-testid="week-next"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          {weekOffset === 0 ? "This Week" : `${weekOffset} week${weekOffset === 1 ? "" : "s"} ago`}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isManager ? (
          // Manager UI with multi-select dropdown
          <div className="p-4">
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Select Employees to View Reports</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 border rounded-md p-2 min-h-[40px] flex flex-wrap gap-1 items-center">
                  {selectedEmployees.length === 0 ? (
                    <span className="text-muted-foreground text-sm">Select employees...</span>
                  ) : (
                    selectedEmployees.map(id => {
                      const emp = users.find(u => u.id === id);
                      if (!emp) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm">
                          {emp.firstName} {emp.lastName}
                          <button
                            onClick={() => handleEmployeeSelection(id)}
                            className="hover:bg-destructive/20 rounded-full w-4 h-4 flex items-center justify-center"
                            data-testid={`remove-employee-${emp.employeeId}`}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })
                  )}
                </div>
                <Popover open={employeeDropdownOpen} onOpenChange={setEmployeeDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0"
                      data-testid="employee-selector"
                    >
                      <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search employees..." />
                      <CommandList>
                        <CommandEmpty>No employees found.</CommandEmpty>
                        <CommandGroup>
                          {selectableUsers.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.id}
                              onSelect={() => handleEmployeeSelection(user.id)}
                              data-testid={`employee-option-${user.employeeId}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedEmployees.includes(user.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{user.firstName} {user.lastName}</div>
                                <div className="text-sm text-muted-foreground">{user.department} - {user.designation}</div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {selectedEmployees.length > 0 && (
              <div className="overflow-auto space-y-4" style={{ maxHeight: 'calc(100vh - 600px)' }}>
                {selectedEmployees.map((employeeId) => {
                  const employee = users.find(u => u.id === employeeId);
                  if (!employee) return null;
                  return (
                    <div key={employeeId} className="border rounded-md" data-testid={`manager-worksheet-${employee.employeeId}`}>
                      <SimpleWorkTable
                        workEntries={getFilteredWorkEntries(employeeId)}
                        title={`${employee.firstName} ${employee.lastName} - Work Hours (${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd")})`}
                        showEmployeeInfo={false}
                        expectedDays={5}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // HR UI with same multi-select approach as manager
          <div className="p-4">
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Select Employees to View Reports</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 border rounded-md p-2 min-h-[40px] flex flex-wrap gap-1 items-center">
                  {selectedUsers.size === 0 ? (
                    <span className="text-muted-foreground text-sm">Select employees...</span>
                  ) : (
                    Array.from(selectedUsers).map(id => {
                      const emp = users.find(u => u.id === id);
                      if (!emp) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm">
                          {emp.firstName} {emp.lastName}
                          <button
                            onClick={() => handleUserToggle(id)}
                            className="hover:bg-destructive/20 rounded-full w-4 h-4 flex items-center justify-center"
                            data-testid={`remove-employee-${emp.employeeId}`}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })
                  )}
                </div>
                <Popover open={employeeDropdownOpen} onOpenChange={setEmployeeDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0"
                      data-testid="employee-selector"
                    >
                      <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search employees..." />
                      <CommandList>
                        <CommandEmpty>No employees found.</CommandEmpty>
                        <CommandGroup>
                          {selectableUsers.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.id}
                              onSelect={() => handleUserToggle(user.id)}
                              data-testid={`employee-option-${user.employeeId}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedUsers.has(user.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{user.firstName} {user.lastName}</div>
                                <div className="text-sm text-muted-foreground">{user.department} - {user.designation}</div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {selectedUsers.size > 0 && (
              <div className="overflow-auto space-y-4" style={{ maxHeight: 'calc(100vh - 600px)' }}>
                {Array.from(selectedUsers).map((userId) => {
                  const employee = users.find(u => u.id === userId);
                  if (!employee) return null;
                  return (
                    <div key={userId} className="border rounded-md" data-testid={`hr-worksheet-${employee.employeeId}`}>
                      <SimpleWorkTable
                        workEntries={getFilteredWorkEntries(userId)}
                        title={`${employee.firstName} ${employee.lastName} - Work Hours (${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd")})`}
                        showEmployeeInfo={false}
                        expectedDays={5}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}