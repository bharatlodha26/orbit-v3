import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScoringTheme, ScoringDimension } from '../types';
import { generateModelNarrative, updateModelFromNL } from '../services/scoringMockApi';

interface ScoringModelScreenProps {
  theme: ScoringTheme;
  onConfirm: (model: ScoringDimension[], narrative: string) => void;
  onBack: () => void;
}

export function ScoringModelScreen({ theme, onConfirm, onBack }: ScoringModelScreenProps) {
  const [dimensions, setDimensions] = useState<ScoringDimension[]>(() => theme.model.map(d => ({ ...d })));
  const [nlInput, setNlInput] = useState('');
  const [changes, setChanges] = useState<Array<{ name: string; oldWeight: number; newWeight: number; reason: string }>>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  const narrative = useMemo(() => generateModelNarrative(dimensions), [dimensions]);

  const handleWeightDrag = useCallback((dimId: string, clientX: number, barRect: DOMRect) => {
    const pct = Math.max(5, Math.min(60, Math.round(((clientX - barRect.left) / barRect.width) * 100)));
    setDimensions(prev => {
      const idx = prev.findIndex(d => d.id === dimId);
      if (idx === -1) return prev;
      const diff = pct - prev[idx].weight;
      if (diff === 0) return prev;

      const next = prev.map(d => ({ ...d }));
      next[idx].weight = pct;

      const others = next.filter(d => d.id !== dimId);
      const othersTotal = others.reduce((s, d) => s + d.weight, 0);
      if (othersTotal > 0) {
        others.forEach(d => {
          d.weight = Math.max(5, Math.round(d.weight - (diff * (d.weight / othersTotal))));
        });
      }

      const total = next.reduce((s, d) => s + d.weight, 0);
      if (total !== 100 && next.length > 0) {
        const largest = others.sort((a, b) => b.weight - a.weight)[0];
        if (largest) largest.weight += (100 - total);
      }

      return next;
    });
  }, []);

  const handleNLSubmit = async () => {
    if (!nlInput.trim()) return;
    setIsUpdating(true);
    const result = await updateModelFromNL(nlInput, dimensions);
    setDimensions(result.model);
    setChanges(result.changes);
    setNlInput('');
    setIsUpdating(false);
  };

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner scoring-model-layout">

        {/* ── Fixed header ─────────────────────────────────── */}
        <div className="scoring-model-header">
          <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 6, padding: '4px 0' }}>
            ← Back to themes
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{theme.icon}</span>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {theme.name}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {theme.allocation}% · {theme.engWeeks} eng-weeks
              </p>
            </div>
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────── */}
        <div className="scoring-model-body">

          {/* Narrative belief statement */}
          <motion.p
            key={narrative}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="scoring-model-narrative"
          >
            "{narrative}"
          </motion.p>

          {/* Weight bars */}
          <div className="scoring-weight-bars">
            {dimensions.map(dim => (
              <div key={dim.id} className="scoring-weight-row">
                <div className="scoring-weight-label">
                  <span className="scoring-weight-name">{dim.shortName}</span>
                  <span className="scoring-weight-pct">{dim.weight}%</span>
                </div>
                <div
                  className="scoring-weight-track"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDragging(dim.id);
                    const rect = e.currentTarget.getBoundingClientRect();
                    handleWeightDrag(dim.id, e.clientX, rect);

                    const onMove = (ev: PointerEvent) => handleWeightDrag(dim.id, ev.clientX, rect);
                    const onUp = () => {
                      setDragging(null);
                      window.removeEventListener('pointermove', onMove);
                      window.removeEventListener('pointerup', onUp);
                    };
                    window.addEventListener('pointermove', onMove);
                    window.addEventListener('pointerup', onUp);
                  }}
                >
                  <motion.div
                    className="scoring-weight-fill"
                    style={{ backgroundColor: dim.color }}
                    animate={{ width: `${dim.weight}%` }}
                    transition={dragging === dim.id ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
                  />
                  <motion.div
                    className="scoring-weight-handle"
                    animate={{ left: `${dim.weight}%` }}
                    transition={dragging === dim.id ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* NL input */}
          <div className="scoring-nl-block">
            <p className="scoring-nl-label">Adjust by describing what matters this quarter</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="text-input"
                placeholder="e.g. SOC 2 is non-negotiable this quarter"
                value={nlInput}
                onChange={e => setNlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNLSubmit()}
              />
              <motion.button
                className="btn-icon"
                whileTap={{ scale: 0.9 }}
                onClick={handleNLSubmit}
                disabled={!nlInput.trim() || isUpdating}
                aria-label="Apply"
              >
                {isUpdating ? '…' : '➤'}
              </motion.button>
            </div>
          </div>

          {/* Changes feed */}
          <AnimatePresence>
            {changes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="scoring-changes"
              >
                <p className="screen-section-label" style={{ marginBottom: 8 }}>Model adjustments</p>
                {changes.map((ch, i) => (
                  <motion.div
                    key={`${ch.name}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="scoring-change-item"
                  >
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {ch.name}: {ch.oldWeight}% → {ch.newWeight}%
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{ch.reason}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* ── Sticky confirm button ─────────────────────────── */}
        <div className="scoring-model-footer">
          <motion.button
            className="btn-primary btn-large"
            whileTap={{ scale: 0.97 }}
            onClick={() => onConfirm(dimensions, narrative)}
          >
            Confirm model — start scoring →
          </motion.button>
        </div>

      </div>
    </motion.div>
  );
}
