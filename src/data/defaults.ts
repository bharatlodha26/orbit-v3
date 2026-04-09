import type { Segment } from '../types';

export const DEFAULT_COLORS: Record<string, string> = {
  enterprise: '#4A6CF7',
  retain:     '#10B981',
  growth:     '#F59E0B',
  debt:       '#8B5CF6',
  compliance: '#EF4444',
  platform:   '#06B6D4',
  onboarding: '#F97316',
};

// Q2 baseline — outcome-oriented names per spec
export const Q2_SEGMENTS: Segment[] = [
  { id: 'enterprise', name: 'Win larger deals',      shortName: 'Win deals', percentage: 35, color: '#4A6CF7' },
  { id: 'retain',     name: 'Protect key accounts',  shortName: 'Protect',   percentage: 30, color: '#10B981' },
  { id: 'growth',     name: 'Expand user adoption',  shortName: 'Adoption',  percentage: 25, color: '#F59E0B' },
  { id: 'debt',       name: 'Speed up development',  shortName: 'Dev speed', percentage: 10, color: '#8B5CF6' },
];

export const EMPTY_SEGMENTS: Segment[] = [
  { id: 'enterprise', name: 'Win larger deals',      shortName: 'Win deals', percentage: 25, color: '#4A6CF7' },
  { id: 'retain',     name: 'Protect key accounts',  shortName: 'Protect',   percentage: 25, color: '#10B981' },
  { id: 'growth',     name: 'Expand user adoption',  shortName: 'Adoption',  percentage: 25, color: '#F59E0B' },
  { id: 'debt',       name: 'Speed up development',  shortName: 'Dev speed', percentage: 25, color: '#8B5CF6' },
];

/** Ensure all percentages sum to 100, no segment below 5%. */
export function clampPercentages(segments: Segment[]): Segment[] {
  const clamped = segments.map(s => ({ ...s, percentage: Math.max(5, s.percentage) }));
  const total = clamped.reduce((sum, s) => sum + s.percentage, 0);
  const factor = 100 / total;
  const result = clamped.map(s => ({ ...s, percentage: Math.round(s.percentage * factor) }));
  // Fix rounding drift
  const diff = 100 - result.reduce((sum, s) => sum + s.percentage, 0);
  if (diff !== 0) result[0].percentage += diff;
  return result;
}

/** Auto-generate a concise narrative sentence (≤15 words) from current segments. */
export function generateNarrative(segments: Segment[]): string {
  const sorted = [...segments].sort((a, b) => b.percentage - a.percentage);
  const top = sorted[0];
  const second = sorted[1];
  if (!top) return 'A balanced quarter.';
  if (top.percentage >= 55) return `An all-in ${top.name.toLowerCase()} bet.`;
  if (top.percentage >= 45) return `A heavily ${top.name.toLowerCase()} quarter. ${second?.name ?? ''} is secondary.`;
  if (top.percentage >= 35) return `A ${top.name.toLowerCase()} quarter. ${second?.name ?? ''} stays close.`;
  const compliance = segments.find(s => s.id === 'compliance' && s.isLocked);
  if (compliance) return `A balanced quarter — ${compliance.name.toLowerCase()} is non-negotiable.`;
  return `A balanced bet across ${top.name.toLowerCase()} and ${second?.name?.toLowerCase() ?? 'growth'}.`;
}

/** Generate the single biggest trade-off sentence for the proposal screen. */
export function generateTradeoff(segments: Segment[], prevSegments: Segment[]): string {
  const changes = segments.map(s => {
    const prev = prevSegments.find(p => p.id === s.id);
    return { ...s, delta: prev ? s.percentage - prev.percentage : 0 };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const biggest = changes[0];
  if (!biggest || biggest.delta === 0) return 'No major trade-offs from last quarter.';
  if (biggest.delta < -10) {
    return `${biggest.name} dropped ${Math.abs(biggest.delta)} points. Recoverable next quarter if priorities ship on time.`;
  }
  if (biggest.delta > 10) {
    const shrank = changes.find(c => c.delta < 0);
    return `${biggest.name} grew ${biggest.delta} points at the cost of ${shrank?.name ?? 'other areas'}.`;
  }
  return `Modest reallocation — ${biggest.name} is the biggest mover at ${biggest.delta > 0 ? '+' : ''}${biggest.delta} points.`;
}

/** Derive "What this quarter is NOT" bullets from current segments. */
export function getNotList(segments: Segment[]): string[] {
  const sorted = [...segments].sort((a, b) => b.percentage - a.percentage);
  const top = sorted[0];
  const nots: string[] = [];

  segments.forEach(s => {
    if (s.percentage < 12 && !s.isLocked) {
      nots.push(`Not a ${s.name.toLowerCase()} quarter`);
    }
  });

  if (top && top.percentage >= 40 && sorted[1]) {
    nots.push(`Not a ${sorted[1].name.toLowerCase()} quarter`);
  }

  if (nots.length === 0) {
    nots.push('Not a single-theme quarter');
    nots.push('Not set in stone — next quarter can rebalance');
  }

  return [...new Set(nots)].slice(0, 3);
}
