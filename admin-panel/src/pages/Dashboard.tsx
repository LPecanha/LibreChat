import { useQuery } from '@tanstack/react-query';
import {
  Users, Coins, Activity, TrendingUp, Bot, MessageSquare, DollarSign, RefreshCw,
} from 'lucide-react';
import {
  fetchUsageSummary,
  fetchUsageOverTime,
  fetchUsageByModel,
  fetchUsageByUser,
  fetchUsageByAgent,
  fetchUsageByConversation,
  fetchRevenueSummary,
  fetchRevenueOverTime,
} from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { UsageOverTime } from '~/components/charts/UsageOverTime';
import { ModelDistribution } from '~/components/charts/ModelDistribution';
import { RevenueOverTime } from '~/components/charts/RevenueOverTime';
import { formatUsd } from '~/lib/utils';

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  sub,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  loading: boolean;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-2xl font-semibold text-text-primary">{value}</p>
            )}
            {sub && !loading && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>;
}

function formatBrl(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['usage', 'summary'],
    queryFn: () => fetchUsageSummary(),
  });

  const { data: overTime, isLoading: loadingOverTime } = useQuery({
    queryKey: ['usage', 'over-time'],
    queryFn: () => fetchUsageOverTime({ period: 'day', days: '30' }),
  });

  const { data: byModel } = useQuery({
    queryKey: ['usage', 'by-model'],
    queryFn: () => fetchUsageByModel(),
  });

  const { data: topUsers } = useQuery({
    queryKey: ['usage', 'by-user'],
    queryFn: () => fetchUsageByUser({ limit: '5' }),
  });

  const { data: topAgents } = useQuery({
    queryKey: ['usage', 'by-agent'],
    queryFn: () => fetchUsageByAgent({ limit: '10' }),
  });

  const { data: topConversations } = useQuery({
    queryKey: ['usage', 'by-conversation'],
    queryFn: () => fetchUsageByConversation({ limit: '10' }),
  });

  const { data: revenue, isLoading: loadingRevenue } = useQuery({
    queryKey: ['revenue', 'summary'],
    queryFn: () => fetchRevenueSummary(),
  });

  const { data: revenueOverTime, isLoading: loadingRevenueChart } = useQuery({
    queryKey: ['revenue', 'over-time'],
    queryFn: () => fetchRevenueOverTime({ period: 'day', days: '30' }),
  });

  return (
    <div className="space-y-8">
      {/* Usage stats */}
      <section className="space-y-4">
        <SectionTitle>Uso de API</SectionTitle>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Consumo total"
            value={formatUsd(summary?.totalTokenValue ?? 0)}
            icon={Coins}
            loading={loadingSummary}
          />
          <StatCard
            title="Transações"
            value={new Intl.NumberFormat('pt-BR').format(summary?.totalTransactions ?? 0)}
            icon={Activity}
            loading={loadingSummary}
          />
          <StatCard
            title="Usuários ativos"
            value={String(summary?.uniqueActiveUsers ?? 0)}
            icon={Users}
            loading={loadingSummary}
          />
          <StatCard
            title="Saldo disponível"
            value={formatUsd(summary?.totalCreditsRemaining ?? 0)}
            icon={TrendingUp}
            loading={loadingSummary}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Uso nos últimos 30 dias</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingOverTime ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <UsageOverTime data={overTime ?? []} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Distribuição por modelo</CardTitle>
            </CardHeader>
            <CardContent>
              {!byModel ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <ModelDistribution data={byModel} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top usuários por consumo</CardTitle>
            </CardHeader>
            <CardContent>
              {!topUsers ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {topUsers.map((u) => (
                    <div key={u.userId} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-hover">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="h-7 w-7 rounded-full" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-text-primary">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-text-primary">{formatUsd(u.tokenValue)}</p>
                        <p className="text-xs text-muted-foreground">{u.transactions} transações</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Top agentes por consumo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!topAgents ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : topAgents.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Nenhum agente com uso registrado</p>
              ) : (
                <div className="space-y-2">
                  {topAgents.map((a) => (
                    <div key={a.agentId} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-hover">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.model ?? '—'} · {a.conversationCount} conversas · {a.uniqueUsers} usuários
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-text-primary">{formatUsd(a.tokenValue)}</p>
                        <p className="text-xs text-muted-foreground">{a.transactions} transações</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chats com maior consumo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!topConversations ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : topConversations.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhuma conversa com custo registrado</p>
            ) : (
              <div className="divide-y divide-border">
                {topConversations.map((c) => (
                  <div key={c.conversationId} className="flex items-center justify-between px-1 py-2.5 hover:bg-surface-hover">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.userName} · {c.model ?? '—'}
                        {c.agentId && ' · via agente'}
                      </p>
                    </div>
                    <div className="ml-4 text-right shrink-0">
                      <p className="text-sm font-medium text-text-primary">{formatUsd(c.tokenValue)}</p>
                      <p className="text-xs text-muted-foreground">{c.transactions} msgs</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Revenue stats */}
      <section className="space-y-4">
        <SectionTitle>Receita & Assinaturas</SectionTitle>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Receita total"
            value={formatBrl(revenue?.allTime.totalAmount ?? 0)}
            icon={DollarSign}
            loading={loadingRevenue}
            sub={`${revenue?.allTime.totalTransactions ?? 0} pagamentos`}
          />
          <StatCard
            title="Receita (30 dias)"
            value={formatBrl(revenue?.last30Days.totalAmount ?? 0)}
            icon={TrendingUp}
            loading={loadingRevenue}
            sub={`${revenue?.last30Days.totalTransactions ?? 0} pagamentos`}
          />
          <StatCard
            title="Assinaturas ativas"
            value={String(revenue?.subscriptions.active ?? 0)}
            icon={RefreshCw}
            loading={loadingRevenue}
            sub={revenue?.subscriptions.cancelled ? `${revenue.subscriptions.cancelled} canceladas` : undefined}
          />
          <StatCard
            title="Créditos vendidos"
            value={formatUsd(revenue?.allTime.totalCreditsGranted ?? 0)}
            icon={Coins}
            loading={loadingRevenue}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Receita nos últimos 30 dias</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRevenueChart ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <RevenueOverTime data={revenueOverTime ?? []} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Receita por provedor</CardTitle>
            </CardHeader>
            <CardContent>
              {!revenue ? (
                <Skeleton className="h-[220px] w-full" />
              ) : revenue.byProvider.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Sem dados de pagamento</p>
              ) : (
                <div className="space-y-3 pt-2">
                  {revenue.byProvider.map((p) => (
                    <div key={p.provider} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize text-text-primary">{p.provider}</span>
                        <span className="font-medium text-text-primary">{formatBrl(p.totalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{p.completedCount} concluídos · {p.failedCount} falhos</span>
                        {p.failureRate > 0 && (
                          <span className="text-amber-500">{(p.failureRate * 100).toFixed(1)}% falha</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
