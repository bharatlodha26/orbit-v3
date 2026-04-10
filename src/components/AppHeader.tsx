import { motion } from 'framer-motion';

interface AppHeaderProps {
  context: string;
  onHome: () => void;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function AppHeader({ context, onHome, themeMode, onToggleTheme }: AppHeaderProps) {
  return (
    <header className="app-header">
      <button className="app-header-logo" onClick={onHome} aria-label="Go to dashboard">
        <span className="app-header-logo-icon">◎</span>
        <span className="app-header-logo-name">Compass</span>
      </button>

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
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}
          aria-pressed={themeMode === 'dark'}
        >
          <span className={`theme-toggle-option ${themeMode === 'light' ? 'is-active' : ''}`}>Light</span>
          <span className={`theme-toggle-option ${themeMode === 'dark' ? 'is-active' : ''}`}>Dark</span>
        </button>

        <div className="app-header-user">
          <div className="app-header-avatar">PS</div>
          <span className="app-header-username">Priya S.</span>
          <span className="app-header-caret">▾</span>
        </div>
      </div>
    </header>
  );
}
