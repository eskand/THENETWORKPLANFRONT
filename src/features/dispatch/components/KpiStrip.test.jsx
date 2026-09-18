import { render, screen } from '@testing-library/react'
import KpiStrip from './KpiStrip'

/**
 * Les six tuiles du desk Dispatch — référence TNP_DEMO_FINAL_v226_114.html
 * (v33) l. 7551-7558 (libellés) et l. 22818-22844 (`updateDispatchKpis`).
 */
function kpi(overrides = {}) {
  return {
    flightsToday: 12, tails: 7, fleetSize: 20, flightsYesterday: 10, delayedYesterday: 1,
    otpPercent: 90, otpSample: 10, otpYesterdayPercent: 80, otpTargetPercent: 85,
    servicesReady: 8, servicesPending: 4, permitsOutstanding: 2, crewUnassigned: 1,
    delaysAndAog: 3, aog: 1, maintenance: 1, delayed: 2, needsAction: 5,
    ...overrides,
  }
}

describe('KpiStrip — sous-libellés de la référence', () => {
  // ref l. 22838 : pendingCount ? `${n} file${n===1?'':'s'} need action` : 'all clear'
  test('Services Pending dit « all clear » quand rien n’attend', () => {
    render(<KpiStrip kpi={kpi({ servicesPending: 0 })} />)
    expect(screen.getByText('all clear')).toBeInTheDocument()
  })

  test('Services Pending compte les dossiers au singulier et au pluriel', () => {
    const { rerender } = render(<KpiStrip kpi={kpi({ servicesPending: 1 })} />)
    expect(screen.getByText('1 file need action')).toBeInTheDocument()
    rerender(<KpiStrip kpi={kpi({ servicesPending: 4 })} />)
    expect(screen.getByText('4 files need action')).toBeInTheDocument()
  })

  // ref l. 7556 : sous-libellé statique « overflight, not confirmed »
  test('Permits Outstanding porte « overflight, not confirmed »', () => {
    render(<KpiStrip kpi={kpi()} />)
    expect(screen.getByText('overflight, not confirmed')).toBeInTheDocument()
  })

  // ref l. 22841 : crewGaps ? 'roles to fill' : 'fully crewed'
  test('Crew Unassigned dit « roles to fill » quand un siège manque', () => {
    const { rerender } = render(<KpiStrip kpi={kpi({ crewUnassigned: 2 })} />)
    expect(screen.getByText('roles to fill')).toBeInTheDocument()
    rerender(<KpiStrip kpi={kpi({ crewUnassigned: 0 })} />)
    expect(screen.getByText('fully crewed')).toBeInTheDocument()
  })

  // ref l. 22843 : delaysAog ? 'needs attention' : 'on schedule'
  test('Delays / AOG dit « needs attention » ou « on schedule »', () => {
    const { rerender } = render(<KpiStrip kpi={kpi({ delaysAndAog: 3 })} />)
    expect(screen.getByText('needs attention')).toBeInTheDocument()
    rerender(<KpiStrip kpi={kpi({ delaysAndAog: 0, aog: 0, maintenance: 0, delayed: 0 })} />)
    expect(screen.getByText('on schedule')).toBeInTheDocument()
  })
})
