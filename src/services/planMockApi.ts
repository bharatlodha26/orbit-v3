/**
 * Mock API for the Plan Renderer (Solution 4).
 * Converts scored JudgmentState themes → pre-populated PlanState.
 * The PM fills in audience-specific fields; this provides smart defaults.
 */

import type { ScoringTheme, PlanInitiative, PlanTheme, PlanState } from '../types';
import { DEFAULT_COLORS } from '../data/defaults';

// ── OKR mapping per theme ────────────────────────────────────

const OKR_MAP: Record<string, string> = {
  enterprise:  'Accelerate enterprise revenue',
  retain:      'Improve retention & reduce churn',
  growth:      'Accelerate new user growth',
  debt:        'Improve platform reliability',
  compliance:  'Meet compliance & security requirements',
};

const SUCCESS_METRIC_MAP: Record<string, string> = {
  enterprise:  'Enterprise NRR ≥ 105%',
  retain:      'Net churn < 2%',
  growth:      'Activation rate +15%',
  debt:        'P99 latency < 200ms',
  compliance:  'SOC 2 audit pass',
};

const TEAM_MAP: Record<string, string> = {
  enterprise:  'Platform squad',
  retain:      'Customer success eng',
  growth:      'Growth squad',
  debt:        'Platform squad',
  compliance:  'Security squad',
};

// ── Sprint breakdown generator ───────────────────────────────

function buildSprintBreakdown(effortWeeks: number): string {
  if (effortWeeks <= 2) {
    return 'Sprint 1: implementation & QA, deploy';
  }
  if (effortWeeks <= 4) {
    return 'Sprint 1–2: design & implementation. Sprint 3: QA & deploy.';
  }
  return 'Sprint 1–2: design & implementation. Sprint 3–4: integration. Sprint 5: QA & deploy.';
}

// ── Customer-facing description generator ───────────────────

function buildCustomerDesc(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('audit')) return 'Full audit trail and activity monitoring for compliance and security teams.';
  if (lower.includes('sso') || lower.includes('single sign')) return 'Enterprise single sign-on using SAML and OIDC for IT administrators.';
  if (lower.includes('role') || lower.includes('rbac') || lower.includes('access')) return 'Admin, editor, and viewer roles for fine-grained team permissions.';
  if (lower.includes('onboard')) return 'Guided setup flow to help new users get value faster.';
  if (lower.includes('health') || lower.includes('dashboard')) return 'Real-time customer health metrics and early warning indicators.';
  if (lower.includes('performance') || lower.includes('speed')) return 'Faster load times and improved platform reliability.';
  if (lower.includes('referral')) return 'In-app referral program to invite teammates and earn rewards.';
  if (lower.includes('export') || lower.includes('api')) return 'Programmatic access to your data via a REST API.';
  return `${name} — improved capabilities for your team.`;
}

// ── Business impact generator ────────────────────────────────

function buildBusinessImpact(ini: { name: string; scores: { evidence: string; quality: string }[] }, themeId: string): string {
  const hardEvidence = ini.scores.find(s => s.quality === 'hard');
  if (hardEvidence) return hardEvidence.evidence;
  const strongEvidence = ini.scores.find(s => s.quality === 'strong');
  if (strongEvidence) return strongEvidence.evidence;

  // Fallback per theme
  if (themeId === 'enterprise') return 'Required by strategic accounts for deal progression.';
  if (themeId === 'retain') return 'Reduces churn risk for at-risk accounts.';
  if (themeId === 'growth') return 'Increases user activation and time-to-value.';
  if (themeId === 'debt') return 'Unblocks engineering velocity and reduces incident risk.';
  return 'Supports strategic quarter objective.';
}

// ── Main builder function ────────────────────────────────────

export function buildPlanFromJudgment(themes: ScoringTheme[], quarter: string): PlanState {
  const planThemes: PlanTheme[] = themes.map(theme => {
    // Sort initiatives by effective rank (scored first, then by composite desc)
    const sorted = [...theme.initiatives]
      .filter(i => i.status === 'scored')
      .sort((a, b) => {
        const ra = a.overrideRank ?? a.rank ?? 99;
        const rb = b.overrideRank ?? b.rank ?? 99;
        return ra - rb;
      });

    // Stack timelines sequentially within each theme (stagger by theme index)
    let weekCursor = 1;
    const planInitiatives: PlanInitiative[] = sorted.map((ini, idx) => {
      const start = weekCursor;
      const end = start + ini.effortWeeks - 1;
      weekCursor = end + 1;

      const salesRef = Math.max(1, end - 2);

      return {
        id: ini.id,
        name: ini.name,
        themeId: theme.id,
        effortWeeks: ini.effortWeeks,
        rank: idx + 1,
        composite: ini.composite,
        // Executive
        okrMapping: OKR_MAP[theme.id] ?? OKR_MAP.enterprise,
        businessImpact: buildBusinessImpact(ini as { name: string; scores: { evidence: string; quality: string }[] }, theme.id),
        successMetric: SUCCESS_METRIC_MAP[theme.id] ?? '',
        // Engineering
        assignedTeam: TEAM_MAP[theme.id] ?? 'Platform squad',
        sprintBreakdown: buildSprintBreakdown(ini.effortWeeks),
        techRisk: 'Medium' as const,
        isCarryOver: false,
        dependencies: [],
        timelineStart: start,
        timelineEnd: end,
        // GTM
        customerFacingName: ini.name,
        customerFacingDesc: buildCustomerDesc(ini.name),
        targetShipWeek: end,
        salesCanReferenceWeek: salesRef,
      };
    });

    return {
      id: theme.id,
      name: theme.name,
      icon: theme.icon,
      allocation: theme.allocation,
      engWeeks: theme.engWeeks,
      color: DEFAULT_COLORS[theme.id] ?? theme.model[0]?.color ?? '#4A6CF7',
      initiatives: planInitiatives,
    };
  });

  return { themes: planThemes, quarter };
}

// ── Completeness helpers ─────────────────────────────────────

const REQUIRED_FIELDS: Array<keyof PlanInitiative> = [
  'okrMapping', 'businessImpact',
  'assignedTeam', 'sprintBreakdown',
  'customerFacingName', 'customerFacingDesc',
];

export function getInitiativeCompleteness(ini: PlanInitiative): {
  complete: boolean;
  missing: string[];
} {
  const fieldLabels: Partial<Record<keyof PlanInitiative, string>> = {
    okrMapping: 'OKR mapping',
    businessImpact: 'Business impact',
    assignedTeam: 'Assigned team',
    sprintBreakdown: 'Sprint breakdown',
    customerFacingName: 'Customer-facing name',
    customerFacingDesc: 'GTM description',
  };

  const missing = REQUIRED_FIELDS.filter(f => {
    const val = ini[f];
    return !val || (typeof val === 'string' && val.trim() === '');
  }).map(f => fieldLabels[f] ?? String(f));

  return { complete: missing.length === 0, missing };
}

export function getPlanCompleteness(themes: PlanTheme[]): {
  pct: number;
  totalMissing: number;
  gaps: Array<{ initiativeName: string; missing: string[] }>;
} {
  let total = 0;
  let filled = 0;
  const gaps: Array<{ initiativeName: string; missing: string[] }> = [];

  themes.forEach(theme => {
    theme.initiatives.forEach(ini => {
      REQUIRED_FIELDS.forEach(f => {
        total++;
        const val = ini[f];
        if (val && (typeof val !== 'string' || val.trim() !== '')) filled++;
      });
      const { missing } = getInitiativeCompleteness(ini);
      if (missing.length > 0) gaps.push({ initiativeName: ini.name, missing });
    });
  });

  return {
    pct: total === 0 ? 100 : Math.round((filled / total) * 100),
    totalMissing: gaps.reduce((s, g) => s + g.missing.length, 0),
    gaps,
  };
}
