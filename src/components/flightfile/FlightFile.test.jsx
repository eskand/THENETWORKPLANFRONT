import { screen } from '@testing-library/react'
import { vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'

/**
 * L'étiquette de vol — référence TNP_DEMO_FINAL_v226_114.html (v33),
 * `showDetail` l. 17376-17470, onglets l. 14725-16612.
 *
 * Le client HTTP est remplacé : une URL connue de `routes` répond tout de
 * suite, toute autre reste en attente — l'étiquette se rend alors avec la
 * ligne qu'on lui donne, sans réseau.
 */
const routes = vi.hoisted(() => ({}))

vi.mock('../../api/client', () => {
  const pending = () => new Promise(() => {})
  return {
    default: {
      defaults: { baseURL: '/v1' },
      get: vi.fn((url) => (url in routes ? Promise.resolve({ data: routes[url] }) : pending())),
      post: vi.fn(pending),
      put: vi.fn(pending),
      patch: vi.fn(pending),
      delete: vi.fn(pending),
    },
  }
})

// eslint-disable-next-line import/first
import FlightFile from './FlightFile'

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
    delayMinutes: 0, note: null,
    depName: 'Tunis Carthage', depCity: 'Tunis', depCountry: 'TN',
    arrName: 'Cairo Intl', arrCity: 'Cairo', arrCountry: 'EG',
    flightType: 'PAX', commercialType: 'NON_SCHEDULED', flightPlanLetter: 'N',
    paxCount: 4, riskIndex: 0, riskTop: null, riskAction: null, mvtSentAt: null,
    ...overrides,
  }
}

function open(rowData) {
  return renderWithProviders(<FlightFile row={rowData} onClose={() => {}} />)
}

beforeEach(() => {
  for (const key of Object.keys(routes)) delete routes[key]
})

describe('En-tête — pastille de statut (statusLabel, ref l. 12588-12589)', () => {
  test('un vol parti s’écrit « In flight » avec la classe enroute', () => {
    open(row({ status: 'DEPARTED', statusTone: 'ENROUTE' }))
    const pill = screen.getByText('In flight')
    expect(pill).toHaveClass('status-pill', 'enroute')
  })

  test('un vol planifié s’écrit « Scheduled » avec la classe scheduled', () => {
    open(row({ status: 'PLANNED', statusTone: 'SCHEDULED' }))
    expect(screen.getByText('Scheduled')).toHaveClass('status-pill', 'scheduled')
  })
})
