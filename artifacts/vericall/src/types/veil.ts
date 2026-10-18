export type RiskLevel = 'low' | 'medium' | 'high' | 'insufficient';

export type SignalCategory = 'video' | 'audio' | 'behavior' | 'context' | 'identity';

export interface DetectionSignal {
  id: string;
  name: string;
  category: SignalCategory;
  categoryLabel: string;
  status: 'nominal' | 'suspicious' | 'elevated' | 'insufficient' | 'unavailable';
  confidence: number; // 0 - 100
  severity: 'Low' | 'Medium' | 'High' | 'Informational';
  evidence: string;
  timestamp: string;
  isHeuristic: boolean;
  isSimulated: boolean;
  isLiveMeasured: boolean;
}

export interface Contact {
  id: number;
  name: string;
  relationship: string;
  organization: string;
  role: string;
  phone: string;
  email: string;
  consent: boolean;
  status: string;
  verified: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: 'High' | 'Medium' | 'Low';
  category: string;
  verdict: 'Suspicious' | 'Needs review' | 'Inconclusive' | 'Low concern';
  time: string;
  score: number;
  resolution: string;
  detail: string;
  signals?: string[];
  transcriptExcerpt?: string;
  callerClaim?: string;
}

export interface ScenarioStep {
  timeOffset: number; // seconds
  title: string;
  detail: string;
  score: number;
  signalTriggered?: string;
  severity: 'Low' | 'Medium' | 'High';
  isAlertPoint?: boolean;
}

export interface AttackScenario {
  id: string;
  title: string;
  objective: string;
  callerClaim: string;
  transcript: string;
  score: number;
  signals: string[];
  verdict: string;
  steps: ScenarioStep[];
  action: string;
  riskCategory: string;
}

export interface LanguageStrings {
  appName: string;
  appSubtitle: string;
  liveShield: string;
  overview: string;
  threatIntel: string;
  simulator: string;
  scamReplay: string;
  incidents: string;
  contacts: string;
  enterprise: string;
  benchmarks: string;
  settings: string;
  startMonitoring: string;
  endMonitoring: string;
  pauseMonitoring: string;
  resumeMonitoring: string;
  requestPermission: string;
  launchDemo: string;
  trustScore: string;
  stopTripwire: string;
  verifyCaller: string;
  callbackReminder: string;
  livenessChallenge: string;
  phraseChallenge: string;
  disclaimerBanner: string;
}
