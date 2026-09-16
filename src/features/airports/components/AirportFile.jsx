import { useState } from 'react'
import Badge from '../../../components/Badge'
import { EMPTY, dayMonthYear } from '../../../lib/format'

/**
 * The aerodrome file: four tabs, in the prototype's order.
 *
 * Overview answers "can we go there", Services "who meets us", Contacts "who
 * do I telephone", Freq / Rwy "what do I set and where do I land". The order
 * is the order an operator asks the questions in.
 */

const TABS = [
  ['ov', 'Overview'],
  ['sv', 'Services'],
  ['co', 'Contacts'],
  ['fr', 'Freq / Rwy'],
]

/** Les six categories de service de l'annexe A4, dans son ordre. */
const SERVICE_GROUPS = [
  ['FBO', 'FBO'],
  ['HANDLING', 'Handlers'],
  ['TRIP_SUPPORT', 'Trip support'],
  ['FUEL', 'Fuel'],
  ['SUPERVISORY', 'Supervisory agents'],
  ['CATERING', 'Catering'],
]

const NOTE_TONE = { CRITICAL: 'ATTENTION', WARNING: 'PENDING', INFO: 'INFO' }

export default function AirportFile({ detail }) {
  const [tab, setTab] = useState('ov')
  const airport = detail.airport
  const services = detail.services ?? []
  const contactable = services.filter((entry) => entry.phone || entry.email || entry.afterHours)

  return (
    <div className="apf">
      <header className="apf__head">
        <div>
          <h2>
            {airport.icao}
            {airport.iata ? <span className="apf__iata">{airport.iata}</span> : null}
          </h2>
          <p>{airport.name}</p>
          <p className="apf__where">
            {[airport.city, airport.countryIso2].filter(Boolean).join(' · ')}
            {airport.timeZone ? ` · ${airport.timeZone}` : ''}
          </p>
        </div>
        <div className="apf__flags">
          {airport.trafficLevel ? (
            <Badge tone={airport.trafficLevel === 'HIGH' ? 'ATTENTION' : 'READY'}>
              {airport.trafficLevel} traffic
            </Badge>
          ) : null}
          {airport.slotRequired ? (
            <Badge tone="ATTENTION">Slots required</Badge>
          ) : null}
          {detail.legsLast90Days > 0 ? (
            <Badge tone="INFO">{detail.legsLast90Days} legs / 90 d</Badge>
          ) : null}
        </div>
      </header>

      <nav className="apf__tabs">
        {TABS.map(([id, label]) => {
          const count =
            id === 'sv' ? services.length : id === 'co' ? contactable.length : null
          return (
            <button
              key={id}
              type="button"
              className={tab === id ? 'is-on' : undefined}
              onClick={() => setTab(id)}
            >
              {label}
              {count ? <span className="apf__tcnt">{count}</span> : null}
            </button>
          )
        })}
      </nav>

      <div className="apf__body">
        {tab === 'ov' ? <Overview detail={detail} /> : null}
        {tab === 'sv' ? <Services services={services} /> : null}
        {tab === 'co' ? <Contacts services={contactable} /> : null}
        {tab === 'fr' ? <FreqRwy detail={detail} /> : null}
      </div>
    </div>
  )
}

function Overview({ detail }) {
  const a = detail.airport
  return (
    <div className="apf__grid">
      <section className="apf__card">
        <h3>Airport information</h3>
        <Row label="ICAO" value={a.icao} mono />
        <Row label="IATA" value={a.iata} mono />
        <Row label="Country" value={a.countryIso2} />
        <Row label="Timezone" value={a.timeZone} />
        <Row label="Elevation" value={a.elevationFt == null ? null : `${a.elevationFt} ft`} mono />
        <Row
          label="Position"
          value={
            a.latitude == null
              ? null
              : `${Number(a.latitude).toFixed(4)}, ${Number(a.longitude).toFixed(4)}`
          }
          mono
        />
        <Row label="Traffic" value={a.trafficLevel} alarm={a.trafficLevel === 'HIGH'} />
        <Row label="Fuel type" value={a.fuelType} />
        <Row label="Fire category" value={a.fireCategory} alarm={!!a.fireCategory} mono />
        <Row label="Aerodrome category" value={a.aerodromeCategory} />
        <Row label="RFFS category" value={a.rffsCategory} mono />
        <Row label="Slots" value={a.slotRequired ? 'REQUIRED' : null} alarm />
        <Row label="SCR / SMA" value={a.slotRegime} alarm={!!a.slotRegime} />
        <Row label="Operating hours" value={a.operatingHours} />
        <Row label="Restrictions" value={a.restrictions} alarm={!!a.restrictions} />
      </section>

      <div>
        <section className="apf__card">
          <h3>Operator use</h3>
          <Row label="Legs, last 90 days" value={detail.legsLast90Days} mono />
          <Row label="Departures" value={detail.departuresLast90Days} mono />
          <Row label="Arrivals" value={detail.arrivalsLast90Days} mono />
          <p className="apf__note">
            Counted from the flown legs, not from the schedule. A station we have
            never used shows zero, which is the honest answer for most of a
            directory this size.
          </p>
        </section>

        <section className="apf__card">
          <h3>Operator notes</h3>
          {detail.notes?.length ? (
            detail.notes.map((note) => (
              <div className="apf__noterow" key={note.id}>
                <Badge tone={NOTE_TONE[note.severity] ?? 'INFO'}>{note.kind}</Badge>
                <div>
                  <b>{note.title}</b>
                  {note.detail ? <span>{note.detail}</span> : null}
                  <i>
                    {note.inForce ? 'In force' : 'Not in force'}
                    {note.validFrom ? ` · from ${dayMonthYear(note.validFrom)}` : ''}
                    {note.validTo ? ` to ${dayMonthYear(note.validTo)}` : ''}
                  </i>
                </div>
              </div>
            ))
          ) : (
            <p className="apf__none">No operator note on this aerodrome.</p>
          )}
        </section>
      </div>
    </div>
  )
}

function Services({ services }) {
  const byType = new Map()
  services.forEach((entry) => {
    if (!byType.has(entry.serviceType)) byType.set(entry.serviceType, [])
    byType.get(entry.serviceType).push(entry)
  })

  const groups = SERVICE_GROUPS.filter(([id]) => byType.has(id))

  if (!groups.length) {
    return <p className="apf__none">No service provider is listed at this aerodrome.</p>
  }

  return (
    <div className="apf__svc">
      {groups.map(([id, label]) => (
        <section className="apf__card" key={id}>
          <h3>
            {label}
            <span className="apf__tcnt">{byType.get(id).length}</span>
          </h3>
          {byType.get(id).map((entry, index) => (
            <div className="apf__svcrow" key={`${entry.name}-${index}`}>
              <b>{entry.name}</b>
              <div className="apf__svcmeta">
                {entry.hours ? <span>{entry.hours}</span> : null}
                {entry.fuelBrands ? <span>{entry.fuelBrands}</span> : null}
                {entry.frequency ? <span className="mono">{entry.frequency}</span> : null}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

function Contacts({ services }) {
  if (!services.length) {
    return <p className="apf__none">No contact is listed at this aerodrome.</p>
  }
  return (
    <section className="apf__card">
      <h3>Contacts</h3>
      <table className="apf__tbl">
        <thead>
          <tr>
            <th>Service</th>
            <th>Name</th>
            <th>Telephone</th>
            <th>After hours</th>
            <th>Email</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {services.map((entry, index) => (
            <tr key={`${entry.name}-${index}`}>
              <td>{label(entry.serviceType)}</td>
              <td>
                <b>{entry.name}</b>
              </td>
              <td className="mono">{entry.phone ?? EMPTY}</td>
              <td className="mono">{entry.afterHours ?? EMPTY}</td>
              <td>{entry.email ?? EMPTY}</td>
              <td>{entry.hours ?? EMPTY}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function FreqRwy({ detail }) {
  const frequencies = detail.frequencies ?? []
  const runways = detail.runways ?? []
  const remark = detail.airport.runwayRemark

  if (!frequencies.length && !runways.length && !remark) {
    return <p className="apf__none">No frequency or runway data on file for this aerodrome.</p>
  }

  return (
    <>
      {frequencies.length ? (
        <section className="apf__card">
          <h3>Radio frequencies</h3>
          <div className="apf__fgrid">
            {frequencies.map((entry, index) => (
              <div className="apf__fb" key={`${entry.service}-${entry.mhz}-${index}`}>
                <span>{entry.service}</span>
                <b>{entry.mhz}</b>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {runways.length ? (
        <section className="apf__card">
          <h3>Runways — surveyed</h3>
          <table className="apf__tbl">
            <thead>
              <tr>
                <th>Designator</th>
                <th>Length</th>
                <th>Width</th>
                <th>Surface</th>
                <th>LDA</th>
                <th>TODA</th>
                <th>ILS</th>
                <th>Lighting</th>
              </tr>
            </thead>
            <tbody>
              {runways.map((runway) => (
                <tr key={runway.id}>
                  <td className="mono">
                    <b>{runway.designator}</b>
                  </td>
                  <td className="mono">{runway.lengthFt} ft</td>
                  <td className="mono">{runway.widthFt ?? EMPTY}</td>
                  <td>{runway.surface ?? EMPTY}</td>
                  <td className="mono">{runway.ldaFt ?? EMPTY}</td>
                  <td className="mono">{runway.todaFt ?? EMPTY}</td>
                  <td>{(runway.ilsCategory ?? EMPTY).replace('_', ' ')}</td>
                  <td>{runway.lighting ?? EMPTY}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {remark ? (
        <section className="apf__card">
          <h3>Runways — AIP remark</h3>
          {remark.split('|').map((line) => line.trim()).filter(Boolean).map((line) => (
            <div className="apf__rwi" key={line}>
              {line}
            </div>
          ))}
          {runways.length ? (
            <p className="apf__note">
              The surveyed table above is the operator's own record for a station it uses.
              This is what the AIP publishes, kept alongside rather than merged — when the
              two disagree, that disagreement is the finding.
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  )
}

function label(serviceType) {
  return SERVICE_GROUPS.find(([id]) => id === serviceType)?.[1] ?? 'Authority'
}

function Row({ label: text, value, mono, alarm }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="apf__row">
      <span>{text}</span>
      <b className={`${mono ? 'mono ' : ''}${alarm ? 'is-alarm' : ''}`}>{value}</b>
    </div>
  )
}
