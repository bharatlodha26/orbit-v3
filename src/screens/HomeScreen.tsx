import { motion } from 'framer-motion';
import { AllocationBar } from '../components/AllocationBar';
import type { AppState } from '../types';
import { useHaptic } from '../hooks/useHaptic';

interface HomeScreenProps {
  state: AppState;
  onPlan: () => void;
}

export function HomeScreen({ state, onPlan }: HomeScreenProps) {
  const haptic = useHaptic();

  const handleBarTap = () => {
    haptic.tap();
    onPlan();
  };

  if (state.isFirstTime) {
    return (
      <motion.div className="screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="screen-inner" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 32, minHeight: '100svh' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Strategic Allocation Navigator
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              Your quarterly bet in one bar.
            </p>
          </div>
          <motion.div whileTap={{ scale: 0.98 }} onClick={handleBarTap} style={{ width: '100%', cursor: 'pointer' }}>
            <div style={{
              width: '100%', height: 88, borderRadius: 10,
              background: 'var(--surface-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed var(--border)',
            }}>
              <span style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Tap to set your first allocation</span>
            </div>
          </motion.div>
          <motion.button className="btn-primary" onClick={onPlan} whileTap={{ scale: 0.97 }}>
            Get started →
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="screen-inner home-layout">
        {/* Quarter label */}
        <p className="home-quarter-label">
          {state.currentQuarter} · {state.weeksLeft} weeks left
        </p>

        {/* THE BAR — hero element */}
        <motion.div
          className="home-bar-wrapper"
          whileTap={{ scale: 0.998 }}
          onClick={handleBarTap}
          style={{ cursor: 'pointer' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <AllocationBar segments={state.segments} />
        </motion.div>

        {/* Status + CTA row */}
        <div className="home-footer">
          <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
            {state.onTrack} of {state.totalInitiatives} on track
          </p>
          <motion.button className="btn-primary" onClick={onPlan} whileTap={{ scale: 0.97 }}>
            Plan {state.nextQuarter} →
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
