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
  quarter: string;
  stepLabel: string;
}

export function PlanningProgress({
  currentStep,
  completedSteps,
  onStepClick,
  quarter,
  stepLabel,
}: PlanningProgressProps) {
  const currentIdx = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="planning-progress">
      {/* Stepper */}
      <div className="planning-progress-steps" role="list">
        {STEPS.map((step, i) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isClickable = isCompleted;

          return (
            <div key={step.id} className="planning-progress-step-wrapper" role="listitem">
              {/* Connector line before this step */}
              {i > 0 && (
                <div
                  className="planning-progress-line"
                  data-active={i <= currentIdx || undefined}
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
                {isCompleted && !isCurrent ? (
                  <span className="planning-progress-check">✓</span>
                ) : (
                  <motion.span
                    className="planning-progress-dot"
                    animate={{ scale: isCurrent ? 1.2 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  />
                )}
                <span className="planning-progress-label">{step.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Breadcrumb */}
      <p className="planning-progress-breadcrumb">
        {quarter} Planning · {stepLabel}
      </p>
    </div>
  );
}
