import { motion } from 'framer-motion';
import { AllocationBar } from './AllocationBar';
import type { Segment } from '../types';

interface QuarterBriefSheetProps {
  nextQuarter: string;
  currentQuarter: string;
  segments: Segment[];
  onStart: () => void;
  onDismiss: () => void;
}

const PHASE1 = [
  { n: '①', label: 'Set context from Q2 baseline' },
  { n: '②', label: 'Define strategic themes' },
  { n: '③', label: 'Allocate capacity across themes' },
  { n: '④', label: 'Scenario & stakeholder review' },
  { n: '⑤', label: 'Lock your allocation' },
];

const PHASE2 = [
  { n: '⑥', label: 'Build a scoring model per theme' },
  { n: '⑦', label: 'Score & rank initiatives' },
  { n: '⑧', label: 'Generate audience-ready plan' },
];

export function QuarterBriefSheet({
  nextQuarter, currentQuarter, segments, onStart, onDismiss,
}: QuarterBriefSheetProps) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="brief-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onDismiss}
      />

      {/* Sheet */}
      <motion.div
        className="brief-sheet"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 36, mass: 0.9 }}
      >
        {/* Handle */}
        <div className="brief-handle" />

        {/* Title */}
        <div className="brief-title-row">
          <h2 className="brief-title">Planning {nextQuarter}</h2>
          <span className="brief-total-time">~20 min end-to-end</span>
        </div>
        <p className="brief-subtitle">
          Two phases — finish Phase 1 now, come back to Phase 2 anytime.
        </p>

        {/* Phase 1 */}
        <div className="brief-phase-block">
          <div className="brief-phase-header">
            <span className="brief-phase-badge brief-phase-badge--1">Phase 1</span>
            <span className="brief-phase-name">Strategic alignment</span>
            <span className="brief-phase-time">~7 min</span>
          </div>
          <ul className="brief-step-list">
            {PHASE1.map(step => (
              <li key={step.n} className="brief-step">
                <span className="brief-step-n">{step.n}</span>
                <span className="brief-step-label">{step.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Phase 2 */}
        <div className="brief-phase-block brief-phase-block--dim">
          <div className="brief-phase-header">
            <span className="brief-phase-badge brief-phase-badge--2">Phase 2</span>
            <span className="brief-phase-name">Initiative prioritisation</span>
            <span className="brief-phase-time">~15 min</span>
          </div>
          <ul className="brief-step-list">
            {PHASE2.map(step => (
              <li key={step.n} className="brief-step">
                <span className="brief-step-n">{step.n}</span>
                <span className="brief-step-label">{step.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Q2 snapshot */}
        <div className="brief-snapshot">
          <p className="brief-snapshot-label">Your {currentQuarter} strategic themes & allocation</p>
          <AllocationBar segments={segments} />
        </div>

        {/* Actions */}
        <div className="brief-actions">
          <motion.button
            className="btn-primary btn-large"
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
          >
            Start Phase 1 →
          </motion.button>
          <motion.button
            className="btn-ghost brief-dismiss-btn"
            whileTap={{ scale: 0.97 }}
            onClick={onDismiss}
          >
            Not now
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}
