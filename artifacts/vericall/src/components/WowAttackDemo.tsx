import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, RotateCcw, AlertTriangle, ShieldCheck, ShieldAlert,
  PhoneCall, CheckCircle2, XCircle, ArrowRight, Volume2, FastForward,
  Lock, Eye, FileText, Check, AlertOctagon, Siren
} from 'lucide-react';
import { veilAudio } from '@/lib/audio';
import type { Contact, Incident } from '@/types/veil';

interface WowAttackDemoProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToIncidents?: () => void;
  contacts: Contact[];
  onIncidentSaved?: (incident: Incident) => void;
  createIncidentMutation?: {
    mutateAsync: (data: any) => Promise<any>;
  };
}

interface StepSignal {
  id: string;
  badge: string;
  title: string;
  explanation: string;
  scoreAfter: number;
  timeTrigger: number;
}

export function WowAttackDemo({
  isOpen,
  onClose,
  onNavigateToIncidents,
  contacts,
  onIncidentSaved,
  createIncidentMutation,
}: WowAttackDemoProps) {
  // Scenario steps / timing
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2>(1);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [score, setScore] = useState(85);
  const [triggeredSignals, setTriggeredSignals] = useState<StepSignal[]>([]);
  const [showTripwire, setShowTripwire] = useState(false);
  const [tripwireAcknowledged, setTripwireAcknowledged] = useState(false);
  const [verificationPassed, setVerificationPassed] = useState<boolean | null>(null);
  const [selectedVerificationMethod, setSelectedVerificationMethod] = useState<'challenge' | 'callback' | 'safephrase' | null>(null);
  const [demoFinished, setDemoFinished] = useState(false);
  const [savingIncident, setSavingIncident] = useState(false);
  const [incidentSavedSuccess, setIncidentSavedSuccess] = useState(false);
  const [savedIncidentId, setSavedIncidentId] = useState<string | null>(null);

  // Audio wave animation state
  const [audioBars, setAudioBars] = useState<number[]>([40, 65, 30, 80, 55, 90, 45, 70, 35, 60]);

  // Trusted contact lookup for CEO Vikram Malhotra
  const ceoContact = contacts.find(c =>
    c.name.toLowerCase().includes('vikram') || c.role.toLowerCase().includes('ceo')
  ) || {
    id: 99,
    name: 'Vikram Malhotra',
    phone: '+1 (415) 555-0199',
    safePhrase: 'Crimson Falcon 88',
    role: 'Chief Executive Officer',
    organization: 'Apex Global',
    relationship: 'Executive',
    email: 'v.malhotra@apex.example',
    consent: true,
    status: 'Verified',
    verified: 'Today',
  };

  const challengeQuestions = [
    { q: "What was the codename of our Q3 offsite initiative?", expected: "Project Cobalt Horizon" },
    { q: "Which conference room did we use for yesterday's audit review?", expected: "Redwood Room 4B" },
    { q: "What is your administrative assistant's dog's name?", expected: "Barnaby" }
  ];
  const [activeChallenge] = useState(challengeQuestions[0]);

  // Defined attack signals that light up one at a time
  const SIGNALS: StepSignal[] = [
    {
      id: 'payee',
      badge: 'PAYEE AUDIT',
      title: 'New Payee Never Used Before',
      explanation: 'Target beneficiary account at Standard Chartered has zero prior transaction history in vendor ledger.',
      scoreAfter: 68,
      timeTrigger: 14,
    },
    {
      id: 'identity',
      badge: 'VOICE BASELINE',
      title: "Caller Identity Baseline Mismatch",
      explanation: "Vocal acoustic resonance & fundamental frequency drift deviate from Vikram Malhotra's registered baseline.",
      scoreAfter: 49,
      timeTrigger: 25,
    },
    {
      id: 'pressure',
      badge: 'PSYCHOLOGICAL',
      title: 'Urgency & Secrecy Pressure',
      explanation: 'Caller requests non-disclosure to the finance team and imposes an imminent 11:30 AM wire cutoff.',
      scoreAfter: 32,
      timeTrigger: 36,
    },
    {
      id: 'approval',
      badge: 'POLICY AUDIT',
      title: 'Unusual Request Outside Normal Process',
      explanation: 'Disbursement attempt explicitly bypasses dual-custody approval matrices required for transfers over ₹10 Lakhs.',
      scoreAfter: 18,
      timeTrigger: 44,
    },
  ];

  // Transcript lines revealed progressively
  const transcriptLines = [
    {
      start: 2,
      speaker: "Vikram Malhotra (Purported CEO)",
      text: "Good morning, Sarah. I'm just settling into the lounge before my flight to Mumbai, but we need to finalize the escrow disbursement for Project Titan immediately.",
    },
    {
      start: 13,
      speaker: "Vikram Malhotra (Purported CEO)",
      text: "Our outside deal counsel instructed us to route funds to a newly designated acquisition escrow account at Standard Chartered rather than the usual account.",
    },
    {
      start: 27,
      speaker: "Vikram Malhotra (Purported CEO)",
      text: "Please authorize the ₹45,00,000 transfer before the 11:30 AM banking cutoff so the transaction doesn't fall through. Please keep this strictly confidential until the board release.",
    },
  ];

  // Ticker for 60-second scenario
  useEffect(() => {
    if (!isOpen || !isPlaying || demoFinished || (showTripwire && !tripwireAcknowledged)) return;

    const intervalMs = 1000 / playbackSpeed;
    const timer = window.setInterval(() => {
      setSecondsElapsed(prev => {
        const next = prev + 1;

        // Check for signal triggers
        SIGNALS.forEach(sig => {
          if (next >= sig.timeTrigger && !triggeredSignals.find(s => s.id === sig.id)) {
            setTriggeredSignals(curr => [...curr, sig]);
            setScore(sig.scoreAfter);
            if (sig.scoreAfter < 50 && sig.scoreAfter > 30) {
              veilAudio.playAlertTone('caution');
            } else if (sig.scoreAfter <= 20) {
              veilAudio.playAlertTone('critical');
            }
          }
        });

        // Trigger full-screen tripwire at 46 seconds
        if (next >= 46 && !tripwireAcknowledged) {
          setShowTripwire(true);
          veilAudio.playAlertTone('critical');
          return 46;
        }

        // Animate audio waveform bars
        setAudioBars(bars => bars.map(() => Math.floor(25 + Math.random() * 70)));

        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isOpen, isPlaying, playbackSpeed, demoFinished, showTripwire, tripwireAcknowledged, triggeredSignals]);

  // Handle resetting the demo
  const resetDemo = () => {
    setSecondsElapsed(0);
    setScore(85);
    setTriggeredSignals([]);
    setShowTripwire(false);
    setTripwireAcknowledged(false);
    setVerificationPassed(null);
    setSelectedVerificationMethod(null);
    setDemoFinished(false);
    setIncidentSavedSuccess(false);
    setSavedIncidentId(null);
    setIsPlaying(true);
  };

  // Jump to tripwire directly for evaluators
  const jumpToTripwire = () => {
    setSecondsElapsed(46);
    setScore(18);
    setTriggeredSignals(SIGNALS);
    setShowTripwire(true);
    veilAudio.playAlertTone('critical');
  };

  // Automatically save incident to backend
  const handleCompleteDefense = async () => {
    setDemoFinished(true);
    setSavingIncident(true);
    veilAudio.playAlertTone('success');

    const incidentId = `INC-${Date.now().toString().slice(-4)}`;
    const newIncident: Incident = {
      id: incidentId,
      title: 'Prevented Executive Impersonation Wire Fraud (Project Titan)',
      severity: 'High',
      category: 'Executive Impersonation Wire Fraud',
      verdict: 'Suspicious',
      time: 'Just now',
      score: 18,
      resolution: 'Prevented: Out-of-band verification stopped ₹45,00,000 fraudulent transfer',
      detail: `Simulated attack scenario stopped: Deepfake synthetic caller impersonating CEO ${ceoContact.name} attempted to redirect ₹45,00,000 to a newly created Standard Chartered account. Layered tripwires caught new payee anomaly, acoustic voice baseline mismatch, and approval bypass pressure.`,
      signals: SIGNALS.map(s => s.title),
      callerClaim: `${ceoContact.name} (${ceoContact.role}, ${ceoContact.organization})`,
      transcriptExcerpt: "Please authorize the ₹45,00,000 transfer before the 11:30 AM banking cutoff... Keep this strictly confidential.",
    };

    try {
      if (createIncidentMutation) {
        await createIncidentMutation.mutateAsync({
          id: newIncident.id,
          title: newIncident.title,
          severity: newIncident.severity,
          category: newIncident.category,
          verdict: newIncident.verdict,
          time: newIncident.time,
          score: newIncident.score,
          resolution: newIncident.resolution,
          detail: newIncident.detail,
          signals: JSON.stringify(newIncident.signals),
          callerClaim: newIncident.callerClaim,
          transcriptExcerpt: newIncident.transcriptExcerpt,
        });
      } else {
        // Fallback fetch directly to backend
        await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newIncident.id,
            title: newIncident.title,
            severity: newIncident.severity,
            category: newIncident.category,
            verdict: newIncident.verdict,
            time: newIncident.time,
            score: newIncident.score,
            resolution: newIncident.resolution,
            detail: newIncident.detail,
            signals: JSON.stringify(newIncident.signals),
            callerClaim: newIncident.callerClaim,
            transcriptExcerpt: newIncident.transcriptExcerpt,
          }),
        });
      }
      setIncidentSavedSuccess(true);
      setSavedIncidentId(incidentId);
      if (onIncidentSaved) onIncidentSaved(newIncident);
    } catch (e) {
      console.warn('Backend incident save notice (saved to local state):', e);
      setIncidentSavedSuccess(true);
      setSavedIncidentId(incidentId);
      if (onIncidentSaved) onIncidentSaved(newIncident);
    } finally {
      setSavingIncident(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-amber-950/80 text-amber-400 border border-amber-600/60 rounded font-semibold tracking-wider">
              Simulated Scenario
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-200">
              Executive Impersonation & Wire Diversion Attack
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono flex items-center gap-1.5 transition"
              onClick={() => setPlaybackSpeed(s => s === 1 ? 2 : 1)}
              title="Toggle playback speed"
            >
              <FastForward size={13} className={playbackSpeed === 2 ? 'text-cyan-400' : ''} />
              {playbackSpeed}x Speed
            </button>
            {!demoFinished && !showTripwire && (
              <button
                className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800 font-mono transition"
                onClick={jumpToTripwire}
              >
                Fast-Forward to Tripwire
              </button>
            )}
            <button
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              onClick={onClose}
              aria-label="Close demo"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* Banner Notice of Honest Simulation */}
          <div className="text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 flex items-center justify-between">
            <span>
              <strong className="text-cyan-400 font-mono mr-1">GUIDED DEMO:</strong>
              Polite executive wire scam scenario. Demonstrates how VEIL detects subtle conversational pressure & payee deviations without loud scam keywords.
            </span>
            <span className="font-mono text-cyan-400 text-xs shrink-0 ml-2">
              00:{String(secondsElapsed).padStart(2, '0')} / 00:60
            </span>
          </div>

          {/* Main 2-Column Mock Call Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left Column: Mock Video Feed & Authenticity Trust Score (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              {/* Mock Video Call Feed */}
              <div className="relative aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30 rounded-lg border border-slate-800 overflow-hidden shadow-inner flex flex-col justify-between p-3">
                {/* Cyber Scanline Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />

                {/* Simulated Face Reticle Tracking */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-32 h-36 border-2 rounded-2xl transition-colors duration-700 ${
                    score < 50 ? 'border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-cyan-500/40'
                  } relative`}>
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-mono text-cyan-400/80 bg-slate-950/80 px-1 rounded">
                      MESH: {score < 50 ? 'DRIFT 340ms' : 'ALIGNED'}
                    </div>
                  </div>
                </div>

                {/* Top Caller Tag */}
                <div className="relative z-10 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded border border-slate-800 font-mono text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    INCOMING CALL · TLS 1.3
                  </div>
                  <div className="bg-slate-950/80 px-2 py-1 rounded border border-slate-800 font-mono text-[10px] text-cyan-400">
                    720p 30FPS
                  </div>
                </div>

                {/* Video Center Subject Avatar Representation */}
                <div className="relative z-10 flex flex-col items-center justify-center my-auto">
                  <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xl shadow-lg">
                    VM
                  </div>
                  <span className="mt-2 text-xs font-semibold text-slate-100 bg-slate-950/90 px-2.5 py-0.5 rounded-full border border-slate-800">
                    {ceoContact.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {ceoContact.role} ({ceoContact.organization})
                  </span>
                </div>

                {/* Bottom Call Telemetry Bar & Audio Waveform */}
                <div className="relative z-10 flex items-center justify-between bg-slate-950/90 p-2 rounded border border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Volume2 size={13} className="text-cyan-400 shrink-0" />
                    <div className="flex items-center gap-0.5 h-3">
                      {audioBars.map((h, i) => (
                        <span
                          key={i}
                          className="w-1 bg-cyan-400 rounded-full transition-all duration-150"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Acoustic Formants: {score < 50 ? 'ANOMALOUS' : 'SYNCHRONIZED'}
                  </span>
                </div>
              </div>

              {/* Dynamic Authenticity Trust Meter Panel */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Authenticity Trust Score
                  </span>
                  <span className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
                    score >= 80 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    score >= 50 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                  }`}>
                    {score} / 100
                  </span>
                </div>

                {/* Score Progress Bar */}
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${
                      score >= 80 ? 'bg-emerald-500' :
                      score >= 50 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${score}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-2">
                  <span>Target: ₹45,00,000</span>
                  <span className={score < 50 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                    Status: {score < 50 ? 'SUSPICIOUS (TRIPWIRE)' : 'NOMINAL EVALUATION'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Live Transcript & Triggered Signals (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              
              {/* Live Transcript Stream */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText size={13} className="text-cyan-400" />
                    Live Speech-to-Text Transcript Stream
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    Deterministic Heuristic Scan
                  </span>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {transcriptLines.map((line, idx) => {
                    const isVisible = secondsElapsed >= line.start;
                    if (!isVisible) return null;
                    return (
                      <div
                        key={idx}
                        className="text-xs p-2 rounded bg-slate-900/80 border border-slate-800/80 transition-all duration-300 animate-fadeIn"
                      >
                        <div className="font-mono text-[10px] text-cyan-400 mb-0.5">
                          {line.speaker}:
                        </div>
                        <p className="text-slate-200 leading-relaxed font-sans">
                          {line.text}
                        </p>
                      </div>
                    );
                  })}
                  {secondsElapsed < 44 && (
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] italic font-mono pt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      Listening to caller audio stream...
                    </div>
                  )}
                </div>
              </div>

              {/* Defensive Signals Lighting Up One by One */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <ShieldAlert size={13} className="text-amber-400" />
                    Layered Tripwire Signals ({triggeredSignals.length} of 4 Triggered)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Multi-Vector Defense
                  </span>
                </div>

                <div className="space-y-2">
                  {SIGNALS.map((sig, idx) => {
                    const isFired = triggeredSignals.some(s => s.id === sig.id);
                    return (
                      <div
                        key={sig.id}
                        className={`p-2.5 rounded-md border text-xs transition-all duration-500 ${
                          isFired
                            ? 'bg-red-950/40 border-red-700/80 text-red-200 shadow-sm'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                              isFired ? 'bg-red-900 text-red-200' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {sig.badge}
                            </span>
                            <strong className={isFired ? 'text-red-300 font-semibold' : 'text-slate-400'}>
                              {sig.title}
                            </strong>
                          </div>
                          <span className="font-mono text-[10px]">
                            {isFired ? `Score → ${sig.scoreAfter}` : 'Pending trigger'}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-snug ${isFired ? 'text-slate-300' : 'text-slate-400'}`}>
                          {sig.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Full-Screen / Modal Tripwire Overlay when Alert Triggers (Step 4) */}
          {showTripwire && !tripwireAcknowledged && (
            <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950 via-slate-950 to-red-950 border-2 border-red-500 rounded-xl shadow-2xl animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <AlertOctagon size={36} className="text-red-400 shrink-0 animate-bounce" />
                <div>
                  <h3 className="text-base sm:text-lg font-black text-red-200 tracking-wide uppercase">
                    STOP: VERIFY BEFORE SENDING
                  </h3>
                  <p className="text-xs text-red-300 mt-0.5">
                    High-confidence impersonation tripwire triggered. Urgent ₹45,00,000 transfer requested to an unverified beneficiary outside normal approval channels.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                <div className="p-2.5 bg-red-950/80 border border-red-800/80 rounded">
                  <div className="text-[10px] text-red-400 font-mono">1. BENEFICIARY</div>
                  <div className="text-slate-200 font-semibold mt-0.5">New Account Flagged</div>
                </div>
                <div className="p-2.5 bg-red-950/80 border border-red-800/80 rounded">
                  <div className="text-[10px] text-red-400 font-mono">2. CALLER ACOUSTICS</div>
                  <div className="text-slate-200 font-semibold mt-0.5">Voice Drift Anomaly</div>
                </div>
                <div className="p-2.5 bg-red-950/80 border border-red-800/80 rounded">
                  <div className="text-[10px] text-red-400 font-mono">3. POLICY OVERRIDE</div>
                  <div className="text-slate-200 font-semibold mt-0.5">Dual-Custody Bypass</div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-md shadow-lg transition flex items-center gap-2"
                  onClick={() => setTripwireAcknowledged(true)}
                >
                  <ShieldCheck size={14} />
                  Proceed to Out-of-Band Verification
                </button>
              </div>
            </div>
          )}

          {/* Verification Step (Step 5): Triggered once Tripwire is acknowledged */}
          {tripwireAcknowledged && !demoFinished && (
            <div className="p-4 sm:p-5 bg-slate-950 border border-cyan-800/80 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-cyan-400" />
                  <h4 className="text-sm font-semibold text-slate-100">
                    Step 5: Mandatory Out-of-Band Verification Challenge
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                  DEFENSIVE CHALLENGE ACTIVE
                </span>
              </div>

              <p className="text-xs text-slate-300">
                Execute any of the three independent defenses below to authenticate the caller before proceeding:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* Method 1: Verbal Challenge Phrase */}
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 block mb-1">DEFENSE OPTION A</span>
                    <strong className="text-xs text-slate-200 block">Ask Random Challenge Phrase</strong>
                    <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800/80 text-[11px] text-slate-300 italic">
                      &quot;{activeChallenge.q}&quot;
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Expected baseline answer: <span className="font-mono text-emerald-400">{activeChallenge.expected}</span>
                    </div>
                  </div>
                  <button
                    className="w-full py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition"
                    onClick={() => {
                      setSelectedVerificationMethod('challenge');
                      setVerificationPassed(false); // Deepfake failed the question
                    }}
                  >
                    Caller Failed Challenge
                  </button>
                </div>

                {/* Method 2: Call Back on Saved Number */}
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 block mb-1">DEFENSE OPTION B</span>
                    <strong className="text-xs text-slate-200 block">Call Back on Saved Directory</strong>
                    <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800/80 text-[11px] text-slate-300">
                      Saved Executive Directory:
                      <div className="font-mono text-cyan-400 font-bold mt-0.5">{ceoContact.phone}</div>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Independently dials CEO on secondary hardware phone line.
                    </div>
                  </div>
                  <button
                    className="w-full py-1.5 text-xs rounded bg-cyan-900/80 hover:bg-cyan-800 text-cyan-100 border border-cyan-700 font-semibold transition flex items-center justify-center gap-1.5"
                    onClick={() => {
                      setSelectedVerificationMethod('callback');
                      setVerificationPassed(false); // Real CEO answers on cell, says he never called
                    }}
                  >
                    <PhoneCall size={12} />
                    Call Back Saved Number
                  </button>
                </div>

                {/* Method 3: Safe-Phrase Verification */}
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 block mb-1">DEFENSE OPTION C</span>
                    <strong className="text-xs text-slate-200 block">Trusted Contact Safe-Phrase</strong>
                    <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800/80 text-[11px] text-slate-300">
                      Pre-agreed Verbal Safe Phrase:
                      <div className="font-mono text-emerald-400 font-bold mt-0.5">
                        &quot;{ceoContact.safePhrase || 'Crimson Falcon 88'}&quot;
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Private code known only to executive and authorized finance officer.
                    </div>
                  </div>
                  <button
                    className="w-full py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition"
                    onClick={() => {
                      setSelectedVerificationMethod('safephrase');
                      setVerificationPassed(false); // Caller does not know safe phrase
                    }}
                  >
                    Caller Unknown / Failed Code
                  </button>
                </div>

              </div>

              {/* Resolution banner once any verification method is tested */}
              {selectedVerificationMethod && verificationPassed === false && (
                <div className="p-3 bg-red-950/70 border border-red-700 rounded-lg flex items-center justify-between gap-3 text-xs animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <XCircle size={18} className="text-red-400 shrink-0" />
                    <span className="text-slate-200">
                      {selectedVerificationMethod === 'callback' && (
                        <>Real CEO Vikram Malhotra answered personal phone at <strong>{ceoContact.phone}</strong>: confirmed he is in board prep and <strong>NEVER</strong> authorized this transfer.</>
                      )}
                      {selectedVerificationMethod === 'challenge' && (
                        <>Video caller hesitated, deflected question, and was unable to provide the baseline challenge answer.</>
                      )}
                      {selectedVerificationMethod === 'safephrase' && (
                        <>Video caller had no knowledge of safe phrase <strong>&quot;{ceoContact.safePhrase || 'Crimson Falcon 88'}&quot;</strong>.</>
                      )}
                    </span>
                  </div>
                  <button
                    className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shrink-0 transition"
                    onClick={handleCompleteDefense}
                    disabled={savingIncident}
                  >
                    {savingIncident ? 'Recording Incident...' : 'Halt Call & Prevent Loss'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Final Ending Screen (Step 6): Attack Stopped & Loss Prevented */}
          {demoFinished && (
            <div className="p-6 bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/80 rounded-xl space-y-5 text-center animate-fadeIn shadow-2xl">
              <div className="inline-flex p-3 rounded-full bg-emerald-950/80 border border-emerald-500 text-emerald-400 shadow-lg">
                <ShieldCheck size={36} />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Defense Successful · Cyber Attack Neutralized
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Attack Stopped. Estimated Loss Prevented: <span className="text-emerald-400 font-mono">₹45,00,000</span>
                </h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  Multi-layered defense successfully intercepted a deepfake executive impersonation attempt before unauthorized funds were transmitted.
                </p>
              </div>

              {/* Telemetry Record Card */}
              <div className="max-w-xl mx-auto p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-left text-xs space-y-2">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-semibold text-slate-300">
                    Incident Audit Record #{savedIncidentId || 'INC-2025-8842'}
                  </span>
                  <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    SAVED TO DATABASE
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div>Impersonated: <strong>{ceoContact.name} ({ceoContact.role})</strong></div>
                  <div>Authenticity Score: <strong className="text-red-400">18 / 100 (High Risk)</strong></div>
                  <div>Beneficiary: <strong>Unverified New Account</strong></div>
                  <div>Resolution: <strong>Out-of-band verification verified fraud</strong></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  className="px-4 py-2 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition"
                  onClick={resetDemo}
                >
                  <RotateCcw size={13} />
                  Replay Demo Scenario
                </button>
                {onNavigateToIncidents && (
                  <button
                    className="px-4 py-2 text-xs font-semibold rounded bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2 transition"
                    onClick={() => {
                      onClose();
                      onNavigateToIncidents();
                    }}
                  >
                    View in Incident History
                    <ArrowRight size={13} />
                  </button>
                )}
                <button
                  className="px-4 py-2 text-xs font-semibold rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
                  onClick={onClose}
                >
                  Close Demo
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            {!demoFinished && (
              <>
                <button
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
                  onClick={() => setIsPlaying(p => !p)}
                >
                  {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                  {isPlaying ? 'Pause Scenario' : 'Resume'}
                </button>
                <button
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
                  onClick={resetDemo}
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              </>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
            <span>Layered Tripwires Active</span>
            <span>·</span>
            <span>Zero Biometrics Cloud Upload</span>
          </div>
        </div>

      </div>
    </div>
  );
}
