import { motion } from 'framer-motion';
import { AllocationBar } from '../components/AllocationBar';
import type { Segment } from '../types';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface QuarterBriefScreenProps {
  nextQuarter: string;
  currentQuarter: string;
  segments: Segment[];
  onStart: () => void;
  onBack: () => void;
}

const PHASE1 = [
  'Set context from Q2 baseline',
  'Define strategic themes',
  'Allocate capacity across themes',
  'Scenario & stakeholder review',
  'Lock your allocation',
];

const PHASE2 = [
  'Build a scoring model per theme',
  'Score & rank initiatives',
  'Generate audience-ready plan',
];

export function QuarterBriefScreen({
  nextQuarter, currentQuarter, segments, onStart, onBack,
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

        {/* Header */}
        <div className="qb-header">
          <div>
            <h2 className="qb-title">Planning {nextQuarter}</h2>
            <p className="qb-subtitle">
              Two phases — finish Phase 1 now, come back to Phase 2 anytime.
            </p>
          </div>
          <span className="qb-total-time">~20 min</span>
        </div>

        {/* Phase 1 */}
        <motion.div
          className="qb-phase-block"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div className="qb-phase-header">
            <span className="qb-phase-badge qb-phase-badge--1">Phase 1</span>
            <span className="qb-phase-name">Strategic alignment</span>
            <span className="qb-phase-time">~7 min</span>
          </div>
          <ul className="qb-step-list">
            {PHASE1.map((label, i) => (
              <li key={label} className="qb-step">
                <span className="qb-step-n">{i + 1}</span>
                <span className="qb-step-label">{label}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Phase 2 */}
        <motion.div
          className="qb-phase-block qb-phase-block--dim"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
        >
          <div className="qb-phase-header">
            <span className="qb-phase-badge qb-phase-badge--2">Phase 2</span>
            <span className="qb-phase-name">Initiative prioritisation</span>
            <span className="qb-phase-time">~15 min</span>
          </div>
          <ul className="qb-step-list">
            {PHASE2.map((label, i) => (
              <li key={label} className="qb-step">
                <span className="qb-step-n">{i + 6}</span>
                <span className="qb-step-label">{label}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Q2 snapshot */}
        <motion.div
          className="qb-snapshot"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="qb-snapshot-label">Your {currentQuarter} strategic themes & allocation</p>
          <AllocationBar segments={segments} />
        </motion.div>

        {/* Actions */}
        <div className="qb-actions">
          <motion.button
            className="btn-primary btn-large"
            whileTap={{ scale: 0.97 }}
            onClick={() => { audio.playTransition(); haptic.tap(); onStart(); }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            Start Phase 1 →
          </motion.button>
          <motion.button
            className="btn-ghost qb-back-btn"
            whileTap={{ scale: 0.97 }}
            onClick={() => { audio.playNavigate(); haptic.tap(); onBack(); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            ← Back
          </motion.button>
        </div>

      </div>
    </motion.div>
  );
}
