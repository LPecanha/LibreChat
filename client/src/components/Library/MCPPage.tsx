import MCPBuilderPanel from '~/components/SidePanel/MCPBuilder/MCPBuilderPanel';
import { useLocalize } from '~/hooks';
import LibraryPageLayout from './PageLayout';

/**
 * [EXT] Phase J.14 Navvia — view-mcp.
 * Bate com design/ui-preview.html linha 943. max-w-4xl, h1 "Servidores MCP" +
 * subtítulo "Conecte ferramentas externas via Model Context Protocol." + grid
 * de cards de servidor. O MCPBuilderPanel já renderiza o grid de cards/lista.
 */
export default function MCPPage() {
  const localize = useLocalize();
  return (
    <LibraryPageLayout
      title={localize('com_nav_servers_mcp')}
      subtitle={localize('com_ui_mcp_subtitle')}
      maxWidth="max-w-4xl"
    >
      <MCPBuilderPanel />
    </LibraryPageLayout>
  );
}
