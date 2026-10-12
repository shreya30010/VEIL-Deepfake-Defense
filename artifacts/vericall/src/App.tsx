import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Link, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity, AlertOctagon, AlertTriangle, ArrowRight, Bell, Building2, CheckCircle2, ChevronDown, ChevronRight,
  Download, FileDown, FileSearch, Fingerprint, Gauge, Headphones, History, Home, LockKeyhole, Menu, Pause,
  Play, Plus, Radio, RotateCcw, Search, Settings2, Shield, ShieldCheck, Siren, SlidersHorizontal, Sparkles, Square,
  StopCircle, Users, Video, X,
} from 'lucide-react';
import NotFound from '@/pages/not-found';

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
type Contact = { id: number; name: string; relationship: string; organization: string; role: string; phone: string; email: string; consent: boolean; status: string; verified: string };
type Incident = { id: string; title: string; severity: string; category: string; verdict: string; time: string; score: number; resolution: string; detail: string };
const defaultContacts: Contact[] = [
  { id: 1, name: 'Ananya Rao', relationship: 'Colleague', organization: 'Northstar Capital', role: 'Chief Financial Officer', phone: '+1 (415) 555-0184', email: 'ananya.rao@example.test', consent: true, status: 'Contact details saved', verified: '18 Jun 2025' },
  { id: 2, name: 'Ravi Menon', relationship: 'Family', organization: 'Personal', role: 'Brother', phone: '+1 (415) 555-0128', email: 'ravi.m@example.test', consent: false, status: 'Not enrolled', verified: '02 Jun 2025' },
  { id: 3, name: 'Priya Shah', relationship: 'Colleague', organization: 'Northstar Capital', role: 'General Counsel', phone: '+1 (415) 555-0171', email: 'priya.shah@example.test', consent: true, status: 'Contact details saved', verified: '14 May 2025' },
];
const defaultIncidents: Incident[] = [
  { id: 'VC-0428', title: 'Urgent executive wire request', severity: 'High', category: 'Payment request', verdict: 'Suspicious', time: 'Today, 10:42 AM', score: 24, resolution: 'Callback recommended', detail: 'Caller claimed to be the CFO and requested an urgent transfer while asking the employee to bypass the normal approval chain. This is a simulated incident.' },
  { id: 'VC-0427', title: 'Unusual lip-sync pattern', severity: 'Medium', category: 'Video anomaly', verdict: 'Needs review', time: 'Yesterday, 3:16 PM', score: 58, resolution: 'Reviewed', detail: 'Illustrative frame timing indicators and a brief transcript pressure phrase were logged in demo mode.' },
  { id: 'VC-0426', title: 'Bank account verification request', severity: 'High', category: 'Credential request', verdict: 'Suspicious', time: '18 Jun 2025, 11:08 AM', score: 19, resolution: 'Caller independently verified', detail: 'A simulated caller asked for a one-time passcode. No actual identity or account information was checked.' },
  { id: 'VC-0425', title: 'Evidence insufficient', severity: 'Low', category: 'Insufficient evidence', verdict: 'Inconclusive', time: '17 Jun 2025, 4:51 PM', score: 51, resolution: 'Closed — inconclusive', detail: 'The sample session did not contain enough usable signal for a meaningful assessment.' },
  { id: 'VC-0424', title: 'Family emergency money request', severity: 'Medium', category: 'Social engineering', verdict: 'Suspicious', time: '16 Jun 2025, 9:23 AM', score: 37, resolution: 'Callback recommended', detail: 'Illustrative urgency and secrecy language was detected in the scenario transcript.' },
];
const scenarioData = [
  { id: 'ceo', title: 'Urgent CEO wire transfer', objective: 'Move funds outside the normal approval chain.', transcript: '“I need the wire initiated right now. Keep this between us until the board call.”', score: 22, signals: ['Urgent payment request', 'Secrecy / approval bypass', 'Claimed executive identity'], verdict: 'High risk', steps: ['Caller claims CFO identity', 'Urgency language appears', 'Wire transfer requested', 'Approval bypass requested', 'High-risk warning raised'], action: 'Stop the transfer. Independently call a known company number.' },
  { id: 'bank', title: 'Fake bank OTP request', objective: 'Obtain a one-time passcode.', transcript: '“I’m from your bank’s fraud desk. Read me the code we just sent to secure your account.”', score: 18, signals: ['OTP request', 'Authority claim', 'Credential disclosure'], verdict: 'High risk', steps: ['Bank identity claimed', 'OTP requested', 'Credential warning raised'], action: 'Never share an OTP. End the call and use the number on your card.' },
  { id: 'family', title: 'Family emergency impersonation', objective: 'Trigger an emotional, immediate payment.', transcript: '“It’s me. I’m in trouble. Please send money now and don’t tell anyone yet.”', score: 31, signals: ['Urgency', 'Secrecy', 'Payment request'], verdict: 'High risk', steps: ['Emergency claim', 'Pressure language detected', 'Independent verification advised'], action: 'Pause. Contact your family member on a saved number.' },
  { id: 'warp', title: 'Facial warp demonstration', objective: 'Demonstrate a visual artifact scenario.', transcript: '“Can you see me clearly? The connection is a little unstable.”', score: 39, signals: ['Illustrative boundary shift', 'Frame consistency concern', 'Insufficient real image evidence'], verdict: 'Elevated concern', steps: ['Stream preview begins', 'Example boundary shift appears', 'Evidence confidence remains limited'], action: 'Treat visual artifacts as a prompt for verification, not proof.' },
  { id: 'voice', title: 'Cloned-voice indicators', objective: 'Demonstrate audio anomaly messaging.', transcript: '“This is your manager. I need you to approve the request immediately.”', score: 35, signals: ['Example spectral cutoff', 'Prosody concern', 'Authority pressure'], verdict: 'Elevated concern', steps: ['Audio-only sample', 'Illustrative spectral note appears', 'Voice match unavailable'], action: 'A waveform alone cannot establish voice cloning. Verify out of band.' },
  { id: 'bypass', title: 'Secrecy and approval bypass', objective: 'Get an employee to skip established controls.', transcript: '“Do not loop in legal. Skip the second approval and send the funds now.”', score: 27, signals: ['Secrecy detected', 'Approval bypass', 'Payment redirection'], verdict: 'High risk', steps: ['Secrecy phrase detected', 'Approval bypass phrase flagged', 'Warning raised'], action: 'Follow your normal approval and escalation policy.' },
  { id: 'benign', title: 'Routine project check-in', objective: 'A normal, low-pressure conversation.', transcript: '“Could you send over the revised project notes before Thursday?”', score: 82, signals: ['No payment request in sample', 'No urgency marker in sample', 'Identity not verified'], verdict: 'Lower concern', steps: ['Routine discussion', 'No heuristic tripwire found', 'Identity remains unverified'], action: 'A benign sample is not proof of identity or safety.' },
  { id: 'uncertain', title: 'Insufficient evidence', objective: 'Show an ambiguous call with missing signals.', transcript: '“Hello, can you hear me? The connection keeps dropping.”', score: 51, signals: ['Short transcript', 'No usable video sample', 'Insufficient evidence'], verdict: 'Inconclusive', steps: ['Short sample received', 'Media signal unavailable', 'Assessment remains inconclusive'], action: 'Gather more context or verify independently. Do not over-trust a score.' },
];
const signalNames = ['Face boundary & blending', 'Temporal flicker', 'Lighting & shadows', 'Blinking & gaze', 'Lip-sync alignment', 'Head-turn warping', 'Micro-saccades', 'Spectral anomalies', 'High-frequency detail', 'Vocoder artifacts', 'Prosody & breathing', 'Latency & pause patterns', 'Transcript context', 'Identity consistency'];
const threatEvents = [
  ['Suspicious lip-sync', 'Illustrative timing drift example · simulated evidence', 'amber'],
  ['Unusual facial boundary movement', 'Example mesh indicator · no live model connected', 'red'],
  ['Urgency language flagged', 'Heuristic phrase match: “right now”', 'amber'],
  ['Identity verification incomplete', 'No reference matching system is connected', 'blue'],
];
const chart = [35, 47, 39, 68, 52, 76, 59, 85, 62, 72, 49, 65];

function App() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppFrame /></WouterRouter></QueryClientProvider>;
}

function AppFrame() {
  const [path, setPath] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [streamPaused, setStreamPaused] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<{ title: string; body: string; action?: () => void; confirm?: string } | null>(null);
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try { const value = localStorage.getItem('vericall-demo-contacts'); return value ? JSON.parse(value) : defaultContacts; } catch { return defaultContacts; }
  });
  const [incidents, setIncidents] = useState<Incident[]>(defaultIncidents);
  const [alertActive, setAlertActive] = useState(false);
  const [scenario, setScenario] = useState(0);
  const [scenarioStep, setScenarioStep] = useState(0);
  const [scenarioPlaying, setScenarioPlaying] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [settings, setSettings] = useState(() => {
    try { const saved = localStorage.getItem('vericall-demo-settings'); return saved ? { alertSound: false, notifications: false, sensitivity: 'Balanced', language: 'English', compact: false, ...JSON.parse(saved) } : { alertSound: false, notifications: false, sensitivity: 'Balanced', language: 'English', compact: false }; }
    catch { return { alertSound: false, notifications: false, sensitivity: 'Balanced', language: 'English', compact: false }; }
  });
  const [firstVisit, setFirstVisit] = useState(() => !localStorage.getItem('vericall-intro-seen'));
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
  const title = routes.find(r => r.path === path)?.label || 'Overview';
  const score = path === '/attack-simulator' && scenarioPlaying ? Math.max(12, 92 - scenarioStep * 17) : path === '/attack-simulator' && scenarioStep > 0 ? currentScenario.score : 78;

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3200); };
  const resetDemo = () => {
    setScenario(0); setScenarioStep(0); setScenarioPlaying(false); setReplay(0); setReplayStep(0); setAlertActive(false); setIncidents(defaultIncidents); setTripwire(''); setChallenge(''); setChallengeStatus('Not started'); setElapsed(0);
    notify('Demo state reset. No media or biometric data was stored.');
  };
  useEffect(() => {
    if (!scenarioPlaying) return;
    const timer = window.setInterval(() => setScenarioStep(v => {
      if (v + 1 >= currentScenario.steps.length) { setScenarioPlaying(false); if (currentScenario.score < 40) { setAlertActive(true); notify('High-risk simulation alert raised.'); } return currentScenario.steps.length; }
      return v + 1;
    }), 1700);
    return () => window.clearInterval(timer);
  }, [scenarioPlaying, scenario, currentScenario.steps.length, currentScenario.score]);
  useEffect(() => {
    if (!monitoring) return;
    const timer = window.setInterval(() => setElapsed(v => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, [monitoring]);
  useEffect(() => {
    if (!challenge || challengeStatus !== 'In progress') return;
    const timer = window.setInterval(() => setChallengeSeconds(v => {
      if (v <= 1) { setChallengeStatus('Demo result: inconclusive'); return 0; }
      return v - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [challenge, challengeStatus]);
  useEffect(() => () => mediaRef.current?.getTracks().forEach(track => track.stop()), []);
  useEffect(() => { try { localStorage.setItem('vericall-demo-contacts', JSON.stringify(contacts)); } catch { /* local storage may be unavailable */ } }, [contacts]);
  useEffect(() => { try { localStorage.setItem('vericall-demo-settings', JSON.stringify(settings)); } catch { /* local storage may be unavailable */ } }, [settings]);
  const startDemo = () => { setPath('/attack-simulator'); setScenario(0); setScenarioStep(0); setScenarioPlaying(true); setAlertActive(false); notify('CEO wire-fraud simulation started.'); };
  const endMonitoring = () => {
    mediaRef.current?.getTracks().forEach(track => track.stop()); mediaRef.current = null;
    setMediaStream(null); setMonitoring(false); setStreamPaused(false); setMediaError(''); setElapsed(0); notify('Monitoring ended. Browser media tracks stopped.');
  };
  const startMonitoring = async (mode = 'Webcam + microphone', cameraId = '', microphoneId = '') => {
    setMediaError('');
    if (mode === 'Demonstration only') { setSessionMode('Simulation'); setStreamPaused(false); setMonitoring(true); notify('Simulation monitoring started. Analyses remain illustrative.'); return; }
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Browser media capture is unavailable. Use demonstration mode instead.');
      const stream = mode === 'Screen / tab'
        ? navigator.mediaDevices.getDisplayMedia
          ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
          : (() => { throw new Error('Screen and tab capture are not supported in this browser.'); })()
        : await navigator.mediaDevices.getUserMedia({
          video: mode !== 'Microphone only' ? (cameraId ? { deviceId: { exact: cameraId } } : true) : false,
          audio: mode !== 'Webcam only' ? (microphoneId ? { deviceId: { exact: microphoneId } } : true) : false,
        });
      mediaRef.current = stream;
      stream.getTracks().forEach(track => track.addEventListener('ended', () => { if (mediaRef.current === stream) { mediaRef.current = null; setMediaStream(null); setMonitoring(false); setStreamPaused(false); } }));
      setMediaStream(stream);
      setSessionMode(mode); setStreamPaused(false); setMonitoring(true); notify('Browser stream active locally. Detection models are not connected.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Permission denied or device unavailable.';
      setMediaError(message); setSessionMode('Simulation'); setMonitoring(false);
    }
  };
  const generateIncidentReport = (item?: Incident) => {
    const inc = item || incidents[0];
    const text = `VERICALL — DEMONSTRATION INCIDENT REPORT\n${inc.id} · SIMULATED SAMPLE DATA\n${inc.title}\nSeverity: ${inc.severity} | Verdict: ${inc.verdict} | Illustrative authenticity confidence: ${inc.score}/100\nTime: ${inc.time}\n\nSummary: ${inc.detail}\n\nEvidence is illustrative. No recording was made or retained. No actual identity, AI inference, or validated model performance is asserted.\nRecommended follow-up: Independently verify through known contact details; follow organizational policy.`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${inc.id}-demo-report.txt`; a.click(); URL.revokeObjectURL(a.href);
    notify('Demonstration report exported as a text file; no recording attached.');
  };
  const printIncidentReport = (item?: Incident) => {
    const inc = item || incidents[0];
    if (!inc) { notify('There is no incident report to print.'); return; }
    const reportWindow = window.open('', '_blank', 'width=820,height=960');
    if (!reportWindow) { notify('Allow pop-ups to open the print / Save as PDF workflow.'); return; }
    const doc = reportWindow.document;
    doc.title = `VeriCall demo incident report · ${inc.id}`;
    const style = doc.createElement('style');
    style.textContent = 'body{font:15px/1.6 Arial,sans-serif;color:#18232e;max-width:760px;margin:48px auto;padding:0 28px}h1{font-size:25px;margin:8px 0 16px}h2{font-size:16px;margin:26px 0 6px;border-bottom:1px solid #d6dee5;padding-bottom:5px}.eyebrow{font-size:11px;letter-spacing:.13em;color:#147b88;font-weight:700}p,li{font-size:13px}.notice{background:#edf5f6;padding:12px;border-left:3px solid #2197a6}@media print{body{margin:0 auto;padding:0 12px}}';
    const title = doc.createElement('title');
    title.textContent = doc.title;
    doc.head.replaceChildren(title, style);
    const main = doc.createElement('main');
    const add = (tag: string, text: string) => {
      const element = doc.createElement(tag);
      element.textContent = text;
      main.appendChild(element);
    };
    add('p', 'VERICALL · DEMONSTRATION INCIDENT REPORT');
    add('h1', inc.title);
    add('p', `Incident ID ${inc.id} · ${inc.time} · Sample metadata only`);
    add('h2', 'Risk assessment');
    add('p', `${inc.severity} severity · ${inc.verdict} · illustrative authenticity confidence ${inc.score}/100`);
    add('p', inc.detail);
    add('h2', 'Evidence and timeline');
    add('p', `Category: ${inc.category}. Illustrative flag timeline: sample context entered; heuristic or simulated signal noted; independent verification recommended. Session end time is not available in this sample.`);
    add('h2', 'Verification attempts and user actions');
    add('p', `No actual caller verification or phone call is asserted. Sample resolution note: ${inc.resolution}.`);
    add('h2', 'System limitations');
    add('p', 'This is simulated demonstration metadata, not genuine AI inference or validated model output. No audio or video was recorded or retained. No face, voice, or caller identity was verified.');
    add('h2', 'Recommended follow-up');
    add('p', 'Stop any suspicious interaction and independently contact a trusted person using known details. Follow normal organizational approval procedures.');
    const notice = doc.createElement('p');
    notice.className = 'notice';
    notice.textContent = 'SIMULATED SAMPLE REPORT · No recording attached or preserved.';
    main.appendChild(notice);
    doc.body.replaceChildren(main);
    reportWindow.focus();
    window.setTimeout(() => reportWindow.print(), 250);
  };
  const scanTranscript = (text: string) => {
    setTranscript(text);
    const matches = /(urgent|right now|immediately|wire|transfer|gift card|otp|one.time passcode|password|credential|secret|keep this between us|bypass|skip approval|don't tell|do not tell|bank|send money|account)/i.test(text);
    setTripwire(matches ? 'A heuristic keyword matched sensitive language. This is not proof of fraud.' : '');
  };
  const saveContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contactForm) return;
    const data = new FormData(event.currentTarget);
    const contact: Contact = {
      id: contactForm.id || Date.now(), name: String(data.get('name') || ''), relationship: String(data.get('relationship') || ''),
      organization: String(data.get('organization') || ''), role: String(data.get('role') || ''), phone: String(data.get('phone') || ''),
      email: String(data.get('email') || ''), consent: contactForm.consent, status: contactForm.status, verified: contactForm.verified,
    };
    setContacts(items => contactForm.id ? items.map(c => c.id === contactForm.id ? contact : c) : [contact, ...items]);
    setContactForm(null); notify('Trusted contact saved locally. Safe words and biometric samples are never stored.');
  };
  const goto = (next: string) => { setPath(next); setMobileOpen(false); };

  return <div className="app-shell">
    <div className={`mobile-scrim ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} aria-hidden="true" />
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Main navigation">
      <Link href="/" className="brand" onClick={() => setMobileOpen(false)}><span className="brand-mark"><ShieldCheck size={19} /></span><span><span className="brand-name">VeriCall</span><span className="brand-sub">Deepfake Defense</span></span></Link>
      <div className="nav-label">Security workspace</div>
      <nav>{routes.slice(0, 5).map(r => <NavItem key={r.path} item={r} active={path === r.path} onClick={() => setMobileOpen(false)} />)}</nav>
      <div className="nav-label">Operations</div>
      <nav>{routes.slice(5).map(r => <NavItem key={r.path} item={r} active={path === r.path} onClick={() => setMobileOpen(false)} />)}</nav>
      <div className="sidebar-footer"><div className="privacy-mini"><LockKeyhole size={13} color="#61cfd5" /> Browser-local demo · models offline</div><div style={{ marginTop: 14, color: '#617384', fontSize: 9 }}>VERICALL PREVIEW <span className="mono" style={{ float: 'right' }}>v0.1.0</span></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="top-left"><button className="icon-btn mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)} data-testid="button-open-navigation"><Menu size={16} /></button><span className="crumb">SECURITY WORKSPACE /</span><span style={{ color: '#cbd8e0', fontSize: 11 }}>{title}</span></div>
        <div className="top-right">
          {searchOpen&&<input className="input" style={{width:170,padding:'7px 9px'}} autoFocus aria-label="Search workspace pages" placeholder="Find a workspace page…" list="route-options" value={globalQuery} onChange={e=>setGlobalQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){const target=routes.find(r=>r.label.toLowerCase().includes(globalQuery.toLowerCase()));if(target){goto(target.path);setSearchOpen(false);setGlobalQuery('');}}if(e.key==='Escape')setSearchOpen(false);}} data-testid="input-global-search"/>}
          <datalist id="route-options">{routes.map(r=><option key={r.path} value={r.label}/>)}</datalist>
          <button className="icon-btn" aria-label="Open workspace search" onClick={()=>setSearchOpen(v=>!v)} data-testid="button-global-search"><Search size={15}/></button>
          <span className="status-pill" role="status" aria-live="polite"><span className={`dot ${monitoring ? 'green' : 'amber'}`} />{monitoring ? 'MONITORING ACTIVE' : streamPaused ? 'CAPTURE PAUSED' : 'MODELS NOT CONNECTED'}</span>
          <span className="top-hide status-pill"><span className="dot blue" />Browser-local</span>
          <button className="icon-btn top-hide" aria-label="Notifications" onClick={() => notify('No new notifications. Demo events only.')} data-testid="button-notifications"><Bell size={15} /></button>
          <button className="icon-btn top-hide" aria-label="Reset demo" onClick={() => setModal({ title: 'Reset demo state?', body: 'Reset simulated incidents, scenario progress, alerts and challenge state. Saved contact details and preferences remain in this browser.', action: resetDemo, confirm: 'Reset demo' })} data-testid="button-reset-demo"><RotateCcw size={15} /></button>
          <div style={{position:'relative'}}><button className="icon-btn top-hide" aria-label="Security operator profile menu" aria-expanded={profileOpen} onClick={()=>setProfileOpen(v=>!v)} data-testid="button-profile-menu"><span style={{fontSize:9,fontWeight:800}}>SO</span></button>{profileOpen&&<div style={{position:'absolute',right:0,top:39,width:190,padding:12,background:'#172331',border:'1px solid #344455',borderRadius:8,zIndex:50,boxShadow:'0 12px 30px #0008'}}><div style={{fontSize:11,fontWeight:700,color:'#e0ebf1'}}>Security operator</div><div className="panel-kicker">Preview workspace · local session</div><button className="btn sm" style={{width:'100%',marginTop:9}} onClick={()=>{goto('/settings');setProfileOpen(false);}}>Privacy & settings</button><button className="btn ghost sm" style={{width:'100%',marginTop:4}} onClick={()=>{setProfileOpen(false);notify('Signed-in identity is not implemented in this frontend preview.');}}>Account status</button></div>}</div>
        </div>
      </header>
      <Switch>
        <Route path="/"><Overview score={score} monitoring={monitoring} onLaunch={startDemo} onStart={() => void startMonitoring()} onNavigate={goto} onToast={notify} /></Route>
        <Route path="/live-shield"><LiveShield monitoring={monitoring} paused={streamPaused} mediaStream={mediaStream} elapsed={elapsed} mode={sessionMode} error={mediaError} score={score} challenge={challenge} setChallenge={setChallenge} challengeStatus={challengeStatus} setChallengeStatus={setChallengeStatus} challengeSeconds={challengeSeconds} setChallengeSeconds={setChallengeSeconds} phrase={phrase} setPhrase={setPhrase} contacts={contacts} onStart={startMonitoring} onPause={() => { mediaRef.current?.getTracks().forEach(track => { track.enabled = false; }); setStreamPaused(true); setMonitoring(false); notify('Capture paused. Browser tracks are disabled; use End to release them.'); }} onResume={() => { mediaRef.current?.getTracks().forEach(track => { track.enabled = true; }); setStreamPaused(false); setMonitoring(true); notify('Capture resumed.'); }} onEnd={endMonitoring} onToast={notify} onReport={generateIncidentReport} /></Route>
        <Route path="/threat-intelligence"><ThreatPage transcript={transcript} setTranscript={scanTranscript} tripwire={tripwire} setTripwire={setTripwire} onNavigate={goto} /></Route>
        <Route path="/attack-simulator"><Simulator scenario={scenario} setScenario={(i: number) => { setScenario(i); setScenarioStep(0); setScenarioPlaying(false); setAlertActive(false); }} step={scenarioStep} setStep={setScenarioStep} playing={scenarioPlaying} setPlaying={setScenarioPlaying} score={score} current={currentScenario} alertActive={alertActive} acknowledge={() => { setAlertActive(false); notify('Simulation alert acknowledged.'); }} onToast={notify} onNavigate={goto} /></Route>
        <Route path="/scam-replay"><ScamReplay replay={replay} setReplay={(i: number) => { setReplay(i); setReplayStep(0); }} step={replayStep} setStep={setReplayStep} onReport={generateIncidentReport} /></Route>
        <Route path="/incidents"><Incidents incidents={incidents} setIncidents={setIncidents} query={incidentQuery} setQuery={setIncidentQuery} filter={incidentFilter} setFilter={setIncidentFilter} sort={incidentSort} setSort={setIncidentSort} selected={selectedIncident} setSelected={setSelectedIncident} onReport={generateIncidentReport} onPrint={printIncidentReport} onToast={notify} /></Route>
        <Route path="/trusted-contacts"><Contacts contacts={contacts} setContacts={setContacts} query={contactQuery} setQuery={setContactQuery} setForm={setContactForm} setModal={setModal} onToast={notify} /></Route>
        <Route path="/enterprise"><Enterprise role={role} setRole={setRole} alert={enterpriseAlert} setAlert={setEnterpriseAlert} onToast={notify} /></Route>
        <Route path="/benchmarks"><Benchmarks dataset={dataset} setDataset={setDataset} runs={benchmarkRuns} setRuns={setBenchmarkRuns} onToast={notify} /></Route>
        <Route path="/settings"><Settings settings={settings} setSettings={setSettings} monitoring={monitoring} onStop={endMonitoring} contactsCount={contacts.length} onNavigate={goto} onReset={() => setModal({ title: 'Clear demo data?', body: 'This clears demo incidents, scenario progress and local contact samples. It will not affect real accounts or call data.', action: () => { setContacts([]); resetDemo(); }, confirm: 'Clear demo data' })} onToast={notify} /></Route>
        <Route component={NotFound} />
      </Switch>
    </main>
    {firstVisit && <Modal title="A clearer view of call risk" onClose={() => { setFirstVisit(false); localStorage.setItem('vericall-intro-seen', '1'); }} actions={<><button className="btn ghost" onClick={() => { setFirstVisit(false); localStorage.setItem('vericall-intro-seen', '1'); }}>Explore workspace</button><button className="btn" onClick={() => { setFirstVisit(false); localStorage.setItem('vericall-intro-seen', '1'); goto('/live-shield'); void startMonitoring(); }}><Radio size={14}/> Start Live Monitoring</button><button className="btn primary" onClick={() => { setFirstVisit(false); localStorage.setItem('vericall-intro-seen', '1'); startDemo(); }}>Launch CEO demo <ArrowRight size={14} /></button></>}>
      <p>VeriCall is a browser-first security console for people handling sensitive video calls.</p><div className="notice"><strong>Privacy by design:</strong> camera and microphone permission is requested only after you choose live monitoring. Streams stay in this browser and can always be stopped. Nothing is recorded by default.</div><p style={{ marginBottom: 0 }}>Detection models, identity matching, messaging and integrations are not connected. All scores, incidents and signals in this preview are illustrative demo output.</p>
    </Modal>}
    {modal && <Modal title={modal.title} onClose={() => setModal(null)} actions={<><button className="btn ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn danger" onClick={() => { modal.action?.(); setModal(null); }}>{modal.confirm || 'Confirm'}</button></>}>{modal.body}</Modal>}
    {contactForm && <Modal title={contactForm.id ? 'Edit trusted contact' : 'Add trusted contact'} onClose={() => setContactForm(null)} actions={<><button className="btn ghost" type="button" onClick={() => setContactForm(null)}>Cancel</button><button className="btn primary" form="contact-form" type="submit">Save contact</button></>}>
      <form id="contact-form" onSubmit={saveContact} className="grid grid-2">
        {[['name','Full name',contactForm.name],['relationship','Relationship',contactForm.relationship],['organization','Organization',contactForm.organization],['role','Role',contactForm.role],['phone','Known phone number',contactForm.phone],['email','Known email',contactForm.email]].map(([key,label,value]) => <div className="field" key={key}><label htmlFor={`contact-${key}`}>{label}</label><input required={key === 'name'} id={`contact-${key}`} name={key} className="input" defaultValue={value} data-testid={`input-contact-${key}`} /></div>)}
        <div className="setting-row span-2"><div><div className="setting-title">Reference enrollment consent placeholder</div><div className="setting-desc">Records only that consent was discussed; no reference sample is captured or stored.</div></div><input type="checkbox" className="toggle" checked={contactForm.consent} onChange={e=>setContactForm({...contactForm,consent:e.target.checked,status:e.target.checked?'Consent placeholder noted':'Not enrolled'})} aria-label="Mark consent discussion placeholder"/></div>
        <div className="notice span-2">Contact details are demo configuration stored locally. Do not enter a safe word here. Biometric enrollment is consent-gated and not implemented; no face or voice samples are captured.</div>
      </form>
    </Modal>}
    {toast && <div className="toast" role="status" aria-live="polite" data-testid="status-toast">{toast}</div>}
  </div>;
}

function NavItem({ item, active, onClick }: { item: typeof routes[number]; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return <Link href={item.path} className={`nav-link ${active ? 'active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined} data-testid={`link-${item.label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={15} strokeWidth={1.8} /><span>{item.label}</span>{item.path === '/live-shield' && <span style={{ marginLeft: 'auto' }} className={`dot ${active ? 'green' : 'blue'}`} />}</Link>;
}
function PageHead({ eyebrow, title, desc, actions }: { eyebrow: string; title: string; desc: string; actions?: ReactNode }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p className="page-desc">{desc}</p></div>{actions && <div className="head-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}</div>;
}
function Panel({ title, subtitle, action, children, className = '' }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{(title || action) && <div className="panel-head"><div>{title && <h2 className="panel-title">{title}</h2>}{subtitle && <div className="panel-kicker">{subtitle}</div>}</div>{action}</div>}{children}</section>;
}
function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: string }) { return <span className={`badge ${tone}`}>{children}</span>; }
function Score({ value, label = 'AUTHENTICITY CONFIDENCE' }: { value: number; label?: string }) {
  const tone = value < 40 ? '#e7747a' : value < 65 ? '#e6b95d' : '#58cbd7';
  return <div className="score-ring" style={{ ['--score' as string]: `${value * 3.6}deg`, background: `conic-gradient(${tone} ${value * 3.6}deg,#273746 0)` }} aria-label={`${value} of 100 illustrative authenticity confidence`}><div className="score-inner"><div className="score-num" style={{ color: tone }}>{value}</div><div className="score-caption">{label}</div></div></div>;
}
function DemoBanner({ children = 'DEMO DATA · ALL SIGNALS AND SCORES ARE ILLUSTRATIVE' }: { children?: ReactNode }) { return <div className="sim-banner"><Sparkles size={14} />{children}</div>; }
function Status({ children, tone = 'amber' }: { children: ReactNode; tone?: string }) { return <span className="status-pill"><span className={`dot ${tone}`} />{children}</span>; }
function Metric({ label, value, delta, tone }: { label: string; value: string; delta?: string; tone?: string }) { return <Panel><div className="metric-label">{label}</div><div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}><div className="metric">{value}</div>{delta && <div className="metric-change" style={tone ? { color: tone } : {}}>{delta}</div>}</div></Panel>; }
function MiniChart({ paired = false, range = '24 hours', view = 'Threat trends' }: { paired?: boolean; range?: string; view?: string }) { const base=view==='Threat categories'?[54,37,61,82,48,26]:view==='Severity distribution'?[18,49,67,31]:chart; const values = view!=='Threat trends'?base:base.map((n,i)=>range==='7 days'?Math.min(95,Math.max(20,n+(i%3-1)*13)):range==='30 days'?Math.min(92,Math.max(25,n+(i%4-2)*8)):n); const labels=view==='Threat categories'?['VIDEO','AUDIO','URGENCY','OTP','PAYMENT','OTHER']:view==='Severity distribution'?['CRITICAL','HIGH','MEDIUM','LOW']:range==='24 hours'?['09:00','10:00','11:00','12:00','13:00','NOW']:range==='7 days'?['MON','TUE','WED','THU','FRI','SAT']:['W1','W2','W3','W4','W5','NOW']; return <><div className="chart-bars" role="img" aria-label={`Illustrative ${view.toLowerCase()} chart. Demo values are not validated results.`}>{values.map((n, i) => <div className="chart-bar-wrap" key={i}><i className="chart-bar" style={{ height: `${n}%` }} />{paired && <i className="chart-bar secondary" style={{ height: `${Math.max(12,values[(i + 3) % values.length] * .68)}%` }} />}</div>)}</div><div className="chart-labels">{labels.map(label=><span key={label}>{label}</span>)}</div></>; }
function EventFeed({ compact = false }: { compact?: boolean }) { return <div>{threatEvents.slice(0, compact ? 3 : 4).map((event, i) => <div className="event-row" key={i}><span className={`event-mark ${event[2]}`} /><div><div className="event-title">{event[0]}</div><div className="event-detail">{event[1]}</div></div><span className="event-time">{['10:42','10:36','10:21','09:58'][i]}</span></div>)}</div>; }

function Overview({ score, monitoring, onLaunch, onStart, onNavigate, onToast }: { score: number; monitoring: boolean; onLaunch: () => void; onStart: () => void; onNavigate: (p: string) => void; onToast: (s: string) => void }) {
  const [range, setRange] = useState('24 hours');
  const [chartView, setChartView] = useState('Threat trends');
  return <div className="page"><PageHead eyebrow="TUESDAY, 24 JUNE 2025 · SECURITY OVERVIEW" title="See the person. Verify the identity." desc="A browser-first defense workspace for sensitive calls. Signals are not a substitute for independent verification." actions={<><button className="btn primary" onClick={onLaunch} data-testid="button-launch-demo"><Play size={14} /> Launch Demo</button><button className="btn" onClick={onStart} data-testid="button-start-live-monitoring"><Radio size={14} /> Start Live Monitoring</button></>} />
    <DemoBanner>DEMO ENVIRONMENT · No live AI models connected · Statistics and examples are simulated</DemoBanner>
    <div className="grid grid-2" style={{ marginBottom: 14 }}>
      <Panel title="Current trust assessment" subtitle="Illustrative demo logic · 100 = higher confidence in authenticity" action={<Badge tone="amber">Insufficient data</Badge>}>
        <div className="score-layout"><Score value={score} /><div className="score-meta"><div className="meta-row"><span>Risk classification</span><strong style={{ color: '#e6bd69' }}>Unverified</strong></div><div className="meta-row"><span>Assessment confidence</span><strong>Low · 28%</strong></div><div className="meta-row"><span>Signal quality</span><strong>Limited sample</strong></div><div className="meta-row"><span>Verification status</span><strong>Not verified</strong></div></div></div>
      </Panel>
      <Panel title="Monitoring readiness" subtitle="Browser permissions are requested only after you start a session." action={<Status tone={monitoring ? 'green' : 'amber'}>{monitoring ? 'Active' : 'Standby'}</Status>}>
        {['Video analysis','Audio analysis','Lip-sync analysis','Behavioral analysis','Transcript scanner','Identity verification'].map((s,i) => <div className="setting-row" key={s} style={{ padding: '8px 0' }}><span className="setting-title">{s}</span><Badge tone={i === 5 ? 'gray' : 'amber'}>{i === 5 ? 'Unavailable' : 'Simulated'}</Badge></div>)}
        <div style={{ marginTop: 13, display:'flex',justifyContent:'space-between',alignItems:'center' }}><span className="metric-label">Stream connection</span><span className="metric-label">{monitoring ? 'Browser-local stream' : 'No stream'} · models offline</span></div>
      </Panel>
    </div>
    <div className="grid grid-4" style={{ marginBottom: 14 }}>
      <Metric label="SESSIONS MONITORED · DEMO" value="1,284" delta="+8.2%" /><Metric label="SUSPICIOUS SESSIONS · DEMO" value="37" delta="6 need review" tone="#e3bc70" /><Metric label="HIGH-RISK ALERTS · DEMO" value="12" delta="2 today" tone="#ed8588" /><Metric label="VERIFICATION CHALLENGES · DEMO" value="86" delta="illustrative" />
    </div>
    <div className="grid grid-2" style={{ marginBottom: 14 }}>
      <Panel title="Threat activity" subtitle="Illustrative categories, severity and trends · no detector inference" action={<div style={{display:'flex',gap:6}}><select className="select" style={{ width:130, padding:'6px 8px' }} value={chartView} onChange={e=>setChartView(e.target.value)} aria-label="Chart visualization" data-testid="select-chart-view"><option>Threat trends</option><option>Threat categories</option><option>Severity distribution</option></select>{chartView==='Threat trends'&&<select className="select" style={{ width:104, padding:'6px 8px' }} value={range} onChange={e => setRange(e.target.value)} aria-label="Chart date range" data-testid="select-chart-range"><option>24 hours</option><option>7 days</option><option>30 days</option></select>}</div>}><MiniChart paired range={range} view={chartView} /><div style={{ display: 'flex', gap: 15, marginTop: 14, fontSize: 9, color: '#8494a2' }}><span><i className="dot blue" style={{ display:'inline-block',marginRight:6 }} />Illustrative series A</span><span><i className="dot amber" style={{ display:'inline-block',marginRight:6,background:'#d8aa50' }} />Illustrative series B</span></div></Panel>
      <Panel title="Recent security activity" subtitle="Latest illustrative signals" action={<button className="btn ghost sm" onClick={() => onNavigate('/incidents')}>View history <ArrowRight size={12} /></button>}><EventFeed compact /></Panel>
    </div>
    <div className="grid grid-2">
      <Panel title="Threat timeline" subtitle="DEMO EVENTS · NOT LIVE CALL ANALYSIS"><div className="timeline">{threatEvents.slice(0,3).map((e,i)=><div className={`timeline-item ${i===1?'alert':''}`} key={e[0]}><div className="timeline-time">{['10:42:18','10:36:02','10:21:47'][i]} · {e[2].toUpperCase()}</div><div className="timeline-text"><strong>{e[0]}</strong> — {e[1]}</div></div>)}</div></Panel>
      <Panel title="Quick actions" subtitle="Choose an explicit next step"><div className="grid grid-2">{([
        { label:'Open Live Shield', path:'/live-shield', Icon:Shield },
        { label:'Launch simulator', path:'/attack-simulator', Icon:Activity },
        { label:'Verify a caller', path:'/live-shield', Icon:Fingerprint },
        { label:'Review incidents', path:'/incidents', Icon:History },
        { label:'Manage contacts', path:'/trusted-contacts', Icon:Users },
        { label:'Explore benchmarks', path:'/benchmarks', Icon:Gauge },
      ]).map(({label,path,Icon}) => <button className="btn" key={label} style={{ justifyContent:'space-between' }} onClick={() => { if (label === 'Verify a caller') onToast('Choose a saved contact and independently call a known number.'); onNavigate(path); }} data-testid={`action-${label.toLowerCase().replaceAll(' ','-')}`}><span style={{display:'flex',alignItems:'center',gap:8}}><Icon size={14}/>{label}</span><ChevronRight size={13}/></button>)}</div></Panel>
    </div>
  </div>;
}

function LiveShield({ monitoring, paused, mediaStream, elapsed, mode, error, score, challenge, setChallenge, challengeStatus, setChallengeStatus, challengeSeconds, setChallengeSeconds, phrase, setPhrase, contacts, onStart, onPause, onResume, onEnd, onToast, onReport }: any) {
  const [capture, setCapture] = useState('Webcam + microphone');
  const [cameraDevice, setCameraDevice] = useState('');
  const [microphoneDevice, setMicrophoneDevice] = useState('');
  const [technical, setTechnical] = useState(false);
  const [alertMuted, setAlertMuted] = useState(true);
  const [callbackStatus, setCallbackStatus] = useState('Not started');
  const [selectedContact, setSelectedContact] = useState(contacts[0]?.id || '');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [oobStatus, setOobStatus] = useState('Not started');
  const [challengeResult, setChallengeResult] = useState('');
  const [phraseStatus, setPhraseStatus] = useState('Not started');
  const [phraseSeconds, setPhraseSeconds] = useState(0);
  const [deviceList, setDeviceList] = useState<MediaDeviceInfo[]>([]);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(()=>{if(videoRef.current)videoRef.current.srcObject=mediaStream||null;},[mediaStream]);
  useEffect(()=>{
    if(phraseStatus!=='In progress') return;
    const timer=window.setInterval(()=>setPhraseSeconds(value=>{
      if(value<=1){setPhraseStatus('Inconclusive · no voice-match model connected');return 0;}
      return value-1;
    }),1000);
    return ()=>window.clearInterval(timer);
  },[phraseStatus]);
  const signalStatus = (i: number) => score < 40 && i < 5 ? ['Suspicion · demo', 'Example only', 'Insufficient', 'Review', 'Example only'][i] : i === 12 ? 'Heuristic only' : 'Unavailable';
  const startLiveness = (name: string) => { setChallenge(name); setChallengeSeconds(8); setChallengeStatus('In progress'); setChallengeResult(''); };
  const enumerate = async () => {
    setDeviceLoading(true);
    try {
      if (!navigator.mediaDevices?.enumerateDevices) throw new Error('Device enumeration is unavailable in this browser.');
      const list = await navigator.mediaDevices.enumerateDevices();
      setDeviceList(list.filter(d => d.kind === 'videoinput' || d.kind === 'audioinput'));
      if (!list.length) onToast('No devices reported by browser.');
    } catch (e) { onToast(e instanceof Error ? e.message : 'Device list unavailable.'); }
    setDeviceLoading(false);
  };
  const startOutOfBand = () => { setDemoCode('482913'); setOobStatus('Demo code active for this page session · not sent'); onToast('Demo code created locally. No SMS or email was sent.'); };
  const callback = () => { const contact = contacts.find((c: Contact) => c.id === Number(selectedContact)); if(contact){setCallbackStatus('Recommended · no call placed');onToast(`Stop the suspicious interaction, then independently call ${contact.name} at ${contact.phone}. This is a reminder only; no call was placed.`);}else onToast('Select a saved contact first.'); };
  return <div className="page">
     <PageHead eyebrow="BROWSER-LOCAL MONITORING WORKSPACE" title="Live Shield" desc="Capture controls are real browser permissions. Every analysis below remains simulated, unavailable or heuristic until an appropriate model is connected." actions={monitoring ? <><Status tone="green">ACTIVE · {Math.floor(elapsed / 60).toString().padStart(2,'0')}:{(elapsed%60).toString().padStart(2,'0')}</Status><button className="btn danger" onClick={onEnd} data-testid="button-end-monitoring"><StopCircle size={14}/> End</button></> : paused ? <><Status tone="amber">Capture paused</Status><button className="btn" onClick={onResume}><Play size={14}/> Resume</button><button className="btn danger" onClick={onEnd} data-testid="button-end-monitoring"><StopCircle size={14}/> End</button></> : <button className="btn primary" onClick={() => onStart(capture,cameraDevice,microphoneDevice)} data-testid="button-start-capture"><Radio size={14}/> Request permission</button>} />
    <DemoBanner>STREAM CAPTURE CAN BE REAL · SIGNAL ANALYSIS IS NOT · No recording is made</DemoBanner>
    {error && <div className="notice" role="alert" style={{ borderColor:'#70404b', marginBottom:14, color:'#efb2b4' }}><AlertTriangle size={14} style={{ verticalAlign:'middle',marginRight:8 }}/>{error} <button className="btn sm" style={{ marginLeft:10 }} onClick={() => onStart('Demonstration only')}>Use simulation instead</button></div>}
    {monitoring && <div className="notice" role="status" style={{ marginBottom:14 }}><Radio size={13} style={{verticalAlign:'middle',marginRight:8}}/>Monitoring active in {mode}. Media tracks remain in this browser. Use End to stop all capture. No access to Zoom, Teams or FaceTime control.</div>}
    {score < 40 && <div className="alert-card" style={{ marginBottom:14 }}><div className="alert-title"><Siren size={15} style={{verticalAlign:'middle',marginRight:7}}/>POTENTIAL DEEPFAKE / IMPERSONATION DETECTED — SIMULATION</div><p style={{fontSize:10,color:'#e2b7b8'}}>Illustrative signals only: urgency / secrecy language, sample timing drift. Authenticity confidence {score}/100. Do not treat as an actual detection.</p><div style={{display:'flex',gap:7,flexWrap:'wrap'}}><button className="btn sm" onClick={() => onToast('Demo alert acknowledged.')}>Acknowledge</button><button className="btn sm" onClick={() => document.getElementById('verification-panel')?.scrollIntoView({behavior:'smooth'})}>Verify identity</button><button className="btn sm" onClick={callback}>Start callback verification</button><button className="btn danger sm" onClick={onEnd}>End monitoring</button><button className="btn sm" onClick={() => onReport()}>Report incident</button><button className="btn sm" onClick={() => setAlertMuted(!alertMuted)}>{alertMuted?'Enable alert sound':'Mute alert sound'}</button></div></div>}
    <div className="grid grid-2" style={{ marginBottom:14 }}>
      <Panel title="Capture workspace" subtitle="Browser media access · explicit user action required" action={<Badge tone={monitoring?'green':'gray'}>{monitoring?'Capture active':'No capture'}</Badge>}>
        <div className="call-preview" data-testid="status-media-preview"><video ref={videoRef} autoPlay playsInline muted aria-label="Local browser media preview" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:mediaStream&&mediaStream.getVideoTracks().length?0.72:0}}/><div className="preview-grid"/>{!mediaStream&&<div className="face-outline"><div className="mesh"/><div className="face-line"/></div>}<div className="preview-caption">{mediaStream?'LOCAL BROWSER PREVIEW · NO ANALYSIS':'SIMULATED FACE-MESH OVERLAY · NOT IDENTITY MATCHING'}</div><div className="preview-bottom"><span>{monitoring?mode:paused?'Capture paused':'Waiting for permission or demo mode'}</span><span>{mediaStream?'STREAM LOCAL':'NO STREAM'}</span></div></div>
        <div className="grid grid-2" style={{marginTop:12}}>
          <div className="field"><label htmlFor="capture-mode">Capture mode</label><select className="select" id="capture-mode" value={capture} onChange={e=>setCapture(e.target.value)} data-testid="select-capture-mode"><option>Webcam + microphone</option><option>Microphone only</option><option>Screen / tab</option><option>Demonstration only</option></select></div>
           <div className="field"><label htmlFor="camera-choice">Camera</label><select className="select" id="camera-choice" value={cameraDevice} onChange={e=>setCameraDevice(e.target.value)} data-testid="select-camera-device"><option value="">Default browser camera</option>{deviceList.filter(d=>d.kind==='videoinput').map((d,i)=><option key={`${d.deviceId}-${i}`} value={d.deviceId}>{d.label||`Camera ${i+1}`}</option>)}</select></div>
           <div className="field"><label htmlFor="microphone-choice">Microphone</label><select className="select" id="microphone-choice" value={microphoneDevice} onChange={e=>setMicrophoneDevice(e.target.value)} data-testid="select-microphone-device"><option value="">Default browser microphone</option>{deviceList.filter(d=>d.kind==='audioinput').map((d,i)=><option key={`${d.deviceId}-${i}`} value={d.deviceId}>{d.label||`Microphone ${i+1}`}</option>)}</select></div>
        </div>
         <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:11}}><button className="btn sm primary" onClick={()=>onStart(capture,cameraDevice,microphoneDevice)} disabled={monitoring||paused} data-testid="button-capture-start"><Video size={13}/>Start</button><button className="btn sm" onClick={onPause} disabled={!monitoring} data-testid="button-capture-pause"><Pause size={13}/>Pause</button><button className="btn sm" onClick={onResume} disabled={!paused} data-testid="button-capture-resume"><Play size={13}/>Resume</button><button className="btn sm" onClick={onEnd} disabled={!monitoring&&!paused} data-testid="button-capture-end"><Square size={12}/>End</button><button className="btn sm" onClick={enumerate} disabled={deviceLoading} data-testid="button-enumerate-devices"><SlidersHorizontal size={12}/>{deviceLoading?'Checking…':'Check devices'}</button></div>
         <div className="panel-kicker" style={{marginTop:10}}>Elapsed {Math.floor(elapsed/60).toString().padStart(2,'0')}:{(elapsed%60).toString().padStart(2,'0')} · Camera and microphone choices are independent. Device labels may appear after permission. Screen capture is browser-selected.</div>
      </Panel>
      <Panel title="Live trust & signal fusion" subtitle="Illustrative score logic · no scientific weighting asserted" action={<Badge tone={score<40?'red':score<65?'amber':'green'}>{score<40?'High concern':score<65?'Uncertain':'Lower concern'}</Badge>}>
        <div className="score-layout"><Score value={score}/><div className="score-meta"><div className="meta-row"><span>Signals observed</span><strong>{scenarioSignalCount(score)} / 14</strong></div><div className="meta-row"><span>Data sufficiency</span><strong>Not enough data</strong></div><div className="meta-row"><span>Evidence quality</span><strong>Illustrative</strong></div><div className="meta-row"><span>Updated</span><strong className="mono">10:42:18</strong></div></div></div>
        <div style={{marginTop:17}}><div className="panel-kicker" style={{marginBottom:8}}>FUSION INPUTS · ALL MODEL UNAVAILABLE</div><div className="grid grid-2">{[['Video','Unavailable'],['Audio','Unavailable'],['Behavior','Illustrative'],['Scam context','Heuristic'],['Identity','Not verified']].map(([a,b])=><div key={a} style={{padding:'8px 9px',border:'1px solid #293949',borderRadius:6,fontSize:10,color:'#c4d0d8'}}>{a}<span style={{float:'right',color:'#8d9ca8'}}>{b}</span></div>)}</div></div>
        <div className="progress-steps" style={{marginTop:15}}>{[0,1,2,3,4,5,6].map(i=><i className={`step ${i<3?'on':''}`} key={i}/>)}</div>
        <div className="panel-kicker" style={{marginTop:7}}>Future-ready integration surface: WebAssembly / ONNX Runtime Web / WebGPU · not connected</div>
      </Panel>
    </div>
    <div className="grid grid-2" style={{marginBottom:14}}>
      <Panel title="Detection signal inventory" subtitle="Status, evidence strength and explanation for each signal"><div style={{maxHeight:480,overflow:'auto',paddingRight:4}}>{signalNames.map((name,i)=><div className="signal-row" key={name}><div><div className="signal-name">{name}</div><div className="signal-sub">{i<7?'VIDEO / BEHAVIOR':i<12?'AUDIO':'CONTEXT / IDENTITY'} · {i===12?'heuristic':'model not connected'}</div></div><div><div className={`bar ${score<40&&i<3?'red':''}`}><i style={{width:`${score<40&&i<3?44:0}%`}}/></div><div className="signal-sub">{score<40&&i<3?'Illustrative 44%':'No evidence'}</div></div><Badge tone={score<40&&i<3?'amber':'gray'}>{signalStatus(i)}</Badge></div>)}</div></Panel>
      <Panel title="Explainability & evidence" subtitle="Examples only · not confirmed observations" action={<button className="btn ghost sm" onClick={()=>setTechnical(!technical)} aria-expanded={technical}>{technical?'Hide':'Expand'} technical details <ChevronDown size={12}/></button>}>
        <div className="call-preview" style={{minHeight:152}}><div className="preview-grid"/><div className="face-outline" style={{transform:'scale(.68)'}}><div className="mesh"/><div className="face-line"/></div><span className="preview-caption">MESH OVERLAY · SYNTHETIC ILLUSTRATION</span><span className="preview-bottom">No face matching · no frame stored</span></div>
        <div style={{marginTop:13}}>{[['00:14','Lip-sync drift example: 340 ms','Suspicion'],['00:21','No blink observed in sample window','Insufficient'],['00:33','Possible spectral cutoff near 8 kHz','Suspicion'],['00:41','Urgency heuristic: “right now”','Observation']].map(([t,s,l])=><div className="event-row" key={t}><span className="event-time">{t}</span><div className="event-title" style={{flex:1}}>{s}</div><Badge tone={l==='Suspicion'?'amber':l==='Observation'?'green':'gray'}>{l}</Badge></div>)}</div>
        <div className="wave" aria-label="Illustrative audio waveform; waveform alone cannot detect cloned voice">{Array.from({length:46},(_,i)=><i key={i} style={{height:`${7+Math.abs(Math.sin(i*1.13))*32}px`}}/>)}</div><div className="panel-kicker">Waveform is a visualization only; it does not establish voice cloning.</div>
        {technical&&<div className="notice" style={{marginTop:12}}><strong>Technical detail:</strong> timestamps, confidence bars and evidence entries are static demonstration values. No model output, spectral feature extraction, facial landmarks or biometric comparison is computed.</div>}
      </Panel>
    </div>
    <div id="verification-panel" className="grid grid-2">
      <Panel title="Liveness challenge" subtitle="Challenges are not foolproof and do not prove identity"><div className="notice">Live deepfake systems may sometimes fail under occlusion or profile views. A successful challenge is not proof that a caller is authentic.</div><div style={{display:'flex',gap:7,flexWrap:'wrap',margin:'13px 0'}}>{['Turn head ~90°','Cover half your face','Hold up three fingers'].map(c=><button className={`btn sm ${challenge===c?'primary':''}`} key={c} onClick={()=>startLiveness(c)} data-testid={`challenge-${c.toLowerCase().replaceAll(' ','-')}`}>{c}</button>)}</div>{challenge&&<div className="notice" role="status"><strong>{challenge}</strong><br/>{challengeStatus} {challengeStatus==='In progress'&&`· ${challengeSeconds}s`}<div className="progress-steps" style={{margin:'10px 0'}}>{[0,1,2,3,4,5,6,7].map(i=><i key={i} className={`step ${i>=challengeSeconds?'on':''}`}/>)}</div>{challengeStatus==='Demo result: inconclusive'&&<><div>No live liveness evaluation is connected.</div><button className="btn sm" style={{marginTop:8}} onClick={()=>startLiveness(challenge)}>Retry challenge</button></>}</div>}<button className="btn sm" style={{marginTop:10}} onClick={()=>{setChallenge('');setChallengeStatus('Not started');setChallengeResult('');}}>Reset challenge</button></Panel>
       <Panel title="Phrase & out-of-band verification" subtitle="Neither workflow verifies caller identity">
         <div className="field"><label>Random phrase challenge</label><div className="notice mono" style={{fontSize:17,color:'#d8edf0'}}>{phrase}</div></div>
         <div style={{display:'flex',gap:7,marginTop:9,flexWrap:'wrap'}}>
           <button className="btn sm" onClick={()=>{const phrases=['violet atlas / 28','silver orchard / 63','north window / 15','amber signal / 82'];setPhrase(phrases[Math.floor(Math.random()*phrases.length)]);setPhraseStatus('Not started');setPhraseSeconds(0);setChallengeResult('New randomized phrase generated.');}} data-testid="button-new-phrase">Generate phrase</button>
           <button className="btn sm" onClick={()=>{setPhraseStatus('In progress');setPhraseSeconds(8);setChallengeResult('Repeat the displayed phrase before the countdown ends.');}} data-testid="button-start-phrase">Start phrase challenge</button>
         </div>
         <div className="setting-row" style={{marginTop:9}}><span className="setting-title">Challenge status</span><Badge tone={phraseStatus.startsWith('Demo pass')?'green':phraseStatus.startsWith('Demo fail')?'red':phraseStatus.startsWith('Inconclusive')?'amber':'gray'}>{phraseStatus}{phraseStatus==='In progress'?` · ${phraseSeconds}s`:''}</Badge></div>
         {phraseStatus==='In progress'&&<div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:8}}><button className="btn sm" onClick={()=>setPhraseStatus('Demo pass · phrase repeated; voice unverified')}>Record phrase repeated</button><button className="btn sm" onClick={()=>setPhraseStatus('Demo fail · no response; voice unverified')}>Record no response</button><button className="btn sm" onClick={()=>setPhraseStatus('Inconclusive · no voice-match model connected')}>Mark inconclusive</button></div>}
         <div className="panel-kicker" style={{marginTop:6}}>{challengeResult||'A completed phrase is not proof of a genuine voice. No voice-match evaluation is connected.'}</div>
         <div className="setting-row" style={{marginTop:13}}><div><div className="setting-title">Demo code verification</div><div className="setting-desc">{oobStatus} · no message is sent; expires when this page closes.</div></div><button className="btn sm" onClick={startOutOfBand}>{demoCode?'Resend demo code':'Create code'}</button></div>
         {demoCode&&<div className="notice mono" style={{marginTop:9}}>DEMO CODE · {demoCode} <span style={{fontFamily:'var(--app-font-sans)',marginLeft:8}}>Local only · illustrative expiry 5 min</span></div>}
         <div style={{display:'flex',gap:7,marginTop:9}}><input className="input" aria-label="Demo verification code" placeholder="Enter demo code" value={code} onChange={e=>setCode(e.target.value)}/><button className="btn sm" onClick={()=>{const valid=!!demoCode&&code===demoCode;setOobStatus(valid?'Demo code matched locally · identity not verified':'Code did not match · no identity verified');onToast(valid?'Demo code matched locally. No identity was verified.':'Code did not match or no active demo code exists.');}}>Check</button></div>
         <div className="panel-kicker" style={{marginTop:5}}>Local verification history: {oobStatus}. This does not validate caller identity.</div>
         <div className="field" style={{marginTop:13}}><label htmlFor="callback-contact">Saved trusted contact for independent callback</label><select id="callback-contact" className="select" value={selectedContact} onChange={e=>setSelectedContact(e.target.value)}>{contacts.map((c:Contact)=><option value={c.id} key={c.id}>{c.name} · {c.phone}</option>)}</select><div className="panel-kicker">Stop the suspicious interaction first, then independently call known saved details. Never use caller-provided numbers.</div></div>
         <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:9}}><button className="btn primary sm" onClick={callback}><Headphones size={13}/> Callback reminder</button><button className="btn sm" onClick={()=>{setCallbackStatus('User-reported complete · identity not proved');onToast('Callback marked complete by you. VeriCall did not place a call or verify identity.');}}>Mark my callback complete</button></div>
         <div className="panel-kicker" role="status" style={{marginTop:6}}>Callback status: {callbackStatus}</div>
       </Panel>
    </div>
  </div>;
}
function scenarioSignalCount(score: number) { return score < 40 ? 6 : 2; }

function ThreatPage({ transcript, setTranscript, tripwire, setTripwire, onNavigate }: any) {
  const [expected, setExpected] = useState('Rahul, CFO');
  const [claimed, setClaimed] = useState('Rahul');
  const [consentOpen, setConsentOpen] = useState(false);
  const flagPatterns: [RegExp,string,string][] = [
    [/\b(urgent|right now|immediately|today only)\b/ig,'Urgency','amber'],[/\b(secret|keep this between us|don't tell|do not tell)\b/ig,'Secrecy','red'],
    [/\b(wire|transfer|send money|gift card|payment)\b/ig,'Payment request','red'],[/\b(otp|one.time passcode|verification code)\b/ig,'OTP request','red'],
    [/\b(password|credential|login|account details)\b/ig,'Credential request','red'],[/\b(bypass|skip approval|don't loop in|do not involve)\b/ig,'Approval bypass','amber'],
    [/\b(ceo|cfo|bank|police|manager|authority)\b/ig,'Authority claim','amber'],
  ];
  const flags = useMemo(()=>{const out:{phrase:string;category:string;tone:string}[]=[];for(const [pattern,category,tone] of flagPatterns){for(const match of transcript.matchAll(pattern)){if(match[0])out.push({phrase:match[0],category,tone});}}return out.slice(0,20);},[transcript]);
  const highlight = (text:string) => {
    const regex=/(urgent|right now|immediately|wire|transfer|gift card|otp|one.time passcode|password|credential|secret|keep this between us|bypass|skip approval|ceo|cfo|bank|send money)/ig;
    const terms=new Set(['urgent','right now','immediately','wire','transfer','gift card','otp','one.time passcode','password','credential','secret','keep this between us','bypass','skip approval','ceo','cfo','bank','send money']);
    return text.split(regex).map((part,i)=>terms.has(part.toLowerCase())?<mark key={i} style={{background:'#684b27',color:'#f1d08a',borderRadius:3,padding:'1px 3px'}}>{part}</mark>:<span key={i}>{part}</span>);
  };
  return <div className="page"><PageHead eyebrow="SCAM-CONTEXT INTELLIGENCE" title="Threat Intelligence" desc="A transparent keyword scanner can surface language that merits attention. It does not determine whether a person or request is fraudulent." actions={<Badge tone="amber">Heuristic only</Badge>}/><DemoBanner>TRANSCRIPT SCANNER · EXAMPLE RULES ONLY · No speech-to-text integration connected</DemoBanner>
    {tripwire&&<div className="alert-card" role="alert" style={{marginBottom:14}}><div className="alert-title"><AlertOctagon size={16} style={{verticalAlign:'middle',marginRight:8}}/>STOP: VERIFY BEFORE SENDING</div><p style={{color:'#e5c4c5',fontSize:11}}>{tripwire}</p><p style={{fontSize:10,color:'#c9a7aa'}}>Detected request: <strong>{flags.map(f=>f.phrase).join(', ')||'Sensitive wording'}</strong>. Stop, follow approval policy and independently verify using saved details.</p><div style={{display:'flex',gap:8}}><button className="btn sm" onClick={()=>onNavigate('/live-shield')}>Verify caller</button><button className="btn sm" onClick={()=>onNavigate('/live-shield')}>Initiate callback</button><button className="btn ghost sm" onClick={()=>setTripwire('')}>Dismiss</button></div></div>}
    <div className="grid grid-2" style={{marginBottom:14}}>
      <Panel title="Transcript heuristic scanner" subtitle="Paste text to scan against visible demonstration rules" action={<Badge tone="gray">Manual input</Badge>}>
        <div className="field"><label htmlFor="transcript-input">Sample transcript</label><textarea id="transcript-input" className="textarea" value={transcript} onChange={e=>setTranscript(e.target.value)} placeholder="Paste a transcript. Example: I need the wire sent right now; keep this secret and skip approval." data-testid="input-transcript"/></div>
        <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}><button className="btn primary sm" onClick={()=>setTranscript(transcript)} data-testid="button-scan-transcript"><FileSearch size={13}/> Scan transcript</button><button className="btn sm" onClick={()=>setTranscript('This is the CFO. I need the wire transfer sent right now. Keep this between us and bypass the usual approval.')}>Load urgent payment sample</button><button className="btn ghost sm" onClick={()=>{setTranscript('');setTripwire('');}}>Clear</button></div>
        <div className="notice" style={{marginTop:12}}>Rules flag urgency, secrecy, wire transfers, gift cards, OTPs, credentials, payment redirection, approval bypass and authority claims. Keyword matches are not AI detections or proof of fraud.</div>
        <div style={{marginTop:13,border:'1px solid #293949',padding:13,borderRadius:7,fontSize:11,color:'#c6d2dc',lineHeight:1.8}}>{transcript?highlight(transcript):<span style={{color:'#718292'}}>Transcript preview and highlights appear here.</span>}</div>
      </Panel>
      <Panel title="Flagged language" subtitle={`${flags.length} heuristic phrase${flags.length===1?'':'s'} · no identity claim inferred`}>
        {flags.length?flags.map((f,i)=><div className="event-row" key={`${f.phrase}-${i}`}><span className={`event-mark ${f.tone}`} /><div style={{flex:1}}><div className="event-title">“{f.phrase}”</div><div className="event-detail">{f.category} · Heuristic match, not a conclusion</div></div><Badge tone={f.tone}>{f.category}</Badge></div>):<div className="empty-state"><CheckCircle2 size={20} style={{margin:'0 auto 8px',color:'#5dca9b'}}/><div>No heuristic flags in the provided text.</div><div style={{marginTop:4}}>This is not proof a request is safe.</div></div>}
        <div className="panel-kicker" style={{marginTop:12}}>Timestamp: manual scan · evidence strength: keyword match · severity is indicative only</div>
      </Panel>
    </div>
    <div className="grid grid-2">
      <Panel title="Expected vs. claimed identity" subtitle="User-entered context only · no face or voice matching">
        <div className="grid grid-2"><div className="field"><label htmlFor="expected-identity">Expected identity</label><input id="expected-identity" className="input" value={expected} onChange={e=>setExpected(e.target.value)}/></div><div className="field"><label htmlFor="claimed-identity">Claimed identity</label><input id="claimed-identity" className="input" value={claimed} onChange={e=>setClaimed(e.target.value)}/></div></div>
        <div className="setting-row"><span className="setting-title">Identity consistency</span><Badge tone="amber">{expected.toLowerCase().includes(claimed.toLowerCase())?'Text labels overlap · not verified':'Claim differs · verify independently'}</Badge></div>
        <div className="grid grid-2" style={{marginTop:8}}>{[['Reference face','No consented reference'],['Reference voice','No consented reference'],['Face match','Unavailable'],['Voice match','Unavailable']].map(([a,b])=><div key={a} className="setting-row"><div><div className="setting-title">{a}</div><div className="setting-desc">{b}</div></div><Badge tone="gray">Not connected</Badge></div>)}</div>
        <button className="btn sm" style={{marginTop:10}} onClick={()=>setConsentOpen(!consentOpen)}><LockKeyhole size={13}/>{consentOpen?'Close consent information':'Enrollment & consent information'}</button>
        {consentOpen&&<div className="notice" style={{marginTop:10}}>Production enrollment requires explicit informed consent, secure encrypted storage, retention controls, deletion workflows and validated matching. No reference samples are accepted or stored in this demo. Appearance alone is not identity verification.</div>}
      </Panel>
      <Panel title="Context response" subtitle="Take a pause before acting"><div className="timeline">{[['Recognize pressure','Urgency, secrecy and authority can be used to compress decision time.'],['Stop sensitive action','Do not share OTPs, passwords or approve an unverified payment.'],['Independently verify','Use saved numbers and your normal approval path.'],['Record metadata only','Create an incident summary without preserving call recordings.']].map(([a,b],i)=><div className="timeline-item" key={a}><div className="timeline-time">SAFE RESPONSE {String(i+1).padStart(2,'0')}</div><div className="timeline-text"><strong>{a}</strong> — {b}</div></div>)}</div></Panel>
    </div>
  </div>;
}

function Simulator({ scenario, setScenario, step, setStep, playing, setPlaying, score, current, alertActive, acknowledge, onToast, onNavigate }: any) {
  const highRisk = current.score < 40;
  const start = () => { if(step>=current.steps.length)setStep(0);setPlaying(true); };
  return <div className="page"><PageHead eyebrow="DETERMINISTIC SCENARIO ENGINE" title="Attack Simulator" desc="Walk through a repeatable security demonstration. Synthetic events illustrate a possible interface response; they are not live detections." actions={<button className="btn" onClick={()=>onNavigate('/scam-replay')}><RotateCcw size={14}/> Open Scam Replay</button>}/><DemoBanner>SIMULATION MODE — RESULTS ARE NOT LIVE DETECTIONS</DemoBanner>
    <div className="grid grid-2" style={{marginBottom:14}}>
      <Panel title="Choose a scenario" subtitle="Eight deterministic call patterns"><div className="grid grid-2">{scenarioData.map((s,i)=><button className="btn" key={s.id} onClick={()=>setScenario(i)} aria-pressed={scenario===i} style={{height:'auto',minHeight:67,justifyContent:'flex-start',textAlign:'left',whiteSpace:'normal',borderColor:scenario===i?'#48b9c8':undefined,background:scenario===i?'#162d38':undefined}} data-testid={`scenario-${s.id}`}><span><strong style={{display:'block',fontSize:10}}>{String(i+1).padStart(2,'0')} · {s.title}</strong><span style={{display:'block',fontSize:9,color:'#8798a6',marginTop:4}}>{s.objective}</span></span></button>)}</div></Panel>
      <Panel title="Scenario console" subtitle="Call preview is a synthetic visualization" action={<Badge tone={highRisk?'red':current.score<65?'amber':'green'}>{current.verdict}</Badge>}>
        <div className="call-preview"><div className="preview-grid"/><div className="face-outline"><div className="mesh"/><div className="face-line"/></div><div className="preview-caption">SIMULATED CALL · NO PERSON OR RECORDING</div><div className="preview-bottom"><span>{current.title}</span><span>00:{String(step*4).padStart(2,'0')}</span></div></div>
        <div className="score-layout" style={{marginTop:15}}><Score value={step===0?88:score}/><div className="score-meta"><div className="meta-row"><span>Illustrative trust</span><strong>{step===0?'88':score}/100</strong></div><div className="meta-row"><span>Evidence sufficiency</span><strong>{current.id==='uncertain'?'Insufficient':'Illustrative'}</strong></div><div className="meta-row"><span>Objective</span><strong>{current.objective}</strong></div></div></div>
        <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:13}}><button className="btn primary sm" onClick={start} disabled={playing}><Play size={13}/>Start / Replay</button><button className="btn sm" onClick={()=>setPlaying(false)} disabled={!playing}><Pause size={13}/>Pause</button><button className="btn sm" onClick={()=>setPlaying(true)} disabled={playing||step===0}><Play size={13}/>Resume</button><button className="btn sm" onClick={()=>{setPlaying(false);setStep(0);}}><RotateCcw size={13}/>Reset</button><button className="btn sm" onClick={()=>setScenario((scenario+1)%scenarioData.length)}>Switch scenario <ArrowRight size={12}/></button></div>
      </Panel>
    </div>
    {alertActive&&<div className="alert-card" role="alert" style={{marginBottom:14}}><div className="alert-title"><Siren size={15} style={{verticalAlign:'middle',marginRight:8}}/>POTENTIAL DEEPFAKE / IMPERSONATION DETECTED · SIMULATION</div><p style={{fontSize:10,color:'#e2b7b8'}}>Scenario signals: {current.signals.join(' · ')}. Illustrative confidence score: {current.score}/100. Recommended: {current.action}</p><div style={{display:'flex',gap:8}}><button className="btn sm" onClick={acknowledge}>Acknowledge</button><button className="btn sm" onClick={()=>onNavigate('/live-shield')}>Open verification panel</button><button className="btn sm" onClick={()=>onNavigate('/incidents')}>Review reports</button></div></div>}
    <div className="grid grid-2" style={{marginBottom:14}}>
      <Panel title="Event-by-event progression" subtitle={`${Math.min(step,current.steps.length)} of ${current.steps.length} events`}>
        <div className="progress-steps">{current.steps.map((_:string,i:number)=><i className={`step ${i<step?'on':''}`} key={i}/>)}</div><div className="timeline" style={{marginTop:15}}>{current.steps.map((s:string,i:number)=><div className={`timeline-item ${i===step-1&&highRisk?'alert':''}`} key={s}><div className="timeline-time">T+{String(i*4).padStart(2,'0')}s · {i<step?'OBSERVED · SIMULATED':'PENDING'}</div><div className="timeline-text"><strong>{s}</strong>{i<step&&<span style={{color:'#7e9aaa'}}> — signal update is illustrative</span>}</div></div>)}</div>
      </Panel>
      <Panel title="Signals and recommendation" subtitle="No actual media analysis takes place">
        {current.signals.map((s:string,i:number)=><div className="signal-row" key={s}><div className="signal-name">{s}</div><div className={`bar ${highRisk?'red':''}`}><i style={{width:`${step>i?Math.max(24,78-i*12):0}%`}}/></div><Badge tone={step>i?(highRisk?'red':'amber'):'gray'}>{step>i?'Illustrative':'Pending'}</Badge></div>)}
        <div className="notice" style={{marginTop:14}}><strong>Recommended response:</strong> {current.action}</div><div className="panel-kicker" style={{marginTop:10}}>Verdict rationale: {current.id==='benign'?'No flagged term in the short sample; identity still unverified.':current.id==='uncertain'?'Insufficient evidence; the interface intentionally remains uncertain.':'Multiple example context flags warrant independent verification.'}</div>
      </Panel>
    </div>
    <Panel title="Illustrative scenario comparison" subtitle="Provenance is unknown; labels describe example risk patterns, not real/fake samples">
      <div className="grid grid-2"><div className="panel" style={{background:'#142721',borderColor:'#2b4b40'}}><div style={{display:'flex',justifyContent:'space-between'}}><strong>Illustrative Lower-Risk Scenario</strong><Badge tone="green">82 / 100</Badge></div><p className="panel-kicker">Routine scheduling conversation · no urgency marker in sample · identity still unverified.</p><CompareRows lower/></div><div className="panel" style={{background:'#2b2023',borderColor:'#65404a'}}><div style={{display:'flex',justifyContent:'space-between'}}><strong>Illustrative Higher-Risk Scenario</strong><Badge tone="red">22 / 100</Badge></div><p className="panel-kicker">Urgent payment plus approval bypass language · verify out of band.</p><CompareRows/></div></div>
    </Panel>
  </div>;
}
function CompareRows({ lower = false }: { lower?: boolean }) { return <div>{['Facial movement','Temporal consistency','Lighting','Lip-sync','Audio characteristics','Transcript risk','Verification status'].map((v,i)=><div key={v} className="setting-row" style={{padding:'7px 0'}}><span className="setting-title">{v}</span><Badge tone={lower?'green':i===5?'red':'amber'}>{lower?(i===6?'Not verified':'Illustrative lower concern'):(i===5?'Urgency / payment':'Illustrative signal')}</Badge></div>)}</div>; }

function ScamReplay({ replay, setReplay, step, setStep, onReport }: any) {
  const items = scenarioData.slice(0,3);
  const selected = items[replay];
  const [playing,setPlaying] = useState(false);
  useEffect(()=>{
    if(!playing) return;
    const timer=window.setInterval(()=>setStep((current:number)=>Math.min(selected.steps.length,current+1)),1500);
    return ()=>window.clearInterval(timer);
  },[playing,selected.steps.length,setStep]);
  useEffect(()=>{if(step>=selected.steps.length)setPlaying(false);},[step,selected.steps.length]);
  return <div className="page"><PageHead eyebrow="DEMO WALKTHROUGH" title="Scam Replay" desc="Step through representative social-engineering scenarios, the signals that might be surfaced and a safer response. All content is simulated." actions={<button className="btn" onClick={()=>onReport()}><FileDown size={14}/> Generate sample report</button>}/><DemoBanner>REPLAY MODE · SIMULATED TRANSCRIPTS AND EVIDENCE · No calls or recordings</DemoBanner>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>{items.map((item,i)=><button key={item.id} className={`btn ${replay===i?'primary':''}`} onClick={()=>{setPlaying(false);setReplay(i);setStep(0);}}>{['CEO wire fraud','Family emergency','Fake bank manager'][i]}</button>)}</div>
    <div className="grid grid-2" style={{marginBottom:14}}>
      <Panel title={selected.title} subtitle={`Attacker objective · ${selected.objective}`} action={<Badge tone="red">Illustrative scenario</Badge>}>
        <div className="notice" style={{fontSize:12,color:'#d5e2e9',marginBottom:14}}>“{selected.transcript}”</div>
        <div className="score-layout"><Score value={step===0?86:Math.max(18,86-step*17)}/><div className="score-meta"><div className="meta-row"><span>Current trust score</span><strong>{step===0?86:Math.max(18,86-step*17)}/100</strong></div><div className="meta-row"><span>Risk label</span><strong style={{color:'#ef8c90'}}>{step>1?'High concern':'Unverified'}</strong></div><div className="meta-row"><span>Data sufficiency</span><strong>Illustrative only</strong></div></div></div>
        <div style={{display:'flex',gap:7,marginTop:14,flexWrap:'wrap'}}><button className="btn primary sm" onClick={()=>{setStep(0);setPlaying(true);}}><RotateCcw size={13}/>Replay</button><button className="btn sm" onClick={()=>setPlaying(false)} disabled={!playing}><Pause size={13}/>Pause</button><button className="btn sm" onClick={()=>setPlaying(true)} disabled={playing||step>=selected.steps.length}><Play size={13}/>Resume</button><button className="btn sm" onClick={()=>{setPlaying(false);setStep(Math.min(selected.steps.length,step+1));}}><Play size={13}/>Next event</button><button className="btn sm" onClick={()=>{setPlaying(false);setStep(Math.max(0,step-1));}}>Previous</button><button className="btn sm" onClick={()=>{setPlaying(false);setStep(0);}}><RotateCcw size={13}/>Reset</button></div>
        <div className="progress-steps" style={{marginTop:15}}>{selected.steps.map((_:string,i:number)=><i className={`step ${i<step?'on':''}`} key={i}/>)}</div>
      </Panel>
      <Panel title="Replay timeline" subtitle={`${step} of ${selected.steps.length} moments revealed`}><div className="timeline">{selected.steps.map((s:string,i:number)=><div className={`timeline-item ${i<step&&i===selected.steps.length-1?'alert':''}`} key={s}><div className="timeline-time">00:{String(i*12).padStart(2,'0')} · {i<step?'SIMULATED EVENT':'UPCOMING'}</div><div className="timeline-text" style={{opacity:i<step?1:.45}}>{s}</div></div>)}</div></Panel>
    </div>
    <div className="grid grid-2"><Panel title="Signal summary" subtitle="Illustrative evidence, no model output">{selected.signals.map((signal:string,i:number)=><div className="event-row" key={signal}><span className={`event-mark ${i===0?'red':'amber'}`}/><div style={{flex:1}}><div className="event-title">{signal}</div><div className="event-detail">Simulation signal · severity context only</div></div><Badge tone="amber">Example</Badge></div>)}</Panel><Panel title="Recommended defense & summary" subtitle="No call action is taken automatically"><div className="notice">{selected.action}</div><div className="setting-row"><span className="setting-title">Alert moments</span><Badge tone={step>=2?'red':'gray'}>{step>=2?'Shown in replay':'Not reached'}</Badge></div><div className="setting-row"><span className="setting-title">User action</span><span className="metric-label">{step>=selected.steps.length?'Independent verification advised':'Awaiting user action'}</span></div><div className="setting-row"><span className="setting-title">Recording status</span><Badge tone="gray">No recording exists</Badge></div><button className="btn sm" style={{marginTop:12}} onClick={()=>onReport()}>Create metadata-only report</button></Panel></div>
  </div>;
}

function Incidents({ incidents, setIncidents, query, setQuery, filter, setFilter, sort, setSort, selected, setSelected, onReport, onPrint, onToast }: { incidents: Incident[]; setIncidents: (value: Incident[] | ((previous: Incident[]) => Incident[])) => void; query: string; setQuery: (value: string) => void; filter: string; setFilter: (value: string) => void; sort: string; setSort: (value: string) => void; selected: Incident | null; setSelected: (value: Incident | null) => void; onReport: (incident?: Incident) => void; onPrint: (incident?: Incident) => void; onToast: (message: string) => void }) {
  const [category, setCategory] = useState('All categories');
  const [verdict, setVerdict] = useState('All verdicts');
  const [date, setDate] = useState('Any date');
  const [resolution, setResolution] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const filtered = useMemo(() => incidents.filter((i:Incident) => {
    const q = `${i.title} ${i.id} ${i.category} ${i.verdict}`.toLowerCase().includes(query.toLowerCase());
    const sev = filter === 'All severities' || i.severity === filter;
    const cat = category === 'All categories' || i.category === category;
    const ver = verdict === 'All verdicts' || i.verdict === verdict;
    const dt = date === 'Any date' || (date === 'Today' ? i.time.startsWith('Today') : !i.time.startsWith('Today'));
    return q && sev && cat && ver && dt;
  }).sort((a:Incident,b:Incident)=>sort==='Highest risk first'?a.score-b.score:sort==='Oldest first'?a.id.localeCompare(b.id):b.id.localeCompare(a.id)), [incidents,query,filter,category,verdict,date,sort]);
  return <div className="page"><PageHead eyebrow="METADATA-ONLY DEMONSTRATION HISTORY" title="Incident History" desc="Search, triage and export sample incident metadata. VeriCall does not record calls or retain audio/video in this demo." actions={<button className="btn primary" onClick={()=>{setSelected(incidents[0]);setReportOpen(true);}}><FileDown size={14}/> Report preview</button>}/><DemoBanner>ALL INCIDENTS ARE SIMULATED SAMPLE DATA · No stored recordings</DemoBanner>
    <div className="grid grid-4" style={{marginBottom:14}}><Metric label="SAMPLE INCIDENTS" value={String(incidents.length).padStart(2,'0')}/><Metric label="HIGH SEVERITY · SAMPLE" value={String(incidents.filter((i:Incident)=>i.severity==='High').length).padStart(2,'0')}/><Metric label="NEEDS FOLLOW-UP" value={String(incidents.filter((i:Incident)=>i.resolution.includes('recommended')).length).padStart(2,'0')}/><Metric label="RECORDINGS RETAINED" value="00" delta="Metadata only"/></div>
    <Panel title="Incident register" subtitle={`${filtered.length} sample records`} action={<button className="btn sm" onClick={()=>onReport(filtered[0])} disabled={!filtered.length}><Download size={13}/> Export report</button>}>
      <div className="grid grid-4" style={{marginBottom:13}}><div className="field"><label htmlFor="incident-search">Search records</label><input id="incident-search" className="input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ID, title or category…" data-testid="input-incident-search"/></div><div className="field"><label htmlFor="incident-severity">Severity</label><select id="incident-severity" className="select" value={filter} onChange={e=>setFilter(e.target.value)}><option>All severities</option><option>High</option><option>Medium</option><option>Low</option></select></div><div className="field"><label htmlFor="incident-category">Category</label><select id="incident-category" className="select" value={category} onChange={e=>setCategory(e.target.value)}><option>All categories</option>{Array.from(new Set(incidents.map((i:Incident)=>i.category))).map(c=><option key={c}>{c}</option>)}</select></div><div className="field"><label htmlFor="incident-verdict">Verdict</label><select id="incident-verdict" className="select" value={verdict} onChange={e=>setVerdict(e.target.value)}><option>All verdicts</option>{Array.from(new Set(incidents.map((i:Incident)=>i.verdict))).map(v=><option key={v}>{v}</option>)}</select></div><div className="field"><label htmlFor="incident-date">Date</label><select id="incident-date" className="select" value={date} onChange={e=>setDate(e.target.value)}><option>Any date</option><option>Today</option><option>Earlier</option></select></div><div className="field"><label htmlFor="incident-sort">Sort by</label><select id="incident-sort" className="select" value={sort} onChange={e=>setSort(e.target.value)}><option>Newest first</option><option>Oldest first</option><option>Highest risk first</option></select></div></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Incident</th><th>Severity</th><th>Category</th><th>Verdict</th><th>Authenticity*</th><th>Time</th><th>Resolution</th><th>Actions</th></tr></thead><tbody>{filtered.map((i:Incident)=><tr key={i.id} data-testid={`row-incident-${i.id}`}><td><button className="text-link" style={{background:'none',border:0,cursor:'pointer'}} onClick={()=>{setSelected(i);setResolution(i.resolution);}}>{i.id} · {i.title}</button><div className="panel-kicker">Simulated sample record</div></td><td><Badge tone={i.severity==='High'?'red':i.severity==='Medium'?'amber':'green'}>{i.severity}</Badge></td><td>{i.category}</td><td>{i.verdict}</td><td className="mono">{i.score}/100*</td><td>{i.time}</td><td>{i.resolution}</td><td><button className="icon-btn" aria-label={`Open ${i.id} report`} onClick={()=>{setSelected(i);setResolution(i.resolution);}}><ChevronRight size={14}/></button></td></tr>)}</tbody></table></div>
      {!filtered.length&&<div className="empty-state">No sample incidents match these filters. Adjust the search or create a demo scenario.</div>}<div className="panel-kicker" style={{marginTop:12}}>*Illustrative score, not a live detector output or validated measure.</div>
    </Panel>
    {selected&&<div className="modal-backdrop" role="presentation" onClick={()=>setSelected(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="incident-modal-title" onClick={e=>e.stopPropagation()}><div style={{display:'flex',justifyContent:'space-between'}}><div><div className="eyebrow">SAMPLE INCIDENT · {selected.id}</div><h2 id="incident-modal-title">{selected.title}</h2></div><button className="icon-btn" onClick={()=>setSelected(null)} aria-label="Close incident details"><X size={15}/></button></div><div className="notice">{selected.detail}</div><div className="grid grid-2" style={{marginTop:12}}><div className="setting-row"><span className="setting-title">Severity</span><Badge tone={selected.severity==='High'?'red':'amber'}>{selected.severity}</Badge></div><div className="setting-row"><span className="setting-title">Verdict</span><span>{selected.verdict}</span></div><div className="setting-row"><span className="setting-title">Assessment</span><span>{selected.score}/100 illustrative</span></div><div className="setting-row"><span className="setting-title">Recording</span><Badge tone="gray">None retained</Badge></div></div><h3 className="panel-title" style={{marginTop:15}}>Event timeline</h3><div className="timeline" style={{marginTop:10}}>{[['10:42:00','Call context entered · sample'],['10:42:11','Heuristic / illustrative signal noted'],['10:42:18','Independent verification recommended']].map(([t,s])=><div className="timeline-item" key={t}><div className="timeline-time">{t}</div><div className="timeline-text">{s}</div></div>)}</div><div className="field" style={{marginTop:5}}><label htmlFor="resolution-note">Resolution / verification history</label><input id="resolution-note" className="input" value={resolution} onChange={e=>setResolution(e.target.value)} placeholder="Add a local note"/></div><div className="modal-actions"><button className="btn" onClick={()=>{setIncidents((prev:Incident[])=>prev.map(i=>i.id===selected.id?{...i,resolution}:i));onToast('Resolution note saved in this session.');}}>Save note</button><button className="btn" onClick={()=>onPrint(selected)}>Print / Save as PDF</button><button className="btn primary" onClick={()=>onReport(selected)}>Export metadata report</button></div></section></div>}
    {reportOpen&&selected&&<Modal title={`Report preview · ${selected.id}`} onClose={()=>setReportOpen(false)} actions={<><button className="btn ghost" onClick={()=>setReportOpen(false)}>Close</button><button className="btn" onClick={()=>{onPrint(selected);setReportOpen(false);}}>Print / Save as PDF</button><button className="btn primary" onClick={()=>{onReport(selected);setReportOpen(false);}}>Export report</button></>}><div className="notice">SIMULATED SAMPLE REPORT</div><p><strong>{selected.title}</strong><br/>Incident ID {selected.id} · {selected.time}<br/>Risk: {selected.severity} · {selected.verdict}<br/>Illustrative authenticity confidence: {selected.score}/100</p><p>{selected.detail}</p><p>No recording was made. Evidence is demonstration metadata, not actual AI output. Follow up by independently verifying through known contact details.</p><p>Use Print / Save as PDF for a printable report with event metadata, verification notes, limitations and recommended follow-up.</p></Modal>}
  </div>;
}

function Contacts({ contacts, setContacts, query, setQuery, setForm, setModal, onToast }: any) {
  const [filter, setFilter] = useState('All relationships');
  const filtered = contacts.filter((c:Contact)=>`${c.name} ${c.organization} ${c.role} ${c.email}`.toLowerCase().includes(query.toLowerCase())&&(filter==='All relationships'||c.relationship===filter));
  return <div className="page"><PageHead eyebrow="CALLBACK DIRECTORY · LOCAL DEMO CONFIGURATION" title="Trusted Contacts" desc="Saved numbers make independent callback safer. Confirm details using a known channel before relying on them." actions={<button className="btn primary" onClick={()=>setForm({id:0,name:'',relationship:'Family',organization:'',role:'',phone:'',email:'',consent:false,status:'Not enrolled',verified:'Not verified'})} data-testid="button-add-contact"><Plus size={14}/> Add contact</button>}/><DemoBanner>Contact details are local demo configuration · safe words and raw biometric samples are never stored</DemoBanner>
    <div className="grid grid-3" style={{marginBottom:14}}><Metric label="SAVED CONTACTS" value={String(contacts.length).padStart(2,'0')}/><Metric label="REFERENCE ENROLLMENT" value="00" delta="Not implemented"/><Metric label="SAFE WORDS STORED" value="00" delta="Never stored"/></div>
    <Panel title="Contact vault" subtitle="Biometric reference enrollment requires explicit consent and stronger production safeguards" action={<button className="btn sm" onClick={()=>onToast('Use trusted saved details; this directory does not place calls.')}><Headphones size={13}/> Callback guidance</button>}>
      <div style={{display:'flex',gap:9,marginBottom:14,flexWrap:'wrap'}}><input className="input" style={{maxWidth:330}} aria-label="Search contacts" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search names, roles or organization…" data-testid="input-contact-search"/><select className="select" style={{width:190}} aria-label="Filter by relationship" value={filter} onChange={e=>setFilter(e.target.value)}><option>All relationships</option><option>Family</option><option>Colleague</option><option>Friend</option><option>Other</option></select></div>
      {filtered.length?<div className="grid grid-2">{filtered.map((c:Contact)=><article className="panel" key={c.id} data-testid={`card-contact-${c.id}`} style={{background:'#121d2a'}}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><div><div style={{fontSize:14,fontWeight:700,color:'#e3edf2'}}>{c.name}</div><div className="panel-kicker">{c.role} · {c.organization||'Personal'}</div></div><Badge tone={c.consent?'green':'gray'}>{c.relationship}</Badge></div><div className="setting-row"><span className="setting-title">Known phone</span><span className="mono">{c.phone||'Not provided'}</span></div><div className="setting-row"><span className="setting-title">Known email</span><span>{c.email||'Not provided'}</span></div><div className="setting-row"><span className="setting-title">Reference status</span><Badge tone="gray">{c.status}</Badge></div><div className="setting-row"><span className="setting-title">Last verified</span><span className="metric-label">{c.verified}</span></div><div className="notice" style={{marginTop:9}}>Stop the suspicious interaction, then independently call this known number. No call is placed by VeriCall.</div><div style={{display:'flex',gap:7,marginTop:10,flexWrap:'wrap'}}><button className="btn sm" onClick={()=>onToast(`Stop the interaction and independently call ${c.name} at ${c.phone}. No call placed.`)}><Headphones size={13}/> Callback reminder</button><button className="btn sm" onClick={()=>onToast('Confirm a pre-agreed safe word privately. Do not enter or store the word here; confirmation is not proof of identity.')}>Confirm safe word privately</button><button className="btn sm" onClick={()=>setForm(c)}>Edit</button><button className="btn danger sm" onClick={()=>setModal({title:`Remove ${c.name}?`,body:'Remove this non-sensitive demo contact from local browser storage? This does not delete any real account data.',action:()=>{setContacts((prev:Contact[])=>prev.filter(x=>x.id!==c.id));onToast('Contact removed.');},confirm:'Remove contact'})}>Remove</button></div></article>)}</div>:<div className="empty-state"><Users size={22} style={{margin:'0 auto 8px'}}/>No contacts match this search. Add a trusted contact or adjust filters.</div>}
      <div className="notice" style={{marginTop:15}}>Production biometric enrollment requires explicit consent, a secure protected store, retention limits and deletion controls. This preview accepts no face or voice samples. Optional safe-word confirmation must happen privately; actual safe words are never persisted here.</div>
    </Panel>
  </div>;
}

function Enterprise({ role, setRole, alert, setAlert, onToast }: any) {
  const [assigned, setAssigned] = useState('Maya Chen');
  const [policy, setPolicy] = useState('Require second approval for wire transfers');
  const [watchlist, setWatchlist] = useState('CEO, CFO, General Counsel');
  const [events, setEvents] = useState(['Executive impersonation pattern flagged · simulated','Escalation reminder assigned to analyst · simulated']);
  const [teamAlert, setTeamAlert] = useState(true);
  const warning = () => { setEvents((e:string[])=>['Organization-wide warning preview triggered by one employee’s simulated report',...e]);onToast('Organization-wide warning preview broadcast to this demo view only.'); };
  return <div className="page"><PageHead eyebrow="ORGANIZATION WORKSPACE · SIMULATED" title="Enterprise Security" desc="Explore role-specific workflow prototypes. Every metric, assignment, alert and organization action is a local demonstration." actions={<select className="select" style={{width:200}} value={role} onChange={e=>setRole(e.target.value)} aria-label="Select demo role" data-testid="select-enterprise-role"><option>Security administrator</option><option>Security analyst</option><option>Employee</option></select>}/><DemoBanner>ORGANIZATION ACTIVITY AND ALERTS ARE SIMULATED · No authenticated organization is connected</DemoBanner>
    <div className="notice" style={{marginBottom:14}}><Building2 size={14} style={{verticalAlign:'middle',marginRight:8}}/><strong>Viewing as: {role}.</strong> This is an unauthenticated role preview. Actions change local demo state only.</div>
    <div className="grid grid-4" style={{marginBottom:14}}><Metric label="SESSIONS · DEMO" value="426"/><Metric label="HIGH-RISK INCIDENTS · DEMO" value="08" tone="#ef8589"/><Metric label="EXECUTIVE IMPERSONATION · DEMO" value="03"/><Metric label="DEPARTMENTS · DEMO" value="06"/></div>
    {role==='Employee'?<div className="grid grid-2"><Panel title="Employee security view" subtitle="Your sample calls and recommended actions"><div className="alert-card"><div className="alert-title">VERIFY BEFORE ACTING</div><p>Sample alert: a caller requests an urgent wire transfer and asks you to skip approval. These are simulated signals.</p><button className="btn sm" onClick={warning}>Preview organization warning</button></div><div className="setting-row"><span className="setting-title">Your team policy</span><span>{policy}</span></div></Panel><Panel title="Safe response"><div className="timeline">{[['Stop','Pause payment, credential or approval actions.'],['Verify','Use a trusted number from your own directory.'],['Report','Share event metadata; never upload sensitive recordings.']].map(([a,b])=><div className="timeline-item" key={a}><div className="timeline-text"><strong>{a}</strong> — {b}</div></div>)}</div></Panel></div>:<div className="grid grid-2" style={{marginBottom:14}}>
      <Panel title="Organization risk by department" subtitle="Illustrative demonstration metrics"><div>{[['Finance',74,5],['Executive office',58,3],['People operations',37,2],['Customer support',24,1],['Legal',19,1]].map(([name,amount,count])=><div className="signal-row" key={String(name)}><div className="signal-name">{name}<div className="signal-sub">{count} sample flags</div></div><div className="bar"><i style={{width:`${amount}%`}}/></div><Badge tone={Number(amount)>60?'red':Number(amount)>35?'amber':'green'}>{amount}% sample</Badge></div>)}</div></Panel>
      <Panel title="Recent analyst activity" subtitle="Demo event feed">{events.map((e:string,i:number)=><div className="event-row" key={`${i}-${e}`}><span className={`event-mark ${i===0?'amber':'blue'}`}/><div className="event-title">{e}</div><span className="event-time">{i===0?'now':'10:14'}</span></div>)}</Panel>
    </div>}
    {role!=='Employee'&&<div className="grid grid-2" style={{marginBottom:14}}>
      <Panel title="Incident assignment & escalation" subtitle="Local role-play workflow"><div className="field"><label htmlFor="assignee">Assign analyst</label><select id="assignee" className="select" value={assigned} onChange={e=>setAssigned(e.target.value)}><option>Maya Chen</option><option>Jonas Patel</option><option>Escalation queue</option></select></div><div style={{display:'flex',gap:8,marginTop:10}}><button className="btn sm" onClick={()=>{setEvents((e:string[])=>[`Sample incident assigned to ${assigned}`,...e]);onToast(`Demo assignment set: ${assigned}`);}}>Assign incident</button><button className="btn sm" onClick={()=>{setEvents((e:string[])=>['Simulated escalation recorded · no external notification',...e]);onToast('Demo escalation recorded locally; no message sent.');}}>Escalate</button></div><div className="setting-row"><span className="setting-title">Escalation status</span><Badge tone="amber">Local preview</Badge></div></Panel>
      <Panel title="Executive impersonation watchlist" subtitle="Text labels only · no identity matching"><div className="field"><label htmlFor="watchlist">Watchlist roles or names</label><textarea id="watchlist" className="textarea" style={{minHeight:70}} value={watchlist} onChange={e=>setWatchlist(e.target.value)}/></div><button className="btn sm" style={{marginTop:9}} onClick={()=>onToast('Watchlist labels saved in current view only. No match monitoring occurs.')}>Save demo watchlist</button><div className="panel-kicker" style={{marginTop:8}}>Watchlist labels are not compared to calls.</div></Panel>
    </div>}
    {role==='Security administrator'&&<div className="grid grid-2">
      <Panel title="Organization-wide controls" subtitle="Demo action only"><div className="setting-row"><div><div className="setting-title">Organization-wide warning preview</div><div className="setting-desc">Simulate a wider warning when one employee reports a concern.</div></div><input type="checkbox" className="toggle" checked={alert} onChange={e=>setAlert(e.target.checked)} aria-label="Enable organization warning preview"/></div><button className="btn danger sm" disabled={!alert} onClick={warning}><AlertTriangle size={13}/> Preview org-wide warning</button><div className="setting-row"><div><div className="setting-title">Team alert notifications</div><div className="setting-desc">Local UI preference; no email or SMS is sent.</div></div><input type="checkbox" className="toggle" checked={teamAlert} onChange={e=>setTeamAlert(e.target.checked)} aria-label="Enable team alert demo preference"/></div></Panel>
      <Panel title="Policy configuration" subtitle="A suggested prototype policy"><div className="field"><label htmlFor="policy">Sample policy</label><select className="select" id="policy" value={policy} onChange={e=>setPolicy(e.target.value)}><option>Require second approval for wire transfers</option><option>Never share one-time passcodes</option><option>Verify executive requests on a known channel</option><option>Escalate urgent payment requests</option></select></div><div className="notice" style={{marginTop:12}}>A policy update here is a local demo. A production deployment needs authenticated controls, audit trail, authorization and confirmed delivery.</div></Panel>
    </div>}
  </div>;
}

function Benchmarks({ dataset, setDataset, runs, setRuns, onToast }: any) {
  const [state, setState] = useState('idle');
  const [threshold, setThreshold] = useState('0.50');
  const [comparison, setComparison] = useState('No connected model');
  const [historySelected, setHistorySelected] = useState<number|null>(null);
  const datasets = ['FaceForensics++','ASVspoof','Other licensed dataset'];
  const exportSummary=()=>{const content=`VeriCall Benchmark Lab — evaluation plan\nDataset: ${dataset}\nModel: ${comparison}\nStatus: ${runs.length?'No actual benchmark executed':'No benchmark run'}\nTP / FP / TN / FN, precision, recall, F1, FPR, ROC and AUC are intentionally blank until evaluated on a licensed test set.\nThreshold configuration: ${threshold}\nNo performance claim is made.`;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:'text/plain'}));a.download='vericall-benchmark-summary.txt';a.click();URL.revokeObjectURL(a.href);onToast('Benchmark plan exported; no performance metrics fabricated.');};
  const run=()=>{setState('preparing');window.setTimeout(()=>{setState('unavailable');setRuns((r:any[])=>[{dataset,time:new Date().toLocaleString()},...r]);onToast('No model or licensed dataset is connected. No benchmark metrics calculated.');},950);};
  return <div className="page"><PageHead eyebrow="HONEST EVALUATION WORKSPACE" title="Benchmark Lab" desc="Configure a future evaluation. No detector, licensed dataset or test-set results are connected to this preview." actions={<button className="btn" onClick={exportSummary}><Download size={14}/> Export summary</button>}/><DemoBanner>NO VALIDATED ACCURACY CLAIMS · No benchmark has been run</DemoBanner>
    <div className="grid grid-2" style={{marginBottom:14}}>
      <Panel title="Evaluation configuration" subtitle="Future workflow for licensed, appropriately governed test sets">
        <div className="field"><label htmlFor="dataset-select">Dataset</label><select id="dataset-select" className="select" value={dataset} onChange={e=>setDataset(e.target.value)}>{datasets.map(d=><option key={d}>{d}</option>)}</select><div className="panel-kicker">Dataset status: not installed / not licensed in this frontend demo</div></div>
        <div className="grid grid-2" style={{marginTop:12}}><div className="field"><label htmlFor="eval-model">Model under evaluation</label><select id="eval-model" className="select" value={comparison} onChange={e=>setComparison(e.target.value)}><option>No connected model</option><option>ONNX Runtime Web · future integration</option><option>Model comparison · unavailable</option></select></div><div className="field"><label htmlFor="threshold">Illustrative decision threshold</label><input id="threshold" className="input" value={threshold} onChange={e=>setThreshold(e.target.value)} inputMode="decimal"/></div></div>
        <div className="setting-row"><span className="setting-title">Test-set size</span><Badge tone="gray">Not available</Badge></div><div className="setting-row"><span className="setting-title">Estimated compute status</span><Badge tone="gray">Not configured</Badge></div>
        <button className="btn primary" style={{marginTop:12}} onClick={run} disabled={state==='preparing'} data-testid="button-run-benchmark"><Play size={13}/>{state==='preparing'?'Checking integrations…':'Run benchmark'}</button>
        {state==='unavailable'&&<div className="notice" role="status" style={{marginTop:11}}>Unable to run: no benchmark engine, model weights or licensed dataset are connected. A history entry records this attempted configuration only; no metric was created.</div>}
      </Panel>
      <Panel title="Metric definitions" subtitle="Computed from labeled held-out evaluation data only">
        <div className="grid grid-2">{[['True positive','TP'],['False positive','FP'],['True negative','TN'],['False negative','FN'],['Precision','TP / (TP + FP)'],['Recall','TP / (TP + FN)'],['F1','2 × P × R / (P + R)'],['False-positive rate','FP / (FP + TN)']].map(([name,formula])=><div key={name} className="setting-row" style={{padding:'8px 0'}}><span className="setting-title">{name}</span><span className="mono" style={{fontSize:9,color:'#80cbd1'}}>{formula}</span></div>)}</div><div className="notice" style={{marginTop:10}}>ROC plots true-positive rate against false-positive rate over thresholds. AUC requires actual labeled test predictions; no ROC/AUC is shown without those values.</div>
      </Panel>
    </div>
    <div className="grid grid-2" style={{marginBottom:14}}>
      <Panel title="ROC curve" subtitle="No evaluation scores available"><div className="empty-state" style={{height:205,display:'grid',placeContent:'center'}}><div><div style={{fontSize:12,color:'#ccd9e0'}}>No ROC curve to display</div><div style={{marginTop:6}}>Connect a validated model and licensed labeled test set.</div></div></div><div className="metric-label" style={{textAlign:'center'}}>False-positive rate → · True-positive rate ↑ · AUC: —</div></Panel>
      <Panel title="Confusion matrix" subtitle="Counts remain blank until actual evaluation"><div className="grid grid-2" style={{gap:4,margin:'15px auto',maxWidth:350,textAlign:'center'}}><span/><span className="metric-label">Predicted positive</span><span className="metric-label">Actual positive</span><div className="notice" style={{textAlign:'center'}}>TP —</div><span className="metric-label">Actual negative</span><div className="notice" style={{textAlign:'center'}}>FP —</div><div className="notice" style={{textAlign:'center'}}>FN —</div><div className="notice" style={{textAlign:'center'}}>TN —</div></div><div className="panel-kicker">No scores fabricated. No validated accuracy implied.</div></Panel>
    </div>
    <Panel title="Evaluation history" subtitle="Attempted configurations; not benchmark results" action={<button className="btn sm" onClick={exportSummary}><FileDown size={13}/> Export summary</button>}>
      {runs.length?runs.map((r:any,i:number)=><div className="event-row" key={`${r.time}-${i}`}><span className="event-mark amber"/><div style={{flex:1}}><div className="event-title">{r.dataset} · no run executed</div><div className="event-detail">{r.time} · no model or dataset connected</div></div><button className="btn sm" onClick={()=>setHistorySelected(i)}>Details</button></div>):<div className="empty-state"><Gauge size={21} style={{margin:'0 auto 7px'}}/>No benchmark runs. Configure licensed data and an evaluation engine to begin.</div>}
      {historySelected!==null&&runs[historySelected]&&<div className="notice" style={{marginTop:12}}>Configuration: {runs[historySelected].dataset}. Status: unavailable. TP, FP, TN, FN, precision, recall, F1, FPR, ROC and AUC were not calculated.</div>}
    </Panel>
  </div>;
}

function Settings({ settings, setSettings, monitoring, onStop, contactsCount, onNavigate, onReset, onToast }: any) {
  const patch=(key:string,value:any)=>setSettings((s:any)=>({...s,[key]:value}));
  const exportSettings=()=>{const safe={...settings,monitoringIndicator:'read-only',biometricsStored:false,recordingsStored:false,safeWordsStored:false};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(safe,null,2)],{type:'application/json'}));a.download='vericall-local-settings.json';a.click();URL.revokeObjectURL(a.href);onToast('Harmless settings exported. No sensitive data included.');};
  return <div className="page"><PageHead eyebrow="PRIVACY, ACCESS & CONSENT" title="Privacy & Settings" desc="The security boundary in this preview is the browser: capture stays local, nothing is recorded by default, and models are not connected." actions={<button className="btn" onClick={exportSettings}><Download size={14}/> Export settings</button>}/><DemoBanner>NO CAMERA / MICROPHONE / BIOMETRIC DATA IS SENT TO A SERVER</DemoBanner>
    {monitoring&&<div className="alert-card" style={{marginBottom:14}} role="status"><div className="alert-title"><Radio size={15} style={{verticalAlign:'middle',marginRight:8}}/>MONITORING ACTIVE · BROWSER-LOCAL</div><p style={{fontSize:10,color:'#dfc1c1'}}>Capture continues until stopped. The stream remains in this browser and no recording is made.</p><button className="btn danger sm" onClick={onStop}><StopCircle size={13}/> Stop monitoring now</button></div>}
    <div className="grid grid-2" style={{marginBottom:14}}>
      <Panel title="Permissions & processing" subtitle="Permission requests occur only when a capture control is used">
        {[['Camera status',monitoring?'Browser stream active':'Not requested'],['Microphone status',monitoring?'Browser stream active':'Not requested'],['On-device processing','Design goal · no analysis model connected'],['Model integration','Simulated / unavailable'],['Backend integration','Not connected'],['External media transfer','None in this frontend demo']].map(([a,b],i)=><div className="setting-row" key={a}><div><div className="setting-title">{a}</div><div className="setting-desc">{b}</div></div><Badge tone={i<2&&monitoring?'green':'gray'}>{i<2&&monitoring?'Active locally':i===5?'None':'Not connected'}</Badge></div>)}
        <button className="btn sm" style={{marginTop:12}} onClick={()=>onNavigate('/live-shield')}>Open capture controls</button>
      </Panel>
      <Panel title="Privacy controls" subtitle="Nothing sensitive is persisted by this application">
        <div className="setting-row"><div><div className="setting-title">Recording by default</div><div className="setting-desc">Disabled. No video or audio recording is implemented.</div></div><Badge tone="green">Off</Badge></div>
        <div className="setting-row"><div><div className="setting-title">Raw biometric retention</div><div className="setting-desc">No face / voice samples, embeddings or biometric data are stored.</div></div><Badge tone="green">None</Badge></div>
        <div className="setting-row"><div><div className="setting-title">Safe words / credentials</div><div className="setting-desc">Never stored in browser storage or sent to a server.</div></div><Badge tone="green">Never saved</Badge></div>
        <div className="setting-row"><div><div className="setting-title">Contact sample configuration</div><div className="setting-desc">Non-sensitive contact details can be stored locally for the demo only.</div></div><Badge tone="amber">{contactsCount} local</Badge></div>
        <div className="setting-row"><div><div className="setting-title">Data retention</div><div className="setting-desc">Incident metadata exists only in current app session; sample contacts stay local until removed.</div></div><Badge tone="gray">Metadata only</Badge></div>
        <button className="btn sm" style={{marginTop:10}} onClick={()=>onNavigate('/trusted-contacts')}>Manage trusted contacts</button>
      </Panel>
    </div>
    <div className="grid grid-2" style={{marginBottom:14}}>
      <Panel title="Alerts & behavior" subtitle="Harmless local preferences">
        <div className="setting-row"><div><div className="setting-title">Optional alert sound</div><div className="setting-desc">Muted by default; this demo does not play sounds unless explicitly enabled.</div></div><input type="checkbox" className="toggle" checked={settings.alertSound} onChange={e=>patch('alertSound',e.target.checked)} aria-label="Enable alert sound preference"/></div>
        <div className="setting-row"><div><div className="setting-title">Desktop notifications</div><div className="setting-desc">Preference only; no service worker or message sending is configured.</div></div><input type="checkbox" className="toggle" checked={settings.notifications} onChange={e=>patch('notifications',e.target.checked)} aria-label="Enable notification preference"/></div>
        <div className="field" style={{marginTop:12}}><label htmlFor="sensitivity">Illustrative sensitivity</label><select id="sensitivity" className="select" value={settings.sensitivity} onChange={e=>patch('sensitivity',e.target.value)}><option>Conservative</option><option>Balanced</option><option>Elevated</option></select><div className="panel-kicker">Setting does not change an analysis model; none is connected.</div></div>
      </Panel>
      <Panel title="Language & accessibility" subtitle="Interface foundations · detection parity not evaluated">
        <div className="field"><label htmlFor="language">Interface language</label><select id="language" className="select" value={settings.language} onChange={e=>patch('language',e.target.value)}>{['English','हिन्दी · Hindi','ಕನ್ನಡ · Kannada','தமிழ் · Tamil'].map(l=><option key={l}>{l}</option>)}</select><div className="panel-kicker">Detection performance across languages has not been evaluated.</div></div>
        <div className="setting-row"><div><div className="setting-title">Compact information density</div><div className="setting-desc">Preference for a tighter workspace layout.</div></div><input type="checkbox" className="toggle" checked={settings.compact} onChange={e=>patch('compact',e.target.checked)} aria-label="Toggle compact layout preference"/></div>
        <div className="notice" style={{marginTop:12}}>Keyboard focus indicators, labeled controls, status announcements and reduced-motion support are built in. For immediate safety, end monitoring from the persistent active-session indicator.</div>
      </Panel>
    </div>
    <div className="grid grid-2">
      <Panel title="Consent & integration transparency" subtitle="What is real in this preview">
        <div className="timeline">{[['Browser media APIs','Real permission prompts when you initiate capture. Streams stay browser-local.'],['Transcript analysis','Transparent local keyword heuristics; not AI or speech-to-text.'],['Video / audio detection','Simulated placeholders; no inference or model connected.'],['Identity matching','Unavailable. No reference face or voice is accepted.'],['Messaging / callback','No SMS, email or phone call is sent or placed.'],['Virtual camera / call apps','No OS-level driver or Zoom / Teams / FaceTime control.']].map(([a,b])=><div className="timeline-item" key={a}><div className="timeline-text"><strong>{a}</strong> — {b}</div></div>)}</div>
      </Panel>
      <Panel title="Demo data controls" subtitle="Reset removes demonstration state only">
        <div className="notice">Settings export includes non-sensitive preferences only. Reset does not affect a real account, recordings or backend because none exist.</div><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:13}}><button className="btn" onClick={exportSettings}><Download size={13}/> Export local settings</button><button className="btn danger" onClick={onReset}><RotateCcw size={13}/> Reset demo data</button></div>
      </Panel>
    </div>
  </div>;
}

function Modal({ title, children, actions, onClose }: { title: string; children: ReactNode; actions?: ReactNode; onClose: () => void }) {
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div style={{display:'flex',justifyContent:'space-between',gap:14,alignItems:'flex-start'}}><h2 id="dialog-title">{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close dialog" data-testid="button-close-dialog"><X size={15}/></button></div><div style={{fontSize:11,color:'#9baab6',lineHeight:1.65}}>{children}</div>{actions&&<div className="modal-actions">{actions}</div>}</section></div>;
}

export default App;
