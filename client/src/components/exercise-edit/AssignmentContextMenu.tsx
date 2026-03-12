import { useEffect, useRef } from 'react';
import type { ExerciseAssignment } from '@mapforge/shared';

interface AssignmentContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  assignments: ExerciseAssignment[];
  selectedRowIds: Set<string>;
  assignmentColorMap: Map<string, string[]>;
  userColorPalette: Map<string, string>;
  onAssign: (assignmentId: string, userId: string) => void;
  onUnassign: (assignmentId: string, userId: string) => void;
  onClose: () => void;
}

export function AssignmentContextMenu({
  x, y, visible, assignments, selectedRowIds, assignmentColorMap, userColorPalette, onAssign, onUnassign, onClose,
}: AssignmentContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [visible, onClose]);

  if (!visible || selectedRowIds.size === 0) return null;

  // Find users assigned to any of the selected rows (union)
  const assignedToSelected = new Set<string>();
  for (const recordId of selectedRowIds) {
    const userIds = assignmentColorMap.get(recordId) || [];
    for (const uid of userIds) assignedToSelected.add(uid);
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-48 bg-popover border border-border rounded-md shadow-lg py-1"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
        {selectedRowIds.size} row{selectedRowIds.size > 1 ? 's' : ''} selected
      </div>

      {/* Assign to */}
      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Assign to</div>
      {assignments.map(a => (
        <button
          key={`assign-${a.id}`}
          className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2"
          onClick={() => { onAssign(a.id, a.userId); onClose(); }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: userColorPalette.get(a.userId) || '#6b7280' }}
          />
          {a.userName}
        </button>
      ))}
      {assignments.length === 0 && (
        <div className="px-3 py-1.5 text-xs text-muted-foreground">No users assigned to exercise</div>
      )}

      {/* Unassign from (only show users assigned to selected rows) */}
      {assignedToSelected.size > 0 && (
        <>
          <div className="border-t border-border my-1" />
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Unassign from</div>
          {assignments.filter(a => assignedToSelected.has(a.userId)).map(a => (
            <button
              key={`unassign-${a.id}`}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent text-destructive flex items-center gap-2"
              onClick={() => { onUnassign(a.id, a.userId); onClose(); }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: userColorPalette.get(a.userId) || '#6b7280' }}
              />
              {a.userName}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
