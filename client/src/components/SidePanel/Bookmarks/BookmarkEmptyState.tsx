import { Bookmark } from 'lucide-react';
import { useLocalize } from '~/hooks';

interface BookmarkEmptyStateProps {
  isFiltered?: boolean;
}

export default function BookmarkEmptyState({ isFiltered = false }: BookmarkEmptyStateProps) {
  const localize = useLocalize();

  /* [EXT] Phase I.9 Navvia: usar .empty do protótipo */
  return (
    <div className="empty">
      <span className="ic" aria-hidden="true">
        <Bookmark className="h-6 w-6" strokeWidth={1.7} />
      </span>
      {isFiltered ? (
        <p>{localize('com_ui_no_bookmarks_match')}</p>
      ) : (
        <>
          <h3>{localize('com_ui_no_bookmarks_title')}</h3>
          <p>{localize('com_ui_add_first_bookmark')}</p>
        </>
      )}
    </div>
  );
}
