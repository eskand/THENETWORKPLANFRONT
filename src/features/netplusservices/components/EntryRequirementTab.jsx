import { useMemo, useState } from 'react'
import { ErrorState, LoadingState } from '../../../components/States'
import { useAirports } from '../../../hooks/useOperations'

/**
 * ENTRY REQUIREMENT — la fiche pays.
 *
 * Le prototype portait ici 1 Mo de texte reglementaire transcrit
 * (`COUNTRY_ER_DETAIL` : visa, conditions d'entree, informations generales,
 * documents de permis par type de vol). Ce corpus n'est pas encore en base :
 * il n'y a donc AUCUNE fiche a afficher, et cet onglet ne fabrique pas de
 * texte pour donner le change.
 *
 * Ce qu'il montre en attendant est vrai et utile : les Etats ou l'exploitant
 * pose reellement, derives de refdata.airports. La liste des pays ou il faut
 * un dossier d'entree commence par la liste des pays ou l'on va.
 */

export default function EntryRequirementTab() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  // usedOnly : les terrains que l'exploitant utilise vraiment, pas l'annuaire
  // mondial. C'est la meme regle que l'ecran Airports Data.
  const airports = useAirports({ search: '', usedOnly: true })

  const countries = useMemo(() => {
    const tally = new Map()
    for (const row of airports.data ?? []) {
      const iso = row.airport.countryIso2
      if (!iso) continue
      const entry = tally.get(iso) ?? { iso, airports: [] }
      entry.airports.push(row.airport.icao)
      tally.set(iso, entry)
    }
    return [...tally.values()].sort((a, b) => a.iso.localeCompare(b.iso))
  }, [airports.data])

  const needle = query.trim().toUpperCase()
  const shown = needle
    ? countries.filter((c) => c.iso.includes(needle) || c.airports.some((icao) => icao.includes(needle)))
    : countries

  const current = countries.find((c) => c.iso === selected) ?? null

  return (
    <div className="nps__col-main">
      <div className="nps__panel-head">
        <span className="nps__panel-title nps__panel-title--plain">Entry requirement</span>
        <input
          value={query}
          placeholder="Country ISO or ICAO…"
          style={{ width: 210 }}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="nps__scroll">
        <div className="nps__notice" style={{ marginBottom: 14 }}>
          <span>⚠</span>
          <span>
            <b>Le corpus Entry Requirements n'est pas en base.</b> Visa, conditions
            d'entree, documents de permis par type de vol et contacts d'autorite sont
            dans le prototype sous forme de texte transcrit ; leur reprise est le sprint{' '}
            <code>S10</code> (voir <code>docs/ports/permis-asa.md</code>, ecart E2 :
            tables de reference versionnees avec date d'entree en vigueur). Aucune fiche
            n'est affichee tant que la source n'est pas la.
          </span>
        </div>

        {airports.isError ? (
          <ErrorState error={airports.error} onRetry={() => airports.refetch()} />
        ) : !airports.data ? (
          <LoadingState label="Loading the operator network…" />
        ) : (
          <>
            <div className="nps__brief-eyebrow" style={{ marginBottom: 8 }}>
              States in the operator network — {countries.length}
            </div>

            <div className="nps__countries">
              {shown.map((country) => (
                <button
                  key={country.iso}
                  type="button"
                  className={selected === country.iso ? 'nps__country is-on' : 'nps__country'}
                  onClick={() => setSelected(selected === country.iso ? null : country.iso)}
                >
                  <span>{country.iso}</span>
                  <span>{country.airports.length} apt</span>
                </button>
              ))}
              {shown.length === 0 ? <div className="nps__empty">No match</div> : null}
            </div>

            {current ? (
              <div className="nps__card" style={{ marginTop: 16 }}>
                <div className="nps__card-head">
                  <span style={{ fontSize: 15 }}>🌍</span>
                  <span>{current.iso}</span>
                </div>
                <div className="nps__kv">
                  <span>Aerodromes used</span>
                  <span>{current.airports.join(' · ')}</span>
                </div>
                <div className="nps__kv">
                  <span>Visa requirements</span>
                  <span>—</span>
                </div>
                <div className="nps__kv">
                  <span>Entry requirements</span>
                  <span>—</span>
                </div>
                <div className="nps__kv">
                  <span>Permit documents</span>
                  <span>—</span>
                </div>
                <div className="nps__kv">
                  <span>Civil aviation authority</span>
                  <span>—</span>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
