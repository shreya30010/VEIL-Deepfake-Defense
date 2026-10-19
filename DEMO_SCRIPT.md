# VEIL — 3-Minute Executive Demo Script

> **Target Audience**: Hackathon Judges, Security Evaluators, Enterprise CISOs & CFOs.  
> **Core Narrative**: *"Deepfake voice clones can bypass acoustic detectors on real phone lines, but they cannot bypass an immutable multi-layered authorization policy gate."*

---

## Pre-Demo Checklist (30 Seconds Prior)

1. Ensure the app is open at `http://localhost:3000/`.
2. Clear localStorage or use an incognito browser window (or click **"Tour & Roles"** at the top bar).
3. Confirm backend server (`:3001`), model service (`:5001`), and frontend (`:3000`) are running.

---

## Timeline & Step-by-Step Script

### [0:00 - 0:45] The Hook: The Real Threat & The Attack Demo

**What to Say:**
> *"Most people believe fighting deepfakes means training a better neural network to listen to the caller's voice. That is a dangerous assumption. Attackers can clone a CEO or vendor's voice in seconds, and real phone line compression destroys the high-frequency clues audio classifiers rely on.*
> 
> *VEIL takes a completely different, defensible approach: **We verify the transaction request, not just the voice.** Let me show you an attack in action."*

**What to Click:**
1. On the **Overview** page, click the prominent glowing button: **"Watch an attack happen"**.
2. Click **"Launch 60s Attack Simulation"**.
3. Let the live simulation run for 15 seconds:
   - Point out the caller impersonating CEO Vikram Malhotra demanding an urgent wire of $248,000 for "Project Apex".
   - Watch the audio waveform light up, displaying high-frequency vocoder cutoff anomalies.
   - Point out the trust meter plummeting from 98% down to 12% as conversational urgency tripwires fire.
   - Click **"Complete Attack"** or let it advance to the final policy gate decision screen.

---

### [0:45 - 1:30] Auto-Extract from Call & The Calm Request Trap

**What to Say:**
> *"Now, here is the attack vector that defeats ordinary AI detectors: **The Calm Impersonator**. Attackers don't always panic or scream urgency. What if the voice clone speaks calmly, uses no pressure words, but gives a routing number for an unapproved payee?*
> 
> *Let's switch to our Employee account."*

**What to Click:**
1. Click the **Profile / Role** badge in the top right. Select **Employee** (`employee@veil.corp`).
2. Navigate to **Payment Requests**.
3. Under the **"Auto-Extract from Call Transcript"** banner, click the preset **"Scenario A: Calm CEO (Zero panic keywords, unapproved payee)"**.
4. Click **"Run NLP Extraction"**:
   - Point out the exact attribution tags: `Derived from: "Hey, it's Vikram. Let's process that advisory invoice for Horizon..."`
   - Show how caller, payee, amount ($64,500), and account are mapped with zero hallucination.
5. Click **"Submit Request for Clearance"**.
6. **The Wow Moment**:
   - Despite zero urgency keywords and a calm tone, VEIL's **Policy Gate immediately flags and holds the request**.
   - Show the hold badges:
     - ⚠️ `Payee 'Horizon Advisory Partners' is not in the Approved Vendor Directory.`
     - ⚠️ `Amount ($64,500) exceeds single-signature limit.`

---

### [1:30 - 2:15] The ERP Clearance Gate & Two-Person Rule

**What to Say:**
> *"Here is where VEIL bridges AI detection into real enterprise accounting. In the real world, employees use SAP, NetSuite, or Oracle. VEIL acts as an active clearance gate."*

**What to Click:**
1. In Payment Requests, click the **"Finance ERP Queue (Mock SAP/NetSuite)"** tab.
2. Point out the disbursement status: **"BLOCKED / ON HOLD"** with a red clearance lock.
3. Show the **In-App cURL clearance tester**:
   - Click **"Test Clearance Check API"**.
   - Show the real JSON response: `allowedToDisburse: false`, with the exact policy violation reasons returned to the ERP.
4. Try to click **"Approve"** while logged in as the submitter (`employee@veil.corp`):
   - Notice the button is disabled or triggers a strict **403 Forbidden: Submitter cannot self-approve**.

---

### [2:15 - 3:00] Dual-Custody Approval & Out-of-Band Challenge

**What to Say:**
> *"To release these funds, the two-person dual custody policy requires an independent Approver to conduct an out-of-band verification challenge."*

**What to Click:**
1. Switch user to **Approver** (`approver@veil.corp` / `Approver123!`).
2. Navigate to **Payment Requests** and click **"Review Hold"** on the held request.
3. The **Approver Resolution Dialog** appears:
   - Step 1: Point out the **Directory Phone Mismatch Warning**:
     - *Claimed incoming caller: +1 (555) 019-9481*
     - *Verified Directory line: +1 (555) 019-8820*
   - Step 2: Click **"Initiate Out-of-Band Callback"**. A 6-digit challenge code (`682-xxx`) is generated.
   - Step 3: Enter the verification code and the verified safe phrase.
   - Click **"Release Hold & Approve Clearance"**.
4. Switch back to the **Finance ERP Queue**:
   - The status immediately turns green: **"CLEARED / READY TO DISBURSE"**.
   - The cURL API now returns `allowedToDisburse: true`.

---

### [3:00+] Conclusion: The Evaluation Lab

**What to Say:**
> *"Finally, we don't hide our machine learning numbers. If you open our **Evaluation Lab**, we benchmark an open-source pretrained Wav2Vec2 audio classifier side-by-side with our acoustic heuristics on 20 real and synthetic audio clips.*
> 
> *The model alone has a 100% false positive rate on noisy laptop microphones. But when combined with VEIL's Dual Consensus and Directory Policy Gates, accuracy reaches 100% with zero false disbursements.*
> 
> *VEIL doesn't just guess voices. It defends your company's balance sheet."*

---

## Judge Q&A Cheat Sheet

| Question | Defensible Answer |
|---|---|
| **"What if the attacker generates a flawless voice clone with zero acoustic artifacts?"** | *"The transaction is still blocked. Voice analysis only accounts for 20% of VEIL's decision. Because the payee's bank routing number isn't in the pre-approved vendor directory, Pillar 1 (40%) triggers an automatic hold, and Pillar 2 (25%) enforces two-person approval and an out-of-band phone callback."* |
| **"Can an insider employee collude with the attacker to approve their own request?"** | *"No. VEIL strictly enforces the Two-Person Rule. The submitter's token is cryptographically forbidden from approving their own request (`403 Forbidden`). Approval requires an independent Approver role."* |
| **"How does the existing accounting software know to pause payments?"** | *"Through VEIL's REST Integration Gate (`GET /api/integrations/payments/:id/status`). Before the ERP (SAP, NetSuite) triggers an automated wire batch, it queries VEIL. If `allowedToDisburse` is false, the disbursement is blocked."* |
| **"Does this require expensive cloud AI APIs?"** | *"Zero paid cloud APIs. The entire platform runs locally on CPU with SQLite, Express, React, and local acoustic models."* |
