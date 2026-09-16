import { useState } from 'react'
import { useErpLevelChange, useErpSitrep, useErpStandDown, useErpSubject } from '../../../hooks/useErp'
import { dayMonthYear, hhmm } from '../../../lib/format'

/**
 * Command.
 *
 * Armed, this is the readiness list and the exercise register. Live, it is the
 * hero, the four figures, the aircraft, the situation and the cells. Same tab,
 * because the person opening it does not yet know which of the two they need.
 */
export default function CommandPage({ data, elapsed, go }) {
  return data.active
    ? <CommandLive data={data} elapsed={elapsed} go={go} />
    : <CommandIdle data={data} go={go} />
}

/* ─────────────────────────────────────────────────────────── armed ── */

function CommandIdle({ data, go }) {
  return (
    <div className="erp-page">
      <div className="erp-armedhero">
        <div className="erp-ah-l">
          <span className="erp-dot" />
          ERP ARMED
        </div>
        <div className="erp-ah-t">No emergency is active</div>
        <div className="erp-ah-s">
          The plan is armed and the crisis organisation is on call. Activation requires the OCC
          Manager and the Safety Manager acting together, after a joint assessment of the
          situation.
        </div>
        <div className="erp-ah-b">
          <button type="button" className="erp-btn danger big" onClick={() => go('activate')}>
            Assess a situation
          </button>
          <button type="button" className="erp-btn ghost" onClick={() => go('reference')}>
            Emergency reference
          </button>
          <button type="button" className="erp-btn ghost" onClick={() => go('log')}>
            Crisis log
          </button>
        </div>
      </div>

      <div className="erp-cols">
        <div className="erp-card">
          <div className="erp-ch">
            <span>Readiness</span>
          </div>
          <div className="erp-ready">
            {data.readiness.map((row) => (
              <div className="erp-rrow" key={row.name}>
                <span className={`erp-rdot ${row.ok ? 'ok' : 'bad'}`} />
                <span className="erp-rn">{row.name}</span>
                <span className="erp-rl">{row.detail}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="erp-card">
          <div className="erp-ch">
            <span>Exercise and activation history</span>
          </div>
          <div className="erp-hist">
            {data.history.map((entry) => (
              <div className="erp-hrow" key={entry.id}>
                <span className={`erp-hlv lv${entry.level}`}>L{entry.level}</span>
                <div>
                  <b>
                    {entry.reference} — {entry.eventLabel}
                  </b>
                  <span>
                    {dayMonthYear(entry.activatedAt)} · stood down by {entry.stoodDownBy || '—'}
                  </span>
                </div>
                <span className="erp-hst closed">closed</span>
              </div>
            ))}
            {data.exercises.map((exercise) => (
              <div className="erp-hrow" key={exercise.id}>
                <span className="erp-hlv drill">EX</span>
                <div>
                  <b>
                    {exercise.reference} — {exercise.scenario}
                  </b>
                  <span>
                    {exercise.exerciseType} · {dayMonthYear(exercise.heldOn)} ·{' '}
                    {exercise.status === 'PLANNED'
                      ? 'planned'
                      : `${exercise.participants} participants, ${exercise.findings} findings`}
                  </span>
                </div>
                <span className={`erp-hst ${exercise.status.toLowerCase()}`}>
                  {exercise.status.toLowerCase()}
                </span>
              </div>
            ))}
            {!data.history.length && !data.exercises.length ? (
              <div className="erp-empty small">
                Nothing on the register. A plan that has never been exercised is not a plan.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── live ── */

function CommandLive({ data, elapsed, go }) {
  const active = data.active
  const [editing, setEditing] = useState(false)
  const notifications = active.notifications.filter((entry) => entry.required)
  const made = notifications.filter((entry) => entry.made).length

  return (
    <div className="erp-page">
      <div className={`erp-hero lv${active.level}`}>
        <div className="erp-hero-l">
          <div className="erp-hero-lv">LEVEL {active.level}</div>
          <div className="erp-hero-nm">{active.definition?.name}</div>
          <div className="erp-hero-ev">{active.eventLabel}</div>
        </div>
        <div className="erp-hero-c">
          <div className="erp-hero-ref">{active.reference}</div>
          <div className="erp-hero-clock">{elapsed}</div>
          <div className="erp-hero-since">
            since {hhmm(active.activatedAt)} UTC · activated by {active.initiatedByName}
          </div>
        </div>
        <div className="erp-hero-r">
          <LevelButton active={active} />
          <button type="button" className="erp-btn danger" onClick={() => go('checklists')}>
            Open checklists
          </button>
          <StandDownButton active={active} />
        </div>
      </div>

      <div className="erp-stats">
        <Stat
          label="Phase 0"
          value={`${active.phaseZero.done} / ${active.phaseZero.total}`}
          sub={active.phaseZero.percent === 100 ? 'complete' : 'in progress'}
          colour={active.phaseZero.percent === 100 ? '#1f9d5c' : '#b8790a'}
          bar={active.phaseZero.percent}
        />
        <Stat
          label="Actions outstanding"
          value={active.outstanding}
          sub="across all cells"
          colour={active.outstanding ? '#C8202F' : '#1f9d5c'}
        />
        <Stat
          label="Notifications"
          value={`${made} / ${notifications.length}`}
          sub={made === notifications.length ? 'all made' : 'outstanding'}
          colour={made === notifications.length ? '#1f9d5c' : '#C8202F'}
          bar={notifications.length ? Math.round((made / notifications.length) * 100) : 100}
        />
        <Stat
          label="Situation reports"
          value={active.sitreps.length}
          sub="latest picture"
          colour="#2f6fb0"
        />
      </div>

      <div className="erp-cols">
        <div>
          <SubjectPanel active={active} editing={editing} setEditing={setEditing} />
          <SituationPanel active={active} />
          <CellsPanel active={active} go={go} />
        </div>
        <div>
          <div className="erp-card">
            <div className="erp-ch">
              <span>Immediate priorities</span>
            </div>
            <div className="erp-prio">
              {active.priorities.map((priority) => (
                <div
                  className="erp-pr"
                  style={{ '--c': priority.colour }}
                  key={priority.text}
                  onClick={() => go(priority.target)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') go(priority.target)
                  }}
                >
                  <span />
                  {priority.text}
                </div>
              ))}
            </div>
          </div>

          <div className="erp-card">
            <div className="erp-ch">
              <span>Authorisation</span>
            </div>
            <div className="erp-auth">
              <div>
                <span>Initiated by</span>
                <b>{active.initiatedByName}</b>
                <i>{active.initiatedByRole || '—'}</i>
              </div>
              <div>
                <span>Concurred by</span>
                <b>{active.concurredByName || '—'}</b>
                <i>{active.concurredByRole || '—'}</i>
              </div>
              {active.overrideReason ? (
                <div className="erp-override">
                  Accountable Manager override — {active.overrideReason}
                </div>
              ) : null}
            </div>
          </div>

          <div className="erp-card">
            <div className="erp-ch">
              <span>Latest log</span>
              <div className="erp-chbtn">
                <button type="button" className="erp-btn tiny" onClick={() => go('log')}>
                  Full log
                </button>
              </div>
            </div>
            <div className="erp-loglite">
              {data.log.slice(0, 8).map((entry) => (
                <div className="erp-lg" key={entry.id}>
                  <span className="erp-lg-t">{hhmm(entry.at)}</span>
                  <span className="erp-lg-x">{entry.text}</span>
                </div>
              ))}
              {!data.log.length ? <div className="erp-empty small">Nothing logged yet.</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, colour, bar }) {
  return (
    <div className="erp-stat" style={{ '--c': colour }}>
      <div className="erp-st-l">{label}</div>
      <div className="erp-st-v">{value}</div>
      <div className="erp-st-s">{sub}</div>
      {bar != null ? (
        <div className="erp-st-b">
          <div style={{ width: `${bar}%` }} />
        </div>
      ) : null}
    </div>
  )
}

/* ── the aircraft, filled in as it arrives ─────────────────────────────── */

const SUBJECT_FIELDS = [
  ['flight', 'Flight', 'TNP101'],
  ['registration', 'Registration', 'TS-NPA'],
  ['aircraftType', 'Aircraft type', 'Falcon 2000LXS'],
  ['origin', 'Departure', 'DTTA'],
  ['destination', 'Destination', 'LFPG'],
  ['pob', 'Persons on board', '2 crew + 6 passengers'],
  ['lastPosition', 'Last known position', 'lat, lon or fix'],
  ['squawk', 'Squawk', '7700'],
  ['fuelState', 'Fuel / endurance', '1 h 40 remaining'],
  ['dangerousGoods', 'Dangerous goods (NOTOC)', 'None declared'],
  ['souls', 'Souls on board — detail', 'crew / pax / infants'],
]

function SubjectPanel({ active, editing, setEditing }) {
  const subject = active.subject
  const save = useErpSubject()
  const [draft, setDraft] = useState(subject)
  const [actor, setActor] = useState('')

  const start = () => {
    setDraft(subject)
    setEditing(true)
  }

  if (!editing) {
    return (
      <div className="erp-card">
        <div className="erp-ch">
          <span>Subject aircraft</span>
          <div className="erp-chbtn">
            <button type="button" className="erp-btn tiny" onClick={start}>
              Edit
            </button>
          </div>
        </div>
        <div className="erp-acgrid">
          <Field label="Flight" value={subject.flight} />
          <Field label="Registration" value={subject.registration} />
          <Field label="Type" value={subject.aircraftType} />
          <Field
            label="Route"
            value={
              subject.origin || subject.destination
                ? `${subject.origin || '?'} → ${subject.destination || '?'}`
                : ''
            }
          />
          <Field label="Persons on board" value={subject.pob} />
          <Field label="Dangerous goods" value={subject.dangerousGoods} />
          <Field label="Last position" value={subject.lastPosition} />
          <Field label="Squawk" value={subject.squawk} />
          <Field label="Fuel / endurance" value={subject.fuelState} />
        </div>
      </div>
    )
  }

  return (
    <div className="erp-card editing">
      <div className="erp-ch">
        <span>Subject aircraft — editing</span>
        <div className="erp-chbtn">
          <button type="button" className="erp-btn tiny" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="erp-btn tiny danger"
            disabled={!actor.trim() || save.isPending}
            onClick={() => {
              save.mutate(
                { ...draft, actor },
                { onSuccess: () => setEditing(false) },
              )
            }}
          >
            Save changes
          </button>
        </div>
      </div>

      <div className="erp-f3">
        {SUBJECT_FIELDS.map(([key, label, placeholder]) => (
          <div className="erp-fg" key={key}>
            <label htmlFor={`es-${key}`}>{label}</label>
            <input
              id={`es-${key}`}
              className="erp-inp"
              value={draft[key] || ''}
              placeholder={placeholder}
              onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
            />
          </div>
        ))}
        <div className="erp-fg">
          <label htmlFor="es-actor">Recorded by</label>
          <input
            id="es-actor"
            className="erp-inp"
            value={actor}
            placeholder="your name"
            onChange={(event) => setActor(event.target.value)}
          />
        </div>
      </div>

      <div className="erp-note">
        Every change is written to the crisis log with its previous value. Correcting a figure is
        expected; overwriting history is not.
      </div>
    </div>
  )
}

function Field({ label, value }) {
  const empty = !value || value === '? → ?'
  return (
    <div className={`erp-fld${empty ? ' empty' : ''}`}>
      <span>{label}</span>
      <b>{empty ? 'not recorded' : value}</b>
    </div>
  )
}

/* ── the situation, as it stands now ───────────────────────────────────── */

function SituationPanel({ active }) {
  const post = useErpSitrep()
  const [body, setBody] = useState('')
  const [author, setAuthor] = useState('')

  return (
    <div className="erp-card">
      <div className="erp-ch">
        <span>Situation</span>
        <div className="erp-chbtn">
          <span className="erp-p0p">
            {active.sitreps.length} report{active.sitreps.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      <div className="erp-sitbox">
        <textarea
          className="erp-ta"
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Describe the situation as it stands now: what is confirmed, what has changed, what is still unknown. Keep it factual and short."
        />
        <div className="erp-actions">
          <input
            className="erp-inp small"
            value={author}
            placeholder="your name"
            onChange={(event) => setAuthor(event.target.value)}
          />
          <button
            type="button"
            className="erp-btn danger"
            disabled={!body.trim() || !author.trim() || post.isPending}
            onClick={() => post.mutate({ body, author }, { onSuccess: () => setBody('') })}
          >
            Post situation report
          </button>
          <span className="erp-hint">
            timestamped UTC · recorded at the level in force · appears in the crisis log
          </span>
        </div>
      </div>

      {active.sitreps.length ? (
        <div className="erp-sitlist">
          {active.sitreps.map((sitrep, index) => (
            <div className={`erp-sit${index === 0 ? ' latest' : ''}`} key={sitrep.id}>
              <div className="erp-sit-h">
                <span className="erp-sit-t">{hhmm(sitrep.at)} UTC</span>
                {index === 0 ? <span className="erp-sit-badge">current</span> : null}
                <span className="erp-sit-lv">Level {sitrep.level}</span>
                <span className="erp-sit-by">{sitrep.author}</span>
              </div>
              <div className="erp-sit-x">{sitrep.body}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="erp-empty small">
          No situation report yet. The first one should say what is known and what is not.
        </div>
      )}
    </div>
  )
}

function CellsPanel({ active, go }) {
  return (
    <div className="erp-card">
      <div className="erp-ch">
        <span>Emergency Response Centre — cell readiness</span>
        <div className="erp-chbtn">
          <button type="button" className="erp-btn tiny" onClick={() => go('checklists')}>
            Work the checklists
          </button>
        </div>
      </div>
      <div className="erp-cells">
        {active.cells
          .filter((cell) => cell.itemsTotal > 0)
          .map((cell) => (
            <div
              className={`erp-cell${cell.percent === 100 ? ' done' : ''}`}
              style={{ '--c': cell.colour }}
              key={cell.code}
              onClick={() => go('checklists')}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter') go('checklists')
              }}
            >
              <div className="erp-cell-h">
                <span className="erp-cell-n">{cell.name}</span>
                <span className="erp-cell-p">
                  {cell.itemsDone}/{cell.itemsTotal}
                </span>
              </div>
              <div className="erp-cell-b">
                <div style={{ width: `${cell.percent}%` }} />
              </div>
              <div className="erp-cell-l">{cell.leadName || '— unassigned —'}</div>
            </div>
          ))}
      </div>
    </div>
  )
}

/* ── changing the level, and closing the event ─────────────────────────── */

function LevelButton({ active }) {
  const change = useErpLevelChange()
  const [open, setOpen] = useState(false)
  const [level, setLevel] = useState(String(active.level))
  const [reason, setReason] = useState('')
  const [actor, setActor] = useState('')

  if (!open) {
    return (
      <button type="button" className="erp-btn ghost" onClick={() => setOpen(true)}>
        Change level
      </button>
    )
  }
  return (
    <div className="erp-card">
      <div className="erp-fg">
        <label htmlFor="erp-newlevel">New level</label>
        <select
          id="erp-newlevel"
          className="erp-inp"
          value={level}
          onChange={(event) => setLevel(event.target.value)}
        >
          {[0, 1, 2, 3, 4].map((value) => (
            <option key={value} value={value}>
              Level {value}
            </option>
          ))}
        </select>
      </div>
      <div className="erp-fg">
        <label htmlFor="erp-levelreason">Why</label>
        <input
          id="erp-levelreason"
          className="erp-inp"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="what changed"
        />
      </div>
      <div className="erp-fg">
        <label htmlFor="erp-levelactor">Decided by</label>
        <input
          id="erp-levelactor"
          className="erp-inp"
          value={actor}
          onChange={(event) => setActor(event.target.value)}
        />
      </div>
      <div className="erp-actions">
        <button type="button" className="erp-btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button
          type="button"
          className="erp-btn danger"
          disabled={!reason.trim() || !actor.trim() || change.isPending}
          onClick={() =>
            change.mutate(
              { level: Number(level), reason, actor },
              { onSuccess: () => setOpen(false) },
            )
          }
        >
          Set level {level}
        </button>
      </div>
      {change.isError ? <div className="erp-authbad">{change.error?.message}</div> : null}
    </div>
  )
}

function StandDownButton({ active }) {
  const standDown = useErpStandDown()
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState('')
  const [by, setBy] = useState('')

  if (!open) {
    return (
      <button type="button" className="erp-btn" onClick={() => setOpen(true)}>
        Stand down
      </button>
    )
  }
  return (
    <div className="erp-card">
      <div className="erp-authnote">
        Stand down only when every criterion in the Reference tab is met. The event then moves to
        the safety process; the occurrence stays open in the SMS register.
      </div>
      <div className="erp-fg">
        <label htmlFor="erp-sd-outcome">Outcome</label>
        <textarea
          id="erp-sd-outcome"
          className="erp-ta"
          rows={3}
          value={outcome}
          onChange={(event) => setOutcome(event.target.value)}
        />
      </div>
      <div className="erp-fg">
        <label htmlFor="erp-sd-by">Stood down by</label>
        <input
          id="erp-sd-by"
          className="erp-inp"
          value={by}
          onChange={(event) => setBy(event.target.value)}
        />
      </div>
      <div className="erp-actions">
        <button type="button" className="erp-btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button
          type="button"
          className="erp-btn danger"
          disabled={!outcome.trim() || !by.trim() || standDown.isPending}
          onClick={() =>
            standDown.mutate(
              { activationId: active.id, outcome, stoodDownBy: by },
              { onSuccess: () => setOpen(false) },
            )
          }
        >
          Stand down {active.reference}
        </button>
      </div>
      {standDown.isError ? <div className="erp-authbad">{standDown.error?.message}</div> : null}
    </div>
  )
}
