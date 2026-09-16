/**
 * Les six tuiles de la Flight Timeline, dans l'ordre du prototype :
 * Active flights · In service · Delays · AOG · On-time performance ·
 * Block hours / day.
 *
 * Chacune est la reponse d'une requete. La seule qui contienne une hypothese
 * est la derniere : « % util. » rapporte les heures bloc a
 * `flotte x dailyBlockHourReference x jours`, une reference d'exploitant
 * (dix heures par avion et par jour) declaree dans OpsProperties et renvoyee
 * avec le chiffre, pour que le pied de tuile puisse la nommer.
 */

/** « ↑6 vs yesterday », ou rien si la veille n'a pas de programme. */
function delta(today, yesterday, { goodWhenUp = true, unit = '' } = {}) {
  if (today === null || today === undefined) return null
  if (!yesterday) return null // zero etape hier n'est pas une comparaison
  const difference = today - yesterday
  if (difference === 0) return { text: '= vs yesterday', tone: 'flat' }
  const up = difference > 0
  return {
    text: `${up ? '↑' : '↓'}${Math.abs(difference)}${unit} vs yesterday`,
    tone: up === goodWhenUp ? 'good' : 'bad',
  }
}

function hoursMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  return `${hours}:${String(Math.round(totalMinutes % 60)).padStart(2, '0')}`
}

function Tile({ tone, label, value, sub, delta: chip, alarm }) {
  return (
    <div className={`kpi${alarm ? ' kpi--alarm' : ''}`} style={{ '--kpi-accent': tone }}>
      <span className="kpi__corners" />
      <div className="eyebrow">{label}</div>
      <div className="kpi__value" style={{ '--kpi-value': tone }}>
        {value}
      </div>
      <div className="kpi__hint">
        {chip ? <span className={`kpi__delta ${chip.tone}`}>{chip.text}</span> : null}
        {sub}
      </div>
    </div>
  )
}

export default function TimelineKpiStrip({ data }) {
  const utilisationLabel = `${data.utilisationPercent}% util.`

  return (
    <div className="kpi-strip">
      <Tile
        tone="var(--accent-orange)"
        label="Active flights"
        value={data.flights}
        delta={delta(data.flights, data.flightsYesterday)}
        sub={`${data.aircraftUsed} tails flying`}
      />

      <Tile
        tone="var(--info-fg)"
        label="In service"
        value={`${data.inService} / ${data.fleetSize}`}
        sub={`${data.availabilityPercent}% available`}
      />

      <Tile
        tone="var(--attention-fg)"
        label="Delays"
        value={data.delays}
        delta={delta(data.delays, data.delaysYesterday, { goodWhenUp: false })}
        sub={`over ${data.minimumTurnaroundMinutes} min turnaround minimum`}
      />

      <Tile
        tone="var(--critical-fg)"
        label="AOG"
        value={data.outOfService}
        alarm={data.outOfService > 0}
        sub={
          data.outOfServiceRegistrations.length > 0
            ? data.outOfServiceRegistrations.join(', ')
            : 'None'
        }
      />

      <Tile
        tone="var(--ready-fg)"
        label="On-time performance"
        // == et non === : le serveur OMET le champ quand aucune ponctualite
        // n'est mesurable, si bien qu'il arrive undefined et non null. La
        // comparaison stricte laissait s'afficher « undefined% », ce qui se lit
        // comme une valeur alors que c'est une absence.
        value={data.otpPercent == null ? '—' : `${data.otpPercent}%`}
        sub={
          data.otpSample === 0
            ? 'no departure recorded yet'
            : `target ${data.otpTargetPercent}% · on ${data.otpSample} departure${data.otpSample === 1 ? '' : 's'}`
        }
      />

      <Tile
        tone="var(--accent-violet)"
        label="Block hours / day"
        value={hoursMinutes(data.blockMinutes)}
        sub={`${utilisationLabel} of ${data.dailyBlockHourReference} h per tail`}
      />
    </div>
  )
}
