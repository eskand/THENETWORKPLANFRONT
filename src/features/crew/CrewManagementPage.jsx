import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import TopBar from '../../components/TopBar'
import { ErrorState } from '../../components/States'
import { useCrewExpiries, useCrewList } from '../../hooks/useCrew'
import CrewDrawer from './components/CrewDrawer'
import CrewKpiStrip from './components/CrewKpiStrip'
import CrewTable from './components/CrewTable'

const ROLE_TABS = [
  { id: '', label: 'All crew' },
  { id: 'CAPTAIN', label: 'Captains' },
  { id: 'FIRST_OFFICER', label: 'First officers' },
  { id: 'CABIN', label: 'Cabin' },
  { id: 'ENGINEER', label: 'Engineers' },
]

/**
 * Crew Management — the crew files.
 *
 * Structure of the Dispatch screen, applied to another domain: KPI strip,
 * toolbar, table, drawer. One list endpoint fills the first three, one detail
 * endpoint fills the drawer, and nothing on this page computes an operational
 * value the server did not send.
 */
export default function CrewManagementPage() {
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const [activeOnly, setActiveOnly] = useState(true)
  const [selected, setSelected] = useState(null)

  const filters = useMemo(() => ({ role, search, activeOnly }), [role, search, activeOnly])
  const list = useCrewList(filters)
  const expiries = useCrewExpiries(90)

  const people = list.data ?? []

  return (
    <>
      <TopBar
        title="Crew Management"
        subtitle="Crew files, qualifications, documents and cumulative flight time"
      />

      <div className="shell__scroll">
        <main className="page">
          {list.isError ? (
            <ErrorState error={list.error} onRetry={() => list.refetch()} />
          ) : (
            <>
              <CrewKpiStrip
                people={people}
                expiries={expiries.data ?? []}
                loading={list.isLoading}
              />

              <div className="toolbar">
                <div className="tabs">
                  {ROLE_TABS.map((tab) => (
                    <button
                      key={tab.id || 'ALL'}
                      type="button"
                      className={tab.id === role ? 'tab tab--active' : 'tab'}
                      onClick={() => setRole(tab.id)}
                    >
                      {tab.label}
                      <span className="tab__count">
                        {tab.id
                          ? people.filter((person) => person.mainRole === tab.id).length
                          : people.length}
                      </span>
                    </button>
                  ))}
                </div>

                <label className="search">
                  <Search size={14} />
                  <input
                    type="search"
                    value={search}
                    placeholder="Staff number or name…"
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>

                <label className="select-field">
                  <span>Show:</span>
                  <select
                    value={activeOnly ? 'ACTIVE' : 'ALL'}
                    onChange={(event) => setActiveOnly(event.target.value === 'ACTIVE')}
                  >
                    <option value="ACTIVE">Active only</option>
                    <option value="ALL">Active and inactive</option>
                  </select>
                </label>
              </div>

              <CrewTable
                people={people}
                loading={list.isLoading || list.isFetching}
                selectedId={selected?.id}
                onSelect={setSelected}
              />
            </>
          )}
        </main>
      </div>

      <CrewDrawer person={selected} onClose={() => setSelected(null)} />
    </>
  )
}
