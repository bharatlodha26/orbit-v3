import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Segment, ReasoningEntry, PlanningStep } from '../types';
import { generateNarrative, getNotList } from '../data/defaults';
import { ReasoningPanel } from '../components/ReasoningPanel';
import { PlanningProgress } from '../components/PlanningProgress';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface LockScreenProps {
  segments: Segment[];
  quarter: string;
  reasoning: ReasoningEntry[];
  onLocked: () => void;
  onStepClick: (step: PlanningStep) => void;
}

export function LockScreen({ segments, quarter, reasoning, onLocked, onStepClick }: LockScreenProps) {
  const [phase, setPhase] = useState<'pre' | 'locking' | 'locked'>('pre');
  const narrative = generateNarrative(segments);
  const notList = getNotList(segments);
  const audio = useAudio();
  const haptic = useHaptic();

  const handleLock = () => {
    setPhase('locking');
    haptic.grab();

    setTimeout(() => audio.playLockClick(), 400);
    setTimeout(() => {
      haptic.release();
      setPhase('locked');
    }, 600);
    setTimeout(() => {
      onLocked();
    }, 1400);
  };

  const isLocking = phase === 'locking' || phase === 'locked';

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Warm color wash on lock */}
      <AnimatePresence>
        {phase === 'locked' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 0.4, times: [0, 0.3, 1] }}
            style={{
              position: 'absolute', inset: 0,
              background: '#FFF8F0',
              zIndex: 50, pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      <div className="screen-inner lock-layout">
        {/* Progress stepper */}
        <PlanningProgress
          currentStep="lock"
          completedSteps={['context', 'themes', 'allocate', 'review']}
          onStepClick={onStepClick}
        />

        {/* Bar in card frame */}
        <motion.div
          className="lock-bar-card"
          animate={{
            boxShadow: isLocking ? '0 4px 20px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
            borderColor: isLocking ? 'var(--accent)' : 'var(--border)',
            borderWidth: isLocking ? 2 : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          <div style={{
            height: 72,
            display: 'flex',
            overflow: 'hidden',
            borderRadius: isLocking ? 0 : 8,
            transition: 'border-radius 0.3s',
          }}>
            {segments.map(seg => (
              <motion.div
                key={seg.id}
                style={{
                  flex: seg.percentage,
                  backgroundColor: seg.color,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundImage: seg.isLocked
                    ? 'repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(0,0,0,0.08) 4px,rgba(0,0,0,0.08) 8px)'
                    : 'none',
                }}
              >
                <span style={{ color: 'white', fontWeight: 700, fontSize: seg.percentage > 15 ? 12 : 10, textAlign: 'center', padding: '0 4px' }}>
                  {seg.percentage >= 10 ? (seg.shortName ?? seg.name) : (seg.shortName ?? seg.name.slice(0, 3))}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>{seg.percentage}%</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Narrative */}
        <p className="lock-narrative">"{narrative}"</p>

        {/* Reasoning panel */}
        <ReasoningPanel reasoning={reasoning} />

        {/* NOT list */}
        <div style={{ width: '100%' }}>
          <p className="screen-section-label" style={{ marginBottom: 10 }}>What this quarter is NOT</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {notList.map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 14, flexShrink: 0 }}>·</span>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lock button */}
        <AnimatePresence mode="wait">
          {phase === 'pre' && (
            <motion.button
              key="lock-btn"
              className="btn-primary btn-large"
              whileTap={{ scale: 0.97 }}
              onClick={handleLock}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              Lock {quarter}
            </motion.button>
          )}
          {phase === 'locking' && (
            <motion.div
              key="locking"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}
                style={{ fontSize: 20 }}
              >
                ⟳
              </motion.span>
              <span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Locking…</span>
            </motion.div>
          )}
          {phase === 'locked' && (
            <motion.div
              key="locked"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span style={{ fontSize: 22 }}>✓</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {quarter} locked
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
