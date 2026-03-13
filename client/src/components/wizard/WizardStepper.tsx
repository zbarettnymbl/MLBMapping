import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { cn } from '@/lib/utils';
import type { WizardStep } from '@mapforge/shared';

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Exercise',
  2: 'Source',
  3: 'Columns',
  4: 'Classification',
  5: 'Validation',
  6: 'References',
  7: 'Users',
  8: 'Pipeline',
  9: 'Publish',
};

export function WizardStepper() {
  const { currentStep, setStep } = useExerciseWizardStore();

  return (
    <nav className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
      {([1, 2, 3, 4, 5, 6, 7, 8, 9] as WizardStep[]).map((step) => {
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;
        const isFuture = step > currentStep;

        return (
          <button
            key={step}
            onClick={() => isCompleted && setStep(step)}
            disabled={isFuture}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              isCurrent && 'bg-primary/20 text-primary border border-primary/40 cursor-default',
              isCompleted && 'text-emerald-400 hover:bg-muted cursor-pointer',
              isFuture && 'text-muted-foreground cursor-not-allowed'
            )}
          >
            <span
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                isCurrent && 'bg-primary text-primary-foreground',
                isCompleted && 'bg-emerald-500 text-white',
                isFuture && 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted ? '\u2713' : step}
            </span>
            <span className="hidden lg:inline">{STEP_LABELS[step]}</span>
          </button>
        );
      })}
    </nav>
  );
}
