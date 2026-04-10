import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScoringTheme, Initiative, DimensionScore } from '../types';
import { scoreInitiative, QUALITY_EMOJI, QUALITY_LABEL } from '../services/scoringMockApi';

interface InitiativeScoringScreenProps {
  theme: ScoringTheme;
  onUpdateInitiative: (initiative: Initiative) => void;
  onDone: () => void;
  onBack: () => void;
}

export function InitiativeScoringScreen({ theme, onUpdateInitiative, onDone, onBack }: InitiativeScoringScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nlInputs, setNlInputs] = useState<Record<string, string>>({});
  const [scoringId, setScoringId] = useState<string | null>(null);

  const handleScore = useCallback(async (initiative: Initiative) => {
    const input = nlInputs[initiative.id] ?? '';
    if (!input.trim()) return;

    setScoringId(initiative.id);
    const result = await scoreInitiative(input, theme.model);

    const updated: Initiative = {
      ...initiative,
      nlInput: input,
      scores: result.scores,
      composite: result.composite,
      narrative: result.narrative,
      status: 'scored',
    };
    onUpdateInitiative(updated);
    setScoringId(null);
  }, [nlInputs, theme.model, onUpdateInitiative]);

  const scored = theme.initiatives.filter(i => i.status === 'scored').length;
  const total = theme.initiatives.length;

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner initiative-scoring-layout">
        {/* Header */}
        <div>
          <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 8 }}>
            ← Back to model
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{theme.icon}</span>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{theme.name}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {scored}/{total} scored · {theme.engWeeks} eng-weeks
              </p>
            </div>
          </div>
        </div>

        <p className="screen-section-label">Score Initiatives</p>

        {/* Initiative list */}
        <div className="initiative-list">
          {theme.initiatives.map((ini, i) => {
            const isExpanded = expandedId === ini.id;
            const isScoring = scoringId === ini.id;

            return (
              <motion.div
                key={ini.id}
                className={`initiative-card ${isExpanded ? 'initiative-card-expanded' : ''}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                layout
              >
                {/* Header row */}
                <button
                  className="initiative-card-header"
                  onClick={() => setExpandedId(isExpanded ? null : ini.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="initiative-card-name">{ini.name}</p>
                    <p className="initiative-card-meta">
                      {ini.effortWeeks} wks
                      {ini.status === 'scored' && ` · Score: ${ini.composite}`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {ini.status === 'scored' && (
                      <span className="initiative-score-badge">{ini.composite}</span>
                    )}
                    {ini.status === 'unscored' && (
                      <span className="initiative-unscored-badge">Unscored</span>
                    )}
                    <span style={{ fontSize: 14, color: 'var(--text-tertiary)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
                  </div>
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="initiative-card-body"
                    >
                      {/* NL input */}
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                          Describe why this initiative matters:
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            className="text-input"
                            placeholder="e.g. 3 enterprise accounts blocked on this, $200k ARR at risk"
                            value={nlInputs[ini.id] ?? ini.nlInput ?? ''}
                            onChange={e => setNlInputs(prev => ({ ...prev, [ini.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleScore(ini)}
                          />
                          <motion.button
                            className="btn-icon"
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleScore(ini)}
                            disabled={!(nlInputs[ini.id] ?? '').trim() || isScoring}
                          >
                            {isScoring ? '…' : '➤'}
                          </motion.button>
                        </div>
                      </div>

                      {/* Score breakdown */}
                      {ini.status === 'scored' && ini.scores.length > 0 && (
                        <div className="initiative-scores">
                          {ini.scores.map(sc => {
                            const dim = theme.model.find(d => d.id === sc.dimensionId);
                            return (
                              <ScoreRow key={sc.dimensionId} score={sc} dimName={dim?.shortName ?? sc.dimensionId} dimColor={dim?.color ?? '#999'} />
                            );
                          })}

                          {ini.narrative && (
                            <p className="initiative-narrative">
                              {ini.narrative}
                            </p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Done button */}
        <motion.button
          className="btn-primary btn-large"
          whileTap={{ scale: 0.97 }}
          onClick={onDone}
          style={{ opacity: scored === 0 ? 0.5 : 1 }}
        >
          {scored === total ? 'Review rankings →' : `Continue (${scored}/${total} scored)`}
        </motion.button>
      </div>
    </motion.div>
  );
}

function ScoreRow({ score, dimName, dimColor }: { score: DimensionScore; dimName: string; dimColor: string }) {
  return (
    <div className="initiative-score-row">
      <div className="initiative-score-dim">
        <span className="initiative-score-dot" style={{ backgroundColor: dimColor }} />
        <span className="initiative-score-dim-name">{dimName}</span>
      </div>
      <div className="initiative-score-bar-track">
        <motion.div
          className="initiative-score-bar-fill"
          style={{ backgroundColor: dimColor }}
          initial={{ width: 0 }}
          animate={{ width: `${(score.score / 5) * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      </div>
      <span className="initiative-score-value">{score.score}/5</span>
      <span className="initiative-score-quality" title={QUALITY_LABEL[score.quality]}>
        {QUALITY_EMOJI[score.quality]}
      </span>
      <span className="initiative-score-evidence">{score.evidence}</span>
    </div>
  );
}
