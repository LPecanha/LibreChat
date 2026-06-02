import BookmarkPanel from '~/components/SidePanel/Bookmarks/BookmarkPanel';
import { useLocalize } from '~/hooks';
import LibraryPageLayout from './PageLayout';

/**
 * [EXT] Phase J.14 Navvia — view-bookmarks.
 * Bate com design/ui-preview.html linha 928. max-w-3xl, h1 "Bookmarks" +
 * subtítulo "Tags para organizar e filtrar suas conversas." + CTA "Nova tag"
 * (já existe dentro do BookmarkPanel).
 */
export default function BookmarksPage() {
  const localize = useLocalize();
  return (
    <LibraryPageLayout
      title={localize('com_ui_bookmarks')}
      subtitle={localize('com_ui_bookmarks_subtitle')}
      maxWidth="max-w-3xl"
    >
      <BookmarkPanel />
    </LibraryPageLayout>
  );
}
