import { motion } from 'framer-motion';
import type { Segment, ThinkingTrailEntry, ReasoningEntry } from '../types';
import { generateNarrative, getNotList } from '../data/defaults';

interface PostLockScreenProps {
  segments: Segment[];
  quarter: string;
  thinkingTrail: ThinkingTrailEntry[];
  reasoning: ReasoningEntry[];
  onStakeholderLoop: () => void;
  onHome: () => void;
}

interface ActionItem {
  label: string;
  icon: string;
  onClick: () => void;
  primary?: boolean;
}

export function PostLockScreen({ segments, quarter, thinkingTrail, reasoning, onStakeholderLoop, onHome }: PostLockScreenProps) {
  const narrative = generateNarrative(segments);
  const notList = getNotList(segments);

  const handleShare = async () => {
    const text = `${quarter} Allocation: ${segments.map(s => `${s.name} ${s.percentage}%`).join(' · ')}\n"${narrative}"`;
    if (navigator.share) {
      await navigator.share({ title: `${quarter} Allocation`, text });
    } else {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
    setTimeout(onStakeholderLoop, 500);
  };

  const handleDownload = () => {
    const artifact = {
      quarter,
      lockedAt: new Date().toISOString(),
      narrative,
      segments: segments.map(s => ({
        name: s.name,
        percentage: s.percentage,
        isLocked: s.isLocked ?? false,
      })),
      notThisQuarter: notList,
      reasoning: reasoning.map(entry => ({
        theme: entry.themeName,
        evidence: entry.bullets.map(b => ({
          text: b.text,
          signalType: b.signalType,
          sourceQuote: b.sourceQuote,
        })),
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
    a.download = `${quarter.replace(/\s/g, '-').toLowerCase()}-quarterly-bet.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewTrail = () => {
    const lines = thinkingTrail.map(t => `Q: ${t.question}\nA: ${t.answerText}`).join('\n\n');
    alert('Thinking trail:\n\n' + lines);
  };

  const actions: ActionItem[] = [
    { label: 'Share as link', icon: '↗', onClick: handleShare, primary: true },
    { label: 'Download one-pager', icon: '↓', onClick: handleDownload },
    { label: 'View thinking trail', icon: '⌛', onClick: handleViewTrail },
    { label: 'Next: Score initiatives within each theme →', icon: '⬡', onClick: onHome },
  ];

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner post-lock-layout">
        {/* Confirmation mark */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="post-lock-check"
        >
          ✓
        </motion.div>

        <div style={{ textAlign: 'center' }}>
          <h2 className="post-lock-title">✓ {quarter} Locked</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 4 }}>
            "{narrative}"
          </p>
        </div>

        {/* Action list */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {actions.map((action, i) => (
            <motion.button
              key={action.label}
              className={action.primary ? 'btn-action btn-action-primary' : 'btn-action'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              whileTap={{ scale: 0.98 }}
              onClick={action.onClick}
            >
              <span style={{ fontSize: 16, minWidth: 20 }}>{action.icon}</span>
              <span>{action.label}</span>
            </motion.button>
          ))}
        </div>

        <motion.button
          className="btn-ghost"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={onHome}
          style={{ color: 'var(--text-tertiary)', fontSize: 13 }}
        >
          Back to home
        </motion.button>
      </div>
    </motion.div>
  );
}
