import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AllocationBar } from '../components/AllocationBar';
import { PlanningProgress } from '../components/PlanningProgress';
import { ReasoningPanel } from '../components/ReasoningPanel';
import type { AppState, Scenario, Segment, PlanningStep, ReasoningEntry } from '../types';
import { generateProposalInsight, generateTradeoff } from '../data/defaults';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

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
  const insight  = useMemo(() => generateProposalInsight(state.segments), [state.segments]);
  const tradeoff = useMemo(() => generateTradeoff(state.segments, prevSegments), [state.segments, prevSegments]);
  const [dragHint, setDragHint] = useState<string | null>(null);
  const audio  = useAudio();
  const haptic = useHaptic();

  const handleSegmentsChange = (segments: Segment[]) => {
    onSegmentsChange(segments);
    audio.playSegmentChange(segments[0].percentage, true);
  };

  const handleDragStart = (leftId: string, rightId: string) => {
    const left  = state.segments.find(s => s.id === leftId);
    const right = state.segments.find(s => s.id === rightId);
    if (left && right) {
      setDragHint(`Adjusting ${left.name} reduces: ${right.name}`);
    }
  };

  const handleTryAnother = () => {
    const insight = generateProposalInsight(state.segments);
    const id = `scenario-${Date.now()}`;
    onSaveScenario({
      id,
      name: insight.headline,
      narrative: insight.headline,
      segments: state.segments.map(s => ({ ...s })),
    });
    audio.playTap();
    haptic.tap();
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
        />

        {/* Recommendation label */}
        <p className="proposal-rec-label">Based on your input, we recommend:</p>

        {/* Interactive bar */}
        <div>
          <AllocationBar
            segments={state.segments}
            onSegmentsChange={handleSegmentsChange}
            onDragStart={handleDragStart}
            onDragEnd={() => setDragHint(null)}
            interactive={true}
            showDeltas={true}
            prevSegments={prevSegments}
          />
          <AnimatePresence mode="wait">
            {dragHint ? (
              <motion.p
                key="drag-hint"
                className="proposal-drag-hint"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {dragHint}
              </motion.p>
            ) : (
              <motion.p
                key="bar-hint"
                className="bar-hint-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                — drag any boundary to adjust —
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Insight — two lines, no quotes */}
        <motion.div
          key={insight.headline}
          className="proposal-insight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="proposal-insight-headline">{insight.headline}</p>
          <p className="proposal-insight-subtitle">{insight.subtitle}</p>
        </motion.div>

        {/* Trade-off — positive framing */}
        <motion.div
          key={tradeoff.main}
          className="proposal-tradeoff"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="proposal-tradeoff-main">{tradeoff.main}</p>
          <p className="proposal-tradeoff-sub">{tradeoff.sub}</p>
        </motion.div>

        {/* Reasoning panel — expandable */}
        <ReasoningPanel reasoning={reasoning} />

        {/* CTA: primary Lock plan, secondary Try a different scenario */}
        <div className="proposal-actions">
          <motion.button
            className="btn-primary btn-large"
            whileTap={{ scale: 0.97 }}
            onClick={() => { audio.playSave(); haptic.tap(); onLock(); }}
          >
            Lock plan
          </motion.button>
          <motion.button
            className="proposal-try-btn"
            whileTap={{ scale: 0.97 }}
            onClick={handleTryAnother}
          >
            Try a different scenario
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
