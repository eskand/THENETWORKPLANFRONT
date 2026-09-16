import { Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'

import OccPage from './features/occ/OccPage'
import DispatchPage from './features/dispatch/DispatchPage'

// Sprint 1 — crew
import CrewManagementPage from './features/crew/CrewManagementPage'
import CrewSchedulingPage from './features/crewscheduling/CrewSchedulingPage'
import RosterPage from './features/roster/RosterPage'
import TrainingPage from './features/training/TrainingPage'

// Sprint 2 — maintenance
import CamoPage from './features/camo/CamoPage'
import CamoAdminPage from './features/camoadmin/CamoAdminPage'
import TechLogPage from './features/techlog/TechLogPage'
import MelPage from './features/mel/MelPage'

// Sprint 3 — operations
import TimelinePage from './features/timeline/TimelinePage'
import FlightFollowingPage from './features/flightfollowing/FlightFollowingPage'
import NetPlusServicesPage from './features/netplusservices/NetPlusServicesPage'
import AirportsPage from './features/airports/AirportsPage'

// Sprint 4 — commercial and safety
import SalesPage from './features/sales/SalesPage'
import SafetyManagerPage from './features/safety/SafetyManagerPage'
import SafetyReportsPage from './features/safety/SafetyReportsPage'
import SafetyPromotionPage from './features/safety/SafetyPromotionPage'
import ErpPage from './features/erp/ErpPage'

// Sprint 5 — transverse
import ReportsPage from './features/reports/ReportsPage'
import SimulationPage from './features/simulation/SimulationPage'
import DatabasePage from './features/database/DatabasePage'
import SettingsPage from './features/settings/SettingsPage'

import ModulePlaceholder from './features/ModulePlaceholder'

/**
 * Every entry of the operational menu now opens a real screen, each fed by its
 * own endpoint over PostgreSQL. ModulePlaceholder stays for the "not found"
 * route only — it is what an honest empty page looks like, and the day a
 * module is retired it is where it goes.
 */
export default function App() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="shell__main">
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
      </div>
    </div>
  )
}
