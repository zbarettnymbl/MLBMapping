import type { ExerciseListItem } from './exercise';

export interface AdminExerciseListItem extends ExerciseListItem {
  assignedUsers: AssignedUserSummary[];
  createdBy: string;
  createdAt: string;
}

export interface AssignedUserSummary {
  id: string;
  name: string;
  email: string;
  role: 'editor' | 'viewer';
  classifiedCount: number;
  lastActiveAt: string | null;
}

export interface ExerciseProgressDetail {
  exercise: AdminExerciseListItem;
  userProgress: UserProgress[];
}

export interface UserProgress {
  user: AssignedUserSummary;
  assignedRecords: number;
  classifiedRecords: number;
  errorCount: number;
  lastActiveAt: string | null;
  completionPercentage: number;
}
