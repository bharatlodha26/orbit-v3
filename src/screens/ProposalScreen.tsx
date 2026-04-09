import { useState, useEffect } from 'react'; // useEffect used below
import { motion } from 'framer-motion';
import { AllocationBar } from '../components/AllocationBar';
import type { AppState, Scenario, Segment } from '../types';
import { generateNarrative, generateTradeoff } from '../data/defaults';
import { useAudio } from '../hooks/useAudio';

interface ProposalScreenProps {
  state: AppState;
  prevSegments: Segment[];
  onSegmentsChange: (segments: Segment[]) => void;
  onLock: () => void;
  onSaveScenario: (scenario: Scenario) => void;
  onViewScenarios: () => void;
}

export function ProposalScreen({
  state,
  prevSegments,
  onSegmentsChange,
  onLock,
  onSaveScenario,
  onViewScenarios,
}: ProposalScreenProps) {
  const [narrative, setNarrative] = useState(() => generateNarrative(state.segments));
  const [tradeoff, setTradeoff] = useState(() => generateTradeoff(state.segments, prevSegments));
  const audio = useAudio();

  useEffect(() => {
    setNarrative(generateNarrative(state.segments));
    setTradeoff(generateTradeoff(state.segments, prevSegments));
  }, [state.segments, prevSegments]);

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
    // Otherwise stays on proposal for another adjustment
  };

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner proposal-layout" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
            {state.nextQuarter} Proposal
          </p>
        </div>

        {/* Interactive bar */}
        <div>
          <AllocationBar
            segments={state.segments}
            onSegmentsChange={handleSegmentsChange}
            interactive={true}
            showDeltas={true}
            prevSegments={prevSegments}
          />
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, textAlign: 'center' }}>
            — drag any boundary to adjust —
          </p>
        </div>

        {/* Narrative sentence */}
        <motion.p
          key={narrative}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.4,
            fontStyle: 'italic',
          }}
        >
          "{narrative}"
        </motion.p>

        {/* Trade-off callout */}
        <motion.div
          key={tradeoff}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: 'var(--warning-bg)',
            borderRadius: 10,
            padding: '14px 16px',
            borderLeft: '3px solid var(--warning)',
          }}
        >
          <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            <span style={{ marginRight: 6 }}>⚠</span>
            {tradeoff}
          </p>
        </motion.div>

        {/* Buttons */}
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
