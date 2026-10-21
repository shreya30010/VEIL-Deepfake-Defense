import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { isUnsetSecret } from "../env";

// The session secret must come from the environment (.env). There is no built-in fallback:
// the server refuses to start rather than sign tokens with a publicly known value.
const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "";

if (isUnsetSecret(JWT_SECRET, 32)) {
  throw new Error(
    "SESSION_SECRET is missing, shorter than 32 characters, or still the .env.example placeholder. " +
      "Run start.bat (it creates .env with random secrets) or copy .env.example to .env and set a random 32+ character value.",
  );
}

// In-memory failed login tracking for brute-force defense
interface FailedLoginRecord {
  attempts: number;
  lockedUntil?: number;
}
const failedLogins = new Map<string, FailedLoginRecord>();

export function checkLoginLockout(email: string): { locked: boolean; remainingMinutes?: number } {
  const normEmail = email.toLowerCase().trim();
  const record = failedLogins.get(normEmail);
  if (!record || !record.lockedUntil) return { locked: false };
  const now = Date.now();
  if (now < record.lockedUntil) {
    const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
    return { locked: true, remainingMinutes };
  }
  // Lockout expired
  failedLogins.delete(normEmail);
  return { locked: false };
}

export function recordFailedLogin(email: string): { locked: boolean; remainingAttempts: number; lockedUntil?: number } {
  const normEmail = email.toLowerCase().trim();
  const now = Date.now();
  const record = failedLogins.get(normEmail) || { attempts: 0 };
  record.attempts += 1;
  if (record.attempts >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // 15-minute lockout
    failedLogins.set(normEmail, record);
    return { locked: true, remainingAttempts: 0, lockedUntil: record.lockedUntil };
  }
  failedLogins.set(normEmail, record);
  return { locked: false, remainingAttempts: 5 - record.attempts };
}

export function resetFailedLogins(email: string): void {
  failedLogins.delete(email.toLowerCase().trim());
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: "Employee" | "Approver" | "Admin";
}

// Augment express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Generate base64url HMAC token
export function signToken(user: AuthenticatedUser): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;

    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
    };
  } catch {
    return null;
  }
}

// Middleware to extract and verify auth token
export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (req.headers["x-access-token"]) {
    token = String(req.headers["x-access-token"]);
  } else if ((req as any).cookies?.token) {
    token = (req as any).cookies.token;
  }

  if (token) {
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }
  }

  next();
}

// Middleware to enforce login
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required. Please log in with a valid user account.",
      statusCode: 401,
    });
    return;
  }
  next();
}

// Middleware to enforce role
export function requireRole(...allowedRoles: Array<"Employee" | "Approver" | "Admin">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required.",
        statusCode: 401,
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "Forbidden",
        message: `Access denied. Role "${req.user.role}" does not have permission. Required role: ${allowedRoles.join(" or ")}.`,
        statusCode: 403,
      });
      return;
    }

    next();
  };
}

// Audit trail logging helper
export async function logAudit(params: {
  userId: number;
  userName: string;
  userRole: string;
  action: string;
  target: string;
  details: string;
}) {
  try {
    await db.insert(auditLogsTable).values({
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: params.action,
      target: params.target,
      details: params.details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[VEIL AUDIT ERROR] Failed to record audit log:", err);
  }
}
