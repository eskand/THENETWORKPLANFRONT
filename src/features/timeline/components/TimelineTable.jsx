import { EMPTY, minutesToHhmm } from '../../../lib/format'

/**
 * Le mode Table de la Flight Timeline : les memes etapes, en lignes.
 *
 * Meme source, meme tri, memes etats que le Gantt — c'est une autre lecture
 * du meme tableau, pas une autre requete. Basculer d'un mode a l'autre ne
 * peut donc pas changer un chiffre.
 */

function hhmmUtc(iso) {
  const at = new Date(iso)
  return `${String(at.getUTCHours()).padStart(2, '0')}:${String(at.getUTCMinutes()).padStart(2, '0')}`
}

const TONE_LABEL = {
  SCHEDULED: 'Scheduled',
  ENROUTE: 'In flight',
  DELAYED: 'Delayed',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
  AOG: 'AOG',
  MAINTENANCE: 'Maintenance',
}

export default function TimelineTable({ data, onSelectLeg }) {
  const legs = data.rows.flatMap((row) =>
    row.segments
      .filter((segment) => segment.kind === 'FLIGHT')
      .map((segment) => ({ row, segment })),
  )
  legs.sort((a, b) => new Date(a.segment.startsAt) - new Date(b.segment.startsAt))

  if (legs.length === 0) {
    return <div className="tltable__empty">No leg in this window.</div>
  }

  return (
    <div className="tltable">
      <table>
        <thead>
          <tr>
            <th>Flight</th>
            <th>Aircraft</th>
            <th>Fleet</th>
            <th>Route</th>
            <th>Off block</th>
            <th>On block</th>
            <th>Block</th>
            <th>Delay</th>
            <th>MEL</th>
            <th>FTL</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {legs.map(({ row, segment }) => (
            <tr
              key={segment.legId}
              onClick={() => onSelectLeg?.(segment, row)}
              className={`tone-${(segment.statusTone ?? '').toLowerCase()}`}
            >
              <td className="mono">{segment.flightNo}</td>
              <td>
                <b>{row.registration}</b> <i>{row.icaoType}</i>
              </td>
              <td>{row.fleetSection}</td>
              <td className="mono">
                {segment.depIcao} → {segment.arrIcao}
              </td>
              <td className="mono">{hhmmUtc(segment.startsAt)}Z</td>
              <td className="mono">{hhmmUtc(segment.endsAt)}Z</td>
              <td className="mono">{minutesToHhmm(segment.minutes)}</td>
              <td className="mono">
                {segment.delayMinutes > 0 ? `+${segment.delayMinutes}′` : EMPTY}
              </td>
              <td>
                {segment.melReference ? (
                  <span className={segment.melBlocking ? 'tltable__stop' : 'tltable__warn'}>
                    {segment.melReference}
                  </span>
                ) : (
                  EMPTY
                )}
              </td>
              <td>
                {segment.ftlStatus && segment.ftlStatus !== 'OK' ? (
                  <span className="tltable__warn">{segment.ftlStatus}</span>
                ) : (
                  EMPTY
                )}
              </td>
              <td>{TONE_LABEL[segment.statusTone] ?? segment.statusTone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
