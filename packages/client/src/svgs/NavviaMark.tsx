import React from 'react';

/**
 * [EXT] Navvia mark (icon-only, square).
 *
 * Renderiza o "n" inicial em quadrado com gradiente Navvia (#2469E2 → #11B38D).
 * Versão compacta do logo para uso em sidebars colapsadas, favicons, badges.
 *
 * Props:
 * - `size`: número em pixels (default 24).
 * - `className`: classes extra.
 */

type NavviaMarkProps = {
  size?: number;
  className?: string;
  'aria-label'?: string;
};

export default function NavviaMark({
  size = 24,
  className,
  'aria-label': ariaLabel = 'Navvia',
}: NavviaMarkProps) {
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="navviaMarkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2469e2" />
          <stop offset="1" stopColor="#11b38d" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#navviaMarkGrad)" />
      <text
        x="50"
        y="72"
        textAnchor="middle"
        fontFamily="Inter Tight, Inter, sans-serif"
        fontWeight="800"
        fontSize="78"
        fill="#ffffff"
        letterSpacing="-2"
      >
        n
      </text>
    </svg>
  );
}
