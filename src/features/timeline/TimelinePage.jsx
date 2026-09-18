import { useMemo, useRef, useState } from 'react'
import TopBar from '../../components/TopBar'
import { ErrorState, LoadingState } from '../../components/States'
import { useTimeline } from '../../hooks/useOperations'
import { isoDate } from '../../lib/format'
import TimelineGrid from './components/TimelineGrid'
import TimelineKpiStrip from './components/TimelineKpiStrip'
import TimelineTable from './components/TimelineTable'
import FlightFile from '../../components/flightfile/FlightFile'
import TimelineOptimizer from './components/TimelineOptimizer'
import TimelineToolbar from './components/TimelineToolbar'

/**
 * Flight Timeline — vue Gantt temps reel, toutes flottes, UTC.
 *
 * Tout ce que l'ecran montre vient d'un seul appel, GET /v1/timeline. Les
 * trois selecteurs partent au serveur avec la fenetre : les tuiles comptent
 * la flotte entiere pendant que les lignes se reduisent, ce qu'un filtrage
 * dans le navigateur ne saurait pas faire sans mentir sur l'un ou sur
 * l'autre.
 */
export default function TimelinePage() {
  const todayIso = useMemo(() => isoDate(new Date()), [])
  const [from, setFrom] = useState(todayIso)
  const [days, setDays] = useState(3)
  const [mode, setMode] = useState('timeline')
  const [fleet, setFleet] = useState('')
  const [base, setBase] = useState('')
  const [status, setStatus] = useState('')
  const [optimizeOpen, setOptimizeOpen] = useState(false)
  const [selectedLeg, setSelectedLeg] = useState(null)
  const gridRef = useRef(null)

  const filters = useMemo(
    () => ({ from, days, includeIdle: true, fleet, base, status }),
    [from, days, fleet, base, status],
  )
  const timeline = useTimeline(filters)
  const data = timeline.data

  /**
   * Ouvrir une etape depuis la barre du Gantt.
   *
   * Elle ouvre LE dossier de vol — le meme composant que le tableau de
   * dispatch et que l'OCC, parce que l'annexe n'en a qu'un et le pose sur
   * deux hotes (prototype l. 9389). Huit onglets, le bandeau de route, les
   * heures avec ATD/ATA et l'envoi du MVT.
   *
   * Seul l'identifiant de l'etape est passe. Le dossier lit la ligne lui-meme
   * sur GET /dispatch/legs/{id} plutot que de recevoir les quelques champs que
   * porte la barre du Gantt : une fiche de vol qui se contente de ce que
   * l'appelant lui tend finit par afficher moins que ce que la base sait.
   */
  function openLeg(segment) {
    if (segment?.legId) setSelectedLeg(segment.legId)
  }

  return (
    <>
      <TopBar
        title="Operations — Flight Timeline"
        subtitle="Real-time Gantt view · all fleets · UTC timezone"
      />

      <div className="shell__scroll">
        <main className="page page--wide">
          {timeline.isError ? (
            <ErrorState error={timeline.error} onRetry={() => timeline.refetch()} />
          ) : !data ? (
            <LoadingState label="Loading the timeline…" />
          ) : (
            <>
              <TimelineKpiStrip data={data} />

              <TimelineToolbar
                mode={mode}
                onModeChange={setMode}
                from={from}
                onFromChange={setFrom}
                todayIso={todayIso}
                days={days}
                onDaysChange={setDays}
                fleet={fleet}
                onFleetChange={setFleet}
                base={base}
                onBaseChange={setBase}
                status={status}
                onStatusChange={setStatus}
                options={{ fleetSections: data.fleetSections, bases: data.bases }}
                onJumpToNow={() => gridRef.current?.scrollToNow()}
                onOptimize={() => setOptimizeOpen(true)}
              />

              {data.rows.length === 0 ? (
                <div className="tltable__empty">
                  No tail matches these selectors. The fleet still has{' '}
                  {data.fleetSize} registrations.
                </div>
              ) : mode === 'timeline' ? (
                <TimelineGrid ref={gridRef} data={data} onSelectLeg={openLeg} />
              ) : (
                <TimelineTable data={data} onSelectLeg={openLeg} />
              )}

              {/* LE MEME dossier que le tableau de dispatch et que l'OCC : l'annexe
                  n'en a qu'un, ouvert sur deux hotes (l. 9389). La timeline n'a
                  que l'identifiant sous la main ; le panneau lit la ligne. */}
              <FlightFile legId={selectedLeg} onClose={() => setSelectedLeg(null)} />

              {/* Le Timeline Optimizer de l'annexe (TNPOptimizer.open, l. 95582) :
                  la fenetre s'ouvre sur la fenetre de dates affichee. */}
              <TimelineOptimizer
                open={optimizeOpen}
                onClose={() => setOptimizeOpen(false)}
                defaultStart={from}
                defaultDays={days}
              />
            </>
          )}
        </main>
      </div>
    </>
  )
}
