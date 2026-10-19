import { Router, type Request, type Response } from "express";
import { db, auditLogsTable, usersTable, desc } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";

const auditRouter = Router();

// GET /api/audit-logs - Admin and Approver
auditRouter.get("/audit-logs", requireAuth, requireRole("Admin", "Approver"), async (_req: Request, res: Response) => {
  try {
    const logs = await db
      .select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.timestamp))
      .limit(100)
      .all();
    res.json({ auditLogs: logs });
  } catch (err: any) {
    res.status(500).json({ error: "DatabaseError", message: err.message });
  }
});

// GET /api/users - Admin only
auditRouter.get("/users", requireAuth, requireRole("Admin"), async (_req: Request, res: Response) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .all();
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: "DatabaseError", message: err.message });
  }
});

export default auditRouter;
