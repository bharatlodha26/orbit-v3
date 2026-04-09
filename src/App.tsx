import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { AppState, Scenario, Screen, Segment, ThinkingTrailEntry, ReasoningEntry, PlanningStep } from './types';
import { Q2_SEGMENTS } from './data/defaults';
import { AppHeader } from './components/AppHeader';
import { HomeScreen } from './screens/HomeScreen';
import { ConversationScreen } from './screens/ConversationScreen';
import { ProposalScreen } from './screens/ProposalScreen';
import { ScenarioComparison } from './screens/ScenarioComparison';
import { StakeholderScreen } from './screens/StakeholderScreen';
import { LockScreen } from './screens/LockScreen';
import { PostLockScreen } from './screens/PostLockScreen';
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

// Derive header context string from current screen
function getHeaderContext(screen: Screen, nextQuarter: string): string {
  switch (screen) {
    case 'home':         return 'Dashboard';
    case 'conversation': return `${nextQuarter} Planning · Theme Selection & Allocation`;
    case 'proposal':     return `${nextQuarter} Planning · Theme Selection & Allocation`;
    case 'scenarios':    return `${nextQuarter} Planning · Scenario Comparison`;
    case 'stakeholder':  return `${nextQuarter} Planning · Stakeholder Review`;
    case 'lock':         return `${nextQuarter} Planning · Lock Allocation`;
    case 'post-lock':    return `${nextQuarter} Locked`;
    default:             return 'Compass';
  }
}

// Map planning step to the screen we should navigate to
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

  const go = useCallback((screen: Screen) => {
    setState(s => ({ ...s, currentScreen: screen }));
  }, []);

  const handlePlanStart = () => {
    setWorkingSegments([...state.segments]);
    setReasoning([]);
    go('conversation');
  };

  const handleConversationComplete = (trail: ThinkingTrailEntry[], newReasoning: ReasoningEntry[]) => {
    setState(s => ({
      ...s,
      thinkingTrail: trail,
      completedSteps: ['context', 'themes'],
    }));
    setReasoning(newReasoning);
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
    const completedSteps = state.completedSteps ?? [];
    if (completedSteps.includes(step)) {
      go(stepToScreen(step));
    }
  };

  const currentScreen = state.currentScreen;
  const headerContext = getHeaderContext(currentScreen, state.nextQuarter);

  return (
    <div className="app-shell">
      <AppHeader context={headerContext} onHome={handleHome} />
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
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
