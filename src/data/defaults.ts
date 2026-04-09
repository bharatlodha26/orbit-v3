import type { Segment, ConversationTurn } from '../types';

export const DEFAULT_COLORS: Record<string, string> = {
  Enterprise: '#4A6CF7',
  Retain: '#10B981',
  Growth: '#F59E0B',
  Debt: '#8B5CF6',
  Compliance: '#EF4444',
  Platform: '#06B6D4',
  Security: '#F97316',
};

export const Q2_SEGMENTS: Segment[] = [
  { id: 'enterprise', name: 'Enterprise', percentage: 35, color: '#4A6CF7' },
  { id: 'retain', name: 'Retain', percentage: 30, color: '#10B981' },
  { id: 'growth', name: 'Growth', percentage: 25, color: '#F59E0B' },
  { id: 'debt', name: 'Debt', percentage: 10, color: '#8B5CF6' },
];

export const EMPTY_SEGMENTS: Segment[] = [
  { id: 'enterprise', name: 'Enterprise', percentage: 25, color: '#4A6CF7' },
  { id: 'retain', name: 'Retain', percentage: 25, color: '#10B981' },
  { id: 'growth', name: 'Growth', percentage: 25, color: '#F59E0B' },
  { id: 'debt', name: 'Debt', percentage: 25, color: '#8B5CF6' },
];

export function clampPercentages(segments: Segment[]): Segment[] {
  const clamped = segments.map(s => ({ ...s, percentage: Math.max(5, s.percentage) }));
  const total = clamped.reduce((sum, s) => sum + s.percentage, 0);
  const factor = 100 / total;
  const result = clamped.map(s => ({ ...s, percentage: Math.round(s.percentage * factor) }));
  // Fix rounding
  const diff = 100 - result.reduce((sum, s) => sum + s.percentage, 0);
  if (diff !== 0) result[0].percentage += diff;
  return result;
}

export function getConversationTurns(prevSegments: Segment[]): ConversationTurn[] {
  return [
    {
      question: "What's the biggest shift from last quarter?",
      chips: [
        'Enterprise pressure increased',
        'Retention risk emerged',
        'New compliance deadline',
        'Nothing major changed',
      ],
      barUpdateFn: (segments, answer) => {
        const updated = segments.map(s => ({ ...s }));
        const lower = answer.toLowerCase();
        if (lower.includes('enterprise')) {
          return shiftToward(updated, 'enterprise', 8);
        } else if (lower.includes('retention') || lower.includes('retain')) {
          return shiftToward(updated, 'retain', 8);
        } else if (lower.includes('compliance')) {
          const hasCompliance = updated.find(s => s.id === 'compliance');
          if (!hasCompliance) {
            const newSeg: Segment = { id: 'compliance', name: 'Compliance', percentage: 10, color: '#EF4444', isLocked: true };
            const total = updated.reduce((s, x) => s + x.percentage, 0) + 10;
            const factor = 90 / total;
            return clampPercentages([...updated.map(s => ({ ...s, percentage: s.percentage * factor })), newSeg]);
          }
          return segments;
        }
        return segments;
      },
    },
    {
      question: 'Any hard constraints this quarter?',
      chips: [
        'SOC 2 deadline',
        'Key customer commitment',
        'Carry-over from Q2',
        'None',
      ],
      barUpdateFn: (segments, answer) => {
        const updated = segments.map(s => ({ ...s }));
        const lower = answer.toLowerCase();
        if (lower.includes('soc') || lower.includes('compliance')) {
          const idx = updated.findIndex(s => s.id === 'compliance');
          if (idx >= 0) {
            updated[idx].isLocked = true;
          } else {
            const newSeg: Segment = { id: 'compliance', name: 'Compliance', percentage: 10, color: '#EF4444', isLocked: true };
            return clampPercentages([...updated, newSeg]);
          }
        } else if (lower.includes('customer') || lower.includes('enterprise')) {
          const idx = updated.findIndex(s => s.id === 'enterprise');
          if (idx >= 0) updated[idx].isLocked = true;
        } else if (lower.includes('carry-over') || lower.includes('carry over') || lower.includes('q2')) {
          // Lock largest segment
          const maxIdx = updated.reduce((mi, s, i) => s.percentage > updated[mi].percentage ? i : mi, 0);
          updated[maxIdx].isLocked = true;
        }
        return updated;
      },
    },
    {
      question: "What are you willing to cut to make room?",
      chips: prevSegments.map(s => `${s.name} can wait`),
      barUpdateFn: (segments, answer) => {
        const updated = segments.map(s => ({ ...s }));
        const lower = answer.toLowerCase();
        const toShrink = updated.find(s => lower.includes(s.name.toLowerCase()) && !s.isLocked);
        if (toShrink) {
          const freed = Math.min(10, toShrink.percentage - 5);
          toShrink.percentage -= freed;
          const unlocked = updated.filter(s => !s.isLocked && s.id !== toShrink.id);
          const distribute = freed / Math.max(1, unlocked.length);
          unlocked.forEach(s => s.percentage += distribute);
        }
        return clampPercentages(updated);
      },
    },
    {
      question: "Anything else I should know?",
      chips: ["That's it", 'Team capacity is limited', 'External dependency risk', 'Board presentation needed'],
      barUpdateFn: (segments, answer) => {
        const lower = answer.toLowerCase();
        if (lower.includes("that's it") || lower.includes('nothing')) return segments;
        if (lower.includes('capacity')) {
          return shiftToward(segments.map(s => ({ ...s })), 'debt', 5);
        }
        return segments;
      },
    },
  ];
}

function shiftToward(segments: Segment[], targetId: string, amount: number): Segment[] {
  const target = segments.find(s => s.id === targetId);
  if (!target || target.isLocked) return segments;
  const donors = segments.filter(s => s.id !== targetId && !s.isLocked && s.percentage > 10);
  if (donors.length === 0) return segments;
  const perDonor = Math.ceil(amount / donors.length);
  donors.forEach(d => { d.percentage = Math.max(5, d.percentage - perDonor); });
  target.percentage = Math.min(60, target.percentage + amount);
  return clampPercentages(segments);
}

export function generateNarrative(segments: Segment[]): string {
  const sorted = [...segments].sort((a, b) => b.percentage - a.percentage);
  const top = sorted[0];
  const second = sorted[1];
  if (top.percentage >= 50) return `An all-in ${top.name.toLowerCase()} bet.`;
  if (top.percentage >= 40) return `A heavily ${top.name.toLowerCase()} quarter. ${second.name} is secondary.`;
  if (top.percentage >= 35) return `A ${top.name.toLowerCase()} quarter. ${second.name} stays close.`;
  const compliance = segments.find(s => s.id === 'compliance' && s.isLocked);
  if (compliance) return `A balanced quarter with non-negotiable compliance.`;
  return `A balanced bet across ${top.name.toLowerCase()} and ${second.name.toLowerCase()}.`;
}

export function generateTradeoff(segments: Segment[], prevSegments: Segment[]): string {
  const changes = segments.map(s => {
    const prev = prevSegments.find(p => p.id === s.id);
    return { ...s, delta: prev ? s.percentage - prev.percentage : 0 };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const biggest = changes[0];
  if (!biggest || biggest.delta === 0) return 'No major trade-offs from last quarter.';
  if (biggest.delta < -10) {
    return `${biggest.name} dropped ${Math.abs(biggest.delta)} points. Recoverable in the following quarter if priorities ship on time.`;
  }
  if (biggest.delta > 10) {
    const shrank = changes.find(c => c.delta < 0);
    return `${biggest.name} grew ${biggest.delta} points at the cost of ${shrank?.name ?? 'other areas'}.`;
  }
  return `Modest reallocation — ${biggest.name} is the biggest mover at ${biggest.delta > 0 ? '+' : ''}${biggest.delta} points.`;
}
