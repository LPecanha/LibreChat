import { useState, useRef, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { Spinner, FilterInput, MCPIcon } from '@librechat/client';
import { useLocalize, useMCPServerManager, useHasAccess } from '~/hooks';
import MCPConfigDialog from '~/components/MCP/MCPConfigDialog';
import MCPServerDialog from '~/components/SidePanel/MCPBuilder/MCPServerDialog';
import { getStatusDotColor } from '~/components/SidePanel/MCPBuilder/MCPStatusBadge';
import type { MCPServerDefinition } from '~/hooks';
import { cn } from '~/utils';
import LibraryPageLayout from './PageLayout';

/**
 * [EXT] Phase J.17 Navvia — view-mcp.
 * Code-vs-code com design/ui-preview.html linhas 943-956:
 *
 *   <section view-mcp max-w-4xl px-6 py-10>
 *     <header h1 "Servidores MCP" + sub + CTA "+ Adicionar servidor" bg-brand>
 *     <grid 1 col sm:2 gap-3 mt-5>
 *       <card rounded-lg border bg-surface-secondary p-4>
 *         <row: status-dot + nome + transport-badge>
 *         <p: descrição (text-tertiary OU text-warning/destructive baseado em status)>
 *         <row: [Configurar flex-1 border] [Testar px-2.5 border]>
 *           OU [Conectar flex-1 bg-brand] [Testar border]  -- quando precisa auth
 *       </card>
 *     </grid>
 *
 * Substitui a versão anterior que usava MCPBuilderPanel inteiro (lista
 * vertical com filter input genérico). Reusa hooks/data layers
 * (useMCPServerManager, MCPConfigDialog, MCPServerDialog) — só o markup
 * do grid e dos cards é refeito.
 */

function getTransportBadge(server: MCPServerDefinition): string {
  /* Tipos de transporte conhecidos: stdio | sse | http | websocket */
  const t = server.config?.type ?? 'stdio';
  const map: Record<string, string> = {
    stdio: 'stdio',
    sse: 'SSE',
    http: 'HTTP',
    streamable_http: 'HTTP',
    websocket: 'WS',
  };
  return map[t] ?? t.toUpperCase();
}

function NavviaMCPCard({
  server,
  canEdit,
}: {
  server: MCPServerDefinition;
  canEdit: boolean;
}) {
  const localize = useLocalize();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const editTriggerRef = useRef<HTMLDivElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { initializeServer, getServerStatusIconProps } = useMCPServerManager();

  const statusIconProps = getServerStatusIconProps(server.serverName);
  const { serverStatus, isInitializing, hasCustomUserVars = false, onConfigClick } = statusIconProps;

  const displayName = server.config?.title || server.serverName;
  const description = server.config?.description;
  const statusDotColor = getStatusDotColor(serverStatus, isInitializing);
  const transport = getTransportBadge(server);

  const connectionState = serverStatus?.connectionState;
  const needsAuth = connectionState === 'disconnected' && serverStatus?.requiresOAuth;
  const hasError = connectionState === 'error';

  const handleConnect = () => {
    if (hasCustomUserVars && connectionState !== 'connected') {
      onConfigClick({ stopPropagation: () => {}, preventDefault: () => {} } as React.MouseEvent);
      return;
    }
    initializeServer(server.serverName);
  };

  return (
    <>
      <div className="rounded-lg border border-border-light bg-surface-secondary p-4">
        <div className="flex items-center gap-2">
          <span
            className={cn('h-2 w-2 shrink-0 rounded-full', statusDotColor, isInitializing && 'animate-pulse')}
            aria-hidden="true"
          />
          <span className="truncate font-medium text-text-primary">{displayName}</span>
          <span className="ml-auto rounded bg-surface-active px-1.5 py-0.5 text-[10px] uppercase text-text-tertiary">
            {transport}
          </span>
        </div>
        <p
          className={cn(
            'mt-2 line-clamp-2 text-[12px]',
            hasError && 'text-text-destructive',
            needsAuth && !hasError && 'text-text-warning',
            !hasError && !needsAuth && 'text-text-tertiary',
          )}
        >
          {hasError
            ? localize('com_nav_mcp_status_error')
            : needsAuth
              ? localize('com_nav_mcp_status_needs_auth')
              : description || ''}
        </p>
        <div className="mt-3 flex gap-1.5">
          <button
            ref={triggerRef}
            type="button"
            onClick={handleConnect}
            className={cn(
              'flex h-8 flex-1 items-center justify-center rounded-md px-3 text-[12px] font-medium transition-colors',
              needsAuth || hasError
                ? 'bg-brand text-brand-fg hover:opacity-90'
                : 'border border-border-medium text-text-primary hover:bg-surface-hover',
            )}
          >
            {needsAuth || hasError
              ? localize('com_ui_connect')
              : localize('com_ui_configure')}
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="flex h-8 items-center justify-center rounded-md border border-border-medium px-2.5 text-[12px] text-text-primary transition-colors hover:bg-surface-hover"
            >
              {localize('com_ui_edit')}
            </button>
          )}
        </div>
      </div>
      {canEdit && (
        <MCPServerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          triggerRef={editTriggerRef}
          server={server}
        />
      )}
    </>
  );
}

export default function MCPPage() {
  const localize = useLocalize();
  const { availableMCPServers, isLoading, getConfigDialogProps } = useMCPServerManager();
  const hasCreateAccess = useHasAccess({
    permissionType: PermissionTypes.MCP_SERVERS,
    permission: Permissions.CREATE,
  });
  const [showDialog, setShowDialog] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const configDialogProps = getConfigDialogProps();

  const filteredServers = useMemo(() => {
    if (!searchQuery.trim()) return availableMCPServers;
    const q = searchQuery.toLowerCase();
    return availableMCPServers.filter((s) => {
      const n = s.config?.title || s.serverName;
      return n.toLowerCase().includes(q) || s.serverName.toLowerCase().includes(q);
    });
  }, [availableMCPServers, searchQuery]);

  const addServerCta = hasCreateAccess && (
    <>
      <MCPServerDialog open={showDialog} onOpenChange={setShowDialog} triggerRef={addButtonRef}>
        <button
          ref={addButtonRef}
          type="button"
          onClick={() => setShowDialog(true)}
          className="flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-[13px] font-medium text-brand-fg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <Plus className="h-[15px] w-[15px]" strokeWidth={2} />
          {localize('com_ui_add_mcp')}
        </button>
      </MCPServerDialog>
    </>
  );

  return (
    <LibraryPageLayout
      title={localize('com_nav_servers_mcp')}
      subtitle={localize('com_ui_mcp_subtitle')}
      action={addServerCta}
      maxWidth="max-w-4xl"
    >
      {availableMCPServers.length > 1 && (
        <FilterInput
          inputId="mcp-filter"
          label={localize('com_ui_filter_mcp_servers')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          containerClassName="mb-4"
        />
      )}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Spinner className="size-6" aria-label={localize('com_ui_loading')} />
        </div>
      ) : filteredServers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-medium bg-surface-secondary p-10 text-center">
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-surface-active">
            <MCPIcon className="size-5 text-text-secondary" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-text-primary">
            {searchQuery
              ? localize('com_ui_no_mcp_servers_match')
              : localize('com_ui_no_mcp_servers')}
          </p>
          {!searchQuery && (
            <p className="mt-0.5 text-xs text-text-tertiary">
              {localize('com_ui_add_first_mcp_server')}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredServers.map((server) => (
            <NavviaMCPCard
              key={server.serverName}
              server={server}
              canEdit={hasCreateAccess}
            />
          ))}
        </div>
      )}
      {configDialogProps && <MCPConfigDialog {...configDialogProps} />}
    </LibraryPageLayout>
  );
}
