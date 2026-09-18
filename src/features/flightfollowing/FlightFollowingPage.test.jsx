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
  // Le cadre se rend avant la réponse (la référence s'ouvre sur la carte seule) :
  // on attend que le tableau soit lu, c'est-à-dire la première carte de vol.
  await waitFor(() => expect(document.querySelector('#viewFlightFollowing #app')).not.toBeNull())
  await waitFor(() => expect(document.querySelector('#flightlist .fcard, .fwl__card')).not.toBeNull())
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

describe('F01b — le tiroir gauche (index.html l. 46-92, renderList js/06 l. 1114-1160, updateDashboard l. 557-566)', () => {
  test('#sms-dashboard : titre, bandeau d’alertes caché sans alerte, quatre compteurs', async () => {
    await open()
    const dash = q('#left #sms-dashboard')
    expect(dash.querySelector('.dash-title')).toHaveTextContent('SMS PROACTIVE RISK OVERVIEW')
    expect(dash.querySelector('#fwAlertBanner')).not.toBeVisible()
    const cells = [...dash.querySelectorAll('.dash-grid .dash-cell')]
    expect(cells.map((c) => c.querySelector('.l').textContent)).toEqual(['Low', 'Medium', 'High', 'Critical'])
    expect(dash.querySelector('#cnt-low')).toHaveTextContent('1')
    expect(dash.querySelector('#cnt-medium')).toHaveTextContent('0')
    expect(dash.querySelector('#cnt-high')).toHaveTextContent('0')
    expect(dash.querySelector('#cnt-critical')).toHaveTextContent('0')
    expect(cells[3]).toHaveStyle({ borderColor: '#C0392B' })
    expect(dash.querySelector('#cnt-critical')).toHaveStyle({ color: '#C0392B' })
  })

  test('une alerte MEDIUM ou plus remplit #fwAlertBanner d’une ligne .fw-al qui sélectionne son vol', async () => {
    const high = flight({
      legId: 'l2', flightNo: 'TNP202', depIcao: 'DTTA', arrIcao: 'LFPB',
      risk: {
        level: 'HIGH', index: 12, severity: 4, likelihood: 3, action: 'Mitigation required.',
        factors: [{ factor: 'MEL', level: 'MAJOR', detail: 'MEL 21-51-01 open, category B' }],
      },
    })
    await open(board([flight(), high]))
    const banner = q('#fwAlertBanner')
    expect(banner).toBeVisible()
    const row = banner.querySelector('.fw-al')
    expect(row).toHaveAttribute('title', 'Open this flight and centre the map on it')
    expect(row.querySelector('.fw-al-txt b')).toHaveTextContent('TNP202')
    expect(row.querySelector('.fw-al-txt')).toHaveTextContent('(DTTA→LFPB) — HIGH RISK')
    fireEvent.click(row)
    expect(q('#right')).toHaveClass('fw-open')
    expect(q('#flightlist .fcard.selected .fcard-call')).toHaveTextContent('TNP202')
  })

  test('.sortbar : Sort: Risk actif par défaut, Sort: Callsign prend le relais (js/06 l. 1193-1204)', async () => {
    await open()
    const risk = q('#left .sortbar #sort-risk')
    const callsign = q('#left .sortbar #sort-callsign')
    expect(risk).toHaveTextContent('Sort: Risk')
    expect(callsign).toHaveTextContent('Sort: Callsign')
    expect(risk).toHaveClass('active')
    fireEvent.click(callsign)
    expect(callsign).toHaveClass('active')
    expect(risk).not.toHaveClass('active')
  })

  test('.panel-head ACTIVE FLIGHTS + #flightcount, puis #flightlist et ses .fcard', async () => {
    await open()
    expect(q('#left .panel-head h3')).toHaveTextContent('ACTIVE FLIGHTS')
    expect(q('#left .panel-head .count#flightcount')).toHaveTextContent('1')

    const card = q('#left #flightlist .fcard')
    expect(card).not.toHaveClass('selected')
    expect(card.querySelector('.fcard-top .fcard-call')).toHaveTextContent('TNP101')
    const chip = card.querySelector('.fcard-top .risk-chip')
    expect(chip).toHaveTextContent('LOW · 2')
    expect(chip).toHaveStyle({ color: '#27AE60', border: '1px solid #27AE60' })
    expect(chip).toHaveStyle({ background: '#27AE6022' })
    expect(card.querySelector('.fcard-route')).toHaveTextContent('DTTA → LFMN')
    expect([...card.querySelectorAll('.fcard-meta span')].map((s) => s.textContent)).toEqual([
      'FL390', '— KT', 'F2TH', 'TS-NPA',
    ])
    expect(card.querySelector('.fcard-op')).toHaveTextContent('TNP')

    fireEvent.click(card)
    expect(card).toHaveClass('selected')
    expect(q('#right')).toHaveClass('fw-open')
  })

  test('la légende suit la liste dans le tiroir (index.html l. 85-91) et les classes propres à la cible ont disparu', async () => {
    await open()
    expect(q('#left .legend-box .legend-row .dot')).not.toBeNull()
    expect(q('#left .fwr, #left .fwl, #left .fw__sorts, #left .fw__listhead')).toBeNull()
  })
})

describe('F11 — la pile d’alertes : texte, facteur dominant, mitigation, huit lignes (js/06 fwAlertList l. 1478-1487, FW_MITIG l. 568-574)', () => {
  test('chaque ligne dit « ⚠ FN — (A→B) — LEVEL RISK · <facteur>: <détail> — Mitigation: <consigne> »', async () => {
    const high = flight({
      legId: 'l2', flightNo: 'TNP202', depIcao: 'DTTA', arrIcao: 'LFPB',
      risk: {
        level: 'HIGH', index: 12, severity: 4, likelihood: 3, action: 'Mitigation required.',
        factors: [
          { factor: 'WEATHER', level: 'MINOR', detail: 'Alternate below minima' },
          { factor: 'MEL', level: 'MAJOR', detail: 'MEL 21-51-01 open, category B' },
        ],
      },
    })
    await open(board([flight(), high]))
    expect(q('#fwAlertBanner .fw-al .fw-al-txt')).toHaveTextContent(
      '⚠ TNP202 — (DTTA→LFPB) — HIGH RISK · Aircraft performance / MEL: MEL 21-51-01 open, category B — Mitigation: apply MEL (O)/(M) procedure, revalidate performance',
    )
  })

  test('les vols se classent par indice décroissant et la pile s’arrête à huit', async () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      flight({
        legId: `m${i}`, flightNo: `TNP${300 + i}`,
        risk: { level: 'MEDIUM', index: 5 + i, severity: 3, likelihood: 2, action: 'Monitor.', factors: [] },
      }),
    )
    await open(board(many))
    const rows = qa('#fwAlertBanner .fw-al')
    expect(rows).toHaveLength(8)
    expect(rows[0].querySelector('b')).toHaveTextContent('TNP309')
    expect(rows[0].querySelector('.fw-al-txt')).toHaveTextContent('(DTTA→LFMN) — MEDIUM RISK')
    expect(rows[0].textContent).not.toContain('Mitigation')
  })
})

describe('F03c — les tags des facteurs actifs sur les cartes (js/06 renderList l. 1135-1145)', () => {
  test('un facteur actif donne un .factor-tag en majuscules ; .warm dès la sévérité 2, .hot dès 4 ; rien sans facteur', async () => {
    const tagged = flight({
      legId: 'l2', flightNo: 'TNP202',
      risk: {
        level: 'HIGH', index: 12, severity: 4, likelihood: 3, action: 'Mitigation required.',
        factors: [
          { factor: 'WEATHER', level: 'NONE', detail: 'Above minima' },
          { factor: 'NOTAM', level: 'MINOR', detail: 'Minor' },
          { factor: 'FTL', level: 'UNKNOWN', detail: 'No roster read' },
          { factor: 'MEL', level: 'MAJOR', detail: 'Major MEL' },
          { factor: 'CREW', level: 'SEVERE', detail: 'Fatigue + qual. gap' },
        ],
      },
    })
    await open(board([flight(), tagged]))
    const cards = qa('#flightlist .fcard')
    const withTags = cards.find((c) => c.querySelector('.fcard-call').textContent === 'TNP202')
    const tags = [...withTags.querySelectorAll('.fcard-factors .factor-tag')]
    expect(tags.map((t) => t.textContent)).toEqual(['NOTAM', 'MEL', 'CREW'])
    expect(tags[0]).toHaveClass('warm')
    expect(tags[0]).not.toHaveClass('hot')
    expect(tags[1]).toHaveClass('hot')
    expect(tags[2]).toHaveClass('hot')
    const plain = cards.find((c) => c.querySelector('.fcard-call').textContent === 'TNP101')
    expect(plain.querySelector('.fcard-factors')).toBeNull()
  })
})

describe('F01c — le panneau de détail (renderDetailPane js/06 l. 1520-1610, fwOpsBlockHtml l. 1341-1370, fwAcBlockHtml l. 1400-1406, fwLinksHtml l. 1409-1417)', () => {
  const withMel = () =>
    flight({
      legId: 'l3', flightNo: 'TNP303', melReference: 'MEL 21-51-01', melBlocking: true,
      lastPosition: {
        latitude: 36.8, longitude: 10.2, altitudeFt: 39000, groundSpeedKt: 452, trackDeg: 312,
        reportedAt: '2026-09-18T07:00:00Z', ageMinutes: 3, provider: 'OPENSKY', automatic: true,
      },
      progressPercent: 60,
      risk: { level: 'HIGH', index: 12, severity: 4, likelihood: 3, action: 'Mitigation required.', factors: [] },
    })

  test('en-tête : indicatif, exploitant — type · immat, pastille « LEVEL · INDEX n » colorée', async () => {
    await open()
    fireEvent.click(q('#fwListBtn'))
    fireEvent.click(screen.getByText('TNP101'))
    const pane = q('#right #detailpane')
    expect(q('#right #emptystate')).not.toBeVisible()
    expect(pane.querySelector('.detail-head .detail-head-main .detail-call')).toHaveTextContent('TNP101')
    expect(pane.querySelector('.detail-head .detail-op')).toHaveTextContent('TNP — F2TH · TS-NPA')
    const badge = pane.querySelector('.detail-head .detail-badge#detail-risk-badge')
    expect(badge).toHaveTextContent('LOW · INDEX 2')
    expect(badge).toHaveStyle({ color: '#27AE60', border: '1px solid #27AE60' })
  })

  test('la grille : Route, Cruise level, Ground speed, Total distance, Heading, Progress', async () => {
    routes['/airports'] = {
      rows: [
        { icao: 'DTTA', name: 'Tunis Carthage', latitude: 36.851, longitude: 10.227 },
        { icao: 'LFMN', name: 'Nice Côte d’Azur', latitude: 43.658, longitude: 7.216 },
      ],
    }
    await open(board([withMel()]))
    fireEvent.click(q('#flightlist .fcard .fcard-call'))
    const items = qa('#detailpane .detail-grid .dg-item')
    expect(items.map((i) => i.querySelector('.dg-label').textContent)).toEqual([
      'Route', 'Cruise level', 'Ground speed', 'Total distance', 'Heading', 'Progress',
    ])
    expect(items[0].querySelector('.dg-val.small')).toHaveTextContent('DTTA – LFMN')
    expect(items[1].querySelector('.dg-val')).toHaveTextContent('FL390')
    expect(items[2].querySelector('.dg-val')).toHaveTextContent('452 KT')
    await waitFor(() => expect(items[3].querySelector('.dg-val')).toHaveTextContent(/^\d+ NM$/))
    expect(Number(items[3].querySelector('.dg-val').textContent.replace(' NM', ''))).toBeGreaterThan(430)
    expect(Number(items[3].querySelector('.dg-val').textContent.replace(' NM', ''))).toBeLessThan(470)
    expect(items[4].querySelector('.dg-val#dg-hdg')).toHaveTextContent('312°')
    expect(items[5].querySelector('.dg-val#dg-prog')).toHaveTextContent('60%')
    expect(q('#detailpane .progressbar .progressbar-fill#progressfill').style.width).toBe('60%')
  })

  test('TIMES · UTC : STD / ETD / STA / ETA / Block / Delay et le temps restant', async () => {
    await open(board([withMel()]))
    fireEvent.click(q('#flightlist .fcard .fcard-call'))
    const sects = qa('#detailpane .detail-sect')
    const times = sects.find((s) => s.querySelector('h4')?.textContent === 'TIMES · UTC')
    const cells = [...times.querySelectorAll('.fw-times > *')].map((c) => c.textContent)
    expect(cells).toEqual(['STD', '06:00Z', 'ETD', '06:00Z', 'STA', '08:15Z', 'ETA', '08:15Z', 'Block', '2h15', 'Delay', 'On schedule'])
    expect(times.querySelector('.fw-times .fw-ok')).toHaveTextContent('On schedule')
    expect(times.querySelector('.fw-eta')).toHaveTextContent('0h45 to run')
  })

  test('AIRCRAFT STATUS quand une MEL est ouverte, FLIGHT PROGRESS, DISPATCHER NOTES, OPEN THIS FLIGHT IN, FOLLOW', async () => {
    await open(board([withMel()]))
    fireEvent.click(q('#flightlist .fcard .fcard-call'))
    const titles = qa('#detailpane .detail-sect h4').map((h) => h.textContent)
    expect(titles).toEqual(['TIMES · UTC', 'AIRCRAFT STATUS', 'FLIGHT PROGRESS', 'DISPATCHER NOTES', 'OPEN THIS FLIGHT IN'])
    const ac = qa('#detailpane .detail-sect').find((s) => s.querySelector('h4').textContent === 'AIRCRAFT STATUS')
    expect(ac.querySelector('.route-line')).toHaveTextContent('Deferred defect MEL 21-51-01')
    expect(ac.querySelector('.route-line b')).toHaveTextContent('MEL 21-51-01')
    const links = qa('#detailpane .fw-links .fw-link').map((b) => b.textContent)
    expect(links).toEqual(['Flight label', 'Dispatch', 'Timeline', 'Tech Log', 'Roster'])
    const follow = q('#detailpane .followbtn#followbtn')
    expect(follow).toHaveTextContent('📍 FOLLOW THIS FLIGHT ON MAP')
    fireEvent.click(follow)
    expect(follow).toHaveTextContent('⏸ STOP FOLLOWING')
  })

  test('sans MEL : pas de bloc AIRCRAFT STATUS ni de lien Tech Log ; note « Routine flight — standard monitoring. »', async () => {
    await open()
    fireEvent.click(q('#fwListBtn'))
    fireEvent.click(screen.getByText('TNP101'))
    const titles = qa('#detailpane .detail-sect h4').map((h) => h.textContent)
    expect(titles).not.toContain('AIRCRAFT STATUS')
    expect(qa('#detailpane .fw-links .fw-link').map((b) => b.textContent)).toEqual(['Flight label', 'Dispatch', 'Timeline', 'Roster'])
    const notes = qa('#detailpane .detail-sect').find((s) => s.querySelector('h4').textContent === 'DISPATCHER NOTES')
    expect(notes.querySelector('.route-line')).toHaveTextContent('Routine flight — standard monitoring.')
    expect(q('#right .fwd')).toBeNull()
  })

  test('l’état vide de la référence (index.html l. 196-200)', async () => {
    await open()
    const empty = q('#right .empty-state#emptystate')
    expect(empty).toBeVisible()
    expect(empty.querySelector('.ico')).toHaveTextContent('✈')
    expect(empty.innerHTML.replace(/\s+/g, ' ').trim()).toBe(
      '<div class="ico">✈</div>Select a flight from the list<br>or click an aircraft on the map to view tracking details and run<br>the proactive SMS risk assessment.',
    )
  })
})

describe('F01d — la source et l’âge de la position, l’encart du trafic (fwRefreshFeedAge js/06 l. 763-780, fwSetAdsb l. 1731-1733)', () => {
  test('#fw-feed-age dit la source ; en ADS-B LIVE il porte l’âge du dernier balayage et sa classe', async () => {
    const data = board()
    data.adsb = { provider: 'OpenSky', state: 'LIVE', seen: 12, matched: 2, withoutModeS: [], ranAt: new Date(Date.now() - 30_000).toISOString() }
    await open(data)
    const feed = q('#mapwrap #fw-feed-age')
    expect(feed).toHaveClass('fw-feed', 'ok')
    expect(feed.querySelector('b')).toHaveTextContent('POSITION SOURCE')
    expect(feed).toHaveTextContent(/ADS-B \(OpenSky\) · last sweep \d+ s ago/)
    expect(feed.querySelector('b.age')).toHaveTextContent(/\d+ s ago/)
  })

  test('sans balayage ADS-B, #fw-feed-age reste neutre et invite à presser LIVE', async () => {
    await open()
    const feed = q('#mapwrap #fw-feed-age')
    expect(feed.className).toBe('fw-feed')
    expect(feed).toHaveTextContent('POSITION SOURCE')
    expect(feed).toHaveTextContent('Press LIVE for ADS-B traffic.')
  })

  test('LIVE allumé et trafic lu : #fw-adsb-status « ✈ ADS-B live: n traffic · ✈ m fleet »', async () => {
    routes['/flight-following/traffic'] = [
      { modeSHex: '3c6444', callsign: 'DLH4YA', latitude: 41.2, longitude: 9.1, altitudeFt: 37025, groundSpeedKt: 445, trackDeg: 95 },
    ]
    const data = board()
    data.adsb = { provider: 'OpenSky', state: 'LIVE', seen: 12, matched: 2, withoutModeS: [], ranAt: '2026-09-18T07:00:00Z' }
    await open(data)
    expect(q('#fw-adsb-status')).toBeNull()
    fireEvent.click(q('#fw-live-btn'))
    await waitFor(() => expect(q('#mapwrap #fw-adsb-status')).not.toBeNull())
    expect(q('#fw-adsb-status')).toHaveTextContent('✈ ADS-B live: 1 traffic · ✈ 2 fleet ·')
  })
})

describe('F04g — choisir un autre vol arrête le suivi (selectFlight js/06 l. 1229)', () => {
  test('FOLLOW allumé puis clic sur un autre vol : le bouton redit « FOLLOW THIS FLIGHT ON MAP »', async () => {
    await open(board([flight(), flight({ legId: 'l2', flightNo: 'TNP202' })]))
    fireEvent.click(q('#fwListBtn'))
    fireEvent.click(qa('#flightlist .fcard .fcard-call')[0])
    fireEvent.click(q('#followbtn'))
    expect(q('#followbtn')).toHaveTextContent('⏸ STOP FOLLOWING')
    fireEvent.click(qa('#flightlist .fcard .fcard-call')[1])
    expect(q('#followbtn')).toHaveTextContent('📍 FOLLOW THIS FLIGHT ON MAP')
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
