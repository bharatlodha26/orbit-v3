import { motion } from 'framer-motion';
import type { PlanningStep } from '../types';

const STEPS: { id: PlanningStep; label: string }[] = [
  { id: 'context',  label: 'Context'  },
  { id: 'themes',   label: 'Themes'   },
  { id: 'allocate', label: 'Allocate' },
  { id: 'review',   label: 'Review'   },
  { id: 'lock',     label: 'Lock'     },
];

interface PlanningProgressProps {
  currentStep: PlanningStep;
  completedSteps: PlanningStep[];
  onStepClick: (step: PlanningStep) => void;
}

export function PlanningProgress({ currentStep, completedSteps, onStepClick }: PlanningProgressProps) {
  return (
    <nav className="planning-progress" aria-label="Planning steps">
      <div className="planning-progress-steps">
        {STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent   = step.id === currentStep;
          const state       = isCurrent ? 'current' : isCompleted ? 'completed' : 'pending';

          return (
            <button
              key={step.id}
              className="planning-progress-step"
              data-state={state}
              onClick={() => isCompleted && onStepClick(step.id)}
              disabled={!isCompleted && !isCurrent}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <motion.span
                className="planning-progress-dot"
                animate={{ scale: isCurrent ? 1.25 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              />
              <span className="planning-progress-label">{step.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
