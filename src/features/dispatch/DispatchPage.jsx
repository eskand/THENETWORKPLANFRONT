import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import TopBar from '../../components/TopBar'
import { ErrorState } from '../../components/States'
import { useDispatchBoard } from '../../hooks/useDispatchBoard'
import { isoDate } from '../../lib/format'
import BoardToolbar from './components/BoardToolbar'
import FlightTable from './components/FlightTable'
import KpiStrip from './components/KpiStrip'
import FlightFile from '../../components/flightfile/FlightFile'

/** Les onglets que le tableau connait — voir TABS dans BoardToolbar. */
const TAB_IDS = [
  'ALL_FLIGHTS',
  'NEEDS_ACTION',
  'SCHEDULED',
  'EN_ROUTE',
  'DELAYED',
  'AOG_MAINTENANCE',
]

/**
 * The Dispatch screen: one API call for the whole picture, one drawer for the
 * readiness of the row you click.
 */
export default function DispatchPage() {
  // L'onglet d'arrivee peut venir de l'URL : la boite OCC de l'en-tete ouvre
  // /dispatch?tab=NEEDS_ACTION. Un identifiant inconnu retombe sur ALL_FLIGHTS
  // plutot que d'afficher un onglet vide.
  const [searchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const [tab, setTab] = useState(
    TAB_IDS.includes(requested) ? requested : 'ALL_FLIGHTS',
  )
  const [fleet, setFleet] = useState('')
  const [base, setBase] = useState('')
  const [selected, setSelected] = useState(null)

  const date = useMemo(() => isoDate(new Date()), [])
  const filters = useMemo(() => ({ date, tab, fleet, base }), [date, tab, fleet, base])

  const board = useDispatchBoard(filters)

  // Une alerte du panneau de notifications peut designer une etape :
  // /dispatch?leg=<id> ouvre le tiroir sur cette ligne des que le tableau
  // repond. Si l'etape n'est pas dans l'onglet courant, rien ne s'ouvre —
  // le tiroir ne montre pas une ligne que le tableau n'affiche pas.
  const requestedLeg = searchParams.get('leg')
  useEffect(() => {
    if (!requestedLeg) return
    const row = (board.data?.rows ?? []).find((candidate) => candidate.rowId === requestedLeg)
    if (row) setSelected(row)
  }, [requestedLeg, board.data])

  const rows = board.data?.rows ?? []

  return (
    <>
      <TopBar
        title="Dispatch"
        subtitle="Central dispatch desk · request services, crew, fuel and permits · all fleets"
        inbox={board.data?.kpi?.needsAction ?? null}
      />

      <div className="shell__scroll">
        <main className="page">
          {board.isError ? (
            <ErrorState error={board.error} onRetry={() => board.refetch()} />
          ) : (
            <>
              <KpiStrip kpi={board.data?.kpi} />

              <BoardToolbar
                tab={tab}
                onTabChange={setTab}
                fleet={fleet}
                onFleetChange={setFleet}
                base={base}
                onBaseChange={setBase}
                fleetTypes={board.data?.fleetTypes ?? []}
                bases={board.data?.bases ?? []}
                tabCounts={board.data?.tabCounts ?? {}}
                onAddFlight={() =>
                  window.alert(
                    'POST /v1/legs is implemented and validated server-side. The form is the next screen to build.',
                  )
                }
              />

              <FlightTable
                rows={rows}
                loading={board.isLoading || board.isFetching}
                selectedId={selected?.rowId}
                onSelect={setSelected}
              />
            </>
          )}
        </main>
      </div>

      <FlightFile row={selected} onClose={() => setSelected(null)} />
    </>
  )
}
