import { Router, type Request, type Response } from "express";
import { z } from "@workspace/api-zod";
import { db, usersTable, verifyPassword, hashPassword, eq } from "@workspace/db";
import {
  signToken,
  requireAuth,
  logAudit,
  checkLoginLockout,
  recordFailedLogin,
  resetFailedLogins,
} from "../lib/auth";

const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
});

export const DEMO_ACCOUNTS = [
  {
    role: "Employee",
    name: "Sarah Chen",
    title: "Finance Analyst",
    email: "employee@veil.corp",
    password: "Employee123!",
    description: "Can submit payment requests, run Live Shield, and conduct video-call defense.",
  },
  {
    role: "Approver",
    name: "Ananya Rao",
    title: "VP Finance & Operations",
    email: "approver@veil.corp",
    password: "Approver123!",
    description: "Can review, authorize, or reject held payment requests. Enforces dual-custody approval.",
  },
  {
    role: "Admin",
    name: "David Vance",
    title: "Chief Information Security Officer",
    email: "admin@veil.corp",
    password: "Admin123!",
    description: "Manages staff directory, approved vendor bank accounts, and views immutable audit logs.",
  },
];

// GET /api/auth/demo-accounts
authRouter.get("/auth/demo-accounts", (_req: Request, res: Response) => {
  res.json({
    demoAccounts: DEMO_ACCOUNTS,
  });
});

// POST /api/auth/login - Authenticate with email & password, lockout protection
authRouter.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "ValidationError",
      message: "Valid email and password are required",
      details: parseResult.error.issues,
    });
    return;
  }

  const { email, password } = parseResult.data;
  const normEmail = email.toLowerCase().trim();

  // 1. Check account lockout state (5 failed attempts = 15 minute lock)
  const lockout = checkLoginLockout(normEmail);
  if (lockout.locked) {
    res.status(429).json({
      error: "AccountLocked",
      message: `Account is temporarily locked due to 5 consecutive failed login attempts. Please try again in ${lockout.remainingMinutes} minute(s).`,
      statusCode: 429,
    });
    return;
  }

  try {
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normEmail))
      .get();

    if (!user) {
      const failure = recordFailedLogin(normEmail);
      if (failure.locked) {
        res.status(429).json({
          error: "AccountLocked",
          message: "Account has been locked for 15 minutes due to 5 consecutive failed login attempts.",
          statusCode: 429,
        });
        return;
      }
      res.status(401).json({
        error: "InvalidCredentials",
        message: `No user found with this email address. (${failure.remainingAttempts} attempts remaining before 15-minute lockout)`,
        statusCode: 401,
      });
      return;
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      const failure = recordFailedLogin(normEmail);
      if (failure.locked) {
        res.status(429).json({
          error: "AccountLocked",
          message: "Account has been locked for 15 minutes due to 5 consecutive failed login attempts.",
          statusCode: 429,
        });
        return;
      }
      res.status(401).json({
        error: "InvalidCredentials",
        message: `Incorrect password entered. (${failure.remainingAttempts} attempts remaining before 15-minute lockout)`,
        statusCode: 401,
      });
      return;
    }

    // Login successful — reset failed login counter
    resetFailedLogins(normEmail);

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "Employee" | "Approver" | "Admin",
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "USER_LOGIN",
      target: `users:${user.id}`,
      details: `User logged in successfully with role ${user.role}`,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: "InternalServerError",
      message: err.message || "Failed to process login",
    });
  }
});

// POST /api/auth/change-password - Change password with mandatory old password check
authRouter.post("/auth/change-password", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parse = changePasswordSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({
      error: "ValidationError",
      message: "Current password and a new password (min 8 chars) are required",
      details: parse.error.issues,
    });
    return;
  }

  const { oldPassword, newPassword } = parse.data;
  const user = req.user!;

  try {
    const dbUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .get();

    if (!dbUser) {
      res.status(404).json({ error: "NotFound", message: "User record not found" });
      return;
    }

    // MANDATORY: Reject password change unless old password is provided and matches
    const isValid = verifyPassword(oldPassword, dbUser.passwordHash);
    if (!isValid) {
      res.status(400).json({
        error: "InvalidCurrentPassword",
        message: "Current password does not match. Password change rejected.",
        statusCode: 400,
      });
      return;
    }

    const newHash = hashPassword(newPassword);
    await db
      .update(usersTable)
      .set({ passwordHash: newHash })
      .where(eq(usersTable.id, user.id))
      .run();

    await logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "PASSWORD_CHANGED",
      target: `users:${user.id}`,
      details: `User ${user.name} successfully updated their account password`,
    });

    res.json({ success: true, message: "Password updated successfully." });
  } catch (err: any) {
    res.status(500).json({ error: "InternalServerError", message: err.message });
  }
});

// GET /api/auth/me
authRouter.get("/auth/me", requireAuth, (req: Request, res: Response) => {
  res.json({
    user: req.user,
  });
});

// POST /api/auth/logout
authRouter.post("/auth/logout", requireAuth, async (req: Request, res: Response) => {
  if (req.user) {
    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: "USER_LOGOUT",
      target: `users:${req.user.id}`,
      details: `User logged out`,
    });
  }
  res.json({ message: "Logged out successfully" });
});

export default authRouter;
