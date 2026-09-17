import { useMemo, useState } from 'react'
import { Filter, Plane, Search } from 'lucide-react'
import TopBar from '../../components/TopBar'
import { ErrorState, LoadingState } from '../../components/States'
import { useAirportDetail, useAirports } from '../../hooks/useOperations'
import AirportFile from './components/AirportFile'
import '../../styles/airports.css'

/**
 * Airports Data.
 *
 * A directory, laid out as one: a searchable rail on the left, the aerodrome's
 * file on the right. The prototype has the same two panes, and the shape is
 * not decoration — nine and a half thousand aerodromes cannot be a table you
 * scroll, and the one you are reading has to stay on screen while you look for
 * the next.
 *
 * The point of a directory is the aerodrome you have <em>not</em> been to: a
 * diversion is prepared on a field that appears in no schedule.
 */

/** Les sept regions de l'annuaire, avec la couleur du prototype. */
const REGIONS = [
  [1, 'Middle East', '#0891B2'],
  [2, 'Africa', '#16A34A'],
  [3, 'Europe', '#2563EB'],
  [4, 'Latin America', '#DB2777'],
  [5, 'Asia', '#7C3AED'],
  [6, 'USA', '#475569'],
  [7, 'Canada', '#DC2626'],
]

export default function AirportsPage() {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState(0)
  const [usedOnly, setUsedOnly] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  /* Tout le filtrage part au serveur — y compris la region, qui se filtrait
     ici sur la liste complete et obligeait donc a la charger entiere. */
  const term = query.trim()
  const filters = useMemo(
    () => ({ search: term || undefined, region: region || undefined, usedOnly }),
    [term, region, usedOnly],
  )

  /* RIEN NE PART TANT QU'ON N'A RIEN DEMANDE. L'ecran le disait deja dans son
     etat vide — « Type an ICAO, IATA, city or name » — mais la requete partait
     quand meme, sans critere, et l'annuaire repondait ses 9 584 fiches : quatre
     megaoctets a analyser et autant de lignes a poser dans le DOM. C'etait la
     table a vingt-six lignes d'avant V51 ; ce ne l'est plus. */
  const asked = term.length >= 2 || Boolean(region) || usedOnly
  const list = useAirports(filters, asked)
  const detail = useAirportDetail(selected)

  const rows = list.data?.rows ?? []
  const matched = list.data?.matched ?? 0
  const capped = list.data?.capped ?? false

  const regionName = REGIONS.find(([id]) => id === region)?.[1]

  return (
    <>
      <TopBar
        title="Airports Data"
        subtitle="Aerodrome directory · runways, frequencies, services, operator notes"
      />

      <div className="shell__scroll">
        <div className="apd">
          <aside className="apd__rail">
            <div className="apd__search">
              <span className="apd__sbox">
                <Search size={13} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ICAO, IATA, name or city…"
                />
              </span>

              <div className="apd__filter">
                <button
                  type="button"
                  className={`apd__fbtn${region ? ' is-on' : ''}`}
                  title="Filter by region"
                  onClick={() => setMenuOpen((current) => !current)}
                >
                  <Filter size={13} />
                </button>

                {menuOpen ? (
                  <div className="apd__rgmenu">
                    <div className="apd__rgh">Filter by region</div>
                    <div
                      className={`apd__rgi${region === 0 ? ' is-on' : ''}`}
                      onClick={() => {
                        setRegion(0)
                        setMenuOpen(false)
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          setRegion(0)
                          setMenuOpen(false)
                        }
                      }}
                    >
                      All regions
                    </div>
                    {REGIONS.map(([id, label, colour]) => (
                      <div
                        key={id}
                        className={`apd__rgi${region === id ? ' is-on' : ''}`}
                        onClick={() => {
                          setRegion(id)
                          setMenuOpen(false)
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            setRegion(id)
                            setMenuOpen(false)
                          }
                        }}
                      >
                        <span className="apd__rgdot" style={{ background: colour }} />
                        {label}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <label className="apd__used">
              <input
                type="checkbox"
                checked={usedOnly}
                onChange={(event) => setUsedOnly(event.target.checked)}
              />
              Only stations we fly to
            </label>

            <div className="apd__count">
              {!asked
                ? 'type two characters, pick a region, or tick the box'
                : list.isFetching
                  ? 'searching…'
                  : capped
                    /* On dit ce qu'on montre ET ce qu'on a trouve : « 200 »
                       sur un millier laisserait planifier contre une liste
                       qu'on croit complete. */
                    ? `${rows.length} of ${matched} — narrow the search`
                    : `${rows.length} aerodrome${rows.length === 1 ? '' : 's'}`}
              {regionName ? ` · ${regionName}` : ''}
            </div>

            <div className="apd__list">
              {list.isError ? (
                <div className="apd__empty">{list.error?.message}</div>
              ) : rows.length ? (
                rows.map((row) => (
                  <div
                    key={row.airport.icao}
                    className={`apd__row${selected === row.airport.icao ? ' is-on' : ''}`}
                    onClick={() => setSelected(row.airport.icao)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') setSelected(row.airport.icao)
                    }}
                  >
                    <span className="apd__icao">{row.airport.icao}</span>
                    <span className="apd__name">
                      {row.airport.name}
                      <i>
                        {[row.airport.city, row.airport.countryIso2].filter(Boolean).join(' · ')}
                      </i>
                    </span>
                    {row.airport.iata ? <span className="apd__iata">{row.airport.iata}</span> : null}
                  </div>
                ))
              ) : (
                <div className="apd__empty">
                  {!asked
                    ? 'Type an ICAO, IATA, city or name to search the directory — or pick a region.'
                    : list.isFetching
                      ? 'Searching…'
                      : 'No aerodrome matches that search.'}
                </div>
              )}
            </div>
          </aside>

          <section className="apd__det">
            {!selected ? (
              <div className="apd__splash">
                <Plane size={42} strokeWidth={1.2} />
                <h2>TNP Airport Data</h2>
                <p>Middle East · Africa · Europe · Latin America · Asia · USA · Canada</p>
                <p className="apd__splash-sub">
                  Search by ICAO, IATA, city or name — or show only the stations we fly to.
                </p>
              </div>
            ) : detail.isError ? (
              <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
            ) : !detail.data ? (
              <LoadingState label="Opening the aerodrome file…" />
            ) : (
              <AirportFile detail={detail.data} />
            )}
          </section>
        </div>
      </div>
    </>
  )
}
