import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ScoringTheme } from '../types';
import { QUALITY_EMOJI } from '../services/scoringMockApi';

interface RankedReviewScreenProps {
  theme: ScoringTheme;
  onOverride: (initiativeId: string, newRank: number, reason: string) => void;
  onDone: () => void;
  onBack: () => void;
}

export function RankedReviewScreen({ theme, onOverride, onDone, onBack }: RankedReviewScreenProps) {
  const [overrideTarget, setOverrideTarget] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideRankInput, setOverrideRankInput] = useState('');

  const ranked = useMemo(() => {
    const scored = theme.initiatives
      .filter(i => i.status === 'scored')
      .sort((a, b) => b.composite - a.composite)
      .map((ini, i) => ({ ...ini, rank: ini.overrideRank ?? (i + 1) }));

    // Re-sort by effective rank
    scored.sort((a, b) => a.rank - b.rank);
    return scored;
  }, [theme.initiatives]);

  // Capacity line: cumulative effort vs eng-weeks budget
  const capacityItems = useMemo(() => {
    return ranked.reduce<Array<(typeof ranked)[number] & { cumulative: number; aboveLine: boolean }>>((items, ini) => {
      const cumulative = (items[items.length - 1]?.cumulative ?? 0) + ini.effortWeeks;
      items.push({ ...ini, cumulative, aboveLine: cumulative > theme.engWeeks });
      return items;
    }, []);
  }, [ranked, theme.engWeeks]);

  const handleOverrideSubmit = (iniId: string) => {
    const newRank = parseInt(overrideRankInput, 10);
    if (isNaN(newRank) || newRank < 1) return;
    onOverride(iniId, newRank, overrideReason);
    setOverrideTarget(null);
    setOverrideReason('');
    setOverrideRankInput('');
  };

  // Detect close calls: items within 0.3 composite score of each other across the capacity line
  const capacityLineIdx = capacityItems.findIndex(i => i.aboveLine);

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner ranked-review-layout">
        {/* Header */}
        <div>
          <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 8 }}>
            ← Back to scoring
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{theme.icon}</span>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{theme.name} — Ranked</h2>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {theme.engWeeks} eng-weeks budget · {ranked.length} scored
              </p>
            </div>
          </div>
        </div>

        {/* Ranked list */}
        <div className="ranked-list">
          {capacityItems.map((ini, i) => {
            const isCloseCall = capacityLineIdx > 0 && (i === capacityLineIdx - 1 || i === capacityLineIdx) &&
              Math.abs((capacityItems[capacityLineIdx]?.composite ?? 0) - (capacityItems[capacityLineIdx - 1]?.composite ?? 0)) <= 0.3;
            const isOverriding = overrideTarget === ini.id;

            return (
              <div key={ini.id}>
                {/* Capacity line */}
                {i === capacityLineIdx && (
                  <div className="capacity-line">
                    <span className="capacity-line-label">▲ Capacity line ({theme.engWeeks} wks) ▲</span>
                  </div>
                )}

                <motion.div
                  className={`ranked-card ${ini.aboveLine ? 'ranked-card-below' : ''} ${isCloseCall ? 'ranked-card-close-call' : ''}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className="ranked-card-rank">
                    <span className="ranked-card-rank-num">{ini.rank}</span>
                  </div>
                  <div className="ranked-card-content">
                    <div className="ranked-card-top">
                      <p className="ranked-card-name">{ini.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="ranked-card-composite">{ini.composite}</span>
                        {/* Evidence quality dots */}
                        <div style={{ display: 'flex', gap: 2 }}>
                          {ini.scores.map(sc => (
                            <span key={sc.dimensionId} style={{ fontSize: 8 }} title={sc.evidence}>
                              {QUALITY_EMOJI[sc.quality]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="ranked-card-meta">
                      {ini.effortWeeks} wks · Cumul: {ini.cumulative} wks
                      {ini.overrideRank && <span style={{ color: 'var(--warning)' }}> · Manually ranked</span>}
                    </p>
                    {isCloseCall && (
                      <p className="ranked-card-close-call-label">Close call — similar scores near capacity line</p>
                    )}

                    {/* Override controls */}
                    {isOverriding ? (
                      <div className="ranked-override-form">
                        <input
                          className="text-input"
                          placeholder="New rank #"
                          value={overrideRankInput}
                          onChange={e => setOverrideRankInput(e.target.value)}
                          style={{ width: 80 }}
                          type="number"
                          min={1}
                        />
                        <input
                          className="text-input"
                          placeholder="Reason for override"
                          value={overrideReason}
                          onChange={e => setOverrideReason(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleOverrideSubmit(ini.id)}
                          style={{ flex: 1 }}
                        />
                        <button className="btn-pick" onClick={() => handleOverrideSubmit(ini.id)}>Set</button>
                        <button className="btn-ghost" onClick={() => setOverrideTarget(null)} style={{ fontSize: 12 }}>Cancel</button>
                      </div>
                    ) : (
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: '4px 6px', marginTop: 4 }}
                        onClick={() => {
                          setOverrideTarget(ini.id);
                          setOverrideRankInput(String(ini.rank));
                        }}
                      >
                        Override rank
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Done */}
        <motion.button
          className="btn-primary btn-large"
          whileTap={{ scale: 0.97 }}
          onClick={onDone}
        >
          Finalize — go to export
        </motion.button>
      </div>
    </motion.div>
  );
}
