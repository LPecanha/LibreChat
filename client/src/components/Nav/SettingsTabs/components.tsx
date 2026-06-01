import { cn } from '~/utils';
import type { ReactNode } from 'react';

/**
 * [EXT] Phase J.9 Navvia — primitives reusáveis das abas de Settings.
 * Bate com design/ui-preview.html linha 1237+ (rows do tab Geral):
 *
 *   <div class="flex items-center justify-between border-b border-border-light pb-2.5">
 *     <div><div>Label</div><div class="text-[11.5px] text-text-tertiary">Descrição</div></div>
 *     <Control />
 *   </div>
 *
 * <Row> agrupa label/control. <Segment> renderiza o 3-button segment
 * usado no Tema, Densidade, etc.
 */

export function Row({
  label,
  description,
  children,
  noBorder,
}: {
  label: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 pb-2.5',
        !noBorder && 'border-b border-border-light',
      )}
    >
      <div className="min-w-0">
        <div className="text-text-primary">{label}</div>
        {description && (
          <div className="text-[11.5px] text-text-tertiary">{description}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

type SegmentOption<T extends string> = { value: T; label: string };

export function Segment<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (next: T) => void;
  options: SegmentOption<T>[];
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-md bg-surface-tertiary p-0.5 text-[12.5px]"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded px-2.5 py-1 transition-colors',
              active
                ? 'bg-surface-primary font-medium text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-0 pt-1 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
      {children}
    </div>
  );
}

export function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-display text-[15px] font-semibold text-text-primary">
      {children}
    </h3>
  );
}
