import React, { forwardRef } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';

/**
 * [EXT] Wrapper para ícones lucide-react com padrões de densidade Navvia.
 *
 * Padroniza:
 * - `size` → mapeia de tokens semânticos (xs/sm/md/lg/xl) para px
 * - `strokeWidth` default 1.75 (visualmente alinhado com 87 SVGs custom do projeto)
 * - `aria-hidden` true por default (ícones decorativos); o pai define accessible name
 *
 * Uso:
 *   import { Settings } from 'lucide-react';
 *   import Icon from '~/components/svg/Icon';
 *   <Icon as={Settings} />            // 16px (md)
 *   <Icon as={Settings} size="sm" />  // 14px
 *   <Icon as={Settings} size="lg" />  // 20px, strokeWidth 1.5
 *
 * O componente NÃO impede passar props avulsos (color, className) — apenas
 * adiciona defaults sensatos. Para ícones interativos use o `aria-label` no
 * <button> que envolve.
 */

const SIZE_MAP = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

type IconSize = keyof typeof SIZE_MAP;

export interface IconProps extends Omit<LucideProps, 'size'> {
  as: LucideIcon;
  size?: IconSize | number;
}

const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { as: Component, size = 'md', strokeWidth, ...props },
  ref,
) {
  const pxSize = typeof size === 'number' ? size : SIZE_MAP[size];
  // Tamanhos ≥ 20 → traço mais fino (1.5) pra evitar peso visual; menores → 1.75
  const stroke = strokeWidth ?? (pxSize >= 20 ? 1.5 : 1.75);
  return (
    <Component
      ref={ref}
      size={pxSize}
      strokeWidth={stroke}
      aria-hidden={props['aria-label'] ? undefined : true}
      {...props}
    />
  );
});

export default Icon;
