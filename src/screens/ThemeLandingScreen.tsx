import { motion } from 'framer-motion';
import { AllocationBar } from '../components/AllocationBar';
import { DEFAULT_COLORS } from '../data/defaults';
import type { ScoringTheme } from '../types';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface ThemeLandingScreenProps {
  themes: ScoringTheme[];
  onSelectTheme: (themeId: string) => void;
  onReviewAiScores: () => void;
}

export function ThemeLandingScreen({ themes, onSelectTheme, onReviewAiScores }: ThemeLandingScreenProps) {
  const audio  = useAudio();
  const haptic = useHaptic();

  const totalWeeks = themes.reduce((sum, t) => sum + t.engWeeks, 0);
  const allocationSegments = themes.map(t => ({
    id: t.id,
    name: t.name,
    shortName: t.name,
    percentage: t.allocation,
    color: DEFAULT_COLORS[t.id] ?? t.model[0]?.color ?? '#4A6CF7',
  }));

  // Sort by allocation descending — highest focus area first
  const sortedThemes  = [...themes].sort((a, b) => b.allocation - a.allocation);
  const otherThemes   = sortedThemes.slice(1);

  // Aggregate AI coverage
  const totalInitiatives     = themes.reduce((s, t) => s + t.initiatives.length, 0);
  const autoRatedCount       = themes.reduce((s, t) => s + t.initiatives.filter(i => i.autoRated).length, 0);
  const unscoredCount        = themes.reduce((s, t) => s + t.initiatives.filter(i => i.status !== 'scored').length, 0);
  const aiCoverage           = totalInitiatives > 0 ? autoRatedCount / totalInitiatives : 0;
  const firstUnscoredThemeId = sortedThemes.find(t => t.initiatives.some(i => i.status !== 'scored'))?.id ?? null;
  const allScored            = unscoredCount === 0;

  const renderCard = (theme: ScoringTheme, index: number, highlighted = false) => {
    const scored   = theme.initiatives.filter(i => i.status === 'scored').length;
    const aiCount  = theme.initiatives.filter(i => i.autoRated).length;
    const unscored = theme.initiatives.filter(i => i.status !== 'scored').length;
    const total    = theme.initiatives.length;
    const progress = total > 0 ? scored / total : 0;

    const progressLabel =
      aiCount > 0
        ? `${aiCount} AI-scored · ${unscored} need review`
        : scored === 0
        ? 'Not started'
        : `${scored}/${total} scored`;

    return (
      <motion.button
        key={theme.id}
        className={`theme-card${highlighted ? ' theme-card--highlighted' : ''}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        whileTap={{ scale: 0.985 }}
        onClick={() => { audio.playChipSelect(); haptic.tap(); onSelectTheme(theme.id); }}
      >
        <div className="theme-card-header">
          <span className="theme-card-icon">{theme.icon}</span>
          <div className="theme-card-copy">
            <p className="theme-card-name">{theme.name}</p>
            <p className="theme-card-meta">
              {theme.allocation}% allocation · {theme.engWeeks} eng-wks · {total} initiatives
            </p>
          </div>
          {aiCount > 0 && <span className="theme-card-ai-badge">AI</span>}
          <span className="theme-card-arrow">›</span>
        </div>

        <div className="theme-card-progress">
          <div className="theme-card-progress-bar">
            <motion.div
              className="theme-card-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ delay: 0.15 + index * 0.04, duration: 0.35 }}
            />
          </div>
          <span className="theme-card-progress-label">{progressLabel}</span>
        </div>
      </motion.button>
    );
  };

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner theme-landing-layout">

        {/* Header */}
        <div className="theme-landing-header">
          <h2 className="theme-landing-title">Start with your highest focus area</h2>
          <p className="theme-landing-subtitle">
            {totalWeeks} eng-weeks across {themes.length} themes
          </p>
        </div>

        {/* AI pre-score banner */}
        {autoRatedCount > 0 && (
          <motion.div
            className="tl-ai-summary"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="tl-ai-summary-row">
              <span className="tl-ai-summary-icon">✦</span>
              <p className="tl-ai-count">
                AI pre-scored <strong>{autoRatedCount}</strong> of {totalInitiatives} initiatives
              </p>
            </div>
            <div className="tl-ai-bar-track">
              <motion.div
                className="tl-ai-bar"
                initial={{ width: 0 }}
                animate={{ width: `${aiCoverage * 100}%` }}
                transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <p className="tl-ai-summary-sub">Based on signals from Gmail, CRM, and Slack</p>
          </motion.div>
        )}

        {/* Allocation bar */}
        <div className="theme-allocation-summary">
          <AllocationBar segments={allocationSegments} compact={true} />
          <p className="theme-allocation-caption">Current theme allocation</p>
        </div>

        {/* Top card — highlighted */}
        <div className="theme-cards theme-cards--top">
          {sortedThemes.slice(0, 1).map((theme, i) => renderCard(theme, i, true))}
        </div>

        {/* Other areas */}
        {otherThemes.length > 0 && (
          <>
            <p className="theme-section-label">Other areas</p>
            <div className="theme-cards">
              {otherThemes.map((theme, i) => renderCard(theme, i + 1, false))}
            </div>
          </>
        )}

        {/* Dual CTA */}
        <div className="tl-cta-group">
          {!allScored ? (
            <>
              <motion.button
                className="btn-primary btn-large"
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  audio.playSave();
                  haptic.tap();
                  if (firstUnscoredThemeId) onSelectTheme(firstUnscoredThemeId);
                }}
              >
                Score remaining → ({unscoredCount} left)
              </motion.button>
              {autoRatedCount > 0 && (
                <motion.button
                  className="tl-cta-secondary"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { audio.playToggle(); haptic.tap(); onReviewAiScores(); }}
                >
                  Review AI scores
                </motion.button>
              )}
            </>
          ) : (
            <motion.button
              className="btn-primary btn-large"
              whileTap={{ scale: 0.97 }}
              onClick={() => { audio.playSave(); haptic.tap(); onReviewAiScores(); }}
            >
              Review all →
            </motion.button>
          )}
        </div>

      </div>
    </motion.div>
  );
}
