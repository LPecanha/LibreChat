import { Brain } from 'lucide-react';
import { useLocalize } from '~/hooks';

interface MemoryEmptyStateProps {
  isFiltered?: boolean;
}

export default function MemoryEmptyState({ isFiltered = false }: MemoryEmptyStateProps) {
  const localize = useLocalize();

  /* [EXT] Phase I.6 Navvia: usar .empty do protótipo */
  return (
    <div className="empty">
      <span className="ic" aria-hidden="true">
        <Brain className="h-6 w-6" strokeWidth={1.7} />
      </span>
      {isFiltered ? (
        <p>{localize('com_ui_no_memories_match')}</p>
      ) : (
        <>
          <h3>{localize('com_ui_no_memories_title')}</h3>
          <p>{localize('com_ui_no_memories')}</p>
        </>
      )}
    </div>
  );
}
