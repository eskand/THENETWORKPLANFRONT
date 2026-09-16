import { TriangleAlert } from 'lucide-react'
import { dayMonthYear } from '../../../lib/format'

/**
 * COMPLIANCE ALERTS — le panneau de droite, celui du prototype.
 *
 * <b>Une alerte est un croisement, pas une liste.</b> Le prototype n'affiche
 * pas « la licence de X expire le 10 septembre » : il affiche « X — day 15 :
 * licence expiree (10 Sep 2026) avant cette vacation — crew not current ».
 * C'est la meme donnee, mais rapportee au jour ou la personne est censee
 * travailler, et c'est cela qui en fait une alerte : un document perime n'a
 * aucune consequence tant que personne n'est programme derriere.
 *
 * On croise donc les deux sources de l'ecran, sans en recalculer aucune :
 *
 *   - GET /v1/crew/expiries pose le statut du document (VALID / EXPIRING /
 *     EXPIRED / UNKNOWN). Le front affiche un verdict, il n'en rend pas ;
 *   - la grille du mois dit quels jours chacun travaille.
 *
 * Une alerte nait quand un document etait DEJA perime le jour d'une vacation.
 * Un document qui expire apres la vacation ne la concerne pas, et le dire
 * serait crier au loup.
 *
 * <b>Il n'y a pas de verdict FTL ici.</b> « Only 06:45 rest before this duty »
 * demande le moteur ORO.FTL, qui est le sprint S7 : tant qu'il n'ecrit pas ses
 * verdicts en base, ce panneau afficherait des chiffres calcules par le
 * navigateur sur une regle que personne n'a relue. Le bandeau du bas le dit
 * plutot que de le taire.
 */

/** Les codes qui mettent quelqu'un en service : ceux qui exigent d'etre a jour. */
const DUTY_CODES = new Set(['FLT', 'POS', 'TRG', 'OFFICE', 'SBY'])

/** « day 15 » — le prototype nomme le jour du mois, pas la date complete. */
function dayOfMonth(iso) {
  return Number(iso.slice(8, 10))
}

export default function ComplianceAlerts({ expiries, loading, rows, monthLabel }) {
  const documents = (expiries ?? []).filter((row) => row.status !== 'VALID')

  // Les documents perimes, par personne : c'est le seul croisement qui produit
  // une alerte de vacation. Ce qui n'expire pas encore reste sous les yeux plus
  // bas, mais ne se rapporte a aucune journee en particulier.
  const expiredByPerson = new Map()
  for (const row of documents) {
    if (row.status !== 'EXPIRED' || !row.expiresOn) continue
    expiredByPerson.set(row.personId, [...(expiredByPerson.get(row.personId) ?? []), row])
  }

  const alerts = []
  for (const line of rows ?? []) {
    const expired = expiredByPerson.get(line.personId)
    if (!expired) continue
    const dutyDays = [
      ...new Set((line.cells ?? []).filter((cell) => DUTY_CODES.has(cell.code)).map((cell) => cell.day)),
    ].sort()
    for (const day of dutyDays) {
      for (const document of expired) {
        if (document.expiresOn >= day) continue
        alerts.push({
          key: `${line.personId}-${day}-${document.kind}-${document.subject ?? ''}`,
          fullName: line.fullName,
          staffNo: line.staffNo,
          day,
          document,
        })
      }
    }
  }

  // Le plus tot d'abord : c'est la premiere journee illegale qu'il faut traiter.
  alerts.sort((a, b) => a.day.localeCompare(b.day) || a.fullName.localeCompare(b.fullName))

  const pending = documents.filter((row) => row.status !== 'EXPIRED')

  return (
    <aside className="crewbody__side">
      <div className="crewside__head">
        <span className="crewside__title">
          <TriangleAlert size={14} strokeWidth={2} />
          Compliance alerts
        </span>
        <span
          className={alerts.length === 0 ? 'crewside__count crewside__count--none' : 'crewside__count'}
        >
          {loading ? '·' : alerts.length}
        </span>
      </div>

      <div className="crewside__list">
        {loading && alerts.length === 0 ? (
          <div className="state">
            <div className="spinner" />
            <p>Reading the crew files…</p>
          </div>
        ) : null}

        {!loading && alerts.length === 0 ? (
          <div className="crewalert crewalert--unknown">
            <div className="crewalert__who">
              <i />
              No duty flown out of currency
            </div>
            <div className="crewalert__what">
              Nobody rostered in {monthLabel} works a day on which one of their documents had
              already expired.
            </div>
          </div>
        ) : null}

        {alerts.map((alert) => (
          <div className="crewalert" key={alert.key}>
            <div className="crewalert__who">
              <i />
              {alert.fullName} — day {dayOfMonth(alert.day)}
              <span className="crewperson__role">{alert.staffNo}</span>
            </div>
            <div className="crewalert__what">
              {alert.document.kind}
              {alert.document.subject ? ` ${alert.document.subject}` : ''} expired{' '}
              {dayMonthYear(alert.document.expiresOn)} before this duty — crew not current.
            </div>
            <div className="crewalert__ref">ORO.FCL currency</div>
          </div>
        ))}

        {/* Ce qui va expirer sans toucher encore une vacation : a surveiller,
            pas a traiter aujourd'hui. Le compteur du haut ne les compte pas. */}
        {pending.length > 0 ? (
          <>
            <div className="crewside__sub">Expiring, no duty affected yet</div>
            {pending.map((row) => (
              <div
                className={`crewalert ${row.status === 'UNKNOWN' ? 'crewalert--unknown' : 'crewalert--soon'}`}
                key={`${row.personId}-${row.kind}-${row.subject ?? ''}`}
              >
                <div className="crewalert__who">
                  <i />
                  {row.fullName}
                  <span className="crewperson__role">{row.staffNo}</span>
                </div>
                <div className="crewalert__what">
                  {row.kind}
                  {row.subject ? ` ${row.subject}` : ''}
                  {row.expiresOn
                    ? ` expires ${dayMonthYear(row.expiresOn)}` +
                      (row.daysRemaining != null
                        ? ` — ${row.daysRemaining} day${row.daysRemaining === 1 ? '' : 's'} left.`
                        : '.')
                    : ' — no date on file, which is a finding, not a blank.'}
                </div>
                <div className="crewalert__ref">
                  {row.status === 'UNKNOWN' ? 'Crew file incomplete' : 'ORO.FCL currency'}
                </div>
              </div>
            ))}
          </>
        ) : null}
      </div>

      <div className="crewbanner" style={{ margin: '0 12px 12px' }}>
        <span>
          <b>FTL verdicts are not in this panel.</b> Rest before duty, FDP limits and the
          7/14/28-day cumulations need the ORO.FTL engine — sprint <b>S7</b>. Until it
          writes its verdicts server-side, this panel carries document currency only.
        </span>
      </div>
    </aside>
  )
}
