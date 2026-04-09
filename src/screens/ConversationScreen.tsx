import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AllocationBar } from '../components/AllocationBar';
import { VerticalAllocationBar } from '../components/VerticalAllocationBar';
import { PlanningProgress } from '../components/PlanningProgress';
import type { AppState, ThinkingTrailEntry, ReasoningEntry, PlanningStep } from '../types';
import { generateNextTurn, TOTAL_TURNS } from '../services/mockApi';
import type { GeneratedTurn, ConversationHistory } from '../services/mockApi';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface ConversationScreenProps {
  state: AppState;
  onSegmentsChange: (segments: AppState['segments']) => void;
  onComplete: (trail: ThinkingTrailEntry[], reasoning: ReasoningEntry[]) => void;
  onStepClick: (step: PlanningStep) => void;
}

const STEP_LABELS: Record<number, string> = {
  0: 'Theme Selection',
  1: 'Theme Selection',
  2: 'Theme Selection',
  3: 'Theme Selection',
};

export function ConversationScreen({ state, onSegmentsChange, onComplete, onStepClick }: ConversationScreenProps) {
  const [turn, setTurn] = useState(0);
  const [inputText, setInputText] = useState('');
  const [questionKey, setQuestionKey] = useState(0);
  const [trail, setTrail] = useState<ThinkingTrailEntry[]>([]);
  const [accReasoning, setAccReasoning] = useState<ReasoningEntry[]>([]);
  const [history, setHistory] = useState<ConversationHistory[]>([]);
  const [currentTurnData, setCurrentTurnData] = useState<GeneratedTurn | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const audio = useAudio();
  const haptic = useHaptic();

  // Load first turn on mount
  useEffect(() => {
    loadTurn(0, [], state.segments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const submitAnswer = useCallback(async (answer: string) => {
    if (!answer.trim() || !currentTurnData) return;

    haptic.tap();
    audio.playChipSelect();

    // Update bar via turn's barUpdateFn
    const newSegments = currentTurnData.barUpdateFn(state.segments, answer);
    onSegmentsChange(newSegments);

    // Generate reasoning for this answer
    const newReasoning = currentTurnData.generateReasoning(answer, newSegments);

    // Merge reasoning entries
    const merged = mergeReasoning(accReasoning, newReasoning);
    setAccReasoning(merged);

    // Record trail entry
    const entry: ThinkingTrailEntry = {
      timestamp: Date.now(),
      question: currentTurnData.question,
      answerText: answer,
      barStateSnapshot: newSegments,
      reasoning: newReasoning,
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
        onComplete(newTrail, merged);
      }, 400);
      return;
    }

    // Animate question out, then load next turn
    setTimeout(async () => {
      setTurn(nextTurn);
      setQuestionKey(k => k + 1);
      await loadTurn(nextTurn, newHistory, newSegments);
    }, 350);
  }, [currentTurnData, state.segments, onSegmentsChange, accReasoning, trail, history, turn, audio, haptic, loadTurn, onComplete]);

  const handleChip = (chip: string) => submitAnswer(chip);
  const handleSubmit = () => submitAnswer(inputText);

  const currentStep: PlanningStep = turn <= 1 ? 'context' : 'themes';
  const completedSteps: PlanningStep[] = turn > 1 ? ['context'] : [];

  const stepLabel = STEP_LABELS[turn] ?? 'Theme Selection';

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner conversation-screen-inner">
        {/* Progress stepper */}
        <PlanningProgress
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={onStepClick}
          quarter={state.nextQuarter}
          stepLabel={stepLabel}
        />

        {/* Desktop 2-column layout */}
        <div className="conversation-columns">

          {/* LEFT: question + chips + input */}
          <div className="conversation-left">

            {/* Progress dots (mobile only — stepper is shown on desktop) */}
            <div className="conversation-dots mobile-only">
              {Array.from({ length: TOTAL_TURNS }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    backgroundColor: i <= turn ? 'var(--accent)' : 'var(--border)',
                    transition: 'background-color 0.3s',
                  }}
                />
              ))}
            </div>

            {/* Mobile bar (shown only on mobile, above the question) */}
            <div className="conversation-bar-mobile">
              <AllocationBar segments={state.segments} />
              <p className="conversation-bar-label">
                — {state.currentQuarter} (current) —
              </p>
            </div>

            {/* Question card */}
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key={`loading-${turn}`}
                  className="conversation-question-card"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="conversation-loading">
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      style={{ fontSize: 14, color: 'var(--text-tertiary)' }}
                    >
                      Analyzing your answer…
                    </motion.span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={questionKey}
                  className="conversation-question-card"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.22 }}
                >
                  <p className="conversation-question-text">
                    {currentTurnData?.question}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Suggestion chips */}
            <AnimatePresence mode="wait">
              {!isLoading && currentTurnData && (
                <motion.div
                  key={`chips-${questionKey}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  {currentTurnData.chips.map((chip, i) => (
                    <motion.button
                      key={chip}
                      className="chip"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleChip(chip)}
                    >
                      {chip}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Text input */}
            {!isLoading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="text-input"
                  placeholder="Or describe in your own words…"
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
            )}
          </div>

          {/* RIGHT: Vertical bar (desktop only) */}
          <div className="conversation-right desktop-only">
            <p className="conversation-bar-label" style={{ textAlign: 'center', marginBottom: 12 }}>
              {state.nextQuarter} — taking shape
            </p>
            <VerticalAllocationBar segments={state.segments} height={360} />
          </div>

        </div>
      </div>
    </motion.div>
  );
}

// Merge new reasoning entries into accumulated reasoning
function mergeReasoning(acc: ReasoningEntry[], incoming: ReasoningEntry[]): ReasoningEntry[] {
  const result = [...acc];
  incoming.forEach(entry => {
    const existing = result.find(r => r.themeId === entry.themeId);
    if (existing) {
      existing.bullets = [...existing.bullets, ...entry.bullets];
    } else {
      result.push({ ...entry });
    }
  });
  return result;
}
