import { motion } from 'framer-motion';
import type { ScoringTheme } from '../types';

interface ThemeLandingScreenProps {
  themes: ScoringTheme[];
  quarter: string;
  onSelectTheme: (themeId: string) => void;
}

export function ThemeLandingScreen({ themes, quarter, onSelectTheme }: ThemeLandingScreenProps) {
  const totalWeeks = themes.reduce((s, t) => s + t.engWeeks, 0);

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner theme-landing-layout">
        {/* Header */}
        <div>
          <p className="screen-section-label">{quarter} Initiative Scoring</p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>
            Score &amp; rank initiatives within each theme
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            {totalWeeks} eng-weeks across {themes.length} themes
          </p>
        </div>

        {/* Theme cards */}
        <div className="theme-cards">
          {themes.map((theme, i) => {
            const scored = theme.initiatives.filter(ini => ini.status === 'scored').length;
            const total = theme.initiatives.length;
            const progress = total > 0 ? scored / total : 0;

            return (
              <motion.button
                key={theme.id}
                className="theme-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectTheme(theme.id)}
              >
                <div className="theme-card-header">
                  <span className="theme-card-icon">{theme.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="theme-card-name">{theme.name}</p>
                    <p className="theme-card-meta">
                      {theme.allocation}% · {theme.engWeeks} eng-wks · {total} initiatives
                    </p>
                  </div>
                  <span className="theme-card-arrow">›</span>
                </div>

                {/* Progress bar */}
                <div className="theme-card-progress">
                  <div className="theme-card-progress-bar">
                    <motion.div
                      className="theme-card-progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ delay: 0.2 + i * 0.06, duration: 0.4 }}
                    />
                  </div>
                  <span className="theme-card-progress-label">
                    {scored}/{total} scored
                  </span>
                </div>

                {theme.lastScored && (
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    Last scored: {theme.lastScored}
                  </p>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
