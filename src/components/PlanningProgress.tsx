import { motion } from 'framer-motion';
import type { PlanningStep } from '../types';
import { useAudio } from '../hooks/useAudio';

const STEPS: { id: PlanningStep; label: string }[] = [
  { id: 'context',  label: 'Context'    },
  { id: 'themes',   label: 'Themes'     },
  { id: 'allocate', label: 'Allocation' },
  { id: 'review',   label: 'Scenarios'  },
  { id: 'lock',     label: 'Lock'       },
];

interface PlanningProgressProps {
  currentStep: PlanningStep;
  completedSteps: PlanningStep[];
  onStepClick: (step: PlanningStep) => void;
}

export function PlanningProgress({ currentStep, completedSteps, onStepClick }: PlanningProgressProps) {
  const audio = useAudio();
  return (
    <nav className="planning-progress" aria-label="Planning steps">
      <div className="planning-progress-steps">
        {STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent   = step.id === currentStep;
          const state       = isCurrent ? 'current' : isCompleted ? 'completed' : 'pending';

          return (
            <motion.button
              key={step.id}
              className="planning-progress-step"
              data-state={state}
              onClick={() => { if (isCompleted) { audio.playNavigate(); onStepClick(step.id); } }}
              disabled={!isCompleted && !isCurrent}
              aria-current={isCurrent ? 'step' : undefined}
              whileTap={isCompleted ? { scale: 0.9 } : {}}
            >
              <motion.span
                className="planning-progress-dot"
                animate={{ scale: isCurrent ? 1.25 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              />
              <span className="planning-progress-label">{step.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
