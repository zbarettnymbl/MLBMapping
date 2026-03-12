import { useExerciseWizardStore } from '@/stores/exerciseWizardStore';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { Step1ExerciseInfo } from '@/components/wizard/Step1ExerciseInfo';
import { Step2DataSource } from '@/components/wizard/Step2DataSource';
import { Step3SourceColumns } from '@/components/wizard/Step3SourceColumns';
import { Step4ClassificationColumns } from '@/components/wizard/Step4ClassificationColumns';
import { Step5ValidationRules } from '@/components/wizard/Step5ValidationRules';
import { Step6ReferenceTables } from '@/components/wizard/Step6ReferenceTables';
import { Step7UserAssignment } from '@/components/wizard/Step7UserAssignment';
import { Step8Pipeline } from '@/components/wizard/Step8Pipeline';
import { Step9Publish } from '@/components/wizard/Step9Publish';
import { Button } from '@/components/common';
import { AppLayout } from '@/components/layout';

const STEP_COMPONENTS = {
  1: Step1ExerciseInfo,
  2: Step2DataSource,
  3: Step3SourceColumns,
  4: Step4ClassificationColumns,
  5: Step5ValidationRules,
  6: Step6ReferenceTables,
  7: Step7UserAssignment,
  8: Step8Pipeline,
  9: Step9Publish,
};

export function ExerciseWizardPage() {
  const { currentStep, nextStep, prevStep } = useExerciseWizardStore();
  const StepComponent = STEP_COMPONENTS[currentStep];

  return (
    <AppLayout title="Create Exercise">
      <div className="flex flex-col h-full">
        <WizardStepper />
        <div className="flex-1 overflow-y-auto p-6">
          <StepComponent />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-forge-700 bg-forge-900">
          <Button variant="secondary" onClick={prevStep} disabled={currentStep === 1}>
            Back
          </Button>
          {currentStep < 9 && (
            <Button variant="primary" onClick={nextStep}>
              Next
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
