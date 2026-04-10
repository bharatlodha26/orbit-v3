/**
 * Mock AI API for the Judgment Structurer (Solution 3).
 * Simulates: scoring model generation, initiative scoring from NL,
 * evidence quality tagging, narrative generation.
 */

import type {
  ScoringDimension,
  ScoringTheme,
  DimensionScore,
  EvidenceQuality,
  Segment,
} from '../types';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Dimension palette ────────────────────────────────────────

const DIM_COLORS = ['#4A6CF7', '#10B981', '#EF4444', '#06B6D4', '#F59E0B', '#8B5CF6', '#F97316', '#EC4899'];

// ── Default scoring models per theme archetype ───────────────

const DEFAULT_MODELS: Record<string, ScoringDimension[]> = {
  enterprise: [
    { id: 'strat-acct', name: 'Strategic account risk', shortName: 'Strat Acct', weight: 40, color: DIM_COLORS[0] },
    { id: 'rev-impact', name: 'Revenue impact', shortName: 'Rev Impact', weight: 30, color: DIM_COLORS[1] },
    { id: 'comp-gap',   name: 'Competitive gap', shortName: 'Comp Gap', weight: 20, color: DIM_COLORS[3] },
    { id: 'effort',     name: 'Effort (inverted)', shortName: 'Effort', weight: 10, color: DIM_COLORS[4] },
  ],
  retain: [
    { id: 'churn-risk', name: 'Churn risk severity', shortName: 'Churn Risk', weight: 40, color: DIM_COLORS[2] },
    { id: 'arr-impact', name: 'ARR at risk', shortName: 'ARR Impact', weight: 30, color: DIM_COLORS[1] },
    { id: 'fix-scope',  name: 'Fix scope', shortName: 'Fix Scope', weight: 20, color: DIM_COLORS[5] },
    { id: 'effort',     name: 'Effort (inverted)', shortName: 'Effort', weight: 10, color: DIM_COLORS[4] },
  ],
  growth: [
    { id: 'tam',        name: 'Addressable market impact', shortName: 'TAM', weight: 35, color: DIM_COLORS[0] },
    { id: 'activation', name: 'Activation lift', shortName: 'Activation', weight: 25, color: DIM_COLORS[1] },
    { id: 'evidence',   name: 'Evidence strength', shortName: 'Evidence', weight: 25, color: DIM_COLORS[3] },
    { id: 'effort',     name: 'Effort (inverted)', shortName: 'Effort', weight: 15, color: DIM_COLORS[4] },
  ],
  debt: [
    { id: 'velocity',   name: 'Velocity impact', shortName: 'Velocity', weight: 40, color: DIM_COLORS[0] },
    { id: 'risk',       name: 'Incident risk', shortName: 'Risk', weight: 30, color: DIM_COLORS[2] },
    { id: 'scope',      name: 'Scope (inverted)', shortName: 'Scope', weight: 20, color: DIM_COLORS[5] },
    { id: 'effort',     name: 'Effort (inverted)', shortName: 'Effort', weight: 10, color: DIM_COLORS[4] },
  ],
  compliance: [
    { id: 'deadline',   name: 'Deadline urgency', shortName: 'Deadline', weight: 40, color: DIM_COLORS[2] },
    { id: 'deal-block', name: 'Deal blocker', shortName: 'Deal Block', weight: 25, color: DIM_COLORS[0] },
    { id: 'scope',      name: 'Scope size', shortName: 'Scope', weight: 20, color: DIM_COLORS[5] },
    { id: 'effort',     name: 'Effort (inverted)', shortName: 'Effort', weight: 15, color: DIM_COLORS[4] },
  ],
};

const THEME_ICONS: Record<string, string> = {
  enterprise: '🏢', retain: '🔄', growth: '📈', debt: '🔧', compliance: '🛡️',
};

// ── Mock initiative names per theme ──────────────────────────

const MOCK_INITIATIVES: Record<string, string[]> = {
  enterprise: ['Audit Log Improvements', 'SSO Completion', 'Role-Based Access Control', 'Data Export API', 'Advanced Permissions', 'Compliance Dashboard', 'Enterprise Onboarding Flow', 'Custom SLA Monitoring'],
  retain: ['Performance Optimization', 'Customer Health Dashboard', 'Proactive Alert System', 'Account Recovery Workflow', 'Usage Analytics Overhaul', 'Feedback Loop Integration'],
  growth: ['Self-Serve Onboarding V2', 'Viral Referral Mechanics', 'Free Tier Expansion', 'In-App Tutorials', 'PLG Analytics Dashboard'],
  debt: ['API Layer Refactor', 'Database Migration', 'CI/CD Pipeline Overhaul'],
  compliance: ['SOC 2 Audit Prep', 'Data Residency Controls', 'Encryption at Rest', 'Access Log Retention'],
};

// ── Build themes from locked segments ────────────────────────

export function buildThemesFromSegments(segments: Segment[]): ScoringTheme[] {
  return segments.map(seg => {
    const themeKey = seg.id;
    const model = DEFAULT_MODELS[themeKey] ?? DEFAULT_MODELS.enterprise;
    const initNames = MOCK_INITIATIVES[themeKey] ?? MOCK_INITIATIVES.enterprise;
    const engWeeks = Math.round(seg.percentage * 0.4);

    return {
      id: themeKey,
      name: seg.name,
      icon: THEME_ICONS[themeKey] ?? '📋',
      allocation: seg.percentage,
      engWeeks,
      model: model.map(d => ({ ...d })),
      initiatives: initNames.map((name, i) => ({
        id: `${themeKey}-init-${i}`,
        name,
        themeId: themeKey,
        scores: [],
        composite: 0,
        effortWeeks: 2 + Math.floor(Math.random() * 5),
        status: 'unscored' as const,
      })),
    };
  });
}

// ── Generate model narrative from weights ────────────────────

export function generateModelNarrative(dimensions: ScoringDimension[]): string {
  const sorted = [...dimensions].sort((a, b) => b.weight - a.weight);
  const top = sorted[0];
  const second = sorted[1];
  if (!top) return 'Set your scoring dimensions.';
  if (top.weight >= 45) {
    return `You're saying: ${top.name.toLowerCase()} matters more than anything else. This is a ${top.shortName.toLowerCase()}-first quarter.`;
  }
  if (top.weight >= 35) {
    return `${top.name} leads, with ${second?.name?.toLowerCase() ?? 'other factors'} close behind. A balanced but directed approach.`;
  }
  return `A balanced model — no single dimension dominates. You're weighing multiple factors equally.`;
}

// ── Score an initiative from NL input ────────────────────────

function inferQuality(text: string): EvidenceQuality {
  const lower = text.toLowerCase();
  if (/\$\d|arr|\d+k|confirmed|qbr|ciso|contract|audit|regulation/i.test(lower)) return 'hard';
  if (/3\+|multiple|pattern|engineering estimate|data shows/i.test(lower)) return 'strong';
  if (/says|mentioned|heard|anecdotal|one customer|single/i.test(lower)) return 'soft';
  return 'assumption';
}

function inferDimensionScore(text: string, dim: ScoringDimension): DimensionScore {
  const lower = text.toLowerCase();
  let score = 3;
  let evidence = 'No specific signal';
  let quality: EvidenceQuality = 'assumption';

  if (dim.id === 'strat-acct' || dim.id === 'churn-risk') {
    if (/blocker|at risk|ciso|critical|urgent/i.test(lower)) { score = 5; evidence = 'Flagged as blocker'; quality = inferQuality(text); }
    else if (/customer|account|asked/i.test(lower)) { score = 4; evidence = 'Customer request'; quality = 'strong'; }
    else { score = 2; evidence = 'No customer signal'; quality = 'assumption'; }
  } else if (dim.id === 'rev-impact' || dim.id === 'arr-impact') {
    const amountMatch = text.match(/\$(\d+)k?/i);
    if (amountMatch) { score = 5; evidence = `$${amountMatch[1]}K ARR at risk`; quality = 'hard'; }
    else if (/revenue|deal|arr/i.test(lower)) { score = 4; evidence = 'Revenue signal present'; quality = 'strong'; }
    else { score = 2; evidence = 'No revenue signal'; quality = 'assumption'; }
  } else if (dim.id.includes('comp')) {
    if (/competitor|gap|behind|market/i.test(lower)) { score = 4; evidence = 'Competitive signal detected'; quality = 'soft'; }
    else { score = 2; evidence = 'No competitive signal'; quality = 'assumption'; }
  } else if (dim.id === 'effort') {
    if (/quick|small|simple|1.week|2.week/i.test(lower)) { score = 5; evidence = 'Low effort estimate'; quality = 'strong'; }
    else if (/large|complex|months/i.test(lower)) { score = 1; evidence = 'High effort flagged'; quality = 'strong'; }
    else { score = 3; evidence = 'Moderate effort (est.)'; quality = 'soft'; }
  } else if (dim.id === 'deadline' || dim.id === 'deal-block') {
    if (/soc.?2|audit|deadline|october|non.negotiable/i.test(lower)) { score = 5; evidence = 'Hard deadline present'; quality = 'hard'; }
    else if (/compliance|required/i.test(lower)) { score = 4; evidence = 'Compliance requirement'; quality = 'strong'; }
    else { score = 2; evidence = 'No deadline signal'; quality = 'assumption'; }
  } else {
    if (/important|critical|high/i.test(lower)) { score = 4; evidence = 'Positive signal'; quality = 'soft'; }
    else { score = 3; evidence = 'Moderate assessment'; quality = 'assumption'; }
  }

  return { dimensionId: dim.id, score, evidence, quality };
}

export async function scoreInitiative(
  nlInput: string,
  model: ScoringDimension[],
): Promise<{ scores: DimensionScore[]; composite: number; narrative: string }> {
  await delay(600);

  const scores = model.map(dim => inferDimensionScore(nlInput, dim));
  const totalWeight = model.reduce((s, d) => s + d.weight, 0);
  const composite = scores.reduce((sum, sc) => {
    const dim = model.find(d => d.id === sc.dimensionId);
    return sum + sc.score * ((dim?.weight ?? 0) / totalWeight);
  }, 0);

  const topDim = [...scores].sort((a, b) => b.score - a.score)[0];
  const dimName = model.find(d => d.id === topDim.dimensionId)?.name ?? 'key dimension';
  const narrative = composite >= 4
    ? `Scores high because it directly addresses your top priority with ${topDim.quality === 'hard' ? 'hard' : 'moderate'} evidence.`
    : composite >= 3
    ? `Mid-range score. ${dimName} is the strongest dimension but evidence is ${topDim.quality}.`
    : `Lower priority — weak evidence across multiple dimensions.`;

  return { scores, composite: Math.round(composite * 10) / 10, narrative };
}

// ── Update model from NL ─────────────────────────────────────

export async function updateModelFromNL(
  nlInput: string,
  currentModel: ScoringDimension[],
): Promise<{ model: ScoringDimension[]; changes: Array<{ name: string; oldWeight: number; newWeight: number; reason: string }> }> {
  await delay(500);

  const lower = nlInput.toLowerCase();
  const changes: Array<{ name: string; oldWeight: number; newWeight: number; reason: string }> = [];
  const newModel = currentModel.map(d => ({ ...d }));

  // Simple NL → weight adjustments
  if (/soc.?2|compliance|non.negotiable|audit/i.test(lower)) {
    const existing = newModel.find(d => d.id.includes('comp') && !d.id.includes('deadline'));
    if (existing) {
      changes.push({ name: existing.name, oldWeight: existing.weight, newWeight: Math.max(5, existing.weight - 15), reason: 'competitor stall' });
      existing.weight = Math.max(5, existing.weight - 15);
    }
    const complianceDim = newModel.find(d => d.id.includes('deadline') || d.id.includes('deal-block'));
    if (!complianceDim) {
      const newDim: ScoringDimension = { id: 'compliance-new', name: 'Compliance', shortName: 'Compl', weight: 15, color: DIM_COLORS[2] };
      newModel.push(newDim);
      changes.push({ name: 'Compliance', oldWeight: 0, newWeight: 15, reason: 'SOC 2 non-negotiable' });
    }
  }
  if (/retention|churn|protect/i.test(lower)) {
    const stratDim = newModel.find(d => d.id.includes('strat') || d.id.includes('churn'));
    if (stratDim) {
      const oldW = stratDim.weight;
      stratDim.weight = Math.min(60, stratDim.weight + 5);
      changes.push({ name: stratDim.name, oldWeight: oldW, newWeight: stratDim.weight, reason: 'increased retention focus' });
    }
  }

  // Normalize to 100
  const total = newModel.reduce((s, d) => s + d.weight, 0);
  if (total !== 100) {
    newModel.forEach(d => { d.weight = Math.round((d.weight / total) * 100); });
    const diff = 100 - newModel.reduce((s, d) => s + d.weight, 0);
    if (diff !== 0 && newModel.length > 0) newModel[0].weight += diff;
  }

  // Generate changes for any dims that didn't already have an entry
  newModel.forEach(d => {
    const orig = currentModel.find(o => o.id === d.id);
    if (orig && orig.weight !== d.weight && !changes.find(c => c.name === d.name)) {
      changes.push({ name: d.name, oldWeight: orig.weight, newWeight: d.weight, reason: 'rebalanced' });
    }
  });

  return { model: newModel, changes };
}

// ── Evidence quality emoji ───────────────────────────────────

export const QUALITY_EMOJI: Record<EvidenceQuality, string> = {
  hard: '🟢',
  strong: '🟡',
  soft: '🟠',
  assumption: '🔴',
};

export const QUALITY_LABEL: Record<EvidenceQuality, string> = {
  hard: 'Hard evidence',
  strong: 'Strong signal',
  soft: 'Soft signal',
  assumption: 'Assumption',
};
