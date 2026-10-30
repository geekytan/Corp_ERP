import { z } from "zod";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)")
  .refine((val) => {
    const d = new Date(val + "T00:00:00.000Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === val;
  }, "Invalid calendar date");

const phoneSchema = z
  .string()
  .regex(/^[0-9+\-\s]{7,15}$/, "Invalid phone format")
  .optional()
  .nullable();

export const roleSchema = z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(120).email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).optional().nullable(),
});

export const createEmployeeSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.string().trim().toLowerCase().max(120).email(),
  phone: phoneSchema,
  designation: z.string().trim().min(2).max(80),
  departmentId: z.string().min(1),
  managerId: z.string().optional().nullable(),
  joinDate: dateStringSchema,
  role: roleSchema,
  basic: z.number().positive().max(10_000_000),
  hra: z.number().min(0).max(10_000_000),
  allowances: z.number().min(0).max(10_000_000),
  pfPercent: z.number().min(0).max(100),
  taxPercent: z.number().min(0).max(100),
});

export const updateEmployeeSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.string().trim().toLowerCase().max(120).email(),
  phone: phoneSchema,
  designation: z.string().trim().min(2).max(80),
  departmentId: z.string().min(1),
  managerId: z.string().optional().nullable(),
  joinDate: dateStringSchema,
  role: roleSchema,
});

export const salarySchema = z.object({
  basic: z.number().positive().max(10_000_000),
  hra: z.number().min(0).max(10_000_000),
  allowances: z.number().min(0).max(10_000_000),
  pfPercent: z.number().min(0).max(100),
  taxPercent: z.number().min(0).max(100),
});

export const statusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const leaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  reason: z.string().trim().min(3).max(300),
});

export const leaveDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().trim().max(300).optional().nullable(),
});

export const payrollRunSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export const monthYearQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});
