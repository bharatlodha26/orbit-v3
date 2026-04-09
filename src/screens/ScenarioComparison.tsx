import { motion } from 'framer-motion';
import { AllocationBar } from '../components/AllocationBar';
import type { Scenario } from '../types';

interface ScenarioComparisonProps {
  scenarios: Scenario[];
  onPick: (scenario: Scenario) => void;
  onBack: () => void;
}

function getDistinctTop3(scenarios: Scenario[]): Scenario[] {
  if (scenarios.length <= 3) return scenarios;
  // Pick 3 most distinct by max Euclidean distance between allocation vectors
  const vec = (s: Scenario) => s.segments.map(seg => seg.percentage);
  const dist = (a: Scenario, b: Scenario) => {
    const va = vec(a), vb = vec(b);
    return Math.sqrt(va.reduce((sum, v, i) => sum + Math.pow(v - (vb[i] ?? 0), 2), 0));
  };
  const selected: Scenario[] = [scenarios[scenarios.length - 1]];
  while (selected.length < 3) {
    let best: Scenario | null = null;
    let bestScore = -1;
    for (const s of scenarios) {
      if (selected.includes(s)) continue;
      const score = Math.min(...selected.map(sel => dist(s, sel)));
      if (score > bestScore) { bestScore = score; best = s; }
    }
    if (best) selected.push(best);
    else break;
  }
  return selected;
}

function getTradeoffSentence(a: Scenario, b: Scenario): string {
  const topA = [...a.segments].sort((x, y) => y.percentage - x.percentage)[0];
  const topB = [...b.segments].sort((x, y) => y.percentage - x.percentage)[0];
  if (topA.id === topB.id) {
    return `Both scenarios prioritize ${topA.name}, differing only in secondary themes.`;
  }
  return `A bets on ${topA.name}. B protects ${topB.name}.`;
}

function getRecommendation(scenarios: Scenario[]): string {
  // Simple heuristic: recommend the one with the biggest locked segment
  const withLocked = scenarios.find(s => s.segments.some(seg => seg.isLocked));
  if (withLocked) return `${withLocked.name} — locked constraints are non-negotiable this quarter.`;
  const top = scenarios[0];
  const dominated = [...top.segments].sort((a, b) => b.percentage - a.percentage)[0];
  return `"${top.name}" — ${dominated.name} pressure makes focused investment more likely to compound.`;
}

export function ScenarioComparison({ scenarios, onPick, onBack }: ScenarioComparisonProps) {
  const top3 = getDistinctTop3(scenarios);
  const tradeoff = top3.length >= 2 ? getTradeoffSentence(top3[0], top3[1]) : null;
  const recommendation = getRecommendation(top3);

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-ghost" onClick={onBack} style={{ fontSize: 20, padding: '4px 8px' }}>←</button>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
            Scenarios
          </p>
        </div>

        {top3.map((scenario, i) => (
          <motion.div
            key={scenario.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            style={{
              background: 'var(--surface)',
              borderRadius: 12,
              padding: '16px',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <AllocationBar segments={scenario.segments} compact />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', flex: 1, marginRight: 12 }}>
                "{scenario.narrative}"
              </p>
              <motion.button
                className="btn-pick"
                whileTap={{ scale: 0.95 }}
                onClick={() => onPick(scenario)}
              >
                Pick
              </motion.button>
            </div>
          </motion.div>
        ))}

        {tradeoff && (
          <div style={{ marginTop: 4 }}>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
              The trade-off
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {tradeoff}
            </p>
          </div>
        )}

        <div style={{
          background: 'var(--accent-soft)',
          borderRadius: 10,
          padding: '12px 14px',
          borderLeft: '3px solid var(--accent)',
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 4 }}>Recommendation</p>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4 }}>{recommendation}</p>
        </div>
      </div>
    </motion.div>
  );
}
