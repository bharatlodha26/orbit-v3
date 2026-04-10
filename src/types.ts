export type SignalType =
  | 'deal_signal'
  | 'churn_risk'
  | 'exec_mandate'
  | 'compliance'
  | 'carry_over'
  | 'competitive'
  | 'usage_signal';

export interface Segment {
  id: string;
  name: string;
  shortName?: string;
  percentage: number;
  color: string;
  isLocked?: boolean;
  isConstraint?: boolean;
  sourceQuotes?: string[];
  signalType?: SignalType;
}

export interface ReasoningBullet {
  text: string;
  signalType: SignalType;
  sourceQuote?: string;
}

export interface ReasoningEntry {
  themeId: string;
  themeName: string;
  bullets: ReasoningBullet[];
}

export interface ThinkingTrailEntry {
  timestamp: number;
  question: string;
  answerText: string;
  barStateSnapshot: Segment[];
  extractedThemes?: Segment[];
  reasoning?: ReasoningEntry[];
}

export interface Scenario {
  id: string;
  name: string;
  narrative: string;
  segments: Segment[];
}

export type Screen =
  | 'home'
  | 'conversation'
  | 'proposal'
  | 'scenarios'
  | 'stakeholder'
  | 'lock'
  | 'post-lock'
  | 'theme-landing'
  | 'scoring-model'
  | 'initiative-scoring'
  | 'ranked-review'
  | 'share-export';

export type PlanningStep = 'context' | 'themes' | 'allocate' | 'review' | 'lock';

export interface AppState {
  currentScreen: Screen;
  planningStep?: PlanningStep;
  currentQuarter: string;
  nextQuarter: string;
  weeksLeft: number;
  segments: Segment[];
  onTrack: number;
  totalInitiatives: number;
  thinkingTrail: ThinkingTrailEntry[];
  scenarios: Scenario[];
  lockedSegments: Segment[] | null;
  conversationTurn: number;
  isFirstTime: boolean;
  reasoning?: ReasoningEntry[];
  completedSteps: PlanningStep[];
}

export interface ConversationTurn {
  question: string;
  chips: string[];
  barUpdateFn: (segments: Segment[], answer: string) => Segment[];
  planningStep: PlanningStep;
}

// ── Judgment Structurer types ────────────────────────────────

export type EvidenceQuality = 'hard' | 'strong' | 'soft' | 'assumption';

export interface ScoringDimension {
  id: string;
  name: string;
  shortName: string;
  weight: number;    // 0–100, all weights sum to 100
  color: string;
}

export interface DimensionScore {
  dimensionId: string;
  score: number;       // 1–5
  evidence: string;    // ≤10 words
  quality: EvidenceQuality;
}

export type InitiativeStatus = 'unscored' | 'scored' | 'close-call';

export interface Initiative {
  id: string;
  name: string;
  themeId: string;
  nlInput?: string;           // raw PM input
  scores: DimensionScore[];
  composite: number;          // weighted average 0–5
  effortWeeks: number;
  status: InitiativeStatus;
  narrative?: string;         // system-generated explanation
  rank?: number;
  overrideRank?: number;      // PM-set manual override
  overrideReason?: string;
}

export interface ScoringTheme {
  id: string;
  name: string;
  icon: string;
  allocation: number;         // % from Solution 2
  engWeeks: number;
  initiatives: Initiative[];
  model: ScoringDimension[];
  modelNarrative?: string;
  lastScored?: string;        // e.g. "Q2"
}

export interface JudgmentState {
  themes: ScoringTheme[];
  activeThemeId: string | null;
  modelConfirmed: boolean;
}
