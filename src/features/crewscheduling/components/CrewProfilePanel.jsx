import { User, X } from 'lucide-react'
import Badge from '../../../components/Badge'
import { useCrewMember } from '../../../hooks/useCrew'
import { EMPTY, dayMonthYear, minutesToHhmm, titleCase } from '../../../lib/format'
import { shortRole } from '../../../lib/rosterCodes'

const STATUS_TONE = {
  VALID: 'READY',
  EXPIRING: 'PENDING',
  EXPIRED: 'ATTENTION',
  UNKNOWN: 'INFO',
}

/**
 * La fiche a droite de la grille — le `detail-panel` du prototype (l. 8220).
 *
 * Vide, elle dit quoi faire ; remplie, elle montre la fiche reelle de la
 * personne, lue sur GET /v1/crew/{id} comme le tiroir de Crew Management. Deux
 * ecrans qui affichent la meme fiche doivent la lire au meme endroit, sinon
 * l'un des deux finit par montrer autre chose.
 */
export default function CrewProfilePanel({ person, weekMinutes, onClose }) {
  const detail = useCrewMember(person?.personId)

  if (!person) {
    return (
      <aside className="crewdetail">
        <div className="crewdetail__empty">
          <User size={26} strokeWidth={1.4} />
          <p>Select a crew member to view their profile.</p>
        </div>
      </aside>
    )
  }

  const data = detail.data
  const counters = data?.counters

  return (
    <aside className="crewdetail">
      <div className="crewdetail__head">
        <div>
          <h3>{person.fullName}</h3>
          <p>
            {[person.typeRating ?? person.typeRatings?.[0], shortRole(person.mainRole)]
              .filter(Boolean)
              .join(' ')}{' '}
            · {person.staffNo}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close the profile">
          <X size={14} />
        </button>
      </div>

      <div className="crewdetail__body">
        <div className="crewdetail__stat">
          <span>Block time this week</span>
          <b>{minutesToHhmm(weekMinutes ?? 0)}</b>
        </div>

        {detail.isLoading ? <p className="crewdetail__note">Reading the file…</p> : null}

        {detail.isError ? (
          <p className="crewdetail__note">The file could not be read. {detail.error?.message}</p>
        ) : null}

        {data ? (
          <>
            <h4>Documents</h4>
            <div className="crewdetail__grid">
              <span>State</span>
              <span>
                <Badge tone={STATUS_TONE[data.person.documentStatus] ?? 'INFO'}>
                  {titleCase(data.person.documentStatus)}
                </Badge>
              </span>
              <span>Licence</span>
              <span>{dayMonthYear(data.person.licenceExpiry)}</span>
              <span>Medical</span>
              <span>{dayMonthYear(data.person.medicalExpiry)}</span>
              <span>Recurrent training</span>
              <span>{dayMonthYear(data.person.trainingExpiry)}</span>
              <span>Base</span>
              <span>{data.person.baseIcao ?? person.baseIcao ?? EMPTY}</span>
            </div>

            {counters ? (
              <>
                <h4>Duty counters</h4>
                <div className="crewdetail__grid">
                  <span>Block, 7 days</span>
                  <span>{minutesToHhmm(counters.blockMinutes7d)}</span>
                  <span>Block, 28 days</span>
                  <span>{minutesToHhmm(counters.blockMinutes28d)}</span>
                  <span>Duty, 7 days</span>
                  <span>{minutesToHhmm(counters.dutyMinutes7d)}</span>
                  <span>Duty, 28 days</span>
                  <span>{minutesToHhmm(counters.dutyMinutes28d)}</span>
                </div>
                {/* Ce sont des totaux, pas un verdict : c'est le moteur FTL qui
                    les compare a ORO.FTL.210, et il n'est pas dans cet ecran. */}
                <p className="crewdetail__note">
                  Totals from crew.duty_periods — not a legality verdict.
                </p>
              </>
            ) : null}

            {/* Les qualifications decident qui peut prendre quel siege : c'est
                la premiere chose qu'un planificateur verifie avant d'affecter. */}
            {data.qualifications?.length ? (
              <>
                <h4>Qualifications</h4>
                {data.qualifications.map((qualification) => (
                  <div className="crewdetail__row" key={qualification.id}>
                    <span>
                      {qualification.kind?.replaceAll('_', ' ')}
                      {qualification.icaoType ? ` · ${qualification.icaoType}` : ''}
                    </span>
                    <Badge tone={STATUS_TONE[qualification.status] ?? 'NEUTRAL'}>
                      {dayMonthYear(qualification.validTo)}
                    </Badge>
                  </div>
                ))}
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </aside>
  )
}
