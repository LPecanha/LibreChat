import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Coins, BarChart2, Cpu, MessageSquare, ShieldCheck, X, Bot, Check } from 'lucide-react';
import {
  fetchUserBalance, fetchUserUsageDetailV2, fetchSubscriptions,
  fetchUserModelAccess, saveUserModelAccess, clearUserModelAccess,
  fetchModelPresets, fetchModelSpecs,
} from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { ModelIcon, AgentIcon } from '~/components/ModelIcon';
import { cleanModelName } from '~/lib/models';
import { formatUsd, formatDate, formatRelative } from '~/lib/utils';
import { toast } from '~/hooks/useToast';
import type { AdminUserItem } from '~/lib/api';

// ── Model access card ─────────────────────────────────────────────────────────

function ModelAccessCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [agentsDisabled, setAgentsDisabled] = useState<boolean | undefined>(undefined);
  const [extraBlocked, setExtraBlocked] = useState<Set<string>>(new Set());

  const { data: access, isLoading: loadingAccess } = useQuery({
    queryKey: ['model-access', 'user', userId],
    queryFn: () => fetchUserModelAccess(userId),
  });
  const { data: presets = [] } = useQuery({ queryKey: ['model-presets'], queryFn: fetchModelPresets });
  const { data: specs = [] } = useQuery({ queryKey: ['model-specs'], queryFn: fetchModelSpecs });

  function startEdit() {
    setSelectedPresetId(access?.presetId ?? '');
    setAgentsDisabled(access?.agentsDisabled ?? false);
    setExtraBlocked(new Set(access?.blockedSpecsOverride ?? []));
    setEditing(true);
  }

  function toggleExtra(name: string) {
    setExtraBlocked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      saveUserModelAccess(userId, {
        presetId: selectedPresetId || undefined,
        blockedSpecsOverride: [...extraBlocked],
        agentsDisabled: agentsDisabled,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['model-access', 'user', userId] });
      toast({ variant: 'success', title: 'Acesso atualizado' });
      setEditing(false);
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  const clearMutation = useMutation({
    mutationFn: () => clearUserModelAccess(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['model-access', 'user', userId] });
      toast({ variant: 'success', title: 'Restrições removidas' });
      setEditing(false);
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
  });

  const activePreset = presets.find((p) => p.id === access?.presetId);
  const hasRestrictions = (access?.effectiveBlockedSpecs?.length ?? 0) > 0 || access?.agentsDisabled;

  if (loadingAccess) return <Skeleton className="h-20 w-full rounded-xl" />;

  if (editing) {
    const selectedPreset = presets.find((p) => p.id === selectedPresetId);
    const presetBlocked = new Set(selectedPreset?.blockedSpecs ?? []);
    const effectiveBlocked = new Set([...presetBlocked, ...extraBlocked]);

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />Acesso a modelos
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Perfil de acesso</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
            >
              <option value="">Sem perfil (acesso completo)</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.blockedSpecs.length > 0 ? ` — ${specs.length - p.blockedSpecs.length}/${specs.length} modelos` : ''}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-text-primary">Desativar agentes</span>
            </div>
            <button
              type="button"
              onClick={() => setAgentsDisabled((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${agentsDisabled ? 'bg-destructive' : 'bg-border'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${agentsDisabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {specs.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-text-primary">Bloqueios adicionais</p>
              <p className="mb-2 text-xs text-muted-foreground">Bloqueios individuais somam-se ao perfil selecionado.</p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-2 space-y-0.5">
                {specs.map((spec) => {
                  const fromPreset = presetBlocked.has(spec.name);
                  const fromExtra = extraBlocked.has(spec.name);
                  const isBlocked = effectiveBlocked.has(spec.name);
                  return (
                    <label
                      key={spec.name}
                      className={`flex cursor-pointer items-center justify-between rounded px-2 py-1.5 transition-colors ${isBlocked ? 'bg-destructive/10' : 'hover:bg-surface-hover'}`}
                    >
                      <div className="flex items-center gap-2">
                        <ModelIcon model={spec.name} size={16} />
                        <span className="text-sm text-text-primary">{spec.label}</span>
                        {fromPreset && <Badge variant="secondary" className="text-xs">perfil</Badge>}
                      </div>
                      <button
                        type="button"
                        disabled={fromPreset}
                        onClick={() => !fromPreset && toggleExtra(spec.name)}
                        className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                          isBlocked
                            ? fromPreset
                              ? 'border-muted bg-muted text-muted-foreground cursor-not-allowed'
                              : 'border-destructive bg-destructive text-white'
                            : 'border-border bg-background hover:border-primary'
                        }`}
                      >
                        {isBlocked && <X className="h-3 w-3" />}
                      </button>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={clearMutation.isPending}
              onClick={() => clearMutation.mutate()}
            >
              Remover todas as restrições
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button size="sm" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />Acesso a modelos
          </CardTitle>
          <Button variant="outline" size="sm" onClick={startEdit}>Configurar</Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasRestrictions ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-green-500" />
            Acesso completo a todos os modelos e agentes
          </div>
        ) : (
          <div className="space-y-2">
            {activePreset && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{activePreset.name}</Badge>
                <span className="text-xs text-muted-foreground">perfil ativo</span>
              </div>
            )}
            {access?.agentsDisabled && (
              <div className="flex items-center gap-1.5 text-sm text-destructive">
                <Bot className="h-3.5 w-3.5" />Agentes desativados
              </div>
            )}
            {(access?.effectiveBlockedSpecs?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">
                  {specs.length - (access?.effectiveBlockedSpecs?.length ?? 0)} / {specs.length} modelos liberados
                </p>
                <div className="flex flex-wrap gap-1">
                  {specs
                    .filter((s) => !access?.effectiveBlockedSpecs?.includes(s.name))
                    .map((s) => (
                      <div key={s.name} className="flex items-center gap-1 rounded-full border border-border bg-surface-secondary px-2 py-0.5">
                        <ModelIcon model={s.name} size={12} />
                        <span className="text-xs text-text-secondary">{s.label}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  user: AdminUserItem;
  onBack: () => void;
}

export function UserDetail({ user, onBack }: Props) {
  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ['balance', 'user', user.id],
    queryFn: () => fetchUserBalance(user.id),
  });

  const { data: usage, isLoading: loadingUsage } = useQuery({
    queryKey: ['usage', 'user', user.id],
    queryFn: () => fetchUserUsageDetailV2(user.id),
  });

  const { data: subsData, isLoading: loadingSubs } = useQuery({
    queryKey: ['subscriptions', 'user', user.id],
    queryFn: () => fetchSubscriptions({ entityType: 'user', entityId: user.id, limit: '5' }),
  });

  const activeSub = subsData?.subscriptions.find((s) => s.status === 'active');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-base font-semibold text-text-primary">{user.name}</h2>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">{user.role}</Badge>
          <Badge variant="outline" className="text-xs">{user.provider}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Coins className="h-3.5 w-3.5" />
              <p className="text-xs">Saldo atual</p>
            </div>
            {loadingBalance ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-semibold text-text-primary">
                {formatUsd(balance?.tokenCredits ?? 0)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">créditos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart2 className="h-3.5 w-3.5" />
              <p className="text-xs">Total gasto</p>
            </div>
            {loadingUsage ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-semibold text-text-primary">
                {formatUsd(usage?.total.tokenValue ?? 0)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">créditos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="mb-1 text-xs text-muted-foreground">Transações</p>
            {loadingUsage ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-xl font-semibold text-text-primary">
                {usage?.total.transactions ?? 0}
              </p>
            )}
            <p className="text-xs text-muted-foreground">total</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="mb-1 text-xs text-muted-foreground">Membro desde</p>
            <p className="text-xl font-semibold text-text-primary">{formatRelative(user.createdAt)}</p>
            <p className="text-xs text-muted-foreground">{formatDate(user.createdAt)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Cpu className="h-4 w-4" />Uso por modelo (30d)</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loadingUsage ? (
              <div className="space-y-px p-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
              </div>
            ) : (usage?.byModel ?? []).length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sem uso nos últimos 30 dias</p>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Assinatura ativa</CardTitle></CardHeader>
          <CardContent>
            {loadingSubs ? (
              <Skeleton className="h-16 w-full" />
            ) : activeSub ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize text-text-primary">{activeSub.plan}</span>
                  <Badge variant="success" className="text-xs">Ativa</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatUsd(activeSub.creditsPerCycle)} / {activeSub.cycleIntervalDays}d
                </p>
                <p className="text-xs text-muted-foreground">
                  Próximo ciclo: {formatDate(activeSub.nextRefillAt)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem assinatura ativa</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" />Chats com maior consumo (30d)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loadingUsage ? (
            <div className="space-y-px p-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
            </div>
          ) : (usage?.byConversation ?? []).length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sem conversas com custo nos últimos 30 dias</p>
          ) : (
            <div className="divide-y divide-border">
              {(usage?.byConversation ?? []).map((c) => (
                <div key={c.conversationId} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    {c.agentId ? <AgentIcon size={18} /> : c.model ? <ModelIcon model={c.model} size={18} /> : null}
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text-primary">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.model ? cleanModelName(c.model) : '—'}{c.agentId ? ' · via agente' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <span className="text-sm font-medium text-text-primary">{formatUsd(c.tokenValue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ModelAccessCard userId={user.id} />
    </div>
  );
}
