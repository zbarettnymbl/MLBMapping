import type { ICellRendererParams } from 'ag-grid-community';

interface AssignmentColorBarParams extends ICellRendererParams {
  assignmentColorMap: Map<string, string[]>;
  userColorPalette: Map<string, string>;
  userNames: Map<string, string>;
}

export function AssignmentColorBar(props: AssignmentColorBarParams) {
  const { data, assignmentColorMap, userColorPalette, userNames } = props;
  if (!data) return null;

  const recordId = data.id as string;
  const assignedUserIds = assignmentColorMap?.get(recordId) || [];

  if (assignedUserIds.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" title="All users (default)">
        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
      </div>
    );
  }

  const maxVisible = 3;
  const visible = assignedUserIds.slice(0, maxVisible);
  const overflow = assignedUserIds.length - maxVisible;

  const tooltip = assignedUserIds
    .map(id => userNames?.get(id) || 'Unknown')
    .join(', ');

  return (
    <div className="flex items-center justify-center gap-0.5 h-full" title={tooltip}>
      {visible.map(userId => (
        <div
          key={userId}
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: userColorPalette?.get(userId) || '#6b7280' }}
        />
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-muted-foreground ml-0.5">+{overflow}</span>
      )}
    </div>
  );
}
