import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard, ShieldAlert, CheckCircle2, Clock, AlertTriangle, XCircle,
  Plus, ArrowRight, UserCheck, PhoneCall, Key, Lock, Building2, AlertOctagon, RefreshCw,
  FileText, Sparkles, Copy, Check, Terminal, ExternalLink, ShieldCheck, HelpCircle,
  ChevronDown, ChevronUp, Cpu, Server, CheckSquare
} from 'lucide-react';
import type { AuthUser, PaymentRequest, Vendor, Contact } from '@/types/veil';

interface PaymentRequestsViewProps {
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onQuickSwitchUser: (email: string) => void;
  onToast: (msg: string) => void;
  onNavigateToIncidents: () => void;
}

// Pre-defined realistic call transcripts for testing auto-extraction
const TRANSCRIPT_SCENARIOS = [
  {
    id: 'calm_ceo',
    badge: 'Calm Request (No Panic Keywords)',
    title: 'Polite CEO Vendor Invoice (Horizon Advisory Partners)',
    tone: 'calm',
    expectedHoldReason: 'Payee not in approved vendor directory & new bank account',
    explanation: 'Urgency detector will NOT fire (polite tone, zero panic words). However, VEIL still holds the transaction because the payee is unrecognized in the approved corporate directory.',
    transcript: `Hi, this is Vikram. Please process the invoice for Horizon Advisory Partners, ₹4,50,000, to account ACCT-9912. No rush, standard terms.`,
  },
  {
    id: 'urgent_ceo',
    badge: 'High-Pressure Attack (Panic & Secrecy)',
    title: 'Urgent Offshore Asset Acquisition Wire (Project Titan)',
    tone: 'urgent',
    expectedHoldReason: 'Urgency & secrecy triggers + unapproved overseas escrow + threshold exceedance',
    explanation: 'Severe urgency and secrecy pressure keywords detected. Directs payment to unapproved Cayman escrow account.',
    transcript: `This is Vikram Malhotra. We have an urgent overseas transaction today for confidential asset acquisition. Wire ₹45,00,000 to Pan-Pacific Escrow Cayman, account KY-8829-OFFSHORE-01 immediately before 3 PM. Keep this strictly private between us.`,
  },
  {
    id: 'legitimate_vendor',
    badge: 'Legitimate Request (Approved Vendor)',
    title: 'Monthly Operating Retainer (Apex Global Operating)',
    tone: 'legit',
    expectedHoldReason: 'None — matches approved directory vendor & account within policy limits',
    explanation: 'Recognized internal staff member, approved vendor in corporate directory, and recognized HDFC account number within single-signer threshold.',
    transcript: `Hello team, this is Ananya Rao from accounts. Please release the monthly retainer of ₹4,50,000 to Apex Global Operating Account, account number ACCT-4491-HDFC under regular terms.`,
  },
];

const PRESET_SCENARIOS = [
  {
    label: 'High-Risk Attack: CEO Urgent Acquisition Wire (₹45,00,000)',
    data: {
      claimedCaller: 'Vikram Malhotra',
      callerPhone: '+1 (415) 555-9999', // Phone mismatch (directory has +1 415 555-0199)
      action: 'Urgent transfer for confidential overseas asset acquisition. Bypass standard paperwork today.',
      amount: 4500000,
      payee: 'Pan-Pacific Escrow Cayman', // Not in approved vendor directory
      bankAccount: 'KY-8829-OFFSHORE-01',
      urgencyLanguage: true,
    },
  },
  {
    label: 'Calm Attack: Polite Invoice for Horizon Advisory (₹4,50,000)',
    data: {
      claimedCaller: 'Vikram Malhotra',
      callerPhone: '+1 (415) 555-0199',
      action: 'Please process the invoice for Horizon Advisory Partners. No rush, standard terms.',
      amount: 450000,
      payee: 'Horizon Advisory Partners', // Not in approved vendor directory
      bankAccount: 'ACCT-9912',
      urgencyLanguage: false,
    },
  },
  {
    label: 'Nominal Vendor Payment: Apex Operating Account (₹4,50,000)',
    data: {
      claimedCaller: 'Ananya Rao',
      callerPhone: '+1 (415) 555-0184',
      action: 'Routine monthly operating software retainer fee.',
      amount: 450000,
      payee: 'Apex Global Operating Account', // Approved vendor & within limit
      bankAccount: 'ACCT-4491-HDFC',
      urgencyLanguage: false,
    },
  },
];

export function PaymentRequestsView({
  currentUser,
  onOpenAuth,
  onQuickSwitchUser,
  onToast,
  onNavigateToIncidents,
}: PaymentRequestsViewProps) {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'All' | 'On hold' | 'Verified' | 'Approved' | 'Rejected'>('All');
  const [activeTab, setActiveTab] = useState<'veil_ledger' | 'erp_queue'>('veil_ledger');

  // Submit Form state
  const [formOpen, setFormOpen] = useState(false);
  const [claimedCaller, setClaimedCaller] = useState('');
  const [callerPhone, setCallerPhone] = useState('');
  const [action, setAction] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [payee, setPayee] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [urgencyLanguage, setUrgencyLanguage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-extraction from transcript state
  const [extractOpen, setExtractOpen] = useState(true);
  const [transcriptInput, setTranscriptInput] = useState(TRANSCRIPT_SCENARIOS[0].transcript);
  const [activeScenarioId, setActiveScenarioId] = useState('calm_ceo');
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any | null>(null);

  // Selected payment for approval review
  const [selectedPayment, setSelectedPayment] = useState<PaymentRequest | null>(null);
  const [approvalReason, setApprovalReason] = useState('');
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [checklistCallback, setChecklistCallback] = useState(false);
  const [checklistSafePhrase, setChecklistSafePhrase] = useState(false);
  const [checklistErp, setChecklistErp] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Out-of-band callback challenge state (Single-use, 10-minute expiry, SHA-256 hashed on server)
  const [challengeCode, setChallengeCode] = useState<string | null>(null);
  const [challengeExpiry, setChallengeExpiry] = useState<string | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  const requestCallbackChallenge = async (paymentId: string) => {
    try {
      setChallengeLoading(true);
      setChallengeError(null);
      const token = localStorage.getItem('veil_auth_token');
      const resp = await fetch(`/api/payments/${paymentId}/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await resp.json();
      if (resp.ok && data.verificationCode) {
        setChallengeCode(data.verificationCode);
        setChallengeExpiry(data.expiresAt);
      } else {
        setChallengeError(data.message || 'Could not generate callback challenge');
      }
    } catch (err: any) {
      setChallengeError(err.message || 'Network error');
    } finally {
      setChallengeLoading(false);
    }
  };

  useEffect(() => {
    if (
      selectedPayment &&
      selectedPayment.status === 'On hold' &&
      currentUser &&
      currentUser.id !== selectedPayment.submitterId &&
      (currentUser.role === 'Approver' || currentUser.role === 'Admin')
    ) {
      requestCallbackChallenge(selectedPayment.id);
    } else {
      setChallengeCode(null);
      setChallengeExpiry(null);
      setChallengeError(null);
    }
  }, [selectedPayment?.id, currentUser?.id, currentUser?.role]);

  // ERP Integration testing tool state
  const [erpTestPaymentId, setErpTestPaymentId] = useState<string>('');
  const [erpTestResult, setErpTestResult] = useState<any | null>(null);
  const [erpTestLoading, setErpTestLoading] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Fetch payments from backend
  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('veil_auth_token');
      const resp = await fetch('/api/payments', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resp.ok) {
        const data = await resp.json();
        setRequests(data.paymentRequests || []);
        if (data.paymentRequests?.length > 0 && !erpTestPaymentId) {
          setErpTestPaymentId(data.paymentRequests[0].id);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  // Initial load and 2.5-second live polling for Approver feedback
  useEffect(() => {
    fetchPayments();
    const interval = setInterval(() => {
      fetchPayments();
    }, 2500);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle Preset selection
  const loadPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setClaimedCaller(preset.data.claimedCaller);
    setCallerPhone(preset.data.callerPhone);
    setAction(preset.data.action);
    setAmount(preset.data.amount);
    setPayee(preset.data.payee);
    setBankAccount(preset.data.bankAccount);
    setUrgencyLanguage(preset.data.urgencyLanguage);
    setFormOpen(true);
  };

  // Select transcript scenario
  const selectScenario = (sc: typeof TRANSCRIPT_SCENARIOS[0]) => {
    setActiveScenarioId(sc.id);
    setTranscriptInput(sc.transcript);
    setExtractedData(null);
  };

  // Rule-based transcript extraction
  const handleExtractTranscript = async () => {
    if (!transcriptInput.trim()) {
      onToast('Please enter or select a call transcript first.');
      return;
    }

    setExtracting(true);
    try {
      const token = localStorage.getItem('veil_auth_token');
      const resp = await fetch('/api/payments/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ transcript: transcriptInput }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setExtractedData(data.extracted);
        onToast('Fields extracted with source sentence attribution.');
      } else {
        // Fallback local rule extraction
        fallbackLocalExtraction(transcriptInput);
      }
    } catch (err: any) {
      fallbackLocalExtraction(transcriptInput);
    } finally {
      setExtracting(false);
    }
  };

  // Client-side fallback rule extraction if offline
  const fallbackLocalExtraction = (text: string) => {
    const sentences = text.split(/(?<=[.?!])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
    let caller: any = null;
    let phone: any = null;
    let amt: any = null;
    let pay: any = null;
    let acct: any = null;
    let act: any = null;
    let urg = { detected: false, phrases: [] as string[], sourceSentence: '' };
    let sec = { detected: false, phrases: [] as string[], sourceSentence: '' };

    for (const s of sentences) {
      if (!caller) {
        const m = s.match(/(?:this is|i am|i'm|speaking with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        if (m) caller = { value: m[1].trim(), sourceSentence: s };
      }
      if (!phone) {
        const m = s.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        if (m) phone = { value: m[0].trim(), sourceSentence: s };
      }
      if (!amt) {
        const m = s.match(/[₹$]\s*([\d,]+(?:\.\d+)?)/);
        if (m) {
          const val = parseInt(m[1].replace(/,/g, ''), 10);
          amt = { value: val, formatted: `₹${val.toLocaleString('en-IN')}`, sourceSentence: s };
        }
      }
      if (!acct) {
        const m = s.match(/(?:account(?:\s+number)?|acct)\s*(?:is|#|:)?\s*([A-Z0-9\-]{6,26})/i) ||
                  s.match(/\b([A-Z]{2,4}-[0-9]{4}-[A-Z0-9\-]{2,12})\b/i);
        if (m) acct = { value: m[1].trim(), sourceSentence: s };
      }
      if (!pay) {
        const m = s.match(/(?:to|for|payee|vendor|invoice for)\s+([A-Z][A-Za-z0-9&.,\- ]+?)(?:,|\.|\bto account\b|\bunder\b|\baccount\b)/i);
        if (m) pay = { value: m[1].trim().replace(/[.,]$/, ''), sourceSentence: s };
      }
      for (const kw of ['immediately', 'before 3 pm', 'urgent', 'asap', 'deadline']) {
        if (s.toLowerCase().includes(kw)) {
          urg.detected = true;
          urg.phrases.push(kw);
          urg.sourceSentence = s;
        }
      }
      for (const kw of ['confidential', 'strictly private', 'keep this between us']) {
        if (s.toLowerCase().includes(kw)) {
          sec.detected = true;
          sec.phrases.push(kw);
          sec.sourceSentence = s;
        }
      }
    }

    setExtractedData({
      claimedCaller: caller,
      callerPhone: phone,
      amount: amt,
      payee: pay,
      bankAccount: acct,
      action: act ? act.value : 'Vendor invoice payment authorization',
      urgency: urg,
      secrecy: sec,
      sentences,
    });
    onToast('Extracted details using local parsing engine.');
  };

  // Apply extracted fields into the form
  const applyExtractedToForm = () => {
    if (!extractedData) return;
    if (extractedData.claimedCaller) setClaimedCaller(extractedData.claimedCaller.value);
    if (extractedData.callerPhone) setCallerPhone(extractedData.callerPhone.value);
    else setCallerPhone('+1 (415) 555-0199'); // Fallback default directory phone
    if (extractedData.amount) setAmount(extractedData.amount.value);
    if (extractedData.payee) setPayee(extractedData.payee.value);
    if (extractedData.bankAccount) setBankAccount(extractedData.bankAccount.value);
    setAction(extractedData.actionSentence || extractedData.action || 'Call invoice processing');
    setUrgencyLanguage(Boolean(extractedData.urgency?.detected || extractedData.secrecy?.detected));
    setFormOpen(true);
    onToast('Form pre-filled from extracted transcript.');
  };

  // Submit payment request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!amount || Number(amount) <= 0) {
      onToast('Please enter a valid transfer amount.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('veil_auth_token');
      const resp = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          claimedCaller,
          callerPhone,
          action,
          amount: Number(amount),
          payee,
          bankAccount,
          urgencyLanguage,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.message || 'Failed to submit payment request');
      }

      onToast(`Payment request ${data.paymentRequest.id} submitted! Status: ${data.paymentRequest.status}`);
      setFormOpen(false);
      // Reset form
      setClaimedCaller('');
      setCallerPhone('');
      setAction('');
      setAmount('');
      setPayee('');
      setBankAccount('');
      setUrgencyLanguage(false);
      fetchPayments();
    } catch (err: any) {
      onToast(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Approver decision (Approve / Reject)
  const handleDecision = async (decision: 'approve' | 'reject') => {
    if (!selectedPayment) return;
    if (!approvalReason.trim()) {
      onToast('A justification note is required to sign off on this decision.');
      return;
    }

    if (decision === 'approve' && !verificationCodeInput.trim()) {
      onToast('The Out-of-Band verification code is required before approval.');
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('veil_auth_token');
      const resp = await fetch(`/api/payments/${selectedPayment.id}/${decision}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reason: approvalReason,
          verificationCode: verificationCodeInput,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.message || `Failed to ${decision} request`);
      }

      onToast(`Payment request ${selectedPayment.id} ${decision}d successfully!`);
      setSelectedPayment(null);
      setApprovalReason('');
      setVerificationCodeInput('');
      setChecklistCallback(false);
      setChecklistSafePhrase(false);
      setChecklistErp(false);
      fetchPayments();
    } catch (err: any) {
      onToast(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Test ERP status check endpoint
  const testErpStatusCheck = async (id: string) => {
    if (!id) return;
    setErpTestLoading(true);
    setErpTestResult(null);
    try {
      // Uses the login-protected tester route, so the ERP API key never reaches the browser.
      const token = localStorage.getItem('veil_auth_token');
      const resp = await fetch(`/api/payments/${id}/clearance-check`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await resp.json();
      setErpTestResult(data);
    } catch (err: any) {
      setErpTestResult({ error: 'NetworkError', message: err.message });
    } finally {
      setErpTestLoading(false);
    }
  };

  const copyCurlSnippet = (id: string) => {
    // The real key lives only in .env (ERP_GATE_API_KEY); paste it in place of the placeholder.
    const curl = `curl.exe -s -H "x-api-key: <ERP_GATE_API_KEY from .env>" "http://localhost:3001/api/integrations/payments/${id || 'REQ-XXXX'}/status"`;
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
    onToast('cURL integration command copied to clipboard.');
  };

  const filtered = requests.filter((r) => {
    if (filter === 'All') return true;
    return r.status === filter;
  });

  const onHoldCount = requests.filter((r) => r.status === 'On hold').length;
  const verifiedCount = requests.filter((r) => r.status === 'Verified' || r.status === 'Approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'Rejected').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CreditCard className="text-cyan-400" size={22} />
            Payment Requests & Dual-Custody Approval
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Automated verification against approved vendor bank accounts and staff directory.
            All held transfers strictly require an independent second-person sign-off before ERP disbursement.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Live Sync Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-[11px] font-mono text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Sync Active</span>
          </div>

          <button
            onClick={fetchPayments}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
            title="Refresh list"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setFormOpen(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
          >
            <Plus size={15} />
            Submit New Request
          </button>
        </div>
      </div>

      {/* Main Mode Tabs: VEIL Ledger vs ERP Finance System Queue */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('veil_ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'veil_ledger'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ShieldCheck size={15} />
          VEIL Policy & Approval Ledger
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-900 text-cyan-200">
            {requests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('erp_queue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'erp_queue'
              ? 'bg-amber-950 text-amber-300 border border-amber-800 shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Building2 size={15} />
          Mock Finance ERP System (SAP / NetSuite Disbursement Queue)
          {onHoldCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-900 text-amber-200">
              {onHoldCount} Blocked
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW TAB 1: VEIL POLICY & APPROVAL LEDGER                                 */}
      {/* ========================================================================= */}
      {activeTab === 'veil_ledger' && (
        <div className="space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[11px] font-mono uppercase text-slate-400">Total Requests</div>
              <div className="text-2xl font-bold text-slate-100 mt-1">{requests.length}</div>
            </div>
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/40">
              <div className="text-[11px] font-mono uppercase text-amber-400 flex items-center gap-1">
                <Clock size={12} /> On Hold (Review Req.)
              </div>
              <div className="text-2xl font-bold text-amber-300 mt-1">{onHoldCount}</div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
              <div className="text-[11px] font-mono uppercase text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> Verified / Approved
              </div>
              <div className="text-2xl font-bold text-emerald-300 mt-1">{verifiedCount}</div>
            </div>
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40">
              <div className="text-[11px] font-mono uppercase text-red-400 flex items-center gap-1">
                <XCircle size={12} /> Blocked / Rejected
              </div>
              <div className="text-2xl font-bold text-red-300 mt-1">{rejectedCount}</div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* AUTO-EXTRACT FROM TRANSCRIPT SECTION                                  */}
          {/* ===================================================================== */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-cyan-800/60 overflow-hidden shadow-lg">
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Auto-Extract Request from Call Transcript
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Rule-Based NLP · Zero Cloud Cost
                </span>
              </div>
              <button
                onClick={() => setExtractOpen(!extractOpen)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                {extractOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {extractOpen ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {extractOpen && (
              <div className="p-5 space-y-4 text-xs">
                <div>
                  <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold mb-2 block">
                    Select Test Scenario to Load Transcript:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {TRANSCRIPT_SCENARIOS.map((sc) => {
                      const isSelected = activeScenarioId === sc.id;
                      return (
                        <button
                          key={sc.id}
                          onClick={() => selectScenario(sc)}
                          className={`p-3 rounded-xl text-left border transition ${
                            isSelected
                              ? 'bg-cyan-950/70 border-cyan-500 shadow-md ring-1 ring-cyan-500/30'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                                sc.tone === 'calm'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : sc.tone === 'urgent'
                                  ? 'bg-red-950 text-red-300 border border-red-800'
                                  : 'bg-blue-950 text-blue-300 border border-blue-800'
                              }`}
                            >
                              {sc.badge}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-200 mt-1 line-clamp-1">
                            {sc.title}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                            {sc.explanation}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Transcript Input Area */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-slate-300">
                      Call Audio Transcript (Paste or Edit):
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Sentences parsed with direct quote attribution
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={transcriptInput}
                    onChange={(e) => setTranscriptInput(e.target.value)}
                    placeholder="Paste or type audio transcript from call..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 font-sans focus:outline-none focus:border-cyan-500 leading-relaxed text-xs"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={handleExtractTranscript}
                      disabled={extracting}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow"
                    >
                      <Cpu size={14} className={extracting ? 'animate-spin' : ''} />
                      {extracting ? 'Extracting Fields...' : 'Extract Request Fields'}
                    </button>
                  </div>
                </div>

                {/* Extracted Fields Display with Sentence Attribution */}
                {extractedData && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-900/60 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-400" />
                        Extracted Payment Request (Attributed to Transcript Sentences)
                      </div>
                      <button
                        onClick={applyExtractedToForm}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow"
                      >
                        <Plus size={13} />
                        Apply &amp; Open Submit Form
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Claimed Caller */}
                      <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block">Claimed Caller</span>
                        <div className="text-slate-100 font-semibold mt-0.5">
                          {extractedData.claimedCaller ? extractedData.claimedCaller.value : 'Not specified'}
                        </div>
                        {extractedData.claimedCaller?.sourceSentence && (
                          <div className="text-[10px] text-cyan-400 font-mono mt-1 italic">
                            Derived from: "{extractedData.claimedCaller.sourceSentence}"
                          </div>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block">Transfer Amount</span>
                        <div className="text-cyan-300 font-mono font-bold text-sm mt-0.5">
                          {extractedData.amount ? extractedData.amount.formatted : 'Not detected'}
                        </div>
                        {extractedData.amount?.sourceSentence && (
                          <div className="text-[10px] text-cyan-400 font-mono mt-1 italic">
                            Derived from: "{extractedData.amount.sourceSentence}"
                          </div>
                        )}
                      </div>

                      {/* Payee */}
                      <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block">Beneficiary Payee</span>
                        <div className="text-slate-100 font-semibold mt-0.5">
                          {extractedData.payee ? extractedData.payee.value : 'Not specified'}
                        </div>
                        {extractedData.payee?.sourceSentence && (
                          <div className="text-[10px] text-cyan-400 font-mono mt-1 italic">
                            Derived from: "{extractedData.payee.sourceSentence}"
                          </div>
                        )}
                      </div>

                      {/* Bank Account */}
                      <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block">Bank Account / IBAN</span>
                        <div className="text-slate-100 font-mono mt-0.5">
                          {extractedData.bankAccount ? extractedData.bankAccount.value : 'Not detected'}
                        </div>
                        {extractedData.bankAccount?.sourceSentence && (
                          <div className="text-[10px] text-cyan-400 font-mono mt-1 italic">
                            Derived from: "{extractedData.bankAccount.sourceSentence}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Urgency & Secrecy Analysis Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className={`p-2.5 rounded-lg border text-xs ${
                        extractedData.urgency?.detected
                          ? 'bg-red-950/30 border-red-800 text-red-200'
                          : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                      }`}>
                        <div className="font-semibold flex items-center gap-1.5">
                          {extractedData.urgency?.detected ? <AlertTriangle size={13} className="text-red-400" /> : <CheckCircle2 size={13} className="text-emerald-400" />}
                          Urgency Detector: {extractedData.urgency?.detected ? 'Detected High Pressure' : 'None Detected (Calm Tone)'}
                        </div>
                        {extractedData.urgency?.detected ? (
                          <div className="text-[10px] text-red-300 font-mono mt-1">
                            Keywords: {extractedData.urgency.phrases?.join(', ')}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-1">
                            0 panic keywords found. Demonstrates calm impersonation scenario.
                          </div>
                        )}
                      </div>

                      <div className={`p-2.5 rounded-lg border text-xs ${
                        extractedData.secrecy?.detected
                          ? 'bg-purple-950/30 border-purple-800 text-purple-200'
                          : 'bg-slate-900/40 border-slate-800 text-slate-300'
                      }`}>
                        <div className="font-semibold flex items-center gap-1.5">
                          <Lock size={13} className={extractedData.secrecy?.detected ? 'text-purple-400' : 'text-slate-400'} />
                          Secrecy Detector: {extractedData.secrecy?.detected ? 'Detected Bypass Language' : 'Standard Terms'}
                        </div>
                        {extractedData.secrecy?.detected && (
                          <div className="text-[10px] text-purple-300 font-mono mt-1">
                            Keywords: {extractedData.secrecy.phrases?.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Explanatory Policy Callout */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-amber-900/40 text-amber-200/90 text-xs flex items-start gap-2.5">
                      <HelpCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Why VEIL's Policy Gate Holds Calm Requests:</strong> Even when a synthetic caller uses 0 urgency keywords and speaks in a completely calm, professional manner, VEIL automatically cross-references the beneficiary name and bank routing against the approved vendor registry. Any unverified payee or modified account is placed <strong>On hold</strong> regardless of tone.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preset Demo Scenarios */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-900/40">
            <div className="text-xs font-mono uppercase text-cyan-400 font-semibold mb-2 flex items-center gap-1.5">
              <Building2 size={14} />
              Quick Load Test Scenarios (Judges &amp; Demo)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {PRESET_SCENARIOS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => loadPreset(p)}
                  className="p-2.5 rounded-lg text-left bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-cyan-700/60 transition group"
                >
                  <div className="text-[11px] font-semibold text-slate-200 group-hover:text-cyan-300 line-clamp-1">
                    {p.label.split(':')[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 font-mono">
                    {p.data.payee} · ₹{p.data.amount.toLocaleString('en-IN')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-1.5">
              {(['All', 'On hold', 'Verified', 'Approved', 'Rejected'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filter === tab
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              onClick={onNavigateToIncidents}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              View Incident Register
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Payments Table / List */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
                <CreditCard size={32} className="mx-auto text-slate-600 mb-2" />
                <h3 className="text-sm font-semibold text-slate-300">No payment requests in this view</h3>
                <p className="text-xs text-slate-500 mt-1">Submit a payment request above or load a test scenario to evaluate dual-custody hold.</p>
              </div>
            ) : (
              filtered.map((req) => {
                let flags: string[] = [];
                try {
                  flags = typeof req.flags === 'string' ? JSON.parse(req.flags) : (req.flags || []);
                } catch {
                  flags = [];
                }

                const isHeld = req.status === 'On hold';
                const isApproved = req.status === 'Approved';
                const isRejected = req.status === 'Rejected';
                const isVerified = req.status === 'Verified';

                return (
                  <div
                    key={req.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isHeld
                        ? 'bg-amber-950/20 border-amber-900/60'
                        : isRejected
                        ? 'bg-red-950/20 border-red-900/50'
                        : isApproved
                        ? 'bg-emerald-950/20 border-emerald-900/50'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-300">{req.id}</span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                              isHeld
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : isApproved
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : isRejected
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            }`}
                          >
                            {req.status}
                          </span>
                          <span className="text-xs text-slate-400">· Submitter: <strong className="text-slate-300">{req.submitterName}</strong></span>
                        </div>

                        <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                          <span>{req.payee}</span>
                          <span className="text-cyan-300 font-mono text-base">
                            ₹{req.amount.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>Bank: <code className="text-slate-300 font-mono">{req.bankAccount}</code></span>
                          <span>Claimed Caller: <span className="text-slate-300">{req.claimedCaller}</span> ({req.callerPhone})</span>
                          <span>Created: <span className="text-slate-500 font-mono">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span>
                        </div>

                        {req.action && (
                          <p className="text-xs text-slate-400 italic mt-1 bg-slate-950/40 p-2 rounded border border-slate-800/80">
                            "{req.action}"
                          </p>
                        )}

                        {/* Flags */}
                        {flags.length > 0 && (
                          <div className="pt-2 flex flex-wrap gap-1.5">
                            {flags.map((f, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/80 flex items-center gap-1"
                              >
                                <AlertTriangle size={11} className="text-amber-400" />
                                {f}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Decision info if approved or rejected */}
                        {(req.approvalReason || req.approverName) && (
                          <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/80 mt-2">
                            <strong>Decision by {req.approverName || 'Approver'}:</strong> "{req.approvalReason}"
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0 flex items-center gap-2">
                        {isHeld && (
                          <button
                            onClick={() => {
                              setSelectedPayment(req);
                              setVerificationCodeInput('');
                            }}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
                          >
                            <Lock size={13} />
                            Review &amp; Authorize
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW TAB 2: MOCK FINANCE SYSTEM ERP DISBURSEMENT QUEUE                   */}
      {/* ========================================================================= */}
      {activeTab === 'erp_queue' && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-amber-800/50 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Server size={18} />
              Enterprise Core Banking &amp; ERP Disbursement Gate (SAP / Oracle NetSuite Simulator)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              In small and mid-size companies, wire transfers are initiated in accounting systems like SAP or NetSuite.
              VEIL acts as an immutable external security gate: the ERP disbursement daemon continuously checks with VEIL,
              and <strong>strictly locks wire transmission</strong> until an independent Approver provides cryptographic sign-off.
            </p>
          </div>

          {/* ERP Disbursement Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 font-mono text-[11px] text-slate-400 uppercase">
                  <th className="p-3">ERP Voucher</th>
                  <th className="p-3">VEIL Reference</th>
                  <th className="p-3">Beneficiary Payee</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">VEIL Policy Clearance</th>
                  <th className="p-3">Disbursement Rail Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No transactions in ERP queue. Submit a payment request to test the gate.
                    </td>
                  </tr>
                ) : (
                  requests.map((r, i) => {
                    const isApproved = r.status === 'Approved' || r.status === 'Verified';
                    const isRejected = r.status === 'Rejected';
                    const isHeld = r.status === 'On hold' || r.status === 'Stop';
                    const voucherId = `SAP-VOUCH-${8900 + i}`;

                    return (
                      <tr key={r.id} className="hover:bg-slate-900/30 transition">
                        <td className="p-3 text-cyan-300 font-bold">{voucherId}</td>
                        <td className="p-3 text-slate-300">{r.id}</td>
                        <td className="p-3 font-sans font-medium text-slate-200">
                          {r.payee}
                          <span className="block text-[10px] text-slate-500 font-mono">{r.bankAccount}</span>
                        </td>
                        <td className="p-3 text-slate-100 font-bold">
                          ₹{r.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3">
                          {isHeld && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800">
                              <Lock size={10} />
                              BLOCKED BY VEIL GATE
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                              <CheckCircle2 size={10} />
                              CLEARED FOR DISBURSEMENT
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-red-950 text-red-300 border border-red-800">
                              <XCircle size={10} />
                              SECURITY CANCELLED
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {isHeld && (
                            <span className="text-amber-400 text-[11px] font-sans">
                              Locked in ERP escrow · Awaiting second-person sign-off
                            </span>
                          )}
                          {isApproved && (
                            <span className="text-emerald-400 text-[11px] font-sans">
                              Released for bank wire transmission ({r.approverName?.split(' ')[0] || 'Approver'})
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-red-400 text-[11px] font-sans">
                              Voucher voided · Security tripwire tripped
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* External System REST API Integration Playground */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Terminal size={16} className="text-cyan-400" />
                  External System REST Clearance API
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Third-party accounting systems or custom ERP daemons query this endpoint before releasing funds.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-1 bg-slate-950 text-slate-300 border border-slate-700 rounded">
                  Key: <code>ERP_GATE_API_KEY</code> (set in .env)
                </span>
                <button
                  onClick={() => copyCurlSnippet(erpTestPaymentId || (requests[0]?.id || 'REQ-01'))}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1.5 transition"
                >
                  {copiedCurl ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  {copiedCurl ? 'Copied' : 'Copy cURL'}
                </button>
              </div>
            </div>

            {/* Test Runner */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <span className="font-mono text-xs px-2 py-1.5 bg-slate-950 text-emerald-400 border border-slate-800 rounded">
                  GET
                </span>
                <div className="flex-1 font-mono text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-300 truncate">
                  /api/integrations/payments/
                  <select
                    value={erpTestPaymentId}
                    onChange={(e) => setErpTestPaymentId(e.target.value)}
                    className="bg-transparent text-cyan-300 font-bold border-b border-cyan-500 focus:outline-none px-1"
                  >
                    {requests.map((r) => (
                      <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                        {r.id} ({r.payee} - {r.status})
                      </option>
                    ))}
                  </select>
                  /status
                </div>
                <button
                  onClick={() => testErpStatusCheck(erpTestPaymentId || requests[0]?.id)}
                  disabled={erpTestLoading || !erpTestPaymentId}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {erpTestLoading ? <RefreshCw size={12} className="animate-spin" /> : <Terminal size={12} />}
                  Run Live API Check
                </button>
              </div>

              {/* API Output */}
              {erpTestResult && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pb-1 mb-2 border-b border-slate-900">
                    <span>HTTP 200 OK · Content-Type: application/json</span>
                    <span className={erpTestResult.allowedToDisburse ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {erpTestResult.allowedToDisburse ? 'DISBURSEMENT AUTHORIZED' : 'DISBURSEMENT LOCKED'}
                    </span>
                  </div>
                  <pre className="overflow-x-auto text-[11px] leading-relaxed text-slate-200">
                    {JSON.stringify(erpTestResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SUBMIT PAYMENT REQUEST FORM                                      */}
      {/* ========================================================================= */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <CreditCard size={18} className="text-cyan-400" />
                  Submit Payment Request
                </h2>
                <p className="text-xs text-slate-400">
                  Submitting as: <strong className="text-cyan-300">{currentUser?.name || 'Guest (Please log in)'}</strong>
                </p>
              </div>
              <button
                onClick={() => setFormOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Claimed Caller Name</label>
                  <input
                    type="text"
                    required
                    value={claimedCaller}
                    onChange={(e) => setClaimedCaller(e.target.value)}
                    placeholder="e.g. Vikram Malhotra (CEO)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Caller Phone Number</label>
                  <input
                    type="text"
                    required
                    value={callerPhone}
                    onChange={(e) => setCallerPhone(e.target.value)}
                    placeholder="+1 (415) 555-0199"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Payment Purpose &amp; Narrative</label>
                <textarea
                  required
                  rows={2}
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="Describe the context of the transfer or reason stated by the caller..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Transfer Amount (₹ INR)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 4500000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Beneficiary Payee Name</label>
                  <input
                    type="text"
                    required
                    value={payee}
                    onChange={(e) => setPayee(e.target.value)}
                    placeholder="Vendor or recipient name"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Beneficiary Bank Account Number</label>
                <input
                  type="text"
                  required
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="e.g. ACCT-8821-SCB"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-200">Urgency / Secrecy Pressure Present?</div>
                  <div className="text-[11px] text-slate-400">Caller urged bypassing routine verification or keeping confidential</div>
                </div>
                <input
                  type="checkbox"
                  checked={urgencyLanguage}
                  onChange={(e) => setUrgencyLanguage(e.target.checked)}
                  className="w-4 h-4 text-cyan-600 rounded bg-slate-900 border-slate-700 focus:ring-0"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {submitting ? 'Running Automated Checks...' : 'Submit & Verify'}
                  <ArrowRight size={13} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TWO-PERSON DUAL-CUSTODY APPROVAL GATE                           */}
      {/* ========================================================================= */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <UserCheck size={18} className="text-cyan-400" />
                  Dual-Custody Approver Decision Gate
                </h2>
                <p className="text-xs text-slate-400">
                  Request ID: <span className="font-mono text-cyan-300 font-bold">{selectedPayment.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Submitter & Two-Person Enforcement Banner */}
            {currentUser && currentUser.id === selectedPayment.submitterId ? (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 text-red-200 text-xs mb-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-red-300">
                  <AlertOctagon size={16} />
                  Two-Person Rule Active: Self-Approval Prohibited
                </div>
                <p className="leading-relaxed">
                  You submitted this payment request as <strong>{selectedPayment.submitterName}</strong>.
                  Under corporate governance policy, an independent second employee with the <strong>Approver</strong> or <strong>Admin</strong> role
                  must review and authorize this transaction.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onQuickSwitchUser('approver@veil.corp');
                    }}
                    className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 border border-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <RefreshCw size={13} />
                    Switch to Approver (Ananya Rao)
                  </button>
                </div>
              </div>
            ) : currentUser?.role === 'Employee' ? (
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800 text-amber-200 text-xs mb-4">
                <strong>Role Notice:</strong> You are logged in as an Employee. Only users with the <strong>Approver</strong> or <strong>Admin</strong> role can sign off.
                <button
                  onClick={() => onQuickSwitchUser('approver@veil.corp')}
                  className="ml-2 underline text-amber-300 hover:text-white font-semibold"
                >
                  Switch to Approver
                </button>
              </div>
            ) : null}

            {/* Request Summary */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">Beneficiary Payee</span>
                  <span className="text-slate-200 font-semibold">{selectedPayment.payee}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Amount</span>
                  <span className="text-cyan-300 font-mono font-bold text-sm">
                    ₹{selectedPayment.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Bank Account</span>
                  <span className="text-slate-200 font-mono">{selectedPayment.bankAccount}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Claimed Caller</span>
                  <span className="text-slate-200">{selectedPayment.claimedCaller} ({selectedPayment.callerPhone})</span>
                </div>
              </div>

              {/* Caller vs Directory Phone Mismatch Warning */}
              {selectedPayment.claimedCaller.toLowerCase().includes('vikram') && selectedPayment.callerPhone !== '+1 (415) 555-0199' && (
                <div className="p-2.5 rounded bg-red-950/40 border border-red-800 text-red-300 flex items-center gap-2 font-mono text-[11px] mt-2">
                  <AlertTriangle size={14} className="shrink-0 text-red-400" />
                  <span>PHONE MISMATCH: Directory has +1 (415) 555-0199; Incoming line was {selectedPayment.callerPhone}!</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-900">
                <span className="text-slate-500 block mb-1">Automated Triggered Flags:</span>
                <div className="space-y-1">
                  {(() => {
                    let flagsList: string[] = [];
                    try {
                      flagsList = typeof selectedPayment.flags === 'string'
                        ? JSON.parse(selectedPayment.flags)
                        : (selectedPayment.flags || []);
                    } catch {
                      flagsList = [];
                    }
                    if (flagsList.length === 0) return <span className="text-emerald-400 font-mono">None</span>;
                    return flagsList.map((f, i) => (
                      <div key={i} className="text-amber-300 flex items-start gap-1.5 font-mono text-[11px]">
                        <AlertTriangle size={13} className="shrink-0 text-amber-400 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Out-Of-Band Callback Verification Challenge */}
            <div className="p-4 rounded-xl bg-slate-950/90 border border-cyan-800/60 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-cyan-400 font-bold flex items-center gap-1.5">
                  <PhoneCall size={14} />
                  Out-Of-Band Independent Callback Challenge
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Required for Dual Sign-off
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Directory-Registered Phone:</span>
                  <span className="font-mono text-cyan-300 font-bold">+1 (415) 555-0199 (Desk Line)</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <div className="flex items-center gap-2">
                    <span>One-Time Callback Code:</span>
                    <span className="text-[10px] text-slate-400 font-mono">(Valid 10m · Single-Use · SHA-256 Hashed)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {challengeLoading ? (
                      <span className="text-xs text-cyan-400 animate-pulse font-mono">Generating...</span>
                    ) : challengeCode ? (
                      <span className="font-mono text-emerald-400 font-bold text-sm bg-slate-950 px-2 py-0.5 rounded border border-emerald-800 tracking-wider">
                        {challengeCode}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400 font-mono">{challengeError || 'No active challenge'}</span>
                    )}
                    <button
                      type="button"
                      disabled={challengeLoading}
                      onClick={() => selectedPayment && requestCallbackChallenge(selectedPayment.id)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Generate new callback code"
                    >
                      <RefreshCw size={12} className={challengeLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Required Safe Phrase:</span>
                  <span className="font-mono text-purple-300 font-bold">Crimson Falcon 88</span>
                </div>
              </div>

              {/* Code Input & Helper */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-300">
                    Enter Confirmed One-Time Code:
                  </label>
                  {challengeCode && (
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationCodeInput(challengeCode);
                        setChecklistCallback(true);
                        setChecklistSafePhrase(true);
                        setChecklistErp(true);
                        setApprovalReason(`Independently called Vikram on registered desk line (+1 415 555-0199). Safe phrase Crimson Falcon 88 confirmed verbally and OTP ${challengeCode} verified.`);
                      }}
                      className="text-[10px] text-cyan-400 hover:underline"
                    >
                      Simulate Verbal Callback Confirmation
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={verificationCodeInput}
                  onChange={(e) => setVerificationCodeInput(e.target.value)}
                  placeholder={challengeCode ? `e.g. ${challengeCode}` : "Enter 6-digit callback OTP"}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Approver Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-900">
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklistCallback}
                    onChange={(e) => setChecklistCallback(e.target.checked)}
                    className="w-4 h-4 text-cyan-600 rounded bg-slate-900 border-slate-700"
                  />
                  <span>Independent telephone callback placed to known directory number (not caller's line)</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklistSafePhrase}
                    onChange={(e) => setChecklistSafePhrase(e.target.checked)}
                    className="w-4 h-4 text-cyan-600 rounded bg-slate-900 border-slate-700"
                  />
                  <span>Safe phrase challenge authenticated against corporate baseline</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklistErp}
                    onChange={(e) => setChecklistErp(e.target.checked)}
                    className="w-4 h-4 text-cyan-600 rounded bg-slate-900 border-slate-700"
                  />
                  <span>Bank routing and beneficiary confirmed against signed contract / ERP</span>
                </label>
              </div>
            </div>

            {/* Reason Input */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Approver Audit Justification Note (Required)
              </label>
              <textarea
                rows={2}
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder="Detail verification steps conducted (e.g., 'Called Vikram on direct desk line; safe phrase Crimson Falcon 88 confirmed')..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={
                    actionLoading ||
                    (currentUser?.id === selectedPayment.submitterId) ||
                    (currentUser?.role === 'Employee')
                  }
                  onClick={() => handleDecision('reject')}
                  className="px-4 py-2 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 rounded-lg text-xs font-semibold transition disabled:opacity-40"
                >
                  Reject &amp; Block
                </button>
                <button
                  type="button"
                  disabled={
                    actionLoading ||
                    (currentUser?.id === selectedPayment.submitterId) ||
                    (currentUser?.role === 'Employee') ||
                    !checklistCallback ||
                    !checklistSafePhrase ||
                    !checklistErp ||
                    !verificationCodeInput.trim()
                  }
                  onClick={() => handleDecision('approve')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 shadow"
                >
                  Approve &amp; Release
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <Lock size={16} className="text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-300 block mb-0.5">Dual-Custody Policy Enforcement Disclaimer</strong>
          VEIL does not process monetary transfers or connect directly to bank rails. VEIL acts as an authorization policy gate,
          verifying identity and compliance to generate an immutable audit trail and mark transactions cleared or blocked before transmission to your banking portal.
        </div>
      </div>
    </div>
  );
}
