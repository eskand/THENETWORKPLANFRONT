import { useState } from 'react'
import { minutesToHhmm } from '../../../lib/format'

/**
 * L'onglet de génération.
 *
 * <b>Les cartes disent ce qu'elles peuvent réellement poser.</b> EXTREME
 * demande 83 anomalies et onze injecteurs sur vingt-quatre écrivent dans un
 * scénario aujourd'hui — la carte affiche donc « 56 of 83 » plutôt que de
 * promettre 83 et d'en livrer 56 sans le dire. Le prototype déclare les
 * vingt-quatre et n'en implémente pas davantage ; la différence est qu'il ne
 * le dit pas.
 *
 * <b>La graine.</b> Générer deux fois avec la même graine et le même preset
 * donne le même scénario : c'est ce qui permet de faire passer le même
 * exercice à deux équipes et de les comparer. Laissée vide, elle est tirée.
 */
export default function ScenarioGenerator({ board, generating, error, onGenerate }) {
  const [difficulty, setDifficulty] = useState('MEDIUM')
  const [seed, setSeed] = useState('')
  const [counts, setCounts] = useState({})

  const custom = difficulty === 'CUSTOM'

  const submit = () => onGenerate({
    difficulty,
    seed: seed.trim() === '' ? null : Number(seed.trim()),
    counts: custom ? counts : null,
  })

  const customTotal = Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0)

  return (
    <>
      <section className="sc-panel">
        <div className="sc-panel__head">
          <span className="sc-panel__title">Scenario difficulty</span>
          <span className="sc-panel__sub">
            Anomalies are injected into an isolated sandbox copy of the operational plan
            ({board.baseline.horizonDays}-day horizon). Every anomaly carries its own reference and
            the move a solver is expected to make.
          </span>
        </div>

        <div className="sc-panel__body">
          <div className="sc-levels">
            {board.difficulties.map((entry) => (
              <button key={entry.name} type="button"
                      className={`sc-level sc-level--${entry.name}${
                        entry.name === difficulty ? ' sc-level--active' : ''}`}
                      onClick={() => setDifficulty(entry.name)}>
                <span className="sc-level__bar" />
                <div className="sc-level__name">{entry.name}</div>
                <div className="sc-level__desc">{entry.description}</div>
                {entry.requestedAnomalies > 0 ? (
                  <div className="sc-level__count">
                    {entry.placeableAnomalies === entry.requestedAnomalies ? (
                      <><b>{entry.requestedAnomalies}</b> anomalies</>
                    ) : (
                      <>
                        <b>{entry.placeableAnomalies}</b> of {entry.requestedAnomalies}{' '}
                        <span className="sc-level__short">
                          — {entry.requestedAnomalies - entry.placeableAnomalies} need injectors
                          this build does not have
                        </span>
                      </>
                    )}
                  </div>
                ) : null}
              </button>
            ))}
          </div>

          {custom ? (
            <div style={{ marginTop: 16 }}>
              <div className="sc-panel__title" style={{ marginBottom: 10 }}>
                Injectors — {customTotal} anomal{customTotal === 1 ? 'y' : 'ies'} requested
              </div>
              {board.injectors.map((injector) => (
                <div className="sc-result" key={injector.key}>
                  <div className="sc-result__label">
                    {injector.label}
                    <div className="sc-result__key">
                      {injector.key} · {injector.severity.toLowerCase()} · expects{' '}
                      {injector.expectedFix}
                      {injector.implemented ? '' : ' · not implemented in this build'}
                    </div>
                  </div>
                  <input type="number" min="0" max="50" style={{ width: 80, textAlign: 'right' }}
                         disabled={!injector.implemented}
                         value={counts[injector.key] ?? ''}
                         placeholder="0"
                         aria-label={injector.label}
                         onChange={(event) => setCounts({
                           ...counts,
                           [injector.key]: event.target.value === ''
                             ? undefined : Number(event.target.value),
                         })} />
                </div>
              ))}
            </div>
          ) : null}

          <div className="sc-actions">
            <button type="button" className="sc-btn sc-btn--gold"
                    disabled={generating || (custom && customTotal === 0)}
                    onClick={submit}>
              {generating ? 'Generating…' : 'Generate scenario'}
            </button>
            <div className="sc-actions__sep" />
            <label className="sc-field">
              Seed
              <input type="text" inputMode="numeric" value={seed} placeholder="random"
                     style={{ width: 150 }}
                     onChange={(event) => setSeed(event.target.value)} />
            </label>
            <span className="sc-panel__sub" style={{ minWidth: 0 }}>
              The same seed and the same preset reproduce the same scenario.
            </span>
          </div>

          {error ? (
            <div className="sc-error" style={{ marginTop: 12, marginBottom: 0 }}>
              The scenario was not generated — {error?.response?.data?.message ?? error.message}
            </div>
          ) : null}

          <p className="sc-note">
            Live Timeline, Dispatch and CAMO data are never modified — not by convention, but
            because no table in the simulation schema references an operational one.
          </p>
        </div>
      </section>

      <section className="sc-panel">
        <div className="sc-panel__head">
          <span className="sc-panel__title">Sandbox baseline</span>
          <span className="sc-panel__sub">
            Read-only snapshot of the live plan over {board.baseline.horizonDays} days
            ({board.baseline.from} → {board.baseline.to}). Counted from the plan, not declared.
          </span>
        </div>
        <div className="sc-panel__body">
          <div className="sc-tiles">
            {[['Aircraft', board.baseline.aircraft],
              ['Revenue sectors', board.baseline.revenueSectors],
              ['Crew members', board.baseline.crewMembers],
              ['Days horizon', board.baseline.horizonDays],
              ['Block time', minutesToHhmm(board.baseline.blockMinutes)],
            ].map(([label, value]) => (
              <div className="sc-tile" key={label}>
                <div className="sc-tile__value">{value}</div>
                <div className="sc-tile__label">{label}</div>
              </div>
            ))}
          </div>
          {board.baseline.revenueSectors === 0 ? (
            <p className="sc-note">
              No flight is planned over this window, so there is nothing to copy. Generation will be
              refused rather than producing an empty scenario.
            </p>
          ) : null}
        </div>
      </section>
    </>
  )
}
