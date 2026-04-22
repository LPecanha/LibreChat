import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, ChevronRight, Plus, Trash2, Users, User, Pencil, X } from 'lucide-react';
import { fetchAgents, fetchOrganizations, fetchUsers, grantAgentAccess, revokeAgentAccess, updateAgent, deleteAgent } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';
import { ModelIcon, AgentIcon } from '~/components/ModelIcon';
import { cleanModelName } from '~/lib/models';
import { toast } from '~/hooks/useToast';
import { formatDate } from '~/lib/utils';
import type { AgentItem } from '~/lib/api';

const PERM_LABELS: Record<number, string> = { 1: 'Visualizar', 3: 'Editar', 7: 'Proprietário' };

const ACCESS_LEVELS: Record<number, string> = { 1: 'Privado', 2: 'Restrito (ACL)', 3: 'Público' };

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

// ── Edit Agent Dialog ─────────────────────────────────────────────────────────

function EditAgentDialog({ agent, onClose }: { agent: AgentItem; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description ?? '');
  const [accessLevel, setAccessLevel] = useState(agent.access_level ?? 1);

  const mutation = useMutation({
    mutationFn: () => updateAgent(agent.id, { name, description, access_level: accessLevel }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      toast({ variant: 'success', title: 'Agente atualizado' });
      onClose();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao atualizar', description: err.message }),
  });

  return (
    <Dialog title="Editar agente" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">Nome</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">Descrição</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">Nível de acesso</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={accessLevel}
            onChange={(e) => setAccessLevel(parseInt(e.target.value, 10))}
          >
            {Object.entries(ACCESS_LEVELS).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>
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

// ── Delete Agent Dialog ───────────────────────────────────────────────────────

function DeleteAgentDialog({ agent, onBack }: { agent: AgentItem; onBack: () => void }) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteAgent(agent.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      toast({ variant: 'success', title: 'Agente excluído' });
      onBack();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message }),
  });

  return (
    <Dialog title="Excluir agente" onClose={onBack}>
      <p className="mb-4 text-sm text-muted-foreground">
        Tem certeza que deseja excluir o agente <strong className="text-text-primary">{agent.name}</strong>?
        Todas as permissões de acesso associadas também serão removidas.
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

// ── Grant Form ────────────────────────────────────────────────────────────────

function GrantForm({ agent, onDone }: { agent: AgentItem; onDone: () => void }) {
  const qc = useQueryClient();
  const [principalType, setPrincipalType] = useState<'user' | 'group'>('group');
  const [principalId, setPrincipalId] = useState('');
  const [permBits, setPermBits] = useState(1);

  const { data: orgsData } = useQuery({ queryKey: ['organizations'], queryFn: fetchOrganizations, enabled: principalType === 'group' });
  const { data: usersData } = useQuery({ queryKey: ['users', 'list'], queryFn: () => fetchUsers({ limit: 100 }), enabled: principalType === 'user' });

  const mutation = useMutation({
    mutationFn: () => grantAgentAccess(agent.id, { principalType, principalId, permBits }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      toast({ variant: 'success', title: 'Acesso concedido' });
      onDone();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  const options = principalType === 'group'
    ? (orgsData?.organizations ?? []).map((o) => ({ value: o.id, label: o.name }))
    : (usersData?.users ?? []).map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }));

  return (
    <div className="mt-3 rounded-lg border border-border bg-surface-secondary p-3 space-y-3">
      <div className="flex gap-2">
        {(['group', 'user'] as const).map((t) => (
          <Button key={t} size="sm" variant={principalType === t ? 'default' : 'outline'} onClick={() => { setPrincipalType(t); setPrincipalId(''); }}>
            {t === 'group' ? <Users className="mr-1 h-3 w-3" /> : <User className="mr-1 h-3 w-3" />}
            {t === 'group' ? 'Organização' : 'Usuário'}
          </Button>
        ))}
      </div>
      <select
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        value={principalId}
        onChange={(e) => setPrincipalId(e.target.value)}
      >
        <option value="">Selecionar…</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div className="flex items-center gap-2">
        <select
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={permBits}
          onChange={(e) => setPermBits(parseInt(e.target.value, 10))}
        >
          <option value={1}>Visualizar</option>
          <option value={3}>Editar</option>
          <option value={7}>Proprietário</option>
        </select>
        <Button size="sm" disabled={!principalId || mutation.isPending} onClick={() => mutation.mutate()}>Conceder</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancelar</Button>
      </div>
    </div>
  );
}

// ── Agent Detail ──────────────────────────────────────────────────────────────

function AgentDetail({ agent, onBack }: { agent: AgentItem; onBack: () => void }) {
  const qc = useQueryClient();
  const [showGrant, setShowGrant] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const revokeMutation = useMutation({
    mutationFn: (aclId: string) => revokeAgentAccess(agent.id, aclId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); toast({ variant: 'success', title: 'Acesso revogado' }); },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  if (showDelete) return <DeleteAgentDialog agent={agent} onBack={() => { setShowDelete(false); onBack(); }} />;

  return (
    <div className="space-y-4">
      {showEdit && <EditAgentDialog agent={agent} onClose={() => setShowEdit(false)} />}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>← Voltar</Button>
          <Bot className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-text-primary">{agent.name}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar</Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Excluir</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {agent.model && <ModelIcon model={agent.model} size={20} />}
        <Badge variant="outline" className="text-xs">{agent.model ? cleanModelName(agent.model) : '—'}</Badge>
        {agent.authorName && <Badge variant="secondary" className="text-xs">por {agent.authorName}</Badge>}
        {agent.access_level != null && (
          <Badge variant="secondary" className="text-xs">{ACCESS_LEVELS[agent.access_level] ?? `level:${agent.access_level}`}</Badge>
        )}
        {agent.createdAt && <span className="text-xs text-muted-foreground">{formatDate(agent.createdAt)}</span>}
      </div>

      {agent.description && <p className="text-sm text-muted-foreground">{agent.description}</p>}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Permissões de acesso</CardTitle>
          <Button size="sm" onClick={() => setShowGrant(!showGrant)}>
            <Plus className="mr-1 h-3 w-3" />
            Conceder acesso
          </Button>
        </CardHeader>
        <CardContent>
          {showGrant && <GrantForm agent={agent} onDone={() => setShowGrant(false)} />}

          {agent.acl.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma permissão explícita — acesso controlado pelo nível de acesso padrão
            </p>
          ) : (
            <div className="mt-3 divide-y divide-border">
              {agent.acl.map((entry) => (
                <div key={entry._id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    {entry.principalType === 'group' ? <Users className="h-3.5 w-3.5 text-muted-foreground" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="text-sm text-text-primary">{entry.principalName ?? entry.principalId}</span>
                    <Badge variant="outline" className="text-xs">{PERM_LABELS[entry.permBits] ?? `bits:${entry.permBits}`}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={revokeMutation.isPending}
                    onClick={() => revokeMutation.mutate(entry._id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Agents Page ──────────────────────────────────────────────────────────

export function Agents() {
  const [selected, setSelected] = useState<AgentItem | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['agents'], queryFn: fetchAgents });

  if (selected) {
    const fresh = data?.find((a) => a.id === selected.id) ?? selected;
    return <AgentDetail agent={fresh} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Agentes</h2>
        <p className="text-sm text-muted-foreground">Gerencie agentes e permissões de acesso</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-px p-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}</div>
          ) : (data ?? []).length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <div className="text-center">
                <Bot className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhum agente encontrado</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(data ?? []).map((agent) => (
                <button
                  key={agent.id}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-hover"
                  onClick={() => setSelected(agent)}
                >
                  <div className="flex items-center gap-3">
                    <AgentIcon size={32} />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{agent.name}</p>
                      <div className="flex items-center gap-1.5">
                        {agent.model && <ModelIcon model={agent.model} size={13} />}
                        <p className="text-xs text-muted-foreground">{agent.model ? cleanModelName(agent.model) : '—'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {agent.access_level != null && (
                      <span className="text-xs text-muted-foreground">{ACCESS_LEVELS[agent.access_level] ?? `level:${agent.access_level}`}</span>
                    )}
                    {agent.acl.length > 0 && <Badge variant="secondary" className="text-xs">{agent.acl.length} permissões</Badge>}
                    {agent.authorName && <span className="text-xs text-muted-foreground">{agent.authorName}</span>}
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
