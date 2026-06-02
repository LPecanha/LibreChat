import { MemoryPanel } from '~/components/SidePanel/Memories';
import { useLocalize } from '~/hooks';
import LibraryPageLayout from './PageLayout';

/**
 * [EXT] Phase J.14 Navvia — view-memories.
 * Bate com design/ui-preview.html linha 887. Header h1 "Memórias" + subtítulo
 * "O que a IA lembra sobre você entre conversas." + CTA "+ Nova memória".
 * O CTA do MemoryPanel é o próprio botão "+" interno; aqui o layout só fornece
 * o cabeçalho do protótipo. max-w-4xl.
 */
export default function MemoriesPage() {
  const localize = useLocalize();
  return (
    <LibraryPageLayout
      title={localize('com_ui_memories')}
      subtitle={localize('com_ui_memories_subtitle')}
      maxWidth="max-w-4xl"
    >
      <MemoryPanel />
    </LibraryPageLayout>
  );
}
