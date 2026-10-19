import { Router, type Request, type Response } from "express";
import { z } from "@workspace/api-zod";
import { db, vendorsTable, eq, desc } from "@workspace/db";
import { requireAuth, requireRole, logAudit } from "../lib/auth";

const vendorsRouter = Router();

const vendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  bankAccount: z.string().min(1, "Bank account number is required"),
  routingCode: z.string().min(1, "Routing/IFSC code is required"),
  approvalLimit: z.number().int().positive().default(1000000),
  verified: z.boolean().default(true),
});

// GET /api/vendors - Any authenticated user can view the approved directory
vendorsRouter.get("/vendors", requireAuth, async (_req: Request, res: Response) => {
  try {
    const vendors = await db.select().from(vendorsTable).orderBy(desc(vendorsTable.createdAt)).all();
    res.json({ vendors });
  } catch (err: any) {
    res.status(500).json({ error: "DatabaseError", message: err.message });
  }
});

// POST /api/vendors - ADMIN ONLY
vendorsRouter.post("/vendors", requireAuth, requireRole("Admin"), async (req: Request, res: Response): Promise<void> => {
  const parse = vendorSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "ValidationError", details: parse.error.issues });
    return;
  }

  const { name, bankName, bankAccount, routingCode, approvalLimit, verified } = parse.data;

  try {
    const created = await db
      .insert(vendorsTable)
      .values({
        name,
        bankName,
        bankAccount,
        routingCode,
        approvalLimit,
        verified,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: "CREATE_VENDOR",
      target: `vendors:${created.id}`,
      details: `Admin created approved vendor "${name}" with bank account "${bankAccount}" at "${bankName}" (Limit: ₹${approvalLimit})`,
    });

    res.status(201).json({ vendor: created });
  } catch (err: any) {
    res.status(500).json({ error: "DatabaseError", message: err.message });
  }
});

// PUT /api/vendors/:id - ADMIN ONLY
vendorsRouter.put("/vendors/:id", requireAuth, requireRole("Admin"), async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "InvalidId" });
    return;
  }

  const parse = vendorSchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "ValidationError", details: parse.error.issues });
    return;
  }

  try {
    const existing = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: "NotFound", message: "Vendor not found" });
      return;
    }

    const updated = await db
      .update(vendorsTable)
      .set(parse.data)
      .where(eq(vendorsTable.id, id))
      .returning()
      .get();

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: "UPDATE_VENDOR",
      target: `vendors:${id}`,
      details: `Admin modified vendor "${updated.name}" details. Bank: ${updated.bankName}, Account: ${updated.bankAccount}`,
    });

    res.json({ vendor: updated });
  } catch (err: any) {
    res.status(500).json({ error: "DatabaseError", message: err.message });
  }
});

// DELETE /api/vendors/:id - ADMIN ONLY
vendorsRouter.delete("/vendors/:id", requireAuth, requireRole("Admin"), async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "InvalidId" });
    return;
  }

  try {
    const existing = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: "NotFound", message: "Vendor not found" });
      return;
    }

    await db.delete(vendorsTable).where(eq(vendorsTable.id, id)).run();

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: "DELETE_VENDOR",
      target: `vendors:${id}`,
      details: `Admin removed vendor "${existing.name}" from approved directory`,
    });

    res.json({ message: "Vendor deleted successfully", id });
  } catch (err: any) {
    res.status(500).json({ error: "DatabaseError", message: err.message });
  }
});

export default vendorsRouter;
