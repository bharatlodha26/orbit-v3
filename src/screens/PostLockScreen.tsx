import { motion } from 'framer-motion';
import { AllocationBar } from '../components/AllocationBar';
import type { Segment, ThinkingTrailEntry, ReasoningEntry } from '../types';
import { generateNarrative } from '../data/defaults';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface PostLockScreenProps {
  segments: Segment[];
  quarter: string;
  thinkingTrail: ThinkingTrailEntry[];
  reasoning: ReasoningEntry[];
  onStakeholderLoop: () => void;
  onHome: () => void;
  onStartScoring: () => void;
}

export function PostLockScreen({
  segments, quarter, thinkingTrail, reasoning,
  onHome, onStartScoring,
}: PostLockScreenProps) {
  const narrative = generateNarrative(segments);
  const audio  = useAudio();
  const haptic = useHaptic();

  const handleShare = async () => {
    const text = `${quarter} Allocation: ${segments.map(s => `${s.name} ${s.percentage}%`).join(' · ')}\n"${narrative}"`;
    if (navigator.share) {
      await navigator.share({ title: `${quarter} Allocation`, text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleDownload = () => {
    const artifact = {
      quarter,
      lockedAt: new Date().toISOString(),
      narrative,
      segments: segments.map(s => ({ name: s.name, percentage: s.percentage, isLocked: s.isLocked ?? false })),
      reasoning: reasoning.map(entry => ({
        theme: entry.themeName,
        evidence: entry.bullets.map(b => ({ text: b.text, signalType: b.signalType, sourceQuote: b.sourceQuote })),
      })),
      decisionTrail: {
        conversationTurns: thinkingTrail.length,
        qa: thinkingTrail.map(t => ({ question: t.question, answer: t.answerText })),
      },
    };
    const blob = new Blob([JSON.stringify(artifact, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quarter.replace(/\s/g, '-').toLowerCase()}-allocation.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner post-lock-layout">

        {/* ── Celebration mark ─────────────────────────────── */}
        <motion.div
          className="post-lock-check"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.05 }}
        >
          ✓
        </motion.div>

        {/* ── Title ────────────────────────────────────────── */}
        <motion.div
          className="post-lock-hero"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="post-lock-title">{quarter} allocation locked</h2>
          <p className="post-lock-narrative">{narrative}</p>
        </motion.div>

        {/* ── Locked bar — the achievement ─────────────────── */}
        <motion.div
          className="post-lock-bar-block"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
        >
          <AllocationBar segments={segments} />
          <div className="post-lock-segments">
            {segments.map(seg => (
              <div key={seg.id} className="post-lock-seg-row">
                <span
                  className="post-lock-seg-dot"
                  style={{ background: seg.color }}
                />
                <span className="post-lock-seg-name">{seg.name}</span>
                <span className="post-lock-seg-pct">{seg.percentage}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Primary CTA ──────────────────────────────────── */}
        <motion.button
          className="btn-primary btn-large post-lock-cta"
          whileTap={{ scale: 0.97 }}
          onClick={() => { audio.playTransition(); haptic.tap(); onStartScoring(); }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Score initiatives →
        </motion.button>

        {/* ── Secondary actions ────────────────────────────── */}
        <motion.div
          className="post-lock-secondary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.38 }}
        >
          <motion.button className="post-lock-link" whileTap={{ scale: 0.94 }} onClick={() => { audio.playTap(); handleShare(); }}>Share</motion.button>
          <span className="post-lock-divider">·</span>
          <motion.button className="post-lock-link" whileTap={{ scale: 0.94 }} onClick={() => { audio.playTap(); handleDownload(); }}>Download</motion.button>
          <span className="post-lock-divider">·</span>
          <motion.button className="post-lock-link" whileTap={{ scale: 0.94 }} onClick={() => { audio.playNavigate(); haptic.tap(); onHome(); }}>Home</motion.button>
        </motion.div>

      </div>
    </motion.div>
  );
}
