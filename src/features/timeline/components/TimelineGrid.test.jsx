import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import TimelineGrid from './TimelineGrid'

/**
 * La grille de Gantt — référence TNP_DEMO_FINAL_v226_114.html (v33) :
 * DOM `renderTimelineRows` l. 11206-11409, en-tête `tlBuildHourHeader`
 * l. 10007-10043, trait de l'heure `occUpdateNowLine` l. 12432-12466,
 * feuille de style l. 1052-1452.
 */
const DAY = '2026-09-18'

function seg(kind, overrides) {
  return {
    kind, legId: null, flightNo: null, depIcao: null, arrIcao: null,
    startsAt: null, endsAt: null, minutes: 0, status: null, statusTone: null,
    delayMinutes: 0, melReference: null, melBlocking: false, ftlStatus: null, tight: false, note: null,
    ...overrides,
  }
}

function flight(legId, flightNo, dep, arr, from, to, tone = 'SCHEDULED', extra = {}) {
  return seg('FLIGHT', {
    legId, flightNo, depIcao: dep, arrIcao: arr,
    startsAt: `${DAY}T${from}:00Z`, endsAt: `${DAY}T${to}:00Z`,
    status: tone === 'ENROUTE' ? 'DEPARTED' : 'PLANNED', statusTone: tone, ftlStatus: 'OK', ...extra,
  })
}

function data() {
  return {
    windowStart: `${DAY}T00:00:00Z`, windowEnd: '2026-09-19T00:00:00Z', days: 1,
    rows: [
      {
        aircraftId: 'a1', registration: 'TS-NPA', icaoType: 'F2TH', model: 'Falcon 2000LX',
        fleetSection: 'Falcon Fleet', baseIcao: 'DTTA', status: 'SERVICEABLE', statusReason: null,
        segments: [
          flight('l1', 'TNP101', 'DTTA', 'LFMN', '06:00', '08:15'),
          seg('GROUND', { depIcao: 'LFMN', arrIcao: 'LFMN', startsAt: `${DAY}T08:15:00Z`, endsAt: `${DAY}T09:30:00Z`, minutes: 75, statusTone: 'GROUND' }),
          flight('l2', 'TNP102', 'LFMN', 'LSGG', '09:30', '10:45', 'ENROUTE'),
          flight('l3', 'TNP103', 'LSGG', 'LSGG', '12:00', '12:30', 'SCHEDULED', { ftlStatus: 'BREACH' }),
        ],
        flights: 3, blockMinutes: 240, groundMinutes: 150, tightTurnarounds: 0,
      },
      {
        aircraftId: 'a2', registration: 'TS-NPB', icaoType: 'F2TH', model: 'Falcon 2000LX',
        fleetSection: 'Falcon Fleet', baseIcao: 'DTTA', status: 'SERVICEABLE', statusReason: null,
        segments: [], flights: 0, blockMinutes: 0, groundMinutes: 0, tightTurnarounds: 0,
      },
      {
        aircraftId: 'a3', registration: 'TS-NPL', icaoType: 'C25C', model: 'Citation CJ4',
        fleetSection: 'Citation 525-Family Fleet', baseIcao: 'DTTA', status: 'MAINTENANCE', statusReason: 'Phase check',
        segments: [seg('MAINTENANCE', {
          depIcao: 'DTTA', arrIcao: 'DTTA', startsAt: `${DAY}T00:00:00Z`, endsAt: '2026-09-19T00:00:00Z',
          minutes: 1440, status: 'MAINTENANCE', statusTone: 'MAINTENANCE', tight: true, note: 'Phase check',
        })],
        flights: 0, blockMinutes: 0, groundMinutes: 0, tightTurnarounds: 0,
      },
    ],
    aircraftUsed: 1, aircraftIdle: 2, flights: 3, tightTurnarounds: 0, minimumTurnaroundMinutes: 50,
    fleetSize: 3, inService: 2, outOfService: 1, outOfServiceRegistrations: ['TS-NPL'],
    availabilityPercent: 67, delays: 0, flightsYesterday: 0, delaysYesterday: 0,
    otpPercent: null, otpSample: 0, otpTargetPercent: 95, blockMinutes: 240, utilisationPercent: 33,
    dailyBlockHourReference: 10, fleetSections: ['Citation 525-Family Fleet', 'Falcon Fleet'], bases: ['DTTA'],
    computedAt: `${DAY}T10:30:00Z`,
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${DAY}T10:30:00Z`))
})
afterEach(() => vi.useRealTimers())

describe('TimelineGrid — le DOM de la référence (renderTimelineRows, l. 11206-11409)', () => {
  test('en-tête : colonne « Aircraft » et une .hour-cell par heure, la première datée', () => {
    const { container } = render(<TimelineGrid data={data()} onSelectLeg={() => {}} />)
    expect(container.querySelector('.tl-grid .tl-header .tail-col')).toHaveTextContent('Aircraft')
    const cells = container.querySelectorAll('.tl-header .tl-hours .hour-cell')
    expect(cells).toHaveLength(24)
    expect(cells[0]).toHaveClass('day-start')
    expect(cells[0].querySelector('.hc-date')).toHaveTextContent(/18 Sept · today$/)
    expect(cells[1]).toHaveTextContent('01:00')
    expect(cells[10]).toHaveClass('now-hour')
  })

  test('lignes de section et colonne appareil de la référence', () => {
    const { container } = render(<TimelineGrid data={data()} onSelectLeg={() => {}} />)
    const sections = [...container.querySelectorAll('#tlRows .tl-row.section .section-label .section-label-text')]
      .map((element) => element.textContent)
    expect(sections).toEqual(['Falcon Fleet', 'Citation 525-Family Fleet'])
    const row = container.querySelector('#tlRows .tl-row:not(.section)')
    expect(row.querySelector('.tail-col .tail-icon svg')).not.toBeNull()
    expect(row.querySelector('.tail-col .tail-info .reg')).toHaveTextContent('TS-NPA')
    const type = row.querySelector('.tail-col .tail-info .type')
    expect(type).toHaveTextContent('F2TH')
    expect(type).toHaveAttribute('title', 'Falcon 2000LX')
    expect(row.querySelector('.tail-col .tail-status')).toHaveClass('ok')
    const maint = [...container.querySelectorAll('#tlRows .tl-row:not(.section)')].at(-1)
    expect(maint.querySelector('.tail-status')).toHaveClass('maint')
  })

  test('barres : .strip.<statut> avec pastille, fn, route, horaires et densité sz-*', () => {
    const { container } = render(<TimelineGrid data={data()} onSelectLeg={() => {}} />)
    const lane = container.querySelector('#tlRows .tl-row:not(.section) .tl-lane')
    const strips = lane.querySelectorAll('.strip')
    expect(strips).toHaveLength(3)
    const first = strips[0]
    expect(first).toHaveClass('scheduled', 'sz-lg')
    expect(first.getAttribute('data-uid')).toBe('l1')
    // left = etd × 75 ; width = max((eta − etd) × 75 − 4, 30) — l. 11314-11315
    expect(first.style.left).toBe('450px')
    expect(first.style.width).toBe('164.75px')
    expect(first.querySelector('.strip-content .strip-ico svg')).not.toBeNull()
    expect(first.querySelector('.strip-txt .fn')).toHaveTextContent('TNP101')
    expect(first.querySelector('.strip-txt .route')).toHaveTextContent('DTTA → LFMN')
    expect(first.querySelector('.strip-txt .time')).toHaveTextContent('06:00–08:15')
    expect(first).toHaveAttribute('title', 'Click to view · drag to reschedule or reassign')
    expect(strips[1]).toHaveClass('enroute')
    // 30 min → 33,5 px → sz-xs ; FTL critique → liseré airport-alert (l. 11364-11365, 11391)
    expect(strips[2]).toHaveClass('sz-xs', 'airport-alert')
    expect(strips[2]).toHaveAttribute('title', 'Crew FTL exceedance (FDP/rest/currency) — click to review in Crew tab.')
    // les segments sol ne sont pas des barres
    expect(lane.querySelectorAll('.tlb, .tlb--tight')).toHaveLength(0)
  })

  test('bande de maintenance pleine journée et indicateur GROUNDED', () => {
    const { container } = render(<TimelineGrid data={data()} onSelectLeg={() => {}} />)
    const rows = container.querySelectorAll('#tlRows .tl-row:not(.section)')
    const idle = rows[1].querySelector('.tl-lane .strip-grounded')
    expect(idle).toHaveTextContent('GROUNDED · DTTA')
    expect(idle.querySelector('.sg-dot')).not.toBeNull()
    const band = rows[2].querySelector('.tl-lane .strip.maint.ground')
    expect(band.querySelector('.fn')).toHaveTextContent('Scheduled maintenance')
    expect(band.querySelector('.strip-ico')).toBeNull()
  })

  test('trait de l’heure courante : #nowLine.now-line + #nowTag.now-tag « HH:MM UTC »', () => {
    const { container } = render(<TimelineGrid data={data()} onSelectLeg={() => {}} />)
    const line = container.querySelector('.tl-grid > #nowLine.now-line')
    expect(line).not.toBeNull()
    // 230 px de colonne + 10,5 h × 75 px (l. 12453)
    expect(line.style.left).toBe('1017.5px')
    const tag = line.querySelector('#nowTag.now-tag')
    expect(tag).toHaveTextContent('10:30UTC')
    expect(tag.querySelector('.tz')).toHaveTextContent('UTC')
  })

  test('un clic sur une barre ouvre l’étape', () => {
    const onSelectLeg = vi.fn()
    const { container } = render(<TimelineGrid data={data()} onSelectLeg={onSelectLeg} />)
    fireEvent.click(container.querySelector('.strip[data-uid="l2"]'))
    expect(onSelectLeg).toHaveBeenCalledWith(expect.objectContaining({ legId: 'l2' }), expect.objectContaining({ registration: 'TS-NPA' }))
  })
})

describe('timeline.css — la feuille de la référence, copiée telle quelle (l. 1052-1452)', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles/timeline.css'), 'utf8')

  test.each([
    '.strip.scheduled{ border-left-color:var(--tnp-navy); background:var(--tnp-navy-2); color:#fff; }',
    '.strip.enroute{ border-left-color:#136b3c; background:var(--status-enroute); color:#fff; }',
    '.strip.delayed{ border-left-color:#8a6414; background:#d1a53d; color:#1a2036; }',
    '.strip.aog{ border-left-color:#8f1620; background:var(--status-aog); color:#fff; }',
    '.strip.maint{ border-left-color:#5a3699; background:var(--status-maint); color:#fff; }',
    'background-color:#dce1eb;',
    '.strip.sz-xs .strip-ico, .strip.sz-xs .time, .strip.sz-xs .route{ display:none; }',
    '.now-tag .tz{ font-size:7.5px; font-weight:700; opacity:.72; letter-spacing:.04em; }',
  ])('contient « %s »', (rule) => {
    expect(css).toContain(rule)
  })

  test('ne porte plus la palette propre --tl-scheduled/--tl-enroute sur les barres', () => {
    expect(css).not.toMatch(/\.tlb\s*\{/)
  })
})
