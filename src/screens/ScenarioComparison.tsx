import { motion } from 'framer-motion';
import { AllocationBar } from '../components/AllocationBar';
import type { Scenario } from '../types';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface ScenarioComparisonProps {
  scenarios: Scenario[];
  onPick: (scenario: Scenario) => void;
  onBack: () => void;
}

function getDistinctTop3(scenarios: Scenario[]): Scenario[] {
  if (scenarios.length <= 3) return scenarios;
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
  const withLocked = scenarios.find(s => s.segments.some(seg => seg.isLocked));
  if (withLocked) return `"${withLocked.name}" — locked constraints make this the safer choice.`;
  const top = scenarios[0];
  const dominated = [...top.segments].sort((a, b) => b.percentage - a.percentage)[0];
  return `"${top.name}" — ${dominated.name} pressure makes focused investment more likely to compound.`;
}

export function ScenarioComparison({ scenarios, onPick, onBack }: ScenarioComparisonProps) {
  const top3 = getDistinctTop3(scenarios);
  const tradeoff = top3.length >= 2 ? getTradeoffSentence(top3[0], top3[1]) : null;
  const recommendation = getRecommendation(top3);
  const audio  = useAudio();
  const haptic = useHaptic();

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner scenarios-layout">
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.button className="btn-ghost" onClick={() => { audio.playNavigate(); haptic.tap(); onBack(); }} style={{ fontSize: 20, padding: '4px 8px' }} whileTap={{ scale: 0.92 }}>←</motion.button>
          <p className="screen-section-label">Scenario Comparison</p>
        </div>

        {/* Scenario cards — horizontal on desktop, stacked on mobile */}
        <div className="scenarios-cards">
          {top3.map((scenario, i) => (
            <motion.div
              key={scenario.id}
              className="scenario-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <AllocationBar segments={scenario.segments} compact />
              <p className="scenario-card-narrative">"{scenario.narrative}"</p>
              <motion.button
                className="btn-pick scenario-pick-btn"
                whileTap={{ scale: 0.95 }}
                onClick={() => { audio.playChipSelect(); haptic.tap(); onPick(scenario); }}
              >
                Pick this →
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Trade-off */}
        {tradeoff && (
          <div>
            <p className="screen-section-label" style={{ marginBottom: 6 }}>The trade-off</p>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>{tradeoff}</p>
          </div>
        )}

        {/* Recommendation */}
        <div className="tradeoff-callout" style={{ borderLeft: '3px solid var(--accent)', background: 'var(--accent-soft)' }}>
          <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Recommendation
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4 }}>{recommendation}</p>
        </div>
      </div>
    </motion.div>
  );
}
