import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Badge from '../../../components/Badge'
import { LoadingState } from '../../../components/States'
import { useHazardRegister, useHazardReview } from '../../../hooks/useCommercial'
import { EMPTY, dayMonthYear } from '../../../lib/format'

/**
 * The hazard register.
 *
 * <b>Two matrices, not one.</b> Initial is the risk with no barrier in place;
 * residual is the risk with the barriers that exist. The toggle between them is
 * the only way to see what the controls actually buy — a register that shows
 * only the residual can never demonstrate that a control does anything.
 *
 * <b>The matrix comes from the operator's own table.</b> What a C3 is worth,
 * and what response it demands, is read from {@code safety.risk_matrix} rather
 * than hard-coded here: a second copy of that scale would disagree with the
 * first the day the operator revised it.
 */

/**
 * Les deux echelles que l'annexe A4 pose a cote de la matrice.
 *
 * <b>Une couleur sans son echelle est une decoration.</b> Un C3 orange ne dit
 * rien tant qu'on ne lit pas que « tolerable » veut dire « attenuation requise
 * et documentee » — et c'est cette phrase, pas la couleur, qu'un auditeur
 * demande. Les bornes sont celles de la table de l'exploitant.
 */
function Scales() {
  const tolerability = [
    ['intolerable', 'Intolerable — index ≥ 15', 'Stop or mitigate before operating'],
    ['tolerable', 'Tolerable — 10 to 14', 'Mitigation required and documented'],
    ['watch', 'Tolerable — 5 to 9', 'Monitor, verify controls'],
    ['acceptable', 'Acceptable — 1 to 4', 'Routine monitoring'],
  ]
  const severity = [
    ['A', 'Catastrophic', 'Multiple, multiple fatalities'],
    ['B', 'Hazardous', 'Large reduction in safety margins, serious injury'],
    ['C', 'Major', 'Significant reduction in safety margins, incident'],
    ['D', 'Minor', 'Nuisance, operating limitations, use of contingency'],
    ['E', 'Negligible', 'Little or no consequence'],
  ]

  return (
    <div className="rm-scales">
      <div className="rm-scale">
        <h4>Tolerability</h4>
        {tolerability.map(([kind, title, hint]) => (
          <div className="rm-scale__row" key={title}>
            <span className={`rm-scale__dot rm-scale__dot--${kind}`} />
            <div>
              <b>{title}</b>
              <i>{hint}</i>
            </div>
          </div>
        ))}
      </div>

      <div className="rm-scale">
        <h4>Severity scale</h4>
        {severity.map(([code, title, hint]) => (
          <div className="rm-scale__row" key={code}>
            <span className="rm-scale__code">{code}</span>
            <div>
              <b>{title}</b>
              <i>{hint}</i>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const SEVERITY_LABEL = {
  A: 'Catastrophic', B: 'Hazardous', C: 'Major', D: 'Minor', E: 'Negligible',
}

const LIKELIHOOD_LABEL = {
  1: 'Extremely improbable', 2: 'Improbable', 3: 'Remote',
  4: 'Occasional', 5: 'Frequent',
}

const STATUS_TONE = {
  open: 'ATTENTION', mitigating: 'PENDING', monitored: 'INFO', closed: 'READY',
}

const IDENTIFICATION = {
  reactive: 'Reactive — from an occurrence',
  proactive: 'Proactive — from monitoring or audit',
  predictive: 'Predictive — from trend analysis',
}

export default function RiskRegister() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('residual')
  const [selected, setSelected] = useState(null)
  const [cell, setCell] = useState(null)

  const register = useHazardRegister()
  const review = useHazardReview()
  const data = register.data

  if (register.isError) {
    return <div className="sms-empty">{register.error?.message}</div>
  }
  if (!data) {
    return <LoadingState label="Reading the hazard register…" />
  }

  const residual = mode === 'residual'
  const matrix = residual ? data.matrixResidual : data.matrixInitial
  const hazard = data.hazards.find((row) => row.id === selected) ?? null
  const cellHazards = cell
    ? data.hazards.filter((row) =>
      (residual ? row.severityResidual : row.severityInitial) === cell.severity
        && (residual ? row.likelihoodResidual : row.likelihoodInitial) === cell.likelihood)
    : []

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Safety Risk Register</div>
          <div className="page-sub">ICAO Doc 9859 5×5 matrix · hazard → consequence → control → residual risk</div>
        </div>
        <div className="btn-row">
          {/* Un danger se declare la ou il est constate : le formulaire de
              declaration alimente le registre, et un deuxieme point d'entree
              ici produirait deux dangers pour un seul fait. */}
          <button type="button" className="btn-p"
                  onClick={() => navigate('/safety-reports')}>
            <Plus size={13} /> Add hazard
          </button>
        </div>
      </div>

      <div className="kpi-row">
        <Kpi label="Registered hazards" value={data.hazards.length} hint="on the register" />
        <Kpi label="Open" value={data.open} hint="no controls yet in place"
             accent="var(--attention-fg)" alarm={data.open > 0} />
        <Kpi label="Mitigating" value={data.mitigating} hint="controls being embedded"
             accent="var(--pending-fg)" />
        <Kpi label="Review overdue" value={data.reviewOverdue} hint="past the review cycle"
             accent="var(--attention-fg)" alarm={data.reviewOverdue > 0} />
      </div>

      <section className="card">
        <header className="card-hdr">
          <h2>ICAO 5×5 risk matrix</h2>
          <div className="mtx-toggle">
            <button type="button" className={residual ? undefined : 'is-active'}
                    onClick={() => setMode('initial')}>
              Initial
            </button>
            <button type="button" className={residual ? 'is-active' : undefined}
                    onClick={() => setMode('residual')}>
              Residual
            </button>
          </div>
        </header>

        <div className="rm-grid">
          <div className="rm-hdr" />
          {[1, 2, 3, 4, 5].map((likelihood) => (
            <div className="rm-hdr" key={likelihood} title={LIKELIHOOD_LABEL[likelihood]}>
              {likelihood}
            </div>
          ))}

          {['A', 'B', 'C', 'D', 'E'].map((severity) => (
            <Row key={severity} severity={severity} matrix={matrix} onPick={setCell} />
          ))}
        </div>

        <p className="rm-note">
          Columns are likelihood (1 extremely improbable → 5 frequent); rows are severity
          (A catastrophic → E negligible). Showing{' '}
          <b>{residual ? 'residual risk after controls' : 'initial risk before controls'}</b>.
          The figure in the corner of a cell is how many registered hazards sit in it.
        </p>

        <Scales />

        {cell ? (
          <div className="rm-cell-detail">
            <header>
              <b>
                {cell.severity}
                {cell.likelihood} — index {cell.index}
              </b>
              <Badge tone={cell.band === 'UNACCEPTABLE' ? 'ATTENTION'
                : cell.band === 'TOLERABLE' ? 'PENDING' : 'READY'}>
                {cell.band ?? EMPTY}
              </Badge>
              <button type="button" className="btn btn--ghost" onClick={() => setCell(null)}>
                Close
              </button>
            </header>
            <p>
              {SEVERITY_LABEL[cell.severity]} × {LIKELIHOOD_LABEL[cell.likelihood]}
            </p>
            {cell.action ? <p className="rm-action"><b>Required response:</b> {cell.action}</p> : null}
            {cellHazards.length ? (
              <ul>
                {cellHazards.map((row) => (
                  <li key={row.id}>
                    <button type="button" className="linkish" onClick={() => setSelected(row.id)}>
                      {row.reference} — {row.hazard}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rm-none">No registered hazard sits in this cell.</p>
            )}
          </div>
        ) : null}
      </section>

      <div className="sms-split">
        <section className="card">
          <header className="card-hdr">
            <h2>Registered hazards</h2>
            <span className="mtx-note">{data.hazards.length}</span>
          </header>
          <table className="table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Hazard / consequence</th>
                <th>Domain</th>
                <th>Source</th>
                <th>Initial</th>
                <th>Residual</th>
                <th>Controls</th>
                <th>Owner</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.hazards.map((row) => (
                <tr key={row.id}
                    className={row.id === selected ? 'is-selected' : undefined}
                    onClick={() => setSelected(row.id)}>
                  <td className="mono">{row.reference}</td>
                  <td>
                    <b>{row.hazard}</b>
                    <div className="table__sub">{row.consequence}</div>
                  </td>
                  <td className="table__sub">{row.domain}</td>
                  <td className="table__sub">{row.identification}</td>
                  <td><RiskBadge index={row.indexInitial} band={row.bandInitial} /></td>
                  <td><RiskBadge index={row.indexResidual} band={row.bandResidual} /></td>
                  <td className="table__sub">
                    {row.controlsInPlace} of {row.controls.length} in place
                  </td>
                  <td className="table__sub">{row.owner ?? EMPTY}</td>
                  <td>
                    <Badge tone={STATUS_TONE[row.status] ?? 'NEUTRAL'}>{row.status}</Badge>
                  </td>
                </tr>
              ))}
              {!data.hazards.length ? (
                <tr>
                  <td colSpan={9} className="table__empty">No hazards registered.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <HazardFile hazard={hazard} review={review} />
      </div>
    </>
  )
}

function Row({ severity, matrix, onPick }) {
  return (
    <>
      <div className="rm-hdr" title={`${severity} — ${SEVERITY_LABEL[severity]}`}>
        {severity}
      </div>
      {[1, 2, 3, 4, 5].map((likelihood) => {
        const cell = matrix.find((entry) =>
          entry.severity === severity && entry.likelihood === likelihood)
        if (!cell) return <div className="rm-cell" key={likelihood} />
        return (
          <div
            key={likelihood}
            className="rm-cell"
            style={{ background: cell.colour }}
            title={`${SEVERITY_LABEL[severity]} × ${LIKELIHOOD_LABEL[likelihood]} = ${cell.index}${
              cell.band ? ` (${cell.band})` : ''}${
              cell.population ? ` — ${cell.population} hazard(s)` : ''}`}
            onClick={() => onPick(cell)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onPick(cell)
            }}
          >
            {cell.index}
            {cell.population ? <span className="rm-pop">{cell.population}</span> : null}
          </div>
        )
      })}
    </>
  )
}

function HazardFile({ hazard, review }) {
  if (!hazard) {
    return (
      <aside className="card sms-file">
        <div className="state" style={{ padding: '44px 8px' }}>
          <h3>No hazard selected</h3>
          <p>Select a row to open its file: the consequence, the barriers and what they buy.</p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="card sms-file">
      <header className="sms-file__head">
        <div>
          <div className="sms-file__ref">{hazard.reference}</div>
          <h3>{hazard.hazard}</h3>
        </div>
        <Badge tone={STATUS_TONE[hazard.status] ?? 'NEUTRAL'}>{hazard.status}</Badge>
      </header>

      <div className="sms-file__risk">
        <span>
          <i>Initial</i>
          <RiskBadge index={hazard.indexInitial} band={hazard.bandInitial} />
          <b>{hazard.severityInitial}{hazard.likelihoodInitial}</b>
        </span>
        <span className="sms-file__arrow">→</span>
        <span>
          <i>Residual</i>
          <RiskBadge index={hazard.indexResidual} band={hazard.bandResidual} />
          <b>{hazard.severityResidual}{hazard.likelihoodResidual}</b>
        </span>
        <span className="sms-file__reduction">
          <i>Risk removed by the controls</i>
          <b>{hazard.reductionPercent}%</b>
        </span>
      </div>

      <dl className="sms-file__grid">
        <Cell label="Domain" value={hazard.domain} />
        <Cell label="Category" value={hazard.category} />
        <Cell label="Identification" value={IDENTIFICATION[hazard.identification]} />
        <Cell label="Owner" value={hazard.owner} />
        <Cell
          label="Next review"
          value={hazard.reviewOn
            ? `${dayMonthYear(hazard.reviewOn)}${
              hazard.reviewOverdue ? ` (${Math.abs(hazard.daysToReview)} d overdue)` : ''}`
            : 'not scheduled'}
          alarm={hazard.reviewOverdue}
        />
      </dl>

      <h4>Potential consequence</h4>
      <p className="sms-file__text">{hazard.consequence ?? EMPTY}</p>

      <h4>Risk controls</h4>
      {hazard.controls.length ? (
        <ul className="sms-file__controls">
          {hazard.controls.map((control) => (
            <li key={control.id}>
              {control.description}
              <span>
                {control.controlType} · {control.owner ?? 'unassigned'} · {control.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sms-file__text">No controls recorded.</p>
      )}

      {hazard.linkedOccurrences.length ? (
        <>
          <h4>Identified from</h4>
          <ul className="sms-file__controls">
            {hazard.linkedOccurrences.map((reference) => (
              <li key={reference}>{reference}</li>
            ))}
          </ul>
        </>
      ) : null}

      {hazard.notes ? (
        <>
          <h4>Notes</h4>
          <p className="sms-file__text">{hazard.notes}</p>
        </>
      ) : null}

      <div className="sms-file__actions">
        <button
          type="button"
          className="btn"
          disabled={review.isPending}
          onClick={() => review.mutate({ hazardId: hazard.id })}
        >
          Record review
        </button>
      </div>
    </aside>
  )
}

function RiskBadge({ index, band }) {
  const tone = band === 'UNACCEPTABLE' ? 'ATTENTION' : band === 'TOLERABLE' ? 'PENDING' : 'READY'
  return <Badge tone={tone}>{index}</Badge>
}

function Cell({ label, value, alarm }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={alarm ? 'is-alarm' : undefined}>{value || EMPTY}</dd>
    </div>
  )
}

/**
 * Une tuile de l'annexe.
 *
 * <p>Les pages appellent encore ce helper avec leurs propres arguments ; il
 * rend maintenant la carte du prototype. La couleur vient de l'etat — un
 * chiffre en alerte prend le rouge de l'annexe — et l'icone reste neutre :
 * ces trois pages n'en declarent pas, et en inventer une par tuile aurait
 * ajoute un symbole que l'annexe ne porte pas.
 */
function Kpi({ label, value, hint, accent, alarm }) {
  const tone = alarm ? 'c2' : accent === 'var(--pending-fg)' ? 'c5'
    : accent === 'var(--ready-fg)' ? 'c4' : 'c1'
  return (
    <div className={`kc ${tone}`}>
      <div className="kc-lbl">{label}</div>
      <div className="kc-val">{value}</div>
      <div className="kc-sub">{hint}</div>
    </div>
  )
}
