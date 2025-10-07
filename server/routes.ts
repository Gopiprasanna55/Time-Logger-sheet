import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWorkEntrySchema, updateWorkEntryStatusSchema, insertManagerPreferencesSchema, insertUserSchema, insertWorkHourRequestSchema, updateWorkHourRequestSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";
import { getAuthUrl, handleCallback, ensureUserExists } from "./azure-auth";

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Authorization middleware
function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

// Combined auth + role middleware
function requireAuthAndRole(...allowedRoles: string[]) {
  return [requireAuth, requireRole(...allowedRoles)];
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);

  // // Azure AD authentication routes
  // app.get("/api/auth/azure", async (req: Request, res: Response) => {
  //   try {
  //     const authUrl = await getAuthUrl();
  //     res.redirect(authUrl);
  //   } catch (error) {
  //     console.error("Azure auth error:", error);
  //     res.status(500).json({ message: "Failed to initiate Azure authentication" });
  //   }
  // });

  app.get("/api/auth/azure", async (req, res) => {
  try {
    const authUrl = await getAuthUrl(); // generate MS login URL
    res.redirect(authUrl);
  } catch (error) {
    console.error("Azure auth error:", error);
    res.status(500).json({ message: "Failed to initiate Azure authentication" });
  }
});

app.get("/auth/redirect", async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    if (!code) return res.status(400).send("No code provided by Azure");

    const authResult = await handleCallback(code); // { accessToken, user }
    const azureUser = authResult.user;

    // Fetch existing user from your database
    const user = await storage.getUserByEmail(azureUser.email);

    if (!user) {
      return res.status(403).send("User not registered in the system");
    }

    // Save user session
    req.login(user, (err) => {
      if (err) return res.status(500).send("Login failed");

      // Redirect based on role
      if (user.role === "manager") res.redirect("/manager");
      else if (user.role === "hr") res.redirect("/hr");
      else res.redirect("/");
    });

  } catch (error) {
    console.error("Azure callback error:", error);
    res.status(500).send("Authentication failed");
  }
});



  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    try {
      const { code } = req.query;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ message: "Authorization code missing" });
      }

      const authResult = await handleCallback(code);
      const azureUser = authResult.user;
      
      // Check if user exists in our system
      let user = await storage.getUserByEmail(azureUser.email);
      
      if (!user) {
        // Auto-create user if it's navalika@fdestech.com as manager
        if (azureUser.email === "navalika@fdestech.com") {
          user = await storage.createUser({
            employeeId: "MGR002",
            username: azureUser.firstName.toLowerCase() + "." + azureUser.lastName.toLowerCase(),
            firstName: azureUser.firstName,
            lastName: azureUser.lastName,
            email: azureUser.email,
            designation: "Manager",
            department: "Management",
            role: "manager",
            password: "azure-auth" // Placeholder since we're using Azure auth
          });
        } else {
          return res.status(403).json({ 
            message: "User not found in system. Please contact your administrator." 
          });
        }
      }
      
      // Login with our system's user data (with correct user ID)
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        // Redirect based on user role
        if (user.role === "manager") {
          res.redirect("/manager");
        } else if (user.role === "hr") {
          res.redirect("/hr");
        } else {
          res.redirect("/");
        }
      });
    } catch (error) {
      console.error("Azure callback error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Get all users (for HR/Manager only)
  app.get("/api/users", requireAuth, ensureUserExists, requireRole("hr", "manager"), async (req: Request, res: Response) => {
    
    try {
      const users = await storage.getAllUsers();
      const sanitizedUsers = users.map(user => {
        const { password, ...publicUser } = user;
        return publicUser;
      });
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create user (manager only)
  app.post("/api/users", requireAuth, ensureUserExists, requireRole("manager"), async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      const { password, ...publicUser } = user;
      res.json(publicUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update user (manager only)
  app.put("/api/users/:id", requireAuth, ensureUserExists, requireRole("manager"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      
      // Don't allow updating the ID through this endpoint
      delete updateData.id;
      
      // Auto-generate username if firstName or lastName changed but username not provided
      if ((updateData.firstName || updateData.lastName) && !updateData.username) {
        const existingUser = await storage.getUser(id);
        if (existingUser) {
          const firstName = updateData.firstName || existingUser.firstName;
          const lastName = updateData.lastName || existingUser.lastName;
          updateData.username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
        }
      }
      
      // Don't update password through this endpoint (users would need a separate endpoint for that)
      delete updateData.password;
      
      const updatedUser = await storage.updateUser(id, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...publicUser } = updatedUser;
      res.json(publicUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user (manager only)
  app.delete("/api/users/:id", requireAuth, ensureUserExists, requireRole("manager"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Prevent managers from deleting themselves
      if (req.user!.id === id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      if (error.message === "Cannot delete the last manager user") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Create work entry
  app.post("/api/work-entries", requireAuth, async (req, res) => {
    try {
      const validatedData = insertWorkEntrySchema.parse(req.body);
      
      // Server-side validation: only allow today's date or approved request dates
      const today = new Date().toISOString().split('T')[0];
      const requestedDate = validatedData.date;
      
      let isAllowedDate = requestedDate === today;
      
      // If not today, check if it's an approved work hour request date
      if (!isAllowedDate) {
        const approvedRequests = await storage.getWorkHourRequestsByEmployeeId(req.user!.id);
        const approvedDates = approvedRequests
          .filter(request => request.status === "approved")
          .map(request => request.requestedDate);
        
        isAllowedDate = approvedDates.includes(requestedDate);
      }
      
      if (!isAllowedDate) {
        return res.status(400).json({ 
          message: "You can only create work entries for today's date or approved work hour request dates" 
        });
      }
      
      // Check for existing work entry on the same date to prevent duplicates
      const existingEntries = await storage.getWorkEntriesByUserIdWithFilters({
        userId: req.user!.id,
        startDate: requestedDate,
        endDate: requestedDate,
      });
      
      if (existingEntries.length > 0) {
        return res.status(400).json({ 
          message: "A work entry already exists for this date" 
        });
      }
      
      const workEntry = await storage.createWorkEntry({
        ...validatedData,
        userId: req.user!.id,
      });

      res.json(workEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create work entry" });
    }
  });

  // Get user's work entries
  app.get("/api/work-entries/my", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const filters = {
        userId: req.user!.id,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
      };

      const entries = await storage.getWorkEntriesByUserIdWithFilters(filters);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch work entries" });
    }
  });

  // Get all work entries (for HR/Manager only)
  app.get("/api/work-entries", requireAuth, requireRole("hr", "manager"), async (req: Request, res: Response) => {
    try {
      const { userId, department, status, startDate, endDate } = req.query;

      const filters = {
        userId: userId as string | undefined,
        department: department as string | undefined,
        status: status as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
      };

      const entries = await storage.getWorkEntriesByFilters(filters);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch work entries" });
    }
  });

  // Update work entry status (approve/reject) - HR/Manager only
  app.patch("/api/work-entries/:id/status", requireAuth, requireRole("hr", "manager"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = updateWorkEntryStatusSchema.parse(req.body);

      const entry = await storage.updateWorkEntryStatus(id, validatedData.status, req.user!.id);
      if (!entry) {
        return res.status(404).json({ message: "Work entry not found" });
      }

      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update work entry status" });
    }
  });

  // Delete work entry - HR/Manager only
  app.delete("/api/work-entries/:id", requireAuth, requireRole("hr", "manager"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteWorkEntry(id);
      
      if (!success) {
        return res.status(404).json({ message: "Work entry not found" });
      }

      res.json({ message: "Work entry deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete work entry" });
    }
  });

  // Get daily work report for a specific user and date
  app.get("/api/users/:userId/daily-report/:date", requireAuth, async (req, res) => {
    try {
      const { userId, date } = req.params;
      
      // Users can only access their own reports unless they're HR/Manager
      if (userId !== req.user!.id && !["hr", "manager"].includes(req.user!.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getDailyWorkReport(userId, date);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily work report" });
    }
  });

  // Legacy timesheet endpoints for backward compatibility - secured
  app.post("/api/timesheets", requireAuth, async (req: Request, res: Response) => {
    try {
      const validatedData = insertWorkEntrySchema.parse(req.body);
      const entry = await storage.createTimesheet({
        ...validatedData,
        userId: req.user!.id,
      });

      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create timesheet" });
    }
  });

  app.get("/api/timesheets/my", requireAuth, async (req: Request, res: Response) => {
    try {
      const timesheets = await storage.getTimesheetsByUserId(req.user!.id);
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch timesheets" });
    }
  });

  app.get("/api/timesheets", requireAuth, requireRole("hr", "manager"), async (req: Request, res: Response) => {
    try {
      const { userId, department, status, startDate, endDate } = req.query;

      const filters = {
        userId: userId as string | undefined,
        department: department as string | undefined,
        status: status as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
      };

      const timesheets = await storage.getTimesheetsByFilters(filters);
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch timesheets" });
    }
  });

  app.patch("/api/timesheets/:id/status", requireAuth, requireRole("hr", "manager"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = updateWorkEntryStatusSchema.parse(req.body);

      const timesheet = await storage.updateTimesheetStatus(id, validatedData.status, req.user!.id);
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }

      res.json(timesheet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update timesheet status" });
    }
  });

  app.delete("/api/timesheets/:id", requireAuth, requireRole("hr", "manager"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTimesheet(id);
      
      if (!success) {
        return res.status(404).json({ message: "Timesheet not found" });
      }

      res.json({ message: "Timesheet deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete timesheet" });
    }
  });

  // Get work entry statistics
  app.get("/api/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      // Check user role to determine which stats to show
      if (req.user!.role === "hr" || req.user!.role === "manager") {
        const allEntries = await storage.getAllWorkEntries();
        const allUsers = await storage.getAllUsers();
        const employees = allUsers.filter(u => u.role === "employee");
        
        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        
        // Find employees who submitted today
        const employeesWithTodayEntries = new Set();
        allEntries.forEach(entry => {
          if (entry.date === today) {
            employeesWithTodayEntries.add(entry.userId);
          }
        });
        
        const submittedToday = employeesWithTodayEntries.size;
        const notSubmittedToday = employees.length - submittedToday;
        const totalHours = allEntries.reduce((sum, e) => sum + parseFloat(e.timeSpent), 0);
        const avgHours = totalHours / allEntries.length || 0;

        res.json({
          totalEmployees: employees.length,
          totalEntries: allEntries.length,
          totalHours: totalHours.toFixed(1),
          avgHours: avgHours.toFixed(1),
          submittedToday,
          notSubmittedToday,
        });
      } else {
        // Employee stats
        const entries = await storage.getWorkEntriesByUserId(req.user!.id);
        const today = new Date().toISOString().split('T')[0];
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const todayHours = entries.filter(e => e.date === today).reduce((sum, e) => sum + parseFloat(e.timeSpent), 0);
        const weekHours = entries.filter(e => new Date(e.date) >= startOfWeek).reduce((sum, e) => sum + parseFloat(e.timeSpent), 0);
        const monthHours = entries.filter(e => new Date(e.date) >= startOfMonth).reduce((sum, e) => sum + parseFloat(e.timeSpent), 0);

        res.json({
          todayHours: todayHours.toFixed(1),
          weekHours: weekHours.toFixed(1),
          monthHours: monthHours.toFixed(1),
          status: "On Track",
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Export work entries - HR/Manager only
  app.get("/api/work-entries/export", requireAuth, requireRole("hr", "manager"), async (req: Request, res: Response) => {
    try {
      const { format, ...filters } = req.query;
      const entries = await storage.getWorkEntriesByFilters(filters as any);

      if (format === "csv") {
        const csvHeaders = "Employee ID,Employee,Date,Work Type,Description,Time Spent,Status\n";
        const csvRows = entries.map(e => 
          `"${e.user.employeeId}","${e.user.firstName} ${e.user.lastName}","${e.date}","${e.workType}","${e.description}","${e.timeSpent}","${e.status}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="work-entries.csv"');
        res.send(csvHeaders + csvRows);
      } else {
        res.json(entries);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to export work entries" });
    }
  });

  // Legacy export endpoint - HR/Manager only
  app.get("/api/timesheets/export", requireAuth, requireRole("hr", "manager"), async (req: Request, res: Response) => {
    try {
      const { format, ...filters } = req.query;
      const timesheets = await storage.getTimesheetsByFilters(filters as any);

      if (format === "csv") {
        const csvHeaders = "Employee,Date,Work Type,Description,Time Spent,Status\n";
        const csvRows = timesheets.map(t => 
          `"${t.user.firstName} ${t.user.lastName}","${t.date}","${t.workType}","${t.description}","${t.timeSpent}","${t.status}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="timesheets.csv"');
        res.send(csvHeaders + csvRows);
      } else {
        res.json(timesheets);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to export timesheets" });
    }
  });

  // Manager dashboard statistics
  app.get("/api/manager-dashboard-stats", requireAuth, requireRole("manager"), async (req: Request, res: Response) => {
    try {
      // Get all users and filter employees
      const allUsers = await storage.getAllUsers();
      const employees = allUsers.filter(user => user.role === "employee");
      
      // Get all work entries
      const allEntries = await storage.getAllWorkEntries();
      
      // Calculate total employees
      const totalEmployees = employees.length;
      
      // Calculate submitted vs not submitted for TODAY only
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Get work entries for today
      const todayEntries = allEntries.filter(entry => entry.date === todayStr);
      
      // Count employees who submitted work today
      const employeesWithEntriesToday = new Set(todayEntries.map(entry => entry.userId));
      const submitted = employeesWithEntriesToday.size;
      const notSubmitted = totalEmployees - submitted;
      
      // Calculate total work hours for today (using same todayEntries from above)
      const totalWorkHoursToday = todayEntries.reduce((sum, entry) => sum + parseFloat(entry.timeSpent), 0);
      
      res.json({
        totalEmployees,
        submitted,
        notSubmitted,
        totalWorkHours: totalWorkHoursToday.toFixed(1)
      });
    } catch (error) {
      console.error("Manager dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch manager dashboard statistics" });
    }
  });

  // Manager preferences endpoints
  
  // Get manager preferences
  app.get("/api/manager-preferences", requireAuth, requireRole("manager"), async (req: Request, res: Response) => {
    try {
      const preferences = await storage.getManagerPreferences(req.user!.id);
      if (preferences) {
        const selectedEmployeeIds = JSON.parse(preferences.selectedEmployeeIds);
        res.json({ ...preferences, selectedEmployeeIds });
      } else {
        res.json({ selectedEmployeeIds: [] });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch manager preferences" });
    }
  });
  
  // Save/Update manager preferences
  app.post("/api/manager-preferences", requireAuth, requireRole("manager"), async (req: Request, res: Response) => {
    try {
      const { selectedEmployeeIds } = req.body;
      if (!Array.isArray(selectedEmployeeIds)) {
        return res.status(400).json({ message: "selectedEmployeeIds must be an array" });
      }
      
      const preferences = await storage.updateManagerPreferences(req.user!.id, selectedEmployeeIds);
      res.json({ ...preferences, selectedEmployeeIds: JSON.parse(preferences.selectedEmployeeIds) });
    } catch (error) {
      res.status(500).json({ message: "Failed to save manager preferences" });
    }
  });

  // Work Hour Request endpoints
  
  // Create work hour request (employees only)
  app.post("/api/work-hour-requests", requireAuth, requireRole("employee"), async (req: Request, res: Response) => {
    try {
      const validatedData = insertWorkHourRequestSchema.parse(req.body);
      
      // Check if request for this date already exists
      const existingRequests = await storage.getWorkHourRequestsByEmployeeId(req.user!.id);
      const duplicateRequest = existingRequests.find(request => 
        request.requestedDate === validatedData.requestedDate && 
        request.status === "pending"
      );
      
      if (duplicateRequest) {
        return res.status(400).json({ message: "A request for this date is already pending" });
      }
      
      // Check if the requested date is in the past
      const requestedDate = new Date(validatedData.requestedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (requestedDate >= today) {
        return res.status(400).json({ message: "Can only request work hours for past dates" });
      }
      
      const request = await storage.createWorkHourRequest({
        ...validatedData,
        employeeId: req.user!.id,
      });
      
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create work hour request" });
    }
  });
  
  // Get work hour requests for current user (employees)
  app.get("/api/work-hour-requests/my", requireAuth, requireRole("employee"), async (req: Request, res: Response) => {
    try {
      const requests = await storage.getWorkHourRequestsByEmployeeId(req.user!.id);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch work hour requests" });
    }
  });
  
  // Get all pending work hour requests (managers only)
  app.get("/api/work-hour-requests", requireAuth, requireRole("manager"), async (req: Request, res: Response) => {
    try {
      const requests = await storage.getWorkHourRequestsByManagerId(req.user!.id);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch work hour requests" });
    }
  });
  
  // Approve/reject work hour request (managers only)
  app.put("/api/work-hour-requests/:id", requireAuth, requireRole("manager"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = updateWorkHourRequestSchema.parse(req.body);
      
      const request = await storage.updateWorkHourRequest(id, {
        status: validatedData.status,
        managerId: req.user!.id,
        managerComments: validatedData.managerComments,
      });
      
      if (!request) {
        return res.status(404).json({ message: "Work hour request not found" });
      }
      
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update work hour request" });
    }
  });
  
  // Get specific work hour request (for both employees and managers)
  app.get("/api/work-hour-requests/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const request = await storage.getWorkHourRequestById(id);
      
      if (!request) {
        return res.status(404).json({ message: "Work hour request not found" });
      }
      
      // Check authorization - employees can only see their own requests
      if (req.user!.role === "employee" && request.employeeId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch work hour request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}