import { fireEvent, screen } from '@testing-library/react'
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

describe('En-tête — bouton fermer (ref l. 17398)', () => {
  // ref : <button class="detail-close-btn" title="Fermer">✕</button> — libellé FR conservé (Q3)
  test('l’infobulle du bouton ✕ est « Fermer »', () => {
    open(row())
    expect(screen.getByTitle('Fermer')).toHaveClass('detail-close-btn')
  })
})

describe('FLIGHT — bloc « Flight note » (ref l. 14747-14757)', () => {
  test('une note existante s’affiche dans .fd-note avec son horodatage et « Edit »', async () => {
    routes['/legs/leg-1/note'] = { legId: 'leg-1', note: 'Slot 08:40 confirmed by NMOC', noteAt: '2026-09-18T07:12:00Z' }
    open(row())
    const body = await screen.findByText('Slot 08:40 confirmed by NMOC')
    expect(body).toHaveClass('fd-note-body')
    const block = body.closest('.fd-note')
    expect(block).not.toBeNull()
    expect(block.querySelector('.fd-note-hd')).toHaveTextContent('Flight note')
    // ref l. 12090 : _noteAt = ISO.slice(0,16).replace('T',' ') + 'Z'
    expect(block.querySelector('.fd-note-ts')).toHaveTextContent('2026-09-18 07:12Z')
    expect(block.querySelector('.fd-note-edit')).toHaveTextContent('Edit')
  })

  test('sans note, aucun bloc .fd-note', async () => {
    routes['/legs/leg-1/note'] = { legId: 'leg-1', note: null, noteAt: null }
    const { container } = open(row())
    await screen.findByText('TNP526')
    expect(container.querySelector('.fd-note')).toBeNull()
  })
})

describe('AIRPORT INFO — rangée des quatre cartes (ref l. 14821-14824)', () => {
  function openAirportTab() {
    routes['/legs/leg-1/readiness'] = { legId: 'leg-1', releasable: true, blocking: [], derogable: [], info: [] }
    routes['/airports/DTTA'] = {
      airport: { icao: 'DTTA', operatingHours: 'H24', rffsCategory: '8', aerodromeCategory: '4E' },
      runways: [{ designator: '01/19', lengthFt: 10499 }, { designator: '11/29', lengthFt: 6234 }],
    }
    routes['/airports/HECA'] = {
      airport: { icao: 'HECA', operatingHours: 'H24', rffsCategory: '9', aerodromeCategory: '4F' },
      runways: [{ designator: '05L/23R', lengthFt: 13123 }],
    }
    open(row())
    fireEvent.click(screen.getByTitle('Airport Info'))
  }

  // ref l. 14823 : <div class="val"><span class="fd-badge amber">${meta.cat}</span></div>
  test('« Airport CAT » est un badge ambre', async () => {
    openAirportTab()
    const cat = await screen.findByText('4E')
    expect(cat).toHaveClass('fd-badge', 'amber')
  })
})
