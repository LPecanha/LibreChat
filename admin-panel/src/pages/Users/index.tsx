import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronRight, ChevronLeft, Plus, Pencil, Trash2, X, UserCog, BarChart2 } from 'lucide-react';
import { UserDetail } from './UserDetail';
import {
  fetchUsers, searchUsers, createUser, updateUser, deleteUser,
  fetchGroups, fetchRoles,
  addGroupMember,
  addRoleMember,
} from '~/lib/api';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { formatRelative } from '~/lib/utils';
import { toast } from '~/hooks/useToast';
import type { AdminUserItem, AdminGroup, AdminRole } from '~/lib/api';

const PAGE_SIZE = 30;

// ── Shared Dialog Shell ───────────────────────────────────────────────────────

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-2xl">
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

// ── Create User Dialog ────────────────────────────────────────────────────────

function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');

  const mutation = useMutation({
    mutationFn: () => createUser({ name, email, password, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast({ variant: 'success', title: 'Usuário criado com sucesso' });
      onClose();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao criar usuário', description: err.message }),
  });

  return (
    <Dialog title="Criar usuário" onClose={onClose}>
      <div className="space-y-3">
        <FormField label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
        </FormField>
        <FormField label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
        </FormField>
        <FormField label="Senha temporária">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
        </FormField>
        <FormField label="Perfil">
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="USER">Usuário</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            disabled={!name.trim() || !email.trim() || !password.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Criando…' : 'Criar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ── Edit User Dialog ──────────────────────────────────────────────────────────

function EditUserDialog({ user, onClose }: { user: AdminUserItem; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);

  const mutation = useMutation({
    mutationFn: () => updateUser(user.id, { name, email, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast({ variant: 'success', title: 'Usuário atualizado' });
      onClose();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao atualizar', description: err.message }),
  });

  return (
    <Dialog title="Editar usuário" onClose={onClose}>
      <div className="space-y-3">
        <FormField label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Perfil">
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="USER">Usuário</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            disabled={!name.trim() || !email.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────

function DeleteConfirmDialog({ user, onClose }: { user: AdminUserItem; onClose: () => void }) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteUser(user.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast({ variant: 'success', title: 'Usuário excluído' });
      onClose();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message }),
  });

  return (
    <Dialog title="Excluir usuário" onClose={onClose}>
      <p className="mb-4 text-sm text-muted-foreground">
        Tem certeza que deseja excluir <strong className="text-text-primary">{user.name}</strong>? Esta ação não pode ser desfeita.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Excluindo…' : 'Excluir'}
        </Button>
      </div>
    </Dialog>
  );
}

// ── User Detail Panel ─────────────────────────────────────────────────────────

function AssignSection({
  label,
  items,
  onAdd,
  loading,
  getLabel,
  getId,
}: {
  label: string;
  items: { id: string; name: string }[];
  onAdd: (id: string) => void;
  loading: boolean;
  getLabel: (item: { id: string; name: string }) => string;
  getId: (item: { id: string; name: string }) => string;
}) {
  const [selected, setSelected] = useState('');
  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-text-primary">{label}</h4>
      <div className="flex gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm"
        >
          <option value="">Selecione…</option>
          {items.map((item) => (
            <option key={getId(item)} value={getId(item)}>{getLabel(item)}</option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={!selected || loading}
          onClick={() => { if (selected) { onAdd(selected); setSelected(''); } }}
        >
          Adicionar
        </Button>
      </div>
    </div>
  );
}

function UserDetailPanel({ user, onClose }: { user: AdminUserItem; onClose: () => void }) {
  const qc = useQueryClient();

  const { data: groupsData } = useQuery({ queryKey: ['groups'], queryFn: () => fetchGroups() });
  const { data: rolesData } = useQuery({ queryKey: ['roles'], queryFn: () => fetchRoles() });

  const groups: AdminGroup[] = groupsData?.groups ?? [];
  const roles: AdminRole[] = rolesData?.roles ?? [];

  const groupMut = useMutation({
    mutationFn: (groupId: string) => addGroupMember(groupId, user.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Adicionado ao grupo' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const roleMut = useMutation({
    mutationFn: (roleName: string) => addRoleMember(roleName, user.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast({ title: 'Papel atribuído' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-card border border-border p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-text-primary">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-text-primary"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-col gap-5">
          <AssignSection
            label="Adicionar ao grupo"
            items={groups.map((g) => ({ id: g.id, name: g.name }))}
            onAdd={(id) => groupMut.mutate(id)}

            loading={groupMut.isPending}
            getLabel={(item) => item.name}
            getId={(item) => item.id}
          />
          <AssignSection
            label="Atribuir papel"
            items={roles.map((r) => ({ id: r.name, name: r.name }))}
            onAdd={(roleName) => roleMut.mutate(roleName)}

            loading={roleMut.isPending}
            getLabel={(item) => item.name}
            getId={(item) => item.id}
          />
          <p className="text-xs text-muted-foreground">
            Para remover membros de grupos ou papéis, acesse a página de Acesso.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Users Page ───────────────────────────────────────────────────────────

export function Users() {
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUserItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserItem | null>(null);
  const [detailTarget, setDetailTarget] = useState<AdminUserItem | null>(null);
  const [usageTarget, setUsageTarget] = useState<AdminUserItem | null>(null);

  if (usageTarget) {
    return <UserDetail user={usageTarget} onBack={() => setUsageTarget(null)} />;
  }

  const { data: all, isLoading } = useQuery({
    queryKey: ['users', 'list', offset],
    queryFn: () => fetchUsers({ limit: PAGE_SIZE, offset }),
    enabled: search.length === 0,
  });

  const { data: searched } = useQuery({
    queryKey: ['users', 'search', search],
    queryFn: () => searchUsers(search),
    enabled: search.length >= 2,
  });

  const users = search.length >= 2 ? (searched?.users ?? []) : (all?.users ?? []);
  const total = all?.total ?? 0;
  const hasPrev = offset > 0;
  const hasNext = search.length === 0 && offset + PAGE_SIZE < total;

  return (
    <div className="space-y-4">
      {showCreate && <CreateUserDialog onClose={() => setShowCreate(false)} />}
      {editTarget && <EditUserDialog user={editTarget} onClose={() => setEditTarget(null)} />}
      {deleteTarget && <DeleteConfirmDialog user={deleteTarget} onClose={() => setDeleteTarget(null)} />}
      {detailTarget && <UserDetailPanel user={detailTarget} onClose={() => setDetailTarget(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Usuários</h2>
          <p className="text-sm text-muted-foreground">{all?.total ?? 0} usuários no total</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Criar usuário
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-px p-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((u) => (
                <div key={u.id} className="flex w-full items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-text-primary">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{formatRelative(u.createdAt)}</span>
                    <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">{u.role}</Badge>
                    <Badge variant="outline" className="text-xs">{u.provider}</Badge>
                    <button
                      className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-text-primary"
                      title="Ver extrato"
                      onClick={() => setUsageTarget(u)}
                    >
                      <BarChart2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-text-primary"
                      title="Grupos e Papéis"
                      onClick={() => setDetailTarget(u)}
                    >
                      <UserCog className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-text-primary"
                      title="Editar"
                      onClick={() => setEditTarget(u)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-destructive"
                      title="Excluir"
                      onClick={() => setDeleteTarget(u)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {users.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {search.length >= 2 ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(hasPrev || hasNext) && (
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            disabled={!hasPrev}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <span className="text-muted-foreground">{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total}</span>
          <button
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            disabled={!hasNext}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-40"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
