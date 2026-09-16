import { useState } from 'react'
import { Check, ClipboardList, Clock } from 'lucide-react'
import Badge from '../../../components/Badge'
import { useMelLibrary, useResolveDefect } from '../../../hooks/useMaintenance'
import { EMPTY, dayMonthYear } from '../../../lib/format'

const TONE = { OPEN: 'ATTENTION', DEFERRED: 'PENDING', CLOSED: 'READY' }
const LABEL = { OPEN: 'Open', DEFERRED: 'Deferred (MEL)', CLOSED: 'Closed' }

/**
 * The record of one defect.
 *
 * <b>A defect leaves the open state in exactly one of two ways</b>: rectified,
 * or deferred under a named MEL line. Both are here and neither is a shortcut —
 * deferring makes you choose the library line it is carried under, because a
 * deferral without one is an aircraft flying on nothing.
 */
export default function DefectFile({ defect }) {
  const resolve = useResolveDefect()
  const [mode, setMode] = useState(null)
  const [libraryItemId, setLibraryItemId] = useState('')
  const [placardFitted, setPlacardFitted] = useState(false)
  const [text, setText] = useState('')

  /* The library of this aircraft's own type. A deferral rests on a line of it,
     which is why this is a list to choose from and not a box to type into. */
  const library = useMelLibrary({ icaoType: defect?.icaoType ?? '' })
  const lines = library.data ?? []
  const chosen = lines.find((line) => line.id === libraryItemId) ?? null

  if (!defect) {
    return (
      <aside className="camo-file">
        <div className="state" style={{ padding: '48px 8px' }}>
          <ClipboardList size={30} strokeWidth={1.3} style={{ opacity: 0.3 }} />
          <h3>No entry selected</h3>
          <p>Select a tech log entry to view its full record.</p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="camo-file">
      <div className="camo-file__head">
        <div>
          <div className="camo-file__reg">{defect.registration}</div>
          <div className="camo-file__type">
            {defect.aircraftType ?? defect.icaoType ?? EMPTY} · ATA {defect.ataChapter ?? EMPTY}
            {defect.system ? ` — ${defect.system}` : ''}
          </div>
        </div>
        <Badge tone={TONE[defect.status] ?? 'NEUTRAL'} warn={defect.status === 'OPEN'}>
          {LABEL[defect.status] ?? defect.status}
        </Badge>
      </div>

      <div className="camo-file__divider" />
      <p className="defect-file__text">{defect.description}</p>

      <div className="camo-file__grid">
        <Cell label="Reported by" value={defect.reportedByName} />
        <Cell label="Date" value={dayMonthYear(defect.reportedAt)} />
        <Cell label="Flight ref" value={defect.flightRef} />
        <Cell label="ATA chapter" value={defect.ataChapter} />
      </div>

      {defect.status === 'DEFERRED' && defect.melReference ? (
        <>
          <div className="camo-file__divider" />
          <h3 className="camo-file__title">MEL deferral</h3>
          <div className="camo-file__grid">
            <Cell label="MEL reference" value={defect.melReference} />
            <Cell label="Category" value={defect.melCategory} />
            <Cell label="Time limit" value={defect.melLimit} />
            <Cell label="Due date" value={dueLabel(defect)} />
          </div>
        </>
      ) : null}

      {defect.status === 'CLOSED' ? (
        <>
          <div className="camo-file__divider" />
          <h3 className="camo-file__title">Rectification</h3>
          <p className="defect-file__text">{defect.correctiveAction ?? EMPTY}</p>
          <p className="defect-file__note">
            Closed by {defect.closedByName ?? EMPTY} · {dayMonthYear(defect.closedAt)}
          </p>
        </>
      ) : null}

      {defect.status !== 'CLOSED' ? (
        <>
          <div className="camo-file__divider" />
          {mode === null ? (
            <div className="defect-file__actions">
              {defect.status === 'OPEN' ? (
                <button type="button" className="btn btn--ghost" onClick={() => setMode('DEFER')}>
                  <Clock size={13} /> Defer to MEL
                </button>
              ) : null}
              <button type="button" className="btn" onClick={() => setMode('CLOSE')}>
                <Check size={13} /> Close defect
              </button>
            </div>
          ) : (
            <div className="defect-file__form">
              {mode === 'DEFER' ? (
                <>
                  <label>
                    <span>MEL / CDL line</span>
                    <select
                      value={libraryItemId}
                      onChange={(event) => setLibraryItemId(event.target.value)}
                    >
                      <option value="">— choose the line this is carried under —</option>
                      {lines.map((line) => (
                        <option key={line.id} value={line.id}>
                          {line.itemRef} · ATA {line.ataChapter} · Cat {line.melCategory} —{' '}
                          {line.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  {!lines.length ? (
                    <p className="defect-file__note">
                      No MEL library line is recorded for {defect.icaoType ?? 'this type'}. A
                      deferral cannot be raised without one.
                    </p>
                  ) : null}

                  {chosen ? (
                    <p className="defect-file__note">
                      {chosen.melCategory === 'A'
                        ? 'Category A — the interval is the one written in the MEL remark.'
                        : `Category ${chosen.melCategory} — ${chosen.rectificationDays} days from today.`}
                      {chosen.placardRequired ? ' A placard is required before release.' : ''}
                    </p>
                  ) : null}

                  {chosen?.placardRequired ? (
                    <label className="defect-file__check">
                      <input
                        type="checkbox"
                        checked={placardFitted}
                        onChange={(event) => setPlacardFitted(event.target.checked)}
                      />
                      <span>The placard is fitted</span>
                    </label>
                  ) : null}
                </>
              ) : null}

              <label>
                <span>{mode === 'DEFER' ? 'Why it is being carried' : 'What was done'}</span>
                <textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} />
              </label>

              {resolve.isError ? (
                <p className="defect-file__error">{resolve.error?.message}</p>
              ) : null}

              <div className="defect-file__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setMode(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={
                    resolve.isPending
                    || !text.trim()
                    || (mode === 'DEFER' && !libraryItemId)
                  }
                  onClick={() =>
                    resolve.mutate(
                      {
                        defectId: defect.id,
                        command:
                          mode === 'DEFER'
                            ? { melLibraryItemId: libraryItemId, placardFitted, remark: text }
                            : { correctiveAction: text },
                      },
                      {
                        onSuccess: () => {
                          setMode(null)
                          setText('')
                          setLibraryItemId('')
                          setPlacardFitted(false)
                        },
                      },
                    )
                  }
                >
                  {mode === 'DEFER' ? 'Defer under this MEL line' : 'Record the rectification'}
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </aside>
  )
}

/** The due date, with what is left of the interval beside it. */
function dueLabel(defect) {
  if (!defect.melDueAt) {
    return 'per MEL remark'
  }
  const date = dayMonthYear(defect.melDueAt)
  if (defect.melDaysRemaining == null) {
    return date
  }
  return defect.melDaysRemaining < 0
    ? `${date} (${-defect.melDaysRemaining} d over)`
    : `${date} (${defect.melDaysRemaining} d left)`
}

function Cell({ label, value }) {
  return (
    <div className="camo-file__cell">
      <div className="lbl">{label}</div>
      <div className="val">{value || EMPTY}</div>
    </div>
  )
}
