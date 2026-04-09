import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { AppState, Scenario, Screen, Segment, ThinkingTrailEntry } from './types';
import { Q2_SEGMENTS } from './data/defaults';
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
};

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [workingSegments, setWorkingSegments] = useState<Segment[]>([...Q2_SEGMENTS]);
  const [prevSegments] = useState<Segment[]>([...Q2_SEGMENTS]);

  const go = useCallback((screen: Screen) => {
    setState(s => ({ ...s, currentScreen: screen }));
  }, []);

  const handlePlanStart = () => {
    setWorkingSegments([...state.segments]);
    go('conversation');
  };

  const handleConversationComplete = (trail: ThinkingTrailEntry[]) => {
    setState(s => ({ ...s, thinkingTrail: trail }));
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

  const handleLock = () => go('lock');

  const handleLocked = () => {
    setState(s => ({
      ...s,
      lockedSegments: [...workingSegments],
      segments: [...workingSegments],
    }));
    go('post-lock');
  };

  const handleStakeholderResolved = () => go('proposal');

  const handleHome = () => {
    setState(s => ({ ...s, scenarios: [] }));
    go('home');
  };

  const currentScreen = state.currentScreen;

  return (
    <div className="app-shell">
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
          />
        )}
        {currentScreen === 'proposal' && (
          <ProposalScreen
            key="proposal"
            state={{ ...state, segments: workingSegments }}
            prevSegments={prevSegments}
            onSegmentsChange={handleWorkingSegmentsChange}
            onLock={handleLock}
            onSaveScenario={handleSaveScenario}
            onViewScenarios={() => go('scenarios')}
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
            onLocked={handleLocked}
          />
        )}
        {currentScreen === 'post-lock' && (
          <PostLockScreen
            key="post-lock"
            segments={workingSegments}
            quarter={state.nextQuarter}
            thinkingTrail={state.thinkingTrail}
            onStakeholderLoop={() => go('stakeholder')}
            onHome={handleHome}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
