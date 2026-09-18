import { vigilFor } from './vigil'

/**
 * La bande VIGIL de l'étiquette — vigilFor() de la référence
 * TNP_DEMO_FINAL_v226_114.html (v33) l. 77469-77530.
 */
const base = {
  flightNo: 'TNP526', registration: 'TS-NPD', kind: 'FLIGHT',
  depCode: 'TUN', arrCode: 'CAI', depIcao: 'DTTA', arrIcao: 'HECA',
  crewMinimumSeats: 2, crewSeatsFilled: 2, crewDocumentStatus: 'VALID', crewFtlStatus: 'OK',
}

describe('vigilFor — onglet FUEL (ref l. 77497)', () => {
  test('fournisseur et prix connus → « Fuel data ready » avec le détail du tarif', () => {
    const verdict = vigilFor('fuel', base, {
      fuel: {
        supplierName: 'World Fuel Services', price: 5.23, currency: 'USD', unit: 'USG',
        effectiveFrom: '2026-09-01', effectiveTo: '2026-09-30',
      },
    })
    expect(verdict.title).toBe('Fuel data ready for TNP526.')
    expect(verdict.sub).toBe('World Fuel Services · $5.23 / USG · price date 2026-09-01 → 2026-09-30')
    expect(verdict.level).toBe('ok')
  })

  test('rien de connu → avertissement de la référence, en ambre', () => {
    const verdict = vigilFor('fuel', base, { fuel: { supplierName: null, price: null } })
    expect(verdict.title).toBe('No fuel supplier / price recorded for TUN.')
    expect(verdict.sub).toBe('Select a supplier in the Services tab or import the fuel price database.')
    expect(verdict.level).toBe('warn')
  })
})

describe('vigilFor — onglet AIRPORT (ref l. 77481-77488)', () => {
  test('sans verdict de mise en ligne → « not computed » / INSUFFICIENT DATA, gris', () => {
    const verdict = vigilFor('airport', base, {})
    expect(verdict.title).toBe('Airport suitability not computed.')
    expect(verdict.sub).toBe('INSUFFICIENT DATA')
    expect(verdict.level).toBe('grey')
  })

  test('deux terrains aptes, METAR reçu, pas de source NOTAM', () => {
    const verdict = vigilFor('airport', base, {
      readiness: { blocking: [], derogable: [], info: [] },
      weather: { stations: [{ icao: 'DTTA', observation: { raw: 'DTTA 180800Z' } }] },
    })
    expect(verdict.title).toBe('Both airports are suitable for operation.')
    expect(verdict.sub).toBe('NOTAM: no data (offline or not yet analysed) · Weather: METAR received')
    expect(verdict.level).toBe('ok')
  })

  test('un terrain inapte → « Airport compatibility issue — CODE. », critique', () => {
    const verdict = vigilFor('airport', base, {
      readiness: {
        blocking: [{ check: 'RUNWAY_TOO_SHORT', message: 'HECA longest runway is below the type minimum' }],
        derogable: [], info: [],
      },
      weather: { stations: [] },
    })
    expect(verdict.title).toBe('Airport compatibility issue — CAI.')
    expect(verdict.sub).toBe('NOTAM: no data (offline or not yet analysed) · Weather: unavailable')
    expect(verdict.level).toBe('crit')
  })
})

describe('vigilFor — onglet PAX (ref l. 77507-77511)', () => {
  test('manifeste vide sur un vol commercial', () => {
    const verdict = vigilFor('pax', { ...base, paxCount: 4, flightType: 'PAX' },
      { pax: { passengers: [], documentsNotValid: 0 } })
    expect(verdict.title).toBe('No passenger on the manifest.')
    expect(verdict.sub).toBe('Add passengers or import the list (CSV / Excel).')
    expect(verdict.level).toBe('ok')
  })

  test('un document non valide sur trois passagers', () => {
    const verdict = vigilFor('pax', base, {
      pax: { passengers: [{ id: 1 }, { id: 2 }, { id: 3 }], documentsNotValid: 1 },
    })
    expect(verdict.title).toBe('1 passenger document not valid.')
    expect(verdict.sub).toBe('3 passenger(s) on manifest — complete document number, type and validity.')
    expect(verdict.level).toBe('warn')
  })

  test('tous les documents valides', () => {
    const verdict = vigilFor('pax', base, {
      pax: { passengers: [{ id: 1 }, { id: 2 }], documentsNotValid: 0 },
    })
    expect(verdict.title).toBe('All passenger documents are valid.')
    expect(verdict.sub).toBe('2 passenger(s) on manifest — no alert detected for TNP526.')
    expect(verdict.level).toBe('ok')
  })
})

describe('vigilFor — onglet TRIP FOLDER (ref l. 77512-77515)', () => {
  test('deux documents sur cinq déposés, clôture bloquée', () => {
    const verdict = vigilFor('tripfolder', base, {
      folder: { documents: [{ kind: 'FPL' }, { kind: 'OFP' }], closureBlockers: ['ATD', 'ATA'] },
    })
    expect(verdict.title).toBe('3 of 5 documents pending upload.')
    expect(verdict.sub).toBe('Flight closure blocked: ATD · ATA')
    expect(verdict.level).toBe('warn')
  })

  test('tous les documents déposés, rien ne bloque', () => {
    const verdict = vigilFor('tripfolder', base, {
      folder: {
        documents: ['FPL', 'OFP', 'WEIGHT_BALANCE', 'NOTOC', 'FUEL_RECEIPT'].map((kind) => ({ kind })),
        closureBlockers: [],
      },
    })
    expect(verdict.title).toBe('All required documents are on file.')
    expect(verdict.sub).toBe('All required documents will be validated before flight closure.')
    expect(verdict.level).toBe('ok')
  })
})

describe('vigilFor — onglet CREW (ref l. 77498-77504)', () => {
  // ref l. 77500 : 'Crew duty looks compliant — '+warn+' item(s) to review.'
  test('un avertissement FTL est compté, au format de la référence', () => {
    const verdict = vigilFor('crew', { ...base, crewFtlStatus: 'WARNING' })
    expect(verdict.title).toBe('Crew duty looks compliant — 1 item(s) to review.')
    expect(verdict.level).toBe('warn')
  })
})
