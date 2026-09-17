import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
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

  /* La competence SMS par role : combien de personnes de ce role sont a jour
     de leurs trois horloges. Le compte vient du registre equipage, pas d'un
     tableau de formation tenu a part qui divergerait le premier jour. */
  const byRole = []
  const roles = new Map()
  people.forEach((person) => {
    const role = person.mainRole ?? 'Unassigned'
    if (!roles.has(role)) roles.set(role, { role, total: 0, current: 0 })
    const entry = roles.get(role)
    entry.total += 1
    if (person.state === 'CURRENT') entry.current += 1
  })
  roles.forEach((entry) => byRole.push(entry))
  byRole.sort((a, b) => b.total - a.total)

  const compliant = people.filter((person) => person.state === 'CURRENT').length
  const compliance = people.length === 0 ? 0 : Math.round((compliant / people.length) * 100)

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Personnel &amp; Competence</div>
          <div className="page-sub">Every person whose duties affect safety — licences, medicals, recurrent training
            and SMS competence</div>
        </div>
        <div className="btn-row">
          <button type="button" className="btn-o" onClick={() => navigate('/crew-management')}>
            Open Crew Management
          </button>
          <button type="button" className="btn-o" onClick={() => navigate('/training')}>
            Open Training
          </button>
        </div>
      </div>

      <div className="kpi-row">
        <Kpi label="Personnel on the register" value={people.length} hint="on the crew register" />
        <Kpi label="Not current" value={expired}
             hint={expired ? 'must not be rostered' : 'none'}
             accent="var(--attention-fg)" alarm={expired > 0} />
        <Kpi label="Expiring within 30 days" value={soon} hint="schedule renewal"
             accent="var(--pending-fg)" />
        <Kpi label="SMS training compliance" value={`${compliance}%`}
             hint={`${compliant} of ${people.length} personnel`}
             accent="var(--ready-fg)" />
      </div>

      <div className="sms-row sms-row--2">
        <section className="card">
          <div className="card-hdr">
            <h3 className="card-title">SMS training and competence by role</h3>
            <span className="mtx-note">ICAO Annex 19 · safety promotion</span>
          </div>
          {byRole.map((entry) => {
            const percent = entry.total === 0 ? 0
              : Math.round((entry.current / entry.total) * 100)
            const colour = percent >= 95 ? 'var(--ready-fg)'
              : percent >= 80 ? 'var(--pending-fg)' : 'var(--attention-fg)'
            return (
              <div className="sms-domain" key={entry.role}>
                <div className="sms-domain__name">{entry.role}</div>
                <div className="sms-domain__bar">
                  <div className="sms-domain__seg"
                       style={{ width: `${percent}%`, background: colour }} />
                </div>
                <div className="sms-domain__count" style={{ color: colour }}>
                  {entry.current}/{entry.total}
                </div>
              </div>
            )
          })}
          {byRole.length === 0 ? (
            <p className="mtx-note">Nobody is on the crew register yet.</p>
          ) : null}
        </section>

        <section className="card">
          <div className="card-hdr">
            <h3 className="card-title">Just Culture — reporting behaviour</h3>
          </div>
          <p className="mtx-note">
            Reporting an honest error will not of itself lead to disciplinary action. Wilful
            violations and destructive acts remain outside the protection of the policy.
            Confidential reports are de-identified by the Safety Manager before any analysis is
            shared.
          </p>
          <div className="acc-row">
            <span>Accountable Manager</span>
            <b>{accountability?.accountableManager ?? EMPTY}
              <i>ICAO Annex 19 · EASA ORO.GEN.210</i></b>
          </div>
          <div className="acc-row">
            <span>Safety Manager</span>
            <b>{accountability?.safetyManager ?? EMPTY}
              <i>focal point for the management system</i></b>
          </div>
          <div className="acc-row">
            <span>Just Culture policy</span>
            <b>Active<i>declared for the whole platform</i></b>
          </div>
        </section>
      </div>

      <section className="card">
        <header className="card-hdr">
          <h2>Currency</h2>
          <div className="filter-bar">
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
        <p className="mtx-note">Source: the Crew Management and Training modules.</p>
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

/**
 * Une tuile de l'annexe.
 *
 * <p>Les pages appellent encore ce helper avec leurs propres arguments ; il
 * rend maintenant la carte du prototype. La couleur vient de l'etat — un
 * chiffre en alerte prend le rouge de l'annexe — et l'icone reste neutre :
 * ces trois pages n'en declarent pas, et en inventer une par tuile aurait
 * ajoute un symbole que l'annexe ne porte pas.
 */
function Kpi({ label, value, hint, accent, alarm }) {
  const tone = alarm ? 'c2' : accent === 'var(--pending-fg)' ? 'c5'
    : accent === 'var(--ready-fg)' ? 'c4' : 'c1'
  return (
    <div className={`kc ${tone}`}>
      <div className="kc-lbl">{label}</div>
      <div className="kc-val">{value}</div>
      <div className="kc-sub">{hint}</div>
    </div>
  )
}
