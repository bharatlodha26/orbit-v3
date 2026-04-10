import { motion } from 'framer-motion';
import type { ScoringTheme } from '../types';
import { QUALITY_LABEL } from '../services/scoringMockApi';

interface ShareExportScreenProps {
  themes: ScoringTheme[];
  quarter: string;
  onBackToThemes: () => void;
  onBuildPlan: () => void;
  onHome: () => void;
}

export function ShareExportScreen({ themes, quarter, onBackToThemes, onBuildPlan, onHome }: ShareExportScreenProps) {

  const handleExportOnePager = () => {
    const lines: string[] = [
      `${quarter} Initiative Scoring — Model One-Pager`,
      '='.repeat(50),
      '',
    ];

    themes.forEach(theme => {
      lines.push(`${theme.icon} ${theme.name} (${theme.allocation}%, ${theme.engWeeks} eng-wks)`);
      lines.push('  Scoring model:');
      theme.model.forEach(dim => {
        lines.push(`    ${dim.shortName}: ${dim.weight}%`);
      });
      if (theme.modelNarrative) {
        lines.push(`  Belief: "${theme.modelNarrative}"`);
      }
      lines.push('');
    });

    download(`${quarter}-model-one-pager.txt`, lines.join('\n'));
  };

  const handleExportRankedList = () => {
    const data = themes.map(theme => {
      const ranked = [...theme.initiatives]
        .filter(i => i.status === 'scored')
        .sort((a, b) => (a.overrideRank ?? a.rank ?? 99) - (b.overrideRank ?? b.rank ?? 99));

      return {
        theme: theme.name,
        allocation: theme.allocation,
        engWeeks: theme.engWeeks,
        initiatives: ranked.map((ini, i) => ({
          rank: i + 1,
          name: ini.name,
          composite: ini.composite,
          effortWeeks: ini.effortWeeks,
          overrideRank: ini.overrideRank,
          overrideReason: ini.overrideReason,
        })),
      };
    });

    download(`${quarter}-ranked-initiatives.json`, JSON.stringify(data, null, 2));
  };

  const handleExportAuditTrail = () => {
    const data = themes.map(theme => ({
      theme: theme.name,
      model: theme.model.map(d => ({ dimension: d.name, weight: d.weight })),
      modelNarrative: theme.modelNarrative,
      initiatives: theme.initiatives
        .filter(i => i.status === 'scored')
        .map(ini => ({
          name: ini.name,
          nlInput: ini.nlInput,
          composite: ini.composite,
          scores: ini.scores.map(sc => ({
            dimension: theme.model.find(d => d.id === sc.dimensionId)?.name ?? sc.dimensionId,
            score: sc.score,
            evidence: sc.evidence,
            quality: QUALITY_LABEL[sc.quality],
          })),
          narrative: ini.narrative,
          overrideRank: ini.overrideRank,
          overrideReason: ini.overrideReason,
        })),
    }));

    download(`${quarter}-evidence-audit-trail.json`, JSON.stringify(data, null, 2));
  };

  const actions = [
    { label: 'Model one-pager', desc: 'Scoring dimensions & weights for each theme', icon: '📋', onClick: handleExportOnePager },
    { label: 'Ranked initiative list', desc: 'Prioritized initiatives with scores per theme', icon: '📊', onClick: handleExportRankedList },
    { label: 'Evidence audit trail', desc: 'Full scoring breakdown with evidence quality tags', icon: '🔍', onClick: handleExportAuditTrail },
  ];

  // Summary stats
  const totalScored = themes.reduce((s, t) => s + t.initiatives.filter(i => i.status === 'scored').length, 0);
  const totalInitiatives = themes.reduce((s, t) => s + t.initiatives.length, 0);

  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="screen-inner share-export-layout">

        {/* ── Scrollable body ───────────────────────────────── */}
        <div className="share-export-body">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="post-lock-check"
          >
            ✓
          </motion.div>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              {quarter} Scoring Complete
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              {totalScored}/{totalInitiatives} initiatives scored across {themes.length} themes
            </p>
          </div>

          {/* Theme summary cards */}
          <div className="export-theme-summary" style={{ width: '100%' }}>
            {themes.map(theme => {
              const scored = theme.initiatives.filter(i => i.status === 'scored');
              const top = [...scored].sort((a, b) => b.composite - a.composite)[0];
              return (
                <div key={theme.id} className="export-theme-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span>{theme.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{theme.name}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {scored.length} scored · {theme.engWeeks} wks
                  </p>
                  {top && (
                    <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2 }}>
                      Top: {top.name} ({top.composite})
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Export actions */}
          <div style={{ width: '100%' }}>
            <p className="screen-section-label">Export</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {actions.map((action, i) => (
                <motion.button
                  key={action.label}
                  className="btn-action"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={action.onClick}
                >
                  <span style={{ fontSize: 18 }}>{action.icon}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{action.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{action.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sticky footer ─────────────────────────────────── */}
        <div className="share-export-footer">
          <motion.button
            className="btn-primary btn-large share-build-plan-btn"
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={onBuildPlan}
          >
            Build Quarter Plan →
          </motion.button>
          <div style={{ display: 'flex', gap: 12 }}>
            <motion.button
              className="btn-secondary"
              style={{ flex: 1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onBackToThemes}
            >
              Score more themes
            </motion.button>
            <motion.button
              className="btn-ghost"
              style={{ flex: 1, justifyContent: 'center' }}
              whileTap={{ scale: 0.97 }}
              onClick={onHome}
            >
              Done
            </motion.button>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
