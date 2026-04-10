/**
 * Mock AI API service — simulates LLM-backed question generation,
 * chip suggestions, theme extraction, and reasoning accumulation.
 * In production this would call a real backend endpoint.
 */

import type { Segment, ReasoningBullet, ReasoningEntry, PlanningStep, SignalType } from '../types';
import { clampPercentages } from '../data/defaults';

// ── Types ────────────────────────────────────────────────────────────

export interface ConversationHistory {
  question: string;
  answer: string;
}

export interface GeneratedTurn {
  question: string;
  chips: string[];
  defaultChipIndex?: number;   // pre-selected chip index (optional)
  helperText?: string;         // shown above chips
  hideTextInput?: boolean;     // suppress free-text input for this turn
  planningStep: PlanningStep;
  barUpdateFn: (segments: Segment[], answer: string) => Segment[];
  generateReasoning: (answer: string, segments: Segment[]) => ReasoningEntry[];
}

// ── Outcome-oriented theme catalog ───────────────────────────────────

const THEME_CATALOG: Record<string, { name: string; shortName: string; color: string }> = {
  enterprise: { name: 'Win larger deals',          shortName: 'Win deals',  color: '#4A6CF7' },
  retain:     { name: 'Protect key accounts',      shortName: 'Protect',    color: '#10B981' },
  growth:     { name: 'Expand user adoption',      shortName: 'Adoption',   color: '#F59E0B' },
  debt:       { name: 'Speed up development',      shortName: 'Dev speed',  color: '#8B5CF6' },
  compliance: { name: 'Meet security requirements', shortName: 'Security',  color: '#EF4444' },
  platform:   { name: 'Improve system reliability', shortName: 'Reliability', color: '#06B6D4' },
  onboarding: { name: 'Accelerate time to value',  shortName: 'Onboarding', color: '#F97316' },
};

// ── Signal detection ─────────────────────────────────────────────────

interface DetectedSignal {
  themeId: string;
  signalType: SignalType;
  keywords: string;
}

function detectSignals(text: string): DetectedSignal[] {
  const signals: DetectedSignal[] = [];

  if (/enterprise|deal|close|pipeline|ssо|sso|contract|revenue target|b2b|icp|land.and.expand/i.test(text)) {
    signals.push({ themeId: 'enterprise', signalType: 'deal_signal', keywords: 'enterprise deal pressure' });
  }
  if (/ceo|board|mandate|exec|vp|leadership|directive|must.have|company.priority/i.test(text)) {
    signals.push({ themeId: 'enterprise', signalType: 'exec_mandate', keywords: 'executive mandate' });
  }
  if (/churn|at.risk|cancel|nps|satisfaction|escalat|health.score|renewal|unhappy/i.test(text)) {
    signals.push({ themeId: 'retain', signalType: 'churn_risk', keywords: 'retention risk' });
  }
  if (/soc.?2|compliance|audit|security|gdpr|hipaa|fedramp|certification|hard.deadline|october|deadline/i.test(text)) {
    signals.push({ themeId: 'compliance', signalType: 'compliance', keywords: 'compliance deadline' });
  }
  if (/debt|refactor|slow|infra|legacy|performance|technical|bottleneck|hard.to.maintain/i.test(text)) {
    signals.push({ themeId: 'debt', signalType: 'usage_signal', keywords: 'technical debt' });
  }
  if (/carry.over|incomplete|leftover|from.last.quarter|from.q[1-4]|backlog|unfinished/i.test(text)) {
    signals.push({ themeId: 'debt', signalType: 'carry_over', keywords: 'carry-over work' });
  }
  if (/compet|new.market|expansion|acquisition|plg|growth|viral|onboard.more/i.test(text)) {
    signals.push({ themeId: 'growth', signalType: 'competitive', keywords: 'growth pressure' });
  }

  // Deduplicate by themeId (keep first occurrence of each)
  const seen = new Set<string>();
  return signals.filter(s => {
    const key = `${s.themeId}:${s.signalType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Bar update logic ──────────────────────────────────────────────────

function buildSegmentsFromSignals(
  signals: DetectedSignal[],
  currentSegments: Segment[],
): Segment[] {
  if (signals.length === 0) return currentSegments;

  // Clone and rename existing segments to outcome-oriented names
  const updated = currentSegments.map(s => {
    const catalog = THEME_CATALOG[s.id];
    if (!catalog) return { ...s };
    return { ...s, name: catalog.name, shortName: catalog.shortName };
  });

  const detectedIds = [...new Set(signals.map(s => s.themeId))];

  detectedIds.forEach(id => {
    const existing = updated.find(s => s.id === id);
    if (existing && !existing.isLocked) {
      existing.percentage = Math.min(60, existing.percentage + 7);
    } else if (!existing) {
      const catalog = THEME_CATALOG[id];
      if (catalog) {
        updated.push({
          id,
          name: catalog.name,
          shortName: catalog.shortName,
          percentage: 10,
          color: catalog.color,
          isLocked: id === 'compliance',
          isConstraint: id === 'compliance',
        });
      }
    }
  });

  return clampPercentages(updated);
}

// ── Reasoning generation ──────────────────────────────────────────────

const BULLET_TEMPLATES: Record<SignalType, (text: string) => string> = {
  deal_signal:   (t) => /lost|miss|fail/i.test(t) ? 'Lost deals due to feature gap' : 'Active pipeline needs feature support',
  exec_mandate:  ()  => 'Executive mandate to prioritize this area',
  churn_risk:    (t) => /account|customer/i.test(t) ? 'Key account at churn risk' : 'Retention risk across segment',
  compliance:    ()  => 'Hard compliance deadline this quarter',
  carry_over:    ()  => 'Incomplete work carried from last quarter',
  competitive:   ()  => 'Competitive pressure requires faster delivery',
  usage_signal:  ()  => 'Technical debt slowing engineering velocity',
};

function buildReasoning(
  answer: string,
  signals: DetectedSignal[],
  segments: Segment[],
): ReasoningEntry[] {
  const byTheme: Record<string, ReasoningBullet[]> = {};

  signals.forEach(({ themeId, signalType }) => {
    if (!byTheme[themeId]) byTheme[themeId] = [];
    const template = BULLET_TEMPLATES[signalType];
    byTheme[themeId].push({
      text: template(answer),
      signalType,
      sourceQuote: answer.length > 60 ? answer.slice(0, 57) + '…' : answer,
    });
  });

  return Object.entries(byTheme).map(([themeId, bullets]) => {
    const seg = segments.find(s => s.id === themeId);
    const catalog = THEME_CATALOG[themeId];
    return {
      themeId,
      themeName: seg?.name ?? catalog?.name ?? themeId,
      bullets,
    };
  });
}

// ── Turn builders ─────────────────────────────────────────────────────

function buildTurn(
  turnIndex: number,
  history: ConversationHistory[],
  currentSegments: Segment[],
): GeneratedTurn {
  const allAnswerText = history.map(h => h.answer).join(' ');
  const cumulativeSignals = detectSignals(allAnswerText);
  const detectedThemeIds = [...new Set(cumulativeSignals.map(s => s.themeId))];

  switch (turnIndex) {
    case 0:
      return {
        planningStep: 'context',
        question: 'What changed since last quarter?',
        helperText: 'Pick what feels most true — you can change later',
        defaultChipIndex: 0,
        chips: [
          'Sales cycles are getting longer',
          'A key account may churn',
          'A major deadline is coming',
          'Product delivery is slowing',
          'Nothing significant changed',
        ],
        barUpdateFn: (segs, answer) =>
          buildSegmentsFromSignals(detectSignals(answer), segs),
        generateReasoning: (answer, segs) =>
          buildReasoning(answer, detectSignals(answer), segs),
      };

    case 1: {
      // Adapt second question based on first answer
      let question = 'Any hard constraints that are non-negotiable this quarter?';
      let chips = [
        "We have a SOC 2 or security audit with a firm deadline",
        "There is a specific customer commitment we absolutely must honor",
        "Some work is carrying over from last quarter that must finish",
        "No hard constraints — we have full flexibility to allocate",
      ];

      if (detectedThemeIds.includes('enterprise') && !detectedThemeIds.includes('compliance')) {
        question = 'What would make or break the enterprise push this quarter?';
        chips = [
          "We're missing a feature like SSO or audit logs that blocks deals",
          "Sales needs engineering support to close a specific deal",
          "We have a committed deal with a hard delivery date",
          "It's more about sales effort than product features",
        ];
      } else if (detectedThemeIds.includes('retain') && !detectedThemeIds.includes('enterprise')) {
        question = 'How serious is the retention risk right now?';
        chips = [
          "One specific high-value account is actively at risk of leaving",
          "Multiple accounts are showing declining health scores",
          "NPS dropped significantly — it's a broader satisfaction issue",
          "Early warning signs only — nothing critical yet",
        ];
      } else if (detectedThemeIds.includes('compliance')) {
        question = 'How much of the team will the compliance work consume?';
        chips = [
          "It requires at least one engineer full-time for the quarter",
          "It can be done with part-time effort alongside other work",
          "We need to hire external help or a consultant",
          "It's mostly documentation — minimal engineering required",
        ];
      }

      return {
        planningStep: 'themes',
        question,
        chips,
        barUpdateFn: (segs, answer) =>
          buildSegmentsFromSignals(detectSignals(answer), segs),
        generateReasoning: (answer, segs) =>
          buildReasoning(answer, detectSignals(answer), segs),
      };
    }

    case 2: {
      const cuttable = currentSegments.filter(s => !s.isLocked && s.percentage >= 15);
      return {
        planningStep: 'themes',
        question: "What are you willing to deprioritize to make room?",
        chips: [
          ...cuttable.map(s =>
            `We can afford to pause ${s.name.toLowerCase()} for one quarter`
          ),
          "Everything is essential — nothing can be cut this quarter",
        ].slice(0, 4),
        barUpdateFn: (segs, answer) => {
          const updated = segs.map(s => ({ ...s }));
          const lower = answer.toLowerCase();
          const toShrink = updated.find(s => lower.includes(s.name.toLowerCase()) && !s.isLocked);
          if (toShrink) {
            const freed = Math.min(10, toShrink.percentage - 5);
            toShrink.percentage -= freed;
            const unlocked = updated.filter(s => !s.isLocked && s.id !== toShrink.id);
            const perSeg = freed / Math.max(1, unlocked.length);
            unlocked.forEach(s => (s.percentage += perSeg));
          }
          return clampPercentages(updated);
        },
        generateReasoning: (answer, segs) => {
          const signals = detectSignals(answer);
          const lower = answer.toLowerCase();
          const cut = segs.find(s => lower.includes(s.name.toLowerCase()) && !s.isLocked);
          if (cut) {
            signals.push({ themeId: cut.id, signalType: 'carry_over', keywords: 'deliberate deprioritization' });
          }
          return buildReasoning(answer, signals, segs);
        },
      };
    }

    case 3:
    default:
      return {
        planningStep: 'themes',
        question: "Anything else I should factor into this quarter's plan?",
        chips: [
          "That covers it — I'm ready to see the allocation",
          "Team capacity is significantly more limited than usual",
          "We have an external vendor or partner dependency this quarter",
          "Leadership needs a board-ready presentation this quarter",
        ],
        barUpdateFn: (segs, answer) => {
          if (/covers it|ready|nothing|done|that.?s it/i.test(answer)) return segs;
          if (/capacity|team.size|headcount|bandwidth/i.test(answer)) {
            const updated = segs.map(s => ({ ...s }));
            const debt = updated.find(s => s.id === 'debt');
            const top = [...updated].sort((a, b) => b.percentage - a.percentage)[0];
            if (debt && top && top.id !== debt.id && !debt.isLocked) {
              const shift = 5;
              top.percentage = Math.max(5, top.percentage - shift);
              debt.percentage = Math.min(60, debt.percentage + shift);
            }
            return clampPercentages(updated);
          }
          return segs;
        },
        generateReasoning: (answer, segs) => {
          const signals = detectSignals(answer);
          return buildReasoning(answer, signals, segs);
        },
      };
  }
}

// ── Public API ────────────────────────────────────────────────────────

const SIMULATED_DELAY_MS = 500;

export async function generateNextTurn(
  turnIndex: number,
  history: ConversationHistory[],
  currentSegments: Segment[],
): Promise<GeneratedTurn> {
  await new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY_MS));
  return buildTurn(turnIndex, history, currentSegments);
}

/**
 * Total number of conversation turns before auto-advancing to proposal.
 */
export const TOTAL_TURNS = 4;
