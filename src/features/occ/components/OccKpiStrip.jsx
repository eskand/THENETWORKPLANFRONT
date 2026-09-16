import {
  Activity,
  FileBarChart,
  Plane,
  TriangleAlert,
  Users,
  Wrench,
} from 'lucide-react'
import { sparklinePoints } from '../deriveOcc'

/**
 * Les six indicateurs de la bande sombre, dans l'ordre et avec les couleurs
 * du prototype (bleu, bleu, ambre, rouge, vert, violet).
 *
 * Une tuile dont la source n'existe pas encore affiche un tiret et le dit
 * dans son pied plutot que d'afficher un chiffre plausible.
 *
 * Les comparaisons « vs yesterday » suivent la meme regle : elles ne
 * s'affichent que si la journee precedente a ete comptee. Le prototype
 * audite affichait une variation constante ; ici, pas de veille en base,
 * pas de puce.
 */
function Tile({ tone, icon: Icon, title, value, unit, delta, sub, mid, foot }) {
  return (
    <div className={`okpi-card okpi-${tone}`}>
      <div className="okpi-head">
        <span className="okpi-ring">
          <Icon size={15} strokeWidth={1.6} />
        </span>
        <span className="okpi-title">{title}</span>
      </div>
      <div className="okpi-val-row">
        <span className="okpi-val">
          {value}
          {unit ? <i>{unit}</i> : null}
        </span>
        {delta ? <span className={`okpi-delta ${delta.tone}`}>{delta.text}</span> : null}
      </div>
      <div className="okpi-sub">{sub}</div>
      <div className="okpi-mid">{mid ?? null}</div>
      <div className="okpi-foot">{foot}</div>
    </div>
  )
}

/**
 * Une puce de comparaison, ou null.
 *
 * `goodWhenUp` decide seulement de la couleur : six vols de plus qu'hier est
 * une bonne nouvelle, six retards de plus n'en est pas une. Le signe, lui,
 * est celui de la soustraction.
 */
function delta(today, yesterday, { goodWhenUp = true, unit = '', label = 'vs yesterday' } = {}) {
  if (today === null || today === undefined) return null
  if (yesterday === null || yesterday === undefined) return null
  const difference = today - yesterday
  if (difference === 0) return { text: `= ${label}`, tone: 'flat' }
  const up = difference > 0
  return {
    text: `${up ? '↑' : '↓'}${Math.abs(difference)}${unit} ${label}`,
    tone: up === goodWhenUp ? 'good' : 'bad',
  }
}

export default function OccKpiStrip({ occ, expiries = [] }) {
  const {
    activeFlights,
    tails,
    fleetSize,
    inService,
    availability,
    outOfService,
    delayed,
    delayedFlightNos,
    delayedYesterday,
    flightsYesterday,
    aog,
    aogRegistrations,
    otp,
    crewAlerts,
    crewCritical,
    departuresByHour,
  } = occ

  const delayList =
    delayedFlightNos.length > 0
      ? delayedFlightNos.slice(0, 6).join(', ') +
        (delayedFlightNos.length > 6 ? ` +${delayedFlightNos.length - 6}` : '')
      : 'None reported'

  // Un document deja perime est un probleme d'aujourd'hui, pas une echeance :
  // il compte avec les equipages non affectes et les depassements FTL.
  const expired = expiries.filter((entry) => (entry.daysRemaining ?? 0) < 0)
  const withinADay = expiries.filter(
    (entry) => (entry.daysRemaining ?? -1) >= 0 && (entry.daysRemaining ?? 99) <= 1,
  )
  const critical = crewCritical.length + expired.length

  return (
    <div className="okpi">
      <Tile
        tone="c1"
        icon={Plane}
        title="Active flights today"
        value={activeFlights ?? '—'}
        delta={delta(activeFlights, flightsYesterday)}
        sub={tails === null ? 'fleet size unknown' : `${tails} tails monitored`}
        mid={
          <svg className="okpi-spark" viewBox="0 0 100 26" preserveAspectRatio="none">
            <polyline points={sparklinePoints(departuresByHour)} />
          </svg>
        }
        foot={<span className="okpi-foot-t">departures per hour, UTC</span>}
      />

      <Tile
        tone="c2"
        icon={Wrench}
        title="Fleet in service"
        value={inService ?? '—'}
        unit={fleetSize === null ? null : ` / ${fleetSize}`}
        sub={availability === null ? 'no fleet count' : `${availability}% available`}
        mid={
          availability === null ? null : (
            <div className="okpi-bar">
              <i style={{ width: `${availability}%` }} />
            </div>
          )
        }
        foot={
          <span className="okpi-foot-t">
            {outOfService} aircraft out of service
          </span>
        }
      />

      <Tile
        tone="c3"
        icon={Activity}
        title="Delays"
        value={delayed}
        delta={delta(delayed, delayedYesterday, { goodWhenUp: false })}
        sub="Flights affected"
        mid={<div className="okpi-list">{delayList}</div>}
        foot={<span className="okpi-foot-t">from the dispatch board</span>}
      />

      <Tile
        tone="c4"
        icon={TriangleAlert}
        title="AOG"
        value={aog}
        sub="Aircraft on ground"
        foot={
          <span className="okpi-foot-t alarm">
            {aogRegistrations.length > 0 ? aogRegistrations.join(', ') : 'None'}
          </span>
        }
      />

      <Tile
        tone="c5"
        icon={FileBarChart}
        title="On-time performance"
        value={otp.value === null ? '—' : otp.value}
        unit={otp.value === null ? null : '%'}
        delta={delta(otp.value, otp.yesterday, { unit: ' pts' })}
        sub={
          otp.target === null
            ? 'Departure within 15 min of STD'
            : `Target ${otp.target}% · within 15 min of STD`
        }
        mid={
          otp.value === null || otp.target === null ? null : (
            <div className="okpi-bar">
              <i style={{ width: `${Math.min(otp.value, 100)}%` }} />
              <b style={{ left: `${Math.min(otp.target, 100)}%` }} />
            </div>
          )
        }
        foot={
          <span className="okpi-foot-t">
            {otp.sample === 0
              ? 'no departure recorded yet'
              : `on ${otp.sample} departure${otp.sample === 1 ? '' : 's'}`}
          </span>
        }
      />

      <Tile
        tone="c6"
        icon={Users}
        title="Crew alerts"
        value={crewAlerts.length + expiries.length}
        sub={`${critical} critical / expired`}
        foot={
          <span className="okpi-foot-t">
            {expiries.length === 0
              ? 'no document expiring within 90 days'
              : `${withinADay.length} expiring within 24h · ${expiries.length} within 90 days`}
          </span>
        }
      />
    </div>
  )
}
