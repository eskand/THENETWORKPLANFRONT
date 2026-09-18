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

describe('vigilFor — onglet CREW (ref l. 77498-77504)', () => {
  // ref l. 77500 : 'Crew duty looks compliant — '+warn+' item(s) to review.'
  test('un avertissement FTL est compté, au format de la référence', () => {
    const verdict = vigilFor('crew', { ...base, crewFtlStatus: 'WARNING' })
    expect(verdict.title).toBe('Crew duty looks compliant — 1 item(s) to review.')
    expect(verdict.level).toBe('warn')
  })
})
