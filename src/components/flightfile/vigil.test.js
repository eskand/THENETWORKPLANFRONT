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

describe('vigilFor — onglet CREW (ref l. 77498-77504)', () => {
  // ref l. 77500 : 'Crew duty looks compliant — '+warn+' item(s) to review.'
  test('un avertissement FTL est compté, au format de la référence', () => {
    const verdict = vigilFor('crew', { ...base, crewFtlStatus: 'WARNING' })
    expect(verdict.title).toBe('Crew duty looks compliant — 1 item(s) to review.')
    expect(verdict.level).toBe('warn')
  })
})
