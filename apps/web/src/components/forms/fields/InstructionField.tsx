'use client';

import { Info } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';

export function InstructionField({ field }: FieldComponentProps) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
      <div className="flex gap-3">
        <Info className="h-5 w-5 flex-shrink-0 text-blue-500" />
        <div className="space-y-1">
          {field.label && <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{field.label}</p>}
          {field.description && (
            <div className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{field.description}</div>
          )}
        </div>
      </div>
    </div>
  );
}
