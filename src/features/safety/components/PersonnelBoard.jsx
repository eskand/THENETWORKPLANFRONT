import { useMemo, useState } from 'react'
import Badge from '../../../components/Badge'
import { LoadingState } from '../../../components/States'
import { useCrewList } from '../../../hooks/useCrew'
import { EMPTY, dayMonthYear } from '../../../lib/format'

/**
 * Personnel.
 *
 * <b>One question: who may be rostered tomorrow.</b> The worst of the three
 * clocks — licence, medical, recurrent training — decides the row's state,
 * because an expired medical grounds a pilot as completely as an expired
 * licence does. Sorting by the worst clock puts the people who cannot fly at
 * the top, which is where the question is actually asked.
 *
 * The source is the crew register, not a copy of it: a second personnel list
 * inside the safety module would be out of date the day someone renewed.
 */

const FILTERS = [
  ['all', 'All'],
  ['EXPIRED', 'Not current'],
  ['CRITICAL', '≤ 14 days'],
  ['DUE', '≤ 30 days'],
  ['CURRENT', 'Current'],
]

const STATE_TONE = {
  EXPIRED: 'ATTENTION', CRITICAL: 'ATTENTION', DUE: 'PENDING', CURRENT: 'READY',
}

const STATE_LABEL = {
  EXPIRED: 'Not current', CRITICAL: '≤ 14 days', DUE: '≤ 30 days', CURRENT: 'Current',
}

export default function PersonnelBoard({ accountability }) {
  const [filter, setFilter] = useState('all')
  const crew = useCrewList({ activeOnly: true })

  const people = useMemo(() => (crew.data ?? []).map((person) => {
    const clocks = [person.licenceExpiry, person.medicalExpiry, person.trainingExpiry]
      .map(daysUntil)
      .filter((days) => days !== null)
    const worst = clocks.length ? Math.min(...clocks) : null
    return { ...person, worst, state: stateOf(worst) }
  }).sort((a, b) => (a.worst ?? 9999) - (b.worst ?? 9999)), [crew.data])

  const shown = filter === 'all' ? people : people.filter((person) => person.state === filter)
  const expired = people.filter((person) => person.state === 'EXPIRED').length
  const soon = people.filter((person) => ['CRITICAL', 'DUE'].includes(person.state)).length

  if (crew.isError) {
    return <div className="sms-empty">{crew.error?.message}</div>
  }
  if (!crew.data) {
    return <LoadingState label="Reading the personnel register…" />
  }

  return (
    <>
      <div className="kpi-strip">
        <Kpi label="Licence holders" value={people.length} hint="on the crew register" />
        <Kpi label="Not current" value={expired}
             hint={expired ? 'must not be rostered' : 'none'}
             accent="var(--attention-fg)" alarm={expired > 0} />
        <Kpi label="Expiring within 30 days" value={soon} hint="schedule renewal"
             accent="var(--pending-fg)" />
        <Kpi
          label="Accountable Manager"
          value={accountability?.accountableManager?.split('—')[0]?.trim() ?? EMPTY}
          hint="ICAO Annex 19 · EASA ORO.GEN.210"
          small
        />
      </div>

      <section className="panel">
        <header className="panel__head">
          <h2>Just Culture</h2>
        </header>
        <p className="sms-note">
          Reporting an honest error will not of itself lead to disciplinary action. Wilful
          violations and destructive acts remain outside the protection of the policy.
          Confidential reports are de-identified by the Safety Manager before any analysis is
          shared.
        </p>
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2>Currency</h2>
          <div className="sms-filters">
            {FILTERS.map(([key, label]) => {
              const count = key === 'all'
                ? people.length
                : people.filter((person) => person.state === key).length
              return (
                <button
                  key={key}
                  type="button"
                  className={filter === key ? 'sms-ftag is-on' : 'sms-ftag'}
                  onClick={() => setFilter(key)}
                >
                  {label} ({count})
                </button>
              )
            })}
          </div>
        </header>

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Base</th>
              <th>Licence</th>
              <th>Medical</th>
              <th>Recurrent training</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((person) => (
              <tr key={person.id}>
                <td><b>{person.fullName}</b></td>
                <td className="table__sub">{person.mainRole ?? EMPTY}</td>
                <td className="table__sub">{person.baseIcao ?? EMPTY}</td>
                <td><Clock date={person.licenceExpiry} /></td>
                <td><Clock date={person.medicalExpiry} /></td>
                <td><Clock date={person.trainingExpiry} /></td>
                <td>
                  <Badge tone={STATE_TONE[person.state] ?? 'NEUTRAL'}>
                    {STATE_LABEL[person.state] ?? EMPTY}
                  </Badge>
                </td>
              </tr>
            ))}
            {!shown.length ? (
              <tr>
                <td colSpan={7} className="table__empty">No personnel match this filter.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="sms-note">Source: the Crew Management and Training modules.</p>
      </section>
    </>
  )
}

/** Days until a date, or null when nothing is recorded. */
function daysUntil(date) {
  if (!date) return null
  const then = new Date(`${date}T00:00:00Z`).getTime()
  return Math.ceil((then - Date.now()) / 86_400_000)
}

/** The worst clock decides. An expired medical grounds as surely as a licence. */
function stateOf(worst) {
  if (worst === null) return 'CURRENT'
  if (worst < 0) return 'EXPIRED'
  if (worst <= 14) return 'CRITICAL'
  if (worst <= 30) return 'DUE'
  return 'CURRENT'
}

function Clock({ date }) {
  const days = daysUntil(date)
  if (days === null) return <span className="table__sub">{EMPTY}</span>
  const tone = days < 0 || days <= 14 ? 'is-alarm' : days <= 30 ? 'is-warn' : ''
  return (
    <span className="sms-clock">
      <b className={tone}>{days < 0 ? `${Math.abs(days)} d overdue` : `${days} d`}</b>
      <i>{dayMonthYear(date)}</i>
    </span>
  )
}

function Kpi({ label, value, hint, accent, alarm, small }) {
  return (
    <div className="kpi" style={{
      '--kpi-accent': accent ?? 'var(--accent-orange)',
      '--kpi-value': alarm ? accent : undefined,
      '--kpi-size': small ? '15px' : undefined,
    }}>
      <span className="kpi__corners" />
      <div className="eyebrow">{label}</div>
      <div className="kpi__value">{value}</div>
      <div className="kpi__hint">{hint}</div>
    </div>
  )
}
