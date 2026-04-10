import { motion } from 'framer-motion';
import { AllocationBar } from '../components/AllocationBar';
import type { Segment } from '../types';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface QuarterBriefScreenProps {
  currentQuarter: string;
  segments: Segment[];
  onStart: () => void;
  onBack: () => void;
}

const OUTCOMES = [
  'Identify what changed',
  'Adjust your focus',
  'Lock your plan',
];

export function QuarterBriefScreen({
  currentQuarter, segments, onStart, onBack,
}: QuarterBriefScreenProps) {
  const audio  = useAudio();
  const haptic = useHaptic();

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <div className="screen-inner qb-layout">

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <h2 className="qb-title">Plan your next quarter</h2>
          <p className="qb-time-hint">~7 min</p>
        </motion.div>

        {/* Outcome list */}
        <motion.div
          className="qb-outcomes"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <p className="qb-outcomes-intro">In the next 7 minutes, you'll:</p>
          <ul className="qb-outcome-list">
            {OUTCOMES.map((outcome, i) => (
              <motion.li
                key={outcome}
                className="qb-outcome-item"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 + i * 0.07 }}
              >
                <span className="qb-outcome-dot" />
                <span className="qb-outcome-label">{outcome}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Q2 snapshot */}
        <motion.div
          className="qb-snapshot"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <p className="qb-snapshot-label">Your {currentQuarter} strategic themes & allocation</p>
          <AllocationBar segments={segments} />
        </motion.div>

        {/* Actions */}
        <motion.div
          className="qb-actions"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
        >
          <motion.button
            className="btn-primary btn-large"
            whileTap={{ scale: 0.97 }}
            onClick={() => { audio.playTransition(); haptic.tap(); onStart(); }}
          >
            Start planning →
          </motion.button>
          <motion.button
            className="btn-ghost qb-back-btn"
            whileTap={{ scale: 0.97 }}
            onClick={() => { audio.playNavigate(); haptic.tap(); onBack(); }}
          >
            ← Back
          </motion.button>
        </motion.div>

      </div>
    </motion.div>
  );
}
