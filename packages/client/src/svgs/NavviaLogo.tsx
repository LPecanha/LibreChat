import React from 'react';

/**
 * [EXT] Navvia wordmark logo.
 *
 * Renderiza o logo oficial da Navvia (wordmark "navvia") com o gradiente
 * azul → verde-água da marca (#2469E2 → #11B38D).
 *
 * Props:
 * - `size`: 'sm' (16px), 'md' (22px), 'lg' (28px), 'xl' (36px). Default 'md'.
 * - `className`: classes extra (ex.: posicionamento, espaçamento).
 *
 * O viewBox é 432 × 104.6, então width auto-escala proporcionalmente
 * (ratio ≈ 4.13:1). Em sizes pré-definidos a width é calculada e setada
 * explicitamente para evitar SVG expandindo sem limite em containers flex.
 *
 * Uso típico:
 *   <NavviaLogo />                  // 22px tall (default)
 *   <NavviaLogo size="lg" />        // 28px tall
 *   <NavviaLogo className="opacity-80" />
 */

const SIZES = {
  sm: { h: 16, w: 66 },
  md: { h: 22, w: 91 },
  lg: { h: 28, w: 116 },
  xl: { h: 36, w: 149 },
} as const;

type NavviaLogoProps = {
  size?: keyof typeof SIZES;
  className?: string;
  'aria-label'?: string;
};

export default function NavviaLogo({
  size = 'md',
  className,
  'aria-label': ariaLabel = 'Navvia',
}: NavviaLogoProps) {
  const { h, w } = SIZES[size];
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={w}
      height={h}
      viewBox="0 0 432 104.6"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="navviaWordmarkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2469e2" />
          <stop offset="1" stopColor="#11b38d" />
        </linearGradient>
      </defs>
      <g fill="url(#navviaWordmarkGrad)">
        <path d="M0,103.2V5h20.3l43.5,69.4h1.1c-.4-9.7-.6-18.1-.6-27.1V4.9h18.6v98.2h-20.4L19,33.7h-1c.4,9.8.6,18,.6,27.1v42.4H0Z" />
        <path d="M163.9,65.6c0,12.6,0,25,.7,37.6h-16.4l-1.5-12.2h-1.2c-4.4,9-12,13.6-23.1,13.6s-22.7-8.4-22.7-21.3,9.7-21.9,28.9-23l17.4-1v-2.7c0-8.6-6.4-12.2-13.8-12.2s-13.3,3.9-15.6,11.2l-16-4.3c2.5-13.5,14.5-21,31.6-21s31.8,9.7,31.8,25.7v9.7l-.1-.1ZM146,71l-13.1.8c-9.9.7-15.3,3.2-15.3,10s4,8.7,10.5,8.7c9.7,0,17.4-7.7,18-19.5h-.1Z" />
        <path d="M198.9,103.2l-24.4-71.5h19.3l16.3,54.6h1l16.2-54.6h18.9l-24.6,71.5h-22.7Z" />
        <path d="M274.7,103.2l-24.4-71.5h19.3l16.3,54.6h1l16.2-54.6h18.9l-24.6,71.5h-22.7,0Z" />
        <path d="M330.1,11.5c0-6.6,5.2-11.5,12-11.5s12,4.9,12,11.5-5.2,11.6-12,11.6-12-5-12-11.6ZM332.9,103.2V31.7h18.6v71.5h-18.6Z" />
        <path d="M431.3,65.6c0,12.6,0,25,.7,37.6h-16.4l-1.5-12.2h-1.2c-4.4,9-12,13.6-23.1,13.6s-22.7-8.4-22.7-21.3,9.7-21.9,28.9-23l17.4-1v-2.7c0-8.6-6.4-12.2-13.8-12.2s-13.3,3.9-15.6,11.2l-16-4.3c2.5-13.5,14.5-21,31.6-21s31.8,9.7,31.8,25.7v9.7l-.1-.1ZM413.4,71l-13.1.8c-9.9.7-15.3,3.2-15.3,10s4,8.7,10.5,8.7c9.7,0,17.4-7.7,18-19.5h-.1Z" />
      </g>
    </svg>
  );
}
