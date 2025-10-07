import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, subDays, addDays, startOfWeek, subWeeks, endOfWeek } from "date-fns";
import WorkEntryForm from "@/components/timesheet-form";
import WorkHourRequestForm from "@/components/work-hour-request-form";
import SimpleWorkTable from "@/components/simple-work-table";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import type { WorkEntry } from "@shared/schema";


export default function EmployeeDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const daysInWeek = 5; // Monday to Friday only
  
  // Calculate the selected week range for highlighting
  const getWorkWeekRange = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    const weekEnd = addDays(weekStart, 4); // Friday
    return { from: weekStart, to: weekEnd };
  };
  
  const [selectedRange, setSelectedRange] = useState(() => getWorkWeekRange(new Date()));

  // Calculate date range for selected week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday as start of week
  const startDate = weekStart; // Use the selected week's Monday directly
  const endDate = addDays(startDate, daysInWeek - 1); // Friday of the week
  


  const { data: workEntries = [], isLoading: entriesLoading } = useQuery<WorkEntry[]>({
    queryKey: ["/api/work-entries/my", format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await fetch(`/api/work-entries/my?startDate=${format(startDate, 'yyyy-MM-dd')}&endDate=${format(endDate, 'yyyy-MM-dd')}`);
      if (!response.ok) {
        throw new Error('Failed to fetch work entries');
      }
      return response.json();
    },
  });

  if (entriesLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="bg-card border border-border rounded-lg p-6 h-96"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="employee-dashboard">
      <div className="space-y-6">

        {/* Work Entry Form */}
        <WorkEntryForm />

        {/* Work Hour Request Form */}
        <WorkHourRequestForm />

        {/* Date Filter and Work Entries */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">My Work Entries</h2>
            <div className="flex items-center space-x-2">
              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-64 justify-start text-left font-normal"
                    data-testid="button-date-picker"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        // Calculate the week difference between selected date and current date
                        const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
                        const selectedWeekStart = startOfWeek(date, { weekStartsOn: 1 });
                        
                        // Calculate how many weeks the selected date is from current week
                        const weeksDiff = Math.round((currentWeekStart.getTime() - selectedWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
                        
                        const workWeekRange = getWorkWeekRange(date);
                        setSelectedRange(workWeekRange);
                        setSelectedDate(date);
                        setWeekOffset(weeksDiff); // Set correct week offset for the selected date
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
                    data-testid="calendar-date-picker"
                  />
                </PopoverContent>
              </Popover>

              {/* Week Navigation Controls */}
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
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
                  disabled={startDate <= subDays(new Date(), 365)} // Limit to 1 year back
                  data-testid="button-prev-week"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
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
                  data-testid="button-next-week"
                >
                  Next week
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Date Range Display */}
          <div className="text-sm text-muted-foreground">
            Showing entries from {format(startDate, "MMM dd, yyyy")} to {format(endDate, "MMM dd, yyyy")}
          </div>

          <SimpleWorkTable
            workEntries={workEntries}
            title={`Work Entries (${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd")})`}
            showEmployeeInfo={false}
            expectedDays={daysInWeek}
          />
        </div>
      </div>
    </div>
  );
}
