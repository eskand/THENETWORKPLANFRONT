import { Fragment } from 'react'
import {
  codeColour,
  codeInk,
  groupByRank,
  initials,
  isLightCode,
  shortRole,
} from '../../../lib/rosterCodes'
import { hhmm, isoDate, minutesToHhmm } from '../../../lib/format'

const WEEKDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/**
 * L'etiquette courte d'un code sur la grille de la semaine — celle du
 * prototype (`CS_DUTY_LABEL`, l. 24396) : le planificateur lit « R », pas
 * « Reserved (draft) ». Un code inconnu s'affiche tel quel.
 */
const CELL_LABEL = {
  FLT: 'FLT',
  POS: 'POS',
  RES: 'R',
  SBY: 'STBY',
  OFF: 'OFF',
  LVE: 'AL',
  SICK: 'SICK',
  TRG: 'TRG',
  OFFICE: 'OFFICE',
}

/**
 * La grille hebdomadaire de Crew Scheduling — la `crew-grid` du prototype
 * (l. 8142-8218) : l'equipage en lignes groupees par rang, sept jours en
 * colonnes, et dans chaque case l'etat de la journee.
 *
 * <b>Une case porte l'etat du jour, pas seulement les vols.</b> Le prototype
 * dessinait FLT, POS, R, STBY, OFF, AL, SICK, TRG — une semaine n'est lisible
 * que si les jours sans vol disent pourquoi. Ces etats viennent de deux sources
 * qui ne se melangent pas :
 *
 *   - le vol vient du plateau de la journee (GET /crew/scheduling/board), ou il
 *     est affecte sur une etape reelle ;
 *   - tout le reste vient du roster (GET /roster/grid), ou un code est pose sur
 *     une journee.
 *
 * Un vol affecte l'emporte sur le code du roster : le roster dit ce qui etait
 * prevu, l'affectation dit ce qui est arme. Quand les deux existent, la case
 * porte le vol et l'infobulle rappelle le code prevu.
 *
 * <b>Le brouillon est plein, mais lisere de pointille.</b> Une semaine non
 * encore publiee n'est pas une semaine vide : le planning existe, il n'engage
 * simplement rien vis-a-vis de l'equipage. Le premier essai le dessinait en
 * creux, et une semaine entiere de brouillon donnait une grille fantome, moins
 * lisible que celle du prototype pour une distinction qui tient en un liesere.
 * La couleur porte donc le code — c'est elle qu'on lit de loin — et le
 * pointille porte l'etat.
 *
 * <b>Une case vide reste vide.</b> Le prototype ecrivait OFF des qu'il ne
 * trouvait rien — et il ne trouvait rien tant que le roster n'etait pas publie,
 * si bien que la grille affirmait « repos » pour des journees dont personne ne
 * savait rien. Ici l'absence de donnee se voit comme une absence de donnee.
 *
 * <b>Le point de couleur est le verdict FTL du serveur</b>
 * (`CrewMemberDto.ftlVerdict`), affiche tel quel. Le prototype evaluait le FDP
 * en grattant le DOM ; deux moteurs pour la meme regle finissent par ne plus
 * dire la meme chose, et celui qui compte est en Java.
 */
export default function WeekGrid({
  days,
  people,
  duties,
  rosterCodes,
  weekMinutes,
  selectedDay,
  selectedPersonId,
  onSelectDay,
  onSelectPerson,
  loading,
  error,
}) {
  if (error) {
    return (
      <div className="state">
        <h3>The week could not be read</h3>
        <p>{error.message}</p>
      </div>
    )
  }

  if (loading && people.length === 0) {
    return (
      <div className="state">
        <div className="spinner" />
        <p>Reading the seven days…</p>
      </div>
    )
  }

  if (people.length === 0) {
    return (
      <div className="state">
        <h3>No crew in this filter</h3>
        <p>Widen the fleet, the base or the department.</p>
      </div>
    )
  }

  const today = isoDate(new Date())
  const groups = groupByRank(people)

  return (
    <table className="weekgrid">
      <thead>
        <tr>
          <th className="weekgrid__crew">Crew</th>
          {days.map((day) => {
            const date = new Date(`${day}T00:00:00Z`)
            return (
              <th
                key={day}
                className={day === today ? 'weekgrid__day--today' : undefined}
                onClick={() => onSelectDay(day)}
                style={{ cursor: 'pointer' }}
                title="Open this day below"
              >
                {WEEKDAY[date.getUTCDay()]}
                <b>{String(date.getUTCDate()).padStart(2, '0')}</b>
              </th>
            )
          })}
        </tr>
      </thead>

      <tbody>
        {groups.map((group) => (
          <Fragment key={group.role}>
            <tr className="crewgrid__group">
              <td colSpan={days.length + 1}>
                {group.label} · {group.rows.length} crew
              </td>
            </tr>

            {group.rows.map((person) => {
              const minutes = weekMinutes.get(person.personId) ?? 0
              const family = person.typeRating ?? person.typeRatings?.[0] ?? null
              return (
                <tr
                  key={person.personId}
                  className={person.personId === selectedPersonId ? 'weekgrid__row--on' : undefined}
                >
                  <td className="weekgrid__crew">
                    {/* La colonne equipage du prototype : pastille, nom,
                        « FALCON CAP », et les heures de vol de la semaine a
                        droite. Cliquer la ligne ouvre la fiche a droite. */}
                    <div
                      className="crewperson crewperson--click"
                      role="button"
                      tabIndex={0}
                      title={`Open ${person.fullName}'s file`}
                      onClick={() => onSelectPerson(person)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSelectPerson(person)
                        }
                      }}
                    >
                      <span
                        className={`crewperson__avatar crewperson__avatar--${person.mainRole ?? 'OTHER'}`}
                      >
                        {initials(person.fullName)}
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span className="crewperson__name">{person.fullName}</span>
                        <span className="crewperson__role">
                          {[family, shortRole(person.mainRole)].filter(Boolean).join(' ')}
                        </span>
                      </span>
                      {/* Les heures sont la somme des etapes affectees dans la
                          semaine, bloc a bloc. Une semaine sans siege affiche
                          0:00 et non un tiret : zero heure de vol est un fait. */}
                      <span className="crewperson__hrs" title="Block time assigned this week">
                        {minutesToHhmm(minutes)}
                      </span>
                    </div>
                  </td>

                  {days.map((day) => (
                    <DayCell
                      key={day}
                      day={day}
                      today={today}
                      selectedDay={selectedDay}
                      duties={duties.get(person.personId)?.get(day) ?? []}
                      roster={rosterCodes.get(person.personId)?.get(day) ?? null}
                      onSelectDay={onSelectDay}
                    />
                  ))}
                </tr>
              )
            })}
          </Fragment>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Une case, une tuile.
 *
 * Une journee a plusieurs secteurs porte le premier et « +2 », comme dans le
 * prototype (`fnLabel`, l. 20906) : empiler les etapes fait des lignes de
 * hauteurs differentes, et une grille dont les lignes ondulent ne se lit plus
 * en diagonale. Le detail complet est dans l'infobulle, et la journee entiere
 * s'ouvre en dessous d'un clic.
 *
 * Le point porte le pire verdict de la journee, pas celui du premier secteur :
 * c'est le depassement qui doit se voir, pas l'ordre de lecture.
 */
function DayCell({ day, today, selectedDay, duties, roster, onSelectDay }) {
  const code = roster?.code ?? null
  const first = duties[0] ?? null
  const worst = duties.reduce(
    (found, { member }) => (rank(member.ftlVerdict) > rank(found) ? member.ftlVerdict : found),
    'OK',
  )
  const classes = [
    day === today ? 'weekgrid__day--today' : '',
    day === selectedDay ? 'weekgrid__day--sel' : '',
  ]
    .join(' ')
    .trim()

  return (
    <td className={classes || undefined}>
      {first ? (
        <button
          type="button"
          className="dutychip"
          style={{ background: codeColour('FLT'), color: codeInk('FLT') }}
          onClick={() => onSelectDay(day)}
          title={
            duties
              .map(
                ({ leg, member }) =>
                  `${leg.flightNo} ${leg.depIcao}→${leg.arrIcao} ${hhmm(leg.std)}–${hhmm(leg.sta)} · ${member.seat}` +
                  (member.ftlReason ? ` · ${member.ftlReason}` : ''),
              )
              .join('\n') + (code ? '\nroster says ' + code : '')
          }
        >
          <span className="dutychip__top">
            {first.leg.flightNo}
            {duties.length > 1 ? ` +${duties.length - 1}` : ''}
            <i className={dotClass(worst)} />
          </span>
          <span className="dutychip__line">
            {first.leg.depIcao}→{first.leg.arrIcao}
          </span>
          <span className="dutychip__line">
            {hhmm(first.leg.std)}–{hhmm(first.leg.sta)}
          </span>
        </button>
      ) : null}

      {!first && code ? (
        <button
          type="button"
          className={[
            'dutychip',
            'dutychip--code',
            roster.draft ? 'dutychip--draft' : '',
            isLightCode(code) ? 'dutychip--light' : '',
          ]
            .join(' ')
            .trim()}
          style={{ background: codeColour(code), color: codeInk(code) }}
          onClick={() => onSelectDay(day)}
          title={
            roster.draft
              ? `${code} — from a draft roster, not published to the crew`
              : `${code} — from the published roster`
          }
        >
          <span className="dutychip__top">{CELL_LABEL[code] ?? code}</span>
        </button>
      ) : null}

      {!first && !code ? (
        <span className="dutychip dutychip--flat" title="Nothing on file for this day">
          ·
        </span>
      ) : null}
    </td>
  )
}

/**
 * Le verdict du serveur, traduit en couleur. Un verdict inconnu ou absent
 * n'est jamais vert : il prend la couleur d'avertissement, parce qu'« on ne
 * sait pas » et « c'est legal » ne se ressemblent pas.
 */
/** L'ordre de gravite des verdicts : inconnu au-dessus de bon, illegal au-dessus de tout. */
function rank(verdict) {
  if (verdict === 'ILLEGAL' || verdict === 'BREACH') return 2
  if (verdict === 'OK' || verdict === 'LEGAL') return 0
  return 1
}

function dotClass(verdict) {
  if (verdict === 'OK' || verdict === 'LEGAL') return 'dutychip__dot'
  if (verdict === 'ILLEGAL' || verdict === 'BREACH') return 'dutychip__dot dutychip__dot--bad'
  return 'dutychip__dot dutychip__dot--warn'
}
