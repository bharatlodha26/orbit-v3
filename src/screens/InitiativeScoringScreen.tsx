import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScoringTheme, Initiative, DimensionScore, ScoringDimension } from '../types';
import { scoreInitiative } from '../services/scoringMockApi';

interface InitiativeScoringScreenProps {
  theme: ScoringTheme;
  onUpdateInitiative: (initiative: Initiative) => void;
  onDone: () => void;
  onBack: () => void;
}

function computeComposite(sliderScores: Record<string, number>, model: ScoringDimension[]): number {
  const totalWeight = model.reduce((s, d) => s + d.weight, 0);
  if (totalWeight === 0) return 0;
  const filled = model.filter(d => sliderScores[d.id] != null);
  if (filled.length === 0) return 0;
  const sum = filled.reduce((s, d) => s + sliderScores[d.id] * (d.weight / totalWeight), 0);
  return Math.round(sum * 10) / 10;
}

export function InitiativeScoringScreen({
  theme, onUpdateInitiative, onDone, onBack,
}: InitiativeScoringScreenProps) {
  const total          = theme.initiatives.length;
  const firstUnscored  = theme.initiatives.findIndex(i => i.status !== 'scored');
  const [currentIdx, setCurrentIdx]     = useState(Math.max(0, firstUnscored));
  const [sliderScores, setSliderScores] = useState<Record<string, number>>({});
  const [nlInput,      setNlInput]      = useState('');
  const [isScoring,    setIsScoring]    = useState(false);

  const initiative  = theme.initiatives[currentIdx];
  const scored      = theme.initiatives.filter(i => i.status === 'scored').length;
  const allSlid     = theme.model.every(d => sliderScores[d.id] != null);
  const composite   = useMemo(() => computeComposite(sliderScores, theme.model), [sliderScores, theme.model]);
  const hasNl       = nlInput.trim().length > 0;

  // Pre-fill when revisiting a scored initiative
  useEffect(() => {
    const ini = theme.initiatives[currentIdx];
    if (!ini) return;
    if (ini.status === 'scored') {
      const pre: Record<string, number> = {};
      ini.scores.forEach(sc => { pre[sc.dimensionId] = sc.score; });
      setSliderScores(pre);
      setNlInput(ini.nlInput ?? '');
    } else {
      setSliderScores({});
      setNlInput('');
    }
  }, [currentIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(() => {
    const next = currentIdx + 1;
    if (next >= total) { onDone(); } else { setCurrentIdx(next); }
  }, [currentIdx, total, onDone]);

  // AI path
  const handleAiScore = useCallback(async () => {
    if (!hasNl) return;
    setIsScoring(true);
    const result = await scoreInitiative(nlInput, theme.model);
    onUpdateInitiative({
      ...initiative,
      nlInput,
      scores: result.scores,
      composite: result.composite,
      narrative: result.narrative,
      status: 'scored',
    });
    setIsScoring(false);
    advance();
  }, [hasNl, nlInput, theme.model, initiative, onUpdateInitiative, advance]);

  // Manual path
  const handleManualSave = useCallback(() => {
    if (!allSlid) return;
    const scores: DimensionScore[] = theme.model.map(d => ({
      dimensionId: d.id,
      score: sliderScores[d.id],
      evidence: 'Manual score',
      quality: sliderScores[d.id] >= 4 ? 'strong' as const
             : sliderScores[d.id] >= 3 ? 'soft' as const
             : 'assumption' as const,
    }));
    onUpdateInitiative({
      ...initiative,
      scores,
      composite,
      narrative: composite >= 4 ? 'Strong across key dimensions.'
               : composite >= 3 ? 'Moderate priority — mixed signals.'
               : 'Lower priority based on scores.',
      status: 'scored',
    });
    advance();
  }, [allSlid, sliderScores, theme.model, initiative, composite, onUpdateInitiative, advance]);

  if (!initiative) return null;

  // CTA state: AI takes priority if textarea has content
  const ctaAi     = hasNl && !isScoring;
  const ctaManual = !hasNl && allSlid;
  const ctaEnabled = ctaAi || ctaManual;

  const ctaLabel = isScoring
    ? 'Scoring…'
    : hasNl
    ? 'Score with AI →'
    : allSlid
    ? 'Save scores →'
    : 'Describe or score to continue';

  const handleCta = () => {
    if (isScoring) return;
    if (hasNl) handleAiScore();
    else if (allSlid) handleManualSave();
  };

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner si-layout">

        {/* ── Header ────────────────────────────────────────── */}
        <div className="si-header">
          <button className="btn-ghost" onClick={onBack} style={{ padding: '4px 0', marginBottom: 8 }}>
            ← Back to model
          </button>
          <div className="si-header-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 17 }}>{theme.icon}</span>
              <span className="si-theme-name">{theme.name}</span>
            </div>
            <div className="si-progress-group">
              <div className="si-progress-track">
                <motion.div
                  className="si-progress-fill"
                  animate={{ width: `${(scored / total) * 100}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
              <span className="si-progress-label">{scored}/{total}</span>
            </div>
          </div>
        </div>

        {/* ── Initiative hero card ──────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={initiative.id}
            className="si-initiative-card"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="si-initiative-top">
              <p className="si-initiative-name">{initiative.name}</p>
              <AnimatePresence>
                {composite > 0 && (
                  <motion.span
                    key={composite}
                    className="si-composite-live"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {composite}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <p className="si-initiative-meta">{initiative.effortWeeks} eng-weeks</p>
          </motion.div>
        </AnimatePresence>

        {/* ── Scrollable body ───────────────────────────────── */}
        <div className="si-body">

          {/* PRIMARY: describe */}
          <div className="si-describe-block">
            <textarea
              className="text-input si-describe-textarea"
              placeholder="Describe what makes this initiative important — AI will infer scores&#10;e.g. 3 enterprise accounts blocked, $200k ARR at risk, compliance deadline Q3…"
              value={nlInput}
              onChange={e => setNlInput(e.target.value)}
            />
          </div>

          {/* SECONDARY: sliders */}
          <div className="si-sliders-block">
            <p className="si-sliders-label">Or score manually</p>
            {theme.model.map(dim => {
              const val = sliderScores[dim.id] ?? 0;
              return (
                <div key={dim.id} className="si-slider-row">
                  <div className="si-slider-meta">
                    <span className="si-slider-name">{dim.shortName}</span>
                    <span
                      className="si-slider-value"
                      style={{ color: val > 0 ? dim.color : undefined }}
                    >
                      {val > 0 ? val : '–'}
                    </span>
                  </div>
                  <div className="si-slider-track-wrap">
                    <input
                      type="range"
                      className="si-slider-input"
                      min={1} max={5} step={1}
                      value={val > 0 ? val : 1}
                      style={{ '--dim-color': dim.color } as React.CSSProperties}
                      onChange={e => setSliderScores(prev => ({ ...prev, [dim.id]: Number(e.target.value) }))}
                      onMouseDown={() => {
                        // Ensure a click registers even if already at min
                        if (val === 0) setSliderScores(prev => ({ ...prev, [dim.id]: 1 }));
                      }}
                    />
                    <div className="si-slider-pips">
                      {[1,2,3,4,5].map(n => (
                        <span
                          key={n}
                          className="si-slider-pip"
                          style={{ background: val >= n ? dim.color : undefined }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="si-footer">
          <button className="si-skip-btn" onClick={advance}>Skip</button>
          <motion.button
            className="btn-primary si-cta-btn"
            disabled={!ctaEnabled}
            style={{ opacity: ctaEnabled ? 1 : 0.35 }}
            whileTap={ctaEnabled ? { scale: 0.97 } : {}}
            onClick={handleCta}
          >
            {ctaLabel}
          </motion.button>
        </div>

      </div>
    </motion.div>
  );
}
