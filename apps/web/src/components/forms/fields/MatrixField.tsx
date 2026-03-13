'use client';

import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';
import { cn } from '@/lib/utils';

export function MatrixField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const columns = field.columns ?? [];
  const rows = field.rows ?? [];
  const data = (value as Record<string, string>) ?? {};

  const handleChange = (rowId: string, colId: string) => {
    if (disabled || readOnly) return;
    onChange({ ...data, [rowId]: colId });
  };

  return (
    <FieldWrapper field={field} error={error}>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="p-3 text-left font-medium text-muted-foreground" />
              {columns.map((col) => (
                <th key={col.id} className="p-3 text-center font-medium text-muted-foreground">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className={cn('border-b border-border last:border-0', idx % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
                <td className="p-3 font-medium">{row.label}</td>
                {columns.map((col) => (
                  <td key={col.id} className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleChange(row.id, col.id)}
                      disabled={disabled || readOnly}
                      className={cn(
                        'mx-auto flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
                        data[row.id] === col.id
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/30 hover:border-primary/50'
                      )}
                    >
                      {data[row.id] === col.id && <span className="h-2 w-2 rounded-full bg-white" />}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FieldWrapper>
  );
}
