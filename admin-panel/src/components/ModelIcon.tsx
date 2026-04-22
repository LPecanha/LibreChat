import { modelProvider, PROVIDER_COLORS } from '~/lib/models';

const PROVIDER_ICONS: Record<string, string> = {
  anthropic: '/icons/anthropic.svg',
  openai: '/icons/openai.svg',
  google: '/icons/google.svg',
  meta: '/icons/meta.svg',
  mistral: '/icons/mistral.svg',
  xai: '/icons/xai.svg',
  deepseek: '/icons/deepseek.svg',
  unknown: '/icons/agent.svg',
};

interface Props {
  model: string;
  size?: number;
  /** Pass true when model belongs to an agent (shows robot icon instead of LLM icon) */
  isAgent?: boolean;
}

export function ModelIcon({ model, size = 20, isAgent = false }: Props) {
  const provider = isAgent ? 'unknown' : modelProvider(model);
  const color = isAgent ? '#6366f1' : PROVIDER_COLORS[provider];
  const icon = isAgent ? '/icons/agent.svg' : (PROVIDER_ICONS[provider] ?? PROVIDER_ICONS.unknown);

  return (
    <span
      title={model}
      style={{ background: color, width: size, height: size, padding: Math.round(size * 0.18) }}
      className="inline-flex shrink-0 items-center justify-center rounded-full"
    >
      <img
        src={icon}
        style={{ width: '100%', height: '100%', filter: 'brightness(0) invert(1)' }}
        alt=""
        aria-hidden="true"
      />
    </span>
  );
}

/** Dedicated robot icon for agents (no model lookup needed). */
export function AgentIcon({ size = 20 }: { size?: number }) {
  return (
    <span
      style={{ background: '#6366f1', width: size, height: size, padding: Math.round(size * 0.18) }}
      className="inline-flex shrink-0 items-center justify-center rounded-full"
    >
      <img
        src="/icons/agent.svg"
        style={{ width: '100%', height: '100%', filter: 'brightness(0) invert(1)' }}
        alt=""
        aria-hidden="true"
      />
    </span>
  );
}
