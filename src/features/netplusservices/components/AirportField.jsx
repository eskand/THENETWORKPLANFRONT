import { useEffect, useRef, useState } from 'react'
import { useAirports } from '../../../hooks/useOperations'

/**
 * Champ de code OACI avec suggestions.
 *
 * Le prototype validait la saisie contre un annuaire de 9 583 terrains
 * embarque dans le fichier (`window.__NP_opsAP`). Ici la verification passe
 * par GET /v1/airports : un seul annuaire, celui de refdata.airports, que
 * l'ecran Airports Data lit deja. Aucune liste de terrains n'est recopiee
 * dans le front.
 *
 * La regle de la surcouche d'origine est conservee : tant que l'annuaire n'a
 * pas repondu, AUCUN verdict n'est rendu — un champ n'est jamais marque faux
 * parce que la reponse n'est pas encore arrivee.
 */
export default function AirportField({ label, value, onChange, tone, placeholder = 'ICAO' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  // On n'interroge l'annuaire qu'a partir de deux caracteres : en dessous, la
  // reponse serait la base entiere.
  const search = query.trim().length >= 2 ? query.trim() : ''
  const airports = useAirports(search ? { search } : { search: '' })
  const rows = search ? (airports.data ?? []).slice(0, 8) : []

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const code = (value ?? '').trim().toUpperCase()
  // Verdict a trois etats : inconnu tant que rien n'a ete demande ou recu.
  let known = null
  if (code.length === 4 && search && !airports.isFetching) {
    known = (airports.data ?? []).some((row) => row.airport.icao === code)
  }

  function pick(row) {
    onChange(row.airport.icao)
    setQuery('')
    setOpen(false)
  }

  const border = known === false ? 'var(--nps-red)' : known === true ? 'var(--nps-gr)' : undefined

  return (
    <div className={`nps__ac nps__icao ${tone ? `nps__icao--${tone}` : ''}`} ref={boxRef}>
      <label className="nps__label">{label}</label>
      <input
        value={code}
        placeholder={placeholder}
        maxLength={4}
        spellCheck={false}
        autoComplete="off"
        style={border ? { borderColor: border } : undefined}
        title={known === false ? `${code} n'est pas dans refdata.airports` : undefined}
        onChange={(event) => {
          const next = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
          onChange(next)
          setQuery(next)
          setOpen(next.length >= 2)
        }}
        onFocus={() => setOpen(code.length >= 2)}
      />
      {open && rows.length > 0 ? (
        <div className="nps__ac-list">
          {rows.map((row) => (
            <button key={row.airport.icao} type="button" className="nps__ac-item" onClick={() => pick(row)}>
              <b>{row.airport.icao}</b>
              {row.airport.name}
              {row.airport.city ? ` · ${row.airport.city}` : ''}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
