import { forwardRef, useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import type { AdminExerciseListItem } from '../../types';
import { Tabs } from '../common/Tabs';
import { Badge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { StatusBadge, deriveStatus } from './StatusBadge';
import { UserAvatarStack } from './UserAvatarStack';

interface ExerciseTableProps {
  exercises: AdminExerciseListItem[];
  activeTab: 'active' | 'completed' | 'draft' | 'archived';
  onTabChange: (tab: string) => void;
  selectedExerciseId: string | null;
  onSelectExercise: (id: string | null) => void;
}

type SortColumn = 'name' | 'progress' | 'errors' | 'deadline' | 'status';
type SortDirection = 'asc' | 'desc';

function isCompleted(e: AdminExerciseListItem): boolean {
  return e.status === 'active' && e.classifiedRecords === e.totalRecords && e.errorCount === 0;
}

function filterByTab(exercises: AdminExerciseListItem[], tab: string): AdminExerciseListItem[] {
  switch (tab) {
    case 'active':
      return exercises.filter((e) => e.status === 'active' && !isCompleted(e));
    case 'completed':
      return exercises.filter((e) => isCompleted(e));
    case 'draft':
      return exercises.filter((e) => e.status === 'draft');
    case 'archived':
      return exercises.filter((e) => e.status === 'archived');
    default:
      return exercises;
  }
}

const statusPriority: Record<string, number> = {
  'At Risk': 0,
  Overdue: 1,
  'On Track': 2,
  'Not Started': 3,
  Paused: 4,
  Complete: 5,
};

function sortExercises(
  exercises: AdminExerciseListItem[],
  sortColumn: SortColumn,
  sortDirection: SortDirection
): AdminExerciseListItem[] {
  const sorted = [...exercises].sort((a, b) => {
    let cmp = 0;
    switch (sortColumn) {
      case 'name':
        cmp = a.name.localeCompare(b.name);
        break;
      case 'progress': {
        const pctA = a.totalRecords > 0 ? a.classifiedRecords / a.totalRecords : 0;
        const pctB = b.totalRecords > 0 ? b.classifiedRecords / b.totalRecords : 0;
        cmp = pctA - pctB;
        break;
      }
      case 'errors':
        cmp = a.errorCount - b.errorCount;
        break;
      case 'deadline': {
        const dA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        cmp = dA - dB;
        break;
      }
      case 'status': {
        const sA = statusPriority[deriveStatus(a)] ?? 99;
        const sB = statusPriority[deriveStatus(b)] ?? 99;
        cmp = sA - sB;
        break;
      }
    }
    return sortDirection === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return '--';
  const d = new Date(deadline);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

export const ExerciseTable = forwardRef<HTMLDivElement, ExerciseTableProps>(
  function ExerciseTable({ exercises, activeTab, onTabChange, selectedExerciseId, onSelectExercise }, ref) {
    const [sortColumn, setSortColumn] = useState<SortColumn>('status');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const tabCounts = useMemo(() => ({
      active: exercises.filter((e) => e.status === 'active' && !isCompleted(e)).length,
      completed: exercises.filter((e) => isCompleted(e)).length,
      draft: exercises.filter((e) => e.status === 'draft').length,
      archived: exercises.filter((e) => e.status === 'archived').length,
    }), [exercises]);

    const tabs = [
      { key: 'active', label: 'Active', count: tabCounts.active },
      { key: 'completed', label: 'Completed', count: tabCounts.completed },
      { key: 'draft', label: 'Drafts', count: tabCounts.draft },
      { key: 'archived', label: 'Archived', count: tabCounts.archived },
    ];

    const filteredExercises = useMemo(
      () => filterByTab(exercises, activeTab),
      [exercises, activeTab]
    );

    const sortedExercises = useMemo(
      () => sortExercises(filteredExercises, sortColumn, sortDirection),
      [filteredExercises, sortColumn, sortDirection]
    );

    const handleSort = (col: SortColumn) => {
      if (sortColumn === col) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(col);
        setSortDirection('asc');
      }
    };

    const handleRowClick = (exercise: AdminExerciseListItem) => {
      if (selectedExerciseId === exercise.id) {
        onSelectExercise(null);
      } else {
        onSelectExercise(exercise.id);
      }
    };

    const SortableHeader = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => (
      <button
        className="flex items-center gap-1 hover:text-forge-200"
        onClick={() => handleSort(column)}
      >
        {children}
        <ArrowUpDown size={12} className="opacity-50" />
      </button>
    );

    return (
      <div ref={ref} className="flex-1">
        <div className="px-6">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={onTabChange} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-forge-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-forge-400 uppercase tracking-wide">
                  <SortableHeader column="name">Name</SortableHeader>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-forge-400 uppercase tracking-wide">
                  Assigned
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-forge-400 uppercase tracking-wide">
                  <SortableHeader column="progress">Progress</SortableHeader>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-forge-400 uppercase tracking-wide">
                  <SortableHeader column="errors">Errors</SortableHeader>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-forge-400 uppercase tracking-wide">
                  <SortableHeader column="deadline">Deadline</SortableHeader>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-forge-400 uppercase tracking-wide">
                  <SortableHeader column="status">Status</SortableHeader>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedExercises.map((exercise) => {
                const isSelected = selectedExerciseId === exercise.id;
                const pct = exercise.totalRecords > 0
                  ? Math.round((exercise.classifiedRecords / exercise.totalRecords) * 100)
                  : 0;

                return (
                  <tr
                    key={exercise.id}
                    data-testid={`exercise-row-${exercise.id}`}
                    className={[
                      'border-b border-forge-800/50 transition-colors',
                      isSelected
                        ? 'bg-forge-850 border-l-2 border-amber-500'
                        : 'hover:bg-forge-850 cursor-pointer',
                    ].join(' ')}
                    onClick={() => handleRowClick(exercise)}
                  >
                    <td className="px-6 py-3">
                      <div className="text-sm font-medium text-forge-100">{exercise.name}</div>
                      <div className="text-xs text-forge-500">{truncate(exercise.description, 60)}</div>
                    </td>
                    <td className="px-4 py-3">
                      {exercise.assignedUsers.length > 0 ? (
                        <UserAvatarStack users={exercise.assignedUsers} />
                      ) : (
                        <span className="text-forge-500 text-xs">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1">
                          <ProgressBar
                            value={exercise.classifiedRecords}
                            max={exercise.totalRecords}
                            variant="amber"
                            size="sm"
                            showPercentage={false}
                          />
                        </div>
                        <span className="text-xs text-forge-300 whitespace-nowrap">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {exercise.errorCount > 0 ? (
                        <Badge variant="error">{exercise.errorCount}</Badge>
                      ) : (
                        <span className="text-forge-500">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-forge-300 text-sm">
                      {formatDeadline(exercise.deadline)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge exercise={exercise} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);
