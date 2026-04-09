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
  | 'post-lock';

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
