import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import type { ModelUsage } from '~/lib/api';
import { BRAND_COLOR } from '~/lib/brand';
import { formatUsd } from '~/lib/utils';
import { cleanModelName, modelProvider, PROVIDER_COLORS } from '~/lib/models';

const PALETTE = [
  '#ab68ff', '#3b82f6', '#f59e0b', '#ef4444', '#6ee7b7',
  '#f97316', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#a78bfa',
  '#fb923c', '#34d399', '#60a5fa',
];

const COLORS = [BRAND_COLOR, ...PALETTE];

function compactUsd(tokenCredits: number): string {
  const usd = tokenCredits / 1_000_000;
  if (usd >= 1000) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(usd);
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usd);
}

interface TickProps {
  x: number;
  y: number;
  payload: { value: string };
}

function ModelTick({ x, y, payload }: TickProps) {
  const name = cleanModelName(payload.value);
  const provider = modelProvider(payload.value);
  const color = PROVIDER_COLORS[provider];
  const truncated = name.length > 17 ? `${name.slice(0, 17)}…` : name;
  const r = 8;
  const iconSize = 12;

  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={-10} cy={0} r={r} fill={color} />
      {/* SVG <image> is required here — HTML <img> is invalid inside SVG context */}
      <image
        href={`/icons/${provider}.svg`}
        x={-10 - iconSize / 2}
        y={-iconSize / 2}
        width={iconSize}
        height={iconSize}
        style={{ filter: 'brightness(0) invert(1)' }}
      />
      <text x={-22} dy="0.35em" textAnchor="end" fontSize={11} fill="hsl(var(--muted-foreground))">
        {truncated}
      </text>
    </g>
  );
}

interface Props {
  data: ModelUsage[];
}

export function ModelDistribution({ data }: Props) {
  const chartData = [...data]
    .filter((d) => d.model && d.model !== 'unknown' && d.model !== 'null')
    .sort((a, b) => b.tokenValue - a.tokenValue)
    .slice(0, 15)
    .map((d) => ({ name: cleanModelName(d.model), raw: d.model, value: d.tokenValue }));

  const chartHeight = Math.max(180, chartData.length * 34 + 40);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 90, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={170}
          tick={(props) => <ModelTick {...props} />}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={false}
          formatter={(v: number) => [formatUsd(v), 'consumo']}
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 12,
            color: 'hsl(var(--foreground))',
          }}
          itemStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v: number) => compactUsd(v)}
            style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          {chartData.map((entry, i) => (
            <Cell key={entry.raw} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
