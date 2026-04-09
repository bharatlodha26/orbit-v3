import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AllocationBar } from '../components/AllocationBar';
import { PlanningProgress } from '../components/PlanningProgress';
import { ReasoningPanel } from '../components/ReasoningPanel';
import type { AppState, Scenario, Segment, PlanningStep, ReasoningEntry } from '../types';
import { generateNarrative, generateTradeoff } from '../data/defaults';
import { useAudio } from '../hooks/useAudio';

interface ProposalScreenProps {
  state: AppState;
  prevSegments: Segment[];
  reasoning: ReasoningEntry[];
  onSegmentsChange: (segments: Segment[]) => void;
  onLock: () => void;
  onSaveScenario: (scenario: Scenario) => void;
  onViewScenarios: () => void;
  onStepClick: (step: PlanningStep) => void;
}

export function ProposalScreen({
  state,
  prevSegments,
  reasoning,
  onSegmentsChange,
  onLock,
  onSaveScenario,
  onViewScenarios,
  onStepClick,
}: ProposalScreenProps) {
  const narrative = useMemo(() => generateNarrative(state.segments), [state.segments]);
  const tradeoff = useMemo(() => generateTradeoff(state.segments, prevSegments), [state.segments, prevSegments]);
  const audio = useAudio();

  const handleSegmentsChange = (segments: Segment[]) => {
    onSegmentsChange(segments);
    audio.playSegmentChange(segments[0].percentage, true);
  };

  const handleTryAnother = () => {
    const id = `scenario-${Date.now()}`;
    onSaveScenario({
      id,
      name: narrative,
      narrative,
      segments: state.segments.map(s => ({ ...s })),
    });
    if (state.scenarios.length >= 1) {
      onViewScenarios();
    }
  };

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner proposal-layout">
        {/* Progress stepper */}
        <PlanningProgress
          currentStep="allocate"
          completedSteps={['context', 'themes']}
          onStepClick={onStepClick}
          quarter={state.nextQuarter}
          stepLabel="Allocation"
        />

        {/* Header */}
        <p className="screen-section-label">{state.nextQuarter} Proposal</p>

        {/* Interactive bar */}
        <div>
          <AllocationBar
            segments={state.segments}
            onSegmentsChange={handleSegmentsChange}
            interactive={true}
            showDeltas={true}
            prevSegments={prevSegments}
          />
          <p className="bar-hint-label">— drag any boundary to adjust —</p>
        </div>

        {/* Narrative sentence */}
        <motion.p
          key={narrative}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="proposal-narrative"
        >
          "{narrative}"
        </motion.p>

        {/* Trade-off callout */}
        <motion.div
          key={tradeoff}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="tradeoff-callout"
        >
          <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            <span style={{ marginRight: 6 }}>⚠</span>
            {tradeoff}
          </p>
        </motion.div>

        {/* Reasoning panel — expandable */}
        <ReasoningPanel reasoning={reasoning} />

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <motion.button
            className="btn-primary"
            style={{ flex: 1 }}
            whileTap={{ scale: 0.97 }}
            onClick={onLock}
          >
            Lock it
          </motion.button>
          <motion.button
            className="btn-secondary"
            style={{ flex: 1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleTryAnother}
          >
            Try another scenario
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
