import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import { z } from "@workspace/api-zod";
import {
  db,
  paymentRequestsTable,
  vendorsTable,
  contactsTable,
  incidentsTable,
  eq,
  desc,
} from "@workspace/db";
import { requireAuth, requireRole, logAudit } from "../lib/auth";

const paymentsRouter = Router();

// In-memory store for out-of-band callback confirmation codes
// Codes are stored as SHA-256 hashes, valid for 10 minutes, and strictly single-use
interface CallbackChallenge {
  paymentId: string;
  codeHash: string; // SHA-256 digest of 6-digit code
  expiresAt: number; // Expiry timestamp
  used: boolean;
}
const callbackChallenges = new Map<string, CallbackChallenge>();

const createPaymentSchema = z.object({
  claimedCaller: z.string().min(1, "Claimed caller name is required"),
  callerPhone: z.string().min(1, "Caller phone number is required"),
  action: z.string().min(1, "Payment description or purpose is required"),
  amount: z.number().int().positive("Transfer amount must be positive"),
  payee: z.string().min(1, "Beneficiary payee name is required"),
  bankAccount: z.string().min(1, "Bank account number is required"),
  urgencyLanguage: z.boolean().default(false),
});

const approvalDecisionSchema = z.object({
  reason: z.string().min(3, "A short justification or verification note is required"),
  verificationCode: z.string().optional(),
});

const extractTranscriptSchema = z.object({
  transcript: z.string().min(1, "Transcript text is required"),
});

export function extractPaymentDetailsFromTranscript(transcript: string) {
  const sentences = transcript
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let claimedCaller: { value: string; sourceSentence: string } | null = null;
  let callerPhone: { value: string; sourceSentence: string } | null = null;
  let amount: { value: number; formatted: string; sourceSentence: string } | null = null;
  let payee: { value: string; sourceSentence: string } | null = null;
  let bankAccount: { value: string; sourceSentence: string } | null = null;
  let action: { value: string; sourceSentence: string } | null = null;
  const urgency = { detected: false, phrases: [] as string[], sourceSentence: "" };
  const secrecy = { detected: false, phrases: [] as string[], sourceSentence: "" };

  const knownCallers = [
    "Vikram Malhotra",
    "Ananya Rao",
    "Priya Shah",
    "David Vance",
    "Sarah Chen",
    "Ravi Menon",
  ];

  for (const sentence of sentences) {
    // Caller identity
    if (!claimedCaller) {
      for (const k of knownCallers) {
        const firstName = k.split(" ")[0];
        if (new RegExp(`\\b${k}\\b`, "i").test(sentence)) {
          claimedCaller = { value: k, sourceSentence: sentence };
          break;
        } else if (new RegExp(`(?:this is|I am|I'm|speaking with|calling is)\\s+${firstName}\\b`, "i").test(sentence)) {
          claimedCaller = { value: k, sourceSentence: sentence };
          break;
        }
      }
      if (!claimedCaller) {
        const m = sentence.match(/(?:this is|I am|I'm|speaking is|calling is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        if (m) claimedCaller = { value: m[1].trim(), sourceSentence: sentence };
      }
    }

    // Phone number
    if (!callerPhone) {
      const m = sentence.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (m) callerPhone = { value: m[0].trim(), sourceSentence: sentence };
    }

    // Amount
    if (!amount) {
      const currMatch = sentence.match(/(?:[₹$€£]|\b(?:Rs\.?|INR|USD)\b)\s*([\d,]+(?:\.\d{1,2})?)/i);
      if (currMatch) {
        const num = parseInt(currMatch[1].replace(/,/g, ""), 10);
        if (!isNaN(num) && num > 0) {
          amount = {
            value: num,
            formatted: `₹${num.toLocaleString("en-IN")}`,
            sourceSentence: sentence,
          };
        }
      } else {
        const lakhMatch = sentence.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)s?/i);
        if (lakhMatch) {
          const num = Math.round(parseFloat(lakhMatch[1]) * 100000);
          amount = {
            value: num,
            formatted: `₹${num.toLocaleString("en-IN")}`,
            sourceSentence: sentence,
          };
        } else {
          const numMatch = sentence.match(/(?:wire|transfer|payment|sum|amount)\s+(?:of\s+)?([\d,]{4,})/i);
          if (numMatch) {
            const num = parseInt(numMatch[1].replace(/,/g, ""), 10);
            if (!isNaN(num) && num > 0) {
              amount = {
                value: num,
                formatted: `₹${num.toLocaleString("en-IN")}`,
                sourceSentence: sentence,
              };
            }
          }
        }
      }
    }

    // Bank account
    if (!bankAccount) {
      const m = sentence.match(/(?:account(?:\s+number)?|acct(?:\s+no\.?)?|iban)\s*(?:is|#|:)?\s*([A-Z0-9\-]{6,26})/i) ||
                sentence.match(/\b([A-Z]{2,4}-[0-9]{4}-[A-Z0-9\-]{2,12})\b/i);
      if (m) {
        const val = m[1].trim();
        if (!["number", "account", "phone"].includes(val.toLowerCase())) {
          bankAccount = { value: val, sourceSentence: sentence };
        }
      }
    }

    // Payee
    if (!payee) {
      const mSpecific = sentence.match(/(?:invoice for|payment to|wire to|transfer to|payee|beneficiary|vendor|supplier|recipient)\s+(?:named|is|account of)?\s*["']?([A-Z][A-Za-z0-9&.,\- ]+?)(?:,|\.|\bto account\b|\bunder\b|\baccount\b|\bfor\b)/i);
      if (mSpecific) {
        const clean = mSpecific[1].trim().replace(/[.,]$/, "");
        if (clean.length > 2 && !clean.toLowerCase().includes("the regular") && !clean.toLowerCase().includes("our account") && !clean.toLowerCase().startsWith("account ")) {
          payee = { value: clean, sourceSentence: sentence };
        }
      } else {
        const m = sentence.match(/(?:to|payee|beneficiary|vendor|supplier|recipient)\s+(?:named|is|account of)?\s*["']?([A-Z][A-Za-z0-9&.,\- ]+?)(?:[.,\n]|account|bank|at|before|for|when)/i);
        if (m) {
          const clean = m[1].trim().replace(/[.,]$/, "");
          if (clean.length > 2 && !clean.toLowerCase().includes("the regular") && !clean.toLowerCase().includes("our account") && !clean.toLowerCase().startsWith("account ")) {
            payee = { value: clean, sourceSentence: sentence };
          }
        }
      }
    }

    // Purpose / Action
    if (!action) {
      const m = sentence.match(/(?:for|purpose of|towards|regarding)\s+([^.,;\n]{6,60})/i);
      if (m) action = { value: m[1].trim(), sourceSentence: sentence };
    }

    // Urgency check
    for (const kw of ["before 3 pm", "before market close", "urgent", "immediately", "asap", "today only", "deadline", "within the hour"]) {
      if (new RegExp(`\\b${kw}\\b`, "i").test(sentence)) {
        urgency.detected = true;
        if (!urgency.phrases.includes(kw)) urgency.phrases.push(kw);
        if (!urgency.sourceSentence) urgency.sourceSentence = sentence;
      }
    }

    // Secrecy check
    for (const kw of ["confidential", "keep this between us", "don't tell", "do not tell", "strictly private", "under nda", "secret", "bypass approval"]) {
      if (new RegExp(`\\b${kw}\\b`, "i").test(sentence)) {
        secrecy.detected = true;
        if (!secrecy.phrases.includes(kw)) secrecy.phrases.push(kw);
        if (!secrecy.sourceSentence) secrecy.sourceSentence = sentence;
      }
    }
  }

  return {
    claimedCaller,
    callerPhone,
    amount,
    payee,
    bankAccount,
    action: action ? action.value : "Vendor invoice payment authorization",
    actionSentence: action ? action.sourceSentence : "",
    urgency,
    secrecy,
    sentences,
  };
}

// POST /api/payments/extract - Rule-based transcript auto-extraction (No paid API)
paymentsRouter.post("/payments/extract", requireAuth, (req: Request, res: Response): void => {
  const parse = extractTranscriptSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "ValidationError", details: parse.error.issues });
    return;
  }

  const extracted = extractPaymentDetailsFromTranscript(parse.data.transcript);
  res.json({ extracted });
});

// GET /api/payments - List all payment requests
paymentsRouter.get("/payments", requireAuth, async (_req: Request, res: Response) => {
  try {
    const requests = await db
      .select()
      .from(paymentRequestsTable)
      .orderBy(desc(paymentRequestsTable.createdAt))
      .all();
    res.json({ paymentRequests: requests });
  } catch (err: any) {
    res.status(500).json({ error: "DatabaseError", message: err.message });
  }
});

// GET /api/payments/:id - Get single payment request
paymentsRouter.get("/payments/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentId = String(req.params.id);
    const request = await db
      .select()
      .from(paymentRequestsTable)
      .where(eq(paymentRequestsTable.id, paymentId))
      .get();

    if (!request) {
      res.status(404).json({ error: "NotFound", message: "Payment request not found" });
      return;
    }
    res.json({ paymentRequest: request });
  } catch (err: any) {
    res.status(500).json({ error: "DatabaseError", message: err.message });
  }
});

// POST /api/payments - Submit new payment request & perform automated directory checks
paymentsRouter.post("/payments", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parse = createPaymentSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "ValidationError", details: parse.error.issues });
    return;
  }

  const { claimedCaller, callerPhone, action, amount, payee, bankAccount, urgencyLanguage } = parse.data;
  const user = req.user!;

  try {
    const flags: string[] = [];
    const vendors = await db.select().from(vendorsTable).all();
    const contacts = await db.select().from(contactsTable).all();

    // 1. Directory Check: Payee & Bank Account
    const matchedVendor = vendors.find((v: any) =>
      v.name.toLowerCase().includes(payee.toLowerCase()) ||
      payee.toLowerCase().includes(v.name.toLowerCase())
    );

    if (!matchedVendor) {
      flags.push(`Payee not in approved vendors directory ("${payee}")`);
    } else {
      const cleanAcct = bankAccount.replace(/[\s-]/g, "").toUpperCase();
      const cleanSavedAcct = matchedVendor.bankAccount.replace(/[\s-]/g, "").toUpperCase();
      if (cleanAcct !== cleanSavedAcct) {
        flags.push(`Bank account mismatch: Specified account "${bankAccount}" does not match saved vendor account "${matchedVendor.bankAccount}"`);
      }
      if (amount > matchedVendor.approvalLimit) {
        flags.push(`Amount exceeds single-signature threshold limit (₹${matchedVendor.approvalLimit.toLocaleString("en-IN")})`);
      }
    }

    // 2. Directory Check: Caller Phone
    const matchedContact = contacts.find((c: any) =>
      c.name.toLowerCase().includes(claimedCaller.toLowerCase()) ||
      claimedCaller.toLowerCase().includes(c.name.toLowerCase())
    );

    if (!matchedContact) {
      flags.push(`Claimed caller "${claimedCaller}" is not registered in trusted staff directory`);
    } else {
      const cleanPhone = callerPhone.replace(/[\s\-\(\)\+]/g, "");
      const cleanSavedPhone = matchedContact.phone.replace(/[\s\-\(\)\+]/g, "");
      if (cleanPhone !== cleanSavedPhone) {
        flags.push(`Caller phone number mismatch: Call originated from ${callerPhone}, but directory records ${matchedContact.phone}`);
      }
    }

    // 3. Conversational Urgency / Secrecy Language
    const hasUrgencyKeywords = /(urgent|right now|immediately|secret|confidential|bypass|skip approval|don't tell|cutoff)/i.test(action);
    if (urgencyLanguage || hasUrgencyKeywords) {
      flags.push("Urgency or secrecy pressure detected in request narrative");
    }

    // 4. Status Determination
    let status: "Verified" | "On hold" | "Stop" = "Verified";
    if (flags.length > 0) {
      status = "On hold";
      if (flags.length >= 3 || (!matchedVendor && flags.some(f => f.includes("mismatch")))) {
        status = "On hold";
      }
    }

    const reqId = `REQ-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const created = await db
      .insert(paymentRequestsTable)
      .values({
        id: reqId,
        submitterId: user.id,
        submitterName: user.name,
        claimedCaller,
        callerPhone,
        action,
        amount,
        payee,
        bankAccount,
        status,
        flags: JSON.stringify(flags),
        urgencyLanguage: urgencyLanguage || hasUrgencyKeywords,
        createdAt: now,
      })
      .returning()
      .get();

    // Log to Incident Register if held
    if (status !== "Verified") {
      const incidentId = `INC-${reqId}`;
      await db.insert(incidentsTable).values({
        id: incidentId,
        title: `Payment Hold: ₹${amount.toLocaleString("en-IN")} transfer to ${payee}`,
        severity: flags.length >= 2 ? "High" : "Medium",
        category: "Payment Hold & Dual-Custody",
        verdict: "Suspicious",
        time: "Just now",
        score: flags.length >= 2 ? 22 : 45,
        resolution: "On hold: Dual-custody review required",
        detail: `Payment request ${reqId} placed on hold by automated directory inspection. Submitted by ${user.name} (${user.role}). Triggers: ${flags.join("; ")}`,
        signals: JSON.stringify(flags),
        callerClaim: `${claimedCaller} (${callerPhone})`,
        transcriptExcerpt: action,
        createdAt: now,
      });
    }

    await logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "SUBMIT_PAYMENT",
      target: `payment_requests:${reqId}`,
      details: `User submitted payment request for ₹${amount.toLocaleString("en-IN")} to "${payee}". Assigned status: ${status}. Flags: ${flags.length}`,
    });

    res.status(201).json({ paymentRequest: created });
  } catch (err: any) {
    res.status(500).json({ error: "DatabaseError", message: err.message });
  }
});

// POST /api/payments/:id/challenge - Generate a single-use, 10-minute 6-digit callback challenge
paymentsRouter.post(
  "/payments/:id/challenge",
  requireAuth,
  requireRole("Approver", "Admin"),
  async (req: Request, res: Response): Promise<void> => {
    const paymentId = String(req.params.id);
    const user = req.user!;

    try {
      const payment = await db
        .select()
        .from(paymentRequestsTable)
        .where(eq(paymentRequestsTable.id, paymentId))
        .get();

      if (!payment) {
        res.status(404).json({ error: "NotFound", message: "Payment request not found" });
        return;
      }

      // Enforce two-person separation on generating callback challenge as well
      if (payment.submitterId === user.id) {
        res.status(403).json({
          error: "SelfApprovalForbidden",
          message: "Two-person rule violation: You cannot generate or review callback challenges for payment requests you submitted yourself.",
          statusCode: 403,
        });
        return;
      }

      // Cryptographically random 6-digit numeric code (e.g. "849201")
      const rawCode = crypto.randomInt(100000, 1000000).toString();
      // Store ONLY the SHA-256 hash in memory (never the plain text)
      const codeHash = crypto.createHash("sha256").update(rawCode).digest("hex");
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      callbackChallenges.set(paymentId, {
        paymentId,
        codeHash,
        expiresAt,
        used: false,
      });

      await logAudit({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: "GENERATE_CALLBACK_CHALLENGE",
        target: `payment_requests:${paymentId}`,
        details: `Generated out-of-band callback confirmation challenge for held payment ${paymentId}. Stored SHA-256 hash, expires in 10 minutes, single-use.`,
      });

      res.json({
        paymentId,
        verificationCode: rawCode,
        expiresAt: new Date(expiresAt).toISOString(),
        expiresInSeconds: 600,
        singleUse: true,
      });
    } catch (err: any) {
      res.status(500).json({ error: "DatabaseError", message: err.message });
    }
  }
);

// POST /api/payments/:id/approve - Two-Person Rule: Different user with Approver/Admin role
paymentsRouter.post(
  "/payments/:id/approve",
  requireAuth,
  requireRole("Approver", "Admin"),
  async (req: Request, res: Response): Promise<void> => {
    const parse = approvalDecisionSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "ValidationError", details: parse.error.issues });
      return;
    }

    const { reason, verificationCode } = parse.data;
    const user = req.user!;
    const paymentId = String(req.params.id);

    try {
      const payment = await db
        .select()
        .from(paymentRequestsTable)
        .where(eq(paymentRequestsTable.id, paymentId))
        .get();

      if (!payment) {
        res.status(404).json({ error: "NotFound", message: "Payment request not found" });
        return;
      }

      // CRITICAL TWO-PERSON RULE BACKEND ENFORCEMENT
      if (payment.submitterId === user.id) {
        res.status(403).json({
          error: "SelfApprovalForbidden",
          message: "Two-person rule violation: You cannot approve a payment request that you submitted yourself. An independent second approver is required to release held transactions.",
          statusCode: 403,
        });
        return;
      }

      if (payment.status === "Approved") {
        res.status(400).json({ error: "AlreadyApproved", message: "Payment request is already approved" });
        return;
      }

      // Out-Of-Band Callback Verification Code check for held payments
      if (payment.status === "On hold") {
        if (!verificationCode || verificationCode.trim() === "") {
          res.status(400).json({
            error: "VerificationCodeRequired",
            message: "An out-of-band callback confirmation code is required to release a held payment. Initiate a callback challenge to receive a single-use 6-digit code.",
            statusCode: 400,
          });
          return;
        }

        const challenge = callbackChallenges.get(paymentId);
        if (!challenge) {
          res.status(400).json({
            error: "NoActiveChallenge",
            message: "No active callback challenge exists for this payment. Please generate an out-of-band callback challenge before approval.",
            statusCode: 400,
          });
          return;
        }

        if (challenge.used) {
          res.status(400).json({
            error: "CodeAlreadyUsed",
            message: "This callback verification code has already been consumed. Each out-of-band code is strictly single-use. Please generate a new challenge.",
            statusCode: 400,
          });
          return;
        }

        if (Date.now() > challenge.expiresAt) {
          callbackChallenges.delete(paymentId);
          res.status(400).json({
            error: "CodeExpired",
            message: "This callback verification code has expired (10-minute validity exceeded). Please generate a new challenge.",
            statusCode: 400,
          });
          return;
        }

        const cleanInput = verificationCode.trim().replace(/\s+/g, "");
        const inputHash = crypto.createHash("sha256").update(cleanInput).digest("hex");
        if (inputHash !== challenge.codeHash) {
          res.status(400).json({
            error: "InvalidVerificationCode",
            message: "The entered callback verification code does not match the active challenge. Please re-check the verbal code confirmed during your phone callback.",
            statusCode: 400,
          });
          return;
        }

        // Mark code as used immediately (single-use constraint)
        challenge.used = true;
      }

      const now = new Date().toISOString();
      const updated = await db
        .update(paymentRequestsTable)
        .set({
          status: "Approved",
          approverId: user.id,
          approverName: user.name,
          approvalReason: reason,
          decisionTimestamp: now,
        })
        .where(eq(paymentRequestsTable.id, paymentId))
        .returning()
        .get();

      // Update Incident record
      const incId = `INC-${paymentId}`;
      const existingInc = await db.select().from(incidentsTable).where(eq(incidentsTable.id, incId)).get();
      if (existingInc) {
        await db
          .update(incidentsTable)
          .set({
            resolution: `Approved and released by ${user.name} (${user.role}): "${reason}"`,
            verdict: "Low concern",
            score: 85,
          })
          .where(eq(incidentsTable.id, incId))
          .run();
      }

      await logAudit({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: "APPROVE_PAYMENT",
        target: `payment_requests:${paymentId}`,
        details: `Approver ${user.name} authorized release of held request ${paymentId} (₹${payment.amount.toLocaleString("en-IN")} to ${payment.payee}). Justification: ${reason}${verificationCode ? ` [OOB Verification Code verified: ${verificationCode}]` : ""}`,
      });

      res.json({ paymentRequest: updated });
    } catch (err: any) {
      res.status(500).json({ error: "DatabaseError", message: err.message });
    }
  }
);

// POST /api/payments/:id/reject - Approver/Admin rejects payment request
paymentsRouter.post(
  "/payments/:id/reject",
  requireAuth,
  requireRole("Approver", "Admin"),
  async (req: Request, res: Response): Promise<void> => {
    const parse = approvalDecisionSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "ValidationError", details: parse.error.issues });
      return;
    }

    const { reason } = parse.data;
    const user = req.user!;
    const paymentId = String(req.params.id);

    try {
      const payment = await db
        .select()
        .from(paymentRequestsTable)
        .where(eq(paymentRequestsTable.id, paymentId))
        .get();

      if (!payment) {
        res.status(404).json({ error: "NotFound", message: "Payment request not found" });
        return;
      }

      const now = new Date().toISOString();
      const updated = await db
        .update(paymentRequestsTable)
        .set({
          status: "Rejected",
          approverId: user.id,
          approverName: user.name,
          approvalReason: reason,
          decisionTimestamp: now,
        })
        .where(eq(paymentRequestsTable.id, paymentId))
        .returning()
        .get();

      // Update Incident record
      const incId = `INC-${paymentId}`;
      const existingInc = await db.select().from(incidentsTable).where(eq(incidentsTable.id, incId)).get();
      if (existingInc) {
        await db
          .update(incidentsTable)
          .set({
            resolution: `Rejected and blocked by ${user.name} (${user.role}): "${reason}"`,
            verdict: "Suspicious",
            score: 15,
          })
          .where(eq(incidentsTable.id, incId))
          .run();
      }

      await logAudit({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: "REJECT_PAYMENT",
        target: `payment_requests:${paymentId}`,
        details: `Approver ${user.name} rejected payment request ${paymentId} (₹${payment.amount.toLocaleString("en-IN")} to ${payment.payee}). Reason: ${reason}`,
      });

      res.json({ paymentRequest: updated });
    } catch (err: any) {
      res.status(500).json({ error: "DatabaseError", message: err.message });
    }
  }
);

// GET /api/integrations/payments/:id/status
// Mock external ERP / Finance System status verification endpoint
// Secured by API Key: "veil_erp_secret_key_2026"
paymentsRouter.get(
  "/integrations/payments/:id/status",
  async (req: Request, res: Response): Promise<void> => {
    const apiKey = (req.headers["x-api-key"] as string | undefined) || (req.query.api_key as string | undefined);
    const EXPECTED_KEY = process.env.ERP_GATE_API_KEY || process.env.ERP_INTEGRATION_KEY || "veil_erp_secret_key_2026";

    if (!apiKey || apiKey !== EXPECTED_KEY) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or missing integration API key. Provide header 'x-api-key' or query parameter '?api_key'",
      });
      return;
    }

    const paymentId = String(req.params.id);
    try {
      const payment = await db
        .select()
        .from(paymentRequestsTable)
        .where(eq(paymentRequestsTable.id, paymentId))
        .get();

      if (!payment) {
        res.status(404).json({ error: "NotFound", message: `Payment request ${paymentId} not found in VEIL ledger` });
        return;
      }

      let statusNormalized: "held" | "approved" | "rejected" = "held";
      if (payment.status === "Approved" || payment.status === "Verified") {
        statusNormalized = "approved";
      } else if (payment.status === "Rejected") {
        statusNormalized = "rejected";
      } else {
        statusNormalized = "held";
      }

      const allowedToDisburse = statusNormalized === "approved";
      let holdReasons: string[] = [];
      try {
        if (payment.flags) {
          holdReasons = JSON.parse(payment.flags);
        }
      } catch {
        holdReasons = [payment.flags || "Held by security policy"];
      }

      res.json({
        id: payment.id,
        status: statusNormalized,
        veilStatus: payment.status,
        allowedToDisburse,
        holdReasons,
        claimedCaller: payment.claimedCaller,
        callerPhone: payment.callerPhone,
        beneficiary: payment.payee,
        bankAccount: payment.bankAccount,
        amount: payment.amount,
        approverName: payment.approverName || null,
        approvalReason: payment.approvalReason || null,
        decisionTimestamp: payment.decisionTimestamp || null,
        createdAt: payment.createdAt,
      });
    } catch (err: any) {
      res.status(500).json({ error: "DatabaseError", message: err.message });
    }
  }
);

export default paymentsRouter;

