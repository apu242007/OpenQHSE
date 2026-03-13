'use client';

import type { FieldComponentProps } from '@/types/forms';

export function SectionField({ field }: FieldComponentProps) {
  return (
    <div className="border-b border-border pb-2 pt-4">
      <h3 className="text-base font-bold text-foreground">{field.label}</h3>
      {field.description && <p className="mt-1 text-sm text-muted-foreground">{field.description}</p>}
    </div>
  );
}
