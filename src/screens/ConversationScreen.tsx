import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AllocationBar } from '../components/AllocationBar';
import { PlanningProgress } from '../components/PlanningProgress';
import type { AppState, ThinkingTrailEntry, PlanningStep } from '../types';
import { generateNextTurn, TOTAL_TURNS } from '../services/mockApi';
import type { GeneratedTurn, ConversationHistory } from '../services/mockApi';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface ConversationScreenProps {
  state: AppState;
  onSegmentsChange: (segments: AppState['segments']) => void;
  onComplete: (trail: ThinkingTrailEntry[]) => void;
  onStepClick: (step: PlanningStep) => void;
}

export function ConversationScreen({ state, onSegmentsChange, onComplete, onStepClick }: ConversationScreenProps) {
  const [turn, setTurn] = useState(0);
  const [inputText, setInputText] = useState('');
  const [questionKey, setQuestionKey] = useState(0);
  const [trail, setTrail] = useState<ThinkingTrailEntry[]>([]);
  const [history, setHistory] = useState<ConversationHistory[]>([]);
  const [currentTurnData, setCurrentTurnData] = useState<GeneratedTurn | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const audio = useAudio();
  const haptic = useHaptic();

  const loadTurn = useCallback(async (
    turnIndex: number,
    hist: ConversationHistory[],
    segments: AppState['segments'],
  ) => {
    setIsLoading(true);
    const turnData = await generateNextTurn(turnIndex, hist, segments);
    setCurrentTurnData(turnData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadTurn(0, [], state.segments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitAnswer = useCallback(async (answer: string) => {
    if (!answer.trim() || !currentTurnData) return;

    haptic.tap();
    audio.playChipSelect();

    const newSegments = currentTurnData.barUpdateFn(state.segments, answer);
    onSegmentsChange(newSegments);

    const entry: ThinkingTrailEntry = {
      timestamp: Date.now(),
      question: currentTurnData.question,
      answerText: answer,
      barStateSnapshot: newSegments,
    };
    const newTrail = [...trail, entry];
    setTrail(newTrail);

    const newHistory: ConversationHistory[] = [
      ...history,
      { question: currentTurnData.question, answer },
    ];
    setHistory(newHistory);
    setInputText('');

    const nextTurn = turn + 1;

    if (nextTurn >= TOTAL_TURNS) {
      setTimeout(() => {
        audio.playTransition();
        onComplete(newTrail);
      }, 400);
      return;
    }

    setTimeout(async () => {
      setTurn(nextTurn);
      setQuestionKey(key => key + 1);
      await loadTurn(nextTurn, newHistory, newSegments);
    }, 350);
  }, [currentTurnData, state.segments, onSegmentsChange, trail, history, turn, audio, haptic, loadTurn, onComplete]);

  const handleChip = (chip: string) => submitAnswer(chip);
  const handleSubmit = () => submitAnswer(inputText);

  const currentStep: PlanningStep = turn <= 1 ? 'context' : 'themes';
  const completedSteps: PlanningStep[] = turn > 1 ? ['context'] : [];

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner conversation-screen-inner">
        <PlanningProgress
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={onStepClick}
        />

        <div className="conversation-bar-block">
          <AllocationBar segments={state.segments} />
          <p className="conversation-current-quarter">{state.currentQuarter} baseline</p>
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="conversation-turn-card conversation-turn-card-loading"
            >
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                style={{ fontSize: 14, color: 'var(--text-tertiary)' }}
              >
                Thinking...
              </motion.span>
            </motion.div>
          ) : currentTurnData && (
            <motion.div
              key={questionKey}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className="conversation-turn-card conversation-question-surface"
            >
              <span className="conversation-context-eyebrow">Question</span>
              <p className="conversation-turn-question">{currentTurnData.question}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {!isLoading && currentTurnData && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`chips-${questionKey}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="conversation-chip-list"
            >
              <p className="conversation-section-label">Suggested responses</p>
              {currentTurnData.chips.map((chip, i) => (
                <motion.button
                  key={chip}
                  className="chip context-chip"
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
        )}

        {!isLoading && (
          <div className="conversation-input-row context-input-wrap">
            <p className="conversation-section-label">Custom response</p>
            <div className="conversation-input-shell context-input-shell">
              <input
                className="text-input"
                placeholder="Or type your own..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <motion.button
                className="btn-icon context-submit-btn"
                whileTap={{ scale: 0.9 }}
                onClick={() => { audio.playChipSelect(); handleSubmit(); }}
                disabled={!inputText.trim()}
              >
                {'->'}
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
