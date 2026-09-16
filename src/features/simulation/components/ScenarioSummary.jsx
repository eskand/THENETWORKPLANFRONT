import { EMPTY, minutesToHhmm } from '../../../lib/format'

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

const COLUMNS = ['Reference', 'Anomaly', 'Severity', 'Tail', 'Day', 'Expected fix', 'What was done']

/**
 * Le scénario qui vient d'être généré.
 *
 * <b>Demandé contre posé.</b> Chaque injecteur affiche les deux nombres. Un
 * écart est une information, pas une erreur : une mise en place inutile a
 * besoin d'un créneau au sol assez long pour partir et revenir, et un plan
 * chargé en offre moins. Ne montrer que la demande ferait mentir le scénario
 * sur ce qu'il contient.
 */
export default function ScenarioSummary({ detail, onBack }) {
  if (!detail) {
    return (
      <div className="sc-empty">
        <h3>No scenario generated in this session</h3>
        <p>Generate one from the generator tab, or open one from the library.</p>
        <button type="button" className="sc-btn" style={{ marginTop: 14 }} onClick={onBack}>
          Back to the generator
        </button>
      </div>
    )
  }

  const { scenario, anomalies, legs } = detail
  const sorted = [...anomalies].sort((a, b) =>
    (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    || a.reference.localeCompare(b.reference))

  const requested = scenario.injection.reduce((sum, row) => sum + row.requested, 0)
  const applied = scenario.injection.reduce((sum, row) => sum + row.applied, 0)

  return (
    <>
      <section className="sc-panel">
        <div className="sc-panel__head">
          <span className="sc-panel__title">{scenario.reference}</span>
          <span className="sc-panel__sub">
            {scenario.name} · {scenario.difficulty.toLowerCase()} · seed {scenario.randomSeed}
            {' '}· {scenario.horizonDays} days from {scenario.horizonFrom}
          </span>
        </div>
        <div className="sc-panel__body">
          <div className="sc-tiles">
            {[['Anomalies placed', applied],
              ['Anomalies requested', requested],
              ['Legs in sandbox', scenario.legCount],
              ['Legs injected', scenario.injectedLegCount],
              ['Block time', minutesToHhmm(scenario.baseline.blockMinutes)],
            ].map(([label, value]) => (
              <div className="sc-tile" key={label}>
                <div className="sc-tile__value">{value}</div>
                <div className="sc-tile__label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sc-panel">
        <div className="sc-panel__head">
          <span className="sc-panel__title">Injection — requested against placed</span>
        </div>
        <div className="sc-panel__body">
          {scenario.injection.map((row) => (
            <div className="sc-result" key={row.key}>
              <div className="sc-result__label">
                {row.label}
                <div className="sc-result__key">{row.key}</div>
              </div>
              <div className={
                !row.implemented ? 'sc-result__count sc-result__count--none'
                  : row.applied < row.requested ? 'sc-result__count sc-result__count--short'
                    : 'sc-result__count'}>
                {row.applied} / {row.requested}
              </div>
            </div>
          ))}
          {applied < requested ? (
            <p className="sc-note">
              {requested - applied} anomal{requested - applied === 1 ? 'y was' : 'ies were'} not
              placed: either the injector is not implemented in this build, or the plan offered no
              suitable slot — a ferry needs a ground gap long enough to fly out and back.
            </p>
          ) : null}
        </div>
      </section>

      <section className="sc-panel">
        <div className="sc-panel__head">
          <span className="sc-panel__title">Anomalies</span>
          <span className="sc-panel__sub">
            Each carries the move a solver is expected to make. That is the mark scheme: without it
            a scenario can be handed out, but nobody can say whether it was solved.
          </span>
        </div>
        <div className="sc-panel__body" style={{ overflowX: 'auto' }}>
          <table className="sc-table">
            <thead><tr>{COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>
              {sorted.map((anomaly) => (
                <tr key={anomaly.id}>
                  <td className="ref">{anomaly.reference}</td>
                  <td>{anomaly.label}</td>
                  <td>
                    <span className={`sc-sev sc-sev--${anomaly.severity}`}>
                      {anomaly.severity.toLowerCase()}
                    </span>
                  </td>
                  <td className="ref">{anomaly.registration ?? EMPTY}</td>
                  <td className="num">
                    {anomaly.dayOffset == null ? EMPTY : `D+${anomaly.dayOffset}`}
                  </td>
                  <td>{anomaly.expectedFix}</td>
                  <td>{anomaly.note}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="sc-note">
            {legs.length} legs in the sandbox, of which {scenario.injectedLegCount} were created by
            an injector. None of them exists in the operational plan.
          </p>
        </div>
      </section>
    </>
  )
}
