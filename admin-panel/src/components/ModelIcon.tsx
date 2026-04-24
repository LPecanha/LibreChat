import { modelProvider, PROVIDER_COLORS, PROVIDER_ICON_DATA } from '~/lib/models';

interface Props {
  model: string;
  size?: number;
  isAgent?: boolean;
}

function ProviderSvg({ iconKey, size }: { iconKey: keyof typeof PROVIDER_ICON_DATA; size: number }) {
  const { path, vw, vh } = PROVIDER_ICON_DATA[iconKey];
  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} width={size} height={size} aria-hidden="true">
      <path d={path} fill="white" />
    </svg>
  );
}

export function ModelIcon({ model, size = 20, isAgent = false }: Props) {
  const provider = isAgent ? 'unknown' : modelProvider(model);
  const color = isAgent ? '#6366f1' : PROVIDER_COLORS[provider];
  const innerSize = Math.round(size * 0.6);

  return (
    <span
      title={model}
      style={{ background: color, width: size, height: size }}
      className="inline-flex shrink-0 items-center justify-center rounded-full"
    >
      <ProviderSvg iconKey={provider} size={innerSize} />
    </span>
  );
}

export function AgentIcon({ size = 20 }: { size?: number }) {
  const innerSize = Math.round(size * 0.6);
  return (
    <span
      style={{ background: '#6366f1', width: size, height: size }}
      className="inline-flex shrink-0 items-center justify-center rounded-full"
    >
      <ProviderSvg iconKey="agent" size={innerSize} />
    </span>
  );
}
