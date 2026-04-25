import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Users, Coins, ChevronRight, Share2, Plus, Pencil, Trash2, X, UserPlus, UserMinus, BarChart2, ShieldX } from 'lucide-react';
import {
  fetchOrganizations,
  fetchOrganization,
  fetchUsers,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  addOrgMember,
  removeOrgMember,
  updateOrgProfile,
  adjustOrgCredits,
  distributeCredits,
  fetchGroupUsageDetail,
  fetchModelPresets,
  applyPresetToUsers,
} from '~/lib/api';
import { toast } from '~/hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';
import { ModelIcon } from '~/components/ModelIcon';
import { cleanModelName, resolveAvatarUrl } from '~/lib/models';
import { formatUsd } from '~/lib/utils';
import type { Organization } from '~/lib/api';

// ── Shared Dialog ─────────────────────────────────────────────────────────────

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

// ── Create Org Dialog ─────────────────────────────────────────────────────────

function CreateOrgDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'company' | 'team'>('team');

  const mutation = useMutation({
    mutationFn: () => createOrganization({ name, description, email, type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      toast({ variant: 'success', title: 'Organização criada' });
      onClose();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao criar', description: err.message }),
  });

  return (
    <Dialog title="Nova organização" onClose={onClose}>
      <div className="space-y-3">
        <FormField label="Nome *">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da organização" />
        </FormField>
        <FormField label="Descrição">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
        </FormField>
        <FormField label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" />
        </FormField>
        <FormField label="Tipo">
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={type}
            onChange={(e) => setType(e.target.value as 'company' | 'team')}
          >
            <option value="team">Time</option>
            <option value="company">Empresa</option>
          </select>
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Criando…' : 'Criar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ── Edit Org Dialog ───────────────────────────────────────────────────────────

function EditOrgDialog({ org, onClose }: { org: Organization; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(org.name);
  const [description, setDescription] = useState(org.description ?? '');
  const [email, setEmail] = useState(org.email ?? '');

  const mutation = useMutation({
    mutationFn: () => updateOrganization(org.id, { name, description, email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      toast({ variant: 'success', title: 'Organização atualizada' });
      onClose();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao atualizar', description: err.message }),
  });

  return (
    <Dialog title="Editar organização" onClose={onClose}>
      <div className="space-y-3">
        <FormField label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Descrição">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <FormField label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────

function DeleteOrgDialog({ org, onBack }: { org: Organization; onBack: () => void }) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteOrganization(org.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      toast({ variant: 'success', title: 'Organização excluída' });
      onBack();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message }),
  });

  return (
    <Dialog title="Excluir organização" onClose={onBack}>
      <p className="mb-4 text-sm text-muted-foreground">
        Tem certeza que deseja excluir <strong className="text-text-primary">{org.name}</strong>?
        Isso remove o grupo e as configurações de billing, mas não exclui os usuários membros.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>Cancelar</Button>
        <Button variant="destructive" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Excluindo…' : 'Excluir'}
        </Button>
      </div>
    </Dialog>
  );
}

// ── Add Member Dialog ─────────────────────────────────────────────────────────

function AddMemberDialog({ orgId, existingMemberIds, onClose }: { orgId: string; existingMemberIds: string[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => fetchUsers({ limit: 200 }),
  });

  const available = (usersData?.users ?? []).filter((u) => !existingMemberIds.includes(u.id));

  const mutation = useMutation({
    mutationFn: () => addOrgMember(orgId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-detail', orgId] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
      toast({ variant: 'success', title: 'Membro adicionado' });
      onClose();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao adicionar membro', description: err.message }),
  });

  return (
    <Dialog title="Adicionar membro" onClose={onClose}>
      <div className="space-y-3">
        <FormField label="Usuário">
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">Selecionar usuário…</option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!userId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Adicionando…' : 'Adicionar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ── Distribute Credits Form ───────────────────────────────────────────────────

function DistributeForm({ orgId, poolCredits, memberIds }: { orgId: string; poolCredits: number; memberIds: string[] }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const period = new Date().toISOString().slice(0, 7);

  const { data: allUsers } = useQuery({ queryKey: ['users', 'list'], queryFn: () => fetchUsers({ limit: 200 }) });
  const members = (allUsers?.users ?? []).filter((u) => memberIds.includes(u.id));

  const mutation = useMutation({
    mutationFn: () => distributeCredits(orgId, userId, parseFloat(amount), period),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      toast({ variant: 'success', title: 'Créditos distribuídos' });
      setUserId(''); setAmount('');
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao distribuir', description: err.message }),
  });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        >
          <option value="">Selecionar membro…</option>
          {members.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
        </select>
        <Input type="number" placeholder="Créditos" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
        <Button size="sm" disabled={!userId || !amount || parseFloat(amount) > poolCredits || mutation.isPending} onClick={() => mutation.mutate()}>
          Distribuir
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Pool disponível: {formatUsd(poolCredits)} · Período: {period}</p>
    </div>
  );
}

// ── Apply Preset Card ─────────────────────────────────────────────────────────

function ApplyPresetCard({ memberIds }: { memberIds: string[] }) {
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [applied, setApplied] = useState(false);

  const { data: presets = [] } = useQuery({ queryKey: ['model-presets'], queryFn: fetchModelPresets });

  const mutation = useMutation({
    mutationFn: () => applyPresetToUsers(selectedPresetId, memberIds),
    onSuccess: (res) => {
      toast({ variant: 'success', title: `Perfil aplicado a ${res.applied} membro(s)` });
      setApplied(true);
      setSelectedPresetId('');
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao aplicar', description: err.message }),
  });

  const selectedPreset = presets.find((p) => p.id === selectedPresetId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldX className="h-4 w-4" />Perfil de acesso a modelos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {presets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum perfil criado. Acesse <strong>Modelos</strong> para criar perfis de acesso.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Aplica um perfil a todos os {memberIds.length} membro(s) da organização de uma vez.
            </p>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={selectedPresetId}
                onChange={(e) => { setSelectedPresetId(e.target.value); setApplied(false); }}
              >
                <option value="">Selecionar perfil…</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.blockedSpecs.length > 0 ? ` — ${p.blockedSpecs.length} modelo(s) bloqueado(s)` : ' — acesso total'}
                    {p.agentsDisabled ? ', sem agentes' : ''}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={!selectedPresetId || memberIds.length === 0 || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? 'Aplicando…' : 'Aplicar'}
              </Button>
            </div>
            {selectedPreset && (
              <p className="text-xs text-muted-foreground">
                Bloqueios individuais existentes são preservados e somados ao perfil selecionado.
              </p>
            )}
            {applied && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✓ Perfil aplicado com sucesso a todos os membros.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Org Detail Page ───────────────────────────────────────────────────────────

function OrgDetail({ org, onBack }: { org: Organization; onBack: () => void }) {
  const qc = useQueryClient();
  const [creditAmount, setCreditAmount] = useState('');
  const [reason, setReason] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  const { data: detail } = useQuery({
    queryKey: ['org-detail', org.id],
    queryFn: () => fetchOrganization(org.id),
  });

  const { data: allUsers } = useQuery({ queryKey: ['users', 'list'], queryFn: () => fetchUsers({ limit: 200 }) });

  const memberIds = detail?.memberIds ?? [];
  const members = (allUsers?.users ?? []).filter((u) => memberIds.includes(u.id));

  const adjustMutation = useMutation({
    mutationFn: () => adjustOrgCredits(org.id, parseFloat(creditAmount), reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      toast({ variant: 'success', title: 'Pool atualizado' });
      setCreditAmount(''); setReason('');
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao ajustar', description: err.message }),
  });

  const profileMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateOrgProfile>[1]) => updateOrgProfile(org.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizations'] }); toast({ variant: 'success', title: 'Configuração salva' }); },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeOrgMember(org.id, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org-detail', org.id] }); qc.invalidateQueries({ queryKey: ['organizations'] }); toast({ variant: 'success', title: 'Membro removido' }); },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao remover', description: err.message }),
  });

  if (showDelete) return <DeleteOrgDialog org={org} onBack={() => { setShowDelete(false); onBack(); }} />;

  return (
    <div className="space-y-4">
      {showEdit && <EditOrgDialog org={org} onClose={() => setShowEdit(false)} />}
      {showAddMember && <AddMemberDialog orgId={org.id} existingMemberIds={memberIds} onClose={() => setShowAddMember(false)} />}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>← Voltar</Button>
          <h2 className="text-base font-semibold text-text-primary">{org.name}</h2>
          {org.description && <span className="text-sm text-muted-foreground">— {org.description}</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar</Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Excluir</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pool de créditos</p><p className="mt-1 text-xl font-semibold">{formatUsd(org.poolCredits)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total comprado</p><p className="mt-1 text-xl font-semibold">{formatUsd(org.totalPurchased)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Membros</p><p className="mt-1 text-xl font-semibold">{org.memberCount}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Membros</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAddMember(true)}><UserPlus className="mr-1.5 h-3.5 w-3.5" />Adicionar</Button>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Nenhum membro</p>
          ) : (
            <div className="divide-y divide-border">
              {members.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{u.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <p className="text-sm text-text-primary">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <button
                    className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-destructive"
                    title="Remover membro"
                    onClick={() => removeMemberMutation.mutate(u.id)}
                    disabled={removeMemberMutation.isPending}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Ajuste de créditos</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input type="number" placeholder="Valor (ex: 1000 ou -500)" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="w-48" />
            <Input placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button onClick={() => adjustMutation.mutate()} disabled={!creditAmount || adjustMutation.isPending} size="sm">
              {adjustMutation.isPending ? 'Salvando…' : 'Aplicar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Share2 className="h-4 w-4" />Distribuir para membro</CardTitle></CardHeader>
        <CardContent>
          <DistributeForm orgId={org.id} poolCredits={org.poolCredits} memberIds={memberIds} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Configurações</CardTitle></CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          <Button variant={org.type === 'company' ? 'default' : 'outline'} size="sm" onClick={() => profileMutation.mutate({ type: 'company' })}>Empresa</Button>
          <Button variant={org.type === 'team' ? 'default' : 'outline'} size="sm" onClick={() => profileMutation.mutate({ type: 'team' })}>Time</Button>
          <Button variant={org.creditPoolEnabled ? 'default' : 'outline'} size="sm" onClick={() => profileMutation.mutate({ creditPoolEnabled: !org.creditPoolEnabled })}>
            Pool {org.creditPoolEnabled ? 'ativo' : 'inativo'}
          </Button>
        </CardContent>
      </Card>

      <ApplyPresetCard memberIds={memberIds} />

      <OrgUsageSection groupId={org.id} />
    </div>
  );
}

function OrgUsageSection({ groupId }: { groupId: string }) {
  const { data: usage, isLoading } = useQuery({
    queryKey: ['usage', 'group', groupId],
    queryFn: () => fetchGroupUsageDetail(groupId),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Consumo total</p>
            {isLoading ? <div className="mt-1 h-7 w-20 animate-pulse rounded bg-muted" /> : (
              <p className="mt-1 text-xl font-semibold text-text-primary">{formatUsd(usage?.total.tokenValue ?? 0)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Transações</p>
            {isLoading ? <div className="mt-1 h-7 w-16 animate-pulse rounded bg-muted" /> : (
              <p className="mt-1 text-xl font-semibold text-text-primary">{usage?.total.transactions ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Membros ativos</p>
            {isLoading ? <div className="mt-1 h-7 w-12 animate-pulse rounded bg-muted" /> : (
              <p className="mt-1 text-xl font-semibold text-text-primary">{usage?.memberCount ?? 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            Consumo por membro (30d)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-px p-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />)}
            </div>
          ) : (usage?.byMember ?? []).length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sem uso nos últimos 30 dias</p>
          ) : (
            <div className="divide-y divide-border">
              {(usage?.byMember ?? []).map((m) => (
                <div key={m.userId} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-hover">
                  <div className="flex items-center gap-2">
                    {resolveAvatarUrl(m.avatar) ? (
                      <img src={resolveAvatarUrl(m.avatar)} alt={m.name} className="h-6 w-6 rounded-full" />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-text-primary">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-text-primary">{formatUsd(m.tokenValue)}</p>
                    <p className="text-xs text-muted-foreground">{m.transactions} req</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(usage?.byModel ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Modelos mais usados (30d)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {(usage?.byModel ?? []).map((m) => (
                <div key={m.model} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <ModelIcon model={m.model} size={20} />
                    <span className="truncate text-sm text-text-primary">{cleanModelName(m.model)}</span>
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
                    <span>{m.transactions} req</span>
                    <span className="font-medium text-text-primary">{formatUsd(m.tokenValue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Org Card ──────────────────────────────────────────────────────────────────

function OrgCard({ org, onSelect }: { org: Organization; onSelect: (org: Organization) => void }) {
  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-surface-hover"
      onClick={() => onSelect(org)}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{org.name}</p>
          <p className="text-xs text-muted-foreground">{org.email ?? 'sem email'}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" />{org.memberCount}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Coins className="h-3 w-3" />{formatUsd(org.poolCredits)}</div>
        <Badge variant={org.type === 'company' ? 'default' : 'secondary'} className="text-xs">{org.type === 'company' ? 'Empresa' : 'Time'}</Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

// ── Main Organizations Page ───────────────────────────────────────────────────

export function Organizations() {
  const [selected, setSelected] = useState<Organization | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['organizations'], queryFn: fetchOrganizations });

  if (selected) {
    const fresh = data?.organizations.find((o) => o.id === selected.id) ?? selected;
    return <OrgDetail org={fresh} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-4">
      {showCreate && <CreateOrgDialog onClose={() => setShowCreate(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Organizações</h2>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} grupos/empresas</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nova organização
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      ) : (
        <div className="space-y-2">
          {(data?.organizations ?? []).map((org) => <OrgCard key={org.id} org={org} onSelect={setSelected} />)}
          {data?.organizations.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhum grupo criado ainda</div>
          )}
        </div>
      )}
    </div>
  );
}
