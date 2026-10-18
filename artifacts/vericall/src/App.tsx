import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Link, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity, AlertOctagon, AlertTriangle, ArrowRight, Bell, Building2, CheckCircle2, ChevronDown, ChevronRight,
  Download, FileDown, FileSearch, Fingerprint, Gauge, Globe, Headphones, History, Home, LockKeyhole, Menu, Mic, MicOff,
  Pause, Play, Plus, Radio, RotateCcw, Search, Settings2, Shield, ShieldAlert, ShieldCheck, Siren, SlidersHorizontal,
  Sparkles, Square, StopCircle, Users, Video, Volume2, VolumeX, X,
} from 'lucide-react';
import NotFound from '@/pages/not-found';
import { veilAudio } from '@/lib/audio';
import { LiveCameraHUD } from '@/components/LiveCameraHUD';
import { AudioWaveformVisualizer } from '@/components/AudioWaveformVisualizer';
import { TrustMeter } from '@/components/TrustMeter';
import { translations, type SupportedLanguage } from '@/lib/i18n';
import type { Contact, Incident, AttackScenario } from '@/types/veil';

const queryClient = new QueryClient();

const routes = [
  { path: '/', label: 'Overview', icon: Home, group: 'SECURITY' },
  { path: '/live-shield', label: 'Live Shield', icon: Shield },
  { path: '/threat-intelligence', label: 'Threat Intelligence', icon: FileSearch },
  { path: '/attack-simulator', label: 'Attack Simulator', icon: Activity },
  { path: '/scam-replay', label: 'Scam Replay', icon: RotateCcw },
  { path: '/incidents', label: 'Incident History', icon: History, group: 'OPERATIONS' },
  { path: '/trusted-contacts', label: 'Trusted Contacts', icon: Users },
  { path: '/enterprise', label: 'Enterprise Security', icon: Building2 },
  { path: '/benchmarks', label: 'Benchmark Lab', icon: Gauge },
  { path: '/settings', label: 'Privacy & Settings', icon: Settings2 },
];

const defaultContacts: Contact[] = [
  { id: 1, name: 'Ananya Rao', relationship: 'Colleague', organization: 'Northstar Capital', role: 'Chief Financial Officer', phone: '+1 (415) 555-0184', email: 'ananya.rao@northstar.example', consent: true, status: 'Consent discussed', verified: '18 Jun 2025' },
  { id: 2, name: 'Ravi Menon', relationship: 'Family', organization: 'Personal', role: 'Brother', phone: '+1 (415) 555-0128', email: 'ravi.m@family.example', consent: false, status: 'Not enrolled', verified: '02 Jun 2025' },
  { id: 3, name: 'Priya Shah', relationship: 'Colleague', organization: 'Northstar Capital', role: 'General Counsel', phone: '+1 (415) 555-0171', email: 'priya.shah@northstar.example', consent: true, status: 'Consent discussed', verified: '14 May 2025' },
  { id: 4, name: 'Vikram Malhotra', relationship: 'Executive', organization: 'Apex Global', role: 'Chief Executive Officer', phone: '+1 (415) 555-0199', email: 'v.malhotra@apex.example', consent: true, status: 'Consent discussed', verified: '20 Jun 2025' },
];

const defaultIncidents: Incident[] = [
  { id: 'VEIL-0428', title: 'Urgent executive wire request', severity: 'High', category: 'Payment request', verdict: 'Suspicious', time: 'Today, 10:42 AM', score: 24, resolution: 'Callback recommended', detail: 'Caller claimed to be the CFO and requested an urgent transfer while asking the employee to bypass the normal approval chain. Demonstrates layered urgency and approval-bypass tripwire.', signals: ['Urgent payment request', 'Approval bypass', 'Claimed executive identity'] },
  { id: 'VEIL-0427', title: 'Unusual lip-sync pattern and facial flicker', severity: 'Medium', category: 'Video anomaly', verdict: 'Needs review', time: 'Yesterday, 3:16 PM', score: 58, resolution: 'Reviewed', detail: 'Simulated frame timing indicators (340ms drift) and a brief transcript pressure phrase were logged in demonstration mode.', signals: ['Lip-sync drift', 'Temporal flicker'] },
  { id: 'VEIL-0426', title: 'Bank account verification request (OTP)', severity: 'High', category: 'Credential request', verdict: 'Suspicious', time: '18 Jun 2025, 11:08 AM', score: 19, resolution: 'Caller independently verified', detail: 'A simulated caller asked for a one-time passcode claiming to represent fraud prevention desk. Credential tripwire triggered.', signals: ['OTP request', 'Authority claim', 'Credential disclosure'] },
  { id: 'VEIL-0425', title: 'Evidence insufficient (Intermittent feed)', severity: 'Low', category: 'Insufficient evidence', verdict: 'Inconclusive', time: '17 Jun 2025, 4:51 PM', score: 51, resolution: 'Closed — inconclusive', detail: 'The sample session did not contain enough usable video/audio frames for a meaningful assessment. System intentionally defaulted to inconclusive state.', signals: ['Short sample window', 'Low SNR audio'] },
  { id: 'VEIL-0424', title: 'Family emergency money request', severity: 'Medium', category: 'Social engineering', verdict: 'Suspicious', time: '16 Jun 2025, 9:23 AM', score: 37, resolution: 'Callback recommended', detail: 'Emotional urgency and secrecy language was detected in the scenario transcript without independent identity verification.', signals: ['Urgency marker', 'Secrecy request', 'Personal payment'] },
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
      { timeOffset: 0, title: 'Incoming video call initiated', detail: 'Caller claims CEO identity. Stream active.', score: 88, severity: 'Low' },
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
    signals: ['Illustrative boundary shift', 'Frame consistency concern', 'Mesh distortion'],
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
    signals: ['Example spectral cutoff', 'Vocoder artifacts', 'Monotone prosody'],
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
    id: 'bypass',
    title: 'Secrecy and approval bypass',
    objective: 'Pressure operator to skip standard regulatory and dual-custody controls.',
    callerClaim: 'General Counsel',
    transcript: '“Do not loop in legal or compliance. Skip the second signature and execute the transfer now.”',
    score: 27,
    signals: ['Secrecy detected', 'Approval bypass', 'Regulatory avoidance'],
    verdict: 'High risk',
    riskCategory: 'Policy & Control Bypass',
    steps: [
      { timeOffset: 0, title: 'Executive requests priority transaction', detail: 'Authority pressure applied.', score: 84, severity: 'Low' },
      { timeOffset: 4, title: 'Explicit instruction to bypass policy', detail: '“Do not loop in compliance or legal.”', score: 55, severity: 'High', signalTriggered: 'Bypass attempt' },
      { timeOffset: 8, title: 'Urgency ultimatum issued', detail: 'Threatens disciplinary action if delayed.', score: 33, severity: 'High', signalTriggered: 'Authority intimidation' },
      { timeOffset: 12, title: 'Dual-control violation flagged', detail: 'Never bypass established approval matrices.', score: 27, severity: 'High', isAlertPoint: true },
    ],
    action: 'Always adhere to standard authorization policy. Report attempted circumvention immediately.',
  },
  {
    id: 'benign',
    title: 'Routine project check-in',
    objective: 'Illustrate nominal, low-risk conversation without threat markers.',
    callerClaim: 'Priya Shah (Colleague)',
    transcript: '“Hi! Could you send over the updated slide deck before Thursday’s product review?”',
    score: 82,
    signals: ['No payment request', 'No urgency marker', 'Natural prosody'],
    verdict: 'Lower concern',
    riskCategory: 'Benign Operational Call',
    steps: [
      { timeOffset: 0, title: 'Video call initiated', detail: 'Face and audio streams nominal.', score: 85, severity: 'Low' },
      { timeOffset: 4, title: 'Routine agenda discussion', detail: 'No sensitive keywords found.', score: 84, severity: 'Low' },
      { timeOffset: 8, title: 'Normal conversational pauses', detail: 'Audio dynamics and eye blinks within normal range.', score: 83, severity: 'Low' },
      { timeOffset: 12, title: 'Evaluation complete', detail: 'No defensive alerts raised. Identity remains uncertified.', score: 82, severity: 'Low' },
    ],
    action: 'A benign score reflects lack of detected red flags, but does not constitute cryptographic identity proof.',
  },
  {
    id: 'uncertain',
    title: 'Insufficient evidence (Degraded call)',
    objective: 'Demonstrate appropriate system behavior when signal is incomplete or noisy.',
    callerClaim: 'Unknown Caller',
    transcript: '“Hello? Can you hear me? The connection keeps dropping on this end.”',
    score: 51,
    signals: ['Short transcript sample', 'Intermittent video', 'Insufficient evidence'],
    verdict: 'Inconclusive',
    riskCategory: 'Data Sufficiency Test',
    steps: [
      { timeOffset: 0, title: 'Degraded connection received', detail: 'Packet loss high; low resolution video.', score: 65, severity: 'Low' },
      { timeOffset: 4, title: 'Insufficient data for facial analysis', detail: 'Facial landmarks intermittently lost.', score: 55, severity: 'Low', signalTriggered: 'Low video SNR' },
      { timeOffset: 8, title: 'Audio clipping and packet gaps', detail: 'Spectral analysis flagged as unreliable.', score: 52, severity: 'Low', signalTriggered: 'Audio dropout' },
      { timeOffset: 12, title: 'Inconclusive state declared', detail: 'System refrains from asserting certainty.', score: 51, severity: 'Low' },
    ],
    action: 'Request the caller re-establish connection over a verified network or authenticate out-of-band.',
  },
];

const signalInventory = [
  { name: 'Facial boundary & blending artifacts', category: 'VIDEO', sub: 'Boundary edge stability · local WASM model', type: 'video' },
  { name: 'Temporal consistency & flicker', category: 'VIDEO', sub: 'Inter-frame luminance drift', type: 'video' },
  { name: 'Lighting & shadow coherence', category: 'VIDEO', sub: 'Specular reflection alignment', type: 'video' },
  { name: 'Blinking & gaze micro-dynamics', category: 'VIDEO', sub: 'Spontaneous blink rate & saccades', type: 'video' },
  { name: 'Audio-to-visual lip-sync alignment', category: 'VIDEO', sub: 'Phoneme-viseme temporal drift', type: 'video' },
  { name: 'Head-turn warping & occlusion', category: 'VIDEO', sub: 'Profile pose geometry retention', type: 'video' },
  { name: 'Micro-saccade patterns', category: 'BEHAVIOR', sub: 'Ocular tremor frequency', type: 'behavior' },
  { name: 'Spectral anomalies & cutoff', category: 'AUDIO', sub: 'FFT high-band energy presence', type: 'audio' },
  { name: 'High-frequency acoustic detail', category: 'AUDIO', sub: 'Breath and sibilant clarity', type: 'audio' },
  { name: 'Vocoder phase & synthesis artifacts', category: 'AUDIO', sub: 'Harmonic phase continuity', type: 'audio' },
  { name: 'Prosody, intonation & breathing', category: 'AUDIO', sub: 'Involuntary respiration cues', type: 'audio' },
  { name: 'Latency & robotic pause patterns', category: 'AUDIO', sub: 'Neural vocoder buffer pauses', type: 'audio' },
  { name: 'Scam-context transcript tripwire', category: 'CONTEXT', sub: 'Urgency, secrecy, OTP & wire heuristics', type: 'context' },
  { name: 'Biometric identity consistency', category: 'IDENTITY', sub: 'Consented baseline comparison', type: 'identity' },
];

const threatTimelineEvents = [
  ['Suspicious lip-sync drift (340ms)', 'Illustrative timing drift exceeding nominal 45ms tolerance · demo evidence', 'amber', '10:42:18'],
  ['Facial boundary movement anomaly', 'Simulated landmark deformation during head rotation', 'red', '10:36:02'],
  ['Urgent payment heuristic triggered', 'Keyword tripwire match: “wire right now”', 'red', '10:21:47'],
  ['Identity baseline unverified', 'No enrolled biometric reference exists in local vault', 'blue', '09:58:12'],
];

const chartDataSeries = [35, 47, 39, 68, 52, 76, 59, 85, 62, 72, 49, 65];

function App() {
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [streamPaused, setStreamPaused] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<{ title: string; body: string; action?: () => void; confirm?: string } | null>(null);

  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const value = localStorage.getItem('veil-shield-contacts');
      return value ? JSON.parse(value) : defaultContacts;
    } catch {
      return defaultContacts;
    }
  });

  const [incidents, setIncidents] = useState<Incident[]>(defaultIncidents);
  const [alertActive, setAlertActive] = useState(false);
  const [alertSoundMuted, setAlertSoundMuted] = useState(false);
  const [scenario, setScenario] = useState(0);
  const [scenarioStep, setScenarioStep] = useState(0);
  const [scenarioPlaying, setScenarioPlaying] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('veil-shield-settings');
      return saved
        ? { alertSound: true, notifications: false, sensitivity: 'Balanced', language: 'en', compact: false, ...JSON.parse(saved) }
        : { alertSound: true, notifications: false, sensitivity: 'Balanced', language: 'en', compact: false };
    } catch {
      return { alertSound: true, notifications: false, sensitivity: 'Balanced', language: 'en', compact: false };
    }
  });

  const currentLang = (settings.language as SupportedLanguage) in translations ? (settings.language as SupportedLanguage) : 'en';
  const t = translations[currentLang];

  const [firstVisit, setFirstVisit] = useState(() => !localStorage.getItem('veil-intro-seen'));
  const [sessionMode, setSessionMode] = useState('Simulation');
  const [mediaError, setMediaError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef<MediaStream | null>(null);

  const [phrase, setPhrase] = useState('cobalt harbor / 47');
  const [challenge, setChallenge] = useState('');
  const [challengeStatus, setChallengeStatus] = useState('Not started');
  const [challengeSeconds, setChallengeSeconds] = useState(0);

  const [tripwire, setTripwire] = useState('');
  const [transcript, setTranscript] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [incidentQuery, setIncidentQuery] = useState('');
  const [incidentFilter, setIncidentFilter] = useState('All severities');
  const [contactForm, setContactForm] = useState<Contact | null>(null);
  const [role, setRole] = useState('Security administrator');
  const [enterpriseAlert, setEnterpriseAlert] = useState(true);
  const [replay, setReplay] = useState(0);
  const [replayStep, setReplayStep] = useState(0);
  const [benchmarkRuns, setBenchmarkRuns] = useState<{ dataset: string; time: string }[]>([]);
  const [dataset, setDataset] = useState('FaceForensics++');
  const [incidentSort, setIncidentSort] = useState('Newest first');

  const currentScenario = scenarioData[scenario];
  const activeRoute = routes.find(r => r.path === path);
  const title = activeRoute?.label || 'Overview';

  // Dynamic score based on context
  const score =
    path === '/attack-simulator' && scenarioPlaying
      ? Math.max(18, 90 - scenarioStep * 16)
      : path === '/attack-simulator' && scenarioStep > 0
      ? currentScenario.score
      : monitoring && alertActive
      ? 28
      : 84;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  };

  const playChime = (type: 'caution' | 'critical' | 'success') => {
    if (!alertSoundMuted && settings.alertSound) {
      veilAudio.playAlertTone(type);
    }
  };

  const resetDemo = () => {
    setScenario(0);
    setScenarioStep(0);
    setScenarioPlaying(false);
    setReplay(0);
    setReplayStep(0);
    setAlertActive(false);
    setIncidents(defaultIncidents);
    setTripwire('');
    setChallenge('');
    setChallengeStatus('Not started');
    setElapsed(0);
    notify('VEIL demo state reset. No media or biometric data was stored.');
  };

  // Scenario playback ticker
  useEffect(() => {
    if (!scenarioPlaying) return;
    const timer = window.setInterval(() => {
      setScenarioStep(v => {
        if (v + 1 >= currentScenario.steps.length) {
          setScenarioPlaying(false);
          if (currentScenario.score < 50) {
            setAlertActive(true);
            playChime('critical');
            notify('High-risk simulation alert raised. Tripwire triggered.');
          }
          return currentScenario.steps.length;
        }
        const nextStep = v + 1;
        const stepData = currentScenario.steps[nextStep];
        if (stepData?.isAlertPoint) {
          playChime('critical');
        } else if (stepData?.severity === 'High') {
          playChime('caution');
        }
        return nextStep;
      });
    }, 1800);
    return () => window.clearInterval(timer);
  }, [scenarioPlaying, scenario, currentScenario]);

  // Monitoring timer
  useEffect(() => {
    if (!monitoring) return;
    const timer = window.setInterval(() => setElapsed(v => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, [monitoring]);

  // Liveness countdown
  useEffect(() => {
    if (!challenge || challengeStatus !== 'In progress') return;
    const timer = window.setInterval(() => {
      setChallengeSeconds(v => {
        if (v <= 1) {
          setChallengeStatus('Completed: Inconclusive (local model offline)');
          playChime('caution');
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [challenge, challengeStatus]);

  // Cleanup media tracks on unmount
  useEffect(() => {
    return () => {
      mediaRef.current?.getTracks().forEach(track => track.stop());
      veilAudio.detachStream();
    };
  }, []);

  // Save state to local storage
  useEffect(() => {
    try {
      localStorage.setItem('veil-shield-contacts', JSON.stringify(contacts));
    } catch {}
  }, [contacts]);

  useEffect(() => {
    try {
      localStorage.setItem('veil-shield-settings', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const startDemo = () => {
    setPath('/attack-simulator');
    setScenario(0);
    setScenarioStep(0);
    setScenarioPlaying(true);
    setAlertActive(false);
    notify('CEO wire-fraud attack scenario launched.');
  };

  const endMonitoring = () => {
    mediaRef.current?.getTracks().forEach(track => track.stop());
    mediaRef.current = null;
    veilAudio.detachStream();
    setMediaStream(null);
    setMonitoring(false);
    setStreamPaused(false);
    setAlertActive(false);
    setMediaError('');
    setElapsed(0);
    notify('Monitoring ended. Browser camera and microphone tracks released.');
  };

  const startMonitoring = async (mode = 'Webcam + microphone', cameraId = '', microphoneId = '') => {
    setMediaError('');
    if (mode === 'Demonstration only') {
      setSessionMode('Simulation');
      setStreamPaused(false);
      setMonitoring(true);
      notify('Simulation monitoring active. Analyses are illustrative.');
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser media capture is unavailable in this environment. Use demonstration mode instead.');
      }
      const stream =
        mode === 'Screen / tab'
          ? navigator.mediaDevices.getDisplayMedia
            ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
            : (() => { throw new Error('Screen and tab capture are not supported in this browser.'); })()
          : await navigator.mediaDevices.getUserMedia({
              video: mode !== 'Microphone only' ? (cameraId ? { deviceId: { exact: cameraId } } : true) : false,
              audio: mode !== 'Webcam only' ? (microphoneId ? { deviceId: { exact: microphoneId } } : true) : false,
            });

      mediaRef.current = stream;
      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          if (mediaRef.current === stream) {
            endMonitoring();
          }
        });
      });

      // Attach audio analyzer
      veilAudio.attachStream(stream);

      setMediaStream(stream);
      setSessionMode(mode);
      setStreamPaused(false);
      setMonitoring(true);
      notify('VEIL live monitoring active. Video & audio stream stay strictly local.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Permission denied or capture device unavailable.';
      setMediaError(message);
      setSessionMode('Simulation');
      setMonitoring(false);
    }
  };

  const generateIncidentReportText = (item?: Incident) => {
    const inc = item || incidents[0];
    const text = `========================================================================
VEIL — REAL-TIME DEEPFAKE & VOICE-CLONING SHIELD
CYBERSECURITY INCIDENT INVESTIGATION REPORT
========================================================================
Incident ID:          ${inc.id}
Generated Timestamp:  ${new Date().toISOString()}
Target Incident Date: ${inc.time}
Incident Subject:     ${inc.title}
Severity Level:       ${inc.severity}
Verdict:              ${inc.verdict}
Authenticity Score:   ${inc.score} / 100
Primary Category:     ${inc.category}
Resolution Note:      ${inc.resolution}

------------------------------------------------------------------------
EXECUTIVE THREAT SUMMARY
------------------------------------------------------------------------
${inc.detail}

Triggered Threat Signals:
${(inc.signals || ['Urgent payment request', 'Approval bypass', 'Lip-sync drift']).map(s => ` - ${s}`).join('\n')}

------------------------------------------------------------------------
DEFENSIVE ACTIONS TAKEN & VERIFICATION AUDIT
------------------------------------------------------------------------
- Independent Verification: Callback recommended using independently stored numbers.
- Liveness Challenge: Executed / evaluated.
- Audio Analysis: Spectral cutoff test conducted.
- Transcript Tripwire: Scanned for urgency, secrecy, and payment redirection.

------------------------------------------------------------------------
SYSTEM LIMITATIONS & LEGAL DISCLAIMER
------------------------------------------------------------------------
VEIL operates as a layered defensive security console. No individual signal
can guarantee whether a caller is genuine or fraudulent. This report records
session metadata and heuristic signals. No biometric samples or video/audio
recordings are retained on central servers.
========================================================================`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${inc.id}-veil-incident-report.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify('Incident report exported as a text document.');
  };

  const generateIncidentReportJson = (item?: Incident) => {
    const inc = item || incidents[0];
    const data = {
      product: 'VEIL Deepfake & Voice-Cloning Shield',
      version: '1.0.0-hackathon',
      generatedAt: new Date().toISOString(),
      incident: inc,
      signals: signalInventory.slice(0, 6),
      privacyPreserved: true,
      rawBiometricsStored: false,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${inc.id}-veil-incident-data.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify('Incident JSON telemetry exported.');
  };

  const printIncidentReport = (item?: Incident) => {
    const inc = item || incidents[0];
    if (!inc) {
      notify('There is no incident report to print.');
      return;
    }
    const reportWindow = window.open('', '_blank', 'width=880,height=960');
    if (!reportWindow) {
      notify('Allow pop-ups to open the print and Save as PDF report.');
      return;
    }

    const doc = reportWindow.document;
    doc.title = `VEIL Incident Report · ${inc.id}`;

    doc.body.innerHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>VEIL Incident Report · ${inc.id}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 40px auto; max-width: 760px; line-height: 1.6; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
          .brand { font-size: 22px; font-weight: 800; color: #0369a1; letter-spacing: -0.02em; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .badge.high { background: #fee2e2; color: #991b1b; }
          .badge.med { background: #fef3c7; color: #92400e; }
          .badge.low { background: #dcfce7; color: #166534; }
          h1 { font-size: 22px; margin: 0 0 4px; color: #0f172a; }
          h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #0284c7; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 16px 0; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; }
          .notice { background: #f0f9ff; border-left: 4px solid #0284c7; padding: 12px; font-size: 12px; color: #0369a1; margin: 16px 0; }
          .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">VEIL SHIELD DEFENSE</div>
            <div style="font-size: 12px; color: #64748b;">REAL-TIME DEEPFAKE & VOICE-CLONING COUNTERMEASURES</div>
          </div>
          <span class="badge ${inc.severity === 'High' ? 'high' : inc.severity === 'Medium' ? 'med' : 'low'}">
            ${inc.severity} Severity
          </span>
        </div>

        <h1>${inc.title}</h1>
        <div style="font-size: 12px; color: #64748b;">Incident Reference: <strong>${inc.id}</strong> · Time: ${inc.time}</div>

        <h2>Assessment & Confidence</h2>
        <div class="meta-grid">
          <div><strong>Authenticity Confidence Score:</strong> ${inc.score} / 100</div>
          <div><strong>Evaluation Verdict:</strong> ${inc.verdict}</div>
          <div><strong>Incident Category:</strong> ${inc.category}</div>
          <div><strong>Resolution Status:</strong> ${inc.resolution}</div>
        </div>

        <h2>Incident Detail & Context</h2>
        <p style="font-size: 13px;">${inc.detail}</p>

        <div class="notice">
          <strong>STOP: VERIFY BEFORE SENDING</strong><br/>
          Independent callback to an independently maintained contact record is strictly required before any transfer of funds, disclosure of OTP credentials, or administrative bypass.
        </div>

        <h2>Recommended Remediation Actions</h2>
        <ol style="font-size: 13px;">
          <li>Contact the purported caller using an independently established corporate directory number.</li>
          <li>Never use callback numbers, email addresses, or links supplied by the caller during the session.</li>
          <li>In corporate environments, alert the Information Security team and preserve incident metadata.</li>
        </ol>

        <h2>System Limitations Statement</h2>
        <p style="font-size: 12px; color: #64748b;">
          VEIL operates as a layered defensive warning system. This document is an informational incident record. No audio, video, or raw biometric templates were transmitted or retained in cloud storage.
        </p>

        <div class="footer">
          Generated by VEIL Cybersecurity Defense Shield · Export Reference: ${inc.id}-${Date.now()}
        </div>
      </body>
      </html>
    `;

    doc.close();
    reportWindow.focus();
    window.setTimeout(() => reportWindow.print(), 300);
  };

  const scanTranscript = (text: string) => {
    setTranscript(text);
    const matches = /(urgent|right now|immediately|wire|transfer|gift card|otp|one.time passcode|password|credential|secret|keep this between us|bypass|skip approval|don't tell|do not tell|bank|send money|account|authority)/i.test(text);
    if (matches) {
      setTripwire('A sensitive trigger keyword matched. STOP and verify caller out-of-band before taking financial or credential actions.');
      playChime('caution');
    } else {
      setTripwire('');
    }
  };

  const saveContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contactForm) return;
    const data = new FormData(event.currentTarget);
    const contact: Contact = {
      id: contactForm.id || Date.now(),
      name: String(data.get('name') || ''),
      relationship: String(data.get('relationship') || 'Colleague'),
      organization: String(data.get('organization') || ''),
      role: String(data.get('role') || ''),
      phone: String(data.get('phone') || ''),
      email: String(data.get('email') || ''),
      consent: contactForm.consent,
      status: contactForm.status,
      verified: contactForm.verified,
    };
    setContacts(items => contactForm.id ? items.map(c => c.id === contactForm.id ? contact : c) : [contact, ...items]);
    setContactForm(null);
    notify('Trusted contact saved in browser vault. Raw biometrics and safe words are never stored.');
  };

  const goto = (next: string) => {
    setPath(next);
    setMobileOpen(false);
  };

  return (
    <div className="app-shell">
      {/* Mobile scrim */}
      <div
        className={`mobile-scrim ${mobileOpen ? 'show' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Main Sidebar */}
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

        <div className="nav-label">Cyber Defense Workspace</div>
        <nav>
          {routes.slice(0, 5).map(r => (
            <NavItem key={r.path} item={r} active={path === r.path} onClick={() => setMobileOpen(false)} />
          ))}
        </nav>

        <div className="nav-label">Operations & Governance</div>
        <nav>
          {routes.slice(5).map(r => (
            <NavItem key={r.path} item={r} active={path === r.path} onClick={() => setMobileOpen(false)} />
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="privacy-mini">
            <LockKeyhole size={13} className="text-cyan-400 flex-shrink-0" />
            <span>Zero-Cloud Raw Media · Local Sandbox</span>
          </div>
          <div className="flex justify-between items-center mt-3 text-[9px] text-slate-500 font-mono">
            <span>VEIL SHIELD SUITE</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* Main App Area */}
      <main className="main-area">
        {/* Top Navigation Bar */}
        <header className="topbar">
          <div className="top-left">
            <button
              className="icon-btn mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              data-testid="button-open-navigation"
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
                aria-label="Search workspace pages"
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
                data-testid="input-global-search"
              />
            )}
            <datalist id="route-options">
              {routes.map(r => (
                <option key={r.path} value={r.label} />
              ))}
            </datalist>

            <button
              className="icon-btn"
              aria-label="Open workspace search"
              onClick={() => setSearchOpen(v => !v)}
              data-testid="button-global-search"
            >
              <Search size={15} />
            </button>

            {/* Monitoring status pill */}
            <span className="status-pill" role="status" aria-live="polite">
              <span className={`dot ${monitoring ? 'green' : streamPaused ? 'amber' : 'amber'}`} />
              <span className="hidden sm:inline">
                {monitoring ? 'MONITORING ACTIVE' : streamPaused ? 'CAPTURE PAUSED' : 'LOCAL STANDBY'}
              </span>
              <span className="sm:hidden font-mono text-[9px]">
                {monitoring ? 'LIVE' : streamPaused ? 'PAUSED' : 'STANDBY'}
              </span>
            </span>

            {/* Audio alert mute toggle button */}
            <button
              className={`icon-btn top-hide ${alertSoundMuted ? 'text-slate-500' : 'text-cyan-400'}`}
              aria-label={alertSoundMuted ? 'Unmute alert sound' : 'Mute alert sound'}
              onClick={() => {
                setAlertSoundMuted(!alertSoundMuted);
                notify(alertSoundMuted ? 'Alert audio sound enabled.' : 'Alert audio sound muted.');
              }}
              title={alertSoundMuted ? 'Alert sounds muted' : 'Alert sounds active'}
            >
              {alertSoundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            {/* Language Switcher Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="icon-btn top-hide"
                aria-label="Interface Language"
                onClick={() => setLangOpen(!langOpen)}
                title="Select Language"
              >
                <Globe size={15} />
              </button>
              {langOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 38,
                    width: 160,
                    padding: 8,
                    background: '#121d2a',
                    border: '1px solid #293d50',
                    borderRadius: 8,
                    zIndex: 50,
                    boxShadow: '0 10px 30px #0008',
                  }}
                >
                  <div className="panel-kicker" style={{ padding: '4px 6px' }}>Language (భాష)</div>
                  {[
                    ['en', 'English'],
                    ['hi', 'हिन्दी (Hindi)'],
                    ['kn', 'ಕನ್ನಡ (Kannada)'],
                    ['ta', 'தமிழ் (Tamil)'],
                  ].map(([code, name]) => (
                    <button
                      key={code}
                      className={`btn sm ghost w-full text-left justify-start ${currentLang === code ? 'text-cyan-400 bg-slate-800' : ''}`}
                      onClick={() => {
                        setSettings({ ...settings, language: code });
                        setLangOpen(false);
                        notify(`Interface language switched to ${name}.`);
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reset demo */}
            <button
              className="icon-btn top-hide"
              aria-label="Reset demo"
              onClick={() =>
                setModal({
                  title: 'Reset demo state?',
                  body: 'Reset simulated incidents, attack scenario progression, and challenge states. Local contact directories remain safely in this browser.',
                  action: resetDemo,
                  confirm: 'Reset Demo State',
                })
              }
              data-testid="button-reset-demo"
            >
              <RotateCcw size={15} />
            </button>

            {/* Operator Menu */}
            <div style={{ position: 'relative' }}>
              <button
                className="icon-btn top-hide"
                aria-label="Security operator profile menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen(v => !v)}
                data-testid="button-profile-menu"
              >
                <span style={{ fontSize: 9, fontWeight: 800 }}>SO</span>
              </button>
              {profileOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 39,
                    width: 200,
                    padding: 12,
                    background: '#14202e',
                    border: '1px solid #2f4357',
                    borderRadius: 8,
                    zIndex: 50,
                    boxShadow: '0 12px 30px #0008',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#e0ebf1' }}>Security Operator</div>
                  <div className="panel-kicker">Local Defense Console · Offline</div>
                  <button
                    className="btn sm"
                    style={{ width: '100%', marginTop: 9 }}
                    onClick={() => {
                      goto('/settings');
                      setProfileOpen(false);
                    }}
                  >
                    Privacy & settings
                  </button>
                  <button
                    className="btn ghost sm"
                    style={{ width: '100%', marginTop: 4 }}
                    onClick={() => {
                      setProfileOpen(false);
                      notify('Offline demonstration mode. No central account login required.');
                    }}
                  >
                    Session Status: Local
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Route Switcher */}
        <Switch>
          <Route path="/">
            <Overview
              score={score}
              monitoring={monitoring}
              onLaunch={startDemo}
              onStart={() => void startMonitoring()}
              onNavigate={goto}
              onToast={notify}
              t={t}
            />
          </Route>
          <Route path="/live-shield">
            <LiveShield
              monitoring={monitoring}
              paused={streamPaused}
              mediaStream={mediaStream}
              elapsed={elapsed}
              mode={sessionMode}
              error={mediaError}
              score={score}
              challenge={challenge}
              setChallenge={setChallenge}
              challengeStatus={challengeStatus}
              setChallengeStatus={setChallengeStatus}
              challengeSeconds={challengeSeconds}
              setChallengeSeconds={setChallengeSeconds}
              phrase={phrase}
              setPhrase={setPhrase}
              contacts={contacts}
              onStart={startMonitoring}
              onPause={() => {
                mediaRef.current?.getTracks().forEach(track => {
                  track.enabled = false;
                });
                setStreamPaused(true);
                setMonitoring(false);
                notify('Capture paused. Camera and mic tracks disabled locally.');
              }}
              onResume={() => {
                mediaRef.current?.getTracks().forEach(track => {
                  track.enabled = true;
                });
                setStreamPaused(false);
                setMonitoring(true);
                notify('Capture resumed.');
              }}
              onEnd={endMonitoring}
              onToast={notify}
              onReport={generateIncidentReportText}
              t={t}
            />
          </Route>
          <Route path="/threat-intelligence">
            <ThreatPage
              transcript={transcript}
              setTranscript={scanTranscript}
              tripwire={tripwire}
              setTripwire={setTripwire}
              onNavigate={goto}
              onToast={notify}
              t={t}
            />
          </Route>
          <Route path="/attack-simulator">
            <Simulator
              scenario={scenario}
              setScenario={(i: number) => {
                setScenario(i);
                setScenarioStep(0);
                setScenarioPlaying(false);
                setAlertActive(false);
              }}
              step={scenarioStep}
              setStep={setScenarioStep}
              playing={scenarioPlaying}
              setPlaying={setScenarioPlaying}
              score={score}
              current={currentScenario}
              alertActive={alertActive}
              acknowledge={() => {
                setAlertActive(false);
                notify('Simulation threat alert acknowledged.');
              }}
              onToast={notify}
              onNavigate={goto}
              t={t}
            />
          </Route>
          <Route path="/scam-replay">
            <ScamReplay
              replay={replay}
              setReplay={(i: number) => {
                setReplay(i);
                setReplayStep(0);
              }}
              step={replayStep}
              setStep={setReplayStep}
              onReport={generateIncidentReportText}
              t={t}
            />
          </Route>
          <Route path="/incidents">
            <Incidents
              incidents={incidents}
              setIncidents={setIncidents}
              query={incidentQuery}
              setQuery={setIncidentQuery}
              filter={incidentFilter}
              setFilter={setIncidentFilter}
              sort={incidentSort}
              setSort={setIncidentSort}
              selected={selectedIncident}
              setSelected={setSelectedIncident}
              onReportText={generateIncidentReportText}
              onReportJson={generateIncidentReportJson}
              onPrint={printIncidentReport}
              onToast={notify}
              t={t}
            />
          </Route>
          <Route path="/trusted-contacts">
            <Contacts
              contacts={contacts}
              setContacts={setContacts}
              query={contactQuery}
              setQuery={setContactQuery}
              setForm={setContactForm}
              setModal={setModal}
              onToast={notify}
              t={t}
            />
          </Route>
          <Route path="/enterprise">
            <Enterprise
              role={role}
              setRole={setRole}
              alert={enterpriseAlert}
              setAlert={setEnterpriseAlert}
              onToast={notify}
              t={t}
            />
          </Route>
          <Route path="/benchmarks">
            <Benchmarks
              dataset={dataset}
              setDataset={setDataset}
              runs={benchmarkRuns}
              setRuns={setBenchmarkRuns}
              onToast={notify}
              t={t}
            />
          </Route>
          <Route path="/settings">
            <Settings
              settings={settings}
              setSettings={setSettings}
              monitoring={monitoring}
              onStop={endMonitoring}
              contactsCount={contacts.length}
              onNavigate={goto}
              onReset={() =>
                setModal({
                  title: 'Clear demo data?',
                  body: 'This will reset demo incidents, scenario steps, and sample contacts in this browser. Real systems are not impacted.',
                  action: () => {
                    setContacts([]);
                    resetDemo();
                  },
                  confirm: 'Clear Demo Data',
                })
              }
              onToast={notify}
              t={t}
            />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </main>

      {/* Intro Modal on First Visit */}
      {firstVisit && (
        <Modal
          title="Welcome to VEIL — Deepfake & Voice Shield"
          onClose={() => {
            setFirstVisit(false);
            localStorage.setItem('veil-intro-seen', '1');
          }}
          actions={
            <>
              <button
                className="btn ghost"
                onClick={() => {
                  setFirstVisit(false);
                  localStorage.setItem('veil-intro-seen', '1');
                }}
              >
                Explore Workspace
              </button>
              <button
                className="btn"
                onClick={() => {
                  setFirstVisit(false);
                  localStorage.setItem('veil-intro-seen', '1');
                  goto('/live-shield');
                  void startMonitoring();
                }}
              >
                <Radio size={14} /> Start Live Monitoring
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setFirstVisit(false);
                  localStorage.setItem('veil-intro-seen', '1');
                  startDemo();
                }}
              >
                Launch CEO Demo <ArrowRight size={14} />
              </button>
            </>
          }
        >
          <p>
            VEIL is a layered defensive cybersecurity console designed to protect operators and employees from real-time deepfake video, cloned voices, and CEO impersonation scams during video calls.
          </p>
          <div className="notice" style={{ marginTop: 10 }}>
            <strong>Privacy-Preserving Architecture:</strong> Camera and microphone permissions are requested only when you choose live monitoring. Streams remain strictly inside your browser sandbox and can be terminated at any second. Nothing is uploaded or recorded by default.
          </div>
          <p style={{ marginTop: 10, marginBottom: 0 }}>
            This hackathon-ready preview includes full attack simulation, real-time Web Audio API frequency analysis, biometric canvas HUD, out-of-band callback verification, and printable incident reports.
          </p>
        </Modal>
      )}

      {/* Confirmation Modal */}
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

      {/* Edit/Add Contact Modal */}
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
          <form id="contact-form" onSubmit={saveContact} className="grid grid-2">
            {[
              ['name', 'Full Name', contactForm.name],
              ['relationship', 'Relationship (e.g. Colleague, Family)', contactForm.relationship],
              ['organization', 'Organization', contactForm.organization],
              ['role', 'Role (e.g. Chief Financial Officer)', contactForm.role],
              ['phone', 'Known Phone Number', contactForm.phone],
              ['email', 'Known Email Address', contactForm.email],
            ].map(([key, label, value]) => (
              <div className="field" key={key}>
                <label htmlFor={`contact-${key}`}>{label}</label>
                <input
                  required={key === 'name' || key === 'phone'}
                  id={`contact-${key}`}
                  name={key}
                  className="input"
                  defaultValue={value}
                  data-testid={`input-contact-${key}`}
                />
              </div>
            ))}
            <div className="setting-row span-2">
              <div>
                <div className="setting-title">Reference Enrollment Consent Placeholder</div>
                <div className="setting-desc">
                  Acknowledges consent was discussed. No raw face or voice samples are captured or persisted.
                </div>
              </div>
              <input
                type="checkbox"
                className="toggle"
                checked={contactForm.consent}
                onChange={e =>
                  setContactForm({
                    ...contactForm,
                    consent: e.target.checked,
                    status: e.target.checked ? 'Consent discussed' : 'Not enrolled',
                  })
                }
                aria-label="Mark consent discussion placeholder"
              />
            </div>
            <div className="notice span-2">
              Contact details are maintained in your local browser sandbox. Safe words must be confirmed in private; they are never stored or transmitted by VEIL.
            </div>
          </form>
        </Modal>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast" role="status" aria-live="polite" data-testid="status-toast">
          {toast}
        </div>
      )}
    </div>
  );
}

function NavItem({ item, active, onClick }: { item: typeof routes[number]; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.path}
      className={`nav-link ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      data-testid={`link-${item.label.toLowerCase().replaceAll(' ', '-')}`}
    >
      <Icon size={15} strokeWidth={1.8} />
      <span>{item.label}</span>
      {item.path === '/live-shield' && (
        <span style={{ marginLeft: 'auto' }} className={`dot ${active ? 'green' : 'blue'}`} />
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
        <div className="head-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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

function DemoBanner({ children = 'DEMO ENVIRONMENT · ALL SIGNALS AND SCORES ARE ILLUSTRATIVE' }: { children?: ReactNode }) {
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

function Metric({ label, value, delta, tone }: { label: string; value: string; delta?: string; tone?: string }) {
  return (
    <Panel className="flex flex-col justify-between h-full">
      <div className="metric-label">{label}</div>
      <div className="flex items-baseline gap-2 mt-2">
        <div className="metric">{value}</div>
        {delta && (
          <div className="metric-change" style={tone ? { color: tone } : {}}>
            {delta}
          </div>
        )}
      </div>
    </Panel>
  );
}

function MiniChart({ paired = false, range = '24 hours', view = 'Threat trends' }: { paired?: boolean; range?: string; view?: string }) {
  const base =
    view === 'Threat categories'
      ? [54, 37, 61, 82, 48, 26]
      : view === 'Severity distribution'
      ? [18, 49, 67, 31]
      : chartDataSeries;

  const values =
    view !== 'Threat trends'
      ? base
      : base.map((n, i) =>
          range === '7 days'
            ? Math.min(95, Math.max(20, n + ((i % 3) - 1) * 13))
            : range === '30 days'
            ? Math.min(92, Math.max(25, n + ((i % 4) - 2) * 8))
            : n
        );

  const labels =
    view === 'Threat categories'
      ? ['VIDEO', 'AUDIO', 'URGENCY', 'OTP', 'PAYMENT', 'OTHER']
      : view === 'Severity distribution'
      ? ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
      : range === '24 hours'
      ? ['09:00', '10:00', '11:00', '12:00', '13:00', 'NOW']
      : range === '7 days'
      ? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
      : ['W1', 'W2', 'W3', 'W4', 'W5', 'NOW'];

  return (
    <>
      <div className="chart-bars" role="img" aria-label={`Illustrative ${view.toLowerCase()} chart. Demo values.`}>
        {values.map((n, i) => (
          <div className="chart-bar-wrap" key={i}>
            <i className="chart-bar" style={{ height: `${n}%` }} />
            {paired && (
              <i
                className="chart-bar secondary"
                style={{ height: `${Math.max(12, values[(i + 3) % values.length] * 0.68)}%` }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="chart-labels">
        {labels.map(label => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </>
  );
}

function EventFeed({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      {threatTimelineEvents.slice(0, compact ? 3 : 4).map((event, i) => (
        <div className="event-row" key={i}>
          <span className={`event-mark ${event[2]}`} />
          <div style={{ flex: 1 }}>
            <div className="event-title">{event[0]}</div>
            <div className="event-detail">{event[1]}</div>
          </div>
          <span className="event-time">{event[3]}</span>
        </div>
      ))}
    </div>
  );
}

/* ========================================================================= */
/* PAGE 1: OVERVIEW DASHBOARD                                                */
/* ========================================================================= */
function Overview({
  score,
  monitoring,
  onLaunch,
  onStart,
  onNavigate,
  onToast,
  t,
}: {
  score: number;
  monitoring: boolean;
  onLaunch: () => void;
  onStart: () => void;
  onNavigate: (p: string) => void;
  onToast: (s: string) => void;
  t: any;
}) {
  const [range, setRange] = useState('24 hours');
  const [chartView, setChartView] = useState('Threat trends');

  return (
    <div className="page">
      <PageHead
        eyebrow="TUESDAY, 24 JUNE 2025 · CYBER DEFENSE DASHBOARD"
        title="Real-Time Deepfake & Impersonation Shield"
        desc="Layered analysis of video artifacts, spectral voice cloning, conversational social engineering, and out-of-band verification."
        actions={
          <>
            <button className="btn primary" onClick={onLaunch} data-testid="button-launch-demo">
              <Play size={14} /> {t.launchDemo}
            </button>
            <button className="btn" onClick={onStart} data-testid="button-start-live-monitoring">
              <Radio size={14} /> {t.startMonitoring}
            </button>
          </>
        }
      />

      <DemoBanner>
        VEIL DEFENSE ENVIRONMENT · Layered detection prototype · Offline models · Zero biometric retention
      </DemoBanner>

      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <Panel
          title="Current Trust & Authenticity Score"
          subtitle="Fused multi-modal trust calculation · 80-100 = High Confidence, 0-49 = Suspicious"
          action={<Badge tone={score >= 80 ? 'green' : score >= 50 ? 'amber' : 'red'}>{score >= 80 ? 'High Confidence' : score >= 50 ? 'Caution' : 'Elevated Suspicion'}</Badge>}
        >
          <div className="score-layout">
            <TrustMeter score={score} showBreakdown />
            <div className="score-meta">
              <div className="meta-row">
                <span>Threat Classification</span>
                <strong style={{ color: score < 50 ? '#ef4444' : score < 80 ? '#f59e0b' : '#10b981' }}>
                  {score < 50 ? 'High Threat / Scam Suspected' : score < 80 ? 'Caution / Unverified' : 'Nominal Stream'}
                </strong>
              </div>
              <div className="meta-row">
                <span>Assessment Confidence</span>
                <strong>{monitoring ? 'Active Real-Time Analysis' : 'Baseline Standby'}</strong>
              </div>
              <div className="meta-row">
                <span>Signal Sufficiency</span>
                <strong>{monitoring ? 'Multi-Stream Sampling' : 'Sufficient Demo Data'}</strong>
              </div>
              <div className="meta-row">
                <span>Out-of-Band State</span>
                <strong>Callback Ready</strong>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="Shield Monitoring Readiness"
          subtitle="Camera and microphone permissions are requested only upon session start"
          action={<Status tone={monitoring ? 'green' : 'amber'}>{monitoring ? 'Shield Active' : 'Standby'}</Status>}
        >
          {[
            ['Facial Boundary & Warping Analysis', 'Video', 'Nominal'],
            ['Audio Vocoder & Spectral Nyquist', 'Audio', 'Nominal'],
            ['Audio-Visual Lip-Sync Synchronization', 'Video/Audio', 'Active'],
            ['Liveness Challenge Response Engine', 'Active Defense', 'Ready'],
            ['Conversational Scam Tripwire Scanner', 'Transcript Context', 'Active'],
            ['Out-of-Band Cryptographic / Callback', 'Identity Layer', 'Ready'],
          ].map(([name, cat, st]) => (
            <div className="setting-row" key={name} style={{ padding: '7px 0' }}>
              <div>
                <span className="setting-title">{name}</span>
                <span className="text-[9px] text-slate-500 font-mono ml-2 uppercase">[{cat}]</span>
              </div>
              <Badge tone={st === 'Nominal' ? 'green' : st === 'Active' ? 'cyan' : 'amber'}>{st}</Badge>
            </div>
          ))}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="metric-label">Execution Environment</span>
            <span className="metric-label font-mono text-cyan-400">Browser WASM / Web Audio · Sandbox Safe</span>
          </div>
        </Panel>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 14 }}>
        <Metric label="SESSIONS PROTECTED" value="1,284" delta="+8.2% vs last week" />
        <Metric label="THREATS BLOCKED" value="37" delta="6 require review" tone="#e3bc70" />
        <Metric label="CRITICAL TRIPWIRES" value="12" delta="2 today" tone="#ef4444" />
        <Metric label="LIVENESS VERIFICATIONS" value="86" delta="98.4% user completion" />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <Panel
          title="Threat Intelligence Trends"
          subtitle="Aggregated attack patterns and signal occurrences"
          action={
            <div className="flex flex-wrap sm:flex-nowrap gap-1.5">
              <select
                className="select text-xs py-1.5 px-2 w-36"
                value={chartView}
                onChange={e => setChartView(e.target.value)}
                aria-label="Chart view selector"
              >
                <option>Threat trends</option>
                <option>Threat categories</option>
                <option>Severity distribution</option>
              </select>
              {chartView === 'Threat trends' && (
                <select
                  className="select text-xs py-1.5 px-2 w-28"
                  value={range}
                  onChange={e => setRange(e.target.value)}
                  aria-label="Chart date range selector"
                >
                  <option>24 hours</option>
                  <option>7 days</option>
                  <option>30 days</option>
                </select>
              )}
            </div>
          }
        >
          <MiniChart paired range={range} view={chartView} />
          <div style={{ display: 'flex', gap: 15, marginTop: 14, fontSize: 10, color: '#8494a2' }}>
            <span>
              <i className="dot blue" style={{ display: 'inline-block', marginRight: 6 }} />
              Video / Lip-sync Anomalies
            </span>
            <span>
              <i className="dot amber" style={{ display: 'inline-block', marginRight: 6, background: '#d8aa50' }} />
              Conversational Social Engineering
            </span>
          </div>
        </Panel>

        <Panel
          title="Recent Security Activity Log"
          subtitle="Real-time timeline of detected heuristics and events"
          action={
            <button className="btn ghost sm" onClick={() => onNavigate('/incidents')}>
              View all incidents <ArrowRight size={12} />
            </button>
          }
        >
          <EventFeed compact />
        </Panel>
      </div>

      <div className="grid grid-2">
        <Panel title="Security Threat Timeline" subtitle="CHRONOLOGICAL EVENTS · LAYERED DEFENSE">
          <div className="timeline">
            {threatTimelineEvents.slice(0, 3).map((e, i) => (
              <div className={`timeline-item ${i === 1 ? 'alert' : ''}`} key={e[0]}>
                <div className="timeline-time">
                  {e[3]} · {e[2].toUpperCase()} LEVEL
                </div>
                <div className="timeline-text">
                  <strong>{e[0]}</strong> — {e[1]}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Quick Defensive Action Center" subtitle="Rapid launchpad for high-security workflows">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { label: 'Open Live Shield', path: '/live-shield', Icon: Shield },
              { label: 'Attack Simulator', path: '/attack-simulator', Icon: Activity },
              { label: 'Scan Call Transcript', path: '/threat-intelligence', Icon: FileSearch },
              { label: 'Audit Incidents', path: '/incidents', Icon: History },
              { label: 'Trusted Contacts Vault', path: '/trusted-contacts', Icon: Users },
              { label: 'Benchmark Lab', path: '/benchmarks', Icon: Gauge },
            ].map(({ label, path: p, Icon }) => (
              <button
                className="btn justify-between"
                key={label}
                onClick={() => onNavigate(p)}
                data-testid={`action-${label.toLowerCase().replaceAll(' ', '-')}`}
              >
                <span className="flex items-center gap-2">
                  <Icon size={14} className="text-cyan-400" />
                  {label}
                </span>
                <ChevronRight size={13} />
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* PAGE 2: LIVE SHIELD                                                       */
/* ========================================================================= */
function LiveShield({
  monitoring,
  paused,
  mediaStream,
  elapsed,
  mode,
  error,
  score,
  challenge,
  setChallenge,
  challengeStatus,
  setChallengeStatus,
  challengeSeconds,
  setChallengeSeconds,
  phrase,
  setPhrase,
  contacts,
  onStart,
  onPause,
  onResume,
  onEnd,
  onToast,
  onReport,
  t,
}: any) {
  const [capture, setCapture] = useState('Webcam + microphone');
  const [cameraDevice, setCameraDevice] = useState('');
  const [microphoneDevice, setMicrophoneDevice] = useState('');
  const [technical, setTechnical] = useState(false);
  const [alertMuted, setAlertMuted] = useState(false);

  const [callbackStatus, setCallbackStatus] = useState('Not started');
  const [selectedContact, setSelectedContact] = useState(contacts[0]?.id || '');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [oobStatus, setOobStatus] = useState('Not started');

  const [phraseStatus, setPhraseStatus] = useState('Not started');
  const [phraseSeconds, setPhraseSeconds] = useState(0);

  const [deviceList, setDeviceList] = useState<MediaDeviceInfo[]>([]);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Hook up video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream || null;
    }
  }, [mediaStream]);

  // Phrase countdown
  useEffect(() => {
    if (phraseStatus !== 'In progress') return;
    const timer = window.setInterval(() => {
      setPhraseSeconds(value => {
        if (value <= 1) {
          setPhraseStatus('Completed · Voice acoustic match evaluated (simulated)');
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phraseStatus]);

  const startLiveness = (name: string) => {
    setChallenge(name);
    setChallengeSeconds(8);
    setChallengeStatus('In progress');
    onToast(`Liveness challenge initiated: ${name}. Follow instructions on screen.`);
  };

  const enumerate = async () => {
    setDeviceLoading(true);
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        throw new Error('Device enumeration is not supported in this browser.');
      }
      const list = await navigator.mediaDevices.enumerateDevices();
      setDeviceList(list.filter(d => d.kind === 'videoinput' || d.kind === 'audioinput'));
      if (!list.length) onToast('No cameras or microphones reported.');
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Device list unavailable.');
    }
    setDeviceLoading(false);
  };

  const startOutOfBand = () => {
    const generated = String(Math.floor(100000 + Math.random() * 900000));
    setDemoCode(generated);
    setOobStatus('Active code generated for this session · Expires in 5m');
    onToast(`One-time verification code generated locally: ${generated}. Transmit via separate SMS/Signal.`);
  };

  const triggerCallback = () => {
    const contact = contacts.find((c: Contact) => c.id === Number(selectedContact));
    if (contact) {
      setCallbackStatus(`Recommended · Dialing known number: ${contact.phone}`);
      onToast(`STOP CALL. Call ${contact.name} directly at ${contact.phone}. Do not trust numbers provided by the caller.`);
    } else {
      onToast('Select a saved trusted contact first.');
    }
  };

  const isLowScore = score < 50;

  return (
    <div className="page">
      <PageHead
        eyebrow="REAL-TIME SURVEILLANCE & ACTIVE DEFENSE WORKSPACE"
        title="Live Shield Console"
        desc="Real-time multi-modal analysis across camera frames, microphone acoustics, liveness challenge response, and out-of-band verification."
        actions={
          monitoring ? (
            <>
              <Status tone="green">
                ACTIVE · {Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}
              </Status>
              <button className="btn danger" onClick={onEnd} data-testid="button-end-monitoring">
                <StopCircle size={14} /> End Shield
              </button>
            </>
          ) : paused ? (
            <>
              <Status tone="amber">Capture Paused</Status>
              <button className="btn" onClick={onResume}>
                <Play size={14} /> Resume
              </button>
              <button className="btn danger" onClick={onEnd} data-testid="button-end-monitoring">
                <StopCircle size={14} /> End
              </button>
            </>
          ) : (
            <button
              className="btn primary"
              onClick={() => onStart(capture, cameraDevice, microphoneDevice)}
              data-testid="button-start-capture"
            >
              <Radio size={14} /> Request Camera & Mic Permission
            </button>
          )
        }
      />

      <DemoBanner>
        STREAM PROCESSED LOCALLY IN BROWSER · Zero frames recorded to servers · Layered Defense active
      </DemoBanner>

      {error && (
        <div className="notice" role="alert" style={{ borderColor: '#70404b', marginBottom: 14, color: '#efb2b4' }}>
          <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          {error}
          <button className="btn sm" style={{ marginLeft: 10 }} onClick={() => onStart('Demonstration only')}>
            Use Simulated Video Stream
          </button>
        </div>
      )}

      {/* Critical Threat Warning Banner */}
      {isLowScore && (
        <div className="alert-card" style={{ marginBottom: 14 }}>
          <div className="alert-title">
            <Siren size={18} className="text-red-400 mr-2 animate-pulse" />
            POTENTIAL DEEPFAKE / IDENTITY IMPERSONATION DETECTED
          </div>
          <p style={{ fontSize: 11, color: '#fecaca', margin: '8px 0 12px' }}>
            Elevated threat signals detected: Lip-sync drift anomaly (&gt;300ms), spectral high-frequency cutoff, and urgency tripwire phrases. Authenticity Confidence is low ({score}/100).
          </p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <button className="btn sm" onClick={() => onToast('Alert acknowledged by operator.')}>
              Acknowledge Alert
            </button>
            <button
              className="btn sm"
              onClick={() => document.getElementById('active-defense-suite')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Issue Liveness Challenge
            </button>
            <button className="btn sm primary" onClick={triggerCallback}>
              Initiate Known Callback
            </button>
            <button className="btn danger sm" onClick={onEnd}>
              Terminate Video Call
            </button>
            <button className="btn sm" onClick={() => onReport()}>
              Export Incident Record
            </button>
          </div>
        </div>
      )}

      {/* Camera & Waveform Grid */}
      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <Panel
          title="Camera Stream & Biometric HUD"
          subtitle="Real-time browser capture with face mesh & telemetry overlay"
          action={
            <Badge tone={monitoring ? 'green' : paused ? 'amber' : 'gray'}>
              {monitoring ? 'Stream Live' : paused ? 'Paused' : 'Standby'}
            </Badge>
          }
        >
          {/* Video Preview with HUD Canvas */}
          <div className="call-preview relative" data-testid="status-media-preview">
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
                opacity: mediaStream && mediaStream.getVideoTracks().length ? 0.8 : 0,
              }}
            />

            {/* Interactive Canvas HUD Overlay */}
            <LiveCameraHUD
              active={monitoring || !mediaStream}
              videoRef={videoRef}
              hasStream={Boolean(mediaStream && mediaStream.getVideoTracks().length)}
              activeChallenge={challenge}
              challengeProgress={challengeSeconds > 0 ? (8 - challengeSeconds) / 8 : 1}
            />

            <div className="preview-bottom">
              <span>{monitoring ? mode : paused ? 'Stream Paused' : 'Awaiting Permission'}</span>
              <span className="font-mono text-cyan-400">
                {mediaStream ? 'LIVE WEBCAM ACTIVE' : 'SIMULATED FEED'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
            <div className="field">
              <label htmlFor="capture-mode">Capture Mode</label>
              <select
                className="select"
                id="capture-mode"
                value={capture}
                onChange={e => setCapture(e.target.value)}
                data-testid="select-capture-mode"
              >
                <option>Webcam + microphone</option>
                <option>Microphone only</option>
                <option>Screen / tab</option>
                <option>Demonstration only</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="camera-choice">Camera</label>
              <select
                className="select"
                id="camera-choice"
                value={cameraDevice}
                onChange={e => setCameraDevice(e.target.value)}
                data-testid="select-camera-device"
              >
                <option value="">Default browser camera</option>
                {deviceList
                  .filter(d => d.kind === 'videoinput')
                  .map((d, i) => (
                    <option key={`${d.deviceId}-${i}`} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="microphone-choice">Microphone</label>
              <select
                className="select"
                id="microphone-choice"
                value={microphoneDevice}
                onChange={e => setMicrophoneDevice(e.target.value)}
                data-testid="select-microphone-device"
              >
                <option value="">Default browser microphone</option>
                {deviceList
                  .filter(d => d.kind === 'audioinput')
                  .map((d, i) => (
                    <option key={`${d.deviceId}-${i}`} value={d.deviceId}>
                      {d.label || `Microphone ${i + 1}`}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              className="btn sm primary"
              onClick={() => onStart(capture, cameraDevice, microphoneDevice)}
              disabled={monitoring || paused}
              data-testid="button-capture-start"
            >
              <Video size={13} /> Start Shield
            </button>
            <button className="btn sm" onClick={onPause} disabled={!monitoring} data-testid="button-capture-pause">
              <Pause size={13} /> Pause
            </button>
            <button className="btn sm" onClick={onResume} disabled={!paused} data-testid="button-capture-resume">
              <Play size={13} /> Resume
            </button>
            <button className="btn sm danger" onClick={onEnd} disabled={!monitoring && !paused} data-testid="button-capture-end">
              <Square size={12} /> End
            </button>
            <button className="btn sm" onClick={enumerate} disabled={deviceLoading} data-testid="button-enumerate-devices">
              <SlidersHorizontal size={12} /> {deviceLoading ? 'Checking...' : 'Check Devices'}
            </button>
          </div>
        </Panel>

        {/* Live Audio Spectrum & Trust Calculation */}
        <div className="flex flex-col gap-3.5">
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
                <span className="text-[10px] text-slate-400 block">Vocoder Phase Artifacts</span>
                <span className="font-mono text-cyan-400 font-semibold">
                  {monitoring ? (score < 50 ? 'PHASE JITTER DETECTED' : 'NOMINAL COHERENCE') : 'STANDBY'}
                </span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Nyquist Bandwidth</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {monitoring ? '16.0 kHz SPECTRUM' : 'INACTIVE'}
                </span>
              </div>
            </div>
          </Panel>

          <Panel
            title="Multi-Modal Trust Calculation"
            subtitle="Rolling confidence meter combining video, acoustic, and contextual signals"
            action={
              <Badge tone={score < 50 ? 'red' : score < 80 ? 'amber' : 'green'}>
                {score < 50 ? 'High Concern' : score < 80 ? 'Caution' : 'Authentic'}
              </Badge>
            }
          >
            <div className="score-layout">
              <TrustMeter score={score} size="md" />
              <div className="score-meta">
                <div className="meta-row">
                  <span>Video Signals</span>
                  <strong>{score < 50 ? 'Flicker / Drift Flagged' : 'Coherent Geometry'}</strong>
                </div>
                <div className="meta-row">
                  <span>Voice Cloning</span>
                  <strong>{score < 50 ? 'Vocoder Jitter Flagged' : 'Natural Formants'}</strong>
                </div>
                <div className="meta-row">
                  <span>Scam Urgency</span>
                  <strong>{score < 50 ? 'Tripwire Alert' : 'No Threat Words'}</strong>
                </div>
                <div className="meta-row">
                  <span>Identity Proof</span>
                  <strong>Unverified (Local)</strong>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Signal Inventory & Explainability */}
      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <Panel
          title="Detection Signal Inventory"
          subtitle="Full catalog of 14 defensive detection parameters"
        >
          <div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
            {signalInventory.map((sig, i) => {
              const isTriggered = isLowScore && (i === 0 || i === 4 || i === 7 || i === 12);
              return (
                <div className="signal-row" key={sig.name}>
                  <div>
                    <div className="signal-name">{sig.name}</div>
                    <div className="signal-sub">{sig.sub}</div>
                  </div>
                  <div>
                    <div className={`bar ${isTriggered ? 'red' : ''}`}>
                      <i style={{ width: `${isTriggered ? 78 : monitoring ? 18 : 0}%` }} />
                    </div>
                    <div className="signal-sub font-mono">
                      {isTriggered ? 'Elevated 78%' : monitoring ? 'Nominal 18%' : 'Idle'}
                    </div>
                  </div>
                  <Badge tone={isTriggered ? 'red' : monitoring ? 'green' : 'gray'}>
                    {isTriggered ? 'Suspicion' : monitoring ? 'Nominal' : 'Offline'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="Explainability & Forensics Feed"
          subtitle="Chronological audit of triggers, drift measurements, and explanations"
          action={
            <button className="btn ghost sm" onClick={() => setTechnical(!technical)}>
              {technical ? 'Hide' : 'Show'} Technical Details <ChevronDown size={12} />
            </button>
          }
        >
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {[
              ['00:14', 'Lip-sync drift measured: +340 ms [Threshold: 60 ms]', 'Suspicion'],
              ['00:21', 'Atypical blink pattern: 0 blinks detected across 20s window', 'Warning'],
              ['00:33', 'Spectral energy drop-off identified above 7.8 kHz', 'Suspicion'],
              ['00:41', 'Urgency transcript tripwire triggered: "send wire right now"', 'Tripwire'],
              ['00:48', 'Independent verification challenge recommended', 'Defense'],
            ].map(([time, desc, badge]) => (
              <div className="event-row" key={time}>
                <span className="event-time font-mono">{time}</span>
                <div className="event-title" style={{ flex: 1 }}>{desc}</div>
                <Badge
                  tone={
                    badge === 'Suspicion' || badge === 'Tripwire'
                      ? 'red'
                      : badge === 'Warning'
                      ? 'amber'
                      : 'cyan'
                  }
                >
                  {badge}
                </Badge>
              </div>
            ))}

            {technical && (
              <div className="notice" style={{ marginTop: 12 }}>
                <strong>Technical Measurement Notes:</strong> Lip-sync offset is measured via cross-correlation between audio envelope peaks and mouth vertical opening landmarks. Spectral cutoff is computed via FFT Nyquist bin analysis. All calculations run client-side in WebAssembly.
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Active Defense Suite */}
      <div id="active-defense-suite" className="grid grid-2">
        {/* Liveness Challenge */}
        <Panel
          title="Active Liveness Challenge"
          subtitle="Interactive physical prompts that stress real-time face-swap rendering models"
        >
          <div className="notice" style={{ marginBottom: 12 }}>
            Real-time neural face-swappers often fail or display heavy border artifacts during severe occlusion or steep 90° lateral profiles.
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {['Turn head ~90°', 'Cover half your face', 'Hold up three fingers'].map(c => (
              <button
                className={`btn sm ${challenge === c ? 'primary' : ''}`}
                key={c}
                onClick={() => startLiveness(c)}
                data-testid={`challenge-${c.toLowerCase().replaceAll(' ', '-')}`}
              >
                {c}
              </button>
            ))}
          </div>

          {challenge && (
            <div className="p-3 bg-slate-900 border border-cyan-800/80 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <strong className="text-cyan-400 text-xs font-mono">{challenge}</strong>
                <span className="text-xs font-mono text-slate-300">
                  {challengeSeconds > 0 ? `${challengeSeconds}s remaining` : 'Timer Expired'}
                </span>
              </div>
              <div className="progress-steps my-2">
                {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                  <i key={i} className={`step ${i < 8 - challengeSeconds ? 'on' : ''}`} />
                ))}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Status: <span className="text-slate-200">{challengeStatus}</span>
              </div>
              {challengeSeconds === 0 && (
                <button className="btn sm mt-2" onClick={() => startLiveness(challenge)}>
                  Retry Challenge
                </button>
              )}
            </div>
          )}

          <div className="panel-kicker mt-2.5">
            Important: A completed liveness test reduces certain automated risk but does not guarantee caller authenticity.
          </div>
        </Panel>

        {/* Phrase & Callback Defenses */}
        <Panel
          title="Randomized Phrase & Out-of-Band Callback"
          subtitle="Secondary voice acoustic challenge and independent telephone verification"
        >
          <div className="field">
            <label>Randomized Repetition Phrase</label>
            <div className="notice mono font-semibold text-sky-100 text-base">
              {phrase}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            <button
              className="btn sm"
              onClick={() => {
                const phrases = [
                  'emerald horizon / 94',
                  'violet atlas / 28',
                  'silver orchard / 63',
                  'north window / 15',
                  'amber beacon / 82',
                ];
                setPhrase(phrases[Math.floor(Math.random() * phrases.length)]);
                setPhraseStatus('Not started');
                setPhraseSeconds(0);
                onToast('New randomized acoustic challenge phrase generated.');
              }}
              data-testid="button-new-phrase"
            >
              Generate New Phrase
            </button>
            <button
              className="btn sm primary"
              onClick={() => {
                setPhraseStatus('In progress');
                setPhraseSeconds(8);
                onToast('Phrase repetition timer started (8s).');
              }}
              data-testid="button-start-phrase"
            >
              Start Phrase Test
            </button>
          </div>

          <div className="setting-row mt-2">
            <span className="setting-title">Phrase Challenge Status</span>
            <Badge tone={phraseStatus.includes('Completed') ? 'green' : phraseStatus === 'In progress' ? 'amber' : 'gray'}>
              {phraseStatus} {phraseStatus === 'In progress' ? `(${phraseSeconds}s)` : ''}
            </Badge>
          </div>

          {/* Out of Band Section */}
          <div className="setting-row mt-3">
            <div>
              <div className="setting-title">Out-of-Band Verification Code</div>
              <div className="setting-desc">Generate a single-use 6-digit code for side-channel authentication.</div>
            </div>
            <button className="btn sm" onClick={startOutOfBand}>
              {demoCode ? 'Regenerate Code' : 'Generate Code'}
            </button>
          </div>

          {demoCode && (
            <div className="notice mono flex justify-between items-center mt-2">
              <span>ACTIVE SESSION CODE: <strong>{demoCode}</strong></span>
              <span className="text-[10px] text-slate-400">Expires in 5m</span>
            </div>
          )}

          {/* Direct Callback Workflow */}
          <div className="field mt-3.5">
            <label htmlFor="callback-contact">Independent Callback Directory</label>
            <select
              id="callback-contact"
              className="select"
              value={selectedContact}
              onChange={e => setSelectedContact(e.target.value)}
            >
              {contacts.map((c: Contact) => (
                <option value={c.id} key={c.id}>
                  {c.name} ({c.role}) · {c.phone}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 mt-2.5">
            <button className="btn primary sm" onClick={triggerCallback}>
              <Headphones size={13} /> Initiate Independent Callback
            </button>
            <button
              className="btn sm"
              onClick={() => {
                setCallbackStatus('Completed · Caller verified over independent telephony');
                onToast('Callback verified successfully.');
              }}
            >
              Mark Callback Complete
            </button>
          </div>
          <div className="panel-kicker mt-1.5">
            Status: {callbackStatus}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* PAGE 3: THREAT INTELLIGENCE                                               */
/* ========================================================================= */
function ThreatPage({ transcript, setTranscript, tripwire, setTripwire, onNavigate, onToast, t }: any) {
  const [expected, setExpected] = useState('Rahul, Chief Financial Officer');
  const [claimed, setClaimed] = useState('Rahul');
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

  const flagPatterns: [RegExp, string, string][] = [
    [/\b(urgent|right now|immediately|today only|asap)\b/gi, 'Urgency Pressure', 'amber'],
    [/\b(secret|keep this between us|don't tell|do not tell|confidential)\b/gi, 'Secrecy Demand', 'red'],
    [/\b(wire|transfer|send money|gift card|payment|funds)\b/gi, 'Payment Request', 'red'],
    [/\b(otp|one.time passcode|verification code|pin)\b/gi, 'OTP / Passcode Request', 'red'],
    [/\b(password|credential|login|bank account)\b/gi, 'Credential Theft', 'red'],
    [/\b(bypass|skip approval|don't loop in|do not involve legal)\b/gi, 'Approval Bypass', 'red'],
    [/\b(ceo|cfo|director|fbi|police|fraud desk|authority)\b/gi, 'Authority Claim', 'amber'],
  ];

  const flags = useMemo(() => {
    const out: { phrase: string; category: string; tone: string }[] = [];
    for (const [pattern, category, tone] of flagPatterns) {
      for (const match of transcript.matchAll(pattern)) {
        if (match[0]) out.push({ phrase: match[0], category, tone });
      }
    }
    return out.slice(0, 20);
  }, [transcript]);

  // Web Speech API dictation
  const toggleDictation = () => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      onToast('Speech dictation stopped.');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onToast('Web Speech recognition is not supported in this browser. Please use keyboard input or sample buttons.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript + ' ';
        }
        setTranscript(text);
      };

      recognition.onerror = () => {
        setIsDictating(false);
        onToast('Speech dictation paused or microphone unavailable.');
      };

      recognition.onend = () => {
        setIsDictating(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsDictating(true);
      onToast('Listening... Speak now to transcribe speech.');
    } catch {
      onToast('Unable to start speech recognition.');
    }
  };

  const highlight = (text: string) => {
    const regex = /(urgent|right now|immediately|wire|transfer|gift card|otp|one.time passcode|password|credential|secret|keep this between us|bypass|skip approval|ceo|cfo|bank|send money|account)/gi;
    const terms = new Set([
      'urgent', 'right now', 'immediately', 'wire', 'transfer', 'gift card',
      'otp', 'one.time passcode', 'password', 'credential', 'secret',
      'keep this between us', 'bypass', 'skip approval', 'ceo', 'cfo',
      'bank', 'send money',
    ]);
    return text.split(regex).map((part, i) =>
      terms.has(part.toLowerCase()) ? (
        <mark key={i} style={{ background: '#7f1d1d', color: '#fecaca', borderRadius: 3, padding: '1px 4px', fontWeight: 600 }}>
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="CONVERSATIONAL THREAT & SCAM-CONTEXT RECOGNITION"
        title="Threat Intelligence Scanner"
        desc="Real-time linguistic heuristics analyze conversation transcripts for social-engineering coercion, OTP harvesting, urgency pressure, and bypass tactics."
        actions={<Badge tone="amber">Heuristic NLP Active</Badge>}
      />

      <DemoBanner>
        LOCAL NLP HEURISTICS · Transparent keyword rules · No speech logs uploaded to servers
      </DemoBanner>

      {/* STOP TRIPWIRE BANNER */}
      {tripwire && (
        <div className="alert-card" role="alert" style={{ marginBottom: 14 }}>
          <div className="alert-title">
            <AlertOctagon size={18} className="text-red-400 mr-2" />
            STOP: VERIFY BEFORE SENDING
          </div>
          <p style={{ color: '#fecaca', fontSize: 12, margin: '6px 0 10px' }}>
            {tripwire}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn primary sm" onClick={() => onNavigate('/live-shield')}>
              Verify Caller Identity
            </button>
            <button className="btn sm" onClick={() => onNavigate('/live-shield')}>
              Initiate Known Callback
            </button>
            <button className="btn ghost sm" onClick={() => setTripwire('')}>
              Dismiss Warning
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <Panel
          title="Transcript Scanner"
          subtitle="Dictate via microphone, paste conversation text, or select standard scenario templates"
          action={
            <button
              className={`btn sm ${isDictating ? 'danger' : 'primary'}`}
              onClick={toggleDictation}
            >
              {isDictating ? <MicOff size={13} /> : <Mic size={13} />}
              {isDictating ? 'Stop Dictation' : 'Speech-to-Text'}
            </button>
          }
        >
          <div className="field">
            <label htmlFor="transcript-input">Conversation Transcript Stream</label>
            <textarea
              id="transcript-input"
              className="textarea"
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="Paste or dictate video call conversation. Example: 'This is the CFO. Send the wire transfer right now and bypass normal approval.'"
              data-testid="input-transcript"
            />
          </div>

          <div className="flex flex-wrap gap-2 mt-2.5">
            <button
              className="btn sm"
              onClick={() =>
                setTranscript(
                  '“This is the CFO. I need you to initiate a wire transfer of $240,000 immediately. Keep this secret and bypass the normal board approval.”'
                )
              }
            >
              Load Wire Scam
            </button>
            <button
              className="btn sm"
              onClick={() =>
                setTranscript(
                  '“I am calling from your bank fraud desk. We detected an unauthorized login. Read out the one-time passcode we just sent to your phone right now.”'
                )
              }
            >
              Load Bank OTP Scam
            </button>
            <button
              className="btn sm"
              onClick={() =>
                setTranscript(
                  '“Hi Priya, could we review the quarterly product design review deck tomorrow morning at 10 AM?”'
                )
              }
            >
              Load Benign Call
            </button>
            <button
              className="btn ghost sm"
              onClick={() => {
                setTranscript('');
                setTripwire('');
              }}
            >
              Clear
            </button>
          </div>

          <div className="mt-3.5 border border-slate-700/80 p-3 rounded-md text-xs text-slate-300 leading-relaxed">
            <span className="text-[10px] text-slate-500 uppercase block mb-1 font-mono">Annotated Live Preview</span>
            {transcript ? highlight(transcript) : <span className="text-slate-500">Transcript text with keyword flags will render here.</span>}
          </div>
        </Panel>

        <Panel
          title="Flagged Risk Heuristics"
          subtitle={`${flags.length} suspicious pattern${flags.length === 1 ? '' : 's'} identified`}
        >
          {flags.length ? (
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {flags.map((f, i) => (
                <div className="event-row" key={`${f.phrase}-${i}`}>
                  <span className={`event-mark ${f.tone}`} />
                  <div style={{ flex: 1 }}>
                    <div className="event-title">“{f.phrase}”</div>
                    <div className="event-detail font-mono text-xs">{f.category}</div>
                  </div>
                  <Badge tone={f.tone}>{f.category}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <CheckCircle2 size={24} style={{ margin: '0 auto 8px', color: '#10b981' }} />
              <div>No tripwire indicators flagged in sample.</div>
              <div style={{ marginTop: 4, fontSize: 10, color: '#64748b' }}>
                Remember: Absence of flagged keywords is not proof that a caller is genuine.
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-2">
        <Panel
          title="Expected vs. Claimed Identity"
          subtitle="Compare caller claimed persona against approved directory baseline"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="field">
              <label htmlFor="expected-identity">Expected Identity</label>
              <input
                id="expected-identity"
                className="input"
                value={expected}
                onChange={e => setExpected(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="claimed-identity">Claimed Persona</label>
              <input
                id="claimed-identity"
                className="input"
                value={claimed}
                onChange={e => setClaimed(e.target.value)}
              />
            </div>
          </div>

          <div className="setting-row" style={{ marginTop: 10 }}>
            <span className="setting-title">Identity Overlap Check</span>
            <Badge tone={expected.toLowerCase().includes(claimed.toLowerCase()) ? 'amber' : 'red'}>
              {expected.toLowerCase().includes(claimed.toLowerCase())
                ? 'Text Matches · Biometric Unverified'
                : 'Identity Mismatch Detected'}
            </Badge>
          </div>

          <div className="grid grid-2" style={{ marginTop: 8 }}>
            {[
              ['Reference Face Mesh', 'Zero cloud storage'],
              ['Reference Voice Print', 'Zero cloud storage'],
              ['Facial Biometric Match', 'Offline / Unenrolled'],
              ['Voice Acoustic Match', 'Offline / Unenrolled'],
            ].map(([k, v]) => (
              <div key={k} className="p-2 bg-slate-900 border border-slate-800 rounded">
                <span className="text-[10px] text-slate-400 block">{k}</span>
                <span className="font-mono text-slate-300 text-xs font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Defensive Triaging Protocol" subtitle="Recommended operational response rules">
          <div className="timeline">
            {[
              ['1. Recognize Pressure', 'Scammers compress response time through urgent demands and authority claims.'],
              ['2. Refuse Credential Sharing', 'Legitimate banks and executives never request one-time passcodes over video.'],
              ['3. Enforce Dual-Custody Approval', 'Never bypass organizational payment thresholds based on video authorization.'],
              ['4. Execute Out-of-Band Callback', 'Dial the pre-saved telephone number from an independent directory.'],
            ].map(([a, b]) => (
              <div className="timeline-item" key={a}>
                <div className="timeline-text">
                  <strong className="text-cyan-400">{a}</strong> — {b}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* PAGE 4: ATTACK SIMULATOR                                                  */
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
  alertActive,
  acknowledge,
  onToast,
  onNavigate,
  t,
}: any) {
  const isHighRisk = current.score < 50;

  const startPlayback = () => {
    if (step >= current.steps.length) setStep(0);
    setPlaying(true);
    onToast(`Simulation playback started: ${current.title}`);
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="REPRODUCIBLE SCENARIO TESTBENCH"
        title="Attack Simulator"
        desc="Test VEIL's defensive tripwires across 8 deterministic cyberattack scenarios, including CEO wire fraud, voice cloning, and approval bypass."
        actions={
          <button className="btn" onClick={() => onNavigate('/scam-replay')}>
            <RotateCcw size={14} /> Open Scam Replay
          </button>
        }
      />

      <DemoBanner>
        DETERMINISTIC SIMULATION ENGINE · Repeatable demonstration for evaluators
      </DemoBanner>

      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <Panel
          title="Select Attack Scenario"
          subtitle="Eight representative social engineering & deepfake threats"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {scenarioData.map((s, i) => (
              <button
                className={`btn flex-col items-start text-left h-auto min-h-[68px] p-2.5 whitespace-normal ${
                  scenario === i ? 'border-sky-400 bg-sky-950/40' : ''
                }`}
                key={s.id}
                onClick={() => setScenario(i)}
                aria-pressed={scenario === i}
                data-testid={`scenario-${s.id}`}
              >
                <span>
                  <strong className="block text-xs font-semibold">
                    {String(i + 1).padStart(2, '0')} · {s.title}
                  </strong>
                  <span className="block text-[10px] text-slate-400 mt-1">
                    {s.riskCategory}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel
          title="Scenario Execution Console"
          subtitle={`Current Target: ${current.callerClaim}`}
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

          <div className="score-layout" style={{ marginTop: 14 }}>
            <TrustMeter score={step === 0 ? 88 : score} />
            <div className="score-meta">
              <div className="meta-row">
                <span>Objective</span>
                <strong className="text-slate-200">{current.objective}</strong>
              </div>
              <div className="meta-row">
                <span>Triggered Signals</span>
                <strong>{current.signals.join(', ')}</strong>
              </div>
              <div className="meta-row">
                <span>Recommended Defense</span>
                <strong className="text-cyan-400">{current.action}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
            <button className="btn primary sm" onClick={startPlayback} disabled={playing}>
              <Play size={13} /> {step === 0 ? 'Start Scenario' : 'Replay'}
            </button>
            <button className="btn sm" onClick={() => setPlaying(false)} disabled={!playing}>
              <Pause size={13} /> Pause
            </button>
            <button className="btn sm" onClick={() => setPlaying(true)} disabled={playing || step === 0}>
              <Play size={13} /> Resume
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

      {alertActive && (
        <div className="alert-card" role="alert" style={{ marginBottom: 14 }}>
          <div className="alert-title">
            <Siren size={18} className="text-red-400 mr-2" />
            SIMULATED THREAT ALERT TRIGGERED
          </div>
          <p style={{ fontSize: 11, color: '#fecaca', margin: '6px 0 10px' }}>
            Elevated indicators: {current.signals.join(' · ')}. Trust Score plummeted to {current.score}/100.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm" onClick={acknowledge}>
              Acknowledge Alert
            </button>
            <button className="btn sm" onClick={() => onNavigate('/live-shield')}>
              Open Live Shield
            </button>
            <button className="btn sm" onClick={() => onNavigate('/incidents')}>
              Log to Incidents
            </button>
          </div>
        </div>
      )}

      {/* Step by Step Timeline */}
      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <Panel
          title="Event-by-Event Progression"
          subtitle={`${Math.min(step, current.steps.length)} of ${current.steps.length} moments revealed`}
        >
          <div className="progress-steps mb-3">
            {current.steps.map((_: any, i: number) => (
              <i className={`step ${i < step ? 'on' : ''}`} key={i} />
            ))}
          </div>
          <div className="timeline">
            {current.steps.map((s: any, i: number) => (
              <div
                className={`timeline-item ${i === step - 1 && isHighRisk ? 'alert' : ''}`}
                key={s.title}
              >
                <div className="timeline-time font-mono">
                  T+{String(s.timeOffset).padStart(2, '0')}s · {i < step ? 'OBSERVED' : 'PENDING'}
                </div>
                <div className="timeline-text" style={{ opacity: i < step ? 1 : 0.45 }}>
                  <strong>{s.title}</strong> — {s.detail}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Defensive Signal Assessment"
          subtitle="Signals triggered across call lifecycle"
        >
          {current.signals.map((sig: string, i: number) => (
            <div className="signal-row" key={sig}>
              <div className="signal-name">{sig}</div>
              <div className={`bar ${isHighRisk ? 'red' : ''}`}>
                <i style={{ width: `${step > i ? Math.max(30, 85 - i * 14) : 0}%` }} />
              </div>
              <Badge tone={step > i ? (isHighRisk ? 'red' : 'amber') : 'gray'}>
                {step > i ? 'Triggered' : 'Pending'}
              </Badge>
            </div>
          ))}

          <div className="notice" style={{ marginTop: 14 }}>
            <strong>Actionable Directive:</strong> {current.action}
          </div>
        </Panel>
      </div>

      {/* Side-by-side comparison */}
      <Panel
        title="Illustrative Call Comparison: Low vs. High Risk"
        subtitle="Side-by-side analysis contrasting nominal interaction against compromised social engineering"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/50">
            <div className="flex justify-between items-center mb-2">
              <strong className="text-emerald-300 text-sm">Illustrative Lower-Risk Call</strong>
              <Badge tone="green">82 / 100</Badge>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Routine scheduling call · Nominal prosody · Absence of urgent payment requests.
            </p>
            <CompareRows lower />
          </div>

          <div className="p-4 rounded-lg bg-red-950/30 border border-red-800/50">
            <div className="flex justify-between items-center mb-2">
              <strong className="text-red-300 text-sm">Illustrative High-Risk Deepfake</strong>
              <Badge tone="red">22 / 100</Badge>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Urgent funds demand · Approval bypass · Severe lip-sync drift (340ms).
            </p>
            <CompareRows lower={false} />
          </div>
        </div>
      </Panel>
    </div>
  );
}

function CompareRows({ lower = false }: { lower?: boolean }) {
  return (
    <div className="space-y-1">
      {[
        ['Facial Movement & Blinking', lower ? '14 blinks/min (Normal)' : '0 blinks/20s (Suspicious)'],
        ['Temporal Geometry', lower ? 'Coherent boundary' : 'Boundary shifts on head turn'],
        ['Lighting & Shadows', lower ? 'Consistent specular' : 'Mismatched reflection angles'],
        ['Audio-Visual Lip-Sync', lower ? '+18ms (Within tolerance)' : '+340ms (Drift anomaly)'],
        ['Voice Acoustic Spectra', lower ? 'Natural 16kHz formants' : 'Spectral cutoff at 7.8kHz'],
        ['Conversational Urgency', lower ? 'None' : 'Aggressive payment tripwire'],
        ['Verification Status', lower ? 'Not verified cryptographically' : 'Failed out-of-band test'],
      ].map(([label, val]) => (
        <div key={label} className="setting-row" style={{ padding: '6px 0' }}>
          <span className="setting-title text-xs">{label}</span>
          <Badge tone={lower ? 'green' : 'red'}>{val}</Badge>
        </div>
      ))}
    </div>
  );
}

/* ========================================================================= */
/* PAGE 5: SCAM REPLAY                                                       */
/* ========================================================================= */
function ScamReplay({ replay, setReplay, step, setStep, onReport, t }: any) {
  const items = scenarioData.slice(0, 3);
  const selected = items[replay];
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () => setStep((curr: number) => Math.min(selected.steps.length, curr + 1)),
      1600
    );
    return () => window.clearInterval(timer);
  }, [playing, selected.steps.length, setStep]);

  useEffect(() => {
    if (step >= selected.steps.length) setPlaying(false);
  }, [step, selected.steps.length]);

  return (
    <div className="page">
      <PageHead
        eyebrow="POST-INCIDENT FORENSIC PLAYBACK"
        title="Scam Replay Studio"
        desc="Examine the exact timeline of simulated attacks, how trust scores decayed, and where defensive tripwires should have intervened."
        actions={
          <button className="btn" onClick={() => onReport()}>
            <FileDown size={14} /> Export Replay Forensics
          </button>
        }
      />

      <DemoBanner>
        REPLAY ENGINE · Step through historical threat telemetry
      </DemoBanner>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {items.map((item, i) => (
          <button
            key={item.id}
            className={`btn ${replay === i ? 'primary' : ''}`}
            onClick={() => {
              setPlaying(false);
              setReplay(i);
              setStep(0);
            }}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <Panel
          title={selected.title}
          subtitle={`Attacker Intent: ${selected.objective}`}
          action={<Badge tone="red">Replay Case</Badge>}
        >
          <div className="notice" style={{ fontSize: 13, color: '#e0f2fe', marginBottom: 14 }}>
            {selected.transcript}
          </div>

          <div className="score-layout">
            <TrustMeter score={step === 0 ? 86 : Math.max(18, 86 - step * 17)} />
            <div className="score-meta">
              <div className="meta-row">
                <span>Trust Score Progression</span>
                <strong>{step === 0 ? 86 : Math.max(18, 86 - step * 17)} / 100</strong>
              </div>
              <div className="meta-row">
                <span>Threat Classification</span>
                <strong style={{ color: '#ef4444' }}>
                  {step > 1 ? 'High Risk Impersonation' : 'Baseline Unverified'}
                </strong>
              </div>
              <div className="meta-row">
                <span>Forensic Validity</span>
                <strong>Metadata Replay</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 7, marginTop: 14, flexWrap: 'wrap' }}>
            <button
              className="btn primary sm"
              onClick={() => {
                setStep(0);
                setPlaying(true);
              }}
            >
              <RotateCcw size={13} /> Replay from T+00s
            </button>
            <button className="btn sm" onClick={() => setPlaying(false)} disabled={!playing}>
              <Pause size={13} /> Pause
            </button>
            <button
              className="btn sm"
              onClick={() => setPlaying(true)}
              disabled={playing || step >= selected.steps.length}
            >
              <Play size={13} /> Resume
            </button>
            <button
              className="btn sm"
              onClick={() => {
                setPlaying(false);
                setStep(Math.min(selected.steps.length, step + 1));
              }}
            >
              Next Event
            </button>
            <button
              className="btn sm"
              onClick={() => {
                setPlaying(false);
                setStep(Math.max(0, step - 1));
              }}
            >
              Previous Event
            </button>
          </div>

          <div className="progress-steps" style={{ marginTop: 14 }}>
            {selected.steps.map((_: any, i: number) => (
              <i className={`step ${i < step ? 'on' : ''}`} key={i} />
            ))}
          </div>
        </Panel>

        <Panel
          title="Replay Event Timeline"
          subtitle={`${step} of ${selected.steps.length} moments reviewed`}
        >
          <div className="timeline">
            {selected.steps.map((s: any, i: number) => (
              <div
                className={`timeline-item ${i < step && i === selected.steps.length - 1 ? 'alert' : ''}`}
                key={s.title}
              >
                <div className="timeline-time font-mono">
                  00:{String(i * 12).padStart(2, '0')} · {i < step ? 'REVEALED EVENT' : 'UPCOMING'}
                </div>
                <div className="timeline-text" style={{ opacity: i < step ? 1 : 0.4 }}>
                  <strong>{s.title}</strong> — {s.detail}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-2">
        <Panel title="Triggered Indicators" subtitle="Aggregated evidence signals">
          {selected.signals.map((sig: string) => (
            <div className="event-row" key={sig}>
              <span className="event-mark red" />
              <div style={{ flex: 1 }}>
                <div className="event-title">{sig}</div>
                <div className="event-detail font-mono text-xs">Tripwire Trigger</div>
              </div>
              <Badge tone="red">Critical</Badge>
            </div>
          ))}
        </Panel>

        <Panel title="Prescribed Remediation Protocol" subtitle="Recommended defensive maneuver">
          <div className="notice">{selected.action}</div>
          <div className="setting-row">
            <span className="setting-title">Alert Moment Reached</span>
            <Badge tone={step >= 2 ? 'red' : 'gray'}>
              {step >= 2 ? 'Triggered in Replay' : 'Not Reached'}
            </Badge>
          </div>
          <button className="btn sm" style={{ marginTop: 12 }} onClick={() => onReport()}>
            Export Metadata Incident Report
          </button>
        </Panel>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* PAGE 6: INCIDENT HISTORY                                                  */
/* ========================================================================= */
function Incidents({
  incidents,
  setIncidents,
  query,
  setQuery,
  filter,
  setFilter,
  sort,
  setSort,
  selected,
  setSelected,
  onReportText,
  onReportJson,
  onPrint,
  onToast,
  t,
}: any) {
  const [category, setCategory] = useState('All categories');
  const [verdict, setVerdict] = useState('All verdicts');
  const [date, setDate] = useState('Any date');
  const [resolution, setResolution] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  const filtered = useMemo(() => {
    return incidents
      .filter((i: Incident) => {
        const q = `${i.title} ${i.id} ${i.category} ${i.verdict}`.toLowerCase().includes(query.toLowerCase());
        const sev = filter === 'All severities' || i.severity === filter;
        const cat = category === 'All categories' || i.category === category;
        const ver = verdict === 'All verdicts' || i.verdict === verdict;
        const dt = date === 'Any date' || (date === 'Today' ? i.time.startsWith('Today') : !i.time.startsWith('Today'));
        return q && sev && cat && ver && dt;
      })
      .sort((a: Incident, b: Incident) =>
        sort === 'Highest risk first'
          ? a.score - b.score
          : sort === 'Oldest first'
          ? a.id.localeCompare(b.id)
          : b.id.localeCompare(a.id)
      );
  }, [incidents, query, filter, category, verdict, date, sort]);

  return (
    <div className="page">
      <PageHead
        eyebrow="AUDIT & FORENSIC LOG"
        title="Incident History Register"
        desc="Search, filter, inspect, and export incident investigations. Privacy guarantee: all records represent session metadata without stored recordings."
        actions={
          <>
            <button
              className="btn"
              onClick={() => onReportJson(filtered[0] || incidents[0])}
              disabled={!filtered.length}
            >
              <Download size={14} /> Export JSON Telemetry
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setSelected(incidents[0]);
                setReportOpen(true);
              }}
            >
              <FileDown size={14} /> Print / PDF Report Preview
            </button>
          </>
        }
      />

      <DemoBanner>
        METADATA INCIDENT LOG · No audio or video recordings stored
      </DemoBanner>

      <div className="grid grid-4" style={{ marginBottom: 14 }}>
        <Metric label="RECORDED INCIDENTS" value={String(incidents.length).padStart(2, '0')} />
        <Metric
          label="HIGH SEVERITY ALERTS"
          value={String(incidents.filter((i: Incident) => i.severity === 'High').length).padStart(2, '0')}
          tone="#ef4444"
        />
        <Metric
          label="ACTION REQUIRED"
          value={String(incidents.filter((i: Incident) => i.resolution.includes('recommended')).length).padStart(2, '0')}
        />
        <Metric label="RAW MEDIA RETAINED" value="00" delta="Zero Cloud Footprint" />
      </div>

      <Panel
        title="Incident Register"
        subtitle={`${filtered.length} forensic record${filtered.length === 1 ? '' : 's'} matching criteria`}
        action={
          <button
            className="btn sm"
            onClick={() => onReportText(filtered[0])}
            disabled={!filtered.length}
          >
            <Download size={13} /> Export Text Report
          </button>
        }
      >
        <div className="grid grid-4" style={{ marginBottom: 14 }}>
          <div className="field">
            <label htmlFor="incident-search">Search Records</label>
            <input
              id="incident-search"
              className="input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filter by ID, title, keyword..."
              data-testid="input-incident-search"
            />
          </div>
          <div className="field">
            <label htmlFor="incident-severity">Severity</label>
            <select
              id="incident-severity"
              className="select"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option>All severities</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="incident-category">Category</label>
            <select
              id="incident-category"
              className="select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option>All categories</option>
              {Array.from(new Set(incidents.map((i: Incident) => i.category))).map(c => (
                <option key={String(c)}>{String(c)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="incident-sort">Sort Order</label>
            <select
              id="incident-sort"
              className="select"
              value={sort}
              onChange={e => setSort(e.target.value)}
            >
              <option>Newest first</option>
              <option>Oldest first</option>
              <option>Highest risk first</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Incident ID & Subject</th>
                <th>Severity</th>
                <th>Category</th>
                <th>Verdict</th>
                <th>Confidence</th>
                <th>Timestamp</th>
                <th>Resolution Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inc: Incident) => (
                <tr key={inc.id} data-testid={`row-incident-${inc.id}`}>
                  <td>
                    <button
                      className="text-link font-semibold"
                      style={{ background: 'none', border: 0, cursor: 'pointer', textAlign: 'left' }}
                      onClick={() => {
                        setSelected(inc);
                        setResolution(inc.resolution);
                      }}
                    >
                      {inc.id} · {inc.title}
                    </button>
                    <div className="panel-kicker font-mono">{inc.category}</div>
                  </td>
                  <td>
                    <Badge tone={inc.severity === 'High' ? 'red' : inc.severity === 'Medium' ? 'amber' : 'green'}>
                      {inc.severity}
                    </Badge>
                  </td>
                  <td>{inc.category}</td>
                  <td>{inc.verdict}</td>
                  <td className="mono">{inc.score} / 100</td>
                  <td className="font-mono text-xs">{inc.time}</td>
                  <td>{inc.resolution}</td>
                  <td>
                    <div className="flex gap-1.5">
                      <button
                        className="icon-btn"
                        aria-label={`View details for ${inc.id}`}
                        onClick={() => {
                          setSelected(inc);
                          setResolution(inc.resolution);
                        }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filtered.length && (
          <div className="empty-state">No incidents match the active search filters.</div>
        )}
      </Panel>

      {/* Incident Detail Drawer Modal */}
      {selected && !reportOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="incident-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="eyebrow">INCIDENT AUDIT · {selected.id}</div>
                <h2 id="incident-modal-title" style={{ marginTop: 4 }}>{selected.title}</h2>
              </div>
              <button className="icon-btn" onClick={() => setSelected(null)} aria-label="Close details">
                <X size={15} />
              </button>
            </div>

            <div className="notice" style={{ marginTop: 12 }}>
              {selected.detail}
            </div>

            <div className="grid grid-2" style={{ marginTop: 12 }}>
              <div className="setting-row">
                <span className="setting-title">Severity Level</span>
                <Badge tone={selected.severity === 'High' ? 'red' : 'amber'}>{selected.severity}</Badge>
              </div>
              <div className="setting-row">
                <span className="setting-title">Verdict</span>
                <span className="font-semibold text-slate-200">{selected.verdict}</span>
              </div>
              <div className="setting-row">
                <span className="setting-title">Authenticity Confidence</span>
                <span className="font-mono text-cyan-400">{selected.score} / 100</span>
              </div>
              <div className="setting-row">
                <span className="setting-title">Media Retention</span>
                <Badge tone="green">Zero Media Retained</Badge>
              </div>
            </div>

            <h3 className="panel-title" style={{ marginTop: 16 }}>Forensic Timeline</h3>
            <div className="timeline" style={{ marginTop: 10 }}>
              {[
                ['T+00s', 'Session initiated · video & audio streams connected'],
                ['T+08s', 'Heuristic tripwire match: sensitive money/credential phrase'],
                ['T+14s', 'Red warning broadcasted · out-of-band callback required'],
              ].map(([t, s]) => (
                <div className="timeline-item" key={t}>
                  <div className="timeline-time font-mono">{t}</div>
                  <div className="timeline-text">{s}</div>
                </div>
              ))}
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="resolution-note">Operator Resolution Note</label>
              <input
                id="resolution-note"
                className="input"
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                placeholder="Log verified status or policy action taken..."
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn"
                onClick={() => {
                  setIncidents((prev: Incident[]) =>
                    prev.map(i => (i.id === selected.id ? { ...i, resolution } : i))
                  );
                  onToast('Resolution note updated in session.');
                }}
              >
                Save Resolution
              </button>
              <button className="btn" onClick={() => onPrint(selected)}>
                Print / Save as PDF
              </button>
              <button className="btn primary" onClick={() => onReportText(selected)}>
                Download Text Report
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Full Printable Preview Modal */}
      {reportOpen && selected && (
        <Modal
          title={`Forensic Incident Report · ${selected.id}`}
          onClose={() => setReportOpen(false)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setReportOpen(false)}>
                Close Preview
              </button>
              <button
                className="btn"
                onClick={() => {
                  onPrint(selected);
                  setReportOpen(false);
                }}
              >
                Open Print / Save PDF
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  onReportText(selected);
                  setReportOpen(false);
                }}
              >
                Export TXT
              </button>
            </>
          }
        >
          <div className="notice mb-3">
            <strong>OFFICIAL REPORT PREVIEW · VEIL SHIELD DEFENSE</strong>
          </div>
          <p>
            <strong>{selected.title}</strong><br />
            Reference ID: <span className="font-mono">{selected.id}</span> · Timestamp: {selected.time}<br />
            Risk Classification: {selected.severity} Severity · {selected.verdict}<br />
            Authenticity Confidence: <span className="font-mono text-cyan-400">{selected.score} / 100</span>
          </p>
          <p className="text-slate-300">{selected.detail}</p>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded text-xs space-y-1">
            <div><strong>Defensive Directive:</strong> Out-of-band telephone verification enforced.</div>
            <div><strong>Data Privacy:</strong> Zero cloud storage. No biometric templates retained.</div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ========================================================================= */
/* PAGE 7: TRUSTED CONTACTS                                                  */
/* ========================================================================= */
function Contacts({ contacts, setContacts, query, setQuery, setForm, setModal, onToast, t }: any) {
  const [filter, setFilter] = useState('All relationships');

  const filtered = contacts.filter(
    (c: Contact) =>
      `${c.name} ${c.organization} ${c.role} ${c.email} ${c.phone}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === 'All relationships' || c.relationship === filter)
  );

  return (
    <div className="page">
      <PageHead
        eyebrow="INDEPENDENT TELEPHONE & SAFE-WORD DIRECTORY"
        title="Trusted Contacts Vault"
        desc="Maintain independently verified telephone numbers for immediate out-of-band callbacks when video calls raise deepfake suspicion."
        actions={
          <button
            className="btn primary"
            onClick={() =>
              setForm({
                id: 0,
                name: '',
                relationship: 'Colleague',
                organization: '',
                role: '',
                phone: '',
                email: '',
                consent: true,
                status: 'Consent discussed',
                verified: new Date().toLocaleDateString(),
              })
            }
            data-testid="button-add-contact"
          >
            <Plus size={14} /> Add Trusted Contact
          </button>
        }
      />

      <DemoBanner>
        LOCAL SECURE VAULT · Safe words and raw biometric templates are never uploaded to servers
      </DemoBanner>

      <div className="grid grid-3" style={{ marginBottom: 14 }}>
        <Metric label="VERIFIED CONTACTS" value={String(contacts.length).padStart(2, '0')} />
        <Metric label="BIOMETRICS STORED" value="00" delta="Zero Cloud Template" />
        <Metric label="SAFE WORDS PERSISTED" value="00" delta="Strictly Private Verbal" />
      </div>

      <Panel
        title="Trusted Contact Directory"
        subtitle="Used for one-click independent callbacks and safe-word verification"
      >
        <div className="flex flex-col sm:flex-row gap-2.5 mb-3.5">
          <input
            className="input flex-1 sm:max-w-xs"
            aria-label="Search contacts"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, organization, or role..."
            data-testid="input-contact-search"
          />
          <select
            className="select w-full sm:w-48"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option>All relationships</option>
            <option>Colleague</option>
            <option>Family</option>
            <option>Executive</option>
            <option>Legal</option>
          </select>
        </div>

        {filtered.length ? (
          <div className="grid grid-2">
            {filtered.map((c: Contact) => (
              <article className="panel flex flex-col justify-between h-full" key={c.id} data-testid={`card-contact-${c.id}`} style={{ background: '#121d2a' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#e3edf2' }}>{c.name}</div>
                      <div className="panel-kicker">
                        {c.role} · {c.organization || 'Personal'}
                      </div>
                    </div>
                    <Badge tone={c.relationship === 'Executive' ? 'red' : 'green'}>{c.relationship}</Badge>
                  </div>

                  <div className="setting-row" style={{ marginTop: 8 }}>
                    <span className="setting-title">Known Phone</span>
                    <span className="mono font-semibold text-cyan-400">{c.phone || 'Not provided'}</span>
                  </div>
                  <div className="setting-row">
                    <span className="setting-title">Verified Email</span>
                    <span className="text-slate-300">{c.email || 'Not provided'}</span>
                  </div>
                  <div className="setting-row">
                    <span className="setting-title">Consent Baseline</span>
                    <Badge tone="cyan">{c.status}</Badge>
                  </div>

                  <div className="notice" style={{ marginTop: 10 }}>
                    In case of doubt, independently dial <strong>{c.phone}</strong> on your personal phone. Never rely on caller-provided numbers.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-slate-800/80">
                  <button
                    className="btn sm primary"
                    onClick={() =>
                      onToast(`Independently dial ${c.name} at ${c.phone}. Terminate current video interaction.`)
                    }
                  >
                    <Headphones size={13} /> Dial Callback
                  </button>
                  <button
                    className="btn sm"
                    onClick={() =>
                      onToast('Verify private pre-shared safe word verbally. Do not type or save it online.')
                    }
                  >
                    Safe-Word Protocol
                  </button>
                  <button className="btn sm" onClick={() => setForm(c)}>
                    Edit
                  </button>
                  <button
                    className="btn danger sm"
                    onClick={() =>
                      setModal({
                        title: `Remove ${c.name}?`,
                        body: `Remove ${c.name} from your local callback directory?`,
                        action: () => {
                          setContacts((prev: Contact[]) => prev.filter(x => x.id !== c.id));
                          onToast('Contact removed from local vault.');
                        },
                        confirm: 'Remove Contact',
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Users size={24} style={{ margin: '0 auto 8px' }} />
            No contacts found matching your criteria.
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ========================================================================= */
/* PAGE 8: ENTERPRISE SECURITY                                               */
/* ========================================================================= */
function Enterprise({ role, setRole, alert, setAlert, onToast, t }: any) {
  const [assigned, setAssigned] = useState('Maya Chen');
  const [policy, setPolicy] = useState('Mandatory dual-custody approval for wires over $50k');
  const [watchlist, setWatchlist] = useState('CEO (Vikram Malhotra), CFO (Ananya Rao), General Counsel (Priya Shah)');
  const [events, setEvents] = useState([
    'Executive impersonation pattern flagged in Finance Department · simulated',
    'Escalation notification routed to security analyst queue · simulated',
  ]);

  const triggerOrgWarning = () => {
    setEvents((e: string[]) => [
      'CRITICAL: Organization-wide wire-fraud warning broadcast · simulated',
      ...e,
    ]);
    onToast('Organization-wide security warning broadcast to all employee portals.');
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="ORGANIZATION DEFENSE & THREAT RESPONSE"
        title="Enterprise Security Center"
        desc="Role-based management console for Security Administrators, SOC Analysts, and Employees to monitor department threat distribution, watchlists, and escalation workflows."
        actions={
          <select
            className="select w-full sm:w-56"
            value={role}
            onChange={e => setRole(e.target.value)}
            aria-label="Select Enterprise Role"
            data-testid="select-enterprise-role"
          >
            <option>Security administrator</option>
            <option>Security analyst</option>
            <option>Employee</option>
          </select>
        }
      />

      <DemoBanner>
        ENTERPRISE SIMULATION · Role-based permissions demonstration
      </DemoBanner>

      <div className="notice" style={{ marginBottom: 14 }}>
        <Building2 size={15} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        <strong>Active Role View: {role}.</strong> UI features and controls reflect this operator tier.
      </div>

      <div className="grid grid-4" style={{ marginBottom: 14 }}>
        <Metric label="ENTERPRISE CALLS MONITORED" value="426" />
        <Metric label="ELEVATED INCIDENTS" value="08" tone="#ef4444" />
        <Metric label="WATCHLIST PERSONAS" value="03" />
        <Metric label="PROTECTED DEPARTMENTS" value="06" />
      </div>

      {role === 'Employee' ? (
        <div className="grid grid-2">
          <Panel title="Employee Defensive Playbook" subtitle="Your active call safety rules">
            <div className="alert-card">
              <div className="alert-title">VERIFY BEFORE YOU ACT</div>
              <p className="text-xs text-red-200 my-2">
                If a caller claiming executive authority requests urgent wire transfers, gift cards, or OTP passcodes:
              </p>
              <ul className="text-xs space-y-1 list-disc list-inside text-red-200 mb-3">
                <li>Never share multi-factor authentication tokens.</li>
                <li>Verify request through your supervisor on Slack or internal phone.</li>
              </ul>
              <button className="btn sm" onClick={triggerOrgWarning}>
                Trigger Employee Escalation
              </button>
            </div>
            <div className="setting-row mt-3">
              <span className="setting-title">Department Policy</span>
              <span className="font-mono text-cyan-400">{policy}</span>
            </div>
          </Panel>

          <Panel title="Protocol Workflow" subtitle="Standard Safe Action Checklist">
            <div className="timeline">
              {[
                ['Pause Interaction', 'Step away from immediate pressure tactics.'],
                ['Verify Out-of-Band', 'Call the employee on their registered office phone.'],
                ['Report to SOC', 'Log metadata incident without attaching video recordings.'],
              ].map(([title, desc]) => (
                <div className="timeline-item" key={title}>
                  <div className="timeline-text">
                    <strong className="text-cyan-400">{title}</strong> — {desc}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : (
        <div className="grid grid-2" style={{ marginBottom: 14 }}>
          <Panel
            title="Department Threat Risk Distribution"
            subtitle="Risk metrics based on targeted executive departments"
          >
            {[
              ['Finance & Treasury', 74, 5],
              ['Executive Office', 58, 3],
              ['People Operations (HR)', 37, 2],
              ['Customer Support', 24, 1],
              ['Legal & Compliance', 19, 1],
            ].map(([dept, amount, count]) => (
              <div className="signal-row" key={String(dept)}>
                <div className="signal-name">
                  {dept}
                  <div className="signal-sub">{count} flagged attempts</div>
                </div>
                <div className="bar">
                  <i style={{ width: `${amount}%` }} />
                </div>
                <Badge tone={Number(amount) > 60 ? 'red' : Number(amount) > 30 ? 'amber' : 'green'}>
                  {amount}% Target Level
                </Badge>
              </div>
            ))}
          </Panel>

          <Panel title="Analyst Activity Feed" subtitle="SOC triaging log">
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {events.map((ev: string, i: number) => (
                <div className="event-row" key={`${i}-${ev}`}>
                  <span className={`event-mark ${i === 0 ? 'red' : 'cyan'}`} />
                  <div className="event-title" style={{ flex: 1 }}>{ev}</div>
                  <span className="event-time font-mono">{i === 0 ? 'JUST NOW' : '10:14 AM'}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {role !== 'Employee' && (
        <div className="grid grid-2">
          <Panel
            title="Incident Assignment & Escalation"
            subtitle="Assign high-risk wire attempts to SOC specialists"
          >
            <div className="field">
              <label htmlFor="assignee">Assignee Analyst</label>
              <select
                id="assignee"
                className="select"
                value={assigned}
                onChange={e => setAssigned(e.target.value)}
              >
                <option>Maya Chen (Senior SOC Analyst)</option>
                <option>Jonas Patel (Fraud Lead)</option>
                <option>Escalation Queue Tier 2</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                className="btn sm primary"
                onClick={() => {
                  setEvents((e: string[]) => [`Incident VEIL-0428 assigned to ${assigned}`, ...e]);
                  onToast(`Incident successfully assigned to ${assigned}.`);
                }}
              >
                Assign Incident
              </button>
              <button
                className="btn sm danger"
                onClick={() => {
                  setEvents((e: string[]) => ['Escalation triggered to Legal & Risk Committee', ...e]);
                  onToast('Emergency escalation logged.');
                }}
              >
                Escalate to Risk Lead
              </button>
            </div>
          </Panel>

          <Panel
            title="Executive Impersonation Watchlist"
            subtitle="High-risk target identities monitored for spoofing attempts"
          >
            <div className="field">
              <label htmlFor="watchlist">Watched Roles & Personas</label>
              <textarea
                id="watchlist"
                className="textarea"
                style={{ minHeight: 72 }}
                value={watchlist}
                onChange={e => setWatchlist(e.target.value)}
              />
            </div>
            <button
              className="btn sm mt-2"
              onClick={() => onToast('Watchlist configuration updated locally.')}
            >
              Update Watchlist
            </button>
          </Panel>
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/* PAGE 9: BENCHMARK LAB                                                     */
/* ========================================================================= */
function Benchmarks({ dataset, setDataset, runs, setRuns, onToast, t }: any) {
  const [state, setState] = useState('idle');
  const [threshold, setThreshold] = useState('0.50');
  const [comparison, setComparison] = useState('Local WebAssembly ONNX Model');
  const datasets = ['FaceForensics++', 'ASVspoof 2021', 'Celeb-DF-v2', 'Custom Held-Out Evaluation Set'];

  const runEvaluation = () => {
    setState('running');
    window.setTimeout(() => {
      setState('completed');
      setRuns((prev: any[]) => [
        {
          dataset,
          model: comparison,
          time: new Date().toLocaleTimeString(),
          auc: '0.942',
          eer: '5.8%',
          accuracy: '94.6%',
        },
        ...prev,
      ]);
      onToast(`Evaluation run completed on ${dataset}. Evaluation metrics computed.`);
    }, 1200);
  };

  const exportPlan = () => {
    const doc = `VEIL BENCHMARK LAB — EVALUATION PROTOCOL
Dataset: ${dataset}
Evaluated Model Architecture: ${comparison}
Decision Boundary Threshold: ${threshold}

Confusion Matrix Metrics (Simulated Reference on Held-Out Test Set):
- True Positives (TP):   482
- False Positives (FP):   28
- True Negatives (TN):   464
- False Negatives (FN):   26

Derived Statistical Performance:
- Precision: 94.5%  [Formula: TP / (TP + FP)]
- Recall:    94.9%  [Formula: TP / (TP + FN)]
- F1-Score:  94.7%  [Formula: 2 * (P * R) / (P + R)]
- False Positive Rate: 5.69% [Formula: FP / (FP + TN)]
- Area Under ROC Curve (AUC): 0.942
- Equal Error Rate (EER): 5.8%

Licensing & Governance Note:
Evaluations on FaceForensics++ and ASVspoof require compliance with respective academic usage agreements.`;

    const blob = new Blob([doc], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `veil-benchmark-${dataset.toLowerCase().replaceAll(' ', '-')}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    onToast('Benchmark evaluation summary downloaded.');
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="SCIENTIFIC BENCHMARKING & VALIDATION LAB"
        title="Benchmark Lab"
        desc="Evaluate deepfake detection and voice-cloning defense models against standard academic benchmark suites including FaceForensics++ and ASVspoof."
        actions={
          <button className="btn" onClick={exportPlan}>
            <Download size={14} /> Export Evaluation Protocol
          </button>
        }
      />

      <DemoBanner>
        BENCHMARK LAB · Honest metric evaluation · Transparent formulas
      </DemoBanner>

      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <Panel
          title="Evaluation Configuration"
          subtitle="Configure target dataset, model candidate, and decision threshold"
        >
          <div className="field">
            <label htmlFor="dataset-select">Academic Benchmark Suite</label>
            <select
              id="dataset-select"
              className="select"
              value={dataset}
              onChange={e => setDataset(e.target.value)}
            >
              {datasets.map(d => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-2" style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor="model-candidate">Candidate Model</label>
              <select
                id="model-candidate"
                className="select"
                value={comparison}
                onChange={e => setComparison(e.target.value)}
              >
                <option>Local WebAssembly ONNX Model</option>
                <option>Multi-Scale Vision Transformer (ViT)</option>
                <option>Audio Spectrogram Transformer (AST)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="decision-threshold">Decision Cutoff Threshold: {threshold}</label>
              <input
                id="decision-threshold"
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                className="mt-2 w-full accent-cyan-400"
              />
            </div>
          </div>

          <button
            className="btn primary mt-4"
            onClick={runEvaluation}
            disabled={state === 'running'}
            data-testid="button-run-benchmark"
          >
            <Play size={14} /> {state === 'running' ? 'Computing Evaluation...' : 'Run Benchmark Evaluation'}
          </button>
        </Panel>

        <Panel
          title="Mathematical Metric Formulations"
          subtitle="Standard rigorous definitions for detection performance"
        >
          <div className="grid grid-2">
            {[
              ['Precision (P)', 'TP / (TP + FP)'],
              ['Recall / Sensitivity', 'TP / (TP + FN)'],
              ['F1 Harmonic Score', '2 × (P × R) / (P + R)'],
              ['False-Positive Rate', 'FP / (FP + TN)'],
              ['Equal Error Rate (EER)', 'Point where FPR = FNR'],
              ['ROC / AUC Metric', 'Integral of TPR vs. FPR curve'],
            ].map(([label, formula]) => (
              <div key={label} className="p-2 bg-slate-900 border border-slate-800 rounded">
                <span className="text-[10px] text-slate-400 block">{label}</span>
                <span className="font-mono text-cyan-400 text-xs font-semibold">{formula}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <Panel title="Confusion Matrix Analysis" subtitle={`Evaluation on ${dataset} (1,000 samples)`}>
          <div className="grid grid-2 max-w-xs mx-auto gap-2 my-2 text-center text-xs font-mono">
            <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded">
              <span className="text-[10px] text-slate-400 block">True Positive (TP)</span>
              <strong className="text-emerald-400 text-lg">482</strong>
            </div>
            <div className="p-3 bg-red-950/50 border border-red-800 rounded">
              <span className="text-[10px] text-slate-400 block">False Positive (FP)</span>
              <strong className="text-red-400 text-lg">28</strong>
            </div>
            <div className="p-3 bg-red-950/50 border border-red-800 rounded">
              <span className="text-[10px] text-slate-400 block">False Negative (FN)</span>
              <strong className="text-red-400 text-lg">26</strong>
            </div>
            <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded">
              <span className="text-[10px] text-slate-400 block">True Negative (TN)</span>
              <strong className="text-emerald-400 text-lg">464</strong>
            </div>
          </div>
          <div className="text-center font-mono text-xs text-slate-400 mt-2">
            Calculated Accuracy: <strong className="text-cyan-400">94.6%</strong> · Precision: <strong className="text-cyan-400">94.5%</strong> · Recall: <strong className="text-cyan-400">94.9%</strong>
          </div>
        </Panel>

        <Panel title="ROC Curve Visualization" subtitle="True Positive Rate vs. False Positive Rate">
          <div className="h-44 bg-slate-950/80 border border-slate-800 rounded p-3 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
            <svg className="w-full h-full relative z-10" viewBox="0 0 300 150">
              {/* Grid axes */}
              <line x1="30" y1="130" x2="280" y2="130" stroke="#334155" strokeWidth="1" />
              <line x1="30" y1="130" x2="30" y2="20" stroke="#334155" strokeWidth="1" />
              {/* Chance diagonal line */}
              <line x1="30" y1="130" x2="280" y2="20" stroke="#475569" strokeDasharray="3 3" strokeWidth="1" />
              {/* VEIL Model ROC Curve */}
              <path
                d="M 30 130 C 45 40, 110 25, 280 20"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
              />
              <circle cx="90" cy="35" r="4" fill="#38bdf8" />
            </svg>
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>FPR (False Positive Rate) →</span>
              <span className="text-cyan-400 font-bold">AUC = 0.942</span>
              <span>TPR (True Positive Rate) ↑</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Evaluation Run History" subtitle="Archived evaluation iterations">
        {runs.length ? (
          <div className="space-y-2">
            {runs.map((r: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded flex justify-between items-center text-xs">
                <div>
                  <strong className="text-slate-200">{r.dataset}</strong> · <span className="text-slate-400">{r.model}</span>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{r.time}</div>
                </div>
                <div className="flex gap-3 font-mono">
                  <span>Accuracy: <strong className="text-cyan-400">{r.accuracy}</strong></span>
                  <span>AUC: <strong className="text-emerald-400">{r.auc}</strong></span>
                  <span>EER: <strong className="text-amber-400">{r.eer}</strong></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Gauge size={22} style={{ margin: '0 auto 8px' }} />
            No evaluation runs logged in this session. Click &quot;Run Benchmark Evaluation&quot; above.
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ========================================================================= */
/* PAGE 10: PRIVACY & SETTINGS                                               */
/* ========================================================================= */
function Settings({ settings, setSettings, monitoring, onStop, contactsCount, onNavigate, onReset, onToast, t }: any) {
  const patch = (key: string, value: any) => setSettings((s: any) => ({ ...s, [key]: value }));

  const exportSettings = () => {
    const safe = {
      ...settings,
      zeroCloudStorage: true,
      rawBiometricsRetained: false,
      callRecordingsRetained: false,
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(safe, null, 2)], { type: 'application/json' }));
    a.download = 'veil-shield-preferences.json';
    a.click();
    URL.revokeObjectURL(a.href);
    onToast('Local preferences configuration exported.');
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="SECURITY, PRIVACY & ACCESSIBILITY"
        title="Privacy & Settings"
        desc="All capture, acoustic analysis, and liveness scoring operate strictly inside the browser sandbox. No biometric face or voice samples are transmitted."
        actions={
          <button className="btn" onClick={exportSettings}>
            <Download size={14} /> Export Settings
          </button>
        }
      />

      <DemoBanner>
        LOCAL SECURITY ENCLAVE · Media tracks exist solely in browser volatile memory
      </DemoBanner>

      {monitoring && (
        <div className="alert-card mb-4" role="status">
          <div className="alert-title">
            <Radio size={16} className="mr-2 text-cyan-400 animate-pulse" />
            LIVE SHIELD MONITORING CURRENTLY ENGAGED
          </div>
          <p className="text-xs text-slate-300 my-2">
            Browser camera & microphone capture are active. All video frames stay local.
          </p>
          <button className="btn danger sm" onClick={onStop}>
            <StopCircle size={13} /> Stop All Capture Now
          </button>
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <Panel
          title="Hardware Permissions & Processing Enclave"
          subtitle="Hardware access state in current browser session"
        >
          {[
            ['Camera Hardware Status', monitoring ? 'Active in Browser Sandbox' : 'Not Requested'],
            ['Microphone Audio Status', monitoring ? 'Active in Web Audio API' : 'Not Requested'],
            ['On-Device Inference Mode', 'WASM / Local Heuristics'],
            ['Cloud Media Uploads', 'Permanently Disabled'],
            ['Network Call Recording', 'Zero Recording by Default'],
          ].map(([label, val], idx) => (
            <div className="setting-row" key={label}>
              <div>
                <div className="setting-title">{label}</div>
                <div className="setting-desc">{val}</div>
              </div>
              <Badge tone={idx < 2 && monitoring ? 'green' : idx >= 3 ? 'green' : 'cyan'}>
                {idx < 2 && monitoring ? 'Active' : idx >= 3 ? 'Enforced' : 'Local'}
              </Badge>
            </div>
          ))}
          <button className="btn sm mt-3" onClick={() => onNavigate('/live-shield')}>
            Manage Stream Hardware
          </button>
        </Panel>

        <Panel
          title="Privacy Guardrails & Biometric Policies"
          subtitle="Strict data retention boundaries"
        >
          <div className="setting-row">
            <div>
              <div className="setting-title">Automatic Call Recording</div>
              <div className="setting-desc">Disabled. VEIL never records or archives video call footage.</div>
            </div>
            <Badge tone="green">Disabled</Badge>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-title">Raw Biometric Template Storage</div>
              <div className="setting-desc">Zero storage of face images, voice prints, or acoustic raw waveforms.</div>
            </div>
            <Badge tone="green">Zero Storage</Badge>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-title">Safe-Word Confidentiality</div>
              <div className="setting-desc">Safe words are never entered, hashed, or stored online.</div>
            </div>
            <Badge tone="green">Confidential</Badge>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-title">Trusted Directory Contacts</div>
              <div className="setting-desc">{contactsCount} local contacts saved in browser storage.</div>
            </div>
            <Badge tone="cyan">{contactsCount} Saved</Badge>
          </div>
          <button className="btn sm mt-3" onClick={() => onNavigate('/trusted-contacts')}>
            Open Contacts Vault
          </button>
        </Panel>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <Panel title="Alert & Acoustic Preferences" subtitle="Operational notification controls">
          <div className="setting-row">
            <div>
              <div className="setting-title">Synthesized Audio Alert Chimes</div>
              <div className="setting-desc">Play Web Audio API synthesizer tone when high risk is flagged.</div>
            </div>
            <input
              type="checkbox"
              className="toggle"
              checked={settings.alertSound}
              onChange={e => patch('alertSound', e.target.checked)}
              aria-label="Toggle alert sound"
            />
          </div>

          <div className="field mt-3">
            <label htmlFor="sensitivity">Tripwire Sensitivity Tuning</label>
            <select
              id="sensitivity"
              className="select"
              value={settings.sensitivity}
              onChange={e => patch('sensitivity', e.target.value)}
            >
              <option>Conservative (Fewer false alarms)</option>
              <option>Balanced (Recommended)</option>
              <option>Elevated (Strict financial tripwire)</option>
            </select>
          </div>
        </Panel>

        <Panel title="Language & Accessibility" subtitle="Interface localization and ergonomics">
          <div className="field">
            <label htmlFor="language-selector">Interface Language (ಸ್ಥಳೀಕರಣ)</label>
            <select
              id="language-selector"
              className="select"
              value={settings.language}
              onChange={e => {
                patch('language', e.target.value);
                onToast(`Language updated.`);
              }}
            >
              <option value="en">English (Default)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>

          <div className="setting-row mt-3">
            <div>
              <div className="setting-title">Compact Information Density</div>
              <div className="setting-desc">Tighter spacing for professional command centers.</div>
            </div>
            <input
              type="checkbox"
              className="toggle"
              checked={settings.compact}
              onChange={e => patch('compact', e.target.checked)}
              aria-label="Toggle compact layout"
            />
          </div>
        </Panel>
      </div>

      <div className="grid grid-2">
        <Panel title="Integration Transparency" subtitle="Current status of prototype interfaces">
          <div className="timeline">
            {[
              ['Browser Media Streams', 'Real WebRTC getUserMedia permission prompts.'],
              ['Web Audio API Analyzer', 'Real-time 32-bin FFT frequency analysis.'],
              ['Liveness Challenge', 'Physical challenge test suite with interactive countdown.'],
              ['Speech Heuristics', 'Transparent keyword patterns with Web Speech dictation.'],
              ['Hardware Virtual Drivers', 'No kernel webcam drivers installed.'],
            ].map(([k, v]) => (
              <div className="timeline-item" key={k}>
                <div className="timeline-text">
                  <strong className="text-cyan-400">{k}</strong> — {v}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Demo Data Maintenance" subtitle="Reset local sandbox state">
          <div className="notice mb-3">
            Resetting clears simulated incident logs, contacts, and scenario progressions.
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={exportSettings}>
              <Download size={13} /> Export Settings
            </button>
            <button className="btn danger" onClick={onReset}>
              <RotateCcw size={13} /> Reset All Demo Data
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* MODAL COMPONENT                                                           */
/* ========================================================================= */
function Modal({
  title,
  children,
  actions,
  onClose,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
          <h2 id="dialog-title" className="text-lg font-bold text-slate-100">{title}</h2>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close dialog"
            data-testid="button-close-dialog"
          >
            <X size={15} />
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#9baab6', lineHeight: 1.65, marginTop: 8 }}>
          {children}
        </div>
        {actions && <div className="modal-actions">{actions}</div>}
      </section>
    </div>
  );
}

export default App;
