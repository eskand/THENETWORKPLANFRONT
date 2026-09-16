import { useMemo, useState } from 'react'

/**
 * AIRPORT SLOT — redaction du message SCR (IATA SSIM chapitre 6).
 *
 * Ce generateur est porte tel quel du prototype (`buildFlightLine`,
 * `generateSCR`) : c'est du formatage de chaine, sans regle metier ni donnee
 * de reference. Il fonctionne donc entierement ici, sans serveur — rien n'est
 * calcule, rien n'est devine, le message est la mise en forme exacte de ce
 * que l'operateur saisit.
 *
 * Ce que cet onglet NE FAIT PAS, et ne pretend pas faire : dire si un terrain
 * est de niveau 2 ou 3. Ce verdict vient de l'annexe 12.7 du WASG, qui n'est
 * pas encore en base (sprint S10). L'operateur redige son SCR ; il ne recoit
 * pas ici la reponse a « en ai-je besoin ? ».
 */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SVC_OPTIONS = [
  ['J', 'J — Scheduled passenger'],
  ['G', 'G — Add. passenger'],
  ['C', 'C — Charter pax'],
  ['F', 'F — Scheduled cargo'],
  ['A', 'A — Add. cargo'],
  ['H', 'H — Charter cargo'],
  ['P', 'P — Positioning / ferry'],
  ['K', 'K — Training'],
  ['X', 'X — Technical stop'],
]

const ACTIONS = [
  ['N', 'N — New'],
  ['C', 'C — Change'],
  ['D', 'D — Delete'],
  ['R', 'R — Revised'],
]

function pad(value, width) {
  return String(value).padStart(width, '0')
}

function todayDdMmm() {
  const now = new Date()
  return pad(now.getUTCDate(), 2) + MONTHS[now.getUTCMonth()]
}

function dateToDdMmm(iso) {
  if (!iso) return ''
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  return pad(date.getUTCDate(), 2) + MONTHS[date.getUTCMonth()]
}

function buildDaysCode(days) {
  let out = ''
  for (let day = 1; day <= 7; day += 1) out += days[day] ? String(day) : '0'
  return out
}

/** Une ligne de vol SSIM. Sans numero d'arrivee ni de depart, pas de ligne. */
function buildFlightLine(action, leg) {
  const arrFlt = (leg.arrFlt || '').trim().toUpperCase()
  const depFlt = (leg.depFlt || '').trim().toUpperCase()
  if (!arrFlt && !depFlt) return ''

  const prefix = arrFlt ? action + arrFlt + (depFlt ? ` ${depFlt}` : '') : `${action} ${depFlt}`
  const from = dateToDdMmm(leg.dateFrom)
  const to = dateToDdMmm(leg.dateTo) || from
  const seats = (leg.seats || '0').padStart(3, '0').slice(0, 3)
  const type = (leg.acType || '').toUpperCase().slice(0, 3)

  let routing = ''
  if (arrFlt) routing += (leg.origin || '???') + (leg.sta || '????')
  if (depFlt) routing += `${arrFlt ? ' ' : ''}${leg.std || '????'}${leg.dest || '???'}`

  let service = ''
  if (arrFlt) service += leg.svcArr || 'J'
  if (depFlt) service += leg.svcDep || 'J'

  return `${prefix} ${from}${to} ${buildDaysCode(leg.days)} ${seats}${type} ${routing} ${service}`
}

function newLeg() {
  return {
    id: crypto.randomUUID(),
    arrFlt: '',
    depFlt: '',
    dateFrom: '',
    dateTo: '',
    days: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true },
    seats: '',
    acType: '',
    origin: '',
    sta: '',
    std: '',
    dest: '',
    svcArr: 'J',
    svcDep: 'J',
  }
}

export default function AirportSlotTab() {
  const [airport, setAirport] = useState('')
  const [airline, setAirline] = useState('TNP')
  const [season, setSeason] = useState('W26')
  const [action, setAction] = useState('N')
  const [si, setSi] = useState('')
  const [gi, setGi] = useState('')
  const [legs, setLegs] = useState([newLeg()])
  const [copied, setCopied] = useState(false)

  const message = useMemo(() => {
    const station = airport.trim().toUpperCase()
    const carrier = airline.trim().toUpperCase()
    if (!station || !season || !carrier || legs.length === 0) return ''
    const lines = ['SCR', `/${carrier} THE NETWORK PLAN OCC`, season, todayDdMmm(), station]
    legs.forEach((leg) => {
      const line = buildFlightLine(action, leg)
      if (line) lines.push(line)
    })
    if (si.trim()) lines.push(`SI ${si.trim().toUpperCase()}`)
    if (gi.trim()) lines.push(`GI ${gi.trim().toUpperCase()}`)
    return lines.join('\n')
  }, [airport, airline, season, action, legs, si, gi])

  function update(id, key, value) {
    setLegs((previous) => previous.map((leg) => (leg.id === id ? { ...leg, [key]: value } : leg)))
  }

  function toggleDay(id, day) {
    setLegs((previous) =>
      previous.map((leg) => (leg.id === id ? { ...leg, days: { ...leg.days, [day]: !leg.days[day] } } : leg)),
    )
  }

  async function copy() {
    if (!message || !navigator.clipboard) return
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="nps__col-main">
      <div className="nps__panel-head">
        <span className="nps__panel-title nps__panel-title--plain">Airport slot — SCR message</span>
        <span className="nps__pill">IATA SSIM ch. 6</span>
      </div>

      <div className="nps__scroll">
        <div className="nps__scr">
          <div>
            <div className="nps__grid3" style={{ marginBottom: 12 }}>
              <div>
                <label className="nps__label">Airport (IATA)</label>
                <input
                  value={airport}
                  placeholder="TUN"
                  maxLength={3}
                  onChange={(event) => setAirport(event.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="nps__label">Airline</label>
                <input
                  value={airline}
                  placeholder="TNP"
                  maxLength={3}
                  onChange={(event) => setAirline(event.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="nps__label">Season</label>
                <input
                  value={season}
                  placeholder="W26"
                  maxLength={3}
                  onChange={(event) => setSeason(event.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="nps__label">Action</label>
              <div className="nps__seg">
                {ACTIONS.map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    className={action === code ? 'is-on' : undefined}
                    onClick={() => setAction(code)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {legs.map((leg, index) => (
              <div className="nps__leg" key={leg.id}>
                <div className="nps__leg-head">
                  <span>Movement {index + 1}</span>
                  {legs.length > 1 ? (
                    <button
                      type="button"
                      className="nps__btn"
                      onClick={() => setLegs((previous) => previous.filter((row) => row.id !== leg.id))}
                    >
                      ✕ Remove
                    </button>
                  ) : null}
                </div>

                <div className="nps__grid2">
                  <div>
                    <label className="nps__label">Arrival flight</label>
                    <input
                      value={leg.arrFlt}
                      placeholder="101"
                      onChange={(event) => update(leg.id, 'arrFlt', event.target.value.toUpperCase())}
                    />
                  </div>
                  <div>
                    <label className="nps__label">Departure flight</label>
                    <input
                      value={leg.depFlt}
                      placeholder="102"
                      onChange={(event) => update(leg.id, 'depFlt', event.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="nps__grid2">
                  <div>
                    <label className="nps__label">Valid from</label>
                    <input
                      type="date"
                      value={leg.dateFrom}
                      onChange={(event) => update(leg.id, 'dateFrom', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="nps__label">Valid to</label>
                    <input
                      type="date"
                      value={leg.dateTo}
                      onChange={(event) => update(leg.id, 'dateTo', event.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="nps__label">Days of operation</label>
                  <div className="nps__days">
                    {DAY_LABELS.map((label, offset) => {
                      const day = offset + 1
                      return (
                        <button
                          key={label}
                          type="button"
                          className={leg.days[day] ? 'is-on' : undefined}
                          onClick={() => toggleDay(leg.id, day)}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="nps__grid2">
                  <div>
                    <label className="nps__label">Seats</label>
                    <input
                      value={leg.seats}
                      placeholder="080"
                      inputMode="numeric"
                      maxLength={3}
                      onChange={(event) => update(leg.id, 'seats', event.target.value.replace(/[^\d]/g, ''))}
                    />
                  </div>
                  <div>
                    <label className="nps__label">A/C type</label>
                    <input
                      value={leg.acType}
                      placeholder="320"
                      maxLength={3}
                      onChange={(event) => update(leg.id, 'acType', event.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="nps__grid2">
                  <div>
                    <label className="nps__label">Origin · STA</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        value={leg.origin}
                        placeholder="CDG"
                        maxLength={3}
                        onChange={(event) => update(leg.id, 'origin', event.target.value.toUpperCase())}
                      />
                      <input
                        value={leg.sta}
                        placeholder="1040"
                        maxLength={4}
                        onChange={(event) => update(leg.id, 'sta', event.target.value.replace(/[^\d]/g, ''))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="nps__label">STD · destination</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        value={leg.std}
                        placeholder="1140"
                        maxLength={4}
                        onChange={(event) => update(leg.id, 'std', event.target.value.replace(/[^\d]/g, ''))}
                      />
                      <input
                        value={leg.dest}
                        placeholder="CDG"
                        maxLength={3}
                        onChange={(event) => update(leg.id, 'dest', event.target.value.toUpperCase())}
                      />
                    </div>
                  </div>
                </div>

                <div className="nps__grid2">
                  <div>
                    <label className="nps__label">Service type — arrival</label>
                    <select value={leg.svcArr} onChange={(event) => update(leg.id, 'svcArr', event.target.value)}>
                      {SVC_OPTIONS.map(([code, label]) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="nps__label">Service type — departure</label>
                    <select value={leg.svcDep} onChange={(event) => update(leg.id, 'svcDep', event.target.value)}>
                      {SVC_OPTIONS.map(([code, label]) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="nps__btn"
              onClick={() => setLegs((previous) => [...previous, newLeg()])}
            >
              + Add movement
            </button>
          </div>

          <div>
            <div className="nps__panel-title nps__panel-title--plain" style={{ marginBottom: 9 }}>
              Message
            </div>
            <div className="nps__scr-out">{message || 'Airport, airline and season are required.'}</div>

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" className="nps__btn" disabled={!message} onClick={copy}>
                {copied ? '✓ Copied' : '⧉ Copy message'}
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <label className="nps__label">SI — supplementary information</label>
              <textarea rows={2} value={si} onChange={(event) => setSi(event.target.value)} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label className="nps__label">GI — general information</label>
              <textarea rows={2} value={gi} onChange={(event) => setGi(event.target.value)} />
            </div>

            <div className="nps__notice" style={{ marginTop: 14 }}>
              <span>⚠</span>
              <span>
                Le message est mis en forme, pas verifie. Le <b>niveau du terrain</b> (2 ou 3)
                et le besoin reel d'un SCR viennent de l'annexe <code>WASG 12.7</code>, qui
                n'est pas encore en base — <code>S10</code>.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
