import { nature } from './FlightHero'

/**
 * CE QUE LA BANDE VIGIL ANNONCE, ONGLET PAR ONGLET.
 *
 * <p>Extrait de FlightFile.jsx pour que le menu de l'en-tete puisse l'ouvrir
 * en entier sans que les deux fichiers s'importent l'un l'autre.
 */
/**
 * Ce que la bande annonce, onglet par onglet — vigilFor() de l'annexe.
 *
 * @param extra ce que l'onglet ouvert a deja lu (`fuel`, `readiness`, `weather`,
 *   `pax`, `folder`) : l'annexe relit le DOM de l'onglet, ici la bande recoit
 *   les memes donnees que lui.
 */
export function vigilFor(tab, row, extra = {}) {
  const who = row.flightNo ?? row.registration
  const vigil = 'The VIGIL operations assistant is its own module — not wired yet'

  if (tab === 'flight') {
    const level = String(row.riskLevel ?? '').toUpperCase()

    // Un appareil au sol : la bande dit ce que le bandeau dit. Deux phrases
    // differentes sur le meme ecran — « CRITICAL RISK » en haut et « non
    // evalue » en bas — font douter des deux.
    if (row.kind === 'GROUND') {
      return {
        title: `${who} is not released to service.`,
        sub: row.riskAction ?? 'Airworthiness release withheld by CAMO — Part-M.A.901.',
        level: 'crit', action: 'Flight analysis', actionHint: vigil,
      }
    }

    if (!row.riskIndex) {
      return {
        title: `Not evaluated: ${who} has no SMS assessment.`,
        sub: 'The matrix scores five factors on a leg — none has answered for this one.',
        level: 'grey', action: 'Flight analysis', actionHint: vigil,
      }
    }
    return {
      title: level === 'LOW'
        ? `All systems nominal for ${who}.`
        : `Risk ${row.riskIndex}/25 — ${level} for ${who}.`,
      sub: row.riskTop
        ?? 'Five factors scored — weather and NOTAM not yet attached to the leg.',
      level: level === 'CRITICAL' || level === 'HIGH' ? 'crit'
        : level === 'MEDIUM' ? 'warn' : 'ok',
      action: 'Flight analysis', actionHint: vigil,
    }
  }

  if (tab === 'airport') {
    // ref l. 77481-77488 : aptitude des deux terrains (computeAirportSuitability),
    // puis « NOTAM: … · Weather: … ». L'aptitude est celle des controles de mise
    // en ligne (RUNWAY/AIRPORT/AERODROME/SLOT bloquants nommant le terrain), comme
    // dans l'onglet ; aucune source NOTAM n'est branchee → « no data ».
    const readiness = extra.readiness
    const action = { action: 'View NOTAMs', actionHint: 'NOTAMs for both aerodromes' }
    if (!readiness) {
      return { title: 'Airport suitability not computed.', sub: 'INSUFFICIENT DATA', level: 'grey', ...action }
    }
    const unsuitable = (icao) => (readiness.blocking ?? []).some((item) =>
      String(item.message ?? '').includes(icao ?? '')
        && /RUNWAY|AIRPORT|AERODROME|SLOT/.test(String(item.check ?? '')))
    const failing = [
      unsuitable(row.depIcao) ? (row.depCode ?? row.depIcao) : null,
      unsuitable(row.arrIcao) ? (row.arrCode ?? row.arrIcao) : null,
    ].filter(Boolean)
    const metar = (extra.weather?.stations ?? []).some((station) => station.observation)
    return {
      title: failing.length
        ? `Airport compatibility issue — ${failing.join(' & ')}.`
        : 'Both airports are suitable for operation.',
      sub: `NOTAM: no data (offline or not yet analysed) · Weather: ${metar ? 'METAR received' : 'unavailable'}`,
      level: failing.length ? 'crit' : 'ok',
      ...action,
    }
  }

  if (tab === 'services' || tab === 'ovf') {
    const permit = tab === 'ovf'
    const total = permit ? row.permitsOutstanding : row.servicesTotal
    const confirmed = permit ? 0 : row.servicesConfirmed
    const noun = permit ? 'permit' : 'service'

    if (!total) {
      return {
        title: permit
          ? 'No overflight / traffic permit required on this leg.'
          : 'No service on this leg.',
        sub: permit ? 'Permit requirement derived from the route country list.' : null,
        level: 'ok', action: permit ? 'Ask VIGIL' : 'Flight Brief', actionHint: vigil,
      }
    }
    if (!permit && confirmed === total) {
      return {
        title: `All ${noun}s at ${row.depCode} / ${row.arrCode} are confirmed.`,
        sub: `${confirmed} of ${total} ${noun}s confirmed. Ready to proceed.`,
        level: 'ok', action: 'Flight Brief', actionHint: vigil,
      }
    }
    const waiting = permit ? total : total - confirmed
    return {
      title: `${waiting} ${noun}${waiting === 1 ? '' : 's'} awaiting action.`,
      sub: permit
        ? 'Send the requests and record the clearances before dispatch.'
        : `${confirmed} of ${total} confirmed — send the requests and record the confirmations.`,
      level: 'warn', action: permit ? 'Ask VIGIL' : 'Flight Brief', actionHint: vigil,
    }
  }

  if (tab === 'fuel') {
    // ref l. 77497 : fournisseur ET prix connus → « Fuel data ready » avec le
    // detail du tarif ; sinon l'avertissement, en ambre.
    const fuel = extra.fuel
    if (fuel?.supplierName && fuel?.price) {
      const symbol = fuel.currency === 'USD' ? '$' : `${fuel.currency ?? ''} `
      const dated = [fuel.effectiveFrom, fuel.effectiveTo].filter(Boolean).join(' → ')
      return {
        title: `Fuel data ready for ${who}.`,
        sub: `${fuel.supplierName} · ${symbol}${fuel.price} / ${String(fuel.unit ?? 'usg').toUpperCase()}`
          + (dated ? ` · price date ${dated}` : ' · price not dated'),
        level: 'ok', action: 'Ask VIGIL', actionHint: vigil,
      }
    }
    return {
      title: `No fuel supplier / price recorded for ${row.depCode ?? row.depIcao}.`,
      sub: 'Select a supplier in the Services tab or import the fuel price database.',
      level: 'warn', action: 'Ask VIGIL', actionHint: vigil,
    }
  }

  if (tab === 'crew') {
    const missing = Math.max(0, (row.crewMinimumSeats ?? 0) - (row.crewSeatsFilled ?? 0))
    const documents = String(row.crewDocumentStatus ?? '').toUpperCase()
    const ftl = String(row.crewFtlStatus ?? '').toUpperCase()

    if (missing) {
      return {
        title: `${missing} flight deck position${missing === 1 ? '' : 's'} not assigned.`,
        sub: 'Assign the crew from the roster before dispatch.',
        level: 'crit', action: 'Crew analysis', actionHint: vigil,
      }
    }
    if (documents === 'EXPIRED' || ftl === 'BREACH') {
      return {
        title: 'Crew item NOT LEGAL / expired.',
        sub: 'See the pills on each crew member — FTL engine + licence / medical checks.',
        level: 'crit', action: 'Crew analysis', actionHint: vigil,
      }
    }
    if (ftl === 'WARNING') {
      return {
        // ref l. 77500 : 'Crew duty looks compliant — '+warn+' item(s) to review.' —
        // la ligne ne porte qu'un verdict FTL, donc un seul élément à revoir.
        title: 'Crew duty looks compliant — 1 item(s) to review.',
        sub: `Warnings from the FTL / currency checks for ${who}.`,
        level: 'warn', action: 'Crew analysis', actionHint: vigil,
      }
    }
    return {
      title: 'Crew duty looks compliant.',
      sub: `No critical issues detected for ${who} (FTL engine, licences, medicals).`,
      level: 'ok', action: 'Crew analysis', actionHint: vigil,
    }
  }

  if (tab === 'pax') {
    // ref l. 77507-77511 : n = lignes du manifeste, bad = documents non valides
    // (le serveur les juge contre la date du vol).
    const manifest = extra.pax?.passengers ?? []
    const n = manifest.length
    const bad = extra.pax?.documentsNotValid ?? 0
    const action = { action: 'Manifest', actionHint: 'Crew & Passenger Manifest (PDF)' }
    if (!n) {
      const positioning =
        /FERRY|POSITIONING|EMPTY/.test(String(row.flightType ?? '').toUpperCase())
      return {
        title: positioning
          ? `${nature(row.flightType, row.commercialType)} — no passengers on board.`
          : 'No passenger on the manifest.',
        sub: positioning
          ? 'Positioning sector: passenger documents not applicable.'
          : 'Add passengers or import the list (CSV / Excel).',
        level: 'ok', ...action,
      }
    }
    if (bad) {
      return {
        title: `${bad} passenger document${bad === 1 ? '' : 's'} not valid.`,
        sub: `${n} passenger(s) on manifest — complete document number, type and validity.`,
        level: 'warn', ...action,
      }
    }
    return {
      title: 'All passenger documents are valid.',
      sub: `${n} passenger(s) on manifest — no alert detected for ${who}.`,
      level: 'ok', ...action,
    }
  }

  // ref l. 77512-77515 : on = documents deposes parmi les cinq lignes du
  // dossier, tot = 5 ; la sous-ligne dit ce qui bloque la cloture.
  const onFile = new Set((extra.folder?.documents ?? []).map((document) => document.kind))
  const on = TRIP_FOLDER_KINDS.filter((kind) => onFile.has(kind)).length
  const tot = TRIP_FOLDER_KINDS.length
  const blockers = extra.folder?.closureBlockers ?? []
  return {
    title: on === tot ? 'All required documents are on file.' : `${tot - on} of ${tot} documents pending upload.`,
    sub: blockers.length
      ? `Flight closure blocked: ${blockers.join(' · ')}`
      : 'All required documents will be validated before flight closure.',
    level: on === tot ? 'ok' : 'warn',
    action: 'Document check', actionHint: 'Scroll to the flight closure',
  }
}

/** Les cinq lignes du dossier de vol (tabTripFolder, l. 16525-16531), par nature stockee. */
const TRIP_FOLDER_KINDS = ['FPL', 'OFP', 'WEIGHT_BALANCE', 'NOTOC', 'FUEL_RECEIPT']
