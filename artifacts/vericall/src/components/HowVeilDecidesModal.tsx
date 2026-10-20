import React from 'react';
import { ShieldCheck, X, Building2, UserCheck, Mic, AlertTriangle, Scale, Lock, Info } from 'lucide-react';

interface HowVeilDecidesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowVeilDecidesModal({ isOpen, onClose }: HowVeilDecidesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
              <Scale size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                How VEIL Decides
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Defensive Policy
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                VEIL verifies the request, not just the voice. Deepfake detection is one of several signals.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-sm text-slate-300">
          {/* Key Concept Box */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-800/40">
            <h3 className="text-xs font-mono uppercase text-cyan-300 font-semibold mb-1 flex items-center gap-2">
              <ShieldCheck size={14} className="text-cyan-400" />
              The Multi-Layer Defense Principle
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Generative voice clones can fool standalone neural models. VEIL protects enterprise capital by combining 
              real-time acoustic indicators with strict dual-custody approval gates and authorized vendor directory baselines. 
              <strong> An attacker cannot divert capital simply by cloning an executive's voice.</strong>
            </p>
          </div>

          {/* 4 Pillars with Weights */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
              Composite Decision Weights
            </h4>

            {/* Pillar 1 */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-emerald-950/70 border border-emerald-800/80 text-emerald-400 shrink-0 mt-0.5">
                <Building2 size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-200 text-sm">Approved Directory & Bank Account Baseline</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                    40% Weight
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every transaction is cross-checked against pre-verified vendor beneficiary accounts, bank routing IFSC codes, 
                  and registered staff phone numbers. Any bank account mismatch or unapproved payee immediately halts the transaction.
                </p>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-cyan-950/70 border border-cyan-800/80 text-cyan-400 shrink-0 mt-0.5">
                <UserCheck size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-200 text-sm">Dual-Custody Approval Policy</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                    25% Weight
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enforces mandatory two-person separation of duties. Submitting employees <strong>cannot approve their own requests</strong>. 
                  An independent Approver must conduct an out-of-band telephone callback and verify safe phrases before funds can be released.
                </p>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-indigo-950/70 border border-indigo-800/80 text-indigo-400 shrink-0 mt-0.5">
                <Mic size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-200 text-sm">Pretrained Audio Classifier (Wav2Vec2 — Soft Signal Only)</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                    Soft Signal (Max 20%)
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Evaluated on 32 user recordings (19 authentic human, 13 synthetic): <strong>75.0% accuracy, 31.6% FPR, 15.4% FNR</strong>. Results are indicative of small-to-medium corpus performance.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  <strong>Why audio is strictly a soft signal:</strong> A 31.6% false-positive rate means almost 1 in 3 real voices could trigger suspicion under noisy mic conditions. Therefore, wav2vec2 may lower confidence to <em>"Needs verification" / "Needs review"</em>, but <strong>must never produce "Stop" by itself</strong>. Directory checks, payment policy, and transcript signals decide Stop.
                </p>
                <div className="mt-2 text-[11px] text-amber-400/90 bg-amber-950/30 border border-amber-900/40 p-2 rounded">
                  <strong>Note:</strong> The acoustic spectral heuristic is experimental and excluded from scoring decisions (measured 28.1% accuracy, 52.6% FPR, 100.0% FNR).
                </div>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-amber-950/70 border border-amber-800/80 text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-200 text-sm">Conversational Urgency & Social Engineering Tripwires</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                    15% Weight
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time pattern analysis identifying high-pressure coercion language ("right now", "immediately", "urgent"), secrecy demands 
                  ("keep this between us"), approval bypass attempts, and OTP/passcode harvesting attempts.
                </p>
              </div>
            </div>
          </div>

          {/* Transparent Notice */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Info size={14} className="text-cyan-400" />
              Operational Disclaimer
            </div>
            <p>
              VEIL does not process monetary transfers or connect directly to bank rails. VEIL acts as an authorization policy gate, 
              verifying identity and compliance to generate an immutable audit trail and mark transactions cleared or blocked.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
