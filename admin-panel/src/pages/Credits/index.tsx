import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronDown, ChevronUp, Package, CalendarClock, Trash2 } from 'lucide-react';
import {
  searchUsers,
  fetchUserBalance,
  adjustUserCredits,
  fetchCreditAudit,
  fetchSubscriptions,
  createSubscription,
  cancelSubscription,
  fetchCreditPlans,
} from '~/lib/api';
import { toast } from '~/hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { Badge } from '~/components/ui/badge';
import { formatUsd } from '~/lib/utils';
import type { AdminUserItem, CreditAuditEntry, Subscription } from '~/lib/api';

function AuditRow({ entry }: { entry: CreditAuditEntry }) {
  const positive = entry.amount > 0;
  const date = new Date(entry.createdAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-0 text-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate text-text-primary">{entry.reason}</p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
      <Badge
        variant={positive ? 'default' : 'destructive'}
        className="shrink-0 tabular-nums"
      >
        {positive ? '+' : ''}{formatUsd(entry.amount)}
      </Badge>
    </div>
  );
}

function AuditLog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['credit-audit', userId, offset],
    queryFn: () => fetchCreditAudit({ entityId: userId, entityType: 'user', limit: String(LIMIT), offset: String(offset) }),
    enabled: open,
    keepPreviousData: true,
  });

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <button
          className="flex w-full items-center justify-between"
          onClick={() => setOpen((v) => !v)}
        >
          <CardTitle className="text-sm">Histórico de ajustes</CardTitle>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </CardHeader>

      {open && (
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !data?.entries.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum ajuste registrado</p>
          ) : (
            <>
              {data.entries.map((e) => <AuditRow key={e._id} entry={e} />)}
              {data.total > LIMIT && (
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{offset + 1}–{Math.min(offset + LIMIT, data.total)} de {data.total}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" disabled={offset === 0} onClick={() => setOffset((o) => o - LIMIT)}>
                      ‹ Anterior
                    </Button>
                    <Button size="sm" variant="ghost" disabled={offset + LIMIT >= data.total} onClick={() => setOffset((o) => o + LIMIT)}>
                      Próximo ›
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function SubscriptionSection({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newPlanId, setNewPlanId] = useState('');
  const [newCredits, setNewCredits] = useState('');
  const [newDays, setNewDays] = useState('30');

  const { data: subsData, isLoading } = useQuery({
    queryKey: ['subscriptions', userId],
    queryFn: () => fetchSubscriptions({ entityType: 'user', entityId: userId }),
  });

  const { data: plansData } = useQuery({
    queryKey: ['credit-plans'],
    queryFn: () => fetchCreditPlans(),
  });

  const createMutation = useMutation({
    mutationFn: () => createSubscription({
      entityType: 'user',
      entityId: userId,
      plan: newPlanId,
      creditsPerCycle: Math.round(parseFloat(newCredits) * 1_000_000),
      cycleIntervalDays: parseInt(newDays, 10),
      paymentProvider: 'manual',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions', userId] });
      toast({ variant: 'success', title: 'Plano criado', description: 'Assinatura ativada com sucesso.' });
      setShowCreate(false);
      setNewPlanId('');
      setNewCredits('');
      setNewDays('30');
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao criar plano', description: err.message });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelSubscription(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions', userId] });
      toast({ variant: 'success', title: 'Assinatura cancelada' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao cancelar', description: err.message });
    },
  });

  const activeSubs = (subsData?.subscriptions ?? []).filter((s) => s.status === 'active');

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Plano / Assinatura</CardTitle>
          </div>
          {!showCreate && (
            <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
              + Novo plano
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : activeSubs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma assinatura ativa.</p>
        ) : (
          activeSubs.map((sub) => <ActiveSubCard key={sub._id} sub={sub} onCancel={() => cancelMutation.mutate(sub._id)} cancelling={cancelMutation.isPending} />)
        )}

        {showCreate && (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-text-primary">Novo plano manual</p>
            <select
              className="w-full rounded-md border border-border bg-surface-secondary px-3 py-1.5 text-sm text-text-primary"
              value={newPlanId}
              onChange={(e) => {
                const id = e.target.value;
                setNewPlanId(id);
                const plan = plansData?.find((p) => p.id === id);
                if (plan) setNewCredits(String(plan.credits / 1_000_000));
              }}
            >
              <option value="">Selecione um plano…</option>
              {(plansData ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {formatUsd(p.credits)}</option>
              ))}
              <option value="custom">Personalizado</option>
            </select>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Créditos/ciclo em USD (ex: 15)"
                value={newCredits}
                onChange={(e) => setNewCredits(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Dias"
                value={newDays}
                onChange={(e) => setNewDays(e.target.value)}
                className="w-24"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!newPlanId || !newCredits || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? 'Criando…' : 'Criar'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveSubCard({ sub, onCancel, cancelling }: { sub: Subscription; onCancel: () => void; cancelling: boolean }) {
  const periodEnd = new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR');
  const nextRefill = new Date(sub.nextRefillAt).toLocaleDateString('pt-BR');

  return (
    <div className="rounded-lg border border-border p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold capitalize text-text-primary">{sub.plan}</span>
        <Badge variant="default" className="text-xs">{sub.status}</Badge>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="h-3 w-3" />
        Próximo ciclo: {nextRefill} · Fim do período: {periodEnd}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatUsd(sub.creditsPerCycle)} / {sub.cycleIntervalDays} dias
        </span>
        <button
          onClick={onCancel}
          disabled={cancelling}
          className="flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" />
          Cancelar
        </button>
      </div>
    </div>
  );
}

function UserBalancePanel({ user }: { user: AdminUserItem }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const { data: balance, isLoading } = useQuery({
    queryKey: ['balance', 'user', user.id],
    queryFn: () => fetchUserBalance(user.id),
  });

  const adjustMutation = useMutation({
    mutationFn: () => adjustUserCredits(user.id, Math.round(parseFloat(amount) * 1_000_000), reason),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['balance', 'user', user.id] });
      qc.invalidateQueries({ queryKey: ['credit-audit', user.id] });
      toast({
        variant: 'success',
        title: 'Saldo atualizado',
        description: `Novo saldo: ${formatUsd(res.tokenCredits)}`,
      });
      setAmount('');
      setReason('');
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao ajustar', description: err.message });
    },
  });

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-9 w-9 rounded-full" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {user.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-text-primary">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <div className="rounded-lg bg-muted px-4 py-3">
              <p className="text-xs text-muted-foreground">Saldo atual</p>
              <p className="text-2xl font-semibold text-text-primary">
                {formatUsd(balance?.tokenCredits ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">em créditos de API</p>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Valor em USD (ex: 10.00 ou -5.00)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-44"
            />
            <Input
              placeholder="Motivo"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!amount || adjustMutation.isPending}
              onClick={() => adjustMutation.mutate()}
            >
              {adjustMutation.isPending ? 'Salvando…' : 'Ajustar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <SubscriptionSection userId={user.id} />
      <AuditLog userId={user.id} />
    </div>
  );
}

export function Credits() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminUserItem | null>(null);

  const { data: searchResult } = useQuery({
    queryKey: ['users', 'search', search],
    queryFn: () => searchUsers(search),
    enabled: search.length >= 2,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Gestão de Créditos</h2>
        <p className="text-sm text-muted-foreground">Ajuste o saldo de créditos por usuário</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar usuário por nome ou email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(null);
              }}
              className="pl-9"
            />
          </div>

          {search.length >= 2 && (
            <Card>
              <CardContent className="p-1">
                {(searchResult?.users ?? []).map((u) => (
                  <button
                    key={u.id}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
                    onClick={() => setSelected(u)}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </button>
                ))}
                {searchResult?.users.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">Nenhum usuário encontrado</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          {selected ? (
            <UserBalancePanel user={selected} />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              Selecione um usuário para ajustar créditos
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
