import { test, describe } from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";

// Load .env (repo root) so the tests use the same ERP key as the running server. Existing env vars win.
try {
  for (const line of fs.readFileSync(new URL("../.env", import.meta.url), "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env file: rely on the environment (CI) */
}

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3001";
const INTEGRATION_KEY = process.env.ERP_GATE_API_KEY || "";
if (!INTEGRATION_KEY) {
  throw new Error("ERP_GATE_API_KEY is not set. Run start.bat once (it creates .env) or export it before running the tests.");
}

describe("VEIL Defense Platform Automated Test Suite", () => {
  let employeeToken = "";
  let approverToken = "";
  let adminToken = "";
  let heldPaymentId = "";

  // 1. Auth Flow - Successful Login
  test("1. Auth Flow - Valid credentials return JWT token and role", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "employee@veil.corp",
        password: "Employee123!",
      }),
    });

    assert.equal(res.status, 200, "Expected 200 OK on valid employee login");
    const data = await res.json();
    assert.ok(data.token, "Response should include JWT token");
    assert.equal(data.user.email, "employee@veil.corp");
    assert.equal(data.user.role, "Employee");
    employeeToken = data.token;

    // Also get tokens for Approver and Admin
    const approverRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "approver@veil.corp",
        password: "Approver123!",
      }),
    });
    const approverData = await approverRes.json();
    approverToken = approverData.token;

    const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@veil.corp",
        password: "Admin123!",
      }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.token;
  });

  // 2. Auth Flow - Bad Password Rejection & Countdown
  test("2. Auth Flow - Incorrect password returns 401 with lockout attempts countdown", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "employee@veil.corp",
        password: "WrongPassword999!",
      }),
    });

    assert.equal(res.status, 401, "Expected 401 Unauthorized for incorrect password");
    const data = await res.json();
    assert.equal(data.error, "InvalidCredentials");
    assert.match(data.message, /attempts remaining before 15-minute lockout/i);
  });

  // 3. Role-Based Access Control (RBAC)
  test("3. RBAC Enforcement - Employee cannot modify approved vendors directory (Admin-only)", async () => {
    const res = await fetch(`${BASE_URL}/api/vendors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        name: "Unauthorized Vendor Corp",
        bankName: "Offshore Bank",
        bankAccount: "ACCT-9999-HACK",
        routingCode: "OFFSHORE01",
        approvalLimit: 1000000,
      }),
    });

    assert.equal(res.status, 403, "Expected 403 Forbidden when Employee attempts Admin operation");
    const data = await res.json();
    assert.equal(data.error, "Forbidden");
  });

  // 4. Password Change Security
  test("4. Password Security - Rejects password change if old password is incorrect", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        oldPassword: "IncorrectOldPassword!",
        newPassword: "BrandNewSecurePassword2026!",
      }),
    });

    assert.equal(res.status, 400, "Expected 400 Bad Request when old password does not match");
    const data = await res.json();
    assert.equal(data.error, "InvalidCurrentPassword");
  });

  // 5. Detection Analysis Endpoint Shape
  test("5. Detection API - POST /api/detect/analyze returns expected verdict and telemetry shape", async () => {
    const res = await fetch(`${BASE_URL}/api/detect/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: "Please wire forty-five lakh rupees to our Cayman escrow account immediately.",
      }),
    });

    assert.equal(res.status, 200, "Expected 200 OK on detection analysis");
    const data = await res.json();
    assert.ok(typeof data.score === "number", "score should be a numeric value");
    assert.ok(["Authentic", "Inconclusive", "Suspicious", "Low concern", "Needs review"].includes(data.verdict), "verdict should match schema");
    assert.ok(["low", "medium", "high", "insufficient"].includes(String(data.riskLevel).toLowerCase()), "riskLevel should match schema");
    assert.ok(Array.isArray(data.signalsTriggered), "signalsTriggered should be an array");
    assert.ok(data.telemetry, "telemetry object should be present");
  });

  // 6. Payment Hold Logic - Calm Request Triggering Hold
  test("6. Payment Gate - Calm, polite request with unapproved payee is placed 'On hold'", async () => {
    const res = await fetch(`${BASE_URL}/api/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        claimedCaller: "Vikram Malhotra",
        callerPhone: "+1 (415) 555-0199",
        action: "Hi, this is Vikram. Please process the invoice for Horizon Advisory Partners. No rush, standard terms.",
        amount: 450000,
        payee: "Horizon Advisory Partners", // Not in approved vendor directory
        bankAccount: "ACCT-9912",
        urgencyLanguage: false, // 0 panic keywords
      }),
    });

    assert.equal(res.status, 201, "Expected 201 Created on payment submission");
    const data = await res.json();
    assert.equal(data.paymentRequest.status, "On hold", "Calm request to unapproved payee must be held");
    assert.match(data.paymentRequest.flags, /Horizon Advisory Partners/);
    heldPaymentId = data.paymentRequest.id;
  });

  // 7. Payment Gate - Approved Directory Vendor Passes Within Limit
  test("7. Payment Gate - Recognized vendor within policy threshold is Verified", async () => {
    const res = await fetch(`${BASE_URL}/api/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        claimedCaller: "Ananya Rao",
        callerPhone: "+1 (415) 555-0184",
        action: "Routine monthly operating retainer",
        amount: 450000,
        payee: "Apex Global Operating Account", // Approved directory vendor
        bankAccount: "ACCT-4491-HDFC", // Approved account
        urgencyLanguage: false,
      }),
    });

    assert.equal(res.status, 201, "Expected 201 Created on payment submission");
    const data = await res.json();
    assert.equal(data.paymentRequest.status, "Verified", "Approved directory vendor under threshold should be Verified");
  });

  // 8. ERP Finance System Integration Status Gate
  test("8. ERP Gate - External system endpoint checks hold status and clearance", async () => {
    assert.ok(heldPaymentId, "A held payment ID must be available from Test 6");

    // 8a. Check status while held (Disbursement must be FALSE)
    const heldRes = await fetch(`${BASE_URL}/api/integrations/payments/${heldPaymentId}/status`, {
      headers: { "x-api-key": INTEGRATION_KEY },
    });
    assert.equal(heldRes.status, 200);
    const heldData = await heldRes.json();
    assert.equal(heldData.status, "held");
    assert.equal(heldData.allowedToDisburse, false, "ERP must not disburse while held");

    // 8b. Approver initiates dynamic Out-of-band callback challenge
    const challengeRes = await fetch(`${BASE_URL}/api/payments/${heldPaymentId}/challenge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${approverToken}`,
      },
    });
    assert.equal(challengeRes.status, 200, "Challenge generation should succeed");
    const challengeData = await challengeRes.json();
    assert.ok(challengeData.verificationCode, "Must return a 6-digit verification code");
    assert.match(challengeData.verificationCode, /^\d{6}$/, "Code must be exactly 6 random digits");
    assert.equal(challengeData.singleUse, true, "Challenge must be single-use");

    // 8c. Test that incorrect code returns 400 InvalidVerificationCode
    const badCodeRes = await fetch(`${BASE_URL}/api/payments/${heldPaymentId}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${approverToken}`,
      },
      body: JSON.stringify({
        reason: "Testing invalid code rejection",
        verificationCode: "000000",
      }),
    });
    assert.equal(badCodeRes.status, 400, "Wrong OTP code must be rejected with 400");
    const badCodeData = await badCodeRes.json();
    assert.equal(badCodeData.error, "InvalidVerificationCode");

    // 8d. Approver authorizes payment with dynamic Out-of-band verification code
    const approveRes = await fetch(`${BASE_URL}/api/payments/${heldPaymentId}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${approverToken}`,
      },
      body: JSON.stringify({
        reason: "Independently verified with CEO Vikram via direct phone line. Safe phrase confirmed.",
        verificationCode: challengeData.verificationCode,
      }),
    });
    assert.equal(approveRes.status, 200, "Approver authorization should succeed");

    // 8e. Single-use enforcement: Attempting to reuse or re-approve must be rejected
    const reusedRes = await fetch(`${BASE_URL}/api/payments/${heldPaymentId}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${approverToken}`,
      },
      body: JSON.stringify({
        reason: "Testing single-use replay prevention",
        verificationCode: challengeData.verificationCode,
      }),
    });
    assert.equal(reusedRes.status, 400, "Reusing single-use code or re-approving must reject with 400");

    // 8f. Re-check external ERP endpoint (Disbursement must now be TRUE)
    const clearedRes = await fetch(`${BASE_URL}/api/integrations/payments/${heldPaymentId}/status`, {
      headers: { "x-api-key": INTEGRATION_KEY },
    });
    assert.equal(clearedRes.status, 200);
    const clearedData = await clearedRes.json();
    assert.equal(clearedData.status, "approved");
    assert.equal(clearedData.allowedToDisburse, true, "ERP is cleared to disburse after dual-custody approval");
  });

  // 9. Transcript Auto-Extraction Endpoint
  test("9. Transcript Extraction - POST /api/payments/extract attributes entities to transcript sentences", async () => {
    const transcript = "Hi, this is Vikram. Please process the invoice for Horizon Advisory Partners, ₹4,50,000, to account ACCT-9912. No rush, standard terms.";
    const res = await fetch(`${BASE_URL}/api/payments/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ transcript }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    const ext = data.extracted;
    assert.ok(ext.claimedCaller.value.includes("Vikram"), "claimed caller should match Vikram");
    assert.equal(ext.amount.value, 450000);
    assert.equal(ext.payee.value, "Horizon Advisory Partners");
    assert.equal(ext.bankAccount.value, "ACCT-9912");
    assert.equal(ext.urgency.detected, false, "Calm transcript should have 0 urgency keywords detected");
  });
});
