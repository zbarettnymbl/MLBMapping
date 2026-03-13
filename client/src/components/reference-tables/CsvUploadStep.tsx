import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload } from 'lucide-react';
import type { ReferenceTableColumn } from '@mapforge/shared';

interface CsvUploadStepProps {
  onParsed: (result: { columns: ReferenceTableColumn[]; file: File; rowCount: number }) => void;
}

interface ParsedCsv {
  rawRows: string[][];
  file: File;
}

export function CsvUploadStep({ onParsed }: CsvUploadStepProps) {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [noHeaders, setNoHeaders] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rawRows = results.data;
        setParsed({ rawRows, file });
        setHeaderRowIndex(0);
        setNoHeaders(false);
        const headers = rawRows[0] || [];
        const columns: ReferenceTableColumn[] = headers.map((h, i) => ({
          key: h || `col_${i + 1}`,
          label: h || `Column ${i + 1}`,
          type: 'text' as const,
        }));
        onParsed({ columns, file, rowCount: rawRows.length - 1 });
      },
    });
  }, [onParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const selectHeaderRow = useCallback((index: number) => {
    if (!parsed) return;
    setHeaderRowIndex(index);
    setNoHeaders(false);
    const headers = parsed.rawRows[index] || [];
    const columns: ReferenceTableColumn[] = headers.map((h, i) => ({
      key: h || `col_${i + 1}`,
      label: h || `Column ${i + 1}`,
      type: 'text' as const,
    }));
    onParsed({ columns, file: parsed.file, rowCount: parsed.rawRows.length - 1 - index });
  }, [parsed, onParsed]);

  const toggleNoHeaders = useCallback(() => {
    if (!parsed) return;
    const newNoHeaders = !noHeaders;
    setNoHeaders(newNoHeaders);
    if (newNoHeaders) {
      const colCount = parsed.rawRows[0]?.length || 0;
      const columns: ReferenceTableColumn[] = Array.from({ length: colCount }, (_, i) => ({
        key: `col_${i + 1}`,
        label: `Column ${i + 1}`,
        type: 'text' as const,
      }));
      onParsed({ columns, file: parsed.file, rowCount: parsed.rawRows.length });
    } else {
      selectHeaderRow(headerRowIndex);
    }
  }, [parsed, noHeaders, headerRowIndex, onParsed, selectHeaderRow]);

  if (!parsed) {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-2">Drag and drop a CSV file, or click to browse</p>
        <label className="inline-block">
          <span className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 text-foreground border border-border rounded-md cursor-pointer transition-colors">
            Choose File
          </span>
          <input type="file" accept=".csv" onChange={handleInputChange} className="hidden" />
        </label>
      </div>
    );
  }

  const previewRows = parsed.rawRows.slice(0, 10);
  const effectiveHeaderIndex = noHeaders ? -1 : headerRowIndex;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {parsed.rawRows.length} rows parsed. Click a row to set it as the header.
        </p>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={noHeaders}
            onChange={toggleNoHeaders}
            className="rounded border-border"
          />
          No header row
        </label>
      </div>
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-xs">
          <tbody>
            {previewRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => !noHeaders && selectHeaderRow(rowIdx)}
                className={`cursor-pointer transition-colors ${
                  !noHeaders && rowIdx === effectiveHeaderIndex
                    ? 'bg-primary/15 text-primary font-semibold'
                    : rowIdx < effectiveHeaderIndex
                    ? 'bg-background/50 text-muted-foreground/50'
                    : 'hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <td className="px-2 py-1.5 text-muted-foreground/50 w-8 text-right">{rowIdx}</td>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-3 py-1.5 border-l border-muted whitespace-nowrap max-w-[200px] truncate">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={() => { setParsed(null); }}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        Choose a different file
      </button>
    </div>
  );
}
