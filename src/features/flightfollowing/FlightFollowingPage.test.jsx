import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
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
  default: () => <div id="map" data-testid="leaflet-stub" />,
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
  const withMel = (extra = {}) =>
    flight({
      legId: 'l3', flightNo: 'TNP303', melReference: 'MEL 21-51-01', melBlocking: true,
      lastPosition: {
        latitude: 36.8, longitude: 10.2, altitudeFt: 39000, groundSpeedKt: 452, trackDeg: 312,
        reportedAt: '2026-09-18T07:00:00Z', ageMinutes: 3, provider: 'OPENSKY', automatic: true,
      },
      progressPercent: 60,
      risk: { level: 'HIGH', index: 12, severity: 4, likelihood: 3, action: 'Mitigation required.', factors: [] },
      ...extra,
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

  test('TIMES · UTC : STD / ETD / STA / ETA / Block / Delay et le temps restant (eta − maintenant, fwTimes l. 1296-1310)', async () => {
    const std = new Date(Date.now() - 90 * 60000)
    const sta = new Date(std.getTime() + 135 * 60000)
    const z = (d) => d.toISOString().slice(11, 16) + 'Z'
    await open(board([withMel({ std: std.toISOString(), sta: sta.toISOString() })]))
    fireEvent.click(q('#flightlist .fcard .fcard-call'))
    const sects = qa('#detailpane .detail-sect')
    const times = sects.find((s) => s.querySelector('h4')?.textContent === 'TIMES · UTC')
    const cells = [...times.querySelectorAll('.fw-times > *')].map((c) => c.textContent)
    expect(cells).toEqual(['STD', z(std), 'ETD', z(std), 'STA', z(sta), 'ETA', z(sta), 'Block', '2h15', 'Delay', 'On schedule'])
    expect(times.querySelector('.fw-times .fw-ok')).toHaveTextContent('On schedule')
    expect(times.querySelector('.fw-eta').textContent).toMatch(/^0h4[456] to run$/)
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

describe('F03a — les filtres de la liste (index.html l. 66-82, js/06 l. 660-745, compteur l. 1131-1133)', () => {
  const fleet = () => [
    flight({ legId: 'a', flightNo: 'TNP101', icaoType: 'F2TH', model: 'Falcon 2000LX', operator: 'TNP', status: 'DEPARTED' }),
    flight({ legId: 'b', flightNo: 'TNP202', icaoType: 'C25B', model: 'Citation CJ3', operator: 'TNP', status: 'PLANNED',
      risk: { level: 'HIGH', index: 12, severity: 4, likelihood: 3, action: '', factors: [] } }),
    flight({ legId: 'c', flightNo: 'XYZ303', icaoType: 'E35L', model: 'Legacy 650', operator: 'PARTNER AIR', status: 'ARRIVED',
      risk: { level: 'MEDIUM', index: 6, severity: 3, likelihood: 2, action: '', factors: [] } }),
  ]

  test('.fw-filters : Fleet (familles déduites), Phase, Risk, Operator (visible dès deux exploitants), Clear', async () => {
    await open(board(fleet()))
    const box = q('#left .fw-filters')
    const fleetSel = box.querySelector('select#fwFleet')
    expect([...fleetSel.options].map((o) => o.textContent)).toEqual(['Fleet: All', 'Fleet: Citation', 'Fleet: Falcon', 'Fleet: Legacy'])
    expect([...fleetSel.options].map((o) => o.value)).toEqual(['ALL', 'CITATION', 'FALCON', 'LEGACY'])
    expect(fleetSel).toHaveAttribute('title', 'Filter by fleet')
    const phase = box.querySelector('select#fwPhase')
    expect([...phase.options].map((o) => o.textContent)).toEqual(['Phase: All', 'Airborne', 'On ground', 'Diverting'])
    expect([...phase.options].map((o) => o.value)).toEqual(['ALL', 'air', 'ground', 'divert'])
    const risk = box.querySelector('select#fwRisk')
    expect([...risk.options].map((o) => o.textContent)).toEqual(['Risk: All', 'Risk: Medium +', 'Risk: High +', 'Risk: Critical'])
    const op = box.querySelector('select#fwOp')
    expect(op).toBeVisible()
    expect([...op.options].map((o) => o.textContent)).toEqual(['Operator: All', 'Operator: PARTNER AIR', 'Operator: TNP'])
    expect(box.querySelector('button#fwClear')).toHaveTextContent('Clear')
    expect(box.querySelector('button#fwClear')).toHaveAttribute('title', 'Clear every filter')
  })

  test('un seul exploitant : le filtre Operator est caché (js/06 l. 727-736)', async () => {
    await open()
    expect(q('#left .fw-filters select#fwOp')).not.toBeVisible()
  })

  test('filtrer retranche et le compteur dit « n / total » ; Clear remet tout', async () => {
    await open(board(fleet()))
    expect(q('#flightcount')).toHaveTextContent('3')
    fireEvent.change(q('#fwRisk'), { target: { value: 'MEDIUM' } })
    expect(qa('#flightlist .fcard .fcard-call').map((c) => c.textContent)).toEqual(['TNP202', 'XYZ303'])
    expect(q('#flightcount')).toHaveTextContent('2 / 3')
    fireEvent.change(q('#fwPhase'), { target: { value: 'air' } })
    expect(qa('#flightlist .fcard')).toHaveLength(0)
    expect(q('#flightcount')).toHaveTextContent('0 / 3')
    fireEvent.change(q('#fwPhase'), { target: { value: 'ALL' } })
    fireEvent.change(q('#fwRisk'), { target: { value: 'ALL' } })
    fireEvent.change(q('#fwFleet'), { target: { value: 'FALCON' } })
    expect(qa('#flightlist .fcard .fcard-call').map((c) => c.textContent)).toEqual(['TNP101'])
    fireEvent.change(q('#fwOp'), { target: { value: 'PARTNER AIR' } })
    expect(qa('#flightlist .fcard')).toHaveLength(0)
    fireEvent.click(q('#fwClear'))
    expect(q('#fwFleet').value).toBe('ALL')
    expect(q('#fwOp').value).toBe('ALL')
    expect(q('#flightcount')).toHaveTextContent('3')
    expect(qa('#flightlist .fcard')).toHaveLength(3)
  })

  test('la recherche cherche d’abord (indicatif, exploitant, escales), les filtres retranchent ensuite (js/06 l. 1118-1125)', async () => {
    await open(board(fleet()))
    fireEvent.change(q('#searchbox'), { target: { value: 'partner' } })
    expect(qa('#flightlist .fcard .fcard-call').map((c) => c.textContent)).toEqual(['XYZ303'])
    fireEvent.change(q('#searchbox'), { target: { value: 'LFMN' } })
    expect(qa('#flightlist .fcard')).toHaveLength(3)
    fireEvent.change(q('#fwRisk'), { target: { value: 'HIGH' } })
    expect(qa('#flightlist .fcard .fcard-call').map((c) => c.textContent)).toEqual(['TNP202'])
  })
})

describe('F19 — radar météo : curseur d’opacité et commande d’animation (index.html l. 136-139, 184-187 ; js/06 l. 1637-1691)', () => {
  const rainviewer = {
    host: 'https://tilecache.rainviewer.com',
    radar: { past: [{ time: 1758178800, path: '/v2/radar/1758178800' }, { time: 1758179400, path: '/v2/radar/1758179400' }] },
    satellite: { infrared: [{ time: 1758179400, path: '/v2/satellite/abc' }] },
  }
  let realFetch
  beforeEach(() => {
    realFetch = globalThis.fetch
    globalThis.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(rainviewer) }))
  })
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  test('allumer le radar montre #radar-opacity-wrap (70 %) et #wx-anim-ctl.show avec « LIVE »', async () => {
    await open()
    const wrap = q('#layerctl .lc-sub#radar-opacity-wrap')
    expect(wrap).not.toBeVisible()
    expect(q('#mapwrap #wx-anim-ctl')).not.toHaveClass('show')
    fireEvent.click(q('#ly-radar'))
    expect(wrap).toBeVisible()
    expect(wrap.querySelector('.lc-sub-label')).toHaveTextContent('Radar opacity')
    expect(wrap.querySelector('#radar-op-val')).toHaveTextContent('70%')
    const slider = wrap.querySelector('input#radar-opacity[type="range"]')
    expect(slider).toHaveAttribute('min', '10')
    expect(slider).toHaveAttribute('max', '100')
    expect(slider.value).toBe('70')
    fireEvent.input(slider, { target: { value: '55' } })
    expect(wrap.querySelector('#radar-op-val')).toHaveTextContent('55%')
    expect(q('#mapwrap #wx-anim-ctl')).toHaveClass('show')
    expect(q('#wx-anim-ctl #wx-play')).toHaveTextContent('▶')
    expect(q('#wx-anim-ctl .wxtime#wx-time')).toHaveTextContent('LIVE')
  })

  test('▶ fait défiler les trames toutes les 600 ms et écrit leur heure ; ⏸ arrête', async () => {
    await open()
    fireEvent.click(q('#ly-radar'))
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 0))
    fireEvent.click(q('#wx-play'))
    expect(q('#wx-play')).toHaveTextContent('⏸')
    await waitFor(() => expect(q('#wx-time').textContent).toMatch(/^\d\d:\d\dZ$/), { timeout: 1500 })
    fireEvent.click(q('#wx-play'))
    expect(q('#wx-play')).toHaveTextContent('▶')
  })
})

describe('F09a — les commandes de veille et la vue TABLE (index.html l. 154-166, js/06 fwTableHtml l. 1066-1115)', () => {
  const stdA = new Date(Date.now() - 90 * 60000)
  const staA = new Date(stdA.getTime() + 135 * 60000)
  const zz = (d) => d.toISOString().slice(11, 16) + 'Z'
  const trio = () => [
    flight({ legId: 'a', flightNo: 'TNP101', status: 'DEPARTED', std: stdA.toISOString(), sta: staA.toISOString() }),
    flight({ legId: 'b', flightNo: 'TNP202', registration: 'TS-NPB', status: 'PLANNED', sta: '2099-01-01T08:15:00Z', std: '2099-01-01T06:00:00Z',
      melReference: 'MEL 21-51-01', melBlocking: true,
      risk: { level: 'HIGH', index: 12, severity: 4, likelihood: 3, action: '', factors: [] } }),
    flight({ legId: 'c', flightNo: 'TNP303', status: 'ARRIVED', etaRevised: '2026-09-18T08:27:00Z',
      risk: { level: 'MEDIUM', index: 6, severity: 3, likelihood: 2, action: '', factors: [] } }),
  ]

  test('#fw-watch-ctl : REPLAY, TABLE, WATCH REPORT ; #fw-table fermé avec son en-tête', async () => {
    await open()
    const ctl = q('#mapwrap #fw-watch-ctl')
    const buttons = [...ctl.querySelectorAll('button')]
    expect(buttons.map((b) => b.id)).toEqual(['fw-replay-btn', 'fw-table-btn', 'fw-report-btn'])
    expect(buttons[0]).toHaveTextContent('⏰ REPLAY')
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false')
    expect(buttons[0]).toHaveAttribute('title', 'Replay the track kept for this watch')
    expect(buttons[1]).toHaveTextContent('☰ TABLE')
    expect(buttons[1]).toHaveAttribute('title', 'See the watched flights as a table instead of the map')
    expect(buttons[2]).toHaveTextContent('📋 WATCH REPORT')
    expect(buttons[2]).toHaveAttribute('title', 'Flight watch report — flights, times, delays, risk and the alerts acknowledged')
    const table = q('#mapwrap #fw-table')
    expect(table).not.toHaveClass('on')
    expect(table.querySelector('.fw-tab-head b')).toHaveTextContent('WATCHED FLIGHTS')
    expect(table.querySelector('.fw-tab-head button')).toHaveAttribute('title', 'Back to the map')
  })

  test('TABLE ouvre la table : dix colonnes, tri par risque puis indice, cellules de la référence', async () => {
    await open(board(trio()))
    fireEvent.click(q('#fw-table-btn'))
    expect(q('#fw-table')).toHaveClass('on')
    expect(q('#fw-table-btn')).toHaveClass('on')
    expect(q('#fw-table-btn')).toHaveAttribute('aria-pressed', 'true')
    const heads = qa('#fw-table .fw-tab-body table.fw-tab-t thead th').map((th) => th.textContent)
    expect(heads).toEqual(['Flight', 'Route', 'Reg', 'Phase', 'ETD/ATD', 'ETA/ATA', 'Delay', 'To run', 'Risk', 'MEL'])
    const rows = qa('#fw-table .fw-tab-t tbody tr')
    expect(rows.map((r) => r.querySelector('td b').textContent)).toEqual(['TNP202', 'TNP303', 'TNP101'])
    const cells = (i) => [...rows[i].querySelectorAll('td')].map((td) => td.textContent)
    expect(cells(2).slice(0, 7)).toEqual(['TNP101', 'DTTA → LFMN', 'TS-NPA', 'Airborne', zz(stdA), zz(staA), 'on time'])
    expect(cells(2)[7]).toMatch(/^0h4[456]$/)
    expect(cells(2).slice(8)).toEqual(['LOW', '—'])
    expect(cells(0)).toEqual(['TNP202', 'DTTA → LFMN', 'TS-NPB', 'Not departed', '06:00Z', '08:15Z', 'on time', 'not departed', 'HIGH', 'MEL 21-51-01'])
    expect(cells(1)).toEqual(['TNP303', 'DTTA → LFMN', 'TS-NPA', 'Landed', '06:00Z', '08:27Z', '+12 min', 'landed', 'MEDIUM', '—'])
    expect(rows[0].querySelector('td:nth-child(9) span')).toHaveStyle({ color: '#E67E22' })
  })

  test('les filtres retranchent la table, la ligne vide dit « No flight matches the current filters. » ; une ligne cliquée ouvre le détail ; × referme', async () => {
    await open(board(trio()))
    fireEvent.click(q('#fw-table-btn'))
    fireEvent.change(q('#fwRisk'), { target: { value: 'CRITICAL' } })
    expect(qa('#fw-table .fw-tab-t tbody tr')).toHaveLength(1)
    expect(q('#fw-table .fw-tab-t tbody td')).toHaveAttribute('colspan', '10')
    expect(q('#fw-table .fw-tab-t tbody td')).toHaveTextContent('No flight matches the current filters.')
    fireEvent.change(q('#fwRisk'), { target: { value: 'ALL' } })
    fireEvent.click(qa('#fw-table .fw-tab-t tbody tr')[0])
    expect(q('#right')).toHaveClass('fw-open')
    expect(q('#detailpane .detail-call')).toHaveTextContent('TNP202')
    fireEvent.click(q('#fw-table .fw-tab-head button'))
    expect(q('#fw-table')).not.toHaveClass('on')
    expect(q('#fw-table-btn')).not.toHaveClass('on')
  })
})

describe('F09b — le WATCH REPORT (js/06 fwRapportHtml l. 877-914, fwOpenReport l. 915-939)', () => {
  const pair = () => [
    flight({ legId: 'b', flightNo: 'TNP202', registration: 'TS-NPB', status: 'PLANNED',
      risk: { level: 'HIGH', index: 12, severity: 4, likelihood: 3, action: '', factors: [] } }),
    flight({ legId: 'a', flightNo: 'TNP101', status: 'DEPARTED', etaRevised: '2026-09-18T08:27:00Z' }),
  ]

  test('WATCH REPORT ouvre #fw-report-ov : barre Copy as text / Close, titre, sous-titre, deux tables, note', async () => {
    await open(board(pair()))
    expect(q('#viewFlightFollowing #fw-report-ov')).toBeNull()
    fireEvent.click(q('#fw-report-btn'))
    const ov = q('#viewFlightFollowing #fw-report-ov')
    expect(ov).toHaveClass('on')
    const bar = ov.querySelector('.fw-rep-box .fw-rep-bar')
    expect([...bar.querySelectorAll('button')].map((b) => b.id + ':' + b.textContent)).toEqual(['fw-rep-copy:Copy as text', 'fw-rep-close:Close'])
    const rep = ov.querySelector('.fw-rep-body .fw-rep')
    expect(rep.querySelector('h3')).toHaveTextContent('FLIGHT WATCH REPORT')
    expect(rep.querySelector('.fw-rep-sub').textContent).toMatch(/^issued \d\d:\d\dZ · \d\d [A-Z][a-z]{2} \d{4} · 2 flight\(s\) watched$/)
    expect([...rep.querySelectorAll('h4')].map((h) => h.textContent)).toEqual(['FLIGHTS WATCHED', 'ALERTS ACKNOWLEDGED'])

    const tables = rep.querySelectorAll('table.fw-rep-t')
    expect([...tables[0].querySelectorAll('thead th')].map((th) => th.textContent)).toEqual(['Flight', 'Route', 'Reg', 'ETD/ATD', 'ETA/ATA', 'Delay', 'Risk', 'Track pts'])
    const rows = [...tables[0].querySelectorAll('tbody tr')]
    expect(rows.map((r) => r.querySelector('td b').textContent)).toEqual(['TNP101', 'TNP202'])
    expect([...rows[0].querySelectorAll('td')].map((td) => td.textContent)).toEqual(['TNP101', 'DTTA → LFMN', 'TS-NPA', '06:00Z', '08:27Z', '+12 min', 'LOW · 2', '—'])
    expect(rows[1].querySelector('td:nth-child(7) span')).toHaveStyle({ color: '#E67E22' })
    expect([...tables[1].querySelectorAll('thead th')].map((th) => th.textContent)).toEqual(['Flight', 'Kind', 'Level', 'Alert', 'By', 'At'])
    const alertCell = tables[1].querySelector('tbody td')
    expect(alertCell).toHaveAttribute('colspan', '6')
    expect(alertCell).toHaveTextContent('No alert acknowledged during this watch.')
    expect(rep.querySelector('.fw-rep-note')).toHaveTextContent('Times are read from the operational schedule (STD/STA, OCC delays, ATD/ATA when logged).')
  })

  test('Close referme, un clic sur le voile aussi ; Copy as text écrit le rapport dans le presse-papiers et dit « Copied »', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await open(board(pair()))
    fireEvent.click(q('#fw-report-btn'))
    fireEvent.click(q('#fw-rep-copy'))
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toContain('FLIGHT WATCH REPORT')
    expect(q('#fw-rep-copy')).toHaveTextContent('Copied')
    fireEvent.click(q('#fw-rep-close'))
    expect(q('#fw-report-ov')).not.toHaveClass('on')
    fireEvent.click(q('#fw-report-btn'))
    expect(q('#fw-report-ov')).toHaveClass('on')
    fireEvent.click(q('#fw-report-ov'))
    expect(q('#fw-report-ov')).not.toHaveClass('on')
  })
})

describe('F09c — le REPLAY sur la trace reçue (index.html l. 167-173 ; js/06 fwReplayToggle l. 855-873, fwReplaySeek l. 845-854 ; trace = GET /flight-following/legs/{id}/track)', () => {
  const tracked = () =>
    flight({
      lastPosition: { latitude: 40.1, longitude: 8.9, trackDeg: 312, groundSpeedKt: 450, altitudeFt: 39000, reportedAt: '2026-09-18T07:30:00Z', ageMinutes: 1, provider: 'OPENSKY', automatic: true },
    })
  const track = [
    { reportedAt: '2026-09-18T07:00:00Z', latitude: 37.0, longitude: 10.0, trackDeg: 300, altitudeFt: 20000 },
    { reportedAt: '2026-09-18T07:10:00Z', latitude: 38.0, longitude: 9.7, trackDeg: 305, altitudeFt: 39000 },
    { reportedAt: '2026-09-18T07:20:00Z', latitude: 39.0, longitude: 9.3, trackDeg: 310, altitudeFt: 39000 },
    { reportedAt: '2026-09-18T07:30:00Z', latitude: 40.1, longitude: 8.9, trackDeg: 312, altitudeFt: 39000 },
  ]

  test('#fw-replay fermé au départ ; sans trace, REPLAY dit « Nothing recorded yet — the track builds up as the watch runs. »', async () => {
    routes['/flight-following/legs/l1/track'] = []
    await open(board([tracked()]))
    const box = q('#mapwrap #fw-replay')
    expect(box).not.toHaveClass('on')
    expect(box.querySelector('.fw-rp-l')).toHaveTextContent('Replay')
    const slider = box.querySelector('input#fw-replay-sl[type="range"]')
    expect(slider).toHaveAttribute('min', '0')
    expect(slider).toHaveAttribute('max', '100')
    expect(slider.value).toBe('100')
    expect(slider).toHaveAttribute('title', 'Move back through the track kept for this watch')
    expect(box.querySelector('.fw-rp-at#fw-replay-at')).toHaveTextContent('now')
    fireEvent.click(q('#fw-replay-btn'))
    await waitFor(() => expect(box).toHaveClass('on'))
    expect(box.querySelector('.fw-rp-msg')).toHaveTextContent('Nothing recorded yet — the track builds up as the watch runs.')
    expect(q('#fw-replay-btn')).not.toHaveClass('on')
  })

  test('avec une trace : REPLAY s’allume, le curseur remonte le temps et l’étiquette dit « −n min » ; un second clic rend la main', async () => {
    routes['/flight-following/legs/l1/track'] = track
    await open(board([tracked()]))
    fireEvent.click(q('#fw-replay-btn'))
    await waitFor(() => expect(q('#fw-replay-btn')).toHaveClass('on'))
    expect(q('#fw-replay-btn')).toHaveAttribute('aria-pressed', 'true')
    expect(q('#fw-replay')).toHaveClass('on')
    expect(q('#fw-replay .fw-rp-msg')).toHaveTextContent('')
    expect(q('#fw-replay-at')).toHaveTextContent('now')
    fireEvent.input(q('#fw-replay-sl'), { target: { value: '0' } })
    expect(q('#fw-replay-at')).toHaveTextContent('−30 min')
    fireEvent.input(q('#fw-replay-sl'), { target: { value: '50' } })
    expect(q('#fw-replay-at')).toHaveTextContent('−15 min')
    fireEvent.click(q('#fw-replay-btn'))
    expect(q('#fw-replay')).not.toHaveClass('on')
    expect(q('#fw-replay-btn')).not.toHaveClass('on')
  })
})

describe('F04b — FIR CROSSINGS · ESTIMATED (js/06 fwFirIndex l. 966-990, fwFirCrossings l. 1023-1038, fwFirBlockHtml l. 1042-1064)', () => {
  // Deux FIR carrées : l'ouest (lon < 9) et l'est (lon ≥ 9) — la route DTTA (10.2 E) → LFMN (7.2 E) les traverse d'est en ouest.
  const fir = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { icao: 'LTTT' }, geometry: { type: 'Polygon', coordinates: [[[9, 30], [20, 30], [20, 50], [9, 50], [9, 30]]] } },
      { type: 'Feature', properties: { icao: 'LFMM' }, geometry: { type: 'Polygon', coordinates: [[[0, 30], [9, 30], [9, 50], [0, 50], [0, 30]]] } },
    ],
  }
  let realFetch
  beforeEach(() => {
    realFetch = globalThis.fetch
    globalThis.fetch = vi.fn((url) =>
      String(url).includes('/geo/fir.geojson')
        ? Promise.resolve({ json: () => Promise.resolve(fir) })
        : Promise.reject(new Error('no network in tests')),
    )
    routes['/airports'] = {
      rows: [
        { icao: 'DTTA', name: 'Tunis Carthage', latitude: 36.851, longitude: 10.227 },
        { icao: 'LFMN', name: 'Nice Côte d’Azur', latitude: 43.658, longitude: 7.216 },
      ],
    }
  })
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  test('le bloc liste la suite des FIR avec la part de route et l’heure interpolée entre ETD et ETA, puis la note', async () => {
    await open()
    fireEvent.click(q('#fwListBtn'))
    fireEvent.click(q('#flightlist .fcard .fcard-call'))
    await waitFor(() => expect(qa('#detailpane .detail-sect h4').map((h) => h.textContent)).toContain('FIR CROSSINGS · ESTIMATED'))
    const titles = qa('#detailpane .detail-sect h4').map((h) => h.textContent)
    expect(titles.indexOf('FIR CROSSINGS · ESTIMATED')).toBe(titles.indexOf('FLIGHT PROGRESS') - 1)
    const sect = qa('#detailpane .detail-sect').find((d) => d.querySelector('h4').textContent === 'FIR CROSSINGS · ESTIMATED')
    const lines = [...sect.querySelectorAll('.fw-fir-l')]
    expect(lines.map((l) => l.querySelector('b').textContent)).toEqual(['LTTT', 'LFMM'])
    expect(lines[0].querySelector('span')).toHaveTextContent('from departure · ~06:00Z')
    expect(lines[1].querySelector('span').textContent).toMatch(/^at 4\d % of route · ~0[67]:\d\dZ$/)
    expect(sect.querySelector('.fw-src')).toHaveTextContent(
      'Computed from the great-circle track over the operator’s 285 FIR/UIR boundaries, sampled every ~1 % of route; times interpolated between ETD and ETA. Not an ATC clearance and not a flight-plan routing.',
    )
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })
})

describe('Audit visuel — l’heure fait foi quand le statut ne dit rien (fwTimes js/06 l. 1296-1297, fwPhase l. 675-686)', () => {
  test('un vol non déclaré parti dont l’ETD est passée compte comme en vol : « to run », phase Airborne, pas « Departs in −… »', async () => {
    const std = new Date(Date.now() - 70 * 60000).toISOString()
    const sta = new Date(Date.now() + 50 * 60000).toISOString()
    await open(board([flight({ status: 'RELEASED', std, sta, minutesToDestination: null })]))
    fireEvent.click(q('#fwListBtn'))
    fireEvent.click(q('#flightlist .fcard .fcard-call'))
    expect(q('#detailpane .fw-eta').textContent).toMatch(/^0h(49|50|51) to run$/)
    fireEvent.click(q('#fw-table-btn'))
    const cells = [...q('#fw-table .fw-tab-t tbody tr').querySelectorAll('td')].map((td) => td.textContent)
    expect(cells[3]).toBe('Airborne')
    expect(cells[7]).toMatch(/^0h(49|50|51)$/)
    fireEvent.change(q('#fwPhase'), { target: { value: 'air' } })
    expect(qa('#flightlist .fcard')).toHaveLength(1)
  })

  test('un vol dont l’ETA est passée compte comme posé : « Landed », phase On ground', async () => {
    const std = new Date(Date.now() - 170 * 60000).toISOString()
    const sta = new Date(Date.now() - 20 * 60000).toISOString()
    await open(board([flight({ status: 'DEPARTED', std, sta, minutesToDestination: -20 })]))
    fireEvent.click(q('#fwListBtn'))
    fireEvent.click(q('#flightlist .fcard .fcard-call'))
    expect(q('#detailpane .fw-eta')).toHaveTextContent('Landed')
    fireEvent.change(q('#fwPhase'), { target: { value: 'ground' } })
    expect(qa('#flightlist .fcard')).toHaveLength(1)
  })

  test('#fw-feed-age écrit « ADS-B (OpenSky) » comme la référence, quel que soit le code du fournisseur', async () => {
    const data = board()
    data.adsb = { provider: 'OPENSKY', state: 'LIVE', seen: 1, matched: 0, withoutModeS: [], ranAt: new Date().toISOString() }
    await open(data)
    expect(q('#fw-feed-age')).toHaveTextContent('ADS-B (OpenSky) · last sweep')
  })
})

describe('F20 — le seam hôte : window.FW et l’événement fw:select (js/11 l. 1-39, js/06 l. 1216-1227)', () => {
  test('choisir un vol émet fw:select { id, callsign, route, risk, index } une seule fois par changement', async () => {
    const seen = []
    const onSelect = (event) => seen.push(event.detail)
    window.addEventListener('fw:select', onSelect)
    try {
      await open()
      fireEvent.click(q('#fwListBtn'))
      fireEvent.click(q('#flightlist .fcard .fcard-call'))
      fireEvent.click(q('#flightlist .fcard .fcard-call'))
      expect(seen).toEqual([{ id: 'l1', callsign: 'TNP101', route: ['DTTA', 'LFMN'], risk: 'LOW', index: 2 }])
    } finally {
      window.removeEventListener('fw:select', onSelect)
    }
  })

  test('window.FW.flights() rend l’état courant, FW.select(id) ouvre le détail, FW.refresh() relit le tableau ; FW disparaît avec la vue', async () => {
    const { unmount } = await open()
    expect(window.FW.flights()).toEqual([{ id: 'l1', callsign: 'TNP101', actype: 'F2TH', route: ['DTTA', 'LFMN'], risk: 'LOW' }])
    let picked
    act(() => {
      picked = window.FW.select('l1')
    })
    expect(picked).toBe(true)
    expect(q('#right')).toHaveClass('fw-open')
    expect(typeof window.FW.refresh).toBe('function')
    expect(window.FW.setFlights).toBeUndefined()
    unmount()
    expect(window.FW).toBeUndefined()
  })
})

describe('Chrome du module — bandeau et cadre de la référence (index.html l. 22-41, css/05 l. 6-15 ; décision du 21/09 : capture 1)', () => {
  test('la page vit dans #fw-host : bandeau plat « Flight Following / Live OCC overview · UTC » et #fwTopHost seul à droite', async () => {
    await open()
    const host = q('#fw-host')
    expect(host).not.toBeNull()
    const bar = host.querySelector(':scope > .topbar')
    expect(bar.querySelector('.topbar-left h1')).toHaveTextContent('Flight Following')
    expect(bar.querySelector('.topbar-left p')).toHaveTextContent('Live OCC overview · UTC')
    expect(bar.querySelector('.topbar-right #fwTopHost')).not.toBeNull()
    expect([...bar.querySelector('.topbar-right').children].map((c) => c.id)).toEqual(['fwTopHost'])
    expect(bar.querySelector('.topbar__back, .vigil-btn, .icon-btn, .avatar')).toBeNull()
    expect(host.querySelector(':scope > #viewFlightFollowing')).not.toBeNull()
  })

  test('le pied de carte propre à la cible a disparu (F01e / F01f tranchés par la capture du 21/09)', async () => {
    await open()
    expect(q('#mapwrap .fw__mapfoot')).toBeNull()
    expect(q('.fw__live')).toBeNull()
    expect([...q('#mapwrap').children].map((c) => c.id || c.className)).toEqual([
      'map', 'fwMapCtl', 'map-note', 'fw-watch-ctl', 'fw-table', 'fw-replay', 'basemap-switch', 'fw-speed-badge', 'fw-feed-age', 'wx-anim-ctl',
    ])
  })

  test('la feuille porte le chrome de css/05 sous #fw-host et plus aucune règle du pied de carte', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/flightwatch.css'), 'utf8')
    expect(css).toContain('#fw-host .topbar{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;')
    expect(css).toContain('gap:16px;padding:10px 18px;background:#0F2036;border-bottom:1px solid #22354f;')
    expect(css).toContain('#fw-host .topbar-left h1{margin:0;font-size:15px;font-weight:700;letter-spacing:.2px;color:#E8EDF4;font-family:inherit;}')
    expect(css).toContain('#fw-host .topbar-left p{margin:2px 0 0;font-size:10.5px;color:#8fa2bd;letter-spacing:.4px;}')
    expect(css).toContain('#fw-host .topbar-right{display:flex;align-items:center;gap:10px;}')
    expect(css).toContain('#fw-host > #viewFlightFollowing{flex:1;min-height:0;}')
    expect(css).not.toContain('.fw__mapfoot')
    expect(css).not.toContain('.fw__live')
    expect(css).not.toContain('.fw__src')
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
    // Audit visuel 2026-09-18 : le line-height de l'hôte gonflait cartes et compteurs (114 px au lieu de 104).
    expect(css).toContain('#viewFlightFollowing, #fwTopHost { line-height: normal; }')
  })

  test('la barre propre à la cible a disparu', () => {
    expect(css).not.toContain('.fw__bar')
    expect(css).not.toContain('.fw__layersmenu')
  })
})
