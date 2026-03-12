import { create } from 'zustand';
import type {
  WizardStep,
  WizardExerciseInfo,
  WizardDataSource,
  WizardSourceColumn,
  WizardClassificationColumn,
  WizardUserAssignment,
  WizardValidationRule,
} from '@mapforge/shared';

interface ExerciseWizardState {
  currentStep: WizardStep;
  exerciseId: string | null;
  exerciseInfo: WizardExerciseInfo;
  dataSource: WizardDataSource;
  sourceColumns: WizardSourceColumn[];
  classificationColumns: WizardClassificationColumn[];
  validationRules: WizardValidationRule[];
  uniqueKeyColumns: string[];
  userAssignments: WizardUserAssignment[];
  deadline: string | null;
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setExerciseId: (id: string) => void;
  setExerciseInfo: (info: Partial<WizardExerciseInfo>) => void;
  setDataSource: (source: Partial<WizardDataSource>) => void;
  setSourceColumns: (columns: WizardSourceColumn[]) => void;
  setUniqueKeyColumns: (keys: string[]) => void;
  addClassificationColumn: (col: WizardClassificationColumn) => void;
  updateClassificationColumn: (key: string, updates: Partial<WizardClassificationColumn>) => void;
  removeClassificationColumn: (key: string) => void;
  setValidationRules: (rules: WizardValidationRule[]) => void;
  setUserAssignments: (assignments: WizardUserAssignment[]) => void;
  setDeadline: (deadline: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 1 as WizardStep,
  exerciseId: null,
  exerciseInfo: { name: '', description: '', viewMode: 'flat' as const },
  dataSource: {
    connectionConfig: null,
    refreshSchedule: null,
    isConnected: false,
    previewRows: [],
  },
  sourceColumns: [],
  classificationColumns: [],
  validationRules: [],
  uniqueKeyColumns: [],
  userAssignments: [],
  deadline: null,
};

export const useExerciseWizardStore = create<ExerciseWizardState>((set) => ({
  ...initialState,
  setStep: (step) => set({ currentStep: step }),
  nextStep: () =>
    set((s) => ({
      currentStep: Math.min(s.currentStep + 1, 9) as WizardStep,
    })),
  prevStep: () =>
    set((s) => ({
      currentStep: Math.max(s.currentStep - 1, 1) as WizardStep,
    })),
  setExerciseId: (id) => set({ exerciseId: id }),
  setExerciseInfo: (info) =>
    set((s) => ({ exerciseInfo: { ...s.exerciseInfo, ...info } })),
  setDataSource: (source) =>
    set((s) => ({ dataSource: { ...s.dataSource, ...source } })),
  setSourceColumns: (columns) => set({ sourceColumns: columns }),
  setUniqueKeyColumns: (keys) => set({ uniqueKeyColumns: keys }),
  addClassificationColumn: (col) =>
    set((s) => ({
      classificationColumns: [...s.classificationColumns, col],
    })),
  updateClassificationColumn: (key, updates) =>
    set((s) => ({
      classificationColumns: s.classificationColumns.map((c) =>
        c.key === key ? { ...c, ...updates } : c
      ),
    })),
  removeClassificationColumn: (key) =>
    set((s) => ({
      classificationColumns: s.classificationColumns.filter(
        (c) => c.key !== key
      ),
    })),
  setValidationRules: (rules) => set({ validationRules: rules }),
  setUserAssignments: (assignments) => set({ userAssignments: assignments }),
  setDeadline: (deadline) => set({ deadline }),
  reset: () => set(initialState),
}));
