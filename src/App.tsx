import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { AppState, Scenario, Screen, Segment, ThinkingTrailEntry, PlanningStep, ReasoningEntry, JudgmentState, Initiative, ScoringDimension } from './types';

import { Q2_SEGMENTS } from './data/defaults';
import { buildThemesFromSegments } from './services/scoringMockApi';
import { AppHeader } from './components/AppHeader';
import { HomeScreen } from './screens/HomeScreen';
import { ConversationScreen } from './screens/ConversationScreen';
import { ProposalScreen } from './screens/ProposalScreen';
import { ScenarioComparison } from './screens/ScenarioComparison';
import { StakeholderScreen } from './screens/StakeholderScreen';
import { LockScreen } from './screens/LockScreen';
import { PostLockScreen } from './screens/PostLockScreen';
import { ThemeLandingScreen } from './screens/ThemeLandingScreen';
import { ScoringModelScreen } from './screens/ScoringModelScreen';
import { InitiativeScoringScreen } from './screens/InitiativeScoringScreen';
import { RankedReviewScreen } from './screens/RankedReviewScreen';
import { ShareExportScreen } from './screens/ShareExportScreen';
import './index.css';

const INITIAL_STATE: AppState = {
  currentScreen: 'home',
  currentQuarter: 'Q2',
  nextQuarter: 'Q3',
  weeksLeft: 6,
  segments: Q2_SEGMENTS,
  onTrack: 3,
  totalInitiatives: 5,
  thinkingTrail: [],
  scenarios: [],
  lockedSegments: null,
  conversationTurn: 0,
  isFirstTime: false,
  completedSteps: [],
};

type ThemeMode = 'light' | 'dark';

// Short context labels — avoid long text that stretches the breadcrumb
function getHeaderContext(screen: Screen, nextQuarter: string): string {
  switch (screen) {
    case 'home':               return 'Dashboard';
    case 'conversation':       return `${nextQuarter} Planning`;
    case 'proposal':           return `${nextQuarter} Planning`;
    case 'scenarios':          return `${nextQuarter} Scenarios`;
    case 'stakeholder':        return `${nextQuarter} Planning`;
    case 'lock':               return `${nextQuarter} Lock`;
    case 'post-lock':          return `${nextQuarter} Locked ✓`;
    case 'theme-landing':      return `${nextQuarter} Scoring`;
    case 'scoring-model':      return `${nextQuarter} Scoring Model`;
    case 'initiative-scoring': return `${nextQuarter} Initiative Scoring`;
    case 'ranked-review':      return `${nextQuarter} Ranked Review`;
    case 'share-export':       return `${nextQuarter} Export`;
    default:                   return 'Compass';
  }
}

function stepToScreen(step: PlanningStep): Screen {
  switch (step) {
    case 'context':
    case 'themes':   return 'conversation';
    case 'allocate': return 'proposal';
    case 'review':   return 'stakeholder';
    case 'lock':     return 'lock';
  }
}

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [workingSegments, setWorkingSegments] = useState<Segment[]>([...Q2_SEGMENTS]);
  const [prevSegments] = useState<Segment[]>([...Q2_SEGMENTS]);
  const [reasoning, setReasoning] = useState<ReasoningEntry[]>([]);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';

    const storedTheme = window.localStorage.getItem('compass-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [judgment, setJudgment] = useState<JudgmentState>({
    themes: [],
    activeThemeId: null,
    modelConfirmed: false,
  });

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    window.localStorage.setItem('compass-theme', themeMode);
  }, [themeMode]);

  const go = useCallback((screen: Screen) => {
    setState(s => ({ ...s, currentScreen: screen }));
  }, []);

  const handlePlanStart = () => {
    setWorkingSegments([...state.segments]);
    setReasoning([]);
    go('conversation');
  };

  const handleConversationComplete = (trail: ThinkingTrailEntry[]) => {
    setState(s => ({
      ...s,
      thinkingTrail: trail,
      completedSteps: ['context', 'themes'],
    }));
    go('proposal');
  };

  const handleWorkingSegmentsChange = (segs: Segment[]) => {
    setWorkingSegments(segs);
  };

  const handleSaveScenario = (scenario: Scenario) => {
    setState(s => ({ ...s, scenarios: [...s.scenarios, scenario] }));
  };

  const handlePickScenario = (scenario: Scenario) => {
    setWorkingSegments(scenario.segments);
    go('proposal');
  };

  const handleLock = () => {
    setState(s => ({ ...s, completedSteps: ['context', 'themes', 'allocate'] }));
    go('lock');
  };

  const handleLocked = () => {
    setState(s => ({
      ...s,
      lockedSegments: [...workingSegments],
      segments: [...workingSegments],
      completedSteps: ['context', 'themes', 'allocate', 'review', 'lock'],
    }));
    go('post-lock');
  };

  const handleStakeholderResolved = () => {
    setState(s => ({ ...s, completedSteps: ['context', 'themes', 'allocate', 'review'] }));
    go('proposal');
  };

  const handleHome = () => {
    setState(s => ({ ...s, scenarios: [], completedSteps: [] }));
    setReasoning([]);
    go('home');
  };

  const handleStepClick = (step: PlanningStep) => {
    if (state.completedSteps.includes(step)) {
      go(stepToScreen(step));
    }
  };

  // ── Judgment Structurer handlers ──────────────────────────

  const handleStartScoring = () => {
    const themes = buildThemesFromSegments(workingSegments);
    setJudgment({ themes, activeThemeId: null, modelConfirmed: false });
    go('theme-landing');
  };

  const handleSelectTheme = (themeId: string) => {
    setJudgment(j => ({ ...j, activeThemeId: themeId, modelConfirmed: false }));
    go('scoring-model');
  };

  const handleModelConfirm = (model: ScoringDimension[], narrative: string) => {
    setJudgment(j => ({
      ...j,
      modelConfirmed: true,
      themes: j.themes.map(t =>
        t.id === j.activeThemeId ? { ...t, model: model, modelNarrative: narrative } : t
      ),
    }));
    go('initiative-scoring');
  };

  const handleUpdateInitiative = (updated: Initiative) => {
    setJudgment(j => ({
      ...j,
      themes: j.themes.map(t =>
        t.id === j.activeThemeId
          ? { ...t, initiatives: t.initiatives.map(ini => ini.id === updated.id ? updated : ini) }
          : t
      ),
    }));
  };

  const handleOverrideRank = (initiativeId: string, newRank: number, reason: string) => {
    setJudgment(j => ({
      ...j,
      themes: j.themes.map(t =>
        t.id === j.activeThemeId
          ? {
              ...t,
              initiatives: t.initiatives.map(ini =>
                ini.id === initiativeId ? { ...ini, overrideRank: newRank, overrideReason: reason } : ini
              ),
            }
          : t
      ),
    }));
  };

  const activeTheme = judgment.themes.find(t => t.id === judgment.activeThemeId) ?? null;

  const currentScreen = state.currentScreen;
  const headerContext = getHeaderContext(currentScreen, state.nextQuarter);

  return (
    <div className="app-shell">
      <AppHeader
        context={headerContext}
        onHome={handleHome}
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode(current => current === 'light' ? 'dark' : 'light')}
      />
      <div className="app-content">
        <AnimatePresence mode="wait">
          {currentScreen === 'home' && (
            <HomeScreen key="home" state={state} onPlan={handlePlanStart} />
          )}
          {currentScreen === 'conversation' && (
            <ConversationScreen
              key="conversation"
              state={{ ...state, segments: workingSegments }}
              onSegmentsChange={handleWorkingSegmentsChange}
              onComplete={handleConversationComplete}
              onStepClick={handleStepClick}
            />
          )}
          {currentScreen === 'proposal' && (
            <ProposalScreen
              key="proposal"
              state={{ ...state, segments: workingSegments }}
              prevSegments={prevSegments}
              reasoning={reasoning}
              onSegmentsChange={handleWorkingSegmentsChange}
              onLock={handleLock}
              onSaveScenario={handleSaveScenario}
              onViewScenarios={() => go('scenarios')}
              onStepClick={handleStepClick}
            />
          )}
          {currentScreen === 'scenarios' && (
            <ScenarioComparison
              key="scenarios"
              scenarios={state.scenarios}
              onPick={handlePickScenario}
              onBack={() => go('proposal')}
            />
          )}
          {currentScreen === 'stakeholder' && (
            <StakeholderScreen
              key="stakeholder"
              state={{ ...state, segments: workingSegments }}
              onSegmentsChange={handleWorkingSegmentsChange}
              onResolved={handleStakeholderResolved}
            />
          )}
          {currentScreen === 'lock' && (
            <LockScreen
              key="lock"
              segments={workingSegments}
              quarter={state.nextQuarter}
              reasoning={reasoning}
              onLocked={handleLocked}
              onStepClick={handleStepClick}
            />
          )}
          {currentScreen === 'post-lock' && (
            <PostLockScreen
              key="post-lock"
              segments={workingSegments}
              quarter={state.nextQuarter}
              thinkingTrail={state.thinkingTrail}
              reasoning={reasoning}
              onStakeholderLoop={() => go('stakeholder')}
              onHome={handleHome}
              onStartScoring={handleStartScoring}
            />
          )}
          {currentScreen === 'theme-landing' && (
            <ThemeLandingScreen
              key="theme-landing"
              themes={judgment.themes}
              quarter={state.nextQuarter}
              onSelectTheme={handleSelectTheme}
            />
          )}
          {currentScreen === 'scoring-model' && activeTheme && (
            <ScoringModelScreen
              key={`scoring-model-${activeTheme.id}`}
              theme={activeTheme}
              onConfirm={handleModelConfirm}
              onBack={() => go('theme-landing')}
            />
          )}
          {currentScreen === 'initiative-scoring' && activeTheme && (
            <InitiativeScoringScreen
              key={`initiative-scoring-${activeTheme.id}`}
              theme={activeTheme}
              onUpdateInitiative={handleUpdateInitiative}
              onDone={() => go('ranked-review')}
              onBack={() => go('scoring-model')}
            />
          )}
          {currentScreen === 'ranked-review' && activeTheme && (
            <RankedReviewScreen
              key={`ranked-review-${activeTheme.id}`}
              theme={activeTheme}
              onOverride={handleOverrideRank}
              onDone={() => go('share-export')}
              onBack={() => go('initiative-scoring')}
            />
          )}
          {currentScreen === 'share-export' && (
            <ShareExportScreen
              key="share-export"
              themes={judgment.themes}
              quarter={state.nextQuarter}
              onBackToThemes={() => go('theme-landing')}
              onHome={handleHome}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
