import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { UsagePoint } from '~/lib/api';
import { BRAND_COLOR } from '~/lib/brand';

interface Props {
  data: UsagePoint[];
}

function labelFromPoint(p: UsagePoint): string {
  if (p.day) return `${p.day}/${p.month}`;
  if (p.month) return `${p.month}/${p.year}`;
  return `S${p.week}`;
}

export function UsageOverTime({ data }: Props) {
  const chartData = data.map((p) => ({ label: labelFromPoint(p), tokenValue: p.tokenValue, users: p.users }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="uvGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={BRAND_COLOR} stopOpacity={0.3} />
            <stop offset="95%" stopColor={BRAND_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Area type="monotone" dataKey="tokenValue" stroke={BRAND_COLOR} fill="url(#uvGrad)" strokeWidth={2} name="Créditos" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
