import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Coins, Activity, TrendingUp, Bot, MessageSquare, DollarSign,
  RefreshCw, Wallet, ChevronDown,
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
  fetchUserUsageDetailV2,
} from '~/lib/api';
import type { UserUsage } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Button } from '~/components/ui/button';
import { UsageOverTime } from '~/components/charts/UsageOverTime';
import { ModelDistribution } from '~/components/charts/ModelDistribution';
import { RevenueOverTime } from '~/components/charts/RevenueOverTime';
import { ModelIcon } from '~/components/ModelIcon';
import { formatUsd, cn } from '~/lib/utils';
import { cleanModelName, resolveAvatarUrl } from '~/lib/models';

// ── Date range helpers ─────────────────────────────────────────────────────────

type Preset = '7d' | '30d' | '90d' | 'month' | 'lastMonth' | 'custom';
interface DateRange { from: string; to: string; }

function toIso(d: Date): string { return d.toISOString().slice(0, 10); }

function presetToRange(preset: Exclude<Preset, 'custom'>): DateRange {
  const now = new Date();
  const to = toIso(now);
  if (preset === '7d') return { from: toIso(new Date(now.getTime() - 7 * 86_400_000)), to };
  if (preset === '90d') return { from: toIso(new Date(now.getTime() - 90 * 86_400_000)), to };
  if (preset === 'month') return { from: toIso(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  if (preset === 'lastMonth') {
    const firstOfLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastOfLast = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toIso(firstOfLast), to: toIso(lastOfLast) };
  }
  return { from: toIso(new Date(now.getTime() - 30 * 86_400_000)), to };
}

function periodForRange(from: string, to: string): string {
  const days = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);
  return days > 90 ? 'month' : 'day';
}

function rangeLabel(preset: Preset, range: DateRange): string {
  if (preset === '7d') return 'últimos 7 dias';
  if (preset === '30d') return 'últimos 30 dias';
  if (preset === '90d') return 'últimos 90 dias';
  if (preset === 'month') return 'este mês';
  if (preset === 'lastMonth') return 'mês anterior';
  const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
  return `${fmt.format(new Date(range.from + 'T12:00:00'))} – ${fmt.format(new Date(range.to + 'T12:00:00'))}`;
}

// ── Date filter component ──────────────────────────────────────────────────────

const PRESETS: { key: Preset; label: string }[] = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
  { key: 'month', label: 'Este mês' },
  { key: 'lastMonth', label: 'Mês anterior' },
  { key: 'custom', label: 'Personalizado' },
];

function DateFilter({
  preset, range, onPreset, onRange,
}: {
  preset: Preset;
  range: DateRange;
  onPreset: (p: Preset) => void;
  onRange: (r: DateRange) => void;
}) {
  const [customFrom, setCustomFrom] = useState(range.from);
  const [customTo, setCustomTo] = useState(range.to);
  const today = toIso(new Date());

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onPreset(key)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            preset === key
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          {label}
        </button>
      ))}
      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            max={today}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            size="sm"
            onClick={() => { if (customFrom && customTo && customFrom <= customTo) onRange({ from: customFrom, to: customTo }); }}
            disabled={!customFrom || !customTo || customFrom > customTo}
          >
            Aplicar
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────────────────────

function StatCard({
  title, value, icon: Icon, loading, sub,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  loading: boolean;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-semibold text-text-primary sm:text-2xl">{value}</p>
            )}
            {sub && !loading && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
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

// ── User row with expandable conversations ─────────────────────────────────────

function ExpandableUserRow({
  u, range, expanded, onToggle,
}: {
  u: UserUsage;
  range: DateRange;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['usage', 'user-detail', u.userId, range],
    queryFn: () => fetchUserUsageDetailV2(u.userId, { from: range.from, to: range.to }),
    enabled: expanded,
  });

  const avatar = resolveAvatarUrl(u.avatar);

  return (
    <div>
      <div
        onClick={onToggle}
        className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-hover"
      >
        <div className="flex items-center gap-3 min-w-0">
          {avatar ? (
            <img src={avatar} alt={u.name} className="h-7 w-7 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {u.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">{u.name}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-medium text-text-primary">{formatUsd(u.tokenValue)}</p>
            <p className="text-xs text-muted-foreground">{u.transactions} tx</p>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
        </div>
      </div>

      {expanded && (
        <div className="mb-1 ml-10 border-l border-border pl-3">
          {isLoading ? (
            <div className="space-y-1.5 py-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !detail?.byConversation.length ? (
            <p className="py-2 text-xs text-muted-foreground">Sem conversas no período</p>
          ) : (
            <div className="divide-y divide-border">
              {detail.byConversation.map((c) => (
                <div key={c.conversationId} className="flex items-center justify-between py-2">
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    {c.model && <ModelIcon model={c.model} size={16} />}
                    <p className="truncate text-xs text-text-primary">{c.title}</p>
                  </div>
                  <div className="ml-2 shrink-0 text-right">
                    <p className="text-xs font-medium text-text-primary">{formatUsd(c.tokenValue)}</p>
                    <p className="text-xs text-muted-foreground">{c.transactions} msgs</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export function Dashboard() {
  const [preset, setPreset] = useState<Preset>('30d');
  const [range, setRange] = useState<DateRange>(presetToRange('30d'));
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  function handlePreset(p: Preset) {
    setPreset(p);
    if (p !== 'custom') setRange(presetToRange(p as Exclude<Preset, 'custom'>));
  }

  const period = periodForRange(range.from, range.to);
  const label = rangeLabel(preset, range);

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['usage', 'summary', range],
    queryFn: () => fetchUsageSummary(range),
  });

  const { data: overTime, isLoading: loadingOverTime } = useQuery({
    queryKey: ['usage', 'over-time', range],
    queryFn: () => fetchUsageOverTime({ period, from: range.from, to: range.to }),
  });

  const { data: byModel } = useQuery({
    queryKey: ['usage', 'by-model', range],
    queryFn: () => fetchUsageByModel(range),
  });

  const { data: topUsers } = useQuery({
    queryKey: ['usage', 'by-user', range],
    queryFn: () => fetchUsageByUser({ limit: '5', ...range }),
  });

  const { data: topAgents } = useQuery({
    queryKey: ['usage', 'by-agent', range],
    queryFn: () => fetchUsageByAgent({ limit: '10', ...range }),
  });

  const { data: topConversations } = useQuery({
    queryKey: ['usage', 'by-conversation', range],
    queryFn: () => fetchUsageByConversation({ limit: '10', ...range }),
  });

  const { data: revenue, isLoading: loadingRevenue } = useQuery({
    queryKey: ['revenue', 'summary'],
    queryFn: () => fetchRevenueSummary(),
  });

  const { data: revenueOverTime, isLoading: loadingRevenueChart } = useQuery({
    queryKey: ['revenue', 'over-time', range],
    queryFn: () => fetchRevenueOverTime({ period, from: range.from, to: range.to }),
  });

  return (
    <div className="space-y-6 md:space-y-8">
      <DateFilter preset={preset} range={range} onPreset={handlePreset} onRange={setRange} />

      {/* Usage stats */}
      <section className="space-y-4">
        <SectionTitle>Uso de API — {label}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
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
            title="Saldo dos usuários"
            value={formatUsd(summary?.totalCreditsRemaining ?? 0)}
            icon={Wallet}
            loading={loadingSummary}
            sub="total atual de todos os saldos"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Uso ao longo do tempo — {label}</CardTitle>
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
            <CardTitle className="text-sm">Consumo por modelo — {label}</CardTitle>
          </CardHeader>
          <CardContent>
            {!byModel ? (
              <Skeleton className="h-[220px] w-full" />
            ) : byModel.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período</p>
            ) : (
              <ModelDistribution data={byModel} />
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top usuários por consumo</CardTitle>
            </CardHeader>
            <CardContent>
              {!topUsers ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {topUsers.map((u) => (
                    <ExpandableUserRow
                      key={u.userId}
                      u={u}
                      range={range}
                      expanded={expandedUserId === u.userId}
                      onToggle={() => setExpandedUserId(expandedUserId === u.userId ? null : u.userId)}
                    />
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
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : topAgents.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Nenhum agente com uso registrado</p>
              ) : (
                <div className="space-y-1">
                  {topAgents.map((a) => (
                    <div key={a.agentId} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-hover">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">{a.name}</p>
                        <div className="flex items-center gap-1.5">
                          {a.model && <ModelIcon model={a.model} size={14} />}
                          <p className="truncate text-xs text-muted-foreground">
                            {a.model ? cleanModelName(a.model) : '—'} · {a.conversationCount} conversas · {a.uniqueUsers} usuários
                          </p>
                        </div>
                      </div>
                      <div className="ml-2 shrink-0 text-right">
                        <p className="text-sm font-medium text-text-primary">{formatUsd(a.tokenValue)}</p>
                        <p className="text-xs text-muted-foreground">{a.transactions} tx</p>
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
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : topConversations.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhuma conversa com custo registrado</p>
            ) : (
              <div className="divide-y divide-border">
                {topConversations.map((c) => (
                  <div key={c.conversationId} className="flex items-center justify-between px-1 py-2.5 hover:bg-surface-hover">
                    <div className="min-w-0 flex-1 flex items-start gap-2">
                      {c.model && <ModelIcon model={c.model} size={18} />}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">{c.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.userName}
                          {c.model && ` · ${cleanModelName(c.model)}`}
                          {c.agentId && ' · via agente'}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 shrink-0 text-right">
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

        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
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
              <CardTitle className="text-sm">Receita ao longo do tempo — {label}</CardTitle>
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
