import AirportField from './AirportField'
import { FLIGHT_TYPES, OPERATIONS } from '../taxonomies'

/**
 * FLIGHT DETAILS — la colonne de gauche.
 *
 * Le formulaire ne fait qu'ecrire dans le dossier tenu par l'onglet : aucune
 * regle, aucun calcul. Les deux taxonomies qu'il propose sont dans
 * ../taxonomies.js, avec la raison pour laquelle elles devront migrer vers le
 * serveur.
 */

const STOP_KINDS = [
  ['TECH', 'Tech stop', 'Escale technique : atterrissage intermediaire sans trafic'],
  ['TRAFFIC', 'Multi-sector', 'Escale de trafic : embarquement ou debarquement'],
]

export default function FlightDetailsForm({ form, set, onSwap }) {
  return (
    <div className="nps__form">
      <div className="nps__row-icao">
        <AirportField
          label="Departure aerodrome"
          value={form.dep}
          onChange={(value) => set('dep', value)}
          tone="dep"
          placeholder="LFPG"
        />
        <button type="button" className="nps__swap" onClick={onSwap} title="Inverser depart et destination">
          ⇄
        </button>
        <AirportField
          label="Destination aerodrome"
          value={form.dest}
          onChange={(value) => set('dest', value)}
          tone="dest"
          placeholder="OMDB"
        />
      </div>

      <div>
        <label className="nps__label nps__label--danger">Tech stop / intermediate landing (ICAO)</label>
        <div className="nps__seg" style={{ marginBottom: 6 }}>
          {STOP_KINDS.map(([key, label, title]) => (
            <button
              key={key}
              type="button"
              title={title}
              className={form.stopKind === key ? 'is-on' : undefined}
              onClick={() => set('stopKind', form.stopKind === key ? '' : key)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={form.stops}
          placeholder="e.g. DAAG  or  LGAV OEJN"
          spellCheck={false}
          onChange={(event) => set('stops', event.target.value.toUpperCase())}
        />
      </div>

      <div className="nps__grid2">
        <div>
          <label className="nps__label">ETD (UTC)</label>
          <input type="time" value={form.etd} onChange={(event) => set('etd', event.target.value)} />
        </div>
        <div>
          <label className="nps__label">Date of flight</label>
          <input type="date" value={form.date} onChange={(event) => set('date', event.target.value)} />
        </div>
      </div>

      <div className="nps__grid2">
        <div>
          <label className="nps__label">Type of flight</label>
          <select value={form.flightType} onChange={(event) => set('flightType', event.target.value)}>
            {FLIGHT_TYPES.map(([code, label]) => (
              <option key={code} value={code}>
                {code} — {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="nps__label">Type of operation</label>
          <select value={form.operation} onChange={(event) => set('operation', event.target.value)}>
            {OPERATIONS.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="nps__label">Registration</label>
        <input
          value={form.registration}
          placeholder="TS-NPA"
          spellCheck={false}
          onChange={(event) => set('registration', event.target.value.toUpperCase())}
        />
      </div>

      <div className="nps__grid2">
        <div>
          <label className="nps__label">Operator</label>
          <input
            value={form.operator}
            placeholder="TNP or name"
            onChange={(event) => set('operator', event.target.value)}
          />
        </div>
        <div>
          <label className="nps__label">Callsign</label>
          <input
            value={form.callsign}
            placeholder="TNP101"
            onChange={(event) => set('callsign', event.target.value.toUpperCase())}
          />
        </div>
      </div>

      <div className="nps__grid2">
        <div>
          <label className="nps__label">A/C type</label>
          <input
            value={form.acType}
            placeholder="E55P"
            spellCheck={false}
            onChange={(event) => set('acType', event.target.value.toUpperCase())}
          />
        </div>
        <div>
          <label className="nps__label">MTOW (kg)</label>
          <input
            value={form.mtow}
            placeholder="21770"
            inputMode="numeric"
            onChange={(event) => set('mtow', event.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
      </div>

      <div className="nps__grid2">
        <div>
          <label className="nps__label">Pax on board</label>
          <input
            value={form.pax}
            placeholder="8"
            inputMode="numeric"
            onChange={(event) => set('pax', event.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
        <div>
          <label className="nps__label">Cargo (kg)</label>
          <input
            value={form.cargo}
            placeholder="1200"
            inputMode="numeric"
            onChange={(event) => set('cargo', event.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
      </div>

      <div className="nps__grid3">
        <div>
          <label className="nps__label">Cruise FL</label>
          <input
            value={form.cruiseFl}
            placeholder="FL350"
            onChange={(event) => set('cruiseFl', event.target.value.toUpperCase())}
          />
        </div>
        <div>
          <label className="nps__label">Speed (kt)</label>
          <input
            value={form.cruiseKt}
            placeholder="470"
            inputMode="numeric"
            onChange={(event) => set('cruiseKt', event.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
        <div>
          <label className="nps__label">Mach</label>
          <input
            value={form.mach}
            placeholder="0.80"
            onChange={(event) => set('mach', event.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="nps__label nps__label--danger">Avoid FIR (route generation)</label>
        <input
          value={form.avoidFir}
          placeholder="e.g. LTAA UUEE"
          spellCheck={false}
          onChange={(event) => set('avoidFir', event.target.value.toUpperCase())}
        />
      </div>

      <div>
        <label className="nps__label">Route</label>
        <textarea
          rows={3}
          value={form.route}
          placeholder="Waypoints and airways — LFPG DCT ATREX UL613 …"
          spellCheck={false}
          onChange={(event) => set('route', event.target.value.toUpperCase())}
        />
      </div>
    </div>
  )
}
