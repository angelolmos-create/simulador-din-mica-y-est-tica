export const GRAVITY = 9.8;
export const V_EPS = 1e-3;
export const MIN_OBS_TIME = 2.0;
export const MAX_LEVEL_UNLOCK_SEC = 12;

export function fmt(num: number, dec = 2): string {
  if (!Number.isFinite(num)) return '—';
  const clean = Math.abs(num) < 0.5 * Math.pow(10, -dec) ? 0 : num;
  return clean.toFixed(dec).replace('.', ',');
}

export function parseLocaleFloat(raw: string): number {
  if (typeof raw !== 'string') return NaN;
  const cleaned = raw.trim().replace(/\s+/g, '');
  if (!/^[+-]?(\d+([.,]\d+)?|[.,]\d+)$/.test(cleaned)) return NaN;
  const val = parseFloat(cleaned.replace(',', '.'));
  return Number.isFinite(val) ? val : NaN;
}

export function shuffleArray<T>(arr: readonly T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
