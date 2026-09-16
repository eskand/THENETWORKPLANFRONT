import { useState } from 'react'
import TopBar from '../../components/TopBar'
import {
  useDeleteScenario,
  useGenerateScenario,
  useScenarioGenerator,
} from '../../hooks/usePlatform'
import ScenarioGenerator from './components/ScenarioGenerator'
import ScenarioSummary from './components/ScenarioSummary'
import ScenarioLibrary from './components/ScenarioLibrary'
import '../../styles/simulation.css'

const TABS = [
  ['GENERATOR', 'Scenario generator'],
  ['SUMMARY', 'Scenario summary'],
  ['LIBRARY', 'Scenario library'],
]

/**
 * Simulation Center.
 *
 * <b>Pourquoi cet écran est sombre alors que les vingt autres sont clairs.</b>
 * Parce qu'on n'est pas dans l'exploitation. Le prototype cantonne ce module
 * dans sa propre palette bleu nuit, et l'écart visuel est l'avertissement : un
 * dispatcher qui regarde un plan dégradé doit voir au premier coup d'œil qu'il
 * ne regarde pas le vrai. La palette descend de <code>.sc-root</code> et ne
 * fuit nulle part.
 *
 * <b>Le bac à sable est structurel.</b> Générer lit le plan une fois et
 * n'écrit que dans le schéma <code>sim</code>, qui ne référence aucune table
 * opérationnelle. Une erreur ici ne PEUT pas atteindre le plan : la base la
 * refuserait. Le prototype fait la même promesse avec un préfixe de clé
 * localStorage, qui tient jusqu'au jour où quelqu'un se trompe de préfixe.
 */
export default function SimulationPage() {
  const [tab, setTab] = useState('GENERATOR')
  const [scenario, setScenario] = useState(null)

  const board = useScenarioGenerator()
  const generate = useGenerateScenario()
  const remove = useDeleteScenario()

  const data = board.data

  const onGenerate = (command) => {
    generate.mutate(command, {
      onSuccess: (result) => { setScenario(result); setTab('SUMMARY') },
    })
  }

  return (
    <>
      <TopBar
        title="Simulation Center"
        subtitle="Fleet optimisation — scenario preparation · sandbox only · zero writes to live data"
      />

      <div className="sc-root">
        <div className="sc-head">
          <div>
            <div className="sc-head__t1">SIMULATION <b>CENTER</b></div>
            <div className="sc-head__t2">
              Fleet optimisation engine — scenario preparation environment · sandbox only
            </div>
          </div>
          <div className="sc-head__spacer" />
          <span className="sc-mode" title="No table in the simulation schema references an operational one">
            <span className="sc-mode__led" />
            Sandbox enforced by schema
          </span>
        </div>

        <div className="sc-tabs">
          {TABS.map(([key, label]) => (
            <button key={key} type="button"
                    className={tab === key ? 'sc-tab sc-tab--active' : 'sc-tab'}
                    onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        <div className="sc-body">
          {board.isError ? (
            <div className="sc-error">
              The plan could not be read: {board.error?.response?.data?.message ?? board.error.message}
              <div style={{ marginTop: 10 }}>
                <button type="button" className="sc-btn" onClick={() => board.refetch()}>Retry</button>
              </div>
            </div>
          ) : !data ? (
            <div className="sc-empty"><h3>Reading the plan to copy…</h3></div>
          ) : tab === 'GENERATOR' ? (
            <ScenarioGenerator board={data}
                               generating={generate.isPending}
                               error={generate.error}
                               onGenerate={onGenerate} />
          ) : tab === 'SUMMARY' ? (
            <ScenarioSummary detail={scenario} onBack={() => setTab('GENERATOR')} />
          ) : (
            <ScenarioLibrary scenarios={data.recent}
                             removing={remove.isPending}
                             onRemove={(id) => remove.mutate(id)} />
          )}
        </div>
      </div>
    </>
  )
}
