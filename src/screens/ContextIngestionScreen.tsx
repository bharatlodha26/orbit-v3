import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface ContextIngestionScreenProps {
  onComplete: () => void;
}

const SOURCES = [
  { icon: '✉', label: 'Gmail', detail: 'customer threads' },
  { icon: '📄', label: 'Confluence', detail: 'roadmap docs' },
  { icon: '💼', label: 'CRM', detail: 'deal pipeline' },
  { icon: '💬', label: 'Slack', detail: 'key discussions' },
];

const INSIGHTS = [
  '3 enterprise deals at risk',
  '1 key account showing churn signals',
  'Delays in delivery timelines',
];

// Timing (ms from mount)
const SOURCE_START   = 400;
const SOURCE_STEP    = 500;
const INSIGHT_START  = SOURCE_START + SOURCE_STEP * SOURCES.length + 300;
const INSIGHT_STEP   = 250;
const CTA_APPEAR     = INSIGHT_START + INSIGHT_STEP * INSIGHTS.length + 400;
const AUTO_ADVANCE   = CTA_APPEAR + 1800;

export function ContextIngestionScreen({ onComplete }: ContextIngestionScreenProps) {
  const [visibleSources,  setVisibleSources]  = useState(0);
  const [visibleInsights, setVisibleInsights] = useState(0);
  const [showDetected,    setShowDetected]    = useState(false);
  const [showCta,         setShowCta]         = useState(false);
  const [done,            setDone]            = useState(false);

  const audio  = useAudio();
  const haptic = useHaptic();

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Reveal each source with a tick sound
    SOURCES.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setVisibleSources(i + 1);
        audio.playChipSelect();
        haptic.tap();
      }, SOURCE_START + SOURCE_STEP * i));
    });

    // "Detected:" heading
    timers.push(setTimeout(() => setShowDetected(true), INSIGHT_START - 150));

    // Reveal each insight
    INSIGHTS.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setVisibleInsights(i + 1);
      }, INSIGHT_START + INSIGHT_STEP * i));
    });

    // CTA
    timers.push(setTimeout(() => {
      setShowCta(true);
      audio.playTransition();
    }, CTA_APPEAR));

    // Auto-advance
    timers.push(setTimeout(() => {
      setDone(true);
      onComplete();
    }, AUTO_ADVANCE));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = () => {
    if (!showCta || done) return;
    setDone(true);
    audio.playSave();
    haptic.tap();
    onComplete();
  };

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner ci-layout">

        {/* ── Scanning pulse ─────────────────────────────── */}
        <div className="ci-pulse-wrap">
          <motion.div
            className="ci-pulse-ring ci-pulse-ring--outer"
            animate={{ scale: [1, 1.18, 1], opacity: [0.18, 0.05, 0.18] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          />
          <motion.div
            className="ci-pulse-ring ci-pulse-ring--inner"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut', delay: 0.3 }}
          />
          <motion.div
            className="ci-pulse-icon"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          >
            ◎
          </motion.div>
        </div>

        {/* ── Heading ────────────────────────────────────── */}
        <div className="ci-heading">
          <h2 className="ci-title">Understanding your quarter</h2>
          <p className="ci-subtitle">
            Analyzing recent signals
            <AnimatingDots />
          </p>
        </div>

        {/* ── Sources ────────────────────────────────────── */}
        <div className="ci-sources">
          {SOURCES.map((src, i) => (
            <AnimatePresence key={src.label}>
              {i < visibleSources && (
                <motion.div
                  className="ci-source-row"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <span className="ci-source-check">✓</span>
                  <span className="ci-source-label">
                    <strong>{src.label}</strong>: {src.detail}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>

        {/* ── Insights ───────────────────────────────────── */}
        <AnimatePresence>
          {showDetected && (
            <motion.div
              className="ci-insights"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="ci-detected-label">Detected</p>
              <div className="ci-insight-list">
                {INSIGHTS.map((text, i) => (
                  <AnimatePresence key={text}>
                    {i < visibleInsights && (
                      <motion.p
                        className="ci-insight-item"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <span className="ci-insight-dot">•</span>
                        {text}
                      </motion.p>
                    )}
                  </AnimatePresence>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CTA ────────────────────────────────────────── */}
        <AnimatePresence>
          {showCta && (
            <motion.button
              className="btn-primary btn-large ci-cta"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleClick}
            >
              Review suggested initiatives →
            </motion.button>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}

/** Three dots that animate in sequence: "..." */
function AnimatingDots() {
  return (
    <span className="ci-dots" aria-hidden>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            repeat: Infinity,
            duration: 1.4,
            delay: i * 0.22,
            ease: 'easeInOut',
          }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}
