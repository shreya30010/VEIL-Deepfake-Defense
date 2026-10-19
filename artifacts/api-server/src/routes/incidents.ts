import { Router, type IRouter } from "express";
import {
  ListIncidentsQueryParams,
  CreateIncidentBody,
  UpdateIncidentResolutionBody,
} from "@workspace/api-zod";
import { db, incidentsTable, type Incident } from "@workspace/db";
import { eq, desc, like, and } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_INCIDENTS = [
  {
    id: "VEIL-0428",
    title: "Urgent executive wire request",
    severity: "High" as const,
    category: "Payment request",
    verdict: "Suspicious" as const,
    time: "Today, 10:42 AM",
    score: 24,
    resolution: "Callback recommended",
    detail:
      "Caller claimed to be the CFO and requested an urgent transfer while asking the employee to bypass the normal approval chain. Demonstrates layered urgency and approval-bypass tripwire.",
    signals: JSON.stringify(["Urgent payment request", "Approval bypass", "Claimed executive identity"]),
    createdAt: new Date().toISOString(),
  },
  {
    id: "VEIL-0427",
    title: "Unusual lip-sync pattern and facial flicker",
    severity: "Medium" as const,
    category: "Video anomaly",
    verdict: "Needs review" as const,
    time: "Yesterday, 3:16 PM",
    score: 58,
    resolution: "Reviewed",
    detail:
      "Simulated frame timing indicators (340ms drift) and a brief transcript pressure phrase were logged in demonstration mode.",
    signals: JSON.stringify(["Lip-sync drift", "Temporal flicker"]),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "VEIL-0426",
    title: "Bank account verification request (OTP)",
    severity: "High" as const,
    category: "Credential request",
    verdict: "Suspicious" as const,
    time: "18 Jun 2025, 11:08 AM",
    score: 19,
    resolution: "Caller independently verified",
    detail:
      "A simulated caller asked for a one-time passcode claiming to represent fraud prevention desk. Credential tripwire triggered.",
    signals: JSON.stringify(["OTP request", "Authority claim", "Credential disclosure"]),
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "VEIL-0425",
    title: "Evidence insufficient (Intermittent feed)",
    severity: "Low" as const,
    category: "Insufficient evidence",
    verdict: "Inconclusive" as const,
    time: "17 Jun 2025, 4:51 PM",
    score: 51,
    resolution: "Closed — inconclusive",
    detail:
      "The sample session did not contain enough usable video/audio frames for a meaningful assessment. System intentionally defaulted to inconclusive state.",
    signals: JSON.stringify(["Short sample window", "Low SNR audio"]),
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "VEIL-0424",
    title: "Family emergency money request",
    severity: "Medium" as const,
    category: "Social engineering",
    verdict: "Suspicious" as const,
    time: "16 Jun 2025, 9:23 AM",
    score: 37,
    resolution: "Callback recommended",
    detail:
      "Emotional urgency and secrecy language was detected in the scenario transcript without independent identity verification.",
    signals: JSON.stringify(["Urgency marker", "Secrecy request", "Personal payment"]),
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

// Helper to ensure database is seeded with initial baseline incidents
async function ensureIncidentsSeeded() {
  try {
    const existing = await db.select().from(incidentsTable).limit(1);
    if (existing.length === 0) {
      for (const inc of DEFAULT_INCIDENTS) {
        await db.insert(incidentsTable).values(inc);
      }
    }
  } catch (err) {
    console.warn("[VEIL API] Note on incidents seed:", err);
  }
}

function formatIncidentResponse(inc: Incident) {
  let signals: string[] = [];
  if (inc.signals) {
    try {
      signals = JSON.parse(inc.signals);
    } catch {
      signals = inc.signals.split(",").map((s) => s.trim());
    }
  }
  return {
    id: inc.id,
    title: inc.title,
    severity: inc.severity,
    category: inc.category,
    verdict: inc.verdict,
    time: inc.time,
    score: inc.score,
    resolution: inc.resolution,
    detail: inc.detail,
    signals,
    transcriptExcerpt: inc.transcriptExcerpt || undefined,
    callerClaim: inc.callerClaim || undefined,
  };
}

/**
 * GET /api/incidents
 * List all logged forensic incidents, with optional filtering
 */
router.get("/incidents", async (req, res, next) => {
  try {
    await ensureIncidentsSeeded();
    const queryParams = ListIncidentsQueryParams.parse(req.query);

    const conditions = [];
    if (queryParams.severity) {
      conditions.push(eq(incidentsTable.severity, queryParams.severity as any));
    }
    if (queryParams.verdict) {
      conditions.push(eq(incidentsTable.verdict, queryParams.verdict as any));
    }
    if (queryParams.category) {
      conditions.push(eq(incidentsTable.category, queryParams.category));
    }
    if (queryParams.query) {
      conditions.push(like(incidentsTable.title, `%${queryParams.query}%`));
    }

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(incidentsTable)
            .where(and(...conditions))
            .orderBy(desc(incidentsTable.createdAt))
        : await db.select().from(incidentsTable).orderBy(desc(incidentsTable.createdAt));

    return res.status(200).json(rows.map(formatIncidentResponse));
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/incidents
 * Log an intercepted incident
 */
router.post("/incidents", async (req, res, next) => {
  try {
    await ensureIncidentsSeeded();
    const body = CreateIncidentBody.parse(req.body);

    const id = `VEIL-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const time = `Today, ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    const newRecord = {
      id,
      title: body.title,
      severity: body.severity,
      category: body.category,
      verdict: body.verdict,
      time,
      score: body.score,
      resolution: body.resolution || "Under investigation",
      detail: body.detail,
      signals: body.signals ? JSON.stringify(body.signals) : null,
      transcriptExcerpt: body.transcriptExcerpt || null,
      callerClaim: body.callerClaim || null,
      createdAt: now.toISOString(),
    };

    await db.insert(incidentsTable).values(newRecord);

    const created = await db
      .select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, id))
      .limit(1);

    if (created.length === 0) {
      return res.status(201).json(formatIncidentResponse(newRecord as any));
    }

    return res.status(201).json(formatIncidentResponse(created[0]));
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/incidents/:id
 */
router.get("/incidents/:id", async (req, res, next) => {
  try {
    await ensureIncidentsSeeded();
    const { id } = req.params;
    const rows = await db
      .select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, id))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({
        error: "NotFoundError",
        message: `Incident with ID "${id}" was not found.`,
        statusCode: 404,
      });
    }

    return res.status(200).json(formatIncidentResponse(rows[0]));
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/incidents/:id
 * Update incident resolution notes or status
 */
router.patch("/incidents/:id", async (req, res, next) => {
  try {
    await ensureIncidentsSeeded();
    const { id } = req.params;
    const body = UpdateIncidentResolutionBody.parse(req.body);

    const existing = await db
      .select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, id))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({
        error: "NotFoundError",
        message: `Incident with ID "${id}" was not found.`,
        statusCode: 404,
      });
    }

    const updates: Partial<typeof incidentsTable.$inferInsert> = {};
    if (body.resolution !== undefined) updates.resolution = body.resolution;
    if (body.severity !== undefined) updates.severity = body.severity;
    if (body.verdict !== undefined) updates.verdict = body.verdict;

    if (Object.keys(updates).length > 0) {
      await db
        .update(incidentsTable)
        .set(updates)
        .where(eq(incidentsTable.id, id));
    }

    const updated = await db
      .select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, id))
      .limit(1);

    return res.status(200).json(formatIncidentResponse(updated[0]));
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/incidents/:id
 */
router.delete("/incidents/:id", async (req, res, next) => {
  try {
    await ensureIncidentsSeeded();
    const { id } = req.params;
    const existing = await db
      .select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, id))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({
        error: "NotFoundError",
        message: `Incident with ID "${id}" was not found.`,
        statusCode: 404,
      });
    }

    await db.delete(incidentsTable).where(eq(incidentsTable.id, id));
    return res.status(200).json({ success: true, id });
  } catch (error) {
    return next(error);
  }
});

export default router;
