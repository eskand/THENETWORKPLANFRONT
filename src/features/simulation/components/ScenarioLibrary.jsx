import { dayMonthYear } from '../../../lib/format'

const COLUMNS = ['Reference', 'Name', 'Difficulty', 'Generated', 'Horizon', 'Seed',
  'Anomalies', 'Legs', 'Injected', '']

/**
 * Les scénarios déjà générés.
 *
 * <b>La graine est affichée</b> parce que c'est elle qui rend un exercice
 * rejouable : la reprendre dans le générateur reproduit exactement le même
 * scénario, ce qui permet de faire passer la même épreuve à une seconde
 * équipe et de comparer les deux.
 *
 * <b>Supprimer ne touche que le bac à sable.</b> La cascade se déroule
 * entièrement dans le schéma <code>sim</code> ; aucune étape opérationnelle
 * n'est atteignable depuis ce bouton.
 */
export default function ScenarioLibrary({ scenarios, removing, onRemove }) {
  if (scenarios.length === 0) {
    return (
      <div className="sc-empty">
        <h3>No scenario yet</h3>
        <p>Generated scenarios are kept here, with the seed that reproduces them.</p>
      </div>
    )
  }

  return (
    <section className="sc-panel">
      <div className="sc-panel__head">
        <span className="sc-panel__title">Scenario library</span>
        <span className="sc-panel__sub">
          Keep the seed to run the same exercise with another crew.
        </span>
      </div>
      <div className="sc-panel__body" style={{ overflowX: 'auto' }}>
        <table className="sc-table">
          <thead>
            <tr>{COLUMNS.map((column, index) => <th key={column || index}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {scenarios.map((scenario) => (
              <tr key={scenario.id}>
                <td className="ref">{scenario.reference}</td>
                <td>{scenario.name}</td>
                <td>
                  <span className={`sc-sev sc-sev--${
                    scenario.difficulty === 'EXTREME' ? 'CRITICAL'
                      : scenario.difficulty === 'HARD' ? 'HIGH'
                        : scenario.difficulty === 'MEDIUM' ? 'MEDIUM' : 'LOW'}`}>
                    {scenario.difficulty.toLowerCase()}
                  </span>
                </td>
                <td className="num">{dayMonthYear(scenario.createdAt)}</td>
                <td className="num">{scenario.horizonDays} d from {scenario.horizonFrom}</td>
                <td className="num">{scenario.randomSeed}</td>
                <td className="num">{scenario.anomalyCount}</td>
                <td className="num">{scenario.legCount}</td>
                <td className="num">{scenario.injectedLegCount}</td>
                <td>
                  <button type="button" className="sc-btn sc-btn--red" disabled={removing}
                          onClick={() => {
                            if (window.confirm(`Delete ${scenario.reference}? The sandbox copy goes; the operational plan is untouched.`)) {
                              onRemove(scenario.id)
                            }
                          }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
