import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ModelUsage } from '~/lib/api';

const COLORS = ['#10a37f', '#ab68ff', '#3b82f6', '#f59e0b', '#ef4444', '#6ee7b7'];

interface Props {
  data: ModelUsage[];
}

export function ModelDistribution({ data }: Props) {
  const total = data.reduce((acc, d) => acc + d.tokenValue, 0);
  const chartData = data.map((d) => ({
    name: d.model,
    value: d.tokenValue,
    pct: total ? Math.round((d.tokenValue / total) * 100) : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => [v.toFixed(0), 'créditos']}
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
        />
        <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
