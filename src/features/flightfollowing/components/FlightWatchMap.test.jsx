import { act, render } from '@testing-library/react'
import { vi } from 'vitest'
import FlightWatchMap from './FlightWatchMap'

/**
 * La carte — référence NETPLUS_FLIGHT_FOLLOWING js/06 : MAP INIT l. 243-266
 * (vue, fonds, libellés), volets l. 285-289, FIR l. 297-341, aérodromes
 * l. 346-359, marqueur d'un vol suivi (aircraftSVG l. 381-385, rebuild
 * l. 1748-1757), route l. 1749, sélection l. 1236-1239, suivi caméra l. 508-511,
 * trafic ADS-B fwSetAdsb l. 1703-1740.
 *
 * Leaflet tourne dans jsdom avec un conteneur de 800 × 600 simulé et un
 * ResizeObserver muet.
 */
class QuietResizeObserver {
  observe() {}
  disconnect() {}
}

beforeAll(() => {
  globalThis.ResizeObserver = QuietResizeObserver
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 800 })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 })
})

const airports = [
  { icao: 'DTTA', name: 'Tunis Carthage', latitude: 36.851, longitude: 10.227 },
  { icao: 'LFMN', name: 'Nice Côte d’Azur', latitude: 43.658, longitude: 7.216 },
]

function flight(overrides = {}) {
  return {
    legId: 'l1', flightNo: 'TNP101', registration: 'TS-NPA', icaoType: 'F2TH', operator: 'TNP',
    depIcao: 'DTTA', arrIcao: 'LFMN', tracking: 'LIVE',
    lastPosition: { latitude: 40.1, longitude: 8.9, trackDeg: 312, groundSpeedKt: 450, altitudeFt: 39000 },
    risk: { level: 'HIGH', index: 12, factors: [] },
    ...overrides,
  }
}

const LAYERS = { flights: true, adsb: true, airports: true, fir: false, radar: false, ir: false, labels: true }

function draw(props = {}) {
  return render(
    <FlightWatchMap
      flights={[flight()]}
      airports={airports}
      bases={['DTTA']}
      traffic={[]}
      showTraffic={false}
      basemap="SATELLITE"
      layers={LAYERS}
      radarFrame={null}
      selectedId={null}
      onSelect={() => {}}
      {...props}
    />,
  )
}

const q = (selector) => document.querySelector(selector)
const qa = (selector) => [...document.querySelectorAll(selector)]

describe('F01d — le conteneur et les volets (js/06 l. 243-245, 285-289)', () => {
  test('la carte vit dans #map, zoom en haut à gauche, quatre volets nommés', () => {
    draw()
    expect(q('#map.leaflet-container')).not.toBeNull()
    expect(q('#map .leaflet-top.leaflet-left .leaflet-control-zoom')).not.toBeNull()
    expect(q('#map .leaflet-fir-pane').style.zIndex).toBe('350')
    expect(q('#map .leaflet-route-pane').style.zIndex).toBe('420')
    expect(q('#map .leaflet-apt-pane').style.zIndex).toBe('440')
    expect(q('#map .leaflet-ac-pane').style.zIndex).toBe('460')
    expect(q('.fwm')).toBeNull()
  })

  test('les fonds : Esri (sat) + libellés Esri à 0.9, CARTO dark_all, CARTO voyager pour STREET (F05d)', () => {
    const { rerender, unmount } = draw()
    const srcs = () => qa('#map img.leaflet-tile').map((img) => img.getAttribute('src'))
    expect(srcs().some((s) => s.includes('World_Imagery'))).toBe(true)
    expect(srcs().some((s) => s.includes('World_Boundaries_and_Places'))).toBe(true)
    const labelsImg = qa('#map img.leaflet-tile').find((img) => img.src.includes('World_Boundaries_and_Places'))
    expect(labelsImg.closest('.leaflet-layer').style.opacity).toBe('0.9')

    rerender(<FlightWatchMap flights={[flight()]} airports={airports} bases={[]} traffic={[]} showTraffic={false} basemap="STREET" layers={LAYERS} radarFrame={null} selectedId={null} onSelect={() => {}} />)
    expect(srcs().some((s) => s.includes('basemaps.cartocdn.com/rastertiles/voyager'))).toBe(true)
    expect(srcs().some((s) => s.includes('World_Boundaries_and_Places'))).toBe(false)
    unmount()
  })
})

describe('F05a — le marqueur d’un vol suivi (aircraftSVG l. 381-385, l. 1752-1756)', () => {
  test('icône 26 px colorée par le niveau, tournée au cap, dans acPane, sans étiquette permanente', () => {
    draw()
    const icon = q('#map .leaflet-ac-pane .leaflet-marker-icon')
    expect(icon).not.toBeNull()
    const svg = icon.querySelector('svg')
    expect(svg.getAttribute('width')).toBe('26')
    expect(svg.querySelector('path').getAttribute('fill')).toBe('#E67E22')
    expect(svg.querySelector('path').getAttribute('stroke')).toBe('#0A1628')
    expect(svg.style.transform).toBe('rotate(312deg)')
    expect(q('#map .fwm-tag')).toBeNull()
    expect(q('#map .fwm-mark')).toBeNull()
  })
})

describe('F05b / F05c — la route, les aérodromes et leurs libellés (l. 1749, 346-359)', () => {
  test('route #F0A500 · 1.6 · .55 · 2,6 dans routePane ; pastille r4 or sur fond navy et .apt-label', () => {
    draw()
    const route = q('#map .leaflet-route-pane path')
    expect(route.getAttribute('stroke')).toBe('#F0A500')
    expect(route.getAttribute('stroke-width')).toBe('1.6')
    expect(route.getAttribute('stroke-opacity')).toBe('0.55')
    expect(route.getAttribute('stroke-dasharray')).toBe('2,6')

    const dots = qa('#map .leaflet-apt-pane path')
    expect(dots).toHaveLength(2)
    expect(dots[0].getAttribute('stroke')).toBe('#F0A500')
    expect(dots[0].getAttribute('stroke-width')).toBe('1.5')
    expect(dots[0].getAttribute('fill')).toBe('#0A1628')
    expect(dots[0].getAttribute('fill-opacity')).toBe('1')
    const labels = qa('#map .leaflet-apt-pane .apt-label').map((l) => l.textContent)
    expect(labels.sort()).toEqual(['DTTA', 'LFMN'])
    expect(q('#map .fwm-apt, #map .fwm-aptlbl, #map .fwm-route')).toBeNull()
  })
})

describe('F01d — la sélection centre la carte (selectFlight l. 1236-1239)', () => {
  test('sélectionner un vol vole vers sa position au zoom 6', async () => {
    const { rerender } = draw()
    const zoomBefore = q('#map .leaflet-control-zoom-in').getAttribute('aria-disabled')
    expect(zoomBefore).not.toBe('true')
    rerender(<FlightWatchMap flights={[flight()]} airports={airports} bases={[]} traffic={[]} showTraffic={false} basemap="SATELLITE" layers={LAYERS} radarFrame={null} selectedId="l1" onSelect={() => {}} />)
    // flyTo dure 0,8 s : on attend la fin de l'animation avant de lire le zoom.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1100))
    })
    expect(window.__fwMap.getZoom()).toBe(6)
  })
})

describe('F08a — le trafic ADS-B (fwSetAdsb l. 1703-1740)', () => {
  test('un appareil tiers : icône bleue #4DA3FF de 11 px dans acPane, infobulle et fenêtre de la référence', () => {
    draw({
      showTraffic: true,
      traffic: [{ modeSHex: '3c6444', callsign: 'DLH4YA', latitude: 41.2, longitude: 9.1, altitudeFt: 37025, groundSpeedKt: 445, trackDeg: 95 }],
    })
    const icons = qa('#map .leaflet-ac-pane .leaflet-marker-icon.adsb-ac')
    expect(icons).toHaveLength(1)
    const box = icons[0].firstElementChild
    expect(box.style.width).toBe('11px')
    expect(box.style.transform).toBe('rotate(95deg)')
    expect(box.querySelector('path').getAttribute('fill')).toBe('#4DA3FF')
    expect(q('#map .fwm-traffic')).toBeNull()
  })
})
