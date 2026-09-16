import { codeColour, codeInk, codeLabel, groupByRank, initials, shortRole } from '../../../lib/rosterCodes'
import { isoDate, minutesToHhmm } from '../../../lib/format'
import { CodeIcon } from './codeIcons'

const WEEKDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/**
 * La part de jours travailles sur les jours poses, pour la barre sous le nom.
 *
 * Elle ne se lit pas comme un taux d'activite : le denominateur est le nombre
 * de jours REELLEMENT poses sur la periode, pas le nombre de jours du mois. Une
 * ligne a moitie remplie a donc une barre pleine si tout ce qui est pose est du
 * travail. L'infobulle donne les deux nombres, qui eux ne s'interpretent pas.
 */
function workedShare(row) {
  const total = (row.workingDays ?? 0) + (row.daysOff ?? 0)
  return total === 0 ? 0 : Math.round(((row.workingDays ?? 0) / total) * 100)
}

/**
 * La grille mensuelle : l'equipage en lignes, les jours en colonnes, groupes
 * par rang comme dans le prototype.
 *
 * Deux choses que le prototype ne faisait pas et qui restent ici.
 *
 * 1. Une cellule qui repose sur une vacation enregistree est pleine ; une
 *    cellule qui n'est qu'un plan est en pointille. Le prototype dessinait le
 *    plan et le fait a l'identique, et un planificateur ne pouvait pas
 *    distinguer ce qui avait eu lieu de ce qui avait ete voulu.
 * 2. Le compteur sous le nom est « jours travailles / jours off », calcule par
 *    le serveur (RosterRowDto). Le prototype affichait « 11:38 this month »,
 *    des heures qu'il ne cumulait jamais reellement — la graine de la fiche,
 *    pas un total.
 */
export default function RosterGrid({ grid, loading, onCellClick, editableDay }) {
  const today = isoDate(new Date())
  const days = grid?.days ?? []
  const groups = groupByRank(grid?.rows ?? [])
  const totalRows = grid?.rows?.length ?? 0

  if (loading && totalRows === 0) {
    return (
      <div className="state">
        <div className="spinner" />
        <p>Loading the roster…</p>
      </div>
    )
  }

  if (totalRows === 0) {
    return (
      <div className="state">
        <h3>No crew on this grid</h3>
        <p>The roster lists the active crew; this tenant has none on file yet.</p>
      </div>
    )
  }

  return (
    <table className="crewgrid">
      <thead>
        <tr>
          <th className="crewgrid__crewhead">Crew</th>
          {days.map((day) => {
            const date = new Date(`${day}T00:00:00Z`)
            const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6
            return (
              <th
                key={day}
                className={[
                  weekend ? 'crewgrid__day--we' : '',
                  day === today ? 'crewgrid__day--today' : '',
                ].join(' ').trim() || undefined}
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
          <Group
            key={group.role}
            group={group}
            days={days}
            today={today}
            onCellClick={onCellClick}
            editableDay={editableDay}
          />
        ))}
      </tbody>
    </table>
  )
}

function Group({ group, days, today, onCellClick, editableDay }) {
  return (
    <>
      <tr className="crewgrid__group">
        <td colSpan={days.length + 1}>
          {group.label} · {group.rows.length} crew
        </td>
      </tr>

      {group.rows.map((row) => {
        const byDay = new Map()
        for (const cell of row.cells) {
          const list = byDay.get(cell.day) ?? []
          list.push(cell)
          byDay.set(cell.day, list)
        }

        return (
          <tr key={row.personId}>
            <td className="crewgrid__crew">
              <div className="crewperson">
                <span className={`crewperson__avatar crewperson__avatar--${row.mainRole ?? 'OTHER'}`}>
                  {initials(row.fullName)}
                </span>
                <span style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                  <span className="crewperson__name">{row.fullName}</span>
                  {/* « FALCON CAP » : la qualification de type d'abord, le rang
                      ensuite — c'est la ligne du prototype, et c'est l'ordre
                      dans lequel un planificateur cherche quelqu'un. Sans
                      qualification au dossier, le rang reste seul : on n'en
                      invente pas une. */}
                  {/* Le prototype n'ecrit que « FALCON CAP » sous le nom. Le
                      matricule et le compte de journees restent accessibles en
                      infobulle : sur trente-et-une colonnes, chaque caractere
                      pris a la colonne equipage est pris a la grille. */}
                  <span className="crewperson__role" title={row.staffNo}>
                    {[row.typeRating, shortRole(row.mainRole)].filter(Boolean).join(' ')}
                  </span>
                  {/* « 04:00 this month » : le total du prototype, mais
                      reellement somme — il vient des vacations enregistrees
                      (crew.duty_periods), pas des codes de la grille. Un mois
                      sans vol affiche 00:00, ce qui est un fait. */}
                  <span
                    className="crewperson__bar"
                    title={`${row.workingDays} working days, ${row.daysOff} off`}
                  >
                    <span style={{ width: `${workedShare(row)}%` }} />
                  </span>
                  <span
                    className="crewperson__meta"
                    title={`${row.workingDays} working days, ${row.daysOff} off`}
                  >
                    {minutesToHhmm(row.blockMinutes ?? 0)} this month
                  </span>
                </span>
              </div>
            </td>

            {days.map((day) => {
              const cells = byDay.get(day) ?? []
              const date = new Date(`${day}T00:00:00Z`)
              const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6
              // Une journee que seule une version publiee couvre ne s'ouvre
              // pas : il n'y a rien a y ecrire tant qu'aucun brouillon ne la
              // porte, et un editeur qui finirait en 409 serait une promesse
              // en l'air.
              const open = Boolean(onCellClick) && (!editableDay || editableDay(day))
              return (
                <td
                  key={day}
                  className={[
                    'crewgrid__day',
                    weekend ? 'crewgrid__day--we' : '',
                    day === today ? 'crewgrid__day--today' : '',
                    open ? 'crewgrid__day--edit' : '',
                  ].join(' ').trim()}
                  // Une case modifiable se prend aussi au clavier : la grille
                  // compte trente colonnes, et un planificateur qui tabule d'une
                  // case a l'autre va plus vite qu'a la souris.
                  role={open ? 'button' : undefined}
                  tabIndex={open ? 0 : undefined}
                  title={open ? `Edit ${row.fullName} — ${day}` : undefined}
                  onClick={open ? () => onCellClick({ row, day, cells }) : undefined}
                  onKeyDown={
                    open
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onCellClick({ row, day, cells })
                          }
                        }
                      : undefined
                  }
                >
                  {cells.length === 0 ? (
                    <span className="crewgrid__empty">·</span>
                  ) : (
                    cells.map((cell) => (
                      <span
                        key={cell.entryId}
                        // Toutes les cases se dessinent pleines. Le brouillon
                        // avait son pointille ; le planificateur le lit dans la
                        // barre (« 2 published · 1 draft ») et dans l'infobulle,
                        // pas dans chaque case — le prototype ne fait aucune
                        // difference a l'oeil, et une grille ou la moitie des
                        // cases sont en creux se lit deux fois moins vite.
                        className="rcell"
                        // L'encre suit le fond : le repos et la reserve sont
                        // clairs, un pictogramme blanc dessus ne se voit pas.
                        // Meme regle que la grille de la semaine, meme fonction.
                        style={{ background: codeColour(cell.code), color: codeInk(cell.code) }}
                        title={
                          `${codeLabel(cell.code)} — ${day}` +
                          (cell.draft ? ' · draft, not published' : ' · published') +
                          (cell.backed
                            ? ' · recorded duty period'
                            : ' · planned only, no duty period recorded') +
                          (cell.remark ? ` · ${cell.remark}` : '')
                        }
                      >
                        <CodeIcon code={cell.code} />
                      </span>
                    ))
                  )}
                </td>
              )
            })}
          </tr>
        )
      })}
    </>
  )
}
