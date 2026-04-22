import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { RevenuePoint } from '~/lib/api';

function labelFromPoint(p: RevenuePoint): string {
  if (p.day) return `${p.day}/${p.month}`;
  if (p.month) return `${p.month}/${p.year}`;
  return `S${p.week}`;
}

function formatBrl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function RevenueOverTime({ data }: { data: RevenuePoint[] }) {
  const chartData = data.map((p) => ({ label: labelFromPoint(p), amount: p.totalAmount, count: p.transactionCount }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={40}
          tickFormatter={(v: number) => `R$${(v / 100).toFixed(0)}`} />
        <Tooltip
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          formatter={(v: number) => [formatBrl(v), 'Receita']}
        />
        <Bar dataKey="amount" fill="#6366f1" radius={[3, 3, 0, 0]} name="Receita" />
      </BarChart>
    </ResponsiveContainer>
  );
}
