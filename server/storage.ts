import { type User, type InsertUser, type WorkEntry, type InsertWorkEntry, type WorkEntryWithUser, type DailyWorkReport, type ManagerPreferences, type InsertManagerPreferences, type WorkHourRequest, type InsertWorkHourRequest, type WorkHourRequestWithUser, users, workEntries, managerPreferences, workHourRequests } from "@shared/schema";
import { randomUUID, scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import session from "express-session";
import createMemoryStore from "memorystore";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, gte, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

// Load .env file contents into process.env
dotenv.config();

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Work Entry methods
  createWorkEntry(entry: InsertWorkEntry & { userId: string }): Promise<WorkEntry>;
  getWorkEntriesByUserId(userId: string): Promise<WorkEntry[]>;
  getWorkEntriesByUserIdWithFilters(filters: {
    userId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<WorkEntry[]>;
  getAllWorkEntries(): Promise<WorkEntryWithUser[]>;
  getWorkEntryById(id: string): Promise<WorkEntry | undefined>;
  updateWorkEntryStatus(id: string, status: string, reviewedBy: string): Promise<WorkEntry | undefined>;
  deleteWorkEntry(id: string): Promise<boolean>;
  getWorkEntriesByFilters(filters: {
    userId?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<WorkEntryWithUser[]>;
  getDailyWorkReport(userId: string, date: string): Promise<DailyWorkReport>;
  
  // Manager preferences methods
  getManagerPreferences(managerId: string): Promise<ManagerPreferences | undefined>;
  saveManagerPreferences(preferences: InsertManagerPreferences): Promise<ManagerPreferences>;
  updateManagerPreferences(managerId: string, selectedEmployeeIds: string[]): Promise<ManagerPreferences>;
  
  // Work hour request methods
  createWorkHourRequest(request: InsertWorkHourRequest & { employeeId: string }): Promise<WorkHourRequest>;
  getWorkHourRequestsByEmployeeId(employeeId: string): Promise<WorkHourRequestWithUser[]>;
  getWorkHourRequestsByManagerId(managerId: string): Promise<WorkHourRequestWithUser[]>;
  getAllWorkHourRequests(): Promise<WorkHourRequestWithUser[]>;
  getWorkHourRequestById(id: string): Promise<WorkHourRequestWithUser | undefined>;
  updateWorkHourRequest(id: string, updates: { status: string; managerId?: string; managerComments?: string }): Promise<WorkHourRequest | undefined>;
  deleteWorkHourRequest(id: string): Promise<boolean>;
  
  // Legacy timesheet methods for backward compatibility
  createTimesheet(timesheet: InsertWorkEntry & { userId: string }): Promise<WorkEntry>;
  getTimesheetsByUserId(userId: string): Promise<WorkEntry[]>;
  getAllTimesheets(): Promise<WorkEntryWithUser[]>;
  getTimesheetById(id: string): Promise<WorkEntry | undefined>;
  updateTimesheetStatus(id: string, status: string, reviewedBy: string): Promise<WorkEntry | undefined>;
  deleteTimesheet(id: string): Promise<boolean>;
  getTimesheetsByFilters(filters: {
    userId?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<WorkEntryWithUser[]>;
  
}

const MemoryStore = createMemoryStore(session);

// Database connection
const client = neon(process.env.DATABASE_URL!);
const db = drizzle(client);

export class DbStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    this.seedData().catch(console.error);
  }

  private async seedData() {
    // Create essential manager account if it doesn't exist
    const existingUser = await this.getUserByEmail("navalika@fdestech.com");
    if (!existingUser) {
      const accounts = [
        { 
          employeeId: "MGR002", 
          username: "navalika.fd", 
          password: "azure-auth", 
          firstName: "Navalika", 
          lastName: "FD", 
          email: "navalika@fdestech.com", 
          designation: "Operations Manager", 
          role: "manager", 
          department: "Management" 
        }
      ];

      for (const account of accounts) {
        const hashedPassword = await hashPassword(account.password);
        await db.insert(users).values({
          ...account,
          password: hashedPassword,
        });
      }
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Auto-generate username if not provided
    const username = insertUser.username || 
      `${insertUser.firstName.toLowerCase()}.${insertUser.lastName.toLowerCase()}`;
    
    // Use provided password or default
    const password = insertUser.password || "defaultPassword123";
    const hashedPassword = await hashPassword(password);
    
    const userData = { 
      ...insertUser, 
      username,
      password: hashedPassword,
      role: insertUser.role || "employee"
    };

    const result = await db.insert(users).values(userData).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const user = await this.getUser(id);
    if (!user) return false;

    // Don't allow deletion of the last manager user
    const allUsers = await this.getAllUsers();
    const remainingUsers = allUsers.filter(u => u.id !== id);
    const hasManagersLeft = remainingUsers.some(u => u.role === "manager");
    
    if (user.role === "manager" && !hasManagersLeft) {
      throw new Error("Cannot delete the last manager user");
    }

    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async createWorkEntry(data: InsertWorkEntry & { userId: string }): Promise<WorkEntry> {
    const workEntryData = {
      ...data,
      status: "pending" as const,
      reviewedBy: null,
      reviewedAt: null,
    };
    const result = await db.insert(workEntries).values(workEntryData).returning();
    return result[0];
  }

  async getWorkEntriesByUserId(userId: string): Promise<WorkEntry[]> {
    return await db.select().from(workEntries)
      .where(eq(workEntries.userId, userId))
      .orderBy(sql`${workEntries.date} DESC`);
  }

  async getWorkEntriesByUserIdWithFilters(filters: {
    userId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<WorkEntry[]> {
    const conditions = [eq(workEntries.userId, filters.userId)];

    if (filters.startDate) {
      conditions.push(gte(workEntries.date, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(workEntries.date, filters.endDate));
    }

    return await db.select().from(workEntries)
      .where(and(...conditions))
      .orderBy(sql`${workEntries.date} DESC`);
  }

  async getAllWorkEntries(): Promise<WorkEntryWithUser[]> {
    const result = await db.select({
      id: workEntries.id,
      userId: workEntries.userId,
      date: workEntries.date,
      workType: workEntries.workType,
      description: workEntries.description,
      timeSpent: workEntries.timeSpent,
      status: workEntries.status,
      reviewedBy: workEntries.reviewedBy,
      reviewedAt: workEntries.reviewedAt,
      createdAt: workEntries.createdAt,
      user: {
        id: users.id,
        employeeId: users.employeeId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        designation: users.designation,
        role: users.role,
        department: users.department,
      }
    })
    .from(workEntries)
    .leftJoin(users, eq(workEntries.userId, users.id))
    .orderBy(sql`${workEntries.date} DESC`);

    return result.filter(entry => entry.user) as WorkEntryWithUser[];
  }

  async getWorkEntryById(id: string): Promise<WorkEntry | undefined> {
    const result = await db.select().from(workEntries).where(eq(workEntries.id, id)).limit(1);
    return result[0];
  }

  async updateWorkEntryStatus(id: string, status: string, reviewedBy: string): Promise<WorkEntry | undefined> {
    const result = await db.update(workEntries)
      .set({ 
        status, 
        reviewedBy, 
        reviewedAt: new Date() 
      })
      .where(eq(workEntries.id, id))
      .returning();
    return result[0];
  }

  async deleteWorkEntry(id: string): Promise<boolean> {
    await db.delete(workEntries).where(eq(workEntries.id, id));
    return true;
  }

  async getWorkEntriesByFilters(filters: {
    userId?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<WorkEntryWithUser[]> {
    let query = db.select({
      id: workEntries.id,
      userId: workEntries.userId,
      date: workEntries.date,
      workType: workEntries.workType,
      description: workEntries.description,
      timeSpent: workEntries.timeSpent,
      status: workEntries.status,
      reviewedBy: workEntries.reviewedBy,
      reviewedAt: workEntries.reviewedAt,
      createdAt: workEntries.createdAt,
      user: {
        id: users.id,
        employeeId: users.employeeId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        designation: users.designation,
        role: users.role,
        department: users.department,
      }
    })
    .from(workEntries)
    .leftJoin(users, eq(workEntries.userId, users.id));

    // Build where conditions
    const conditions = [];
    
    if (filters.userId) {
      conditions.push(eq(workEntries.userId, filters.userId));
    }
    if (filters.department) {
      conditions.push(eq(users.department, filters.department));
    }
    if (filters.status) {
      conditions.push(eq(workEntries.status, filters.status));
    }
    if (filters.startDate) {
      conditions.push(gte(workEntries.date, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(workEntries.date, filters.endDate));
    }

    if (conditions.length > 0) {
      const result = await query.where(and(...conditions)).orderBy(sql`${workEntries.date} DESC`);
      return result.filter(entry => entry.user) as WorkEntryWithUser[];
    }

    const result = await query.orderBy(sql`${workEntries.date} DESC`);
    return result.filter(entry => entry.user) as WorkEntryWithUser[];
  }

  async getDailyWorkReport(userId: string, date: string): Promise<DailyWorkReport> {
    const entries = await db.select().from(workEntries)
      .where(and(eq(workEntries.userId, userId), eq(workEntries.date, date)));
    
    const totalHours = entries.reduce((sum, entry) => sum + parseFloat(entry.timeSpent), 0);
    
    return {
      date,
      entries,
      totalHours,
    };
  }

  // Manager preferences methods
  async getManagerPreferences(managerId: string): Promise<ManagerPreferences | undefined> {
    const result = await db.select().from(managerPreferences)
      .where(eq(managerPreferences.managerId, managerId))
      .limit(1);
    return result[0];
  }

  async saveManagerPreferences(preferences: InsertManagerPreferences): Promise<ManagerPreferences> {
    const result = await db.insert(managerPreferences).values(preferences).returning();
    return result[0];
  }

  async updateManagerPreferences(managerId: string, selectedEmployeeIds: string[]): Promise<ManagerPreferences> {
    const existing = await this.getManagerPreferences(managerId);
    
    if (existing) {
      const result = await db.update(managerPreferences)
        .set({ 
          selectedEmployeeIds: JSON.stringify(selectedEmployeeIds),
          updatedAt: new Date()
        })
        .where(eq(managerPreferences.id, existing.id))
        .returning();
      return result[0];
    } else {
      return this.saveManagerPreferences({
        managerId,
        selectedEmployeeIds: JSON.stringify(selectedEmployeeIds),
      });
    }
  }

  // Work hour request methods
  async createWorkHourRequest(request: InsertWorkHourRequest & { employeeId: string }): Promise<WorkHourRequest> {
    const result = await db.insert(workHourRequests).values(request).returning();
    return result[0];
  }

  async getWorkHourRequestsByEmployeeId(employeeId: string): Promise<WorkHourRequestWithUser[]> {
    const result = await db.select({
      id: workHourRequests.id,
      employeeId: workHourRequests.employeeId,
      requestedDate: workHourRequests.requestedDate,
      reason: workHourRequests.reason,
      status: workHourRequests.status,
      managerId: workHourRequests.managerId,
      managerComments: workHourRequests.managerComments,
      requestedAt: workHourRequests.requestedAt,
      reviewedAt: workHourRequests.reviewedAt,
      employee: {
        id: users.id,
        employeeId: users.employeeId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        designation: users.designation,
        role: users.role,
        department: users.department,
      },
    })
    .from(workHourRequests)
    .leftJoin(users, eq(workHourRequests.employeeId, users.id))
    .where(eq(workHourRequests.employeeId, employeeId))
    .orderBy(sql`${workHourRequests.requestedAt} DESC`);

    return result.filter(req => req.employee) as WorkHourRequestWithUser[];
  }

  async getWorkHourRequestsByManagerId(managerId: string): Promise<WorkHourRequestWithUser[]> {
    const result = await db.select({
      id: workHourRequests.id,
      employeeId: workHourRequests.employeeId,
      requestedDate: workHourRequests.requestedDate,
      reason: workHourRequests.reason,
      status: workHourRequests.status,
      managerId: workHourRequests.managerId,
      managerComments: workHourRequests.managerComments,
      requestedAt: workHourRequests.requestedAt,
      reviewedAt: workHourRequests.reviewedAt,
      employee: {
        id: users.id,
        employeeId: users.employeeId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        designation: users.designation,
        role: users.role,
        department: users.department,
      },
    })
    .from(workHourRequests)
    .leftJoin(users, eq(workHourRequests.employeeId, users.id))
    .where(eq(workHourRequests.status, "pending"))
    .orderBy(sql`${workHourRequests.requestedAt} DESC`);

    return result.filter(req => req.employee) as WorkHourRequestWithUser[];
  }

  async getAllWorkHourRequests(): Promise<WorkHourRequestWithUser[]> {
    const result = await db.select({
      id: workHourRequests.id,
      employeeId: workHourRequests.employeeId,
      requestedDate: workHourRequests.requestedDate,
      reason: workHourRequests.reason,
      status: workHourRequests.status,
      managerId: workHourRequests.managerId,
      managerComments: workHourRequests.managerComments,
      requestedAt: workHourRequests.requestedAt,
      reviewedAt: workHourRequests.reviewedAt,
      employee: {
        id: users.id,
        employeeId: users.employeeId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        designation: users.designation,
        role: users.role,
        department: users.department,
      },
    })
    .from(workHourRequests)
    .leftJoin(users, eq(workHourRequests.employeeId, users.id))
    .orderBy(sql`${workHourRequests.requestedAt} DESC`);

    return result.filter(req => req.employee) as WorkHourRequestWithUser[];
  }

  async getWorkHourRequestById(id: string): Promise<WorkHourRequestWithUser | undefined> {
    const result = await db.select({
      id: workHourRequests.id,
      employeeId: workHourRequests.employeeId,
      requestedDate: workHourRequests.requestedDate,
      reason: workHourRequests.reason,
      status: workHourRequests.status,
      managerId: workHourRequests.managerId,
      managerComments: workHourRequests.managerComments,
      requestedAt: workHourRequests.requestedAt,
      reviewedAt: workHourRequests.reviewedAt,
      employee: {
        id: users.id,
        employeeId: users.employeeId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        designation: users.designation,
        role: users.role,
        department: users.department,
      },
    })
    .from(workHourRequests)
    .leftJoin(users, eq(workHourRequests.employeeId, users.id))
    .where(eq(workHourRequests.id, id))
    .limit(1);

    const req = result[0];
    return req?.employee ? req as WorkHourRequestWithUser : undefined;
  }

  async updateWorkHourRequest(id: string, updates: { status: string; managerId?: string; managerComments?: string }): Promise<WorkHourRequest | undefined> {
    const updateData: any = {
      status: updates.status,
      reviewedAt: new Date(),
    };
    
    if (updates.managerId) {
      updateData.managerId = updates.managerId;
    }
    
    if (updates.managerComments) {
      updateData.managerComments = updates.managerComments;
    }

    const result = await db.update(workHourRequests)
      .set(updateData)
      .where(eq(workHourRequests.id, id))
      .returning();
    
    return result[0];
  }

  async deleteWorkHourRequest(id: string): Promise<boolean> {
    const result = await db.delete(workHourRequests).where(eq(workHourRequests.id, id));
    return result.rowCount > 0;
  }

  // Legacy methods for backward compatibility
  async createTimesheet(timesheet: InsertWorkEntry & { userId: string }): Promise<WorkEntry> {
    return this.createWorkEntry(timesheet);
  }

  async getTimesheetsByUserId(userId: string): Promise<WorkEntry[]> {
    return this.getWorkEntriesByUserId(userId);
  }

  async getAllTimesheets(): Promise<WorkEntryWithUser[]> {
    return this.getAllWorkEntries();
  }

  async getTimesheetById(id: string): Promise<WorkEntry | undefined> {
    return this.getWorkEntryById(id);
  }

  async updateTimesheetStatus(id: string, status: string, reviewedBy: string): Promise<WorkEntry | undefined> {
    return this.updateWorkEntryStatus(id, status, reviewedBy);
  }

  async deleteTimesheet(id: string): Promise<boolean> {
    return this.deleteWorkEntry(id);
  }

  async getTimesheetsByFilters(filters: {
    userId?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<WorkEntryWithUser[]> {
    return this.getWorkEntriesByFilters(filters);
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private workEntries: Map<string, WorkEntry>;
  private managerPreferences: Map<string, ManagerPreferences>;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.workEntries = new Map();
    this.managerPreferences = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    this.seedData().catch(console.error);
  }

  private async seedData() {
    // Create essential manager account
    const accounts = [
      // Real manager account  
      { employeeId: "MGR002", username: "navalika.fd", password: "azure-auth", firstName: "Navalika", lastName: "FD", email: "navalika@fdestech.com", designation: "Operations Manager", role: "manager", department: "Management" }
    ];

    // Hash passwords and create accounts
    for (const account of accounts) {
      const id = randomUUID();
      const hashedPassword = await hashPassword(account.password);
      const user: User = { ...account, id, password: hashedPassword };
      this.users.set(id, user);
    }

    // No sample work entries - start with clean data
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    
    // Auto-generate username if not provided
    const username = insertUser.username || 
      `${insertUser.firstName.toLowerCase()}.${insertUser.lastName.toLowerCase()}`;
    
    // Use provided password or default
    const password = insertUser.password || "defaultPassword123";
    const hashedPassword = await hashPassword(password);
    
    const user: User = { 
      ...insertUser, 
      id,
      username,
      password: hashedPassword,
      role: insertUser.role || "employee"
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }

    // Create updated user with new data
    const updatedUser: User = {
      ...existingUser,
      ...updateData,
      id, // Ensure ID remains unchanged
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) {
      return false;
    }

    // Don't allow deletion of the last admin/manager user
    const remainingUsers = Array.from(this.users.values()).filter(u => u.id !== id);
    const hasManagersLeft = remainingUsers.some(u => u.role === "manager");
    
    if (user.role === "manager" && !hasManagersLeft) {
      throw new Error("Cannot delete the last manager user");
    }

    this.users.delete(id);
    return true;
  }

  async createWorkEntry(data: InsertWorkEntry & { userId: string }): Promise<WorkEntry> {
    const id = randomUUID();
    const workEntry: WorkEntry = {
      ...data,
      id,
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
    };
    this.workEntries.set(id, workEntry);
    return workEntry;
  }

  async getWorkEntriesByUserId(userId: string): Promise<WorkEntry[]> {
    return Array.from(this.workEntries.values())
      .filter(entry => entry.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getWorkEntriesByUserIdWithFilters(filters: {
    userId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<WorkEntry[]> {
    let entries = Array.from(this.workEntries.values())
      .filter(entry => entry.userId === filters.userId);

    // Apply date filters
    if (filters.startDate) {
      entries = entries.filter(entry => entry.date >= filters.startDate!);
    }
    
    if (filters.endDate) {
      entries = entries.filter(entry => entry.date <= filters.endDate!);
    }

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getAllWorkEntries(): Promise<WorkEntryWithUser[]> {
    const entries = Array.from(this.workEntries.values());
    const result: WorkEntryWithUser[] = [];
    
    for (const entry of entries) {
      const user = await this.getUser(entry.userId);
      if (user) {
        result.push({ ...entry, user });
      }
    }
    
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getWorkEntryById(id: string): Promise<WorkEntry | undefined> {
    return this.workEntries.get(id);
  }

  async updateWorkEntryStatus(id: string, status: string, reviewedBy: string): Promise<WorkEntry | undefined> {
    const entry = this.workEntries.get(id);
    if (entry) {
      const updatedEntry: WorkEntry = {
        ...entry,
        status,
        reviewedBy,
        reviewedAt: new Date(),
      };
      this.workEntries.set(id, updatedEntry);
      return updatedEntry;
    }
    return undefined;
  }

  async deleteWorkEntry(id: string): Promise<boolean> {
    return this.workEntries.delete(id);
  }

  async getWorkEntriesByFilters(filters: {
    userId?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<WorkEntryWithUser[]> {
    let entries = await this.getAllWorkEntries();

    if (filters.userId) {
      entries = entries.filter(e => e.userId === filters.userId);
    }

    if (filters.department) {
      entries = entries.filter(e => e.user.department === filters.department);
    }

    if (filters.status) {
      entries = entries.filter(e => e.status === filters.status);
    }

    if (filters.startDate) {
      entries = entries.filter(e => e.date >= filters.startDate!);
    }

    if (filters.endDate) {
      entries = entries.filter(e => e.date <= filters.endDate!);
    }

    return entries;
  }

  async getDailyWorkReport(userId: string, date: string): Promise<DailyWorkReport> {
    const entries = Array.from(this.workEntries.values())
      .filter(entry => entry.userId === userId && entry.date === date);
    
    const totalHours = entries.reduce((sum, entry) => sum + parseFloat(entry.timeSpent), 0);
    
    return {
      date,
      entries,
      totalHours,
    };
  }

  // Manager preferences methods
  async getManagerPreferences(managerId: string): Promise<ManagerPreferences | undefined> {
    return Array.from(this.managerPreferences.values())
      .find(pref => pref.managerId === managerId);
  }

  async saveManagerPreferences(preferences: InsertManagerPreferences): Promise<ManagerPreferences> {
    const id = randomUUID();
    const now = new Date();
    const newPreferences: ManagerPreferences = {
      id,
      ...preferences,
      createdAt: now,
      updatedAt: now,
    };
    this.managerPreferences.set(id, newPreferences);
    return newPreferences;
  }

  async updateManagerPreferences(managerId: string, selectedEmployeeIds: string[]): Promise<ManagerPreferences> {
    const existing = await this.getManagerPreferences(managerId);
    const now = new Date();
    
    if (existing) {
      const updated: ManagerPreferences = {
        ...existing,
        selectedEmployeeIds: JSON.stringify(selectedEmployeeIds),
        updatedAt: now,
      };
      this.managerPreferences.set(existing.id, updated);
      return updated;
    } else {
      return this.saveManagerPreferences({
        managerId,
        selectedEmployeeIds: JSON.stringify(selectedEmployeeIds),
      });
    }
  }

  // Work hour request methods (stub implementations for MemStorage)
  async createWorkHourRequest(request: InsertWorkHourRequest & { employeeId: string }): Promise<WorkHourRequest> {
    throw new Error("Work hour requests not supported in MemStorage - use DbStorage");
  }

  async getWorkHourRequestsByEmployeeId(employeeId: string): Promise<WorkHourRequestWithUser[]> {
    return [];
  }

  async getWorkHourRequestsByManagerId(managerId: string): Promise<WorkHourRequestWithUser[]> {
    return [];
  }

  async getAllWorkHourRequests(): Promise<WorkHourRequestWithUser[]> {
    return [];
  }

  async getWorkHourRequestById(id: string): Promise<WorkHourRequestWithUser | undefined> {
    return undefined;
  }

  async updateWorkHourRequest(id: string, updates: { status: string; managerId?: string; managerComments?: string }): Promise<WorkHourRequest | undefined> {
    return undefined;
  }

  async deleteWorkHourRequest(id: string): Promise<boolean> {
    return false;
  }

  // Legacy methods for backward compatibility
  async createTimesheet(timesheet: InsertWorkEntry & { userId: string }): Promise<WorkEntry> {
    return this.createWorkEntry(timesheet);
  }

  async getTimesheetsByUserId(userId: string): Promise<WorkEntry[]> {
    return this.getWorkEntriesByUserId(userId);
  }

  async getAllTimesheets(): Promise<WorkEntryWithUser[]> {
    return this.getAllWorkEntries();
  }

  async getTimesheetById(id: string): Promise<WorkEntry | undefined> {
    return this.getWorkEntryById(id);
  }

  async updateTimesheetStatus(id: string, status: string, reviewedBy: string): Promise<WorkEntry | undefined> {
    return this.updateWorkEntryStatus(id, status, reviewedBy);
  }

  async deleteTimesheet(id: string): Promise<boolean> {
    return this.deleteWorkEntry(id);
  }

  async getTimesheetsByFilters(filters: {
    userId?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<WorkEntryWithUser[]> {
    return this.getWorkEntriesByFilters(filters);
  }

}

export const storage = new DbStorage();