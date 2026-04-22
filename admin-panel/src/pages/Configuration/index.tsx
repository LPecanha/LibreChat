import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings2, Plus, Trash2, X, ChevronDown, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  fetchBaseConfig, fetchAllConfigs,
  upsertScopeConfig, deleteScopeConfig, toggleScopeActive,
  fetchUsers, fetchGroups, fetchRoles,
} from '~/lib/api';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';
import { toast } from '~/hooks/useToast';
import type { ConfigScope, AdminGroup, AdminRole, AdminUserItem } from '~/lib/api';

// ── Shared Primitives ─────────────────────────────────────────────────────────

function Dialog({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-xl bg-card border border-border p-6 shadow-2xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-text-primary"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Base Config Viewer ─────────────────────────────────────────────────────────

function JsonSection({ label, value }: { label: string; value: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-secondary hover:bg-surface-hover text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <pre className="p-3 text-xs overflow-x-auto bg-surface-secondary/30 text-text-secondary max-h-96">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}

function BaseConfigPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['config', 'base'],
    queryFn: fetchBaseConfig,
  });

  if (isLoading) return <Skeleton className="h-40 rounded-lg" />;

  const config = data?.config ?? {};
  const keys = Object.keys(config);

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="mb-3 font-medium text-sm">Configuração Base</h2>
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma configuração disponível</p>
        ) : (
          <div className="flex flex-col gap-2">
            {keys.map((k) => (
              <JsonSection key={k} label={k} value={config[k]} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Principal Type Label ──────────────────────────────────────────────────────

function PrincipalTypeLabel({ type }: { type: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    user: { label: 'Usuário', variant: 'default' },
    role: { label: 'Papel', variant: 'secondary' },
    group: { label: 'Grupo', variant: 'outline' },
  };
  const info = map[type] ?? { label: type, variant: 'outline' as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

// ── Scope Form Dialog ─────────────────────────────────────────────────────────

type PrincipalOption = { id: string; name: string; type: 'user' | 'role' | 'group' };

function ScopeFormDialog({
  onClose,
  users,
  groups,
  roles,
  existing,
}: {
  onClose: () => void;
  users: AdminUserItem[];
  groups: AdminGroup[];
  roles: AdminRole[];
  existing?: ConfigScope;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PrincipalOption | null>(
    existing ? { id: existing.principalId, name: existing.principalId, type: existing.principalType as PrincipalOption['type'] } : null,
  );
  const [priority, setPriority] = useState(existing?.priority ?? 50);
  const [json, setJson] = useState(existing ? JSON.stringify(existing.overrides, null, 2) : '{}');
  const [jsonError, setJsonError] = useState('');

  const allPrincipals = useMemo<PrincipalOption[]>(() => [
    ...users.map((u) => ({ id: u.id, name: u.name ?? u.email ?? u.id, type: 'user' as const })),
    ...groups.map((g) => ({ id: g.id, name: g.name, type: 'group' as const })),
    ...roles.map((r) => ({ id: r.id, name: r.name, type: 'role' as const })),
  ], [users, groups, roles]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? allPrincipals.filter((p) => p.name.toLowerCase().includes(q)) : allPrincipals.slice(0, 20);
  }, [allPrincipals, search]);

  const mut = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Selecione um principal');
      let overrides: Record<string, unknown>;
      try {
        overrides = JSON.parse(json) as Record<string, unknown>;
      } catch {
        throw new Error('JSON inválido');
      }
      return upsertScopeConfig(selected.type, selected.id, { overrides, priority });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configs'] });
      toast({ title: existing ? 'Escopo atualizado' : 'Escopo criado' });
      onClose();
    },
    onError: (e: Error) => {
      if (e.message === 'JSON inválido') setJsonError(e.message);
      else toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog title={existing ? 'Editar escopo' : 'Novo escopo'} onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        {!existing && (
          <div>
            <label className="mb-1 block text-sm font-medium">Principal</label>
            <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border">
              {filtered.map((p) => (
                <button
                  key={`${p.type}:${p.id}`}
                  onClick={() => { setSelected(p); setSearch(p.name); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface-hover ${selected?.id === p.id ? 'bg-surface-active' : ''}`}
                >
                  <PrincipalTypeLabel type={p.type} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Prioridade</label>
          <input
            type="number"
            min={0}
            max={1000}
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">Maior prioridade sobrepõe escopos com valor menor</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Overrides (JSON)</label>
          <textarea
            value={json}
            onChange={(e) => { setJson(e.target.value); setJsonError(''); }}
            rows={10}
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-xs font-mono resize-y"
            spellCheck={false}
          />
          {jsonError && <p className="mt-1 text-xs text-destructive">{jsonError}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!selected || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ── Scope Card ────────────────────────────────────────────────────────────────

function ScopeCard({
  scope,
  nameMap,
  users,
  groups,
  roles,
}: {
  scope: ConfigScope;
  nameMap: Map<string, string>;
  users: AdminUserItem[];
  groups: AdminGroup[];
  roles: AdminRole[];
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);

  const deleteMut = useMutation({
    mutationFn: () => deleteScopeConfig(scope.principalType, scope.principalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configs'] });
      toast({ title: 'Escopo removido' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const toggleMut = useMutation({
    mutationFn: (active: boolean) => toggleScopeActive(scope.principalType, scope.principalId, active),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['configs'] }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const name = nameMap.get(scope.principalId) ?? scope.principalId;
  const keyCount = Object.keys(scope.overrides).length;

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PrincipalTypeLabel type={scope.principalType} />
              <span className="font-medium text-sm">{name}</span>
              <span className="text-xs text-muted-foreground">p={scope.priority}</span>
              {scope.isActive === false && <Badge variant="outline" className="text-xs">inativo</Badge>}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleMut.mutate(!(scope.isActive !== false))}
                className="text-muted-foreground hover:text-text-primary p-1"
                title="Ativar/desativar"
              >
                {scope.isActive !== false
                  ? <ToggleRight className="h-4 w-4 text-green-500" />
                  : <ToggleLeft className="h-4 w-4" />}
              </button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Editar</Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <button
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-text-primary"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {keyCount} {keyCount === 1 ? 'campo' : 'campos'}
          </button>

          {open && (
            <pre className="mt-2 p-2 rounded bg-surface-secondary/30 text-xs overflow-x-auto max-h-48 text-text-secondary">
              {JSON.stringify(scope.overrides, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      {editing && (
        <ScopeFormDialog
          onClose={() => setEditing(false)}
          users={users}
          groups={groups}
          roles={roles}
          existing={scope}
        />
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function Configuration() {
  const [adding, setAdding] = useState(false);
  const qc = useQueryClient();

  const { data: configsData, isLoading } = useQuery({
    queryKey: ['configs'],
    queryFn: fetchAllConfigs,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => fetchUsers({ limit: 500 }),
  });

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => fetchGroups(),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => fetchRoles(),
  });

  const users = usersData?.users ?? [];
  const groups = groupsData?.groups ?? [];
  const roles = rolesData?.roles ?? [];

  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users) m.set(u.id, u.name ?? u.email ?? u.id);
    for (const g of groups) m.set(g.id, g.name);
    for (const r of roles) m.set(r.id, r.name);
    return m;
  }, [users, groups, roles]);

  const scopes = configsData?.configs ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Configuração</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configuração base e escopos por principal</p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo escopo
        </Button>
      </div>

      <BaseConfigPanel />

      <div>
        <h2 className="mb-3 text-sm font-medium text-text-primary">Escopos</h2>

        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        )}

        {!isLoading && scopes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Settings2 className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum escopo configurado</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {scopes.map((scope) => (
            <ScopeCard
              key={`${scope.principalType}:${scope.principalId}`}
              scope={scope}
              nameMap={nameMap}
              users={users}
              groups={groups}
              roles={roles}
            />
          ))}
        </div>
      </div>

      {adding && (
        <ScopeFormDialog
          onClose={() => setAdding(false)}
          users={users}
          groups={groups}
          roles={roles}
        />
      )}
    </div>
  );
}
