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
import '../../styles/safety.css'

/**
 * Safety Management System.
 *
 * <b>Ten tabs, the ten of the approved prototype</b>, in its order: the four
 * components of ICAO Annex 19 read left to right — policy and the picture,
 * then risk management, then assurance, then promotion — with the register and
 * the settings that support them.
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
  ['RISK', 'Risk register'],
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

  const countFor = (key) => {
    if (key === 'MONITORING') return data?.monitoring.critical || null
    if (key === 'INVESTIGATIONS') {
      return (data?.investigations ?? []).filter((entry) => !entry.closedOn).length || null
    }
    if (key === 'NOTIFICATIONS') return notifications.data?.unread || null
    return null
  }

  return (
    <>
      <TopBar
        title="Safety Management System"
        subtitle="ICAO Annex 19 · EASA ORO.GEN.200 · IS-BAO Stage 2"
      />

      <div className="sms-tabs">
        {TABS.map(([key, label]) => {
          const count = countFor(key)
          return (
            <button key={key} type="button"
                    className={tab === key ? 'sms-tab sms-tab--active' : 'sms-tab'}
                    onClick={() => setTab(key)}>
              {label}
              {count ? <span className="sms-tab__count">{count}</span> : null}
            </button>
          )
        })}
      </div>

      <div className="shell__scroll">
        <main className="page">
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
            <AssuranceBoard audits={data.auditProgramme} changes={data.changes} />
          ) : tab === 'PERSONNEL' ? (
            <PersonnelBoard accountability={data.accountability} />
          ) : tab === 'PROMOTION' ? (
            <PromotionBoard />
          ) : tab === 'SETTINGS' ? (
            <SafetySettings indicators={data.indicators} accountability={data.accountability} />
          ) : (
            <NotificationsBoard />
          )}
        </main>
      </div>
    </>
  )
}
