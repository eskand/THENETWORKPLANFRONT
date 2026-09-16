import { useState } from 'react'

const MAX_NARRATIVE = 2000

const emptyForm = (type) => ({
  reportType: type ?? '', title: '', date: '', time: '', phaseOfFlight: '',
  stationIcao: '', flightNo: '', registration: '', narrative: '',
  immediateAction: '', reporterSuggestion: '',
  confidential: false, anonymous: false,
})

/**
 * Le formulaire de signalement, en trois blocs.
 *
 * <b>La forme vient de l'annexe A4</b> : « 1 · WHO IS REPORTING », « 2 · WHAT
 * HAPPENED », « 3 · DESCRIBE IT ». Le déclarant est <em>affiché</em>, pas
 * saisi — il vient du sélecteur de la barre du haut. Le traitement est deux
 * cases à cocher, pas trois boutons radio. Date et heure sont deux champs
 * séparés, comme dans le prototype : on se souvient rarement des deux avec la
 * même précision.
 *
 * <b>Trois champs obligatoires</b> — le type, une ligne de titre, le récit.
 * Tout le reste aide l'analyse, et rien ne doit se mettre entre quelqu'un et
 * son signalement : un danger décrit en une ligne vaut mieux qu'un formulaire
 * abandonné.
 */
export default function ReportForm({
  board, reporter, draft, presetType, onSaveDraft, onSubmit, saving, submitting, error,
}) {
  const [form, setForm] = useState(draft ? fromDraft(draft) : emptyForm(presetType))
  const [draftId, setDraftId] = useState(draft?.id ?? null)

  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value })
  const type = board.types.find((entry) => entry.key === form.reportType)
  const ready = form.reportType && form.title.trim() && form.narrative.trim()

  /* Date et heure se saisissent séparément et se recomposent ici : le serveur
     veut un instant, la personne se souvient d'un jour et d'une heure. */
  const occurredAt = () => {
    if (!form.date) return null
    return new Date(`${form.date}T${form.time || '00:00'}:00Z`).toISOString()
  }

  const payload = () => ({
    draftId,
    reportType: form.reportType || null,
    title: form.title,
    narrative: form.narrative,
    occurredAt: occurredAt(),
    phaseOfFlight: form.phaseOfFlight || null,
    stationIcao: form.stationIcao || null,
    flightNo: form.flightNo || null,
    registration: form.registration || null,
    immediateAction: form.immediateAction || null,
    reporterSuggestion: form.reporterSuggestion || null,
    anonymous: form.anonymous,
    confidential: form.confidential || form.anonymous,
  })

  return (
    <div className="sr-grid">
      <div className="sr-main">
        {/* ---------- 1 ---------- */}
        <div className="sr-card">
          <div className="sr-sec">1 · Who is reporting</div>
          <div className="sr-f2">
            <div className="sr-fg">
              <label>Reporter</label>
              <div className={reporter ? 'sr-static' : 'sr-static sr-static--warn'}>
                {reporter ? reporter.fullName : 'No reporter selected'}
                <span>
                  {reporter
                    ? `${titleOf(reporter.mainRole)}${reporter.baseIcao ? ` · base ${reporter.baseIcao}` : ''}`
                    : 'Pick a name in the bar above — a report has to carry an author'}
                </span>
              </div>
            </div>
            <div className="sr-fg">
              <label>Handling</label>
              <label className="sr-chk">
                <input type="checkbox" checked={form.confidential} disabled={form.anonymous}
                       onChange={(event) =>
                         setForm({ ...form, confidential: event.target.checked })} />
                Confidential — de-identify me before analysis
              </label>
              <label className="sr-chk">
                <input type="checkbox" checked={form.anonymous}
                       onChange={(event) => setForm({
                         ...form,
                         anonymous: event.target.checked,
                         // Anonyme implique confidentiel : nul ne peut
                         // de-identifier ce que nul ne peut identifier.
                         confidential: event.target.checked ? true : form.confidential,
                       })} />
                File anonymously — my name is not recorded at all
              </label>
              {type?.concernsTheReporter && form.anonymous ? (
                <div className="sr-resolve sr-resolve--bad">
                  A fatigue report concerns your own fitness for duty. Filed anonymously, nobody can
                  be taken off a duty because of it.
                </div>
              ) : null}
            </div>
          </div>
          <div className="sr-note">{board.justCulturePolicy}</div>
        </div>

        {/* ---------- 2 ---------- */}
        <div className="sr-card">
          <div className="sr-sec">2 · What happened</div>

          <div className="sr-fg">
            <label>Type of report <i>required</i></label>
            <div className="sr-types">
              {board.types.map((entry) => (
                <button type="button" key={entry.key}
                        className={entry.key === form.reportType ? 'sr-type sr-type--on' : 'sr-type'}
                        onClick={() => setForm({ ...form, reportType: entry.key })}>
                  <b>{entry.label}</b>
                  <span>{entry.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sr-fg">
            <label htmlFor="sr-title">Title <i>required</i></label>
            <input id="sr-title" className="sr-inp" type="text" value={form.title}
                   onChange={set('title')} maxLength={160}
                   placeholder="One factual line — what happened" />
          </div>

          <div className="sr-f3">
            <div className="sr-fg">
              <label htmlFor="sr-date">Date (UTC)</label>
              <input id="sr-date" className="sr-inp" type="date" value={form.date}
                     onChange={set('date')} />
            </div>
            <div className="sr-fg">
              <label htmlFor="sr-time">Time (UTC)</label>
              <input id="sr-time" className="sr-inp" type="time" value={form.time}
                     onChange={set('time')} />
            </div>
            <div className="sr-fg">
              <label htmlFor="sr-phase">Phase</label>
              <select id="sr-phase" className="sr-inp" value={form.phaseOfFlight}
                      onChange={set('phaseOfFlight')}>
                <option value="">N/A</option>
                {board.phases.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
              </select>
            </div>
          </div>

          <div className="sr-f3">
            <div className="sr-fg">
              <label htmlFor="sr-apt">Aerodrome (ICAO or IATA)</label>
              <input id="sr-apt" className="sr-inp" type="text" value={form.stationIcao}
                     onChange={set('stationIcao')} maxLength={4} placeholder="LFPG"
                     style={{ textTransform: 'uppercase' }} />
              <div className="sr-resolve">Checked against the Airport Data register.</div>
            </div>
            <div className="sr-fg">
              <label htmlFor="sr-flight">Flight number</label>
              <input id="sr-flight" className="sr-inp" type="text" value={form.flightNo}
                     onChange={set('flightNo')} placeholder="TNP101"
                     style={{ textTransform: 'uppercase' }} />
            </div>
            <div className="sr-fg">
              <label htmlFor="sr-reg">Aircraft</label>
              <select id="sr-reg" className="sr-inp" value={form.registration}
                      onChange={set('registration')}>
                <option value="">— not applicable —</option>
                {board.registrations.map((tail) => <option key={tail} value={tail}>{tail}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ---------- 3 ---------- */}
        <div className="sr-card">
          <div className="sr-sec">3 · Describe it</div>
          <div className="sr-fg">
            <label htmlFor="sr-desc">What happened <i>required</i></label>
            <textarea id="sr-desc" className="sr-ta" rows={8} value={form.narrative}
                      onChange={set('narrative')} maxLength={MAX_NARRATIVE}
                      placeholder="Facts first: conditions, sequence of events, what was observed, what the consequence was. Avoid naming individuals." />
            <div className="sr-counter">{form.narrative.length} / {MAX_NARRATIVE}</div>
          </div>
          <div className="sr-f2">
            <div className="sr-fg">
              <label htmlFor="sr-action">Immediate action taken</label>
              <textarea id="sr-action" className="sr-ta" rows={3} value={form.immediateAction}
                        onChange={set('immediateAction')} placeholder="What was done at the time." />
            </div>
            <div className="sr-fg">
              <label htmlFor="sr-sugg">Your suggestion</label>
              <textarea id="sr-sugg" className="sr-ta" rows={3} value={form.reporterSuggestion}
                        onChange={set('reporterSuggestion')}
                        placeholder="What would prevent this happening again." />
            </div>
          </div>
        </div>

        {error ? (
          <div className="sr-error">
            The report was not sent — {error?.response?.data?.message ?? error.message}
          </div>
        ) : null}

        <div className="sr-actions">
          <button type="button" className="sr-btn" disabled={saving || !reporter}
                  onClick={() => onSaveDraft(payload(), (saved) => setDraftId(saved.id))}>
            {saving ? 'Saving…' : 'Save as draft'}
          </button>
          <button type="button" className="sr-btn"
                  onClick={() => { setForm(emptyForm(presetType)); setDraftId(null) }}>
            Clear
          </button>
          <button type="button" className="sr-btn sr-btn--primary"
                  disabled={!ready || submitting || !reporter}
                  onClick={() => onSubmit(payload(), () => {
                    setForm(emptyForm(presetType)); setDraftId(null)
                  })}>
            {submitting ? 'Sending…' : 'Submit to the Safety Manager'}
          </button>
        </div>
      </div>

      {/* ---------- colonne de droite ---------- */}
      <div className="sr-side">
        <div className="sr-card">
          <div className="sr-sec">What happens next</div>
          <ol className="sr-steps">
            <li>Your report is entered in the occurrence register straight away.</li>
            <li>The Safety Manager classifies it and assesses the risk on the ICAO 5×5 matrix.</li>
            <li>
              If it is reportable, it is notified to the authority within 72 hours under
              Regulation (EU) 376/2014.
            </li>
            <li>If more detail is needed you will see a question under <b>Action required</b>.</li>
            <li>You can follow the outcome under <b>My reports</b>.</li>
          </ol>
        </div>

        <div className="sr-card">
          <div className="sr-sec">Nothing went wrong?</div>
          <div className="sr-body">
            If there is no occurrence but you learned something worth passing on, submit it as
            experience feedback instead. A REX is never disciplinary and never becomes a file on you.
          </div>
          <div className="sr-actions">
            <button type="button" className="sr-btn"
                    onClick={() => setForm({ ...form, reportType: 'REX' })}>
              Submit a REX instead
            </button>
          </div>
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
  )
}

function titleOf(role) {
  if (!role) return ''
  const lower = role.replace('_', ' ').toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function fromDraft(draft) {
  const occurred = draft.occurredAt ? new Date(draft.occurredAt) : null
  return {
    reportType: draft.reportType ?? '',
    title: draft.title ?? '',
    date: occurred ? occurred.toISOString().slice(0, 10) : '',
    time: occurred ? occurred.toISOString().slice(11, 16) : '',
    phaseOfFlight: draft.phaseOfFlight ?? '',
    stationIcao: draft.stationIcao ?? '',
    flightNo: draft.flightNo ?? '',
    registration: draft.registration ?? '',
    narrative: draft.narrative ?? '',
    immediateAction: draft.immediateAction ?? '',
    reporterSuggestion: draft.reporterSuggestion ?? '',
    confidential: draft.confidential ?? false,
    anonymous: draft.anonymous ?? false,
  }
}
