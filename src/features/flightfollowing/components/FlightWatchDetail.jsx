import { Plane } from 'lucide-react'
import { EMPTY, hhmm, minutesToHhmm } from '../../../lib/format'

/**
 * Le panneau de droite : ce que l'on sait d'un vol, et l'evaluation SMS qui
 * en decoule.
 *
 * Les cinq facteurs sont listes avec leur niveau et la phrase qui l'explique,
 * y compris ceux dont la source n'a pas repondu. Le prototype n'affichait que
 * le verdict ; un operateur qui voit « MEDIUM » sans savoir pourquoi ne peut
 * ni le contester ni agir dessus.
 */

const FACTOR_LABEL = {
  WEATHER: 'Weather vs. minima',
  NOTAM: 'NOTAM impact',
  FTL: 'Flight Time Limitation',
  MEL: 'Aircraft performance / MEL',
  CREW: 'Crew risk',
}

const LEVEL_TONE = {
  NONE: 'ok',
  MINOR: 'minor',
  MODERATE: 'moderate',
  MAJOR: 'major',
  SEVERE: 'severe',
  UNKNOWN: 'unknown',
}

export default function FlightWatchDetail({ flight }) {
  if (!flight) {
    return (
      <aside className="fwd fwd--empty">
        <Plane size={30} strokeWidth={1.2} />
        <p>Select a flight from the list</p>
        <p>or click an aircraft on the map to view tracking</p>
        <p>details and its proactive SMS risk assessment.</p>
      </aside>
    )
  }

  const position = flight.lastPosition
  const risk = flight.risk

  return (
    <aside className="fwd">
      <div className="fwd__head">
        <div>
          <b>{flight.flightNo}</b>
          <span>
            {flight.depIcao} → {flight.arrIcao}
          </span>
        </div>
        <span className={`fwd__level fwd__level--${(risk?.level ?? 'low').toLowerCase()}`}>
          {risk?.level ?? 'LOW'} · {risk?.index ?? EMPTY}
        </span>
      </div>

      <div className="fwd__sec">Aircraft</div>
      <dl className="fwd__dl">
        <dt>Registration</dt>
        <dd>{flight.registration}</dd>
        <dt>Type</dt>
        <dd>
          {flight.icaoType} · {flight.model ?? EMPTY}
        </dd>
        <dt>Operator</dt>
        <dd>{flight.operator}</dd>
        <dt>MEL</dt>
        <dd>
          {flight.melReference
            ? `${flight.melReference}${flight.melBlocking ? ' — blocks dispatch' : ''}`
            : 'None open'}
        </dd>
      </dl>

      <div className="fwd__sec">Tracking</div>
      {position ? (
        <dl className="fwd__dl">
          <dt>Position</dt>
          <dd>
            {Number(position.latitude).toFixed(3)}, {Number(position.longitude).toFixed(3)}
          </dd>
          <dt>Level</dt>
          <dd>{flight.flightLevel ? `FL${flight.flightLevel}` : EMPTY}</dd>
          <dt>Ground speed</dt>
          <dd>{position.groundSpeedKt ? `${position.groundSpeedKt} kt` : EMPTY}</dd>
          <dt>Track</dt>
          <dd>{position.trackDeg === null || position.trackDeg === undefined ? 'unknown' : `${position.trackDeg}°`}</dd>
          <dt>Reported</dt>
          <dd>
            {hhmm(position.reportedAt)}Z · {position.ageMinutes} min ago
          </dd>
          <dt>Source</dt>
          <dd>
            {position.provider}
            {position.automatic ? '' : ' (entered by hand)'}
          </dd>
          {flight.minutesToDestination !== null && flight.minutesToDestination !== undefined ? (
            <>
              <dt>To destination</dt>
              <dd>{minutesToHhmm(flight.minutesToDestination)}</dd>
            </>
          ) : null}
        </dl>
      ) : (
        <div className="fwd__none">
          No position has ever been received for this leg. Scheduled{' '}
          {hhmm(flight.std)}Z → {hhmm(flight.sta)}Z.
        </div>
      )}

      <div className="fwd__sec">Proactive SMS risk</div>
      <div className="fwd__matrix">
        severity {risk?.severity ?? EMPTY} × likelihood {risk?.likelihood ?? EMPTY} ={' '}
        <b>{risk?.index ?? EMPTY}</b> / 25
      </div>

      <ul className="fwd__factors">
        {(risk?.factors ?? []).map((factor) => (
          <li key={factor.factor} className={`tone-${LEVEL_TONE[factor.level] ?? 'ok'}`}>
            <span className="fwd__fname">{FACTOR_LABEL[factor.factor] ?? factor.factor}</span>
            <span className="fwd__flevel">{factor.level}</span>
            <span className="fwd__fdetail">{factor.detail}</span>
          </li>
        ))}
      </ul>

      <div className="fwd__action">{risk?.action}</div>
    </aside>
  )
}
