import { FileSources, FileContext } from 'librechat-data-provider';
import type { TFile } from 'librechat-data-provider';
import { useGetFiles } from '~/data-provider';
import { DataTable, columns } from '~/components/Chat/Input/Files/Table';
import { useLocalize } from '~/hooks';
import LibraryPageLayout from './PageLayout';

/**
 * [EXT] Phase J.14 Navvia — view-files.
 * Bate com design/ui-preview.html linha 907. max-w-5xl, h1 "Arquivos" +
 * subtítulo "Documentos enviados e bases de conhecimento (vector stores)." +
 * tabela de arquivos. O mesmo DataTable do MyFilesModal, sem o wrapper Dialog.
 */
export default function FilesPage() {
  const localize = useLocalize();
  const { data: files = [] } = useGetFiles<TFile[]>({
    select: (files) =>
      files.map((file) => {
        file.context = file.context ?? FileContext.unknown;
        file.filterSource = file.source === FileSources.firebase ? FileSources.local : file.source;
        return file;
      }),
  });

  return (
    <LibraryPageLayout
      title={localize('com_nav_my_files')}
      subtitle={localize('com_ui_files_subtitle')}
      maxWidth="max-w-5xl"
    >
      <DataTable columns={columns} data={files} />
    </LibraryPageLayout>
  );
}
