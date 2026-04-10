import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlanState, PlanInitiative, PlanAudienceView } from '../types';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface PlanViewerScreenProps {
  plan: PlanState;
  onBack: () => void;
  initialView?: PlanAudienceView;
}

// ── Executive View (4.1a) ────────────────────────────────────

function ExecutiveView({ plan }: { plan: PlanState }) {
  const audio = useAudio();
  // Group initiatives by OKR mapping
  const okrGroups = new Map<string, { initiatives: (PlanInitiative & { themeColor: string; themeName: string })[]; metric: string }>();

  plan.themes.forEach(theme => {
    theme.initiatives.forEach(ini => {
      if (!okrGroups.has(ini.okrMapping)) {
        okrGroups.set(ini.okrMapping, { initiatives: [], metric: ini.successMetric });
      }
      okrGroups.get(ini.okrMapping)!.initiatives.push({ ...ini, themeColor: theme.color, themeName: theme.name });
    });
  });

  // Build narrative from themes
  const topTheme = [...plan.themes].sort((a, b) => b.allocation - a.allocation)[0];
  const defensive = plan.themes.find(t => t.id === 'enterprise' || t.id === 'retain');
  const topAlloc = plan.themes
    .filter(t => t.allocation >= 25)
    .map(t => t.name.toLowerCase())
    .join(' and ');

  const narrativePct = plan.themes
    .filter(t => t.id === 'enterprise' || t.id === 'retain')
    .reduce((s, t) => s + t.allocation, 0);

  const notList = plan.themes
    .filter(t => t.allocation < 15)
    .map(t => `Not a ${t.name.toLowerCase()} quarter`);

  const totalInitiatives = plan.themes.reduce((s, t) => s + t.initiatives.length, 0);

  return (
    <div className="plan-view-body">
      {/* The Quarterly Bet */}
      <div className="plan-exec-narrative-card">
        <p className="plan-section-label">The Quarterly Bet</p>
        <p className="plan-exec-narrative">
          "{plan.quarter} is focused on {topAlloc}.
          {narrativePct >= 50 ? ` ${narrativePct}% of capacity protects and grows existing revenue.` : ''}
          {topTheme ? ` ${topTheme.name} leads at ${topTheme.allocation}%.` : ''}"
        </p>
      </div>

      {/* Allocation */}
      <div className="plan-exec-alloc-block">
        <p className="plan-section-label">Allocation</p>
        <div className="plan-exec-alloc-bar">
          {plan.themes.map(t => (
            <div
              key={t.id}
              className="plan-exec-alloc-seg"
              style={{ flex: t.allocation, background: t.color }}
              title={`${t.name}: ${t.allocation}%`}
            />
          ))}
        </div>
        <div className="plan-exec-alloc-legend">
          {plan.themes.map(t => (
            <div key={t.id} className="plan-exec-legend-item">
              <span className="plan-exec-legend-dot" style={{ background: t.color }} />
              <span className="plan-exec-legend-label">{t.name}</span>
              <span className="plan-exec-legend-pct">{t.allocation}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* OKR Impact Map */}
      <div>
        <p className="plan-section-label">OKR Impact Map</p>
        <div className="plan-exec-okr-list">
          {Array.from(okrGroups.entries()).map(([okr, group]) => (
            <div key={okr} className="plan-exec-okr-group">
              <div className="plan-exec-okr-header">
                <span className="plan-exec-okr-icon">🎯</span>
                <span className="plan-exec-okr-title">{okr}</span>
              </div>
              {group.initiatives.map(ini => (
                <div key={ini.id} className="plan-exec-okr-item">
                  <div className="plan-exec-okr-dot" style={{ background: ini.themeColor }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="plan-exec-ini-name">{ini.name}</span>
                    {ini.businessImpact && (
                      <span className="plan-exec-ini-impact"> — {ini.businessImpact}</span>
                    )}
                  </div>
                  <span className="plan-exec-ini-week">Wk {ini.targetShipWeek}</span>
                </div>
              ))}
              {group.metric && (
                <p className="plan-exec-okr-metric">Expected: {group.metric}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* What this quarter is NOT */}
      {(notList.length > 0 || totalInitiatives > 0) && (
        <div className="plan-exec-not-block">
          <p className="plan-section-label">What This Quarter Is Not</p>
          <ul className="plan-exec-not-list">
            {notList.map((n, i) => (
              <li key={i} className="plan-exec-not-item">• {n}</li>
            ))}
            {defensive && (
              <li className="plan-exec-not-item">• Not an acquisition quarter — focus is on protecting existing revenue</li>
            )}
          </ul>
        </div>
      )}

      {/* Share row */}
      <div style={{ display: 'flex', gap: 10 }}>
        <motion.button className="btn-secondary" whileTap={{ scale: 0.97 }} onClick={() => audio.playTap()} style={{ flex: 1, fontSize: 13 }}>
          📤 Share this view
        </motion.button>
        <motion.button className="btn-secondary" whileTap={{ scale: 0.97 }} onClick={() => audio.playTap()} style={{ flex: 1, fontSize: 13 }}>
          📄 Export PDF
        </motion.button>
      </div>
    </div>
  );
}

// ── Engineering View (4.1b) ──────────────────────────────────

function EngineeringView({ plan }: { plan: PlanState }) {
  const audio = useAudio();
  const totalWeeks = plan.themes.reduce((s, t) => s + t.engWeeks, 0);

  return (
    <div className="plan-view-body">
      {/* Capacity summary */}
      <div className="plan-eng-capacity-card">
        <p className="plan-section-label">Capacity Summary</p>
        <p className="plan-eng-capacity-total">~{totalWeeks} eng-weeks</p>
      </div>

      {/* Theme capacity bars */}
      <div>
        <p className="plan-section-label">By Theme</p>
        <div className="plan-eng-theme-bars">
          {plan.themes.map(theme => (
            <div key={theme.id} className="plan-eng-theme-row">
              <div className="plan-eng-theme-label">
                <span>{theme.icon}</span>
                <span className="plan-eng-theme-name">{theme.name}</span>
              </div>
              <div className="plan-eng-bar-track">
                <motion.div
                  className="plan-eng-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${(theme.engWeeks / totalWeeks) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{ background: theme.color }}
                />
              </div>
              <span className="plan-eng-wks-label">{theme.engWeeks} wks ({theme.initiatives.length})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Initiative details */}
      <div>
        <p className="plan-section-label">Initiative Detail</p>
        <div className="plan-eng-initiative-list">
          {plan.themes.flatMap(theme =>
            theme.initiatives.map(ini => (
              <div key={ini.id} className="plan-eng-ini-card">
                <div className="plan-eng-ini-header">
                  <div
                    className="plan-eng-ini-dot"
                    style={{ background: theme.color }}
                  />
                  <div style={{ flex: 1 }}>
                    <p className="plan-eng-ini-name">
                      {ini.name}
                      <span className="plan-eng-ini-meta"> · {ini.effortWeeks} wks · {ini.assignedTeam}</span>
                    </p>
                    <p className="plan-eng-ini-timeline">Wk {ini.timelineStart}–{ini.timelineEnd}</p>
                  </div>
                  <span className={`plan-risk-badge plan-risk-${ini.techRisk.toLowerCase()}`}>
                    {ini.techRisk} risk
                  </span>
                </div>
                {ini.sprintBreakdown && (
                  <p className="plan-eng-sprint-text">{ini.sprintBreakdown}</p>
                )}
                {ini.dependencies.length > 0 && (
                  <p className="plan-eng-deps">
                    ⚠ Depends on: {ini.dependencies.join(', ')}
                  </p>
                )}
                {ini.isCarryOver && (
                  <p className="plan-eng-carryover">↩ Carry-over from previous quarter</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dependency map */}
      {plan.themes.some(t => t.initiatives.some(i => i.dependencies.length > 0)) && (
        <div className="plan-eng-dep-map">
          <p className="plan-section-label">Dependency Map</p>
          {plan.themes.flatMap(theme =>
            theme.initiatives
              .filter(ini => ini.dependencies.length > 0)
              .map(ini =>
                ini.dependencies.map((dep, j) => (
                  <p key={`${ini.id}-${j}`} className="plan-eng-dep-row">
                    <span className="plan-eng-dep-from">{dep}</span>
                    <span className="plan-eng-dep-arrow"> ──→ </span>
                    <span className="plan-eng-dep-to">{ini.name}</span>
                    <span className="plan-eng-dep-type"> (blocker)</span>
                  </p>
                ))
              )
          )}
        </div>
      )}

      <motion.button className="btn-secondary" whileTap={{ scale: 0.97 }} onClick={() => audio.playTap()} style={{ fontSize: 13 }}>
        📤 Share this view
      </motion.button>
    </div>
  );
}

// ── GTM View (4.1c) ──────────────────────────────────────────

function GTMView({ plan }: { plan: PlanState }) {
  const audio = useAudio();
  // Flatten and sort all initiatives by targetShipWeek
  const allInitiatives = plan.themes
    .flatMap(theme => theme.initiatives.map(ini => ({ ...ini, themeColor: theme.color })))
    .sort((a, b) => a.targetShipWeek - b.targetShipWeek);

  const today = new Date();

  return (
    <div className="plan-view-body">
      {/* Timeline */}
      <div>
        <p className="plan-section-label">Release Timeline</p>
        <div className="plan-gtm-timeline">
          {allInitiatives.map((ini, i) => (
            <motion.div
              key={ini.id}
              className="plan-gtm-item"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              {/* Week marker */}
              <div className="plan-gtm-week-col">
                <div
                  className="plan-gtm-week-dot"
                  style={{ background: ini.themeColor }}
                />
                <div className="plan-gtm-week-line" />
                <span className="plan-gtm-week-label">Wk {ini.targetShipWeek}</span>
              </div>

              {/* Feature card */}
              <div className="plan-gtm-feature-card">
                <p className="plan-gtm-feature-name">{ini.customerFacingName || ini.name}</p>
                <p className="plan-gtm-feature-desc">{ini.customerFacingDesc}</p>
                <div className="plan-gtm-sales-ref">
                  <span className="plan-gtm-sales-icon">💬</span>
                  <span className="plan-gtm-sales-text">
                    Sales can reference:{' '}
                    <strong>
                      {ini.salesCanReferenceWeek <= 1 ? 'Now' : `After Wk ${ini.salesCanReferenceWeek}`}
                    </strong>
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="plan-gtm-disclaimer">
        <p className="plan-gtm-disclaimer-title">⚠ Dates are targets, not commitments</p>
        <p className="plan-gtm-disclaimer-meta">
          Updated: {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          {' · '}Next update: {new Date(today.getTime() + 14 * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <motion.button className="btn-secondary" whileTap={{ scale: 0.97 }} onClick={() => audio.playTap()} style={{ flex: 1, fontSize: 13 }}>
          📤 Share this view
        </motion.button>
        <motion.button className="btn-secondary" whileTap={{ scale: 0.97 }} onClick={() => audio.playTap()} style={{ flex: 1, fontSize: 13 }}>
          🔗 Copy link for Sales
        </motion.button>
      </div>
    </div>
  );
}

// ── Plan Viewer (main screen) ────────────────────────────────

export function PlanViewerScreen({ plan, onBack, initialView = 'executive' }: PlanViewerScreenProps) {
  const [activeView, setActiveView] = useState<PlanAudienceView>(initialView);
  const audio  = useAudio();
  const haptic = useHaptic();

  const tabs: { id: PlanAudienceView; label: string }[] = [
    { id: 'executive', label: 'Executive' },
    { id: 'engineering', label: 'Engineering' },
    { id: 'gtm', label: 'GTM' },
  ];

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner plan-viewer-layout">

        {/* Header */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <motion.button className="btn-ghost" whileTap={{ scale: 0.95 }} onClick={() => { audio.playNavigate(); haptic.tap(); onBack(); }} style={{ padding: '4px 0' }}>
              ← Back to Canvas
            </motion.button>
          </div>
          <h2 className="plan-canvas-title" style={{ marginTop: 4 }}>{plan.quarter} Plan</h2>
        </div>

        {/* Tab switcher */}
        <div className="plan-view-tabs">
          {tabs.map(tab => (
            <motion.button
              key={tab.id}
              className={`plan-view-tab ${activeView === tab.id ? 'plan-view-tab-active' : ''}`}
              onClick={() => { audio.playToggle(); setActiveView(tab.id); }}
              whileTap={{ scale: 0.95 }}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* View content */}
        <div className="plan-view-content">
          <AnimatePresence mode="wait">
            {activeView === 'executive' && (
              <motion.div
                key="executive"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ExecutiveView plan={plan} />
              </motion.div>
            )}
            {activeView === 'engineering' && (
              <motion.div
                key="engineering"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <EngineeringView plan={plan} />
              </motion.div>
            )}
            {activeView === 'gtm' && (
              <motion.div
                key="gtm"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <GTMView plan={plan} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
}
