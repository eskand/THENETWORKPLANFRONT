import { useState } from 'react'
import { LoadingState } from '../../components/States'
import { useCamoAdminBoard } from '../../hooks/useMaintenance'
import AdminNav, { MENU } from './components/AdminNav'
import AdminDashboard from './components/AdminDashboard'
import AdminAlerts from './components/AdminAlerts'
import AdminCollection from './components/AdminCollection'
import AdminAudit from './components/AdminAudit'
import AdminData from './components/AdminData'
import '../../styles/camoadmin.css'

/**
 * CAMO Administration.
 *
 * The back office of the continuing airworthiness record: twenty-one
 * destinations in six sections, exactly as the approved prototype lays them
 * out. Six sections on one line, each opening its own drop-down — twenty-one
 * destinations do not fit side by side, and a bar that scrolls sideways is a
 * bar nobody reads to the end of.
 *
 * <b>Authority belongs to the department, not to a grade.</b> Anyone inside the
 * CAMO may declare an aircraft AOG; a planner who finds a reason to stop a tail
 * must be able to stop it without waiting for a post holder. The control is not
 * permission — it is that every change is named, timestamped and audited.
 */
export default function CamoAdminPage() {
  const [view, setView] = useState('dashboard')
  const board = useCamoAdminBoard()
  const data = board.data

  const entry = MENU.find((item) => item.k === view) ?? MENU[0]

  return (
    <div id="camoadm-root">
      <AdminNav view={view} onGo={setView} board={data} />

      <div className="ca-main">
        {board.isError ? (
          <div className="ca-page">
            <div className="ca-card">
              <div className="ca-empty">
                The airworthiness record could not be read: {board.error?.message}
              </div>
            </div>
          </div>
        ) : !data ? (
          <LoadingState label="Opening the airworthiness record…" />
        ) : view === 'dashboard' ? (
          <AdminDashboard board={data} onGo={setView} />
        ) : view === 'alerts' ? (
          <AdminAlerts board={data} onGo={setView} />
        ) : view === 'audit' ? (
          <AdminAudit />
        ) : ['import', 'export', 'connectors', 'settings'].includes(view) ? (
          <AdminData view={view} board={data} />
        ) : (
          <AdminCollection entry={entry} />
        )}
      </div>
    </div>
  )
}
