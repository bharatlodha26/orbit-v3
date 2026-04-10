import { motion } from 'framer-motion';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface AppHeaderProps {
  context: string;
  onHome: () => void;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function AppHeader({ context, onHome, themeMode, onToggleTheme }: AppHeaderProps) {
  const audio  = useAudio();
  const haptic = useHaptic();

  return (
    <header className="app-header">
      <motion.button
        className="app-header-logo"
        onClick={() => { audio.playNavigate(); haptic.tap(); onHome(); }}
        aria-label="Go to dashboard"
        whileTap={{ scale: 0.94 }}
      >
        <span className="app-header-logo-icon">◎</span>
        <span className="app-header-logo-name">Compass</span>
      </motion.button>

      <motion.p
        key={context}
        className="app-header-context"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {context}
      </motion.p>

      <div className="app-header-actions">
        <motion.button
          type="button"
          className="theme-toggle"
          onClick={() => { audio.playToggle(); onToggleTheme(); }}
          aria-label={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}
          aria-pressed={themeMode === 'dark'}
          whileTap={{ scale: 0.95 }}
        >
          <span className={`theme-toggle-option ${themeMode === 'light' ? 'is-active' : ''}`}>Light</span>
          <span className={`theme-toggle-option ${themeMode === 'dark' ? 'is-active' : ''}`}>Dark</span>
        </motion.button>

        <div className="app-header-user">
          <div className="app-header-avatar">PS</div>
          <span className="app-header-username">Priya S.</span>
          <span className="app-header-caret">▾</span>
        </div>
      </div>
    </header>
  );
}
