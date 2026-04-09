import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AllocationBar } from '../components/AllocationBar';
import type { AppState, Segment } from '../types';
import { clampPercentages } from '../data/defaults';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface StakeholderScreenProps {
  state: AppState;
  onSegmentsChange: (segments: Segment[]) => void;
  onResolved: () => void;
}

const FEEDBACK_CHIPS = [
  'Sales wants more enterprise',
  'Eng wants more debt time',
  'Leadership approved as-is',
  'Multiple conflicting asks',
];

function parseConflict(text: string, segments: Segment[]): { a: Segment[]; b: Segment[] } | null {
  // Very simple parser for demo: detect "X wants Y%" patterns
  const matches = [...text.matchAll(/(\w+)\s+wants\s+(\d+)%?\s+(\w+)/gi)];
  if (matches.length < 2) return null;

  const applyRequest = (segs: Segment[], name: string, pct: number): Segment[] => {
    const lower = name.toLowerCase();
    const updated = segs.map(s => ({ ...s }));
    const target = updated.find(s => s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase()));
    if (!target) return segs;
    const delta = pct - target.percentage;
    target.percentage = pct;
    const others = updated.filter(s => s.id !== target.id && !s.isLocked);
    const perOther = -delta / Math.max(1, others.length);
    others.forEach(s => { s.percentage = Math.max(5, s.percentage + perOther); });
    return clampPercentages(updated);
  };

  const [m1, m2] = matches;
  return {
    a: applyRequest(segments.map(s => ({ ...s })), m1[3], parseInt(m1[2])),
    b: applyRequest(segments.map(s => ({ ...s })), m2[3], parseInt(m2[2])),
  };
}

export function StakeholderScreen({ state, onSegmentsChange, onResolved }: StakeholderScreenProps) {
  const [inputText, setInputText] = useState('');
  const [conflict, setConflict] = useState<{ a: Segment[]; b: Segment[] } | null>(null);
  const [conflictLabel, setConflictLabel] = useState<{ a: string; b: string }>({ a: 'Option A', b: 'Option B' });
  const audio = useAudio();
  const haptic = useHaptic();

  const daysSinceShare = 2;

  const applyChipFeedback = (chip: string, segs: Segment[]): Segment[] => {
    const updated = segs.map(s => ({ ...s }));
    const lower = chip.toLowerCase();
    if (lower.includes('enterprise')) {
      const ent = updated.find(s => s.id === 'enterprise');
      if (ent && !ent.isLocked) {
        const delta = Math.min(5, 60 - ent.percentage);
        ent.percentage += delta;
        const others = updated.filter(s => s.id !== 'enterprise' && !s.isLocked);
        const per = -delta / Math.max(1, others.length);
        others.forEach(s => { s.percentage = Math.max(5, s.percentage + per); });
      }
    } else if (lower.includes('debt')) {
      const debt = updated.find(s => s.id === 'debt');
      if (debt && !debt.isLocked) {
        debt.percentage = Math.min(60, debt.percentage + 5);
      }
    }
    return clampPercentages(updated);
  };

  const handleChip = (chip: string) => {
    haptic.tap();
    audio.playChipSelect();
    const lower = chip.toLowerCase();
    if (lower.includes('approved')) {
      onResolved();
      return;
    }
    if (lower.includes('conflicting')) {
      // Show two overlapping proposals
      const a = applyChipFeedback('enterprise', state.segments);
      const b = applyChipFeedback('debt', state.segments);
      setConflict({ a, b });
      setConflictLabel({ a: 'Sales ask', b: 'Eng ask' });
      return;
    }
    onSegmentsChange(applyChipFeedback(chip, state.segments));
    setTimeout(onResolved, 400);
  };

  const handleSubmit = (text: string) => {
    if (!text.trim()) return;
    haptic.tap();
    audio.playChipSelect();
    const parsed = parseConflict(text, state.segments);
    if (parsed) {
      setConflict(parsed);
      const parts = text.split(/and|,/i).map(s => s.trim()).filter(Boolean);
      setConflictLabel({ a: parts[0] ?? 'Option A', b: parts[1] ?? 'Option B' });
    } else {
      onSegmentsChange(applyChipFeedback(text, state.segments));
      setTimeout(onResolved, 400);
    }
    setInputText('');
  };

  const pickConflictSide = (side: 'a' | 'b') => {
    if (!conflict) return;
    haptic.tap();
    onSegmentsChange(side === 'a' ? conflict.a : conflict.b);
    setConflict(null);
    setTimeout(onResolved, 300);
  };

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Bar */}
        <AllocationBar segments={state.segments} />
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: -12 }}>
          You shared this {daysSinceShare} days ago.
        </p>

        {/* Conflict resolution view */}
        <AnimatePresence>
          {conflict && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                These asks exceed 100% together. Drag to resolve, or pick one:
              </p>
              {(['a', 'b'] as const).map(side => (
                <div key={side} style={{
                  background: 'var(--surface)',
                  borderRadius: 10,
                  padding: 12,
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <AllocationBar segments={conflict[side]} compact />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {side === 'a' ? conflictLabel.a : conflictLabel.b}
                    </p>
                    <motion.button
                      className="btn-pick"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => pickConflictSide(side)}
                    >
                      Use this
                    </motion.button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question + input */}
        {!conflict && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div style={{
                background: 'var(--surface)',
                borderRadius: 12,
                padding: '18px 20px',
                border: '1px solid var(--border)',
              }}>
                <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
                  What feedback did you get?
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {FEEDBACK_CHIPS.map((chip, i) => (
                  <motion.button
                    key={chip}
                    className="chip"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleChip(chip)}
                  >
                    {chip}
                  </motion.button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="text-input"
                  placeholder='e.g. "Sales wants 50% enterprise"'
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit(inputText)}
                />
                <motion.button
                  className="btn-icon"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSubmit(inputText)}
                  disabled={!inputText.trim()}
                >
                  ➤
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
