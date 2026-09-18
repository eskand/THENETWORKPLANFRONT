import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import { LoadingState } from './components/States'
import { VigilProvider } from './components/vigil/VigilContext'
import VigilPanel from './components/vigil/VigilPanel'

import OccPage from './features/occ/OccPage'
import ModulePlaceholder from './features/ModulePlaceholder'

/**
 * Every entry of the operational menu opens a real screen, each fed by its own
 * endpoint over PostgreSQL. ModulePlaceholder stays for the "not found" route
 * only — it is what an honest empty page looks like, and the day a module is
 * retired it is where it goes.
 *
 * <b>One screen is imported eagerly, the rest are split.</b> Importing all
 * twenty-two put every module — Leaflet and its tile layers, the ERP console,
 * the roster grid, the whole reports catalogue — into a single one-megabyte
 * bundle that an operator downloaded and parsed before the OCC dashboard could
 * paint, whichever screen they were actually going to. Each route now arrives
 * as its own chunk, when it is opened.
 *
 * <b>The OCC dashboard is the exception, on purpose.</b> It is the landing
 * route: splitting it would add a network round trip to the one screen that is
 * always the first, which is the opposite of the point.
 */

// Sprint 1 — crew
const CrewManagementPage = lazy(() => import('./features/crew/CrewManagementPage'))
const CrewSchedulingPage = lazy(() => import('./features/crewscheduling/CrewSchedulingPage'))
const RosterPage = lazy(() => import('./features/roster/RosterPage'))
const TrainingPage = lazy(() => import('./features/training/TrainingPage'))

// Sprint 2 — maintenance
const CamoPage = lazy(() => import('./features/camo/CamoPage'))
const CamoAdminPage = lazy(() => import('./features/camoadmin/CamoAdminPage'))
const TechLogPage = lazy(() => import('./features/techlog/TechLogPage'))
const MelPage = lazy(() => import('./features/mel/MelPage'))

// Sprint 3 — operations
const DispatchPage = lazy(() => import('./features/dispatch/DispatchPage'))
const TimelinePage = lazy(() => import('./features/timeline/TimelinePage'))
const FlightFollowingPage = lazy(() => import('./features/flightfollowing/FlightFollowingPage'))
const NetPlusServicesPage = lazy(() => import('./features/netplusservices/NetPlusServicesPage'))
const AirportsPage = lazy(() => import('./features/airports/AirportsPage'))

// Sprint 4 — commercial and safety
const SalesPage = lazy(() => import('./features/sales/SalesPage'))
const SafetyManagerPage = lazy(() => import('./features/safety/SafetyManagerPage'))
const SafetyReportsPage = lazy(() => import('./features/safety/SafetyReportsPage'))
const SafetyPromotionPage = lazy(() => import('./features/safety/SafetyPromotionPage'))
const ErpPage = lazy(() => import('./features/erp/ErpPage'))

// Sprint 5 — transverse
const ReportsPage = lazy(() => import('./features/reports/ReportsPage'))
const SimulationPage = lazy(() => import('./features/simulation/SimulationPage'))
const DatabasePage = lazy(() => import('./features/database/DatabasePage'))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'))

export default function App() {
  return (
    <VigilProvider>
    <div className="shell">
      {/* VIGIL est monte une fois, a la racine, comme UI.ensure() de l'annexe
          le pose sur document.body : ouvrable depuis n'importe quel ecran,
          et sa requete colore la pastille de l'en-tete meme panneau ferme. */}
      <VigilPanel />
      <Sidebar />
      <div className="shell__main">
        {/* Le meme etat d'attente que partout ailleurs : un ecran qui arrive
            doit ressembler a une donnee qui arrive, pas a une panne. */}
        <Suspense fallback={<LoadingState label="Loading the module…" />}>
          <Routes>
            <Route path="/" element={<Navigate to="/occ" replace />} />
            <Route path="/occ" element={<OccPage />} />
            <Route path="/dispatch" element={<DispatchPage />} />

            <Route path="/crew-management" element={<CrewManagementPage />} />
            <Route path="/crew-scheduling" element={<CrewSchedulingPage />} />
            <Route path="/roster" element={<RosterPage />} />
            <Route path="/training" element={<TrainingPage />} />

            <Route path="/camo" element={<CamoPage />} />
            <Route path="/camo-admin" element={<CamoAdminPage />} />
            <Route path="/tech-log" element={<TechLogPage />} />
            <Route path="/mel" element={<MelPage />} />

            <Route path="/flight-timeline" element={<TimelinePage />} />
            <Route path="/flight-following" element={<FlightFollowingPage />} />
            <Route path="/netplus-services" element={<NetPlusServicesPage />} />
            <Route path="/airports" element={<AirportsPage />} />

            <Route path="/sales" element={<SalesPage />} />
            <Route path="/safety-manager" element={<SafetyManagerPage />} />
            <Route path="/safety-reports" element={<SafetyReportsPage />} />
            <Route path="/safety-promotion" element={<SafetyPromotionPage />} />
            <Route path="/erp" element={<ErpPage />} />

            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="/database" element={<DatabasePage />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route
              path="*"
              element={<ModulePlaceholder title="Not found" subtitle="No such screen" />}
            />
          </Routes>
        </Suspense>
      </div>
    </div>
    </VigilProvider>
  )
}
