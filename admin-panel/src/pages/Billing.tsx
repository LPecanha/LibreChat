import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Zap, X, CheckCircle, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '~/hooks/useToast';
import {
  fetchSubscriptions,
  fetchPaymentHistory,
  createSubscription,
  cancelSubscription,
  fetchCreditPlans,
} from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { formatUsd, formatDate } from '~/lib/utils';
import type { Subscription } from '~/lib/api';

const STATUS_VARIANTS: Record<Subscription['status'], 'success' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'success',
  paused: 'secondary',
  cancelled: 'destructive',
  past_due: 'outline',
};

const STATUS_LABELS: Record<Subscription['status'], string> = {
  active: 'Ativa',
  paused: 'Pausada',
  cancelled: 'Cancelada',
  past_due: 'Vencida',
};

const PAYMENT_STATUS_ICONS = {
  completed: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  pending: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  failed: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
  refunded: <AlertCircle className="h-3.5 w-3.5 text-gray-400" />,
};

function NewSubscriptionForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [entityType, setEntityType] = useState<'user' | 'group'>('user');
  const [entityId, setEntityId] = useState('');
  const [plan, setPlan] = useState('pro');
  const [credits, setCredits] = useState('');
  const [days, setDays] = useState('30');

  const { data: plansData } = useQuery({ queryKey: ['plans'], queryFn: fetchCreditPlans });

  const mutation = useMutation({
    mutationFn: () =>
      createSubscription({
        entityType,
        entityId,
        plan,
        creditsPerCycle: parseInt(credits || '0', 10),
        cycleIntervalDays: parseInt(days, 10),
        paymentProvider: 'manual',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ variant: 'success', title: 'Assinatura criada' });
      onClose();
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao criar assinatura', description: err.message });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">Nova Assinatura</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            variant={entityType === 'user' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEntityType('user')}
          >Usuário</Button>
          <Button
            variant={entityType === 'group' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEntityType('group')}
          >Organização</Button>
        </div>

        <Input
          placeholder={entityType === 'user' ? 'ID do usuário' : 'ID do grupo'}
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
        />

        <div className="flex gap-2">
          <div className="flex-1">
            <p className="mb-1 text-xs text-muted-foreground">Plano</p>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={plan}
              onChange={(e) => {
                setPlan(e.target.value);
                const p = plansData?.find((x) => x.id === e.target.value);
                if (p) setCredits(String(p.credits));
              }}
            >
              {(plansData ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {formatUsd(p.credits)} créditos</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <p className="mb-1 text-xs text-muted-foreground">Créditos/ciclo</p>
            <Input value={credits} onChange={(e) => setCredits(e.target.value)} type="number" />
          </div>
          <div className="w-24">
            <p className="mb-1 text-xs text-muted-foreground">Intervalo (dias)</p>
            <Input value={days} onChange={(e) => setDays(e.target.value)} type="number" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            disabled={!entityId || !credits || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Criando…' : 'Criar Assinatura'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const SUB_PAGE = 20;
const HIST_PAGE = 20;

export function Billing() {
  const qc = useQueryClient();
  const [showNewSub, setShowNewSub] = useState(false);
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'history'>('subscriptions');
  const [subOffset, setSubOffset] = useState(0);
  const [histOffset, setHistOffset] = useState(0);

  const { data: subsData, isLoading: loadingSubs } = useQuery({
    queryKey: ['subscriptions', subOffset],
    queryFn: () => fetchSubscriptions({ limit: String(SUB_PAGE), offset: String(subOffset) }),
    keepPreviousData: true,
  });

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['payment-history', histOffset],
    queryFn: () => fetchPaymentHistory({ limit: String(HIST_PAGE), offset: String(histOffset) }),
    enabled: activeTab === 'history',
    keepPreviousData: true,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelSubscription(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ variant: 'success', title: 'Assinatura cancelada' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao cancelar', description: err.message });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Faturamento</h2>
          <p className="text-sm text-muted-foreground">Assinaturas e histórico de pagamentos</p>
        </div>
        <Button size="sm" onClick={() => setShowNewSub(!showNewSub)}>
          <Plus className="mr-1 h-4 w-4" />Nova Assinatura
        </Button>
      </div>

      {showNewSub && <NewSubscriptionForm onClose={() => setShowNewSub(false)} />}

      <div className="flex gap-1 border-b border-border">
        {(['subscriptions', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-primary font-medium text-text-primary'
                : 'text-muted-foreground hover:text-text-primary'
            }`}
          >
            {tab === 'subscriptions' ? 'Assinaturas' : 'Pagamentos'}
          </button>
        ))}
      </div>

      {activeTab === 'subscriptions' && (<>
        <Card>
          <CardContent className="p-0">
            {loadingSubs ? (
              <div className="space-y-px p-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
              </div>
            ) : (subsData?.subscriptions ?? []).length === 0 ? (
              <div className="flex h-40 items-center justify-center">
                <div className="text-center">
                  <Zap className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nenhuma assinatura ativa</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {(subsData?.subscriptions ?? []).map((sub) => (
                  <div key={sub._id} className="flex items-center justify-between px-4 py-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary capitalize">{sub.plan}</span>
                        <Badge variant={STATUS_VARIANTS[sub.status]} className="text-xs">
                          {STATUS_LABELS[sub.status]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{sub.entityType}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatUsd(sub.creditsPerCycle)} / {sub.cycleIntervalDays}d
                        {' · '}próximo em {formatDate(sub.nextRefillAt)}
                      </p>
                    </div>
                    {sub.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(sub._id)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {(() => {
          const total = subsData?.total ?? 0;
          const hasPrev = subOffset > 0;
          const hasNext = subOffset + SUB_PAGE < total;
          if (!hasPrev && !hasNext) return null;
          return (
            <div className="flex items-center justify-between text-sm">
              <button onClick={() => setSubOffset((o) => Math.max(0, o - SUB_PAGE))} disabled={!hasPrev} className="flex items-center gap-1 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-surface-hover hover:text-text-primary disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />Anterior
              </button>
              <span className="text-muted-foreground">{subOffset + 1}–{Math.min(subOffset + SUB_PAGE, total)} de {total}</span>
              <button onClick={() => setSubOffset((o) => o + SUB_PAGE)} disabled={!hasNext} className="flex items-center gap-1 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-surface-hover hover:text-text-primary disabled:opacity-40">
                Próxima<ChevronRight className="h-4 w-4" />
              </button>
            </div>
          );
        })()}
      </>)}

      {activeTab === 'history' && (<>

        <Card>
          <CardContent className="p-0">
            {loadingHistory ? (
              <div className="space-y-px p-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
              </div>
            ) : (historyData?.transactions ?? []).length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Nenhum pagamento registrado
              </div>
            ) : (
              <div className="divide-y divide-border">
                {(historyData?.transactions ?? []).map((txn) => (
                  <div key={txn._id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      {PAYMENT_STATUS_ICONS[txn.status]}
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {(txn.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: txn.currency })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {txn.provider} · {formatDate(txn.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-text-primary">+{formatUsd(txn.creditsGranted)}</p>
                      <p className="text-xs text-muted-foreground">em créditos de API</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {(() => {
          const total = historyData?.total ?? 0;
          const hasPrev = histOffset > 0;
          const hasNext = histOffset + HIST_PAGE < total;
          if (!hasPrev && !hasNext) return null;
          return (
            <div className="flex items-center justify-between text-sm">
              <button onClick={() => setHistOffset((o) => Math.max(0, o - HIST_PAGE))} disabled={!hasPrev} className="flex items-center gap-1 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-surface-hover hover:text-text-primary disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />Anterior
              </button>
              <span className="text-muted-foreground">{histOffset + 1}–{Math.min(histOffset + HIST_PAGE, total)} de {total}</span>
              <button onClick={() => setHistOffset((o) => o + HIST_PAGE)} disabled={!hasNext} className="flex items-center gap-1 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-surface-hover hover:text-text-primary disabled:opacity-40">
                Próxima<ChevronRight className="h-4 w-4" />
              </button>
            </div>
          );
        })()}
      </>)}
    </div>
  );
}
