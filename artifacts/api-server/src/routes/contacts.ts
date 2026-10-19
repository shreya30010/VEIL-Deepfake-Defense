import { Router, type IRouter } from "express";
import {
  CreateContactBody,
  UpdateContactBody,
  UpdateContactParams,
  DeleteContactParams,
} from "@workspace/api-zod";
import { db, contactsTable, type Contact } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole, logAudit } from "../lib/auth";

const router: IRouter = Router();

function formatContactResponse(c: any) {
  return {
    id: c.id,
    name: c.name,
    relationship: c.relationship,
    organization: c.organization || "",
    role: c.role,
    phone: c.phone,
    email: c.email || "",
    safePhrase: c.safePhrase || "",
    consent: Boolean(c.consent),
    status: c.status,
    verified: c.verified,
  };
}

/**
 * GET /api/contacts
 * Returns pre-authorized callback directory (Any authenticated user)
 */
router.get("/contacts", requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(contactsTable).orderBy(contactsTable.id);
    return res.status(200).json(rows.map(formatContactResponse));
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/contacts
 * Stores an independently verified contact for out-of-band callback (Admin only)
 */
router.post("/contacts", requireAuth, requireRole("Admin"), async (req, res, next) => {
  try {
    const body = CreateContactBody.parse(req.body);
    const safePhrase = (req.body as any).safePhrase || "Falcon Shield 01";

    const newRecord = {
      name: body.name,
      relationship: body.relationship,
      organization: body.organization || "",
      role: body.role,
      phone: body.phone,
      email: body.email || "",
      safePhrase,
      consent: body.consent ?? true,
      status: body.status || "Consent discussed",
      verified: body.verified || new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
    };

    const inserted = await db.insert(contactsTable).values(newRecord).returning();
    const result = inserted && inserted.length > 0
      ? inserted[0]
      : (await db.select().from(contactsTable).orderBy(desc(contactsTable.id)).limit(1))[0];

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: "CREATE_STAFF_CONTACT",
      target: `contacts:${result.id}`,
      details: `Admin added trusted contact "${result.name}" (${result.phone}) with safe phrase`,
    });

    return res.status(201).json(formatContactResponse(result));
  } catch (error) {
    return next(error);
  }
});

/**
 * PUT /api/contacts/:id
 * Update trusted contact details (Admin only)
 */
router.put("/contacts/:id", requireAuth, requireRole("Admin"), async (req, res, next) => {
  try {
    const { id } = UpdateContactParams.parse(req.params);
    const body = UpdateContactBody.parse(req.body);

    const existing = await db
      .select()
      .from(contactsTable)
      .where(eq(contactsTable.id, id))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({
        error: "NotFoundError",
        message: `Contact with ID "${id}" was not found.`,
        statusCode: 404,
      });
    }

    const updates: any = {
      name: body.name,
      relationship: body.relationship,
      organization: body.organization ?? "",
      role: body.role,
      phone: body.phone,
      email: body.email ?? "",
    };
    if ((req.body as any).safePhrase !== undefined) updates.safePhrase = (req.body as any).safePhrase;
    if (body.consent !== undefined) updates.consent = body.consent;
    if (body.status !== undefined) updates.status = body.status;
    if (body.verified !== undefined) updates.verified = body.verified;

    await db.update(contactsTable).set(updates).where(eq(contactsTable.id, id));

    const updated = await db
      .select()
      .from(contactsTable)
      .where(eq(contactsTable.id, id))
      .limit(1);

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: "UPDATE_STAFF_CONTACT",
      target: `contacts:${id}`,
      details: `Admin updated trusted contact "${updated[0].name}" (${updated[0].phone})`,
    });

    return res.status(200).json(formatContactResponse(updated[0]));
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/contacts/:id
 * Remove a contact from callback registry (Admin only)
 */
router.delete("/contacts/:id", requireAuth, requireRole("Admin"), async (req, res, next) => {
  try {
    const { id } = DeleteContactParams.parse(req.params);

    const existing = await db
      .select()
      .from(contactsTable)
      .where(eq(contactsTable.id, id))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({
        error: "NotFoundError",
        message: `Contact with ID "${id}" was not found.`,
        statusCode: 404,
      });
    }

    await db.delete(contactsTable).where(eq(contactsTable.id, id));

    await logAudit({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: "DELETE_STAFF_CONTACT",
      target: `contacts:${id}`,
      details: `Admin deleted contact "${existing[0].name}" from trusted directory`,
    });

    return res.status(200).json({ success: true, id: String(id) });
  } catch (error) {
    return next(error);
  }
});

export default router;
