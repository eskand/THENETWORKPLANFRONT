import { useEffect, useRef, useState } from 'react'

/**
 * The twenty-one destinations of the airworthiness record, in six sections.
 *
 * Exactly the prototype's order and wording. The grouping is the one a CAMO
 * thinks in: what the operator owns, what keeps it airworthy, what happens to
 * it in service, what is on file, and how data gets in and out.
 */
export const MENU = [
  { k: 'dashboard', label: 'Dashboard', group: 'Overview' },
  { k: 'alerts', label: 'Alerts', group: 'Overview' },
  { k: 'aircraft', label: 'Fleet & aircraft', group: 'Assets' },
  { k: 'engines', label: 'Engines', group: 'Assets' },
  { k: 'apu', label: 'APU', group: 'Assets' },
  { k: 'gear', label: 'Landing gear', group: 'Assets' },
  { k: 'components', label: 'Components', group: 'Assets' },
  { k: 'tasks', label: 'Maintenance programme', group: 'Airworthiness' },
  { k: 'ads', label: 'Airworthiness directives', group: 'Airworthiness' },
  { k: 'sbs', label: 'Service bulletins', group: 'Airworthiness' },
  { k: 'workOrders', label: 'Work orders', group: 'Airworthiness' },
  { k: 'defects', label: 'Defects', group: 'Operations' },
  { k: 'mel', label: 'MEL / CDL', group: 'Operations' },
  { k: 'logbook', label: 'Technical logbook', group: 'Operations' },
  { k: 'documents', label: 'Documents', group: 'Records' },
  { k: 'audit', label: 'Audit trail', group: 'Records' },
  { k: 'users', label: 'Users & permissions', group: 'Records' },
  { k: 'import', label: 'Import', group: 'Data' },
  { k: 'export', label: 'Export', group: 'Data' },
  { k: 'connectors', label: 'Integrations', group: 'Data' },
  { k: 'settings', label: 'Settings', group: 'Data' },
]

const GROUP_ICON = {
  Overview: 'M3 3v18h18M7 15l3-4 3 3 5-7',
  Assets: 'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z',
  Airworthiness: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  Operations:
    'M12 9v4M12 17h.01M10.3 3.9L2.5 18a1.5 1.5 0 0 0 1.3 2.2h16.4a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z',
  Records: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  Data: 'M12 3v12M7 10l5 5 5-5M4 21h16',
}

const GROUPS = [...new Set(MENU.map((item) => item.group))]

export default function AdminNav({ view, onGo, board }) {
  const [open, setOpen] = useState(null)
  const ref = useRef(null)

  /* A drop-down that only closes on a second click is a drop-down left open
     over the page it was opened from. */
  useEffect(() => {
    const away = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(null)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [])

  const current = MENU.find((item) => item.k === view)?.group

  const countFor = (key) => {
    if (!board) return null
    switch (key) {
      case 'alerts': return board.alerts.length || null
      case 'aircraft': return board.aircraft || null
      case 'components': return board.components || null
      case 'tasks': return board.programmeTasks || null
      case 'workOrders': return board.workOrdersOpen || null
      case 'defects': return board.defectsOpen || null
      case 'mel': return board.deferralsInForce || null
      case 'documents': return board.documents || null
      default: return null
    }
  }

  const criticalFor = (key) =>
    key === 'alerts' && board
      ? board.alerts.filter((alert) => alert.severity === 'CRITICAL').length
      : 0

  return (
    <div className="ca-topnav" ref={ref}>
      <div className="ca-tnitems">
        {GROUPS.map((group) => {
          const items = MENU.filter((item) => item.group === group)
          const critical = group === 'Overview' ? criticalFor('alerts') : 0
          const total = items.reduce((sum, item) => sum + (countFor(item.k) ?? 0), 0)

          return (
            <div
              key={group}
              className={`ca-tn${current === group ? ' on' : ''}${open === group ? ' open' : ''}`}
            >
              <div
                className="ca-tnh"
                onClick={() => setOpen(open === group ? null : group)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') setOpen(open === group ? null : group)
                }}
              >
                <svg
                  className="ca-tnico"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={GROUP_ICON[group]} />
                </svg>
                {group}
                {critical ? (
                  <span className="ca-mb red">{critical}</span>
                ) : total ? (
                  <span className="ca-mb">{total}</span>
                ) : null}
                <svg
                  className="ca-caret"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              <div className="ca-tnmenu">
                {items.map((item) => {
                  const count = countFor(item.k)
                  const red = criticalFor(item.k)
                  return (
                    <div
                      key={item.k}
                      className={`ca-mi${view === item.k ? ' on' : ''}`}
                      onClick={() => {
                        onGo(item.k)
                        setOpen(null)
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          onGo(item.k)
                          setOpen(null)
                        }
                      }}
                    >
                      {item.label}
                      {red ? (
                        <span className="ca-mb red">{red}</span>
                      ) : count ? (
                        <span className="ca-mb">{count}</span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="ca-tnuser">
        <span className="ca-ul">Airworthiness record</span>
        <span className="ca-rolechip camo">CAMO</span>
      </div>
    </div>
  )
}
