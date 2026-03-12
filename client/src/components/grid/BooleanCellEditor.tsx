// client/src/components/grid/BooleanCellEditor.tsx
import { forwardRef, useImperativeHandle, useState } from 'react';
import type { ICellEditorParams } from 'ag-grid-community';

export const BooleanCellEditor = forwardRef<unknown, ICellEditorParams>(
  function BooleanCellEditor(props, ref) {
    const { value: initialValue, stopEditing } = props;
    const isTrue = initialValue === 'true' || initialValue === true;
    const [value] = useState(!isTrue); // Toggle immediately on edit start

    useImperativeHandle(ref, () => ({
      getValue: () => String(value),
    }));

    // Immediately stop editing after toggle
    setTimeout(() => stopEditing(), 0);

    return null; // No visible editor -- toggle happens instantly
  }
);
