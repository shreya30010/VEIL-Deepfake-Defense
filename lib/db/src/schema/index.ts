import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { z } from "zod";

// ============================================================================
// 1. USERS & ROLES TABLE
// ============================================================================
export const usersTable = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["Employee", "Approver", "Admin"] }).notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["Employee", "Approver", "Admin"]),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// ============================================================================
// 2. APPROVED VENDORS & BANK ACCOUNTS DIRECTORY
// ============================================================================
export const vendorsTable = sqliteTable("vendors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  bankName: text("bank_name").notNull(),
  bankAccount: text("bank_account").notNull(),
  routingCode: text("routing_code").notNull(),
  approvalLimit: integer("approval_limit").notNull().default(1000000), // Default 10 Lakhs threshold
  verified: integer("verified", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertVendorSchema = z.object({
  name: z.string().min(1),
  bankName: z.string().min(1),
  bankAccount: z.string().min(1),
  routingCode: z.string().min(1),
  approvalLimit: z.number().int().positive().default(1000000),
  verified: z.boolean().default(true),
});

export type Vendor = typeof vendorsTable.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

// ============================================================================
// 3. PAYMENT REQUESTS & TWO-PERSON DUAL-CUSTODY APPROVAL
// ============================================================================
export const paymentRequestsTable = sqliteTable("payment_requests", {
  id: text("id").primaryKey(), // e.g. REQ-2025-0101
  submitterId: integer("submitter_id").notNull(),
  submitterName: text("submitter_name").notNull(),
  claimedCaller: text("claimed_caller").notNull(),
  callerPhone: text("caller_phone").notNull(),
  action: text("action").notNull(),
  amount: integer("amount").notNull(), // in Rupees
  payee: text("payee").notNull(),
  bankAccount: text("bank_account").notNull(),
  status: text("status", {
    enum: ["Verified", "On hold", "Approved", "Rejected", "Stop"],
  }).notNull(),
  flags: text("flags"), // JSON string array of risk triggers
  urgencyLanguage: integer("urgency_language", { mode: "boolean" }).notNull().default(false),
  approverId: integer("approver_id"),
  approverName: text("approver_name"),
  approvalReason: text("approval_reason"),
  decisionTimestamp: text("decision_timestamp"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertPaymentRequestSchema = z.object({
  claimedCaller: z.string().min(1),
  callerPhone: z.string().min(1),
  action: z.string().min(1),
  amount: z.number().int().positive(),
  payee: z.string().min(1),
  bankAccount: z.string().min(1),
  urgencyLanguage: z.boolean().default(false),
});

export type PaymentRequest = typeof paymentRequestsTable.$inferSelect;
export type InsertPaymentRequest = z.infer<typeof insertPaymentRequestSchema>;

// ============================================================================
// 4. AUDIT LOGS TABLE (WHO, WHAT, WHEN)
// ============================================================================
export const auditLogsTable = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  action: text("action").notNull(), // e.g. "SUBMIT_PAYMENT", "APPROVE_PAYMENT", "EDIT_VENDOR"
  target: text("target").notNull(), // e.g. "payment_requests:REQ-2025-0101"
  details: text("details").notNull(),
  timestamp: text("timestamp").notNull().$defaultFn(() => new Date().toISOString()),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;

// ============================================================================
// 5. INCIDENTS TABLE
// ============================================================================
export const incidentsTable = sqliteTable("incidents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  severity: text("severity", { enum: ["High", "Medium", "Low"] }).notNull(),
  category: text("category").notNull(),
  verdict: text("verdict", { enum: ["Suspicious", "Needs review", "Inconclusive", "Low concern"] }).notNull(),
  time: text("time").notNull(),
  score: integer("score").notNull(),
  resolution: text("resolution").notNull(),
  detail: text("detail").notNull(),
  signals: text("signals"), // JSON array string
  transcriptExcerpt: text("transcript_excerpt"),
  callerClaim: text("caller_claim"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertIncidentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  severity: z.enum(["High", "Medium", "Low"]),
  category: z.string().min(1),
  verdict: z.enum(["Suspicious", "Needs review", "Inconclusive", "Low concern"]),
  time: z.string().min(1),
  score: z.number().int().min(0).max(100),
  resolution: z.string().default("Under investigation"),
  detail: z.string().min(1),
  signals: z.string().optional().nullable(),
  transcriptExcerpt: z.string().optional().nullable(),
  callerClaim: z.string().optional().nullable(),
  createdAt: z.string().optional(),
});

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidentsTable.$inferSelect;

// ============================================================================
// 6. TRUSTED CONTACTS & STAFF DIRECTORY TABLE
// ============================================================================
export const contactsTable = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  relationship: text("relationship").notNull(),
  organization: text("organization").notNull(),
  role: text("role").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  safePhrase: text("safe_phrase"),
  consent: integer("consent", { mode: "boolean" }).notNull().default(true),
  status: text("status").notNull(),
  verified: text("verified").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  organization: z.string().optional().default(""),
  role: z.string().min(1, "Role is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email().or(z.literal("")).default(""),
  safePhrase: z.string().optional().default(""),
  consent: z.boolean().default(true),
  status: z.string().default("Consent discussed"),
  verified: z.string().default(() => new Date().toLocaleDateString()),
});

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contactsTable.$inferSelect;

// ============================================================================
// 7. ANALYSES / DETECTIONS TABLE
// ============================================================================
export const analysesTable = sqliteTable("analyses", {
  id: text("id").primaryKey(),
  score: integer("score").notNull(),
  verdict: text("verdict").notNull(),
  riskLevel: text("risk_level").notNull(),
  signalsTriggered: text("signals_triggered").notNull(), // JSON array string
  telemetry: text("telemetry"), // JSON object string
  callerClaim: text("caller_claim"),
  transcript: text("transcript"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertAnalysisSchema = z.object({
  id: z.string().min(1),
  score: z.number().int().min(0).max(100),
  verdict: z.string(),
  riskLevel: z.enum(["low", "medium", "high", "insufficient"]),
  signalsTriggered: z.string(),
  telemetry: z.string().optional().nullable(),
  callerClaim: z.string().optional().nullable(),
  transcript: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileSize: z.number().int().optional().nullable(),
  mimeType: z.string().optional().nullable(),
  createdAt: z.string().optional(),
});

export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;