import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import path from "path";
import fs from "fs";
import * as schema from "./schema";
import { hashPassword, verifyPassword } from "./auth-utils";

const { Pool } = pg;

export type DbClient = any;

let dbInstance: any;
let poolInstance: any = null;

if (process.env.DATABASE_URL) {
  try {
    poolInstance = new Pool({ connectionString: process.env.DATABASE_URL });
    dbInstance = drizzlePg(poolInstance, { schema });
    console.log("[VEIL DB] Connected to PostgreSQL via DATABASE_URL");
  } catch (err) {
    console.warn("[VEIL DB] Failed to connect to PostgreSQL, falling back to local SQLite:", err);
  }
}

if (!dbInstance) {
  // Use local SQLite database file in lib/db/data/veil_defense.sqlite
  const dbDir = path.resolve(__dirname, "..", "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, "veil_defense.sqlite");
  const sqlite = new Database(dbPath);

  // Enable WAL mode for optimal performance
  sqlite.pragma("journal_mode = WAL");

  // Auto-create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      bank_account TEXT NOT NULL,
      routing_code TEXT NOT NULL,
      approval_limit INTEGER NOT NULL DEFAULT 1000000,
      verified INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_requests (
      id TEXT PRIMARY KEY,
      submitter_id INTEGER NOT NULL,
      submitter_name TEXT NOT NULL,
      claimed_caller TEXT NOT NULL,
      caller_phone TEXT NOT NULL,
      action TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payee TEXT NOT NULL,
      bank_account TEXT NOT NULL,
      status TEXT NOT NULL,
      flags TEXT,
      urgency_language INTEGER NOT NULL DEFAULT 0,
      approver_id INTEGER,
      approver_name TEXT,
      approval_reason TEXT,
      decision_timestamp TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      verdict TEXT NOT NULL,
      time TEXT NOT NULL,
      score INTEGER NOT NULL,
      resolution TEXT NOT NULL,
      detail TEXT NOT NULL,
      signals TEXT,
      transcript_excerpt TEXT,
      caller_claim TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      organization TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      safe_phrase TEXT,
      consent INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL,
      verified TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      score INTEGER NOT NULL,
      verdict TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      signals_triggered TEXT NOT NULL,
      telemetry TEXT,
      caller_claim TEXT,
      transcript TEXT,
      file_name TEXT,
      file_size INTEGER,
      mime_type TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Ensure safe_phrase column exists in contacts if table was created in an older run
  try {
    sqlite.exec(`ALTER TABLE contacts ADD COLUMN safe_phrase TEXT;`);
  } catch {
    // Column already exists
  }

  // Seed demo accounts if users table is empty
  const userCount = (sqlite.prepare("SELECT COUNT(*) as count FROM users").get() as any)?.count || 0;
  if (userCount === 0) {
    const insertUser = sqlite.prepare(
      "INSERT INTO users (email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    insertUser.run("employee@veil.corp", hashPassword("Employee123!"), "Sarah Chen (Finance Analyst)", "Employee", now);
    insertUser.run("approver@veil.corp", hashPassword("Approver123!"), "Ananya Rao (VP Finance / Approver)", "Approver", now);
    insertUser.run("admin@veil.corp", hashPassword("Admin123!"), "David Vance (Security Admin)", "Admin", now);
    console.log("[VEIL DB] Seeded 3 demo user accounts: employee@veil.corp, approver@veil.corp, admin@veil.corp");
  }

  // Seed approved vendors if empty
  const vendorCount = (sqlite.prepare("SELECT COUNT(*) as count FROM vendors").get() as any)?.count || 0;
  if (vendorCount === 0) {
    const insertVendor = sqlite.prepare(
      "INSERT INTO vendors (name, bank_name, bank_account, routing_code, approval_limit, verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    insertVendor.run("Standard Chartered Escrow Depository", "Standard Chartered", "ACCT-8821-SCB", "SCBLINBBXXX", 5000000, 1, now);
    insertVendor.run("Apex Global Operating Account", "HDFC Corporate", "ACCT-4491-HDFC", "HDFC0000128", 2500000, 1, now);
    insertVendor.run("Northstar Legal Counsel", "ICICI Bank", "ACCT-5510-ICIC", "ICIC0000001", 1500000, 1, now);
    console.log("[VEIL DB] Seeded 3 approved vendors in vendor directory");
  }

  // Seed initial contacts if empty
  const contactCount = (sqlite.prepare("SELECT COUNT(*) as count FROM contacts").get() as any)?.count || 0;
  if (contactCount === 0) {
    const insertContact = sqlite.prepare(
      "INSERT INTO contacts (name, relationship, organization, role, phone, email, safe_phrase, consent, status, verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    insertContact.run("Vikram Malhotra", "Executive", "Apex Global", "Chief Executive Officer", "+1 (415) 555-0199", "v.malhotra@apex.example", "Crimson Falcon 88", 1, "Verified", "20 Jun 2025", now);
    insertContact.run("Ananya Rao", "Colleague", "Northstar Capital", "Chief Financial Officer", "+1 (415) 555-0184", "ananya.rao@northstar.example", "Emerald Harbor 42", 1, "Verified", "18 Jun 2025", now);
    insertContact.run("Priya Shah", "Colleague", "Northstar Capital", "General Counsel", "+1 (415) 555-0171", "priya.shah@northstar.example", "Golden Horizon 15", 1, "Verified", "14 May 2025", now);
    insertContact.run("Ravi Menon", "Family", "Personal", "Brother", "+1 (415) 555-0128", "ravi.m@family.example", "Silver Summit 99", 1, "Verified", "02 Jun 2025", now);
    console.log("[VEIL DB] Seeded trusted contacts with safe phrases");
  }

  dbInstance = drizzleSqlite(sqlite, { schema });
  console.log(`[VEIL DB] Initialized local zero-setup SQLite database at ${dbPath}`);
}

export const db = dbInstance;
export const pool = poolInstance;
export * from "./schema";
export { hashPassword, verifyPassword };
export { eq, desc, and, or, sql } from "drizzle-orm";
