import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlanState, PlanTheme, PlanInitiative } from '../types';
import { getInitiativeCompleteness, getPlanCompleteness } from '../services/planMockApi';
import { useAudio } from '../hooks/useAudio';
import { useHaptic } from '../hooks/useHaptic';

interface PlanCanvasScreenProps {
  plan: PlanState;
  onUpdateInitiative: (themeId: string, updated: PlanInitiative) => void;
  onPreview: () => void;
  onBack: () => void;
}

// ── Initiative Editor (Screen 4.0b) ─────────────────────────

interface EditorProps {
  ini: PlanInitiative;
  themeColor: string;
  onSave: (updated: PlanInitiative) => void;
  onClose: () => void;
}

function InitiativeEditor({ ini, themeColor, onSave, onClose }: EditorProps) {
  const [draft, setDraft] = useState<PlanInitiative>({ ...ini });
  const [depInput, setDepInput] = useState('');
  const audio  = useAudio();
  const haptic = useHaptic();

  const set = (key: keyof PlanInitiative, value: unknown) => {
    setDraft(d => ({ ...d, [key]: value }));
  };

  const addDep = () => {
    const v = depInput.trim();
    if (!v) return;
    setDraft(d => ({ ...d, dependencies: [...d.dependencies, v] }));
    setDepInput('');
  };

  const removeDep = (i: number) => {
    setDraft(d => ({ ...d, dependencies: d.dependencies.filter((_, idx) => idx !== i) }));
  };

  return (
    <motion.div
      className="plan-editor"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
    >
      <div className="plan-editor-inner">

        {/* GENERAL */}
        <div className="plan-editor-section">
          <p className="plan-editor-section-label">General</p>
          <div className="plan-editor-row">
            <label className="plan-editor-label">Effort (weeks)</label>
            <input
              className="text-input plan-editor-input-sm"
              type="number"
              min={1}
              max={26}
              value={draft.effortWeeks}
              onChange={e => set('effortWeeks', parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div className="plan-editor-row">
            <label className="plan-editor-label">Timeline</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Wk</span>
              <input
                className="text-input plan-editor-input-sm"
                type="number"
                min={1}
                value={draft.timelineStart}
                onChange={e => set('timelineStart', parseInt(e.target.value, 10) || 1)}
              />
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>→ Wk</span>
              <input
                className="text-input plan-editor-input-sm"
                type="number"
                min={1}
                value={draft.timelineEnd}
                onChange={e => set('timelineEnd', parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>
          <div className="plan-editor-row">
            <label className="plan-editor-label">Dependencies</label>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: draft.dependencies.length ? 6 : 0 }}>
                {draft.dependencies.map((dep, i) => (
                  <span key={i} className="plan-dep-tag">
                    {dep}
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => { audio.playTap(); removeDep(i); }} style={{ marginLeft: 4, fontSize: 10, color: 'var(--text-tertiary)' }}>×</motion.button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="text-input"
                  style={{ fontSize: 12 }}
                  placeholder="Add dependency…"
                  value={depInput}
                  onChange={e => setDepInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDep()}
                />
                <motion.button className="btn-pick" whileTap={{ scale: 0.95 }} style={{ fontSize: 12, padding: '0 12px' }} onClick={() => { audio.playTap(); addDep(); }}>+</motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* FOR EXECUTIVES */}
        <div className="plan-editor-section">
          <p className="plan-editor-section-label" style={{ color: themeColor }}>For Executives</p>
          <div className="plan-editor-row">
            <label className="plan-editor-label">OKR mapping</label>
            <input
              className="text-input"
              value={draft.okrMapping}
              onChange={e => set('okrMapping', e.target.value)}
              placeholder="e.g. Accelerate enterprise revenue"
            />
          </div>
          <div className="plan-editor-row">
            <label className="plan-editor-label">Business impact</label>
            <textarea
              className="text-input plan-editor-textarea"
              value={draft.businessImpact}
              onChange={e => set('businessImpact', e.target.value)}
              placeholder="e.g. Unblocks $600K pipeline…"
              rows={2}
            />
          </div>
          <div className="plan-editor-row">
            <label className="plan-editor-label">Success metric</label>
            <input
              className="text-input"
              value={draft.successMetric}
              onChange={e => set('successMetric', e.target.value)}
              placeholder="e.g. Enterprise NRR ≥ 105%"
            />
          </div>
        </div>

        {/* FOR ENGINEERING */}
        <div className="plan-editor-section">
          <p className="plan-editor-section-label" style={{ color: '#10B981' }}>For Engineering</p>
          <div className="plan-editor-row">
            <label className="plan-editor-label">Assigned team</label>
            <input
              className="text-input"
              value={draft.assignedTeam}
              onChange={e => set('assignedTeam', e.target.value)}
              placeholder="e.g. Platform squad"
            />
          </div>
          <div className="plan-editor-row">
            <label className="plan-editor-label">Sprint breakdown</label>
            <textarea
              className="text-input plan-editor-textarea"
              value={draft.sprintBreakdown}
              onChange={e => set('sprintBreakdown', e.target.value)}
              placeholder="Sprint 1–2: implementation. Sprint 3: QA & deploy."
              rows={2}
            />
          </div>
          <div className="plan-editor-row">
            <label className="plan-editor-label">Tech risk</label>
            <div className="plan-editor-pill-group">
              {(['Low', 'Medium', 'High'] as const).map(r => (
                <motion.button
                  key={r}
                  className={`plan-pill ${draft.techRisk === r ? 'plan-pill-active' : ''}`}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => { audio.playToggle(); set('techRisk', r); }}
                >
                  {r}
                </motion.button>
              ))}
            </div>
          </div>
          <div className="plan-editor-row">
            <label className="plan-editor-label">Carry-over</label>
            <div className="plan-editor-pill-group">
              {(['No', 'Yes'] as const).map(v => (
                <motion.button
                  key={v}
                  className={`plan-pill ${(draft.isCarryOver ? 'Yes' : 'No') === v ? 'plan-pill-active' : ''}`}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => { audio.playToggle(); set('isCarryOver', v === 'Yes'); }}
                >
                  {v}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* FOR GTM */}
        <div className="plan-editor-section">
          <p className="plan-editor-section-label" style={{ color: '#F59E0B' }}>For GTM / Sales</p>
          <div className="plan-editor-row">
            <label className="plan-editor-label">Customer name</label>
            <input
              className="text-input"
              value={draft.customerFacingName}
              onChange={e => set('customerFacingName', e.target.value)}
              placeholder="e.g. Enhanced Audit Logging"
            />
          </div>
          <div className="plan-editor-row">
            <label className="plan-editor-label">Customer desc</label>
            <textarea
              className="text-input plan-editor-textarea"
              value={draft.customerFacingDesc}
              onChange={e => set('customerFacingDesc', e.target.value)}
              placeholder="Full audit trail for compliance teams…"
              rows={2}
            />
          </div>
          <div className="plan-editor-row">
            <label className="plan-editor-label">Target ship wk</label>
            <input
              className="text-input plan-editor-input-sm"
              type="number"
              min={1}
              value={draft.targetShipWeek}
              onChange={e => set('targetShipWeek', parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div className="plan-editor-row">
            <label className="plan-editor-label">Sales ref after wk</label>
            <input
              className="text-input plan-editor-input-sm"
              type="number"
              min={1}
              value={draft.salesCanReferenceWeek}
              onChange={e => set('salesCanReferenceWeek', parseInt(e.target.value, 10) || 1)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
          <motion.button
            className="btn-primary"
            style={{ flex: 1, padding: '10px 0', fontSize: 14 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { audio.playSave(); haptic.tap(); onSave(draft); }}
          >
            Save
          </motion.button>
          <motion.button className="btn-ghost" whileTap={{ scale: 0.95 }} style={{ fontSize: 13 }} onClick={() => { audio.playTap(); onClose(); }}>Cancel</motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Theme Section ────────────────────────────────────────────

interface ThemeSectionProps {
  theme: PlanTheme;
  expandedId: string | null;
  onExpand: (id: string | null) => void;
  onSave: (updated: PlanInitiative) => void;
}

function ThemeSection({ theme, expandedId, onExpand, onSave }: ThemeSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const totalWks = theme.initiatives.reduce((s, i) => s + i.effortWeeks, 0);
  const audio  = useAudio();
  const haptic = useHaptic();

  return (
    <div className="plan-theme-section" style={{ borderColor: theme.color + '40' }}>
      {/* Theme header */}
      <motion.button className="plan-theme-header" whileTap={{ scale: 0.99 }} onClick={() => { audio.playToggle(); setCollapsed(c => !c); }}>
        <span style={{ fontSize: 18 }}>{theme.icon}</span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <span className="plan-theme-name">{theme.name}</span>
          <span className="plan-theme-meta"> · {theme.allocation}% · {totalWks} wks · {theme.initiatives.length} initiatives</span>
        </div>
        <div
          className="plan-theme-alloc-pill"
          style={{ background: theme.color + '20', color: theme.color }}
        >
          {theme.allocation}%
        </div>
        <span className="plan-theme-chevron">{collapsed ? '▶' : '▼'}</span>
      </motion.button>

      {/* Initiative list */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {theme.initiatives.map((ini, i) => {
              const { complete, missing } = getInitiativeCompleteness(ini);
              const isExpanded = expandedId === ini.id;

              return (
                <div key={ini.id} className="plan-initiative-row-wrap">
                  {/* Row */}
                  <motion.button
                    className={`plan-initiative-row ${isExpanded ? 'plan-initiative-row-active' : ''}`}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => { audio.playTap(); haptic.tap(); onExpand(isExpanded ? null : ini.id); }}
                  >
                    <span className="plan-ini-rank" style={{ color: theme.color }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <p className="plan-ini-name">{ini.name}</p>
                      <p className="plan-ini-meta">
                        {ini.effortWeeks} wks · Wk {ini.timelineStart}–{ini.timelineEnd} · {ini.okrMapping || '—'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {complete ? (
                        <span className="plan-complete-badge">✓</span>
                      ) : (
                        <span className="plan-incomplete-badge" title={`Missing: ${missing.join(', ')}`}>
                          ⚠ {missing.length}
                        </span>
                      )}
                      <span className="plan-ini-chevron">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </motion.button>

                  {/* Inline editor */}
                  <AnimatePresence>
                    {isExpanded && (
                      <InitiativeEditor
                        ini={ini}
                        themeColor={theme.color}
                        onSave={updated => { onSave(updated); onExpand(null); }}
                        onClose={() => onExpand(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Plan Canvas Screen ──────────────────────────────────

export function PlanCanvasScreen({ plan, onUpdateInitiative, onPreview, onBack }: PlanCanvasScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const audio  = useAudio();
  const haptic = useHaptic();

  const handleExpand = useCallback((id: string | null) => {
    setExpandedId(id);
  }, []);

  const { pct, gaps } = getPlanCompleteness(plan.themes);
  const totalInitiatives = plan.themes.reduce((s, t) => s + t.initiatives.length, 0);
  const totalWeeks = plan.themes.reduce((s, t) => s + t.engWeeks, 0);

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner plan-canvas-layout">

        {/* Header */}
        <div className="plan-canvas-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <motion.button className="btn-ghost" whileTap={{ scale: 0.95 }} onClick={() => { audio.playNavigate(); haptic.tap(); onBack(); }} style={{ marginBottom: 4, padding: '4px 0' }}>
                ← Back
              </motion.button>
              <h2 className="plan-canvas-title">{plan.quarter} Plan</h2>
              <p className="plan-canvas-subtitle">
                {plan.themes.length} themes · {totalInitiatives} initiatives · ~{totalWeeks} eng-weeks
              </p>
            </div>
            <motion.button
              className="btn-primary"
              style={{ padding: '10px 18px', fontSize: 14, marginTop: 20 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { audio.playTransition(); haptic.tap(); onPreview(); }}
            >
              Preview ▾
            </motion.button>
          </div>
        </div>

        {/* Scrollable plan body */}
        <div className="plan-canvas-body">
          {plan.themes.map(theme => (
            <ThemeSection
              key={theme.id}
              theme={theme}
              expandedId={expandedId}
              onExpand={handleExpand}
              onSave={updated => onUpdateInitiative(theme.id, updated)}
            />
          ))}
        </div>

        {/* Completeness bar */}
        <div className="plan-completeness">
          <div className="plan-completeness-row">
            <span className="plan-completeness-label">Plan completeness</span>
            <span className="plan-completeness-pct">{pct}%</span>
          </div>
          <div className="plan-completeness-track">
            <motion.div
              className="plan-completeness-fill"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ background: pct >= 90 ? '#10B981' : pct >= 60 ? '#F59E0B' : 'var(--accent)' }}
            />
          </div>
          {gaps.length > 0 && (
            <p className="plan-completeness-hint">
              {gaps.length} initiative{gaps.length > 1 ? 's' : ''} need{gaps.length === 1 ? 's' : ''} more detail
            </p>
          )}
        </div>

      </div>
    </motion.div>
  );
}
