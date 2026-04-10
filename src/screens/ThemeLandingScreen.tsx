import { motion } from 'framer-motion';
import { AllocationBar } from '../components/AllocationBar';
import { DEFAULT_COLORS } from '../data/defaults';
import type { ScoringTheme } from '../types';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface ThemeLandingScreenProps {
  themes: ScoringTheme[];
  onSelectTheme: (themeId: string) => void;
}

export function ThemeLandingScreen({ themes, onSelectTheme }: ThemeLandingScreenProps) {
  const audio  = useAudio();
  const haptic = useHaptic();
  const totalWeeks = themes.reduce((sum, theme) => sum + theme.engWeeks, 0);
  const allocationSegments = themes.map(theme => ({
    id: theme.id,
    name: theme.name,
    shortName: theme.name,
    percentage: theme.allocation,
    color: DEFAULT_COLORS[theme.id] ?? theme.model[0]?.color ?? '#4A6CF7',
  }));

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner theme-landing-layout">
        <div className="theme-landing-header">
          <h2 className="theme-landing-title">Choose a theme to score</h2>
          <p className="theme-landing-subtitle">
            {totalWeeks} eng-weeks across {themes.length} themes
          </p>
        </div>

        <div className="theme-allocation-summary">
          <AllocationBar segments={allocationSegments} compact={true} />
          <p className="theme-allocation-caption">Current theme allocation</p>
        </div>

        <div className="theme-cards">
          {themes.map((theme, index) => {
            const scored = theme.initiatives.filter(initiative => initiative.status === 'scored').length;
            const total = theme.initiatives.length;
            const progress = total > 0 ? scored / total : 0;

            return (
              <motion.button
                key={theme.id}
                className="theme-card"
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
                      {theme.allocation}% allocation | {theme.engWeeks} eng-wks | {total} initiatives
                    </p>
                  </div>
                  <span className="theme-card-arrow">{'>'}</span>
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
                  <span className="theme-card-progress-label">{scored}/{total} scored</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
