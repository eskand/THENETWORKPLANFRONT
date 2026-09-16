import { useEffect, useState } from 'react'
import { LoadingState } from '../../components/States'
import { useErpConsole } from '../../hooks/useErp'
import CommandPage from './components/CommandPage'
import ActivatePage from './components/ActivatePage'
import ChecklistsPage from './components/ChecklistsPage'
import NotificationsPage from './components/NotificationsPage'
import CommsPage from './components/CommsPage'
import LogPage from './components/LogPage'
import ReferencePage from './components/ReferencePage'
import '../../styles/erp.css'

const PAGES = [
  { k: 'command', l: 'Command' },
  { k: 'activate', l: 'Activate' },
  { k: 'checklists', l: 'Checklists' },
  { k: 'notifications', l: 'Notifications' },
  { k: 'comms', l: 'Communication' },
  { k: 'log', l: 'Crisis log' },
  { k: 'reference', l: 'Reference' },
]

/**
 * The crisis console.
 *
 * Kept scoped to `#erp-root` exactly as the approved prototype has it: a navy
 * bar under a red rule, on the platform's own light ground. The urgency is
 * carried by colour and structure, not by a black background — a console that
 * looks nothing like the tool people use every day is one they misread under
 * pressure.
 */
export default function ErpPage() {
  const console_ = useErpConsole()
  const data = console_.data
  const [page, setPage] = useState('command')
  const [elapsed, setElapsed] = useState('')

  const active = data?.active ?? null
  const activatedAt = active?.activatedAt ?? null

  /* The clock runs in the browser. Asking the server every second for a
     subtraction it has already told us how to do would be one request a second
     for the entire duration of a crisis. */
  useEffect(() => {
    if (!activatedAt) {
      setElapsed('')
      return undefined
    }
    const tick = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - new Date(activatedAt).getTime()) / 1000))
      const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
      const s = String(seconds % 60).padStart(2, '0')
      setElapsed(`${h}:${m}:${s}`)
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [activatedAt])

  if (console_.isError) {
    return (
      <div id="erp-root">
        <div className="erp-page">
          <div className="erp-warn">
            No emergency response plan is recorded for this operator.
            {console_.error?.message ? ' ' + console_.error.message : ''}
          </div>
        </div>
      </div>
    )
  }
  if (!data) {
    return (
      <div id="erp-root">
        <LoadingState label="Opening the crisis console…" />
      </div>
    )
  }

  const outstanding = active?.outstanding ?? 0
  const notificationsDue = (active?.notifications ?? [])
    .filter((notification) => notification.required && !notification.made).length

  const badgeFor = (key) => {
    if (key === 'checklists' && active && outstanding) {
      return <span className="erp-nb">{outstanding}</span>
    }
    if (key === 'notifications' && active && notificationsDue) {
      return <span className="erp-nb red">{notificationsDue}</span>
    }
    if (key === 'log' && data.log.length) {
      return <span className="erp-nb">{data.log.length}</span>
    }
    return null
  }

  return (
    <div id="erp-root">
      <div className="erp-bar">
        <div className="erp-id">
          <div className="erp-mark">
            <svg viewBox="0 0 24 24">
              <path d="M10.3 3.9L2.5 18a1.5 1.5 0 0 0 1.3 2.2h16.4a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
          </div>
          <div>
            <div className="erp-t1">Emergency Response Plan</div>
            <div className="erp-t2">
              {data.planCode} · {data.operator}
            </div>
          </div>
        </div>

        <div className="erp-nav">
          {PAGES.map((entry) => (
            <div
              key={entry.k}
              className={`erp-tab${page === entry.k ? ' on' : ''}`}
              onClick={() => setPage(entry.k)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setPage(entry.k)
              }}
            >
              {entry.l}
              {badgeFor(entry.k)}
            </div>
          ))}
        </div>

        <div className="erp-status">
          {active ? (
            <div className={`erp-live-chip lv${active.level}`}>
              <span className="erp-dot pulse" />
              <div>
                <div className="erp-lv">
                  LEVEL {active.level} · {active.definition?.name}
                </div>
                <div className="erp-sub">
                  {active.reference} · {elapsed}
                </div>
              </div>
            </div>
          ) : (
            <div className="erp-armed">
              <span className="erp-dot" />
              ERP ARMED
              <span className="erp-sub">standing by</span>
            </div>
          )}
        </div>
      </div>

      <div id="erp-body">
        {page === 'command' && <CommandPage data={data} elapsed={elapsed} go={setPage} />}
        {page === 'activate' && <ActivatePage data={data} go={setPage} />}
        {page === 'checklists' && <ChecklistsPage data={data} go={setPage} />}
        {page === 'notifications' && <NotificationsPage data={data} go={setPage} />}
        {page === 'comms' && <CommsPage data={data} go={setPage} />}
        {page === 'log' && <LogPage data={data} />}
        {page === 'reference' && <ReferencePage />}
      </div>
    </div>
  )
}
