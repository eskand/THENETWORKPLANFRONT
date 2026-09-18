/**
 * The six tiles of the dispatch header.
 *
 * Every value comes from DispatchKpiDto, which is counted from persisted rows.
 * Nothing here is derived in the browser: the number a dispatcher reads is the
 * number the database answered.
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

export default function KpiStrip({ kpi }) {
  if (!kpi) return null

  const tiles = [
    {
      label: 'Flights today',
      value: kpi.flightsToday,
      hint: `${kpi.tails} tails`,
      accent: 'var(--accent-orange)',
    },
    {
      label: 'Services ready',
      value: kpi.servicesReady,
      hint: 'every request confirmed',
      accent: 'var(--ready-fg)',
      valueColor: 'var(--ready-fg)',
    },
    {
      label: 'Services pending',
      value: kpi.servicesPending,
      hint: kpi.servicesPending
        ? `${kpi.servicesPending} file${kpi.servicesPending === 1 ? '' : 's'} need action`
        : 'all clear',
      accent: 'var(--pending-fg)',
      valueColor: 'var(--pending-fg)',
    },
    {
      label: 'Permits outstanding',
      value: kpi.permitsOutstanding,
      hint: 'overflight, not confirmed',
      accent: 'var(--info-fg)',
      valueColor: kpi.permitsOutstanding > 0 ? 'var(--pending-fg)' : undefined,
    },
    {
      label: 'Crew unassigned',
      value: kpi.crewUnassigned,
      hint: kpi.crewUnassigned ? 'roles to fill' : 'fully crewed',
      accent: 'var(--accent-teal)',
      valueColor: kpi.crewUnassigned > 0 ? 'var(--attention-fg)' : undefined,
    },
    {
      label: 'Delays / AOG',
      value: kpi.delaysAndAog,
      hint: kpi.delaysAndAog ? 'needs attention' : 'on schedule',
      accent: 'var(--attention-fg)',
      valueColor: kpi.delaysAndAog > 0 ? 'var(--attention-fg)' : undefined,
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
