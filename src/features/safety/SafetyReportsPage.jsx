import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import TopBar from '../../components/TopBar'
import { useCrewList } from '../../hooks/useCrew'
import {
  useDeleteReportDraft,
  useReportingBoard,
  useSaveReportDraft,
  useSafetyQueries,
  useSubmitSafetyReport,
} from '../../hooks/useCommercial'
import { EMPTY, dayMonthYear } from '../../lib/format'
import ActionRequired from './components/ActionRequired'
import ReportForm from './components/ReportForm'
import RexLibrary from './components/RexLibrary'
import '../../styles/safetyreports.css'

const STATUS_BAND = {
  REPORTED: 'open', UNDER_REVIEW: 'open', RISK_ASSESSED: 'pending',
  ACTIONS_OPEN: 'pending', CLOSED: 'closed',
}

/**
 * Safety Reports.
 *
 * <b>À qui cet écran s'adresse.</b> Pas au responsable sécurité : à tout le
 * monde. Sa mesure de réussite est le nombre de signalements qui arrivent, ce
 * qui explique les trois champs obligatoires, les brouillons, et la colonne de
 * droite qui répond aux trois questions qu'on se pose avant d'envoyer — que
 * va-t-il se passer, et si rien n'a mal tourné, et si c'est urgent.
 *
 * <b>Le sélecteur de déclarant est dans la barre du haut</b>, comme dans le
 * prototype : il vaut pour tous les onglets, et le formulaire l'affiche en
 * lecture seule plutôt que de le redemander. Il disparaîtra le jour où
 * l'identité viendra du jeton d'authentification.
 */
export default function SafetyReportsPage() {
  const [tab, setTab] = useState('NEW')
  const [reporterId, setReporterId] = useState('')
  const [openDraft, setOpenDraft] = useState(null)

  const crew = useCrewList({ activeOnly: true })
  const board = useReportingBoard(reporterId)
  const saveDraft = useSaveReportDraft(reporterId)
  const dropDraft = useDeleteReportDraft(reporterId)
  const submit = useSubmitSafetyReport(reporterId)
  const queries = useSafetyQueries(
    reporterId ? { reporter: undefined, openOnly: true } : { openOnly: true },
  )

  const people = crew.data ?? []
  const data = board.data
  const reporter = people.find((person) => person.id === reporterId) ?? null

  /* Les six onglets de l annexe A4, dans son ordre : declarer, partager,
     suivre, repondre, apprendre, se documenter. */
  const tabs = [
    ['NEW', 'New report', null],
    ['REX', 'Submit REX', null],
    ['MINE', 'My reports', data?.myReports.length || null],
    ['ACTION', 'Action required', queries.data?.length || null],
    ['REXLIB', 'REX library', null],
    ['GUIDANCE', 'Forms & guidance', null],
  ]

  return (
    <>
      <TopBar
        title="Safety Reports"
        subtitle="Safety reporting for all personnel · filed directly into the SMS occurrence register"
      />

      <div className="sr-root">
        <div className="sr-topbar">
          <div className="sr-brand">
            <span className="sr-mark"><Megaphone size={15} strokeWidth={2} /></span>
            <div>
              <div className="sr-b1">Safety Reports</div>
              <div className="sr-b2">The Network Plan Airlines · anyone whose work touches the operation</div>
            </div>
          </div>

          <div className="sr-nav">
            {tabs.map(([key, label, count]) => (
              <button key={key} type="button"
                      className={tab === key ? 'sr-tab sr-tab--on' : 'sr-tab'}
                      onClick={() => { setTab(key); setOpenDraft(null) }}>
                {label}
                {count ? <span className="sr-badge">{count}</span> : null}
              </button>
            ))}
          </div>

          <div className="sr-who">
            <label htmlFor="sr-reporter">Reporting as</label>
            <select id="sr-reporter" value={reporterId}
                    onChange={(event) => { setReporterId(event.target.value); setOpenDraft(null) }}>
              <option value="">Select who you are…</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName} · {person.mainRole.replace('_', ' ').toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="sr-page">
          {!reporterId ? (
            <div className="sr-card">
              <div className="sr-empty">
                <h3>Choose who is reporting</h3>
                A report has to carry an author so it can be followed up — and so the confidential
                and anonymous options mean something. Until sign-in exists, pick a name above.
              </div>
            </div>
          ) : board.isError ? (
            <div className="sr-error">
              The reporting form could not be opened —{' '}
              {board.error?.response?.data?.message ?? board.error.message}
            </div>
          ) : !data ? (
            <div className="sr-card"><div className="sr-empty">Opening the reporting form…</div></div>
          ) : tab === 'GUIDANCE' ? (
            <Guidance data={data} />
          ) : tab === 'MINE' ? (
            <MyReports data={data} />
          ) : tab === 'ACTION' ? (
            <ActionRequired reporterName={reporter?.fullName} />
          ) : tab === 'REXLIB' ? (
            <RexLibrary reporterName={reporter?.fullName} onSubmitRex={() => setTab('REX')} />
          ) : (
            <>
              <div className="sr-head">
                <h1 className="sr-h1">
                  {tab === 'REX' ? 'Submit experience feedback' : 'New safety report'}
                </h1>
                <div className="sr-h2">
                  {tab === 'REX'
                    ? 'A lesson worth passing on, including something that went well. A REX is never disciplinary and never becomes a file on you.'
                    : 'Anyone whose work touches the operation can report — flight and cabin crew, dispatchers, OCC, maintenance, ground operations and management.'}
                </div>
              </div>

              {data.drafts.length > 0 && tab === 'NEW' ? (
                <div className="sr-card">
                  <div className="sr-sec">Your drafts</div>
                  {data.drafts.map((draft) => (
                    <div className="sr-drafts" key={draft.id}>
                      <div>
                        <b>{draft.title || 'Untitled draft'}</b>
                        <span>
                          {draft.reportType ?? 'no type yet'} · saved {dayMonthYear(draft.updatedAt)}
                          {draft.submittable ? '' : ' · not yet complete'}
                        </span>
                      </div>
                      <div>
                        <button type="button" className="sr-btn sr-btn--tiny"
                                onClick={() => setOpenDraft(draft)}>Open</button>
                        <button type="button" className="sr-btn sr-btn--tiny"
                                style={{ marginLeft: 5 }}
                                disabled={dropDraft.isPending}
                                onClick={() => {
                                  if (window.confirm('Discard this draft?')) dropDraft.mutate(draft.id)
                                }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <ReportForm key={`${tab}-${openDraft?.id ?? 'blank'}`}
                          board={data} reporter={reporter} draft={openDraft}
                          presetType={tab === 'REX' ? 'REX' : null}
                          saving={saveDraft.isPending}
                          submitting={submit.isPending}
                          error={submit.error}
                          onSaveDraft={(payload, done) =>
                            saveDraft.mutate(payload, { onSuccess: done })}
                          onSubmit={(payload, done) =>
                            submit.mutate(payload, {
                              onSuccess: () => { done(); setOpenDraft(null); setTab('MINE') },
                            })} />
            </>
          )}
        </div>
      </div>
    </>
  )
}

/* ---------- mes signalements ---------- */

function MyReports({ data }) {
  return (
    <>
      <div className="sr-head">
        <h1 className="sr-h1">My reports</h1>
        <div className="sr-h2">
          What you filed and where it stands. Anonymous reports do not appear here — by design:
          nobody can list them back to you, which is what makes them anonymous.
        </div>
      </div>

      <div className="sr-card">
        {data.myReports.length === 0 ? (
          <div className="sr-empty">
            <h3>You have not filed anything yet</h3>
            Nothing here means nothing named. It does not mean nothing was reported.
          </div>
        ) : (
          <table className="sr-tbl">
            <thead>
              <tr>
                <th>Reference</th><th>Type</th><th>Title</th><th>Occurred</th>
                <th>Filed</th><th>Handling</th><th>Actions</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.myReports.map((report) => (
                <tr key={report.id}>
                  <td className="mono">{report.reference}</td>
                  <td>{report.reportTypeLabel ?? EMPTY}</td>
                  <td>{report.title}</td>
                  <td className="mono">{dayMonthYear(report.occurredAt)}</td>
                  <td className="mono">{dayMonthYear(report.reportedAt)}</td>
                  <td>
                    <span className={report.confidential
                      ? 'sr-band sr-band--anon' : 'sr-band sr-band--open'}>
                      {report.anonymous ? 'anonymous' : report.confidential ? 'confidential' : 'named'}
                    </span>
                  </td>
                  <td className="mono">{report.openActions || EMPTY}</td>
                  <td>
                    <span className={`sr-band sr-band--${STATUS_BAND[report.status] ?? 'open'}`}>
                      {report.status.replace('_', ' ').toLowerCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

/* ---------- formulaires et guidance ---------- */

function Guidance({ data }) {
  return (
    <>
      <div className="sr-head">
        <h1 className="sr-h1">Forms &amp; guidance</h1>
        <div className="sr-h2">
          What each kind of report is for, and what the operator commits to when you file one.
        </div>
      </div>

      <div className="sr-grid">
        <div className="sr-main">
          <div className="sr-card">
            <div className="sr-sec">What each kind of report is for</div>
            <div className="sr-types sr-types--static">
              {data.types.map((type) => (
                <div className="sr-type" key={type.key}>
                  <b>{type.label}</b>
                  <span>{type.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sr-card">
            <div className="sr-sec">Named, confidential, anonymous</div>
            <div className="sr-body">
              <b>Named</b> — your name is on the report and the Safety Manager can come back to you
              for a detail. It is the fastest route to a useful analysis.
              <br /><br />
              <b>Confidential</b> — the Safety Manager knows who you are and removes every
              identifying detail before any analysis is shared. The follow-up question is still
              possible; nobody else learns who reported.
              <br /><br />
              <b>Anonymous</b> — nobody knows, including the Safety Manager. Nothing can be asked of
              you afterwards, and the report will not appear in your own list. Use it when that
              protection matters more than the conversation.
            </div>
          </div>
        </div>

        <div className="sr-side">
          <div className="sr-card">
            <div className="sr-sec">Just culture</div>
            <div className="sr-body">{data.justCulturePolicy}</div>
          </div>
          <div className="sr-card sr-urgent">
            <div className="sr-sec">Immediate danger</div>
            <div className="sr-note">
              This desk is not monitored continuously. If the safety of an operation is at immediate
              risk, stop the activity and contact the OCC duty manager, then file the report
              afterwards.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
