'use client';

import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';

export function TableField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const columns = field.columns ?? [];
  const rows = Array.isArray(value) ? (value as Record<string, string>[]) : [];

  const addRow = () => {
    const empty: Record<string, string> = {};
    columns.forEach((c) => { empty[c.id] = ''; });
    onChange([...rows, empty]);
  };

  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  const updateCell = (idx: number, colId: string, val: string) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [colId]: val };
    onChange(updated);
  };

  return (
    <FieldWrapper field={field} error={error}>
      <div className="space-y-2">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-8 p-2" />
                {columns.map((col) => (
                  <th key={col.id} className="p-2 text-left text-xs font-medium text-muted-foreground">{col.label}</th>
                ))}
                {!readOnly && <th className="w-10 p-2" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b border-border last:border-0">
                  <td className="p-2 text-center text-xs text-muted-foreground">{idx + 1}</td>
                  {columns.map((col) => (
                    <td key={col.id} className="p-1">
                      <input
                        type="text"
                        value={row[col.id] ?? ''}
                        onChange={(e) => updateCell(idx, col.id, e.target.value)}
                        disabled={disabled}
                        readOnly={readOnly}
                        placeholder={col.label}
                        className="w-full rounded border-0 bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                  ))}
                  {!readOnly && (
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => removeRow(idx)} title="Eliminar fila" className="text-muted-foreground hover:text-danger">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={columns.length + 2} className="p-4 text-center text-xs text-muted-foreground">Sin filas</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {!readOnly && (
          <button type="button" onClick={addRow} disabled={disabled} className="flex items-center gap-1 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Agregar fila
          </button>
        )}
      </div>
    </FieldWrapper>
  );
}
