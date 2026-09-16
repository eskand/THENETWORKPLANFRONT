import { Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { dayMonthYear } from '../../../lib/format'

/** Le code de queue, pas des initiales : ces lignes sont des vols, pas des personnes. */
function tailCode(row) {
  const source = row.registration ?? row.flightNo ?? '??'
  return source.replace(/[^A-Za-z]/g, '').slice(-2).toUpperCase()
}

/** Les initiales d'une personne, pour la pastille. */
function initials(fullName) {
  const parts = (fullName ?? '').trim().split(/\s+/)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** « expired », « 1d », « 14d » — le compte à rebours de la capture cible. */
function countdown(expiry) {
  if (expiry.expiresOn === null || expiry.expiresOn === undefined) {
    return { text: 'no date', tone: 'warn' }
  }
  const days = expiry.daysRemaining ?? 0
  if (days < 0) return { text: 'expired', tone: 'crit' }
  if (days === 0) return { text: 'today', tone: 'crit' }
  return { text: `${days}d`, tone: days <= 30 ? 'warn' : 'ok' }
}

const KIND_LABEL = {
  LICENCE: 'License',
  MEDICAL: 'Medical',
  TRAINING: 'Recurrent training',
  TYPE_RATING: 'Type rating',
  LINE_CHECK: 'Line check',
  DANGEROUS_GOODS: 'Dangerous goods',
  ROUTE_COMPETENCE: 'Route competence',
}

/**
 * Alertes equipage.
 *
 * Deux natures d'alerte, dans cet ordre, parce qu'elles n'ont pas la meme
 * urgence : d'abord ce qui touche un vol d'aujourd'hui (siege non pourvu,
 * verdict FTL), puis les echeances de dossier qui arrivent.
 *
 * Les echeances viennent de GET /v1/crew/expiries : licences, visites
 * medicales, entrainement recurrent et qualifications, jugees par la meme
 * regle que partout ailleurs dans le produit (CrewDocumentChecker).
 */
export default function CrewAlertsPanel({ occ, expiries = [], loading = false }) {
  const navigate = useNavigate()
  const flightRows = occ.crewAlerts
  const shown = expiries.slice(0, 8)

  return (
    <div className="dash-card dash-card-wx">
      <div className="dash-card-head">
        <h3>
          <Users size={17} strokeWidth={2} />
          Crew alerts
        </h3>
        <span className="dash-link" onClick={() => navigate('/crew-management')}>
          Full directory →
        </span>
      </div>

      {flightRows.length > 0 ? (
        <div className="dash-list">
          {flightRows.map((row) => {
            const unassigned = row.crewAssigned === false
            const breach = row.crewFtlStatus === 'BREACH'
            return (
              <div className="dash-crew-row" key={`c-${row.rowId}`}>
                <span className="av">{tailCode(row)}</span>
                <span className="info">
                  <span className="nm">
                    {row.flightNo} · {row.registration}
                  </span>
                  <span className="rl">
                    {unassigned
                      ? `${row.crewSeatsFilled ?? 0} of ${row.crewMinimumSeats ?? '?'} flight-deck seats`
                      : `Flight-time limitation: ${row.crewFtlStatus}`}
                  </span>
                </span>
                <span className={`exp ${unassigned || breach ? 'crit' : 'warn'}`}>
                  {unassigned ? 'unassigned' : row.crewFtlStatus?.toLowerCase()}
                </span>
              </div>
            )
          })}
        </div>
      ) : null}

      {loading && shown.length === 0 ? (
        <div className="dash-empty">Loading crew expiries…</div>
      ) : null}

      {!loading && flightRows.length === 0 && shown.length === 0 ? (
        <div className="dash-empty">
          Every flight is crewed, and no document expires in the next 90 days
        </div>
      ) : null}

      {shown.length > 0 ? (
        <div className="dash-list">
          {shown.map((expiry) => {
            const cd = countdown(expiry)
            return (
              <div
                className="dash-crew-row"
                key={`${expiry.personId}-${expiry.kind}-${expiry.subject ?? ''}`}
                onClick={() => navigate('/crew-management')}
              >
                <span className="av">{initials(expiry.fullName)}</span>
                <span className="info">
                  <span className="nm">{expiry.fullName}</span>
                  <span className="rl">
                    {expiry.subject ? `${expiry.subject} · ` : ''}
                    {KIND_LABEL[expiry.kind] ?? expiry.kind}
                    {' · '}
                    {expiry.expiresOn ? dayMonthYear(expiry.expiresOn) : 'no date on file'}
                  </span>
                </span>
                <span className={`exp ${cd.tone}`}>{cd.text}</span>
              </div>
            )
          })}
        </div>
      ) : null}

      {expiries.length > shown.length ? (
        <div className="wx-live-note">
          {expiries.length - shown.length} more expiries in the next 90 days — full directory
        </div>
      ) : null}
    </div>
  )
}
