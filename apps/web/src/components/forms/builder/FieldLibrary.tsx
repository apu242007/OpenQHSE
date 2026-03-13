'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { FIELD_TYPE_CATALOG, type FieldTypeInfo, type FieldType } from '@/types/forms';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { key: 'basic', label: 'Básicos', icon: 'Type' },
  { key: 'multimedia', label: 'Multimedia', icon: 'Camera' },
  { key: 'safety', label: 'Seguridad', icon: 'ShieldAlert' },
  { key: 'advanced', label: 'Avanzados', icon: 'Puzzle' },
] as const;

interface FieldLibraryProps {
  onAddField: (type: FieldType, sectionId: string) => void;
  activeSectionId: string | null;
}

export function FieldLibrary({ onAddField, activeSectionId }: FieldLibraryProps) {
  const [search, setSearch] = useState('');
  const [expandedCat, setExpandedCat] = useState<string>('basic');

  const filtered = FIELD_TYPE_CATALOG.filter(
    (f) =>
      f.label.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase()),
  );

  const getIcon = (name: string) => {
    const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Campos
        </h3>
        <div className="relative">
          <Icons.Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar campo..."
            className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {search ? (
          <div className="space-y-1">
            {filtered.map((field) => (
              <FieldLibraryItem
                key={field.type}
                field={field}
                getIcon={getIcon}
                onClick={() => activeSectionId && onAddField(field.type, activeSectionId)}
                disabled={!activeSectionId}
              />
            ))}
            {filtered.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">Sin resultados</p>
            )}
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const items = FIELD_TYPE_CATALOG.filter((f) => f.category === cat.key);
            const isExpanded = expandedCat === cat.key;
            return (
              <div key={cat.key} className="mb-1">
                <button
                  type="button"
                  onClick={() => setExpandedCat(isExpanded ? '' : cat.key)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  <Icons.ChevronRight
                    className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-90')}
                  />
                  {getIcon(cat.icon)}
                  {cat.label}
                  <span className="ml-auto text-[10px] text-muted-foreground/60">{items.length}</span>
                </button>
                {isExpanded && (
                  <div className="ml-2 mt-1 space-y-0.5">
                    {items.map((field) => (
                      <FieldLibraryItem
                        key={field.type}
                        field={field}
                        getIcon={getIcon}
                        onClick={() => activeSectionId && onAddField(field.type, activeSectionId)}
                        disabled={!activeSectionId}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function FieldLibraryItem({
  field,
  getIcon,
  onClick,
  disabled,
}: {
  field: FieldTypeInfo;
  getIcon: (name: string) => React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('field-type', field.type);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors',
        'border border-transparent hover:border-primary/30 hover:bg-primary/5',
        'cursor-grab active:cursor-grabbing',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {getIcon(field.icon)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{field.label}</p>
        <p className="truncate text-[10px] text-muted-foreground">{field.description}</p>
      </div>
    </button>
  );
}
