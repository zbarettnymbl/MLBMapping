// client/src/components/grid/RowStatusRenderer.tsx
import { forwardRef } from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import { Circle, Check, Minus, AlertTriangle, XCircle } from 'lucide-react';
import type { EnrichmentRecord } from '@mapforge/shared/types';

interface RowStatusRendererProps extends ICellRendererParams {
  data: EnrichmentRecord;
}

export const RowStatusRenderer = forwardRef<HTMLDivElement, RowStatusRendererProps>(
  function RowStatusRenderer(props, ref) {
    const record = props.data;
    if (!record) return null;

    const hasErrors = record.validationErrors.length > 0;

    let icon: React.ReactNode;
    let tooltip: string;

    if (hasErrors) {
      icon = <XCircle size={16} className="text-status-error" />;
      tooltip = `${record.validationErrors.length} validation error(s)`;
    } else if (record.recordState === 'new') {
      icon = <Circle size={16} className="text-cyan-400 fill-cyan-400" />;
      tooltip = 'New record';
    } else if (record.recordState === 'changed') {
      icon = <AlertTriangle size={16} className="text-amber-400" />;
      tooltip = 'Source data changed since last classification';
    } else if (record.isFullyClassified) {
      icon = <Check size={16} className="text-status-clean" />;
      tooltip = 'Fully classified';
    } else {
      icon = <Minus size={16} className="text-muted-foreground" />;
      tooltip = 'Unclassified';
    }

    return (
      <div
        ref={ref}
        className={['flex items-center justify-center w-full h-full'].join(' ')}
        title={tooltip}
      >
        {icon}
      </div>
    );
  }
);
