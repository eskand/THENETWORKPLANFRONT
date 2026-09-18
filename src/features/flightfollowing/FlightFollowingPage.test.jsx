import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'

/**
 * Flight Following — référence NETPLUS_FLIGHT_FOLLOWING (module v226.174) :
 * cadre `flight-following/index.html` l. 21-206, tiroirs
 * `js/07-tnp-fwui-map-first-layout-flight-list-and-detail.js` l. 20-121,
 * feuille `css/04-flight-following-module-stylesheet-scoped-to-vie.css`
 * l. 1-231 et 286-579, bouton LIVE `js/09` l. 175-186, bouton ERP `js/10`
 * l. 139-148, horloge `js/06` l. 546-552.
 *
 * Le client HTTP est remplacé : une URL connue de `routes` répond tout de
 * suite, toute autre reste en attente. La carte Leaflet est remplacée par un
 * nœud vide — jsdom n'a ni taille ni ResizeObserver.
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

vi.mock('./components/FlightWatchMap', () => ({
  default: () => <div data-testid="leaflet-stub" />,
}))

// eslint-disable-next-line import/first
import FlightFollowingPage from './FlightFollowingPage'

function flight(overrides = {}) {
  return {
    legId: 'l1', flightNo: 'TNP101', registration: 'TS-NPA', icaoType: 'F2TH', model: 'Falcon 2000LX',
    operator: 'TNP', depIcao: 'DTTA', arrIcao: 'LFMN',
    std: '2026-09-18T06:00:00Z', sta: '2026-09-18T08:15:00Z',
    status: 'DEPARTED', flightLevel: 390, minutesToDestination: 45,
    tracking: 'NO_SOURCE', lastPosition: null, melReference: null, melBlocking: false,
    risk: { level: 'LOW', index: 2, severity: 1, likelihood: 2, factors: [], action: 'Routine watch.' },
    ...overrides,
  }
}

function board(flights = [flight()]) {
  return {
    date: '2026-09-18', airborne: flights, upcoming: [], arrived: [],
    riskLow: flights.length, riskMedium: 0, riskHigh: 0, riskCritical: 0,
    withoutSource: flights.length, trackedStale: 0, staleThresholdMinutes: 15,
    adsb: { provider: 'OpenSky', state: 'NOT_RUN' },
  }
}

async function open(data = board()) {
  routes['/flight-following/board'] = data
  const utils = renderWithProviders(<FlightFollowingPage />)
  await waitFor(() => expect(document.querySelector('#viewFlightFollowing #app')).not.toBeNull())
  return utils
}

beforeEach(() => {
  for (const key of Object.keys(routes)) delete routes[key]
})

const q = (selector) => document.querySelector(selector)
const qa = (selector) => [...document.querySelectorAll(selector)]

describe('F01a — le cadre « la carte d’abord » (index.html l. 43-206, js/07 l. 20-121)', () => {
  test('la vue porte #app, la carte et deux tiroirs fermés, avec leurs en-têtes et leurs croix', async () => {
    await open()
    expect(q('#viewFlightFollowing #app #mapwrap')).not.toBeNull()

    const left = q('#viewFlightFollowing #left')
    const right = q('#viewFlightFollowing #right')
    expect(left).toHaveAttribute('aria-hidden', 'true')
    expect(right).toHaveAttribute('aria-hidden', 'true')
    expect(left).not.toHaveClass('fw-open')
    expect(right).not.toHaveClass('fw-open')

    expect(left.querySelector('.fw-head h3')).toHaveTextContent('FLIGHT LIST')
    expect(right.querySelector('.fw-head h3')).toHaveTextContent('FLIGHT DETAIL')
    expect(left.querySelector('#fwListClose.fw-x')).toHaveAttribute('aria-label', 'Close the flight list')
    expect(right.querySelector('#fwDetailClose.fw-x')).toHaveAttribute('aria-label', 'Close the flight detail')
  })

  test('le corps porte la classe fw-topbar tant que la vue est montée (js/07 l. 78, js/12 l. 6)', async () => {
    const { unmount } = await open()
    expect(document.body).toHaveClass('fw-topbar')
    unmount()
    expect(document.body).not.toHaveClass('fw-topbar')
  })

  test('FLIGHT LIST ouvre et ferme le tiroir gauche ; la croix le referme (js/07 l. 41-52, 96-100)', async () => {
    await open()
    const btn = q('#fwListBtn')
    fireEvent.click(btn)
    expect(q('#left')).toHaveClass('fw-open')
    expect(q('#left')).toHaveAttribute('aria-hidden', 'false')
    expect(btn).toHaveClass('on')
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(btn).toHaveAttribute('title', 'Hide the active flight list')

    fireEvent.click(btn)
    expect(q('#left')).not.toHaveClass('fw-open')
    expect(btn).not.toHaveClass('on')
    expect(btn).toHaveAttribute('title', 'Show the active flight list')

    fireEvent.click(btn)
    fireEvent.click(q('#fwListClose'))
    expect(q('#left')).not.toHaveClass('fw-open')
  })

  test('choisir un vol ouvre le détail et décale les commandes ; Échap referme le détail puis la liste (js/07 l. 26-36, 62-72)', async () => {
    await open()
    fireEvent.click(q('#fwListBtn'))
    fireEvent.click(screen.getByText('TNP101'))
    expect(q('#right')).toHaveClass('fw-open')
    expect(q('#right')).toHaveAttribute('aria-hidden', 'false')
    expect(q('#app')).toHaveClass('fw-right-open')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(q('#right')).not.toHaveClass('fw-open')
    expect(q('#app')).not.toHaveClass('fw-right-open')
    expect(q('#left')).toHaveClass('fw-open')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(q('#left')).not.toHaveClass('fw-open')
  })
})

describe('F01a — les commandes du bandeau (#fwTopHost, index.html l. 30-39, js/09 l. 175-186, js/10 l. 139-148)', () => {
  test('le bandeau du produit porte #fwTopHost : LIVE, ACTIVATE ERP, FLIGHT LIST, horloge UTC', async () => {
    await open()
    const host = q('.topbar .topbar-right #fwTopHost')
    expect(host).toHaveAttribute('aria-label', 'Flight Watch controls')

    const live = host.querySelector('#fw-live-btn')
    expect(live).toHaveAttribute('title', 'Live ADS-B traffic (OpenSky)')
    expect(live).toHaveTextContent('📡 LIVE')
    expect(live).not.toHaveClass('on')

    const erp = host.querySelector('#fw-erp-btn')
    expect(erp).toHaveTextContent('⚠ ACTIVATE ERP')
    expect(live.nextElementSibling).toBe(erp)

    const list = host.querySelector('#fwListBtn.fw-listbtn')
    expect(list).toHaveTextContent('FLIGHT LIST')
    expect(list).toHaveAttribute('aria-pressed', 'false')
    expect(list.querySelector('svg')).not.toBeNull()

    const clock = host.querySelector('#utcclock')
    expect(clock.textContent).toMatch(/^\d\d:\d\d:\d\dUTC$/)
    expect(clock.querySelector('small')).toHaveTextContent('UTC')
  })

  test('LIVE s’allume et se dit « 📡 LIVE ● » (js/09 l. 177-182)', async () => {
    await open()
    const live = q('#fw-live-btn')
    fireEvent.click(live)
    expect(live).toHaveClass('on')
    expect(live).toHaveTextContent('📡 LIVE ●')
    fireEvent.click(live)
    expect(live).not.toHaveClass('on')
    expect(live).toHaveTextContent('📡 LIVE')
  })
})

describe('F01a — les commandes posées sur la carte (index.html l. 97-179, js/06 l. 271-311)', () => {
  test('#fwMapCtl porte la recherche, LAYERS et son menu de sept calques ; #basemap-switch trois fonds', async () => {
    await open()
    const ctl = q('#mapwrap #fwMapCtl')
    expect(ctl.querySelector('#searchbox')).toHaveAttribute('placeholder', '⌕ ICAO / CALLSIGN / OP')
    expect(ctl.querySelector('.layers-wrap #layers-btn.layers-btn')).toHaveTextContent('LAYERS')
    expect(ctl.querySelector('#layerctl .lc-head')).toHaveTextContent('MAP LAYERS')
    expect(ctl.querySelectorAll('#layerctl .lc-item')).toHaveLength(7)
    expect(ctl.querySelector('#ly-flights')).toBeChecked()
    expect(ctl.querySelector('#ly-adsb')).toBeChecked()
    expect(ctl.querySelector('#ly-airports')).toBeChecked()
    expect(ctl.querySelector('#ly-fir')).not.toBeChecked()
    expect(ctl.querySelector('#ly-radar')).not.toBeChecked()
    expect(ctl.querySelector('#ly-ir')).not.toBeChecked()
    expect(ctl.querySelector('#ly-labels')).toBeChecked()
    expect(ctl.querySelector('#ly-adsb').closest('.lc-item')).toHaveTextContent('Live ADS-B traffic (OpenSky)')
    expect(ctl.querySelector('#ly-adsb').closest('label.switch .slider, .switch')).not.toBeNull()

    const bases = qa('#mapwrap #basemap-switch button')
    expect(bases.map((b) => b.textContent)).toEqual(['SATELLITE', 'DARK OPS', 'STREET'])
    expect(bases[0]).toHaveClass('active')
    fireEvent.click(bases[1])
    expect(bases[1]).toHaveClass('active')
    expect(bases[0]).not.toHaveClass('active')

    expect(q('#mapwrap .map-note')).toHaveTextContent(
      'FIR/UIR boundaries: real ATC data, geometry simplified for display — verify against official AIP/eAIP for operational use.',
    )
  })

  test('LAYERS ouvre le menu ; Échap le referme sans toucher aux tiroirs (js/06 l. 299-311, js/07 l. 66-68)', async () => {
    await open()
    fireEvent.click(q('#fwListBtn'))
    fireEvent.click(q('#layers-btn'))
    expect(q('#layerctl')).toHaveClass('open')
    expect(q('#layers-btn')).toHaveClass('open')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(q('#layerctl')).not.toHaveClass('open')
    expect(q('#left')).toHaveClass('fw-open')
  })
})

describe('F01a — la feuille de style de la référence (css/04 l. 286-345, 537-559)', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles/flightwatch.css'), 'utf8')

  test('le cadre plein cadre, les tiroirs et les commandes du bandeau sont repris tels quels', () => {
    expect(css).toContain('body.fw-topbar #fwTopHost{ display:flex; }')
    expect(css).toContain(
      '#viewFlightFollowing #app{\n    grid-template-rows:1fr; grid-template-columns:1fr; position:relative;\n  }',
    )
    expect(css).toContain(
      '#viewFlightFollowing #left,\n#viewFlightFollowing #right{\n    position:absolute; top:0; bottom:0; width:320px; z-index:1100;',
    )
    expect(css).toContain('#viewFlightFollowing #left{ left:0; transform:translateX(-102%); }')
    expect(css).toContain('#viewFlightFollowing #app.fw-right-open #mapwrap #fwMapCtl{ right:332px; }')
    expect(css).toContain('#fwTopHost .fw-listbtn.on{ background:var(--gold); border-color:var(--gold); color:var(--navy); font-weight:700; }')
    expect(css).toContain('#fwTopHost #utcclock small{ color:var(--txt-dim); font-size:9px; display:block; letter-spacing:2px; margin-top:1px; }')
    expect(css).toContain('#viewFlightFollowing .fw-x{')
  })

  test('la barre propre à la cible a disparu', () => {
    expect(css).not.toContain('.fw__bar')
    expect(css).not.toContain('.fw__layersmenu')
  })
})
