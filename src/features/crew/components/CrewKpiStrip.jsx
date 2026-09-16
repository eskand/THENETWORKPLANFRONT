/**
 * The five tiles of Crew Management.
 *
 * Every tile is a count of rows the API returned, or the length of the expiry
 * list the API answered — never an estimate computed from something else. The
 * dispatch board gets its tiles from the server because it aggregates five
 * domains; here one endpoint returns the rows, so counting them is the same
 * fact, not a second version of it.
 */
function KpiTile({ label, value, hint, accent, valueColor }) {
  return (
    <div className="kpi" style={{ '--kpi-accent': accent, '--kpi-value': valueColor }}>
      <span className="kpi__corners" />
      <div className="eyebrow">{label}</div>
      <div className="kpi__value">{value}</div>
      <div className="kpi__hint">{hint}</div>
    </div>
  )
}

export default function CrewKpiStrip({ people = [], expiries = [], loading }) {
  if (loading && people.length === 0) return null

  const captains = people.filter((person) => person.mainRole === 'CAPTAIN').length
  const firstOfficers = people.filter((person) => person.mainRole === 'FIRST_OFFICER').length
  const expired = people.filter((person) => person.documentStatus === 'EXPIRED').length
  const unknown = people.filter((person) => person.documentStatus === 'UNKNOWN').length
  const absent = people.filter((person) => person.absentToday).length

  const tiles = [
    {
      label: 'Crew on file',
      value: people.length,
      hint: `${captains} captains · ${firstOfficers} first officers`,
      accent: 'var(--accent-orange)',
    },
    {
      label: 'Available today',
      value: people.length - absent,
      hint: `${absent} absent`,
      accent: 'var(--ready-fg)',
      valueColor: 'var(--ready-fg)',
    },
    {
      label: 'Documents expired',
      value: expired,
      hint: expired === 0 ? 'nobody grounded by paperwork' : 'cannot be rostered',
      accent: 'var(--attention-fg)',
      valueColor: expired > 0 ? 'var(--attention-fg)' : undefined,
    },
    {
      label: 'Dates missing',
      value: unknown,
      hint: 'no expiry on file — unknown, not valid',
      accent: 'var(--info-fg)',
      valueColor: unknown > 0 ? 'var(--info-fg)' : undefined,
    },
    {
      label: 'Expiring, 90 days',
      value: expiries.length,
      hint: 'qualifications to renew',
      accent: 'var(--pending-fg)',
      valueColor: expiries.length > 0 ? 'var(--pending-fg)' : undefined,
    },
  ]

  return (
    <div className="kpi-strip">
      {tiles.map((tile) => (
        <KpiTile key={tile.label} {...tile} />
      ))}
    </div>
  )
}
