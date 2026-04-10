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

  const audio  = useAudio();
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

    const newHistory: ConversationHistory[] = [...history, { question: currentTurnData.question, answer }];
    setHistory(newHistory);
    setInputText('');

    const nextTurn = turn + 1;
    if (nextTurn >= TOTAL_TURNS) {
      setTimeout(() => { audio.playTransition(); onComplete(newTrail); }, 400);
      return;
    }

    setTimeout(async () => {
      setTurn(nextTurn);
      setQuestionKey(k => k + 1);
      await loadTurn(nextTurn, newHistory, newSegments);
    }, 350);
  }, [currentTurnData, state.segments, onSegmentsChange, trail, history, turn, audio, haptic, loadTurn, onComplete]);

  const handleChip   = (chip: string) => submitAnswer(chip);
  const handleSubmit = () => submitAnswer(inputText);

  const currentStep: PlanningStep    = turn <= 1 ? 'context' : 'themes';
  const completedSteps: PlanningStep[] = turn > 1 ? ['context'] : [];

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner conv-layout">

        {/* ── Breadcrumbs ────────────────────────────────── */}
        <PlanningProgress
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={onStepClick}
        />

        {/* ── Allocation bar (context, not focus) ────────── */}
        <div className="conv-bar-block">
          <AllocationBar segments={state.segments} />
          <p className="conv-quarter-label">{state.currentQuarter} baseline</p>
        </div>

        {/* ── Question (hero) ────────────────────────────── */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              className="conv-question-block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.span
                className="conv-loading-text"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              >
                Thinking…
              </motion.span>
            </motion.div>
          ) : currentTurnData && (
            <motion.div
              key={questionKey}
              className="conv-question-block"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <p className="conv-question-text">{currentTurnData.question}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Chips (scrollable middle zone) ─────────────── */}
        {!isLoading && currentTurnData && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`chips-${questionKey}`}
              className="conv-chips-scroll"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {currentTurnData.chips.map((chip, i) => (
                <motion.button
                  key={chip}
                  className="conv-chip"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleChip(chip)}
                >
                  {chip}
                </motion.button>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Input (always at bottom) ────────────────────── */}
        {!isLoading && (
          <div className="conv-input-row">
            <input
              className="text-input conv-input"
              placeholder="Or type your own…"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <motion.button
              className="conv-submit-btn"
              whileTap={{ scale: 0.9 }}
              onClick={() => { audio.playChipSelect(); handleSubmit(); }}
              disabled={!inputText.trim()}
              aria-label="Submit"
            >
              →
            </motion.button>
          </div>
        )}

      </div>
    </motion.div>
  );
}
