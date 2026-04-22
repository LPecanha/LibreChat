import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Shield, Plus, Pencil, Trash2, X, UserPlus, UserMinus, ChevronDown, ChevronRight } from 'lucide-react';
import {
  fetchGroups, createGroup, updateGroup, deleteGroup,
  fetchGroupMembers, addGroupMember, removeGroupMember,
  fetchRoles, createRole, updateRole, deleteRole, fetchRole,
  updateRolePermissions, fetchRoleMembers, addRoleMember, removeRoleMember,
  fetchUsers, searchUsers,
} from '~/lib/api';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';
import { toast } from '~/hooks/useToast';
import {
  PERMISSION_TYPES, PERMISSION_TYPE_SCHEMA, PERMISSION_TYPE_LABELS,
  PERMISSION_LABELS, defaultPermissions, SYSTEM_ROLE_NAMES,
} from '~/lib/constants';
import type { AdminGroup, AdminRole, GroupMember } from '~/lib/api';

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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-text-primary">{label}</label>
      {children}
    </div>
  );
}

function ConfirmDialog({ title, description, onConfirm, onCancel, loading }: {
  title: string; description: string; onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  return (
    <Dialog title={title} onClose={onCancel}>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button variant="destructive" size="sm" disabled={loading} onClick={onConfirm}>
          {loading ? 'Excluindo…' : 'Excluir'}
        </Button>
      </div>
    </Dialog>
  );
}

// ── Member Picker ─────────────────────────────────────────────────────────────

function MemberPicker({ existingIds, onAdd, onClose }: {
  existingIds: string[];
  onAdd: (userId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');

  const { data: allData } = useQuery({ queryKey: ['users', 'list'], queryFn: () => fetchUsers({ limit: 200 }) });
  const { data: searchData } = useQuery({ queryKey: ['users', 'search', q], queryFn: () => searchUsers(q), enabled: q.length >= 2 });

  const users = q.length >= 2 ? (searchData?.users ?? []) : (allData?.users ?? []);
  const available = users.filter((u) => !existingIds.includes(u.id));

  return (
    <Dialog title="Adicionar membro" onClose={onClose}>
      <div className="space-y-3">
        <Input placeholder="Buscar usuário…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
          {available.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum usuário disponível</p>}
          {available.map((u) => (
            <button key={u.id} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-hover" onClick={() => { onAdd(u.id); onClose(); }}>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{u.name.charAt(0).toUpperCase()}</div>
              <div>
                <p className="text-sm text-text-primary">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button></div>
      </div>
    </Dialog>
  );
}

// ── Role Permissions Panel ────────────────────────────────────────────────────

function RolePermissionsPanel({ permissions, onChange, disabled }: {
  permissions: Record<string, Record<string, boolean>>;
  onChange: (p: Record<string, Record<string, boolean>>) => void;
  disabled?: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(
    new Set(PERMISSION_TYPES.filter((t) => PERMISSION_TYPE_SCHEMA[t].length > 1))
  );

  const toggle = (type: string) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(type)) next.delete(type); else next.add(type);
    return next;
  });

  const handlePerm = (type: string, perm: string, value: boolean) => {
    const updated = { ...permissions, [type]: { ...permissions[type], [perm]: value } };
    onChange(updated);
  };

  const handleAll = (type: string, value: boolean) => {
    const section: Record<string, boolean> = {};
    for (const p of PERMISSION_TYPE_SCHEMA[type as typeof PERMISSION_TYPES[number]]) section[p] = value;
    onChange({ ...permissions, [type]: section });
  };

  const multiTypes = PERMISSION_TYPES.filter((t) => PERMISSION_TYPE_SCHEMA[t].length > 1);
  const singleTypes = PERMISSION_TYPES.filter((t) => PERMISSION_TYPE_SCHEMA[t].length === 1);

  return (
    <div className="space-y-3">
      {/* Multi-permission types (expandable cards) */}
      <div className="space-y-2">
        {multiTypes.map((type) => {
          const perms = PERMISSION_TYPE_SCHEMA[type];
          const section = permissions[type] ?? {};
          const allEnabled = perms.every((p) => section[p]);
          const enabledCount = perms.filter((p) => section[p]).length;
          const isOpen = !collapsed.has(type);

          return (
            <div key={type} className="rounded-lg border border-border">
              <div
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-hover ${isOpen ? 'rounded-t-lg' : 'rounded-lg'}`}
                onClick={() => toggle(type)}
              >
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm font-medium text-text-primary">{PERMISSION_TYPE_LABELS[type]}</span>
                </div>
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-muted-foreground">{allEnabled ? 'Tudo' : `${enabledCount}/${perms.length}`}</span>
                  <input
                    type="checkbox"
                    checked={allEnabled}
                    disabled={disabled}
                    onChange={(e) => handleAll(type, e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                </div>
              </div>
              {isOpen && (
                <div className="border-t border-border px-4 py-3 space-y-2">
                  {perms.map((perm) => (
                    <label key={perm} className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-text-primary">{PERMISSION_LABELS[perm] ?? perm}</span>
                      <input
                        type="checkbox"
                        checked={section[perm] ?? false}
                        disabled={disabled}
                        onChange={(e) => handlePerm(type, perm, e.target.checked)}
                        className="h-4 w-4 rounded"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Single-permission types (grid) */}
      <div className="rounded-lg border border-border px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground mb-3">Funcionalidades simples</p>
        <div className="grid grid-cols-2 gap-2">
          {singleTypes.map((type) => {
            const perm = PERMISSION_TYPE_SCHEMA[type][0];
            return (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions[type]?.[perm] ?? false}
                  disabled={disabled}
                  onChange={(e) => handlePerm(type, perm, e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm text-text-primary">{PERMISSION_TYPE_LABELS[type]}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUPS TAB
// ─────────────────────────────────────────────────────────────────────────────

function GroupFormDialog({ group, onClose }: { group?: AdminGroup; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!group;
  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? updateGroup(group!.id, { name, description })
      : createGroup({ name, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      toast({ variant: 'success', title: isEdit ? 'Grupo atualizado' : 'Grupo criado' });
      onClose();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  return (
    <Dialog title={isEdit ? 'Editar grupo' : 'Novo grupo'} onClose={onClose}>
      <div className="space-y-3">
        <FormField label="Nome *"><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></FormField>
        <FormField label="Descrição"><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" /></FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function GroupDetail({ group, onBack }: { group: AdminGroup; onBack: () => void }) {
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberOffset, setMemberOffset] = useState(0);
  const LIMIT = 20;

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', group.id, memberOffset],
    queryFn: () => fetchGroupMembers(group.id, { limit: LIMIT, offset: memberOffset }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeGroupMember(group.id, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['group-members', group.id] }); qc.invalidateQueries({ queryKey: ['groups'] }); toast({ variant: 'success', title: 'Membro removido' }); },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  const addMutation = useMutation({
    mutationFn: (userId: string) => addGroupMember(group.id, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['group-members', group.id] }); qc.invalidateQueries({ queryKey: ['groups'] }); toast({ variant: 'success', title: 'Membro adicionado' }); },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteGroup(group.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); toast({ variant: 'success', title: 'Grupo excluído' }); onBack(); },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  const members = membersData?.members ?? [];
  const total = membersData?.total ?? 0;
  const existingIds = members.map((m) => m.userId);

  return (
    <div className="space-y-4">
      {showEdit && <GroupFormDialog group={group} onClose={() => setShowEdit(false)} />}
      {showDelete && (
        <ConfirmDialog
          title="Excluir grupo"
          description={`Excluir "${group.name}"? Membros não serão excluídos.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setShowDelete(false)}
        />
      )}
      {showAddMember && (
        <MemberPicker existingIds={existingIds} onAdd={(id) => addMutation.mutate(id)} onClose={() => setShowAddMember(false)} />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>← Voltar</Button>
          <h3 className="text-base font-semibold text-text-primary">{group.name}</h3>
          {group.description && <span className="text-sm text-muted-foreground">— {group.description}</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar</Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Excluir</Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-text-primary">Membros ({total})</p>
          <Button size="sm" variant="outline" onClick={() => setShowAddMember(true)}><UserPlus className="mr-1.5 h-3.5 w-3.5" />Adicionar</Button>
        </div>
        <CardContent className="p-0">
          {membersLoading ? (
            <div className="p-3 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : members.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum membro neste grupo</p>
          ) : (
            <div className="divide-y divide-border">
              {members.map((m) => <MemberRow key={m.userId} member={m} onRemove={() => removeMutation.mutate(m.userId)} removing={removeMutation.isPending} />)}
            </div>
          )}
          {total > LIMIT && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
              <button disabled={memberOffset === 0} onClick={() => setMemberOffset((o) => Math.max(0, o - LIMIT))} className="text-muted-foreground hover:text-text-primary disabled:opacity-40">← Anterior</button>
              <span className="text-muted-foreground">{memberOffset + 1}–{Math.min(memberOffset + LIMIT, total)} de {total}</span>
              <button disabled={memberOffset + LIMIT >= total} onClick={() => setMemberOffset((o) => o + LIMIT)} className="text-muted-foreground hover:text-text-primary disabled:opacity-40">Próxima →</button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MemberRow({ member, onRemove, removing }: { member: GroupMember; onRemove: () => void; removing?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {(member.name ?? member.email ?? '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm text-text-primary">{member.name ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{member.email}</p>
        </div>
      </div>
      <button disabled={removing} onClick={onRemove} className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-destructive">
        <UserMinus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function GroupsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<AdminGroup | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['groups', search],
    queryFn: () => fetchGroups({ search: search || undefined, limit: 50 }),
  });

  const groups = data?.groups ?? [];

  if (selected) {
    const fresh = groups.find((g) => g.id === selected.id) ?? selected;
    return <GroupDetail group={fresh} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-4">
      {showCreate && <GroupFormDialog onClose={() => setShowCreate(false)} />}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Input placeholder="Buscar grupos…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-3" />
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Novo grupo</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-3 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : groups.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum grupo encontrado</p>
          ) : (
            <div className="divide-y divide-border">
              {groups.map((g) => (
                <button key={g.id} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-hover" onClick={() => setSelected(g)}>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{g.name}</p>
                    {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">{g.memberCount} membros</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{data?.total ?? 0} grupos no total</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLES TAB
// ─────────────────────────────────────────────────────────────────────────────

function RoleFormDialog({ role, onClose }: { role?: AdminRole; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!role;
  const isSystem = role ? SYSTEM_ROLE_NAMES.includes(role.name) : false;
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>(role?.permissions ?? defaultPermissions());
  const [tab, setTab] = useState<'details' | 'permissions'>('details');

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        if (!isSystem) await updateRole(role!.name, { name, description });
        await updateRolePermissions(name || role!.name, permissions);
      } else {
        const { role: created } = await createRole({ name, description });
        await updateRolePermissions(created.name, permissions);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast({ variant: 'success', title: isEdit ? 'Papel atualizado' : 'Papel criado' });
      onClose();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  return (
    <Dialog title={isEdit ? `Editar papel: ${role!.name}` : 'Novo papel'} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex gap-1 border-b border-border">
          {(['details', 'permissions'] as const).map((t) => (
            <button key={t} className={`px-3 py-2 text-sm font-medium transition-colors ${tab === t ? 'border-b-2 border-primary text-text-primary' : 'text-muted-foreground hover:text-text-primary'}`} onClick={() => setTab(t)}>
              {t === 'details' ? 'Detalhes' : 'Permissões'}
            </button>
          ))}
        </div>

        {tab === 'details' && (
          <div className="space-y-3">
            <FormField label="Nome">
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={isSystem} autoFocus />
              {isSystem && <p className="text-xs text-muted-foreground">Papéis do sistema não podem ser renomeados.</p>}
            </FormField>
            <FormField label="Descrição">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
            </FormField>
          </div>
        )}

        {tab === 'permissions' && (
          <RolePermissionsPanel permissions={permissions} onChange={setPermissions} />
        )}

        <div className="flex justify-between pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <div className="flex gap-2">
            {tab === 'details' && <Button size="sm" variant="outline" onClick={() => setTab('permissions')}>Permissões →</Button>}
            <Button size="sm" disabled={(!name.trim() && !isSystem) || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function RoleDetail({ role: initialRole, onBack }: { role: AdminRole; onBack: () => void }) {
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const isSystem = SYSTEM_ROLE_NAMES.includes(initialRole.name);

  const { data: roleData } = useQuery({
    queryKey: ['role', initialRole.name],
    queryFn: () => fetchRole(initialRole.name),
  });
  const role = roleData?.role ?? initialRole;

  const { data: membersData } = useQuery({
    queryKey: ['role-members', initialRole.name],
    queryFn: () => fetchRoleMembers(initialRole.name, { limit: 50 }),
  });
  const members = membersData?.members ?? [];

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeRoleMember(initialRole.name, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['role-members', initialRole.name] }); toast({ variant: 'success', title: 'Membro removido' }); },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => addRoleMember(initialRole.name, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['role-members', initialRole.name] }); toast({ variant: 'success', title: 'Membro adicionado' }); },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRole(initialRole.name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast({ variant: 'success', title: 'Papel excluído' }); onBack(); },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  const permissions = role.permissions ?? defaultPermissions();

  return (
    <div className="space-y-4">
      {showEdit && <RoleFormDialog role={role} onClose={() => setShowEdit(false)} />}
      {showDelete && (
        <ConfirmDialog
          title="Excluir papel"
          description={`Excluir o papel "${initialRole.name}"? Usuários com este papel perderão as permissões associadas.`}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setShowDelete(false)}
        />
      )}
      {showAddMember && (
        <MemberPicker existingIds={members.map((m) => m.userId)} onAdd={(id) => addMemberMutation.mutate(id)} onClose={() => setShowAddMember(false)} />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>← Voltar</Button>
          <h3 className="text-base font-semibold text-text-primary">{role.name}</h3>
          {isSystem && <Badge variant="secondary" className="text-xs">sistema</Badge>}
          {role.description && <span className="text-sm text-muted-foreground">— {role.description}</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar</Button>
          {!isSystem && <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Excluir</Button>}
        </div>
      </div>

      <Card>
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-text-primary">Permissões</p>
        </div>
        <CardContent className="p-4">
          <RolePermissionsPanel permissions={permissions} onChange={() => {}} disabled />
        </CardContent>
      </Card>

      <Card>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-text-primary">Membros ({membersData?.total ?? 0})</p>
          <Button size="sm" variant="outline" onClick={() => setShowAddMember(true)}><UserPlus className="mr-1.5 h-3.5 w-3.5" />Adicionar</Button>
        </div>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum membro neste papel</p>
          ) : (
            <div className="divide-y divide-border">
              {members.map((m) => <MemberRow key={m.userId} member={m} onRemove={() => removeMemberMutation.mutate(m.userId)} removing={removeMemberMutation.isPending} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RolesTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<AdminRole | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => fetchRoles({ limit: 100 }),
  });

  const roles = data?.roles ?? [];

  if (selected) {
    const fresh = roles.find((r) => r.name === selected.name) ?? selected;
    return <RoleDetail role={fresh} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-4">
      {showCreate && <RoleFormDialog onClose={() => setShowCreate(false)} />}

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Novo papel</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-3 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : roles.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum papel encontrado</p>
          ) : (
            <div className="divide-y divide-border">
              {roles.map((r) => (
                <button key={r.name} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-hover" onClick={() => setSelected(r)}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{r.name}</p>
                      {SYSTEM_ROLE_NAMES.includes(r.name) && <Badge variant="secondary" className="text-xs">sistema</Badge>}
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {r.userCount != null && <Badge variant="secondary" className="text-xs">{r.userCount} usuários</Badge>}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ACCESS PAGE
// ─────────────────────────────────────────────────────────────────────────────

type AccessTab = 'groups' | 'roles';

export function Access() {
  const [tab, setTab] = useState<AccessTab>('groups');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Controle de acesso</h2>
        <p className="text-sm text-muted-foreground">Gerencie grupos e papéis de usuários</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([['groups', 'Grupos', Users], ['roles', 'Papéis', Shield]] as [AccessTab, string, React.ElementType][]).map(([id, label, Icon]) => (
          <button
            key={id}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === id ? 'border-b-2 border-primary text-text-primary' : 'text-muted-foreground hover:text-text-primary'}`}
            onClick={() => setTab(id)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'groups' && <GroupsTab />}
      {tab === 'roles' && <RolesTab />}
    </div>
  );
}
