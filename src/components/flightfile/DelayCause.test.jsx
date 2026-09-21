import { fireEvent, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'

/**
 * La cause du retard, demandée à la saisie de l'heure bloc.
 *
 * Le serveur enregistre un retard codé avec le mouvement OUT depuis toujours
 * (RecordMovementCommand.delayMinutes / delayCode) mais aucun écran ne le
 * demandait : la cause tombait sur « 89 » en silence. Ici, dès que l'ATD
 * saisie dépasse le STD, l'OCC choisit un code de la liste du tenant, et le
 * mouvement part avec les minutes et le code.
 */
const routes = vi.hoisted(() => ({}))
const posted = vi.hoisted(() => [])

vi.mock('../../api/client', () => {
  const pending = () => new Promise(() => {})
  return {
    default: {
      defaults: { baseURL: '/v1' },
      get: vi.fn((url) => (url in routes ? Promise.resolve({ data: routes[url] }) : pending())),
      post: vi.fn((url, body) => {
        posted.push({ url, body })
        return Promise.resolve({ data: {} })
      }),
      put: vi.fn(pending),
      patch: vi.fn(pending),
      delete: vi.fn(pending),
    },
  }
})

// eslint-disable-next-line import/first
import { OffBlockModal } from './HeaderMenu'
// eslint-disable-next-line import/first
import FlightFile from './FlightFile'

const CODES = [
  { code: '71', label: 'Departure station weather' },
  { code: '93', label: 'Aircraft rotation, late arrival of another leg' },
]

function row(overrides = {}) {
  return {
    legId: 'leg-1', flightNo: 'TNP526', registration: 'TS-NPD',
    std: '2026-09-21T08:00:00Z', sta: '2026-09-21T11:00:00Z', atd: null,
    ...overrides,
  }
}

beforeEach(() => {
  for (const key of Object.keys(routes)) delete routes[key]
  posted.length = 0
  routes['/legs/delay-codes'] = CODES
})

const q = (selector) => document.querySelector(selector)

describe('OffBlockModal — la cause du retard (POST /legs/{id}/movements avec delayMinutes et delayCode)', () => {
  test('une ATD après le STD montre le retard et la liste des codes du tenant ; sans cause, on ne peut pas enregistrer', async () => {
    renderWithProviders(<OffBlockModal row={row()} onClose={() => {}} />)
    fireEvent.change(q('input[type="time"]'), { target: { value: '08:22' } })
    expect(screen.getByText('Delay')).toBeInTheDocument()
    expect(screen.getByText('+22 min')).toBeInTheDocument()
    const select = await screen.findByLabelText('Delay cause')
    await waitFor(() => expect(select.options).toHaveLength(3))
    expect([...select.options].map((o) => o.textContent)).toEqual([
      'Choose the cause…', '71 — Departure station weather', '93 — Aircraft rotation, late arrival of another leg',
    ])
    fireEvent.click(screen.getByText('Log ATD and send'))
    expect(posted).toHaveLength(0)
    expect(screen.getByText('The delay needs a cause before the time is recorded.')).toBeInTheDocument()
  })

  test('avec une cause, le mouvement OUT part avec les minutes et le code', async () => {
    renderWithProviders(<OffBlockModal row={row()} onClose={() => {}} />)
    fireEvent.change(q('input[type="time"]'), { target: { value: '08:22' } })
    const select = await screen.findByLabelText('Delay cause')
    await waitFor(() => expect(select.options).toHaveLength(3))
    fireEvent.change(select, { target: { value: '93' } })
    fireEvent.click(screen.getByText('Log ATD and send'))
    await waitFor(() => expect(posted.length).toBeGreaterThan(0))
    expect(posted[0].url).toBe('/legs/leg-1/movements')
    expect(posted[0].body).toEqual({ kind: 'OUT', at: '2026-09-21T08:22:00.000Z', delayMinutes: 22, delayCode: '93' })
  })

  test('le masque ATD de l’onglet FLIGHT demande aussi la cause quand l’heure saisie est en retard', async () => {
    renderWithProviders(<FlightFile row={{
      kind: 'FLIGHT', rowId: 'leg-1', legId: 'leg-1', aircraftId: 'ac-1', flightNo: 'TNP526', label: 'TNP526',
      riskLevel: 'LOW', registration: 'TS-NPD', icaoType: 'F2TH', model: 'Falcon 2000', depIcao: 'DTTA', depCode: 'TUN',
      arrIcao: 'HECA', arrCode: 'CAI', routeLabel: 'TUN → CAI', baseIcao: 'DTTA',
      std: '2026-09-21T08:00:00Z', etd: '2026-09-21T08:00:00Z', atd: null, sta: '2026-09-21T11:00:00Z',
      eta: '2026-09-21T11:00:00Z', ata: null, ctot: null, servicesReadiness: 'PENDING', servicesConfirmed: 2,
      servicesTotal: 8, permitsOutstanding: 0, crewAssigned: true, crewSeatsFilled: 2, crewMinimumSeats: 2,
      crewFtlStatus: 'OK', crewDocumentStatus: 'VALID', status: 'PLANNED', statusTone: 'SCHEDULED', attention: false,
      melBlocking: false, delayMinutes: 0, note: null, depName: 'Tunis', depCity: 'Tunis', depCountry: 'TN',
      arrName: 'Cairo', arrCity: 'Cairo', arrCountry: 'EG', flightType: 'PAX', commercialType: 'NON_SCHEDULED',
      flightPlanLetter: 'N', paxCount: 4, riskIndex: 0, riskTop: null, riskAction: null, mvtSentAt: null,
    }} onClose={() => {}} />)
    const hours = q('.atd-row .tnp-time-h')
    const mins = q('.atd-row .tnp-time-m')
    fireEvent.change(hours, { target: { value: '08' } })
    fireEvent.change(mins, { target: { value: '22' } })
    fireEvent.blur(mins)
    // en retard : rien ne part tant que la cause manque
    expect(posted).toHaveLength(0)
    const select = await screen.findByLabelText('Delay cause')
    await waitFor(() => expect(select.options).toHaveLength(3))
    expect(select).toHaveClass('tnp-delay-cause')
    fireEvent.change(select, { target: { value: '71' } })
    await waitFor(() => expect(posted.length).toBeGreaterThan(0))
    expect(posted[0].body).toEqual({ kind: 'OUT', at: '2026-09-21T08:22:00.000Z', delayMinutes: 22, delayCode: '71' })
  })

  test('une ATD à l’heure ne demande rien et part sans retard', async () => {
    renderWithProviders(<OffBlockModal row={row()} onClose={() => {}} />)
    fireEvent.change(q('input[type="time"]'), { target: { value: '07:58' } })
    expect(screen.queryByLabelText('Delay cause')).toBeNull()
    fireEvent.click(screen.getByText('Log ATD and send'))
    await waitFor(() => expect(posted.length).toBeGreaterThan(0))
    expect(posted[0].body).toEqual({ kind: 'OUT', at: '2026-09-21T07:58:00.000Z' })
  })
})
