import { useMemo, useState } from 'react'
import { LoadingState } from '../../../components/States'
import { useAssessment, useErpActivate, useErpCatalogue } from '../../../hooks/useErp'

const ACTIVATORS = [
  'Post Holder — Flight Operations / OCC Manager',
  'Safety Manager',
  'Accountable Manager',
]

/**
 * Situation assessment.
 *
 * The level is derived from the event and the answers, and the derivation runs
 * on the server: it decides who is called, which clocks start and what the
 * operator says in public. It can raise the level and never lower it below the
 * event's own baseline.
 */
export default function ActivatePage({ data, go }) {
  const catalogue = useErpCatalogue()
  const activate = useErpActivate()

  const [eventCode, setEventCode] = useState(null)
  const [answers, setAnswers] = useState({})
  const [detail, setDetail] = useState({
    flight: '', registration: '', aircraftType: '', origin: '', destination: '',
    pob: '', dangerousGoods: '', lastPosition: '', notes: '',
  })
  const [initiator, setInitiator] = useState({ name: '', role: ACTIVATORS[0] })
  const [concurrence, setConcurrence] = useState({ name: '', role: ACTIVATORS[1] })
  const [override, setOverride] = useState('')
  const [problem, setProblem] = useState(null)

  const assess = useAssessment(eventCode, answers)

  const verdict = assess.data

  const chosen = useMemo(() => {
    if (!eventCode || !catalogue.data) return null
    return catalogue.data.categories
      .flatMap((category) => category.events)
      .find((event) => event.code === eventCode) ?? null
  }, [catalogue.data, eventCode])

  if (data.active) {
    return (
      <div className="erp-page">
        <div className="erp-warn">
          An activation is already live ({data.active.reference}). Change its level from Command,
          or stand it down before starting a new one.
        </div>
        <div className="erp-actions">
          <button type="button" className="erp-btn" onClick={() => go('command')}>
            Back to command
          </button>
        </div>
      </div>
    )
  }

  if (catalogue.isError) {
    return (
      <div className="erp-page">
        <div className="erp-warn">
          The emergency catalogue could not be read: {catalogue.error?.message}
        </div>
      </div>
    )
  }
  if (!catalogue.data) {
    return <LoadingState label="Loading the emergency catalogue…" />
  }

  const level = verdict?.level ?? 0
  const definition = verdict?.definition

  const toggleAnswer = (question, value) => {
    setAnswers((current) => {
      const next = { ...current }
      if (next[question] === value) delete next[question]
      else next[question] = value
      return next
    })
  }

  const submit = () => {
    setProblem(null)
    if (!eventCode) {
      setProblem('Choose what has happened before activating.')
      return
    }
    if (!initiator.name.trim()) {
      setProblem('The activation must name who initiated it.')
      return
    }
    /* The plan's rule, checked here for a useful message and again in the
       service and in the database: two people, or a reasoned override. */
    if (!concurrence.name.trim() && !override.trim()) {
      setProblem(
        'Two signatures are required: the OCC Manager and the Safety Manager acting together, '
        + 'or an Accountable Manager override with its reason.',
      )
      return
    }
    if (initiator.name.trim() === concurrence.name.trim()) {
      setProblem('The same person cannot both initiate and concur.')
      return
    }

    activate.mutate(
      {
        kind: 'REAL',
        level,
        eventCode,
        eventLabel: chosen?.label ?? 'Unclassified event',
        situation: detail.notes.trim() || (chosen?.note ?? 'No initial notes recorded.'),
        initiatedByName: initiator.name.trim(),
        initiatedByRole: initiator.role,
        concurredByName: concurrence.name.trim() || null,
        concurredByRole: concurrence.name.trim() ? concurrence.role : null,
        overrideReason: override.trim() || null,
        flight: detail.flight,
        registration: detail.registration,
        aircraftType: detail.aircraftType,
        origin: detail.origin,
        destination: detail.destination,
        pob: detail.pob,
      },
      {
        onSuccess: () => go('command'),
        onError: (error) => setProblem(error?.message ?? 'The activation was refused.'),
      },
    )
  }

  return (
    <div className="erp-page">
      <div className="erp-head">
        <div>
          <div className="erp-h1">Situation assessment</div>
          <div className="erp-h2">
            The level is derived from the event and the answers below. The assessment can raise the
            level but never lower it below the event’s own baseline.
          </div>
        </div>
      </div>

      <div className="erp-cols wide">
        <div>
          <div className="erp-card">
            <div className="erp-ch">
              <span>1 · What has happened</span>
            </div>
            <div className="erp-evgrid">
              {catalogue.data.categories.map((category) => (
                <div className="erp-evcat" key={category.code}>
                  <div className="erp-evcat-t">{category.name}</div>
                  {category.events.map((event) => (
                    <div
                      className={`erp-ev${eventCode === event.code ? ' on' : ''}`}
                      key={event.code}
                      onClick={() => setEventCode(event.code)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === 'Enter') setEventCode(event.code)
                      }}
                    >
                      <span className="erp-ev-l">{event.label}</span>
                      <span className={`erp-ev-b lv${event.baseLevel}`}>L{event.baseLevel}</span>
                      {event.squawk ? <span className="erp-ev-s">{event.squawk}</span> : null}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {chosen ? <div className="erp-evnote">{chosen.note}</div> : null}
          </div>

          <div className="erp-card">
            <div className="erp-ch">
              <span>2 · Situation questions</span>
              <div className="erp-chbtn">
                <span className="erp-qprog">
                  {verdict?.answered ?? 0} / {verdict?.total ?? catalogue.data.questions.length}
                </span>
              </div>
            </div>
            {catalogue.data.questions.map((question) => (
              <div className="erp-q" key={question.code}>
                <div className="erp-q-t">{question.question}</div>
                <div className="erp-q-o">
                  {question.options.map((option) => (
                    <div
                      className={`erp-opt${answers[question.code] === option.value ? ' on' : ''}`}
                      key={option.value}
                      onClick={() => toggleAnswer(question.code, option.value)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === 'Enter') toggleAnswer(question.code, option.value)
                      }}
                    >
                      {option.label}
                      {option.level > 0 ? (
                        <span className={`erp-opt-l lv${option.level}`}>L{option.level}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="erp-card">
            <div className="erp-ch">
              <span>3 · Aircraft and event detail</span>
            </div>
            <div className="erp-f2">
              <Input id="ea-flight" label="Flight" value={detail.flight} set={setDetail} field="flight" placeholder="TNP101" />
              <Input id="ea-reg" label="Registration" value={detail.registration} set={setDetail} field="registration" placeholder="TS-NPA" />
            </div>
            <div className="erp-f3">
              <Input id="ea-type" label="Aircraft type" value={detail.aircraftType} set={setDetail} field="aircraftType" placeholder="Falcon 2000LXS" />
              <Input id="ea-from" label="From" value={detail.origin} set={setDetail} field="origin" placeholder="DTTA" />
              <Input id="ea-to" label="To" value={detail.destination} set={setDetail} field="destination" placeholder="LFPG" />
            </div>
            <div className="erp-f2">
              <Input id="ea-pob" label="Persons on board" value={detail.pob} set={setDetail} field="pob" placeholder="crew + passengers" />
              <Input id="ea-dg" label="Dangerous goods (NOTOC)" value={detail.dangerousGoods} set={setDetail} field="dangerousGoods" placeholder="None declared" />
            </div>
            <div className="erp-fg">
              <label htmlFor="ea-notes">Initial notes — facts only</label>
              <textarea
                id="ea-notes"
                className="erp-ta"
                rows={3}
                value={detail.notes}
                placeholder="What is known, from whom, at what time."
                onChange={(event) => setDetail((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
          </div>
        </div>

        <div>
          <div className={`erp-card erp-verdict lv${level}`}>
            <div className="erp-vd-l">Assessed level</div>
            <div className="erp-vd-n">{level}</div>
            <div className="erp-vd-t">{definition?.name ?? '—'}</div>
            <div className="erp-vd-d">{definition?.description}</div>
            <div className="erp-vd-a">{definition?.activation}</div>
            <div className="erp-vd-s">{definition?.standsUp}</div>
            {verdict?.escalated ? (
              <div className="erp-vd-esc">
                Escalated above the event baseline (L{verdict.baseLevel}) by the assessment.
              </div>
            ) : null}
            {verdict && !verdict.complete ? (
              <div className="erp-vd-warn">
                {verdict.total - verdict.answered} question(s) unanswered — the level may rise once
                they are.
              </div>
            ) : null}
          </div>

          {verdict?.drivers?.length ? (
            <div className="erp-card">
              <div className="erp-ch">
                <span>What is driving the level</span>
              </div>
              <div className="erp-drv">
                {verdict.drivers.map((driver) => (
                  <div className="erp-drow" key={`${driver.from}-${driver.text}`}>
                    <span className={`erp-dlv lv${driver.level}`}>L{driver.level}</span>
                    <div>
                      <b>{driver.text}</b>
                      <span>{driver.from}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="erp-card erp-auth-card">
            <div className="erp-ch">
              <span>Authorisation — two signatures required</span>
            </div>
            <div className="erp-authnote">
              The ERP is activated by the OCC Manager or the Safety Manager, with the concurrence
              of the other. The Accountable Manager may override if one of the two cannot be
              reached; the override and its reason are recorded on the activation.
            </div>

            <Signature id="ea-init" title="Initiated by" value={initiator} set={setInitiator} />
            <Signature id="ea-conc" title="Concurrence of" value={concurrence} set={setConcurrence} />

            <div className="erp-fg">
              <label htmlFor="ea-override">Accountable Manager override — reason</label>
              <input
                id="ea-override"
                className="erp-inp"
                value={override}
                placeholder="left empty unless activating alone"
                onChange={(event) => setOverride(event.target.value)}
              />
            </div>

            {problem ? <div className="erp-authbad">{problem}</div> : null}

            <button
              type="button"
              className="erp-btn danger big block"
              disabled={activate.isPending}
              onClick={submit}
            >
              {level >= 2 ? `ACTIVATE ERP — LEVEL ${level}` : `RECORD EVENT — LEVEL ${level}`}
            </button>

            {level < 2 ? (
              <div className="erp-authnote">
                At Level 0 or 1 the crisis organisation does not stand up. The event is recorded and
                an occurrence is raised in the SMS.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function Input({ id, label, value, set, field, placeholder }) {
  return (
    <div className="erp-fg">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="erp-inp"
        value={value}
        placeholder={placeholder}
        onChange={(event) => set((current) => ({ ...current, [field]: event.target.value }))}
      />
    </div>
  )
}

function Signature({ id, title, value, set }) {
  return (
    <div className="erp-fg">
      <label htmlFor={`${id}-name`}>{title}</label>
      <input
        id={`${id}-name`}
        className="erp-inp"
        value={value.name}
        placeholder="name"
        onChange={(event) => set((current) => ({ ...current, name: event.target.value }))}
      />
      <select
        id={`${id}-role`}
        className="erp-inp"
        value={value.role}
        onChange={(event) => set((current) => ({ ...current, role: event.target.value }))}
      >
        {ACTIVATORS.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
    </div>
  )
}
