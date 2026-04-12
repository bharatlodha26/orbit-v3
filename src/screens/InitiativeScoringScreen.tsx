import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScoringTheme, Initiative, DimensionScore, ScoringDimension } from '../types';
import { scoreInitiative } from '../services/scoringMockApi';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface InitiativeScoringScreenProps {
  theme: ScoringTheme;
  onUpdateInitiative: (initiative: Initiative) => void;
  onDone: () => void;
  onBack: () => void;
}

const DEFAULT_SCORE = 3;

function compositeLabel(score: number): string {
  if (score >= 4.5) return 'High priority';
  if (score >= 3.5) return 'Good priority';
  if (score >= 2.5) return 'Moderate';
  return 'Lower priority';
}

function buildDefaultSliders(model: ScoringDimension[]): Record<string, number> {
  const defaults: Record<string, number> = {};
  model.forEach(d => { defaults[d.id] = DEFAULT_SCORE; });
  return defaults;
}

function computeComposite(sliderScores: Record<string, number>, model: ScoringDimension[]): number {
  const totalWeight = model.reduce((s, d) => s + d.weight, 0);
  if (totalWeight === 0) return 0;
  const sum = model.reduce((s, d) => s + (sliderScores[d.id] ?? DEFAULT_SCORE) * (d.weight / totalWeight), 0);
  return Math.round(sum * 10) / 10;
}

export function InitiativeScoringScreen({
  theme, onUpdateInitiative, onDone, onBack,
}: InitiativeScoringScreenProps) {
  const total         = theme.initiatives.length;
  const firstUnscored = theme.initiatives.findIndex(i => i.status !== 'scored');

  const [currentIdx,   setCurrentIdx]   = useState(Math.max(0, firstUnscored));
  const [sliderScores, setSliderScores] = useState<Record<string, number>>(buildDefaultSliders(theme.model));
  const [nlInput,      setNlInput]      = useState('');
  const [isScoring,    setIsScoring]    = useState(false);
  const [slidersOpen,  setSlidersOpen]  = useState(false);

  const audio  = useAudio();
  const haptic = useHaptic();

  const initiative = theme.initiatives[currentIdx];
  const scored     = theme.initiatives.filter(i => i.status === 'scored').length;
  const composite  = useMemo(() => computeComposite(sliderScores, theme.model), [sliderScores, theme.model]);
  const hasNl      = nlInput.trim().length > 0;

  // Sort model by weight desc for visual hierarchy
  const sortedModel = useMemo(
    () => [...theme.model].sort((a, b) => b.weight - a.weight),
    [theme.model]
  );

  // Pre-fill when navigating to a scored initiative; default sliders for unscored
  useEffect(() => {
    const ini = theme.initiatives[currentIdx];
    if (!ini) return;
    if (ini.status === 'scored' && ini.scores.length > 0) {
      const pre: Record<string, number> = {};
      ini.scores.forEach(sc => { pre[sc.dimensionId] = sc.score; });
      setSliderScores(pre);
      setNlInput(ini.nlInput ?? '');
    } else {
      setSliderScores(buildDefaultSliders(theme.model));
      setNlInput('');
    }
    setSlidersOpen(false);
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

  // Manual path (sliders)
  const handleManualSave = useCallback(() => {
    const scores: DimensionScore[] = theme.model.map(d => ({
      dimensionId: d.id,
      score: sliderScores[d.id] ?? DEFAULT_SCORE,
      evidence: 'Manual score',
      quality: (sliderScores[d.id] ?? DEFAULT_SCORE) >= 4 ? 'strong' as const
             : (sliderScores[d.id] ?? DEFAULT_SCORE) >= 3 ? 'soft' as const
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
  }, [sliderScores, theme.model, initiative, composite, onUpdateInitiative, advance]);

  if (!initiative) return null;

  const ctaLabel = isScoring
    ? 'Scoring…'
    : hasNl
    ? 'Score with AI →'
    : 'Looks right → save';

  const handleCta = () => {
    if (isScoring) return;
    if (hasNl) { audio.playSave(); haptic.tap(); handleAiScore(); }
    else        { audio.playSave(); haptic.tap(); handleManualSave(); }
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
          <motion.button className="btn-ghost" whileTap={{ scale: 0.95 }}
            onClick={() => { audio.playNavigate(); haptic.tap(); onBack(); }}
            style={{ padding: '4px 0', marginBottom: 8 }}
          >
            ← Back to model
          </motion.button>
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
                  <motion.div
                    key={composite}
                    className="si-composite-live"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <span className="si-composite-label">{compositeLabel(composite)}</span>
                    <span className="si-composite-score">{composite}</span>
                  </motion.div>
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
              placeholder={`Why should this ship this quarter?\ne.g. $200k ARR at risk, 3 accounts blocked…`}
              value={nlInput}
              onChange={e => setNlInput(e.target.value)}
            />
          </div>

          {/* SECONDARY: sliders — collapsed by default */}
          <div className="si-sliders-block">
            <button
              className="si-sliders-toggle"
              onClick={() => { audio.playToggle(); setSlidersOpen(o => !o); }}
            >
              <span>{slidersOpen ? '▾' : '▸'} Adjust scores manually</span>
            </button>

            <AnimatePresence>
              {slidersOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="si-sliders-inner">
                    {sortedModel.map((dim, dimIdx) => {
                      const val       = sliderScores[dim.id] ?? DEFAULT_SCORE;
                      const isPrimary = dimIdx === 0;
                      return (
                        <div key={dim.id} className="si-rating-row">
                          <div className="si-rating-label">
                            <span className={`si-slider-name${isPrimary ? ' si-slider-name--primary' : ''}`}>
                              {dim.shortName}
                            </span>
                            <span className="si-slider-weight-badge">{dim.weight}%</span>
                          </div>
                          <div className="si-rating-pills">
                            {[1, 2, 3, 4, 5].map(n => {
                              const isSelected = val === n;
                              return (
                                <motion.button
                                  key={n}
                                  className={`si-rating-pill${isSelected ? ' si-rating-pill--selected' : ''}`}
                                  style={{
                                    '--pill-color': dim.color,
                                    background: isSelected ? dim.color : undefined,
                                  } as React.CSSProperties}
                                  whileHover={{ scale: 1.15, y: -2 }}
                                  whileTap={{ scale: 0.9 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                                  onClick={() => {
                                    audio.playSegmentChange(n, true);
                                    haptic.tap();
                                    setSliderScores(prev => ({ ...prev, [dim.id]: n }));
                                  }}
                                >
                                  {n}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="si-footer">
          <motion.button
            className="si-skip-btn"
            whileTap={{ scale: 0.95 }}
            onClick={() => { audio.playTap(); advance(); }}
          >
            Score later
          </motion.button>
          <motion.button
            className="btn-primary si-cta-btn"
            disabled={isScoring}
            style={{ opacity: isScoring ? 0.5 : 1 }}
            whileTap={!isScoring ? { scale: 0.97 } : {}}
            onClick={handleCta}
          >
            {ctaLabel}
          </motion.button>
        </div>

      </div>
    </motion.div>
  );
}
