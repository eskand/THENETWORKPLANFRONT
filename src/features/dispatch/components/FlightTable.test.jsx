import { render, screen, within } from '@testing-library/react'
import FlightTable from './FlightTable'

/**
 * Le tableau du desk Dispatch — référence TNP_DEMO_FINAL_v226_114.html (v33),
 * lignes l. 22752-22806 (`refreshDispatchList`) et badges l. 22677-22683.
 */
function row(overrides = {}) {
  return {
    kind: 'FLIGHT', rowId: 'leg-1', legId: 'leg-1', aircraftId: 'ac-1',
    flightNo: 'TNP526', label: 'TNP526', riskLevel: 'LOW',
    registration: 'TS-NPD', icaoType: 'F2TH', model: 'Falcon 2000',
    depIcao: 'DTTA', depCode: 'TUN', arrIcao: 'HECA', arrCode: 'CAI', routeLabel: 'TUN → CAI',
    baseIcao: 'DTTA',
    std: '2026-09-18T08:00:00Z', etd: '2026-09-18T08:00:00Z', atd: null,
    sta: '2026-09-18T11:00:00Z', eta: '2026-09-18T11:00:00Z', ata: null, ctot: null,
    servicesReadiness: 'PENDING', servicesConfirmed: 2, servicesTotal: 8, permitsOutstanding: 0,
    crewAssigned: true, crewSeatsFilled: 2, crewMinimumSeats: 2,
    crewFtlStatus: 'OK', crewDocumentStatus: 'VALID',
    status: 'PLANNED', statusTone: 'SCHEDULED', attention: false, melBlocking: false,
    delayMinutes: 0, note: null, paxCount: 4,
    ...overrides,
  }
}

function crewCell(rowData) {
  render(<FlightTable rows={[rowData]} loading={false} selectedId={null} onSelect={() => {}} />)
  // 11e colonne (index 10) : Crew
  return within(screen.getAllByRole('row')[1]).getAllByRole('cell')[10]
}

describe('FlightTable — cellule Crew de la référence', () => {
  // ref l. 22776 : équipage incomplet → badge rouge « n/N »
  test('un équipage incomplet s’écrit « n/N » en rouge', () => {
    const cell = crewCell(row({ crewAssigned: false, crewSeatsFilled: 1, crewMinimumSeats: 2 }))
    const badge = within(cell).getByText('1/2')
    expect(badge).toHaveClass('badge--attention')
    expect(within(cell).queryByText('Unassigned')).toBeNull()
  })

  // ref l. 22775 : tous les sièges requis pourvus → badge VERT « Assigned »
  test('un équipage complet s’écrit « Assigned » en vert', () => {
    const cell = crewCell(row())
    expect(within(cell).getByText('Assigned')).toHaveClass('badge--ready')
  })
})
