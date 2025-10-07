import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

import type { WorkEntry, WorkEntryWithUser } from "@shared/schema";

interface SimpleWorkTableProps {
  workEntries: WorkEntry[] | WorkEntryWithUser[];
  title: string;
  showEmployeeInfo?: boolean;
  expectedDays?: number; // Expected number of days in the viewing period
}

interface GroupedEntries {
  [date: string]: (WorkEntry | WorkEntryWithUser)[];
}

export default function SimpleWorkTable({ 
  workEntries, 
  title, 
  showEmployeeInfo = false,
  expectedDays
}: SimpleWorkTableProps) {
  
  // Group entries by date
  const groupedEntries = workEntries.reduce<GroupedEntries>((acc, entry) => {
    const entryDate = format(new Date(entry.date), 'dd/MM/yyyy');
    if (!acc[entryDate]) {
      acc[entryDate] = [];
    }
    acc[entryDate].push(entry);
    return acc;
  }, {});

  // Sort dates in descending order (most recent first)
  const sortedDates = Object.keys(groupedEntries).sort((a, b) => {
    const dateA = new Date(a.split('/').reverse().join('/'));
    const dateB = new Date(b.split('/').reverse().join('/'));
    return dateB.getTime() - dateA.getTime();
  });

  const getWorkTypeColor = (workType: string) => {
    const colors: Record<string, string> = {
      "Task": "text-blue-700",
      "Project": "text-green-700", 
      "Meeting": "text-purple-700",
      "Skill-up": "text-orange-700",
      "Partial Leave": "text-red-700"
    };
    return colors[workType] || "text-gray-700";
  };

  if (workEntries.length === 0) {
    return (
      <Card data-testid="simple-work-table">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-center py-8 text-muted-foreground text-xs" data-testid="no-work-entries">
            No work entries found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="simple-work-table">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative max-h-[300px] overflow-auto">
          <Table className="border border-border border-collapse table-fixed text-xs [&_th]:border [&_td]:border [&_th]:border-border [&_td]:border-border [&_th]:bg-muted/30 [&_th]:text-foreground [&_th]:font-medium [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_tr:nth-child(even)]:bg-muted/10">
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-20 text-center">Date</TableHead>
                <TableHead className="w-20 text-center">Work Type</TableHead>
                <TableHead className="text-left">Description</TableHead>
                {showEmployeeInfo && (
                  <TableHead className="w-32 text-center">Employee</TableHead>
                )}
                <TableHead className="w-20 text-right">Work Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDates.map((date) => {
                const entries = groupedEntries[date];
                const dailyTotal = entries.reduce((sum, entry) => sum + parseFloat(entry.timeSpent), 0);
                
                return entries.map((entry, index) => {
                  const hasEmployeeInfo = 'user' in entry && entry.user;
                  
                  return (
                    <TableRow 
                      key={`${entry.id}-${index}`} 
                      className="hover:bg-muted/20"
                      data-testid={`work-entry-row-${entry.id}`}
                    >
                      {/* Date column - only show for first entry of each date */}
                      <TableCell 
                        className="text-xs text-center align-middle font-medium"
                        data-testid={`date-${entry.id}`}
                        rowSpan={index === 0 ? entries.length : undefined}
                        style={index === 0 ? {} : { display: 'none' }}
                      >
                        {index === 0 && (
                          <div className="text-xs font-medium">
                            {date}
                          </div>
                        )}
                      </TableCell>
                      
                      {/* Work Type */}
                      <TableCell 
                        className="text-xs text-center" 
                        data-testid={`work-type-${entry.id}`}
                      >
                        <span className={`${getWorkTypeColor(entry.workType)} font-medium text-xs`}>
                          {entry.workType}
                        </span>
                      </TableCell>
                      
                      {/* Description */}
                      <TableCell 
                        className="text-xs text-left" 
                        data-testid={`description-${entry.id}`}
                      >
                        <div className="truncate" title={entry.description}>
                          {entry.description || '-'}
                        </div>
                      </TableCell>
                      
                      {/* Employee Info (if shown) */}
                      {showEmployeeInfo && (
                        <TableCell 
                          className="text-xs text-center" 
                          data-testid={`employee-${entry.id}`}
                        >
                          {hasEmployeeInfo ? (
                            <div className="truncate">
                              <div className="font-medium text-xs">
                                {entry.user.firstName} {entry.user.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {entry.user.employeeId}
                              </div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground text-xs">-</div>
                          )}
                        </TableCell>
                      )}
                      
                      {/* Work Hours */}
                      <TableCell 
                        className="text-xs text-right font-medium tabular-nums" 
                        data-testid={`hours-${entry.id}`}
                      >
                        {parseFloat(entry.timeSpent).toFixed(1)}h
                      </TableCell>
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </Table>
        </div>
        
        {/* Summary footer */}
        <div className="px-3 py-2 border-t border-border bg-muted/20">
          <div className="flex justify-between text-xs font-medium">
            <span>
              Total Entries: {workEntries.length} | Total Days: {expectedDays || sortedDates.length}
            </span>
            <span className="tabular-nums">
              Total Hours: {workEntries.reduce((sum, entry) => sum + parseFloat(entry.timeSpent), 0).toFixed(1)}h
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}