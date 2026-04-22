import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Coins, BarChart2, Cpu, MessageSquare } from 'lucide-react';
import { fetchUserBalance, fetchUserUsageDetailV2, fetchSubscriptions } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { formatUsd, formatDate, formatRelative } from '~/lib/utils';
import type { AdminUserItem } from '~/lib/api';

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
                    <span className="text-sm text-text-primary truncate max-w-[160px]">{m.model}</span>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-primary">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.model ?? '—'}{c.agentId ? ' · via agente' : ''}
                    </p>
                  </div>
                  <div className="ml-4 text-right shrink-0">
                    <span className="text-sm font-medium text-text-primary">{formatUsd(c.tokenValue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
