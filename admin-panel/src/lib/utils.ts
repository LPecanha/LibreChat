import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** @deprecated use formatUsd — tokenCredits are micro-dollars (1 credit = $0.000001) */
export function formatCredits(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
}

/**
 * Converts raw tokenCredits to a USD string.
 * Internal unit: 1 tokenCredit = $0.000001 USD (1 micro-dollar).
 * 1,000,000 tokenCredits = $1.00 USD.
 */
export function formatUsd(tokenCredits: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(tokenCredits / 1_000_000);
}

/** Converts a dollar amount to tokenCredits for storage. */
export function dollarsToCredits(usd: number): number {
  return Math.round(usd * 1_000_000);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(date));
}

export function formatRelative(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `${days}d atrás`;
  return formatDate(date);
}
