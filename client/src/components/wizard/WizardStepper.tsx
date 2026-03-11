import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
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
    <nav className="flex items-center justify-between px-4 py-3 bg-forge-900 border-b border-forge-700">
      {([1, 2, 3, 4, 5, 6, 7, 8, 9] as WizardStep[]).map((step) => {
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;
        const isFuture = step > currentStep;

        return (
          <button
            key={step}
            onClick={() => isCompleted && setStep(step)}
            disabled={isFuture}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${isCurrent ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : ''}
              ${isCompleted ? 'text-emerald-400 hover:bg-forge-800 cursor-pointer' : ''}
              ${isFuture ? 'text-forge-500 cursor-not-allowed' : ''}
            `}
          >
            <span
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
              ${isCurrent ? 'bg-amber-500 text-forge-900' : ''}
              ${isCompleted ? 'bg-emerald-500 text-white' : ''}
              ${isFuture ? 'bg-forge-700 text-forge-500' : ''}
            `}
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
