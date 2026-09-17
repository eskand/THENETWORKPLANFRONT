import { useState } from 'react'
import TopBar from '../../components/TopBar'
import { ErrorState, LoadingState } from '../../components/States'
import {
  useRunSafetyScan,
  useSafetyNotifications,
  useSafetyOverview,
} from '../../hooks/useCommercial'
import SafetyOverview from './components/SafetyOverview'
import MonitoringBoard from './components/MonitoringBoard'
import OccurrenceBoard from './components/OccurrenceBoard'
import RiskRegister from './components/RiskRegister'
import InvestigationsBoard from './components/InvestigationsBoard'
import AssuranceBoard from './components/AssuranceBoard'
import PersonnelBoard from './components/PersonnelBoard'
import PromotionBoard from './components/PromotionBoard'
import SafetySettings from './components/SafetySettings'
import NotificationsBoard from './components/NotificationsBoard'
import '../../styles/safeops.css'
import '../../styles/safety.css'

/**
 * Safety Management System.
 *
 * <b>The module renders inside the annexe's own root.</b> {@code #safeops-root}
 * carries the annexe's stylesheet — light ground, white cards, Poppins — and
 * that is a decision of the annexe, not an oversight: the Safety Manager is
 * printed, attached to an audit file and read beside a manual, and it is the
 * one screen of the product that leaves the operations room. Letting it inherit
 * the dark operational theme produced a screen that resembled nothing in the
 * annexe, whatever detail was corrected afterwards.
 *
 * <b>Ten tabs, the annexe's, in its order.</b> The four components of ICAO
 * Annex 19 read left to right — policy and the picture, then risk management,
 * then assurance, then promotion — with the register and the settings that
 * support them.
 *
 * <b>Only the notification count is a number.</b> Monitoring carries a dot when
 * something critical is live; the rest carry nothing. Numbering all ten would
 * make a strip of figures in which none of them stands out.
 *
 * <b>Promotion appears here and in the sidebar, deliberately.</b> This tab is
 * the Safety Manager's view of reach and acknowledgement; the sidebar module is
 * the crew's bulletin board. Same records, two audiences, and collapsing them
 * would leave one of the two without the screen it needs.
 */
const TABS = [
  ['OVERVIEW', 'Overview'],
  ['MONITORING', 'Monitoring'],
  ['OCCURRENCES', 'Occurrences'],
  ['RISK', 'Risk Register'],
  ['INVESTIGATIONS', 'Investigations'],
  ['ASSURANCE', 'Assurance'],
  ['PERSONNEL', 'Personnel'],
  ['PROMOTION', 'Promotion'],
  ['SETTINGS', 'Settings'],
  ['NOTIFICATIONS', 'Notifications'],
]

export default function SafetyManagerPage() {
  const [tab, setTab] = useState('OVERVIEW')
  const overview = useSafetyOverview()
  const notifications = useSafetyNotifications()
  const scan = useRunSafetyScan()

  const data = overview.data
  const unread = notifications.data?.unread ?? 0
  const criticalLive = (data?.monitoring.critical ?? 0) > 0

  return (
    <>
      <TopBar
        title="Safety Management System"
        subtitle="ICAO Annex 19 · EASA ORO.GEN.200 · IS-BAO Stage 2"
      />

      <div className="shell__scroll">
        <div id="safeops-root">
          <div id="manager-screen" className="screen on">

            <div className="topbar" id="mgr-topbar">
              <div className="topnav">
                {TABS.map(([key, label]) => (
                  <div key={key}
                       className={`tnav${tab === key ? ' active' : ''}${
                         key === 'NOTIFICATIONS' ? ' tnav-notif' : ''}`}
                       onClick={() => setTab(key)}
                       role="button" tabIndex={0}
                       onKeyDown={(event) => { if (event.key === 'Enter') setTab(key) }}>
                    {label}
                    {key === 'MONITORING' && criticalLive ? (
                      <span className="tnav-dot"
                            title={`${data.monitoring.critical} critical findings`} />
                    ) : null}
                    {key === 'NOTIFICATIONS' && unread ? (
                      <span className="tnav-count" style={{ display: 'inline-block' }}>
                        {unread}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div id="mgr-content">
              <div className="page">
                {overview.isError ? (
                  <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
                ) : !data ? (
                  <LoadingState label="Reading the safety picture…" />
                ) : tab === 'OVERVIEW' ? (
                  <SafetyOverview data={data} onOpenTab={setTab}
                                  scanning={scan.isPending}
                                  onScan={() => scan.mutate()} />
                ) : tab === 'MONITORING' ? (
                  <MonitoringBoard monitoring={data.monitoring}
                                   scanning={scan.isPending}
                                   onScan={() => scan.mutate()} />
                ) : tab === 'OCCURRENCES' ? (
                  <OccurrenceBoard />
                ) : tab === 'RISK' ? (
                  <RiskRegister />
                ) : tab === 'INVESTIGATIONS' ? (
                  <InvestigationsBoard investigations={data.investigations} />
                ) : tab === 'ASSURANCE' ? (
                  <AssuranceBoard audits={data.auditProgramme} changes={data.changes}
                                  indicators={data.indicators}
                                  actions={data.correctiveActions} />
                ) : tab === 'PERSONNEL' ? (
                  <PersonnelBoard accountability={data.accountability} />
                ) : tab === 'PROMOTION' ? (
                  <PromotionBoard />
                ) : tab === 'SETTINGS' ? (
                  <SafetySettings indicators={data.indicators}
                                  accountability={data.accountability} />
                ) : (
                  <NotificationsBoard />
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
