import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TMessageProps } from '~/common';

type TSiblingSwitchProps = Pick<TMessageProps, 'siblingIdx' | 'siblingCount' | 'setSiblingIdx'>;

export default function SiblingSwitch({
  siblingIdx,
  siblingCount,
  setSiblingIdx,
}: TSiblingSwitchProps) {
  if (siblingIdx === undefined) {
    return null;
  } else if (siblingCount === undefined) {
    return null;
  }

  const previous = () => {
    setSiblingIdx && setSiblingIdx(siblingIdx - 1);
  };

  const next = () => {
    setSiblingIdx && setSiblingIdx(siblingIdx + 1);
  };

  return siblingCount > 1 ? (
    /* [EXT] Phase E.10 Navvia: usar .sibling-nav do protótipo
     * (linhas 185-189) — compacto, btn 22x22, count tabular-nums com px-1.
     * Botões usam color text-tertiary; brand no hover via CSS .sibling-nav. */
    <nav
      className="sibling-nav visible self-center"
      aria-label="Sibling message navigation"
    >
      <button
        type="button"
        onClick={previous}
        disabled={siblingIdx == 0}
        aria-label="Previous sibling message"
        aria-disabled={siblingIdx == 0}
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span className="count" aria-live="polite" aria-atomic="true" role="status">
        {siblingIdx + 1} / {siblingCount}
      </span>
      <button
        type="button"
        onClick={next}
        disabled={siblingIdx == siblingCount - 1}
        aria-label="Next sibling message"
        aria-disabled={siblingIdx == siblingCount - 1}
      >
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </nav>
  ) : null;
}
