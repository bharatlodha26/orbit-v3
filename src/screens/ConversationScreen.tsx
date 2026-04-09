import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AllocationBar } from '../components/AllocationBar';
import type { AppState, ThinkingTrailEntry } from '../types';
import { getConversationTurns } from '../data/defaults';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface ConversationScreenProps {
  state: AppState;
  onSegmentsChange: (segments: AppState['segments']) => void;
  onComplete: (trail: ThinkingTrailEntry[]) => void;
}

export function ConversationScreen({ state, onSegmentsChange, onComplete }: ConversationScreenProps) {
  const [turn, setTurn] = useState(0);
  const [inputText, setInputText] = useState('');
  const [questionKey, setQuestionKey] = useState(0);
  const [trail, setTrail] = useState<ThinkingTrailEntry[]>([]);
  const audio = useAudio();
  const haptic = useHaptic();

  const turns = getConversationTurns(state.segments);
  const currentTurn = turns[turn];

  const submitAnswer = (answer: string) => {
    if (!answer.trim()) return;
    haptic.tap();
    audio.playChipSelect();

    // Update bar via turn's barUpdateFn
    const newSegments = currentTurn.barUpdateFn(state.segments, answer);
    onSegmentsChange(newSegments);

    // Record trail
    const entry: ThinkingTrailEntry = {
      timestamp: Date.now(),
      question: currentTurn.question,
      answerText: answer,
      barStateSnapshot: newSegments,
    };
    const newTrail = [...trail, entry];
    setTrail(newTrail);
    setInputText('');

    // Advance or complete
    const nextTurn = turn + 1;
    if (nextTurn >= turns.length) {
      setTimeout(() => {
        audio.playTransition();
        onComplete(newTrail);
      }, 400);
    } else {
      setTimeout(() => {
        setTurn(nextTurn);
        setQuestionKey(k => k + 1);
      }, 350);
    }
  };

  const handleChip = (chip: string) => submitAnswer(chip);
  const handleSubmit = () => submitAnswer(inputText);

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner conversation-layout" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Bar at top — accumulates answers */}
        <div>
          <AllocationBar segments={state.segments} />
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, textAlign: 'center' }}>
            — {state.currentQuarter} (current) —
          </p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {turns.map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: i <= turn ? 'var(--accent)' : 'var(--border)',
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </div>

        {/* Question — replaces on each turn */}
        <AnimatePresence mode="wait">
          <motion.div
            key={questionKey}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'var(--surface)',
              borderRadius: 12,
              padding: '20px 20px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              border: '1px solid var(--border)',
            }}
          >
            <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {currentTurn.question}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Suggestion chips */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`chips-${questionKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {currentTurn.chips.map((chip, i) => (
              <motion.button
                key={chip}
                className="chip"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleChip(chip)}
              >
                {chip}
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Text input */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="text-input"
            placeholder="Or type your own..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <motion.button
            className="btn-icon"
            whileTap={{ scale: 0.9 }}
            onClick={handleSubmit}
            disabled={!inputText.trim()}
          >
            ➤
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
