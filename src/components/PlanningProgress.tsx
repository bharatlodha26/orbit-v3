import { motion } from 'framer-motion';
import type { PlanningStep } from '../types';

const STEPS: { id: PlanningStep; label: string }[] = [
  { id: 'context', label: 'Context' },
  { id: 'themes', label: 'Themes' },
  { id: 'allocate', label: 'Allocate' },
  { id: 'review', label: 'Review' },
  { id: 'lock', label: 'Lock' },
];

interface PlanningProgressProps {
  currentStep: PlanningStep;
  completedSteps: PlanningStep[];
  onStepClick: (step: PlanningStep) => void;
}

export function PlanningProgress({
  currentStep,
  completedSteps,
  onStepClick,
}: PlanningProgressProps) {
  const currentIdx = STEPS.findIndex(step => step.id === currentStep);

  return (
    <div className="planning-progress">
      <div className="planning-progress-steps" role="list">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isClickable = isCompleted;

          return (
            <div key={step.id} className="planning-progress-step-wrapper" role="listitem">
              {index > 0 && (
                <div
                  className="planning-progress-line"
                  data-active={index <= currentIdx || undefined}
                />
              )}
              <button
                className="planning-progress-step"
                data-state={isCurrent ? 'current' : isCompleted ? 'completed' : 'pending'}
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable && !isCurrent}
                aria-current={isCurrent ? 'step' : undefined}
                title={step.label}
              >
                <motion.span
                  className="planning-progress-dot"
                  animate={{ scale: isCurrent ? 1.2 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                />
                <span className="planning-progress-label">{step.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
