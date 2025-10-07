import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: text("employee_id").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  designation: text("designation").notNull(),
  role: text("role").notNull().default("employee"), // employee, hr, or manager
  department: text("department").notNull(),
});

export const workEntries = pgTable("work_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  workType: text("work_type").notNull(), // Task, Project, Meeting, Skill-up, Partial Leave
  description: text("description").notNull(),
  timeSpent: text("time_spent").notNull(), // hours in decimal format
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const managerPreferences = pgTable("manager_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  managerId: varchar("manager_id").notNull(),
  selectedEmployeeIds: text("selected_employee_ids").notNull(), // JSON array of employee IDs
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const workHourRequests = pgTable("work_hour_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  requestedDate: text("requested_date").notNull(), // YYYY-MM-DD format
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  managerId: varchar("manager_id"),
  managerComments: text("manager_comments"),
  requestedAt: timestamp("requested_at").notNull().default(sql`now()`),
  reviewedAt: timestamp("reviewed_at"),
});


export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
}).partial({
  username: true,
  password: true,
});

export const insertWorkEntrySchema = createInsertSchema(workEntries).omit({
  id: true,
  userId: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
});

export const insertManagerPreferencesSchema = createInsertSchema(managerPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkHourRequestSchema = createInsertSchema(workHourRequests).omit({
  id: true,
  employeeId: true,
  managerId: true,
  managerComments: true,
  requestedAt: true,
  reviewedAt: true,
});

export const updateWorkHourRequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  managerComments: z.string().optional(),
});


export const updateWorkEntryStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type PublicUser = Omit<User, "password">;
export type InsertWorkEntry = z.infer<typeof insertWorkEntrySchema>;
export type WorkEntry = typeof workEntries.$inferSelect;
export type UpdateWorkEntryStatus = z.infer<typeof updateWorkEntryStatusSchema>;
export type InsertManagerPreferences = z.infer<typeof insertManagerPreferencesSchema>;
export type ManagerPreferences = typeof managerPreferences.$inferSelect;
export type InsertWorkHourRequest = z.infer<typeof insertWorkHourRequestSchema>;
export type WorkHourRequest = typeof workHourRequests.$inferSelect;
export type UpdateWorkHourRequest = z.infer<typeof updateWorkHourRequestSchema>;

export interface WorkEntryWithUser extends WorkEntry {
  user: PublicUser;
}

export interface WorkHourRequestWithUser extends WorkHourRequest {
  employee: PublicUser;
  manager?: PublicUser;
}

export interface DailyWorkReport {
  date: string;
  entries: WorkEntry[];
  totalHours: number;
}



// Legacy types for backward compatibility
export const timesheets = workEntries;
export type Timesheet = WorkEntry;
export type TimesheetWithUser = WorkEntryWithUser;
export type InsertTimesheet = InsertWorkEntry;
export const insertTimesheetSchema = insertWorkEntrySchema;
export const updateTimesheetStatusSchema = updateWorkEntryStatusSchema;
