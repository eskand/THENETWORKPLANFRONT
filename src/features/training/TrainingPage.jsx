import { useMemo, useState } from 'react'
import TopBar from '../../components/TopBar'
import { ErrorState } from '../../components/States'
import { useTrainingCompliance, useTrainingSessions } from '../../hooks/useTraining'
import { isoDate } from '../../lib/format'
import ComplianceMatrix from './components/ComplianceMatrix'
import SessionList from './components/SessionList'
import TrainingDrawer from './components/TrainingDrawer'

const TABS = [
  { id: 'COMPLIANCE', label: 'Compliance' },
  { id: 'CALENDAR', label: 'Calendar' },
]

/**
 * Training.
 *
 * The compliance matrix answers the audit's finding directly: every active
 * crew member appears, against every mandatory course, and a pair with no
 * record is a MISSING cell rather than an empty one.
 */
export default function TrainingPage() {
  const [tab, setTab] = useState('COMPLIANCE')
  const [horizon, setHorizon] = useState(90)
  const [selected, setSelected] = useState(null)

  const range = useMemo(() => {
    const today = new Date()
    const end = new Date(today.getTime() + horizon * 86_400_000)
    return { from: isoDate(today), to: isoDate(end) }
  }, [horizon])

  const compliance = useTrainingCompliance()
  const sessions = useTrainingSessions(range)

  const data = compliance.data
  const kpi = [
    {
      label: 'Crew covered',
      value: data?.crewCount ?? '—',
      hint: 'active crew in the matrix',
      accent: 'var(--accent-orange)',
    },
    {
      label: 'Valid certificates',
      value: data?.compliantCount ?? '—',
      hint: 'in date',
      accent: 'var(--ready-fg)',
      valueColor: 'var(--ready-fg)',
    },
    {
      label: 'Expiring',
      value: data?.expiringCount ?? '—',
      hint: 'within 30 days',
      accent: 'var(--pending-fg)',
      valueColor: 'var(--pending-fg)',
    },
    {
      label: 'Expired',
      value: data?.expiredCount ?? '—',
      hint: 'renewal overdue',
      accent: 'var(--attention-fg)',
      valueColor: 'var(--attention-fg)',
    },
    {
      label: 'Never recorded',
      value: data?.missingCount ?? '—',
      hint: 'no record for that course',
      accent: 'var(--info-fg)',
      valueColor: 'var(--info-fg)',
    },
  ]

  return (
    <>
      <TopBar
        title="Training"
        subtitle="Recurrent programme, sessions and the compliance of every crew file"
      />

      <div className="shell__scroll">
        <main className="page">
          {compliance.isError ? (
            <ErrorState error={compliance.error} onRetry={() => compliance.refetch()} />
          ) : (
            <>
              <div className="kpi-strip">
                {kpi.map((tile) => (
                  <div
                    className="kpi"
                    key={tile.label}
                    style={{ '--kpi-accent': tile.accent, '--kpi-value': tile.valueColor }}
                  >
                    <span className="kpi__corners" />
                    <div className="eyebrow">{tile.label}</div>
                    <div className="kpi__value">{tile.value}</div>
                    <div className="kpi__hint">{tile.hint}</div>
                  </div>
                ))}
              </div>

              <div className="toolbar">
                <div className="tabs">
                  {TABS.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className={entry.id === tab ? 'tab tab--active' : 'tab'}
                      onClick={() => setTab(entry.id)}
                    >
                      {entry.label}
                      {entry.id === 'CALENDAR' && sessions.data ? (
                        <span className="tab__count">{sessions.data.length}</span>
                      ) : null}
                    </button>
                  ))}
                </div>

                {tab === 'CALENDAR' ? (
                  <label className="select-field">
                    <span>Horizon:</span>
                    <select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))}>
                      <option value={30}>30 days</option>
                      <option value={90}>90 days</option>
                      <option value={180}>180 days</option>
                    </select>
                  </label>
                ) : null}

                <div className="legend">
                  <span><i style={{ background: 'var(--ready-fg)' }} />Valid</span>
                  <span><i style={{ background: 'var(--pending-fg)' }} />Expiring</span>
                  <span><i style={{ background: 'var(--attention-fg)' }} />Expired</span>
                  <span><i style={{ background: 'var(--text-faint)' }} />Never recorded</span>
                </div>
              </div>

              {tab === 'COMPLIANCE' ? (
                <ComplianceMatrix
                  compliance={data}
                  loading={compliance.isLoading}
                  onSelect={setSelected}
                  selectedId={selected?.personId}
                />
              ) : (
                <SessionList sessions={sessions.data ?? []} loading={sessions.isLoading} />
              )}
            </>
          )}
        </main>
      </div>

      <TrainingDrawer row={selected} onClose={() => setSelected(null)} />
    </>
  )
}
