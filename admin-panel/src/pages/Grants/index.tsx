import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Plus, Trash2, X, Search, ChevronDown, ChevronRight } from 'lucide-react';
import {
  fetchAllGrants, createGrant, revokeGrant,
  fetchUsers, fetchGroups, fetchRoles,
} from '~/lib/api';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';
import { toast } from '~/hooks/useToast';
import { CAPABILITY_LABELS, CAPABILITY_CATEGORIES, SystemCapabilities } from '~/lib/constants';
import type { SystemGrant, AdminGroup, AdminRole, AdminUserItem } from '~/lib/api';

type SystemCapabilityValue = (typeof SystemCapabilities)[keyof typeof SystemCapabilities];

// ── Shared Primitives ─────────────────────────────────────────────────────────

function Dialog({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-xl bg-card border border-border p-6 shadow-2xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-text-primary"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Capabilities Editor ────────────────────────────────────────────────────────

function CapabilitySection({
  category,
  caps,
  grantedSet,
  onToggle,
  loading,
}: {
  category: string;
  caps: SystemCapabilityValue[];
  grantedSet: Set<string>;
  onToggle: (cap: string, granted: boolean) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-secondary hover:bg-surface-hover text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        {category}
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="divide-y divide-border">
          {caps.map((cap) => {
            const isGranted = grantedSet.has(cap);
            return (
              <label key={cap} className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-surface-hover">
                <span className="text-text-secondary">{CAPABILITY_LABELS[cap] ?? cap}</span>
                <input
                  type="checkbox"
                  checked={isGranted}
                  disabled={loading}
                  onChange={() => onToggle(cap, isGranted)}
                  className="h-4 w-4 cursor-pointer"
                />
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GrantsEditor({
  principalType,
  principalId,
  principalName,
  grants,
  onClose,
}: {
  principalType: string;
  principalId: string;
  principalName: string;
  grants: SystemGrant[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const grantedSet = useMemo(() => new Set(grants.map((g) => g.capability)), [grants]);

  const grantMut = useMutation({
    mutationFn: (cap: string) => createGrant({ principalType, principalId, capability: cap }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grants'] }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const revokeMut = useMutation({
    mutationFn: (cap: string) => revokeGrant(principalType, principalId, cap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grants'] }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const loading = grantMut.isPending || revokeMut.isPending;

  function handleToggle(cap: string, wasGranted: boolean) {
    if (wasGranted) revokeMut.mutate(cap);
    else grantMut.mutate(cap);
  }

  return (
    <Dialog title={`Capacidades — ${principalName}`} onClose={onClose} wide>
      <div className="flex flex-col gap-2">
        {CAPABILITY_CATEGORIES.map(({ label, caps }) => (
          <CapabilitySection
            key={label}
            category={label}
            caps={caps as SystemCapabilityValue[]}
            grantedSet={grantedSet}
            onToggle={handleToggle}
            loading={loading}
          />
        ))}
      </div>
    </Dialog>
  );
}

// ── Grant Row ─────────────────────────────────────────────────────────────────

function PrincipalTypeLabel({ type }: { type: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    user: { label: 'Usuário', variant: 'default' },
    role: { label: 'Papel', variant: 'secondary' },
    group: { label: 'Grupo', variant: 'outline' },
  };
  const info = map[type] ?? { label: type, variant: 'outline' as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

// ── Add Grant Dialog ──────────────────────────────────────────────────────────

type PrincipalOption = { id: string; name: string; type: 'user' | 'role' | 'group' };

function AddGrantDialog({
  onClose,
  users,
  groups,
  roles,
}: {
  onClose: () => void;
  users: AdminUserItem[];
  groups: AdminGroup[];
  roles: AdminRole[];
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PrincipalOption | null>(null);
  const [capability, setCapability] = useState<string>('');

  const allPrincipals = useMemo<PrincipalOption[]>(() => [
    ...users.map((u) => ({ id: u.id, name: u.name ?? u.email ?? u.id, type: 'user' as const })),
    ...groups.map((g) => ({ id: g.id, name: g.name, type: 'group' as const })),
    ...roles.map((r) => ({ id: r.id, name: r.name, type: 'role' as const })),
  ], [users, groups, roles]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? allPrincipals.filter((p) => p.name.toLowerCase().includes(q)) : allPrincipals.slice(0, 20);
  }, [allPrincipals, search]);

  const grantMut = useMutation({
    mutationFn: () => {
      if (!selected || !capability) throw new Error('Selecione principal e capacidade');
      return createGrant({ principalType: selected.type, principalId: selected.id, capability });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grants'] });
      toast({ title: 'Permissão concedida' });
      onClose();
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const allCaps = Object.values(SystemCapabilities);

  return (
    <Dialog title="Adicionar permissão" onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Buscar principal</label>
          <Input placeholder="Nome ou email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-border">
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

        <div>
          <label className="mb-1 block text-sm font-medium">Capacidade</label>
          <select
            value={capability}
            onChange={(e) => setCapability(e.target.value)}
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
          >
            <option value="">Selecione…</option>
            {allCaps.map((cap) => (
              <option key={cap} value={cap}>{CAPABILITY_LABELS[cap] ?? cap}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!selected || !capability || grantMut.isPending} onClick={() => grantMut.mutate()}>
            {grantMut.isPending ? 'Salvando…' : 'Conceder'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ── Principal Grants Card ─────────────────────────────────────────────────────

function PrincipalCard({
  principalType,
  principalId,
  principalName,
  grants,
  nameMap,
}: {
  principalType: string;
  principalId: string;
  principalName: string;
  grants: SystemGrant[];
  nameMap: Map<string, string>;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <PrincipalTypeLabel type={principalType} />
              <span className="font-medium text-sm">{nameMap.get(principalId) ?? principalName}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <ShieldCheck className="h-4 w-4 mr-1" /> Editar
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {grants.map((g) => (
              <Badge key={g.capability} variant="secondary" className="text-xs">
                {CAPABILITY_LABELS[g.capability] ?? g.capability}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {editing && (
        <GrantsEditor
          principalType={principalType}
          principalId={principalId}
          principalName={nameMap.get(principalId) ?? principalName}
          grants={grants}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function Grants() {
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const qc = useQueryClient();

  const { data: grantsData, isLoading: grantsLoading } = useQuery({
    queryKey: ['grants'],
    queryFn: fetchAllGrants,
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

  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of usersData?.users ?? []) m.set(u.id, u.name ?? u.email ?? u.id);
    for (const g of groupsData?.groups ?? []) m.set(g.id, g.name);
    for (const r of rolesData?.roles ?? []) m.set(r.id, r.name);
    return m;
  }, [usersData, groupsData, rolesData]);

  const revokeMut = useMutation({
    mutationFn: ({ principalType, principalId, capability }: { principalType: string; principalId: string; capability: string }) =>
      revokeGrant(principalType, principalId, capability),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grants'] });
      toast({ title: 'Permissão removida' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const grouped = useMemo(() => {
    const grants = grantsData?.grants ?? [];
    const q = search.toLowerCase();
    const map = new Map<string, { principalType: string; principalId: string; grants: SystemGrant[] }>();
    for (const g of grants) {
      const key = `${g.principalType}:${g.principalId}`;
      const name = nameMap.get(g.principalId) ?? g.principalId;
      if (q && !name.toLowerCase().includes(q) && !g.capability.toLowerCase().includes(q)) continue;
      if (!map.has(key)) map.set(key, { principalType: g.principalType, principalId: g.principalId, grants: [] });
      map.get(key)!.grants.push(g);
    }
    return [...map.values()];
  }, [grantsData, search, nameMap]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Permissões</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Capacidades administrativas por usuário, papel ou grupo</p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Filtrar por nome ou capacidade…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {grantsLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      )}

      {!grantsLoading && grouped.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldCheck className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma permissão encontrada</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {grouped.map((entry) => (
          <PrincipalCard
            key={`${entry.principalType}:${entry.principalId}`}
            principalType={entry.principalType}
            principalId={entry.principalId}
            principalName={entry.principalId}
            grants={entry.grants}
            nameMap={nameMap}
          />
        ))}
      </div>

      {adding && (
        <AddGrantDialog
          onClose={() => setAdding(false)}
          users={usersData?.users ?? []}
          groups={groupsData?.groups ?? []}
          roles={rolesData?.roles ?? []}
        />
      )}
    </div>
  );
}
