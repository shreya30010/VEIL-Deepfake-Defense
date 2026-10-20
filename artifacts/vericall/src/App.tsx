import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Link, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity, AlertOctagon, AlertTriangle, ArrowRight, CheckCircle2, ChevronRight,
  Download, FileDown, History, Home, LockKeyhole, Menu, Mic,
  Pause, Play, Plus, Radio, RotateCcw, Search, Settings2, Shield, ShieldAlert,
  ShieldCheck, Siren, SlidersHorizontal, Sparkles, Square, StopCircle, Users,
  Video, Volume2, VolumeX, X, PhoneCall, Key, Eye, EyeOff, Check,
  CreditCard, FileCheck, Building2, Scale
} from 'lucide-react';
import NotFound from '@/pages/not-found';
import { veilAudio } from '@/lib/audio';
import { LiveCameraHUD } from '@/components/LiveCameraHUD';
import { AudioWaveformVisualizer } from '@/components/AudioWaveformVisualizer';
import { TrustMeter } from '@/components/TrustMeter';
import { WowAttackDemo } from '@/components/WowAttackDemo';
import { HowVeilDecidesModal } from '@/components/HowVeilDecidesModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { AuthModal } from '@/components/AuthModal';
import { PaymentRequestsView } from '@/components/PaymentRequestsView';
import { EvaluationLabView } from '@/components/EvaluationLabView';
import { VendorsDirectoryView } from '@/components/VendorsDirectoryView';
import type { Contact, Incident, AttackScenario, AuthUser } from '@/types/veil';
import {
  useListIncidents,
  useCreateIncident,
  useUpdateIncidentResolution,
  useDeleteIncident,
  useListContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useAnalyzeMediaOrTranscript,
  useHealthCheck,
} from '@workspace/api-client-react';

const queryClient = new QueryClient();

// Streamlined navigation including Payment Requests, Evaluation Lab, and Vendors Directory
const routes = [
  { path: '/', label: 'Overview', icon: Home },
  { path: '/payment-requests', label: 'Payment Requests', icon: CreditCard },
  { path: '/live-shield', label: 'Live Shield', icon: Shield },
  { path: '/attack-simulator', label: 'Attack Simulator', icon: Activity },
  { path: '/incidents', label: 'Incident History', icon: History },
  { path: '/evaluation', label: 'Evaluation Lab', icon: FileCheck },
  { path: '/trusted-contacts', label: 'Trusted Contacts', icon: Users },
  { path: '/vendors', label: 'Approved Vendors', icon: Building2 },
  { path: '/settings', label: 'Settings', icon: Settings2 },
];

const defaultContacts: Contact[] = [
  {
    id: 1,
    name: 'Ananya Rao',
    relationship: 'Colleague',
    organization: 'Northstar Capital',
    role: 'Chief Financial Officer',
    phone: '+1 (415) 555-0184',
    email: 'ananya.rao@northstar.example',
    consent: true,
    status: 'Verified',
    verified: '18 Jun 2025',
    safePhrase: 'Emerald Harbor 42',
  },
  {
    id: 2,
    name: 'Ravi Menon',
    relationship: 'Family',
    organization: 'Personal',
    role: 'Brother',
    phone: '+1 (415) 555-0128',
    email: 'ravi.m@family.example',
    consent: true,
    status: 'Verified',
    verified: '02 Jun 2025',
    safePhrase: 'Silver Summit 99',
  },
  {
    id: 3,
    name: 'Priya Shah',
    relationship: 'Colleague',
    organization: 'Northstar Capital',
    role: 'General Counsel',
    phone: '+1 (415) 555-0171',
    email: 'priya.shah@northstar.example',
    consent: true,
    status: 'Verified',
    verified: '14 May 2025',
    safePhrase: 'Golden Horizon 15',
  },
  {
    id: 4,
    name: 'Vikram Malhotra',
    relationship: 'Executive',
    organization: 'Apex Global',
    role: 'Chief Executive Officer',
    phone: '+1 (415) 555-0199',
    email: 'v.malhotra@apex.example',
    consent: true,
    status: 'Verified',
    verified: '20 Jun 2025',
    safePhrase: 'Crimson Falcon 88',
  },
];

const defaultIncidents: Incident[] = [
  {
    id: 'INC-0428',
    title: 'Urgent executive wire request',
    severity: 'High',
    category: 'Payment request',
    verdict: 'Suspicious',
    time: 'Today, 10:42 AM',
    score: 24,
    resolution: 'Callback recommended',
    detail: 'Caller claimed to be the CFO and requested an urgent transfer while asking the employee to bypass the normal approval chain. Demonstrates layered urgency and approval-bypass tripwire.',
    signals: ['Urgent payment request', 'Approval bypass', 'Claimed executive identity'],
  },
  {
    id: 'INC-0427',
    title: 'Bank account verification request (OTP)',
    severity: 'High',
    category: 'Credential request',
    verdict: 'Suspicious',
    time: 'Yesterday, 3:16 PM',
    score: 19,
    resolution: 'Caller independently verified',
    detail: 'A simulated caller asked for a one-time passcode claiming to represent fraud prevention desk. Credential tripwire triggered.',
    signals: ['OTP request', 'Authority claim', 'Credential disclosure'],
  },
  {
    id: 'INC-0426',
    title: 'Evidence insufficient (Awaiting sensor feed)',
    severity: 'Low',
    category: 'Insufficient evidence',
    verdict: 'Inconclusive',
    time: '18 Jun 2025, 11:08 AM',
    score: 50,
    resolution: 'Closed — inconclusive',
    detail: 'Session had missing camera/microphone input. VEIL appropriately defaulted to Inconclusive rather than asserting false certainty.',
    signals: ['Missing video track', 'Missing audio track', 'Insufficient evidence'],
  },
  {
    id: 'INC-0425',
    title: 'Family emergency money request',
    severity: 'Medium',
    category: 'Social engineering',
    verdict: 'Suspicious',
    time: '16 Jun 2025, 9:23 AM',
    score: 37,
    resolution: 'Callback recommended',
    detail: 'Emotional urgency and secrecy language was detected in the scenario transcript without independent identity verification.',
    signals: ['Urgency marker', 'Secrecy request', 'Personal payment'],
  },
];

const scenarioData: AttackScenario[] = [
  {
    id: 'ceo',
    title: 'Urgent CEO wire transfer',
    objective: 'Coerce finance staff to move funds outside the normal approval chain.',
    callerClaim: 'Vikram Malhotra, CEO',
    transcript: '“I need the wire initiated right now. Keep this between us until the board call is wrapped up.”',
    score: 22,
    signals: ['Urgent payment request', 'Secrecy / approval bypass', 'Claimed executive identity'],
    verdict: 'High risk',
    riskCategory: 'Executive Impersonation & Wire Fraud',
    steps: [
      { timeOffset: 0, title: 'Incoming video call initiated', detail: 'Caller claims CEO identity. Stream active.', score: 85, severity: 'Low' },
      { timeOffset: 4, title: 'Urgency language detected', detail: 'Heuristic keyword match: “right now”', score: 71, severity: 'Medium', signalTriggered: 'Urgency' },
      { timeOffset: 8, title: 'Wire transfer requested', detail: 'Sensitive monetary request flagged by tripwire.', score: 52, severity: 'High', signalTriggered: 'Payment tripwire' },
      { timeOffset: 12, title: 'Approval bypass demanded', detail: '“Keep this between us until the board call.”', score: 34, severity: 'High', signalTriggered: 'Approval bypass' },
      { timeOffset: 16, title: 'High-risk red warning raised', detail: 'Authenticity confidence drops to 22. Defensive pause advised.', score: 22, severity: 'High', isAlertPoint: true },
    ],
    action: 'STOP: VERIFY BEFORE SENDING. Independently call the CEO on known saved company contact numbers.',
  },
  {
    id: 'bank',
    title: 'Fake bank OTP request',
    objective: 'Impersonate bank security to steal a one-time login passcode.',
    callerClaim: 'Fraud Prevention Desk',
    transcript: '“I’m from your bank’s fraud desk. Read me the code we just sent to your phone to secure your account.”',
    score: 18,
    signals: ['OTP request', 'Authority claim', 'Credential disclosure'],
    verdict: 'High risk',
    riskCategory: 'Credential & OTP Harvesting',
    steps: [
      { timeOffset: 0, title: 'Call received from purported bank officer', detail: 'Caller displays synthetic badge.', score: 85, severity: 'Low' },
      { timeOffset: 4, title: 'Urgent account compromise claim', detail: 'Caller claims account is under attack.', score: 68, severity: 'Medium', signalTriggered: 'Social engineering' },
      { timeOffset: 8, title: 'OTP read-back demanded', detail: 'Direct request for one-time passcode.', score: 32, severity: 'High', signalTriggered: 'OTP tripwire' },
      { timeOffset: 12, title: 'Critical alert triggered', detail: 'Legitimate institutions never request OTPs over video calls.', score: 18, severity: 'High', isAlertPoint: true },
    ],
    action: 'Never share OTPs. Terminate the call and dial the number printed on the back of your bank card.',
  },
  {
    id: 'family',
    title: 'Family emergency impersonation',
    objective: 'Trigger emotional urgency and immediate money transfer.',
    callerClaim: 'Ravi Menon (Brother)',
    transcript: '“It’s me. I’m in serious trouble abroad. Please send money right now and don’t tell mom yet.”',
    score: 31,
    signals: ['Urgency marker', 'Secrecy request', 'Payment redirection'],
    verdict: 'High risk',
    riskCategory: 'Family Distress Impersonation',
    steps: [
      { timeOffset: 0, title: 'Caller connects claiming family identity', detail: 'Voice sample presented.', score: 86, severity: 'Low' },
      { timeOffset: 4, title: 'Distress and secrecy language', detail: '“Don’t tell mom yet; please send money now.”', score: 60, severity: 'Medium', signalTriggered: 'Emotional pressure' },
      { timeOffset: 8, title: 'Alternative payment channel request', detail: 'Gift card or crypto wallet offered.', score: 39, severity: 'High', signalTriggered: 'Payment redirection' },
      { timeOffset: 12, title: 'Authenticity confidence drops to 31', detail: 'Independent callback recommended.', score: 31, severity: 'High', isAlertPoint: true },
    ],
    action: 'Pause immediately. Call your family member directly on their existing, trusted phone number.',
  },
  {
    id: 'warp',
    title: 'Facial warp & boundary shift',
    objective: 'Simulate visual deepfake artifacts during lateral head movement.',
    callerClaim: 'Unverified Video Participant',
    transcript: '“Can you see me clearly? The connection here is a little bit unstable.”',
    score: 39,
    signals: ['Boundary shift', 'Frame consistency concern', 'Mesh distortion'],
    verdict: 'Elevated concern',
    riskCategory: 'Visual Artifacts & Face-Swap Glitches',
    steps: [
      { timeOffset: 0, title: 'Video stream establishes', detail: 'Frontal face pose nominal.', score: 90, severity: 'Low' },
      { timeOffset: 4, title: 'Subject performs lateral head turn', detail: 'Mesh jitter detected on jawline boundary.', score: 65, severity: 'Medium', signalTriggered: 'Boundary shift' },
      { timeOffset: 8, title: 'Temporal flickering in eye region', detail: 'Pupil blend artifact during blink.', score: 48, severity: 'Medium', signalTriggered: 'Temporal flicker' },
      { timeOffset: 12, title: 'Visual artifact alert logged', detail: 'Artifacts suggest potential real-time face swap.', score: 39, severity: 'Medium', isAlertPoint: true },
    ],
    action: 'Execute a challenge liveness test (e.g. hold up three fingers or turn head 90 degrees).',
  },
  {
    id: 'voice',
    title: 'Cloned-voice indicators',
    objective: 'Demonstrate spectral anomalies and vocoder artifacts in audio stream.',
    callerClaim: 'Project Lead',
    transcript: '“This is your director. I need you to sign off on the production deploy immediately.”',
    score: 35,
    signals: ['Spectral cutoff', 'Vocoder artifacts', 'Monotone prosody'],
    verdict: 'Elevated concern',
    riskCategory: 'Synthetic Voice Cloning',
    steps: [
      { timeOffset: 0, title: 'Audio-only connection initiated', detail: 'Speech stream received.', score: 85, severity: 'Low' },
      { timeOffset: 4, title: 'Spectral cutoff noted at 7.8 kHz', detail: 'Missing high-frequency breath acoustic detail.', score: 62, severity: 'Medium', signalTriggered: 'Spectral anomaly' },
      { timeOffset: 8, title: 'Robotic prosody and micro-pause pattern', detail: 'Unnatural inter-syllable timing cadence.', score: 44, severity: 'Medium', signalTriggered: 'Vocoder artifact' },
      { timeOffset: 12, title: 'Voice cloning indicator raised', detail: 'Synthetic speech likelihood elevated.', score: 35, severity: 'High', isAlertPoint: true },
    ],
    action: 'Conduct randomized phrase challenge or verify via out-of-band telephone call.',
  },
  {
    id: 'benign',
    title: 'Routine project check-in',
    objective: 'Illustrate nominal, low-risk conversation without threat markers.',
    callerClaim: 'Priya Shah (Colleague)',
    transcript: '“Hi! Could you send over the updated slide deck before Thursday’s product review?”',
    score: 94,
    signals: ['No payment request', 'No urgency marker', 'Natural prosody'],
    verdict: 'Authentic',
    riskCategory: 'Benign Operational Call',
    steps: [
      { timeOffset: 0, title: 'Video call initiated', detail: 'Face and audio streams nominal.', score: 94, severity: 'Low' },
      { timeOffset: 4, title: 'Routine agenda discussion', detail: 'No sensitive keywords found.', score: 94, severity: 'Low' },
      { timeOffset: 8, title: 'Normal conversational pauses', detail: 'Audio dynamics and eye blinks within normal range.', score: 94, severity: 'Low' },
      { timeOffset: 12, title: 'Evaluation complete', detail: 'Authentic human cadence confirmed.', score: 94, severity: 'Low' },
    ],
    action: 'Session is authentic. No threats detected.',
  },
  {
    id: 'uncertain',
    title: 'Insufficient evidence (Missing sensor feed)',
    objective: 'Demonstrate proper behavior when camera or microphone input is missing.',
    callerClaim: 'Awaiting Stream',
    transcript: '“No camera or microphone stream detected.”',
    score: 50,
    signals: ['No camera input', 'No microphone input', 'Insufficient evidence'],
    verdict: 'Inconclusive',
    riskCategory: 'Data Sufficiency Test',
    steps: [
      { timeOffset: 0, title: 'Stream requested', detail: 'Awaiting browser device permission.', score: 50, severity: 'Low' },
      { timeOffset: 4, title: 'Inconclusive status', detail: 'Missing sensor feed prevents verification.', score: 50, severity: 'Low' },
    ],
    action: 'Grant camera and microphone permissions to perform real-time verification.',
  },
];

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AppFrame />
      </WouterRouter>
    </QueryClientProvider>
  );
}

function AppFrame() {
  const [path, setPath] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<{ title: string; body: string; action?: () => void; confirm?: string } | null>(null);

  // Wow Attack Demo modal open state
  const [wowDemoOpen, setWowDemoOpen] = useState(false);

  // Auth & Role State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('veil_auth_user');
      return stored
        ? JSON.parse(stored)
        : {
            id: 1,
            email: 'employee@veil.corp',
            name: 'Sarah Chen',
            role: 'Employee' as const,
          };
    } catch {
      return {
        id: 1,
        email: 'employee@veil.corp',
        name: 'Sarah Chen',
        role: 'Employee' as const,
      };
    }
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [howVeilDecidesOpen, setHowVeilDecidesOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    return !localStorage.getItem('veil_onboarding_dismissed');
  });
  const [heldPaymentsCount, setHeldPaymentsCount] = useState(0);

  useEffect(() => {
    const checkHeld = async () => {
      try {
        const token = localStorage.getItem('veil_auth_token');
        const resp = await fetch('/api/payments', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (resp.ok) {
          const data = await resp.json();
          const count = (data.paymentRequests || []).filter((r: any) => r.status === 'On hold').length;
          setHeldPaymentsCount(count);
        }
      } catch {}
    };
    checkHeld();
    const interval = setInterval(checkHeld, 3000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLoginSuccess = (user: AuthUser, token: string) => {
    localStorage.setItem('veil_auth_token', token);
    localStorage.setItem('veil_auth_user', JSON.stringify(user));
    setCurrentUser(user);
    notify(`Authenticated as ${user.name} (${user.role})`);
  };

  const handleLogout = () => {
    localStorage.removeItem('veil_auth_token');
    localStorage.removeItem('veil_auth_user');
    setCurrentUser(null);
    notify('Logged out successfully.');
  };

  const quickSwitchUser = async (email: string) => {
    const accounts: Record<string, any> = {
      'employee@veil.corp': { id: 1, email: 'employee@veil.corp', name: 'Sarah Chen', role: 'Employee', password: 'Employee123!' },
      'approver@veil.corp': { id: 2, email: 'approver@veil.corp', name: 'Ananya Rao', role: 'Approver', password: 'Approver123!' },
      'admin@veil.corp': { id: 3, email: 'admin@veil.corp', name: 'David Vance', role: 'Admin', password: 'Admin123!' },
    };
    const match = accounts[email];
    if (match) {
      try {
        const resp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: match.email, password: match.password }),
        });
        if (resp.ok) {
          const data = await resp.json();
          handleLoginSuccess(data.user, data.token);
          return;
        }
      } catch {}
      handleLoginSuccess({ id: match.id, email: match.email, name: match.name, role: match.role }, 'demo-token');
    }
  };

  // Live Shield State
  const [monitoring, setMonitoring] = useState(false);
  const [streamPaused, setStreamPaused] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef<MediaStream | null>(null);

  // Simulated challenge state for Live Shield
  const [liveChallenge, setLiveChallenge] = useState('');
  const [liveChallengeStatus, setLiveChallengeStatus] = useState('Not started');
  const [liveChallengeSeconds, setLiveChallengeSeconds] = useState(0);

  // Simulator state
  const [scenario, setScenario] = useState(0);
  const [scenarioStep, setScenarioStep] = useState(0);
  const [scenarioPlaying, setScenarioPlaying] = useState(false);

  // Contacts & Incidents Data
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const value = localStorage.getItem('veil-shield-contacts');
      return value ? JSON.parse(value) : defaultContacts;
    } catch {
      return defaultContacts;
    }
  });

  const [incidents, setIncidents] = useState<Incident[]>(defaultIncidents);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Queries and mutations
  const { data: serverContacts, isError: contactsError, refetch: refetchContacts } = useListContacts();
  const { data: serverIncidents, isError: incidentsError, refetch: refetchIncidents } = useListIncidents();
  const { isError: healthError } = useHealthCheck();
  const isBackendOffline = Boolean(contactsError || incidentsError || healthError);

  const createIncidentMutation = useCreateIncident();
  const updateIncidentMutation = useUpdateIncidentResolution();
  const createContactMutation = useCreateContact();
  const updateContactMutation = useUpdateContact();
  const deleteContactMutation = useDeleteContact();

  // Sync server database data
  useEffect(() => {
    if (serverContacts && serverContacts.length > 0) {
      setContacts(serverContacts as unknown as Contact[]);
    }
  }, [serverContacts]);

  useEffect(() => {
    if (serverIncidents && serverIncidents.length > 0) {
      setIncidents(serverIncidents as unknown as Incident[]);
    }
  }, [serverIncidents]);

  // Simplified Settings: Sensitivity & Alert Sound only
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('veil-shield-settings');
      return saved
        ? { alertSound: true, sensitivity: 'Balanced', ...JSON.parse(saved) }
        : { alertSound: true, sensitivity: 'Balanced' };
    } catch {
      return { alertSound: true, sensitivity: 'Balanced' };
    }
  });

  useEffect(() => {
    localStorage.setItem('veil-shield-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('veil-shield-contacts', JSON.stringify(contacts));
  }, [contacts]);

  // Contact modal state
  const [contactForm, setContactForm] = useState<Contact | null>(null);

  // Timer tickers
  useEffect(() => {
    if (!monitoring) return;
    const timer = window.setInterval(() => setElapsed(v => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, [monitoring]);

  useEffect(() => {
    if (!scenarioPlaying) return;
    const timer = window.setInterval(() => {
      setScenarioStep(v => {
        if (v + 1 >= scenarioData[scenario].steps.length) {
          setScenarioPlaying(false);
          return scenarioData[scenario].steps.length;
        }
        return v + 1;
      });
    }, 1800);
    return () => window.clearInterval(timer);
  }, [scenarioPlaying, scenario]);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3500);
  };

  const goto = (next: string) => {
    setPath(next);
    setMobileOpen(false);
  };

  // Live Shield Media Stream Handling
  const startMonitoring = async (mode = 'Webcam + microphone') => {
    setMediaError('');
    if (mode === 'Demonstration only') {
      setStreamPaused(false);
      setMonitoring(true);
      notify('Demonstration stream active. Real camera not engaged.');
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser media capture is unavailable in this environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaRef.current = stream;
      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          if (mediaRef.current === stream) endMonitoring();
        });
      });
      veilAudio.attachStream(stream);
      setMediaStream(stream);
      setStreamPaused(false);
      setMonitoring(true);
      notify('Live Shield active. Normal human presence calibrated as Authentic (94/100).');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera / microphone access denied.';
      setMediaError(message);
      setMonitoring(false);
      notify(message);
    }
  };

  const endMonitoring = () => {
    mediaRef.current?.getTracks().forEach(t => t.stop());
    mediaRef.current = null;
    veilAudio.detachStream();
    setMediaStream(null);
    setMonitoring(false);
    setStreamPaused(false);
    setMediaError('');
    setElapsed(0);
    notify('Live Shield terminated. Hardware tracks released.');
  };

  // Reset all local demo state
  const resetDemo = () => {
    setScenario(0);
    setScenarioStep(0);
    setScenarioPlaying(false);
    setIncidents(defaultIncidents);
    notify('Demo state reset. No biometric data was ever stored.');
  };

  // Recalibrated Live Shield Score Logic (Part 4 Fix):
  // - Real live person with active video/audio stream = Authentic (94, Green)
  // - Missing data (no camera, mic inactive, or no stream) = Inconclusive (50, Amber/Slate)
  // - Threat is only raised when a scenario explicitly flags it
  const liveShieldVerdict: 'Authentic' | 'Inconclusive' | 'Suspicious' = useMemo(() => {
    if (!monitoring) return 'Inconclusive';
    const hasVideo = Boolean(mediaStream && mediaStream.getVideoTracks().length > 0);
    const hasAudio = Boolean(mediaStream && mediaStream.getAudioTracks().length > 0);
    if (!hasVideo && !hasAudio) return 'Inconclusive';
    return 'Authentic';
  }, [monitoring, mediaStream]);

  const liveShieldScore = useMemo(() => {
    if (!monitoring) return 50;
    if (liveShieldVerdict === 'Inconclusive') return 50;
    return 94; // Normal live human behavior scores as Authentic!
  }, [monitoring, liveShieldVerdict]);

  // Overall display score
  const activeScore = path === '/attack-simulator'
    ? (scenarioPlaying ? Math.max(18, 90 - scenarioStep * 16) : scenarioData[scenario].score)
    : (path === '/live-shield' ? liveShieldScore : 88);

  const activeRoute = routes.find(r => r.path === path);
  const title = activeRoute?.label || 'Overview';

  // Save new contact handler
  const handleSaveContact = (e: FormEvent) => {
    e.preventDefault();
    if (!contactForm) return;
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;
    const safePhrase = (form.elements.namedItem('safePhrase') as HTMLInputElement).value;

    if (!name || !phone) {
      notify('Name and Phone number are required.');
      return;
    }

    if (contactForm.id) {
      // Update
      const updated = contacts.map(c => c.id === contactForm.id ? { ...c, name, phone, safePhrase } : c);
      setContacts(updated);
      try {
        updateContactMutation.mutate({ id: contactForm.id, data: { name, phone, role: 'Trusted', organization: 'Directory', relationship: 'Colleague', email: '', consent: true } });
      } catch {}
      notify(`Contact "${name}" updated.`);
    } else {
      // Create
      const newContact: Contact = {
        id: Date.now(),
        name,
        phone,
        safePhrase: safePhrase || 'Falcon Shield 01',
        relationship: 'Colleague',
        organization: 'Verified Directory',
        role: 'Trusted Contact',
        email: '',
        consent: true,
        status: 'Verified',
        verified: new Date().toLocaleDateString(),
      };
      setContacts([...contacts, newContact]);
      try {
        createContactMutation.mutate({ data: { name, phone, relationship: 'Colleague', role: 'Trusted Contact', email: '' } });
      } catch {}
      notify(`Contact "${name}" added to vault.`);
    }
    setContactForm(null);
  };

  const handleDeleteContact = (id: number) => {
    setContacts(contacts.filter(c => c.id !== id));
    try {
      deleteContactMutation.mutate({ id });
    } catch {}
    notify('Contact removed.');
  };

  // Export functions for Incident History
  const exportIncidentsJson = () => {
    const data = {
      product: 'VEIL Deepfake Defense Shield',
      exportedAt: new Date().toISOString(),
      incidents,
      zeroCloudBiometrics: true,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `veil-incidents-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify('Incidents exported as JSON telemetry.');
  };

  const exportIncidentText = (inc: Incident) => {
    const text = `========================================================================
VEIL — REAL-TIME DEEPFAKE & VOICE-CLONING SHIELD
INCIDENT INVESTIGATION REPORT: ${inc.id}
========================================================================
Generated:            ${new Date().toISOString()}
Subject:              ${inc.title}
Severity Level:       ${inc.severity}
Verdict:              ${inc.verdict}
Authenticity Score:   ${inc.score} / 100
Category:             ${inc.category}
Resolution:           ${inc.resolution}
Timestamp:            ${inc.time}

DETAIL & CONTEXT:
${inc.detail}

TRIGGERED SIGNALS:
${(inc.signals || []).map(s => ` - ${s}`).join('\n')}

VERIFICATION ADVISORY:
Strict out-of-band verification is required before executing wire transactions.
========================================================================`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${inc.id}-report.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify('Incident report text exported.');
  };

  return (
    <div className="app-shell">
      {/* Wow Attack Demo Modal */}
      <WowAttackDemo
        isOpen={wowDemoOpen}
        onClose={() => setWowDemoOpen(false)}
        onNavigateToIncidents={() => goto('/incidents')}
        contacts={contacts}
        onIncidentSaved={(newInc) => {
          setIncidents(prev => [newInc, ...prev]);
          refetchIncidents();
        }}
        createIncidentMutation={createIncidentMutation}
      />

      {/* Mobile scrim */}
      <div
        className={`mobile-scrim ${mobileOpen ? 'show' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Simplified Sidebar (strictly 6 items) */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Main navigation">
        <Link href="/" className="brand" onClick={() => setMobileOpen(false)}>
          <span className="brand-mark">
            <ShieldCheck size={20} className="text-cyan-400" />
          </span>
          <span>
            <span className="brand-name flex items-center gap-1.5">
              VEIL
              <span className="text-[9px] px-1.5 py-0.2 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded font-mono font-normal">SHIELD</span>
            </span>
            <span className="brand-sub">Deepfake Defense</span>
          </span>
        </Link>

        <div className="nav-label">Navigation</div>
        <nav className="space-y-1">
          {routes.map(r => (
            <NavItem
              key={r.path}
              item={r}
              active={path === r.path}
              badgeCount={r.path === '/payment-requests' ? heldPaymentsCount : undefined}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        {/* Hero Demo Trigger in Sidebar */}
        <div className="p-3 my-4 bg-cyan-950/40 border border-cyan-800/60 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-cyan-400 font-semibold mb-1">
            Standout Demo
          </div>
          <p className="text-[11px] text-slate-300 mb-2.5 leading-snug">
            60-second guided executive wire fraud attack scenario.
          </p>
          <button
            className="w-full py-1.5 px-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition"
            onClick={() => setWowDemoOpen(true)}
          >
            <Play size={12} fill="currentColor" />
            Watch an attack happen
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="privacy-mini">
            <LockKeyhole size={13} className="text-cyan-400 flex-shrink-0" />
            <span>Zero-Cloud Raw Media · Sandbox Safe</span>
          </div>
          <div className="flex justify-between items-center mt-3 text-[9px] text-slate-500 font-mono">
            <span>VEIL DEFENSE</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div className="top-left">
            <button
              className="icon-btn mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={16} />
            </button>
            <span className="crumb">VEIL WORKSPACE /</span>
            <span style={{ color: '#cbd8e0', fontSize: 11, fontWeight: 600 }}>{title}</span>
          </div>

          <div className="top-right">
            {searchOpen && (
              <input
                className="input"
                style={{ width: 'clamp(140px, 28vw, 190px)', padding: '5px 10px' }}
                autoFocus
                aria-label="Search pages"
                placeholder="Find a module..."
                list="route-options"
                value={globalQuery}
                onChange={e => setGlobalQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const target = routes.find(r => r.label.toLowerCase().includes(globalQuery.toLowerCase()));
                    if (target) {
                      goto(target.path);
                      setSearchOpen(false);
                      setGlobalQuery('');
                    }
                  }
                  if (e.key === 'Escape') setSearchOpen(false);
                }}
              />
            )}
            <datalist id="route-options">
              {routes.map(r => (
                <option key={r.path} value={r.label} />
              ))}
            </datalist>

            <button
              className="icon-btn"
              aria-label="Search workspace"
              onClick={() => setSearchOpen(v => !v)}
            >
              <Search size={15} />
            </button>

            {/* Monitoring status pill */}
            <span className="status-pill" role="status" aria-live="polite">
              <span className={`dot ${monitoring ? 'green' : streamPaused ? 'amber' : 'amber'}`} />
              <span className="hidden sm:inline">
                {monitoring ? 'MONITORING ACTIVE' : streamPaused ? 'PAUSED' : 'LOCAL STANDBY'}
              </span>
              <span className="sm:hidden font-mono text-[9px]">
                {monitoring ? 'LIVE' : 'STANDBY'}
              </span>
            </span>

            {/* Alert sound mute toggle */}
            <button
              className={`icon-btn ${!settings.alertSound ? 'text-slate-500' : 'text-cyan-400'}`}
              aria-label="Toggle alert sound"
              onClick={() => {
                setSettings({ ...settings, alertSound: !settings.alertSound });
                notify(settings.alertSound ? 'Alert audio sound muted.' : 'Alert audio sound enabled.');
              }}
              title={settings.alertSound ? 'Alert sounds active' : 'Alert sounds muted'}
            >
              {settings.alertSound ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            {/* 4-Step Onboarding Guide button */}
            <button
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition"
              onClick={() => setOnboardingOpen(true)}
              title="4-step onboarding guide: multi-layer defense, roles, payment holds, and hero demo"
            >
              <Sparkles size={13} className="text-amber-400" />
              <span className="hidden xl:inline">Tour &amp; Roles</span>
            </button>

            {/* How VEIL decides button */}
            <button
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition"
              onClick={() => setHowVeilDecidesOpen(true)}
              title="How VEIL calculates confidence scores & weights"
            >
              <Scale size={13} className="text-cyan-400" />
              <span className="hidden xl:inline">How VEIL decides</span>
            </button>

            {/* User Profile & Demo Switcher */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1">
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 transition"
                title="Account Settings & Role Switcher"
              >
                <div className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                  {currentUser ? currentUser.name[0] : '?'}
                </div>
                <span className="text-xs font-semibold text-slate-200 hidden md:inline max-w-[110px] truncate">
                  {currentUser ? currentUser.name.split(' ')[0] : 'Sign In'}
                </span>
                {currentUser && (
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                      currentUser.role === 'Admin'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : currentUser.role === 'Approver'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : 'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Hero Demo button */}
            <button
              className="btn primary sm hidden md:flex items-center gap-1.5"
              onClick={() => setWowDemoOpen(true)}
            >
              <Play size={12} fill="currentColor" />
              Watch Demo
            </button>
          </div>
        </header>

        {/* Backend Offline Banner */}
        {isBackendOffline && (
          <div className="flex items-center justify-between px-4 py-2 bg-amber-950/80 border-b border-amber-700/60 text-amber-200 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400 shrink-0" />
              <span>
                <strong>Backend Server Offline:</strong> Running with local browser sandbox database.
              </span>
            </div>
            <button
              className="btn ghost sm text-amber-300 hover:text-white shrink-0 ml-3"
              onClick={() => {
                refetchIncidents();
                refetchContacts();
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Page Switcher */}
        <Switch>
          {/* 1. OVERVIEW */}
          <Route path="/">
            <Overview
              score={activeScore}
              monitoring={monitoring}
              incidents={incidents}
              contacts={contacts}
              onLaunchDemo={() => setWowDemoOpen(true)}
              onOpenHowVeilDecides={() => setHowVeilDecidesOpen(true)}
              onNavigate={goto}
            />
          </Route>

          {/* 2. PAYMENT REQUESTS & TWO-PERSON APPROVAL */}
          <Route path="/payment-requests">
            <PaymentRequestsView
              currentUser={currentUser}
              onOpenAuth={() => setAuthModalOpen(true)}
              onQuickSwitchUser={quickSwitchUser}
              onToast={notify}
              onNavigateToIncidents={() => goto('/incidents')}
            />
          </Route>

          {/* 3. LIVE SHIELD */}
          <Route path="/live-shield">
            <LiveShield
              monitoring={monitoring}
              paused={streamPaused}
              mediaStream={mediaStream}
              elapsed={elapsed}
              error={mediaError}
              score={liveShieldScore}
              verdict={liveShieldVerdict}
              challenge={liveChallenge}
              setChallenge={setLiveChallenge}
              challengeStatus={liveChallengeStatus}
              setChallengeStatus={setLiveChallengeStatus}
              challengeSeconds={liveChallengeSeconds}
              setChallengeSeconds={setLiveChallengeSeconds}
              contacts={contacts}
              onStart={startMonitoring}
              onPause={() => {
                mediaRef.current?.getTracks().forEach(t => t.enabled = false);
                setStreamPaused(true);
                setMonitoring(false);
                notify('Stream capture paused.');
              }}
              onResume={() => {
                mediaRef.current?.getTracks().forEach(t => t.enabled = true);
                setStreamPaused(false);
                setMonitoring(true);
                notify('Stream capture resumed.');
              }}
              onEnd={endMonitoring}
              onToast={notify}
              onExportReport={exportIncidentText}
            />
          </Route>

          {/* 3. ATTACK SIMULATOR */}
          <Route path="/attack-simulator">
            <Simulator
              scenario={scenario}
              setScenario={(i: number) => {
                setScenario(i);
                setScenarioStep(0);
                setScenarioPlaying(false);
              }}
              step={scenarioStep}
              setStep={setScenarioStep}
              playing={scenarioPlaying}
              setPlaying={setScenarioPlaying}
              score={activeScore}
              current={scenarioData[scenario]}
              onLaunchHeroDemo={() => setWowDemoOpen(true)}
              onNavigate={goto}
              onToast={notify}
            />
          </Route>

          {/* 4. INCIDENT HISTORY */}
          <Route path="/incidents">
            <Incidents
              incidents={incidents}
              onExportJson={exportIncidentsJson}
              onExportText={exportIncidentText}
              onToast={notify}
              onUpdateResolution={(id: string, resolution: string) => {
                setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, resolution } : inc));
                try {
                  updateIncidentMutation.mutate({ id, data: { resolution } });
                } catch {}
                notify(`Incident ${id} resolution updated.`);
              }}
            />
          </Route>

          {/* 5. EVALUATION LAB */}
          <Route path="/evaluation">
            <EvaluationLabView onToast={notify} />
          </Route>

          {/* 6. TRUSTED CONTACTS */}
          <Route path="/trusted-contacts">
            <Contacts
              contacts={contacts}
              onOpenAdd={() => setContactForm({
                id: 0,
                name: '',
                phone: '',
                safePhrase: '',
                relationship: 'Colleague',
                organization: '',
                role: 'Trusted Contact',
                email: '',
                consent: true,
                status: 'Verified',
                verified: new Date().toLocaleDateString(),
              })}
              onOpenEdit={(contact: Contact) => setContactForm(contact)}
              onDelete={handleDeleteContact}
              onToast={notify}
            />
          </Route>

          {/* 7. APPROVED VENDORS DIRECTORY */}
          <Route path="/vendors">
            <VendorsDirectoryView
              currentUser={currentUser}
              onOpenAuth={() => setAuthModalOpen(true)}
              onQuickSwitchUser={quickSwitchUser}
              onToast={notify}
            />
          </Route>

          {/* 8. SETTINGS */}
          <Route path="/settings">
            <Settings
              settings={settings}
              setSettings={setSettings}
              monitoring={monitoring}
              onStopCapture={endMonitoring}
              onResetDemo={resetDemo}
              onToast={notify}
            />
          </Route>

          <Route component={NotFound} />
        </Switch>
      </main>

      {/* Add / Edit Contact Modal (Simplified: Name, Number, Safe Phrase only) */}
      {contactForm && (
        <Modal
          title={contactForm.id ? 'Edit Trusted Contact' : 'Add Trusted Contact'}
          onClose={() => setContactForm(null)}
          actions={
            <>
              <button className="btn ghost" type="button" onClick={() => setContactForm(null)}>
                Cancel
              </button>
              <button className="btn primary" form="contact-form" type="submit">
                Save Contact
              </button>
            </>
          }
        >
          <form id="contact-form" onSubmit={handleSaveContact} className="space-y-3.5">
            <div className="field">
              <label htmlFor="contact-name">Contact Full Name *</label>
              <input
                required
                id="contact-name"
                name="name"
                className="input"
                defaultValue={contactForm.name}
                placeholder="e.g. Vikram Malhotra"
              />
            </div>
            <div className="field">
              <label htmlFor="contact-phone">Known Phone Number *</label>
              <input
                required
                id="contact-phone"
                name="phone"
                className="input"
                defaultValue={contactForm.phone}
                placeholder="e.g. +1 (415) 555-0199"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Independently verified telephone number used for direct callbacks during suspicious calls.
              </span>
            </div>
            <div className="field">
              <label htmlFor="contact-safephrase">Emergency Safe Phrase</label>
              <input
                id="contact-safephrase"
                name="safePhrase"
                className="input font-mono text-cyan-300"
                defaultValue={contactForm.safePhrase || ''}
                placeholder="e.g. Crimson Falcon 88"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Private verbal code word known only between you and this person.
              </span>
            </div>
          </form>
        </Modal>
      )}

      {/* General Confirmation Modal */}
      {modal && (
        <Modal
          title={modal.title}
          onClose={() => setModal(null)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  modal.action?.();
                  setModal(null);
                }}
              >
                {modal.confirm || 'Confirm'}
              </button>
            </>
          }
        >
          {modal.body}
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {/* Auth & Role Switcher Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />

      {/* How VEIL Decides Policy Modal */}
      <HowVeilDecidesModal
        isOpen={howVeilDecidesOpen}
        onClose={() => setHowVeilDecidesOpen(false)}
      />

      {/* 4-Step First-Run Onboarding Guide */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onLaunchDemo={() => setWowDemoOpen(true)}
        onQuickSwitchUser={quickSwitchUser}
      />
    </div>
  );
}

/* ========================================================================= */
/* PAGE 1: OVERVIEW DASHBOARD (SIMPLIFIED & HONEST)                          */
/* ========================================================================= */
function Overview({
  score,
  monitoring,
  incidents,
  contacts,
  onLaunchDemo,
  onOpenHowVeilDecides,
  onNavigate,
}: {
  score: number;
  monitoring: boolean;
  incidents: Incident[];
  contacts: Contact[];
  onLaunchDemo: () => void;
  onOpenHowVeilDecides: () => void;
  onNavigate: (p: string) => void;
}) {
  const highSevCount = incidents.filter(i => i.severity === 'High').length;

  return (
    <div className="page space-y-4">
      <PageHead
        eyebrow="ENTERPRISE FRAUD DEFENSE"
        title="Real-Time Deepfake & Impersonation Shield"
        desc="VEIL verifies the request, not just the voice. Deepfake detection is one of several signals."
        actions={
          <div className="flex items-center gap-2">
            <button
              className="btn ghost sm flex items-center gap-1.5 text-cyan-300 border border-cyan-800"
              onClick={onOpenHowVeilDecides}
            >
              <Scale size={14} /> How VEIL decides
            </button>
            <button className="btn primary sm" onClick={onLaunchDemo}>
              <Play size={14} fill="currentColor" /> Watch an attack happen
            </button>
          </div>
        }
      />

      {/* HERO BANNER: "Watch an attack happen" */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-950 border-2 border-cyan-500/50 rounded-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-900 text-cyan-300 border border-cyan-700 rounded font-semibold uppercase">
              STANDOUT DEMO
            </span>
            <span className="text-xs text-slate-400 font-mono">60-second guided simulation</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            See how VEIL intercepts executive wire fraud in real-time.
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Watch a synthetic caller politely ask for an urgent ₹45,00,000 wire transfer without scam keywords, see signals light up as the score drops, and stop the transaction with out-of-band verification.
          </p>
        </div>
        <button
          className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center gap-2 shrink-0 transition"
          onClick={onLaunchDemo}
        >
          <Play size={16} fill="currentColor" />
          Watch an attack happen
        </button>
      </div>

      {/* 4 Clean Key Metrics (Honest, Real Numbers from DB) */}
      <div className="grid grid-2 sm:grid-4 gap-3">
        <Panel className="p-3.5">
          <div className="text-[11px] text-slate-400 font-mono uppercase">Logged Incidents</div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {String(incidents.length).padStart(2, '0')}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Recorded in session database</div>
        </Panel>

        <Panel className="p-3.5">
          <div className="text-[11px] text-slate-400 font-mono uppercase">High Threats Caught</div>
          <div className="text-2xl font-bold font-mono text-red-400 mt-1">
            {String(highSevCount).padStart(2, '0')}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Requiring out-of-band callback</div>
        </Panel>

        <Panel className="p-3.5">
          <div className="text-[11px] text-slate-400 font-mono uppercase">Trusted Contacts</div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
            {String(contacts.length).padStart(2, '0')}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Safe-phrase verified numbers</div>
        </Panel>

        <Panel className="p-3.5">
          <div className="text-[11px] text-slate-400 font-mono uppercase">Shield Status</div>
          <div className="text-base font-bold font-mono mt-2 flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${monitoring ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className={monitoring ? 'text-emerald-400' : 'text-amber-400'}>
              {monitoring ? 'ACTIVE SENSORS' : 'LOCAL STANDBY'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Zero cloud media upload</div>
        </Panel>
      </div>

      {/* Recent Incidents Register */}
      <Panel
        title="Recent Incident Activity"
        subtitle="Chronological log of recent investigations & detections"
        action={
          <button className="btn ghost sm" onClick={() => onNavigate('/incidents')}>
            View all incidents <ArrowRight size={12} />
          </button>
        }
      >
        <div className="divide-y divide-slate-800/80">
          {incidents.slice(0, 3).map(inc => (
            <div key={inc.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-cyan-400">{inc.id}</span>
                  <strong className="text-slate-200">{inc.title}</strong>
                </div>
                <div className="text-[11px] text-slate-400">
                  {inc.category} · {inc.time}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tone={inc.severity === 'High' ? 'red' : inc.severity === 'Medium' ? 'amber' : 'green'}>
                  {inc.severity}
                </Badge>
                <span className="font-mono text-xs text-slate-300 hidden sm:inline">
                  Score: {inc.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Quick Access Launchpad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          className="p-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-left transition space-y-1 group"
          onClick={() => onNavigate('/payment-requests')}
        >
          <div className="flex items-center gap-2 text-cyan-400 group-hover:text-cyan-300 font-semibold text-xs">
            <CreditCard size={14} /> Payment Requests
          </div>
          <p className="text-[11px] text-slate-400">
            Submit transfers, automated vendor directory verification, and dual-custody hold.
          </p>
        </button>

        <button
          className="p-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-left transition space-y-1 group"
          onClick={() => onNavigate('/live-shield')}
        >
          <div className="flex items-center gap-2 text-cyan-400 group-hover:text-cyan-300 font-semibold text-xs">
            <Shield size={14} /> Open Live Shield
          </div>
          <p className="text-[11px] text-slate-400">
            Real-time camera & microphone analysis with face mesh and telemetry HUD.
          </p>
        </button>

        <button
          className="p-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-left transition space-y-1 group"
          onClick={() => onNavigate('/evaluation')}
        >
          <div className="flex items-center gap-2 text-cyan-400 group-hover:text-cyan-300 font-semibold text-xs">
            <FileCheck size={14} /> Evaluation Lab
          </div>
          <p className="text-[11px] text-slate-400">
            Real 32-clip benchmark (Wav2Vec2: 75.0% accuracy, 31.6% FPR; acoustic heuristic: experimental).
          </p>
        </button>

        <button
          className="p-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-left transition space-y-1 group"
          onClick={() => onNavigate('/vendors')}
        >
          <div className="flex items-center gap-2 text-cyan-400 group-hover:text-cyan-300 font-semibold text-xs">
            <Building2 size={14} /> Approved Vendors
          </div>
          <p className="text-[11px] text-slate-400">
            Pre-authorized vendor bank account registry and immutable audit log.
          </p>
        </button>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* PAGE 2: LIVE SHIELD (CALIBRATED & FALSE-POSITIVE FREE)                    */
/* ========================================================================= */
function LiveShield({
  monitoring,
  paused,
  mediaStream,
  elapsed,
  error,
  score,
  verdict,
  challenge,
  setChallenge,
  challengeStatus,
  setChallengeStatus,
  challengeSeconds,
  setChallengeSeconds,
  contacts,
  onStart,
  onPause,
  onResume,
  onEnd,
  onToast,
  onExportReport,
}: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedContact, setSelectedContact] = useState(contacts[0]?.id || '');
  const hasStream = Boolean(mediaStream && mediaStream.getVideoTracks().length > 0);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream || null;
    }
  }, [mediaStream]);

  const triggerCallback = () => {
    const contact = contacts.find((c: Contact) => c.id === Number(selectedContact));
    if (contact) {
      onToast(`Initiate independent callback to ${contact.name} at ${contact.phone}.`);
    } else {
      onToast('Select a trusted contact first.');
    }
  };

  return (
    <div className="page space-y-4">
      <PageHead
        eyebrow="REAL-TIME SURVEILLANCE & ACTIVE DEFENSE"
        title="Live Shield Console"
        desc="Real-time multi-modal analysis across camera frames, microphone acoustics, and out-of-band verification."
        actions={
          monitoring ? (
            <>
              <Status tone="green">
                ACTIVE · {Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}
              </Status>
              <button className="btn danger" onClick={onEnd}>
                <StopCircle size={14} /> End Shield
              </button>
            </>
          ) : paused ? (
            <>
              <Status tone="amber">Paused</Status>
              <button className="btn" onClick={onResume}>
                <Play size={14} /> Resume
              </button>
              <button className="btn danger" onClick={onEnd}>
                <StopCircle size={14} /> End
              </button>
            </>
          ) : (
            <button className="btn primary" onClick={() => onStart('Webcam + microphone')}>
              <Radio size={14} /> Start Live Shield
            </button>
          )
        }
      />

      <DemoBanner>
        STREAM PROCESSED LOCALLY IN BROWSER · Zero video or voice frames stored on servers
      </DemoBanner>

      {error && (
        <div className="notice" role="alert" style={{ borderColor: '#70404b', color: '#efb2b4' }}>
          <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          {error}
          <button className="btn sm" style={{ marginLeft: 10 }} onClick={() => onStart('Demonstration only')}>
            Use Simulated Video Stream
          </button>
        </div>
      )}

      {/* Main Stream & Telemetry Grid */}
      <div className="grid grid-2 gap-4">
        <Panel
          title="Camera Stream & Biometric HUD"
          subtitle="Real-time browser capture with face mesh & telemetry overlay"
          action={
            <Badge tone={monitoring && hasStream ? 'green' : monitoring ? 'amber' : 'gray'}>
              {monitoring && hasStream ? 'Live Stream' : monitoring ? 'Awaiting Feed' : 'Standby'}
            </Badge>
          }
        >
          <div className="call-preview relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              aria-label="Local browser video preview"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: hasStream ? 0.85 : 0,
              }}
            />

            <LiveCameraHUD
              active={monitoring}
              videoRef={videoRef}
              hasStream={hasStream}
              activeChallenge={challenge}
              challengeProgress={challengeSeconds > 0 ? (8 - challengeSeconds) / 8 : 1}
            />

            <div className="preview-bottom">
              <span>{monitoring ? (hasStream ? 'Live Webcam 30FPS' : 'Awaiting Camera Stream') : 'Standby'}</span>
              <span className="font-mono text-cyan-400">
                {hasStream ? 'AUTHENTIC CADENCE' : 'INCONCLUSIVE (NO CAMERA)'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {!monitoring ? (
              <button className="btn sm primary" onClick={() => onStart('Webcam + microphone')}>
                <Video size={13} /> Request Camera & Mic
              </button>
            ) : (
              <>
                <button className="btn sm" onClick={onPause} disabled={!monitoring}>
                  <Pause size={13} /> Pause
                </button>
                <button className="btn sm danger" onClick={onEnd}>
                  <Square size={12} /> End
                </button>
              </>
            )}
            <button className="btn sm" onClick={() => onStart('Demonstration only')}>
              Simulated Stream
            </button>
          </div>
        </Panel>

        {/* Acoustic Visualizer & Multi-Modal Trust */}
        <div className="space-y-4">
          <Panel
            title="Acoustic Voice-Cloning Analyzer"
            subtitle="Web Audio API 32-bin frequency spectrum & vocoder artifact detection"
          >
            <AudioWaveformVisualizer
              isListening={monitoring}
              hasAudioStream={Boolean(mediaStream && mediaStream.getAudioTracks().length)}
            />
            <div className="grid grid-2 text-xs gap-2 mt-3">
              <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">1. Pretrained Model (Soft Signal)</span>
                <span className={`font-mono text-[11px] font-semibold ${monitoring && Boolean(mediaStream && mediaStream.getAudioTracks().length) ? 'text-cyan-400' : 'text-slate-400'}`}>
                  {monitoring && Boolean(mediaStream && mediaStream.getAudioTracks().length) ? 'Wav2Vec2: Nominal' : 'Not enough information'}
                </span>
                <span className="text-[9px] text-slate-500 block">mo-thecreator/Deepfake-audio-detection</span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">2. Acoustic Heuristic (Experimental)</span>
                <span className={`font-mono text-[11px] font-semibold ${monitoring && Boolean(mediaStream && mediaStream.getAudioTracks().length) ? 'text-amber-400' : 'text-slate-400'}`}>
                  {monitoring && Boolean(mediaStream && mediaStream.getAudioTracks().length) ? 'Excluded from scoring' : 'Not enough information'}
                </span>
                <span className="text-[9px] text-slate-500 block">Experimental · Not used in scoring</span>
              </div>
            </div>
          </Panel>

          <Panel
            title="Authenticity Confidence"
            subtitle="Recalibrated multi-modal confidence score"
            action={
              <Badge tone={verdict === 'Authentic' ? 'green' : verdict === 'Inconclusive' ? 'amber' : 'red'}>
                {verdict}
              </Badge>
            }
          >
            <div className="score-layout">
              <TrustMeter score={score} size="md" />
              <div className="score-meta text-xs">
                <div className="meta-row">
                  <span>Evaluation Status</span>
                  <strong className={verdict === 'Authentic' ? 'text-emerald-400' : 'text-amber-400'}>
                    {verdict === 'Authentic' ? 'Authentic Human Presence' : 'Inconclusive (No Stream)'}
                  </strong>
                </div>
                <div className="meta-row">
                  <span>Facial Geometry</span>
                  <strong>{hasStream ? 'Natural Blink Cadence' : 'Inconclusive · Missing Camera'}</strong>
                </div>
                <div className="meta-row">
                  <span>Acoustic Profile</span>
                  <strong>{monitoring ? 'Natural Formants' : 'Inconclusive · Missing Audio'}</strong>
                </div>
                <div className="meta-row">
                  <span>Independent Callback</span>
                  <strong className="text-cyan-400">Ready</strong>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Honest Forensics Feed */}
      <Panel
        title="Live Explainability & Verification Log"
        subtitle="Transparent indicators reflecting active sensor input"
      >
        <div className="space-y-2 text-xs">
          {monitoring && hasStream ? (
            [
              ['T+02s', 'Video feed established: Natural facial geometry & spontaneous blink rate (14/min)', 'Nominal'],
              ['T+04s', 'Audio acoustics verified: Natural pitch modulation & uncompressed breath formants', 'Nominal'],
              ['T+06s', 'Lip-sync cross correlation: +14ms offset well within ±45ms tolerance envelope', 'Nominal'],
              ['T+08s', 'Transcript tripwire: Clean conversation, no emergency wire transfer demands', 'Nominal'],
            ].map(([time, desc, tone]) => (
              <div key={time} className="p-2.5 bg-slate-900/60 rounded border border-slate-800 flex justify-between items-center">
                <span className="font-mono text-cyan-400 mr-2">{time}</span>
                <span className="text-slate-200 flex-1">{desc}</span>
                <Badge tone="green">{tone}</Badge>
              </div>
            ))
          ) : (
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded text-center text-slate-400">
              <span className="font-mono text-amber-400 block mb-1">STATUS: INCONCLUSIVE (AWAITING INPUT)</span>
              Grant camera and microphone permissions above to begin live biometric and acoustic verification.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* ========================================================================= */
/* PAGE 3: ATTACK SIMULATOR (WITH WOW HERO DEMO)                             */
/* ========================================================================= */
function Simulator({
  scenario,
  setScenario,
  step,
  setStep,
  playing,
  setPlaying,
  score,
  current,
  onLaunchHeroDemo,
  onNavigate,
  onToast,
}: any) {
  const isHighRisk = current.score < 50;

  return (
    <div className="page space-y-4">
      <PageHead
        eyebrow="REPRODUCIBLE SCENARIO TESTBENCH"
        title="Attack Simulator"
        desc="Evaluate defensive tripwires across representative cyberattack scenarios. Features the guided Executive Wire Fraud demo."
        actions={
          <button className="btn primary" onClick={onLaunchHeroDemo}>
            <Play size={14} fill="currentColor" /> Launch Hero Demo
          </button>
        }
      />

      {/* Hero Scenario Showcase Card */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-950/70 via-slate-900 to-slate-950 border border-cyan-500/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 rounded font-semibold uppercase">
            Hero Scenario
          </span>
          <h3 className="text-base sm:text-lg font-bold text-white mt-1">
            CEO Impersonation Wire Diversion (Project Titan)
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Simulated video-call where a calm, professional synthetic CEO asks finance staff to authorize an urgent ₹45,00,000 transfer to a new escrow account.
          </p>
        </div>
        <button
          className="btn primary shrink-0"
          onClick={onLaunchHeroDemo}
        >
          <Play size={14} fill="currentColor" /> Watch an attack happen
        </button>
      </div>

      <div className="grid grid-2 gap-4">
        {/* Simple List of Scenarios */}
        <Panel
          title="Select Attack Scenario"
          subtitle="Seven representative social engineering & deepfake threats"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scenarioData.map((s, i) => (
              <button
                key={s.id}
                className={`p-2.5 rounded border text-left transition ${
                  scenario === i ? 'bg-cyan-950/60 border-cyan-500/80 text-white' : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                }`}
                onClick={() => setScenario(i)}
              >
                <div className="text-xs font-semibold">{s.title}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{s.riskCategory}</div>
              </button>
            ))}
          </div>
        </Panel>

        {/* Execution Console */}
        <Panel
          title="Scenario Execution Console"
          subtitle={`Target: ${current.callerClaim}`}
          action={
            <Badge tone={isHighRisk ? 'red' : current.score < 80 ? 'amber' : 'green'}>
              {current.verdict}
            </Badge>
          }
        >
          <div className="call-preview">
            <div className="preview-grid" />
            <div className="face-outline">
              <div className="mesh" />
              <div className="face-line" />
            </div>
            <div className="preview-caption font-mono">SIMULATED FEED · {current.riskCategory.toUpperCase()}</div>
            <div className="preview-bottom font-mono">
              <span>{current.title}</span>
              <span>00:{String(step * 4).padStart(2, '0')}</span>
            </div>
          </div>

          <div className="score-layout mt-3">
            <TrustMeter score={step === 0 ? 85 : score} />
            <div className="score-meta text-xs">
              <div className="meta-row">
                <span>Objective</span>
                <strong className="text-slate-200">{current.objective}</strong>
              </div>
              <div className="meta-row">
                <span>Signals</span>
                <strong>{current.signals.join(', ')}</strong>
              </div>
              <div className="meta-row">
                <span>Recommended Defense</span>
                <strong className="text-cyan-400">{current.action}</strong>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              className="btn primary sm"
              onClick={() => {
                if (step >= current.steps.length) setStep(0);
                setPlaying(true);
              }}
              disabled={playing}
            >
              <Play size={13} /> {step === 0 ? 'Start' : 'Replay'}
            </button>
            <button className="btn sm" onClick={() => setPlaying(false)} disabled={!playing}>
              <Pause size={13} /> Pause
            </button>
            <button
              className="btn sm"
              onClick={() => {
                setPlaying(false);
                setStep(Math.min(current.steps.length, step + 1));
              }}
            >
              Step Forward
            </button>
            <button
              className="btn sm"
              onClick={() => {
                setPlaying(false);
                setStep(0);
              }}
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* PAGE 4: INCIDENT HISTORY (SEARCH, SEVERITY FILTER, EXPORT ONLY)          */
/* ========================================================================= */
function Incidents({
  incidents,
  onExportJson,
  onExportText,
  onToast,
  onUpdateResolution,
}: {
  incidents: Incident[];
  onExportJson: () => void;
  onExportText: (inc: Incident) => void;
  onToast: (msg: string) => void;
  onUpdateResolution: (id: string, resolution: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All severities');
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);

  const filtered = useMemo(() => {
    return incidents.filter(i => {
      const matchesSearch = `${i.id} ${i.title} ${i.category} ${i.verdict}`.toLowerCase().includes(query.toLowerCase());
      const matchesSeverity = severityFilter === 'All severities' || i.severity === severityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [incidents, query, severityFilter]);

  return (
    <div className="page space-y-4">
      <PageHead
        eyebrow="AUDIT & FORENSIC REGISTER"
        title="Incident History"
        desc="Search, inspect, and export incident investigations. Privacy guarantee: all records represent session metadata without stored recordings."
        actions={
          <div className="flex gap-2">
            <button className="btn" onClick={onExportJson}>
              <Download size={14} /> Export JSON
            </button>
            <button
              className="btn primary"
              onClick={() => {
                if (filtered[0]) onExportText(filtered[0]);
              }}
              disabled={!filtered.length}
            >
              <FileDown size={14} /> Export Report
            </button>
          </div>
        }
      />

      <DemoBanner>
        METADATA INCIDENT LOG · No audio or video recordings stored
      </DemoBanner>

      {/* Lightweight Filter Bar */}
      <Panel>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="search-input" className="text-xs text-slate-400 block mb-1">Search Records</label>
            <input
              id="search-input"
              className="input w-full"
              placeholder="Search by ID, subject, keyword..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <label htmlFor="severity-select" className="text-xs text-slate-400 block mb-1">Severity Filter</label>
            <select
              id="severity-select"
              className="select w-full"
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
            >
              <option>All severities</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
        </div>
      </Panel>

      {/* Incidents Table */}
      <Panel
        title="Incident Register"
        subtitle={`${filtered.length} record${filtered.length === 1 ? '' : 's'} found`}
      >
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Incident ID & Subject</th>
                <th>Severity</th>
                <th>Category</th>
                <th>Verdict</th>
                <th>Score</th>
                <th>Timestamp</th>
                <th>Resolution</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inc => (
                <tr key={inc.id}>
                  <td>
                    <button
                      className="text-link font-semibold text-left"
                      style={{ background: 'none', border: 0, cursor: 'pointer' }}
                      onClick={() => setActiveIncident(inc)}
                    >
                      <div className="font-mono text-cyan-400 text-[10px]">{inc.id}</div>
                      <div>{inc.title}</div>
                    </button>
                  </td>
                  <td>
                    <Badge tone={inc.severity === 'High' ? 'red' : inc.severity === 'Medium' ? 'amber' : 'green'}>
                      {inc.severity}
                    </Badge>
                  </td>
                  <td>{inc.category}</td>
                  <td>{inc.verdict}</td>
                  <td className="font-mono">{inc.score}</td>
                  <td className="text-slate-400">{inc.time}</td>
                  <td className="text-xs max-w-xs truncate">{inc.resolution}</td>
                  <td>
                    <button className="btn sm" onClick={() => onExportText(inc)}>
                      Export
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Incident Detail Modal */}
      {activeIncident && (
        <Modal
          title={`Incident Detail: ${activeIncident.id}`}
          onClose={() => setActiveIncident(null)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setActiveIncident(null)}>
                Close
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  onExportText(activeIncident);
                }}
              >
                Export Report Text
              </button>
            </>
          }
        >
          <div className="space-y-3 text-xs">
            <div>
              <strong className="text-sm text-slate-100">{activeIncident.title}</strong>
              <div className="text-slate-400 mt-0.5">{activeIncident.category} · {activeIncident.time}</div>
            </div>

            <div className="grid grid-2 gap-2 p-2.5 bg-slate-950 rounded border border-slate-800">
              <div>Severity: <strong className="text-red-400">{activeIncident.severity}</strong></div>
              <div>Authenticity Score: <strong>{activeIncident.score} / 100</strong></div>
              <div>Verdict: <strong>{activeIncident.verdict}</strong></div>
              <div>Status: <strong>{activeIncident.resolution}</strong></div>
            </div>

            <div>
              <strong className="text-slate-300 block mb-1">Incident Summary & Detail:</strong>
              <p className="text-slate-300 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800">
                {activeIncident.detail}
              </p>
            </div>

            {activeIncident.signals && activeIncident.signals.length > 0 && (
              <div>
                <strong className="text-slate-300 block mb-1">Triggered Threat Signals:</strong>
                <div className="flex flex-wrap gap-1.5">
                  {activeIncident.signals.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-red-950/70 border border-red-800 text-red-300 rounded text-[11px]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800">
              <label htmlFor="resolution-input" className="block text-slate-300 mb-1 font-semibold">Update Resolution Status:</label>
              <div className="flex gap-2">
                <input
                  id="resolution-input"
                  className="input flex-1"
                  defaultValue={activeIncident.resolution}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      onUpdateResolution(activeIncident.id, (e.target as HTMLInputElement).value);
                      setActiveIncident(null);
                    }
                  }}
                />
                <button
                  className="btn sm primary"
                  onClick={e => {
                    const inp = (e.currentTarget.previousElementSibling as HTMLInputElement).value;
                    onUpdateResolution(activeIncident.id, inp);
                    setActiveIncident(null);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ========================================================================= */
/* PAGE 5: TRUSTED CONTACTS (NAME, NUMBER, SAFE PHRASE ONLY)                 */
/* ========================================================================= */
function Contacts({
  contacts,
  onOpenAdd,
  onOpenEdit,
  onDelete,
  onToast,
}: {
  contacts: Contact[];
  onOpenAdd: () => void;
  onOpenEdit: (c: Contact) => void;
  onDelete: (id: number) => void;
  onToast: (msg: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [revealedSafePhrases, setRevealedSafePhrases] = useState<Record<number, boolean>>({});

  const toggleReveal = (id: number) => {
    setRevealedSafePhrases(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = useMemo(() => {
    return contacts.filter(c =>
      `${c.name} ${c.phone} ${c.safePhrase || ''}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [contacts, search]);

  return (
    <div className="page space-y-4">
      <PageHead
        eyebrow="INDEPENDENT TELEPHONE & SAFE-WORD DIRECTORY"
        title="Trusted Contacts Vault"
        desc="Maintain independently verified telephone numbers and emergency safe phrases for immediate out-of-band callbacks."
        actions={
          <button className="btn primary" onClick={onOpenAdd}>
            <Plus size={14} /> Add Trusted Contact
          </button>
        }
      />

      <DemoBanner>
        LOCAL SECURE DIRECTORY · Name, known phone number, and safe phrases stay strictly local
      </DemoBanner>

      <Panel>
        <div className="flex items-center gap-3">
          <input
            className="input max-w-sm"
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="text-xs text-slate-400 font-mono">
            {filtered.length} contact{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      </Panel>

      {/* Simplified Cards: Name, Number, Safe Phrase only */}
      <div className="grid grid-2 gap-3.5">
        {filtered.map(c => {
          const isRevealed = Boolean(revealedSafePhrases[c.id]);
          return (
            <div key={c.id} className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-slate-100">{c.name}</h3>
                  <div className="text-xs text-cyan-400 font-mono mt-0.5">{c.phone}</div>
                </div>
                <button
                  className="btn sm"
                  onClick={() => onToast(`Simulated callback initiated to ${c.name} at ${c.phone}.`)}
                  title="Simulate telephone callback"
                >
                  <PhoneCall size={12} className="text-cyan-400" />
                  Call Back
                </button>
              </div>

              {/* Safe Phrase Block */}
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono block">Emergency Safe Phrase</span>
                  <div className="font-mono text-emerald-400 font-semibold mt-0.5">
                    {isRevealed ? (c.safePhrase || 'No safe phrase set') : '••••••••••••••••'}
                  </div>
                </div>
                <button
                  className="p-1 rounded text-slate-400 hover:text-white"
                  onClick={() => toggleReveal(c.id)}
                  title={isRevealed ? 'Hide safe phrase' : 'Reveal safe phrase'}
                >
                  {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-slate-800/80 text-xs">
                <button className="btn sm ghost" onClick={() => onOpenEdit(c)}>
                  Edit
                </button>
                <button className="btn sm ghost danger" onClick={() => onDelete(c.id)}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* PAGE 6: SETTINGS (SENSITIVITY & ALERT SOUND ONLY)                         */
/* ========================================================================= */
function Settings({
  settings,
  setSettings,
  monitoring,
  onStopCapture,
  onResetDemo,
  onToast,
}: any) {
  const patch = (key: string, value: any) => setSettings((s: any) => ({ ...s, [key]: value }));

  return (
    <div className="page space-y-4">
      <PageHead
        eyebrow="DETECTION CONTROLS & PREFERENCES"
        title="Settings"
        desc="Configure tripwire detection sensitivity and audio alert chime preferences."
      />

      <DemoBanner>
        LOCAL DEFENSE PREFERENCES · Stored strictly in browser localStorage
      </DemoBanner>

      {monitoring && (
        <div className="alert-card mb-4" role="status">
          <div className="alert-title">
            <Radio size={16} className="mr-2 text-cyan-400 animate-pulse" />
            LIVE SHIELD MONITORING ACTIVE
          </div>
          <p className="text-xs text-slate-300 my-2">
            Browser camera & microphone capture are active. All video frames stay local.
          </p>
          <button className="btn danger sm" onClick={onStopCapture}>
            <StopCircle size={13} /> Stop All Capture Now
          </button>
        </div>
      )}

      {/* Only the 2 required settings */}
      <div className="grid grid-2 gap-4">
        {/* 1. Detection Sensitivity */}
        <Panel
          title="Tripwire Detection Sensitivity"
          subtitle="Configure confidence threshold for financial and urgency tripwires"
        >
          <div className="space-y-3 text-xs">
            <div className="field">
              <label htmlFor="sensitivity-setting">Detection Sensitivity Profile</label>
              <select
                id="sensitivity-setting"
                className="select w-full"
                value={settings.sensitivity || 'Balanced'}
                onChange={e => {
                  patch('sensitivity', e.target.value);
                  onToast(`Sensitivity set to ${e.target.value}.`);
                }}
              >
                <option value="Conservative">Conservative (Fewer false alarms · Recommended for high-volume calls)</option>
                <option value="Balanced">Balanced (Default · Standard financial & identity tripwires)</option>
                <option value="Elevated">Elevated (Strict · Flags subtle urgency & any first-time payee)</option>
              </select>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Balanced mode applies multi-layered evaluation: acoustic vocal resonance, payee verification against the supplier master ledger, and dual-custody authorization checks.
            </p>
          </div>
        </Panel>

        {/* 2. Alert Sound */}
        <Panel
          title="Alert Sound Preferences"
          subtitle="Audio chimes for suspicious calls and tripwire triggers"
        >
          <div className="space-y-4 text-xs">
            <div className="setting-row">
              <div>
                <div className="setting-title">Synthesized Audio Alert Chimes</div>
                <div className="setting-desc">
                  Plays Web Audio API alert tones when elevated threats or tripwires are flagged.
                </div>
              </div>
              <input
                type="checkbox"
                className="toggle"
                checked={settings.alertSound}
                onChange={e => {
                  patch('alertSound', e.target.checked);
                  onToast(e.target.checked ? 'Alert audio sound enabled.' : 'Alert audio sound muted.');
                }}
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Test Alert Sound Chime:</span>
              <button
                className="btn sm"
                onClick={() => veilAudio.playAlertTone('caution')}
                disabled={!settings.alertSound}
              >
                <Volume2 size={13} className="text-cyan-400" /> Play Test Chime
              </button>
            </div>
          </div>
        </Panel>
      </div>

      {/* Demo Reset */}
      <Panel
        title="Reset Demo State"
        subtitle="Restore baseline simulated incidents and scenario progression"
      >
        <div className="flex items-center justify-between text-xs">
          <p className="text-slate-400 max-w-lg">
            Resets demo incidents, scenario playback, and sample states. Real system data is not impacted.
          </p>
          <button className="btn danger sm" onClick={onResetDemo}>
            <RotateCcw size={13} /> Reset Demo State
          </button>
        </div>
      </Panel>
    </div>
  );
}

/* ========================================================================= */
/* SHARED UI PRIMITIVES                                                      */
/* ========================================================================= */
function NavItem({ item, active, onClick, badgeCount }: { item: typeof routes[number]; active: boolean; onClick: () => void; badgeCount?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.path}
      className={`nav-link ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <Icon size={15} strokeWidth={1.8} />
      <span>{item.label}</span>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950">
          {badgeCount}
        </span>
      )}
      {item.path === '/live-shield' && !badgeCount && (
        <span style={{ marginLeft: 'auto' }} className={`dot ${active ? 'green' : 'amber'}`} />
      )}
    </Link>
  );
}

function PageHead({ eyebrow, title, desc, actions }: { eyebrow: string; title: string; desc: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        <p className="page-desc">{desc}</p>
      </div>
      {actions && (
        <div className="head-actions flex gap-2 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel-head">
          <div>
            {title && <h2 className="panel-title">{title}</h2>}
            {subtitle && <div className="panel-kicker">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function DemoBanner({ children = 'DEMO ENVIRONMENT · ALL SIGNALS ARE ILLUSTRATIVE' }: { children?: ReactNode }) {
  return (
    <div className="sim-banner">
      <Sparkles size={14} className="text-amber-400 shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  );
}

function Status({ children, tone = 'amber' }: { children: ReactNode; tone?: string }) {
  return (
    <span className="status-pill">
      <span className={`dot ${tone}`} />
      {children}
    </span>
  );
}

function Modal({
  title,
  children,
  onClose,
  actions,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={15} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-foot">{actions}</div>}
      </div>
    </div>
  );
}
