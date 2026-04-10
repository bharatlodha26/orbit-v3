import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReasoningEntry, SignalType } from '../types';
import { useAudio } from '../hooks/useAudio';

const SIGNAL_LABELS: Record<SignalType, string> = {
  deal_signal:   'deal signal',
  exec_mandate:  'mandate',
  churn_risk:    'churn risk',
  compliance:    'deadline',
  carry_over:    'carry-over',
  competitive:   'competitive',
  usage_signal:  'tech signal',
};

const SIGNAL_COLORS: Record<SignalType, string> = {
  deal_signal:   '#4A6CF7',
  exec_mandate:  '#EF4444',
  churn_risk:    '#F59E0B',
  compliance:    '#EF4444',
  carry_over:    '#8B5CF6',
  competitive:   '#06B6D4',
  usage_signal:  '#10B981',
};

interface ReasoningPanelProps {
  reasoning: ReasoningEntry[];
}

export function ReasoningPanel({ reasoning }: ReasoningPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const audio = useAudio();

  if (!reasoning || reasoning.length === 0) return null;

  return (
    <div className="reasoning-panel">
      <motion.button
        className="reasoning-panel-toggle"
        onClick={() => { audio.playToggle(); setExpanded(e => !e); }}
        aria-expanded={expanded}
        whileTap={{ scale: 0.98 }}
      >
        <span className="reasoning-panel-arrow">{expanded ? '▾' : '▸'}</span>
        <span>Why this allocation</span>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="reasoning-panel-body">
              {reasoning.map(entry => (
                <div key={entry.themeId} className="reasoning-entry">
                  <p className="reasoning-entry-theme">{entry.themeName}</p>
                  {entry.bullets.map((bullet, i) => (
                    <div key={i} className="reasoning-bullet">
                      <span className="reasoning-bullet-dot">·</span>
                      <span className="reasoning-bullet-text">{bullet.text}</span>
                      <span
                        className="reasoning-signal-badge"
                        style={{ borderColor: SIGNAL_COLORS[bullet.signalType], color: SIGNAL_COLORS[bullet.signalType] }}
                      >
                        {SIGNAL_LABELS[bullet.signalType]}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
