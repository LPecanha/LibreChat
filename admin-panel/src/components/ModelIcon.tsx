import { cleanModelName, modelProvider, PROVIDER_COLORS, PROVIDER_INITIALS } from '~/lib/models';

interface Props {
  model: string;
  size?: number;
}

export function ModelIcon({ model, size = 20 }: Props) {
  const provider = modelProvider(model);
  const color = PROVIDER_COLORS[provider];
  const letter = PROVIDER_INITIALS[provider][0];

  return (
    <span
      title={cleanModelName(model)}
      style={{ background: color, width: size, height: size, fontSize: Math.round(size * 0.44) }}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
    >
      {letter}
    </span>
  );
}
