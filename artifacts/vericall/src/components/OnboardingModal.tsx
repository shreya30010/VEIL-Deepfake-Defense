import React, { useState } from 'react';
import {
  ShieldCheck, X, UserCheck, CreditCard, Play, ArrowRight, ArrowLeft, Check,
  Lock, Building2, Sparkles, AlertOctagon, HelpCircle
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchDemo?: () => void;
  onQuickSwitchUser?: (email: string) => void;
}

export function OnboardingModal({
  isOpen,
  onClose,
  onLaunchDemo,
  onQuickSwitchUser,
}: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleFinish = () => {
    if (dontShowAgain) {
      localStorage.setItem('veil_onboarding_dismissed', 'true');
    }
    onClose();
  };

  const steps = [
    {
      stepNumber: 1,
      tag: 'ARCHITECTURE',
      title: 'Multi-Layer Defense (Not Just Audio)',
      icon: ShieldCheck,
      iconTone: 'cyan',
      headline: 'VEIL verifies the transaction, not just the voice.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-300">
          <p>
            Standalone deepfake audio detectors have high error rates on noisy consumer microphones.
            VEIL protects small-to-midsize finance teams by treating deepfake detection as <strong>one signal among several</strong>:
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-mono text-cyan-400 font-bold text-[10px] block mb-1">1. DUAL AUDIO ENGINES</span>
              Pretrained Hugging Face Wav2Vec2 neural model paired with acoustic Nyquist cutoff (&gt;7.4 kHz) &amp; pitch micro-jitter analysis.
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-mono text-emerald-400 font-bold text-[10px] block mb-1">2. DIRECTORY BASELINE</span>
              Cross-checks beneficiary names, bank accounts, and phone numbers against pre-approved corporate directory.
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-mono text-purple-400 font-bold text-[10px] block mb-1">3. TWO-PERSON GATE</span>
              Mandatory dual-custody authorization. Submitting employees cannot approve their own requests.
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-mono text-amber-400 font-bold text-[10px] block mb-1">4. OUT-OF-BAND OOB</span>
              One-time verification challenge codes and verbal safe phrases confirmed via registered desk phones.
            </div>
          </div>
        </div>
      ),
    },
    {
      stepNumber: 2,
      tag: 'ROLE-BASED ACCESS',
      title: 'Three Roles & How to Test Them',
      icon: UserCheck,
      iconTone: 'purple',
      headline: 'Pre-seeded demo accounts with one-click switcher.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-300">
          <p>
            Evaluate VEIL from the perspective of each member of a finance organization:
          </p>
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-950 text-blue-300 border border-blue-800">EMPLOYEE</span>
                  Sarah Chen (Finance Analyst)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  employee@veil.corp · Password: <code>Employee123!</code>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Submits payment requests &amp; runs Live Shield. Cannot approve own requests.</div>
              </div>
              {onQuickSwitchUser && (
                <button
                  onClick={() => onQuickSwitchUser('employee@veil.corp')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition"
                >
                  Switch
                </button>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-950 text-purple-300 border border-purple-800">APPROVER</span>
                  Ananya Rao (VP Finance &amp; Operations)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  approver@veil.corp · Password: <code>Approver123!</code>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Reviews held transfers, verifies OOB callback codes, and clears ERP hold.</div>
              </div>
              {onQuickSwitchUser && (
                <button
                  onClick={() => onQuickSwitchUser('approver@veil.corp')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition"
                >
                  Switch
                </button>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">ADMIN</span>
                  David Vance (Head of Information Security)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  admin@veil.corp · Password: <code>Admin123!</code>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Manages approved vendor registry, staff directory, and system audit trails.</div>
              </div>
              {onQuickSwitchUser && (
                <button
                  onClick={() => onQuickSwitchUser('admin@veil.corp')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition"
                >
                  Switch
                </button>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      stepNumber: 3,
      tag: 'DUAL CUSTODY',
      title: 'How Payment Holds & ERP Gates Work',
      icon: CreditCard,
      iconTone: 'amber',
      headline: 'A gate that actually gates monetary disbursement.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-300">
          <p>
            When a payment request is submitted, VEIL automatically evaluates four tripwires:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li><strong className="text-slate-200">Vendor Directory Match:</strong> Is the beneficiary in the approved vendor registry?</li>
            <li><strong className="text-slate-200">Bank Account Match:</strong> Does the IBAN / routing match the vendor's verified account on file?</li>
            <li><strong className="text-slate-200">Policy Threshold:</strong> Does the requested amount exceed the single-sign authorization limit?</li>
            <li><strong className="text-slate-200">Calm Attack Defense:</strong> Even if the caller is completely calm and uses zero urgency keywords, unapproved accounts are held!</li>
          </ul>

          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200 text-xs">
            <strong>ERP Clearance Integration:</strong> External accounting systems query <code>GET /api/integrations/payments/:id/status</code> using an API key (<code>ERP_GATE_API_KEY</code> from your server's .env file). Funds remain strictly locked in the ERP until an independent Approver provides sign-off.
          </div>
        </div>
      ),
    },
    {
      stepNumber: 4,
      tag: 'INTERACTIVE DEMO',
      title: 'Run the Standout Executive Attack Demo',
      icon: Play,
      iconTone: 'emerald',
      headline: '60-second guided simulation of executive wire fraud.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-300">
          <p>
            To see all layers of VEIL operating simultaneously, launch the guided <strong>Executive Wire Fraud Demo</strong> (Project Titan):
          </p>
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-950 border border-cyan-800/80 space-y-2">
            <div className="font-bold text-slate-100 flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-400" />
              Scenario: CEO Impersonation (Project Titan)
            </div>
            <p className="text-[11px] text-slate-300 leading-normal">
              A synthetic caller impersonating CEO Vikram Malhotra contacts finance staff requesting an emergency ₹45,00,000 transfer to an unapproved overseas escrow depository.
            </p>
            <div className="text-[10px] text-slate-400 font-mono">
              ✓ Multi-modal biometrics drop score to 24/100 · ✓ Signals light up · ✓ Independent callback prevents capital diversion.
            </div>
          </div>
          <p className="text-slate-400 text-[11px]">
            You can relaunch this demo anytime using the <strong>"Watch an attack happen"</strong> hero button on the Overview page or in the sidebar.
          </p>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];
  const StepIcon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800">
              <StepIcon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold uppercase">
                  {current.tag} · STEP {current.stepNumber} OF 4
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-100 mt-0.5">
                {current.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white transition"
            aria-label="Close guide"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="text-sm font-semibold text-cyan-300">
            {current.headline}
          </div>
          {current.content}
        </div>

        {/* Footer with Step Progress & Navigation */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 text-cyan-600 rounded bg-slate-900 border-slate-700"
            />
            <span>Don't show this guide on startup</span>
          </label>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition"
              >
                <ArrowLeft size={13} />
                Back
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1 transition shadow"
              >
                Next Step
                <ArrowRight size={13} />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {onLaunchDemo && (
                  <button
                    onClick={() => {
                      handleFinish();
                      onLaunchDemo();
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
                  >
                    <Play size={13} fill="currentColor" />
                    Launch Demo Now
                  </button>
                )}
                <button
                  onClick={handleFinish}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition shadow"
                >
                  <Check size={13} />
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
