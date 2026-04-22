import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ModelUsage } from '~/lib/api';
import { formatUsd } from '~/lib/utils';

const COLORS = [
  '#10a37f', '#ab68ff', '#3b82f6', '#f59e0b', '#ef4444', '#6ee7b7',
  '#f97316', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#a78bfa',
  '#fb923c', '#34d399', '#60a5fa',
];

interface Props {
  data: ModelUsage[];
}

export function ModelDistribution({ data }: Props) {
  const chartData = [...data]
    .sort((a, b) => b.tokenValue - a.tokenValue)
    .slice(0, 15)
    .map((d) => ({ name: d.model ?? 'unknown', value: d.tokenValue }));

  const chartHeight = Math.max(180, chartData.length * 30 + 40);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(v: number) => [formatUsd(v), 'consumo']}
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
