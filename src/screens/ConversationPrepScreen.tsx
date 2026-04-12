import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface ConversationPrepScreenProps {
  currentQuarter: string;
  nextQuarter: string;
  onReady: () => void;
}

const SOURCES = [
  { label: 'Confluence', detail: 'roadmap & OKR docs' },
  { label: 'Gmail',      detail: 'team & customer threads' },
  { label: 'Slack',      detail: 'strategy discussions' },
  { label: 'Calendar',   detail: 'planning meetings & 1:1s' },
];

const READY_BULLETS = [
  '4 questions tailored to your context',
  '2 strategic shifts detected since last quarter',
  'Allocation suggestions pre-loaded',
];

const SCAN_STEPS = [
  "Reviewing last quarter's allocation…",
  'Scanning for strategic shifts…',
  'Reading signals across tools…',
  'Drafting questions for your session…',
];

// Timing (ms)
const SOURCE_START  = 300;
const SOURCE_STEP   = 420;
const READY_START   = SOURCE_START + SOURCE_STEP * SOURCES.length + 280;
const BULLET_STEP   = 200;
const CTA_APPEAR    = READY_START + BULLET_STEP * READY_BULLETS.length + 320;
const SCAN_INTERVAL = 900;

export function ConversationPrepScreen({
  currentQuarter, nextQuarter, onReady,
}: ConversationPrepScreenProps) {
  const [scanIdx,        setScanIdx]        = useState(0);
  const [scanDone,       setScanDone]       = useState(false);
  const [visibleSources, setVisibleSources] = useState(0);
  const [showReady,      setShowReady]      = useState(false);
  const [visibleBullets, setVisibleBullets] = useState(0);
  const [showCta,        setShowCta]        = useState(false);
  const [done,           setDone]           = useState(false);

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audio  = useAudio();
  const haptic = useHaptic();

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Cycle scan narrative until CTA appears
    scanIntervalRef.current = setInterval(
      () => setScanIdx(i => (i + 1) % SCAN_STEPS.length),
      SCAN_INTERVAL,
    );

    // Reveal each source with a tick
    SOURCES.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setVisibleSources(i + 1);
        audio.playChipSelect();
        haptic.tap();
      }, SOURCE_START + SOURCE_STEP * i));
    });

    // "Ready" heading
    timers.push(setTimeout(() => setShowReady(true), READY_START - 120));

    // Reveal each bullet
    READY_BULLETS.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setVisibleBullets(i + 1);
      }, READY_START + BULLET_STEP * i));
    });

    // CTA — stop scan loop and show done state
    timers.push(setTimeout(() => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      setScanDone(true);
      setShowCta(true);
      audio.playTransition();
    }, CTA_APPEAR));

    return () => {
      timers.forEach(clearTimeout);
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = () => {
    if (!showCta || done) return;
    setDone(true);
    audio.playSave();
    haptic.tap();
    onReady();
  };

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner cp-layout">

        {/* ── Icon + heading row ──────────────────────────── */}
        <div className="cp-header">
          <motion.div
            className="cp-icon"
            animate={scanDone
              ? { opacity: 1, scale: 1 }
              : { opacity: [0.7, 1, 0.7], scale: [1, 1.08, 1] }
            }
            transition={{ repeat: scanDone ? 0 : Infinity, duration: 2, ease: 'easeInOut' }}
          >
            {scanDone ? '✦' : '✦'}
          </motion.div>

          <div className="cp-header-text">
            <h2 className="cp-title">Getting your session ready</h2>

            <AnimatePresence mode="wait">
              {scanDone ? (
                <motion.p
                  key="done"
                  className="cp-subtitle cp-subtitle--done"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  ✓ Analysis complete
                </motion.p>
              ) : (
                <motion.p
                  key={scanIdx}
                  className="cp-subtitle"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                >
                  {SCAN_STEPS[scanIdx]}
                </motion.p>
              )}
            </AnimatePresence>

            <p className="cp-context">
              Reviewing {currentQuarter} · Preparing for {nextQuarter}
            </p>
          </div>
        </div>

        {/* ── Sources — 2-column grid ─────────────────────── */}
        <div className="cp-sources">
          {SOURCES.map((src, i) => (
            <AnimatePresence key={src.label}>
              {i < visibleSources && (
                <motion.div
                  className="cp-source-row"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="cp-source-check">✓</span>
                  <span className="cp-source-label">
                    <strong>{src.label}</strong>: {src.detail}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>

        {/* ── Ready bullets ───────────────────────────────── */}
        <AnimatePresence>
          {showReady && (
            <motion.div
              className="cp-ready"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="cp-ready-label">Ready for your session</p>
              <div className="cp-bullet-list">
                {READY_BULLETS.map((text, i) => (
                  <AnimatePresence key={text}>
                    {i < visibleBullets && (
                      <motion.p
                        className="cp-bullet"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <span className="cp-bullet-dot">•</span>
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
              className="btn-primary btn-large cp-cta"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleClick}
            >
              See what's changed →
            </motion.button>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}
