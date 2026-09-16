import { useState } from 'react'
import { useErpNotify, useErpReference } from '../../../hooks/useErp'
import { hhmm } from '../../../lib/format'

/**
 * Statutory notifications.
 *
 * The deadline is shown as the text writes it — "Immediately", "72 hours",
 * "Before arrival" — and not converted into a countdown. A deadline that
 * cannot honestly be counted in hours must not pretend that it can.
 */
export default function NotificationsPage({ data, go }) {
  const reference = useErpReference()
  const notify = useErpNotify()
  const [actor, setActor] = useState('')
  const [open, setOpen] = useState(null)
  const [channel, setChannel] = useState('')
  const [ref, setRef] = useState('')

  const active = data.active
  const rows = active ? active.notifications : (reference.data?.notifications ?? [])

  return (
    <div className="erp-page">
      <div className="erp-head">
        <div>
          <div className="erp-h1">Notifications</div>
          <div className="erp-h2">
            {active
              ? `In force at level ${active.level}. Recording a notification asks how it was made and to whom — that is the evidence, not the notification itself.`
              : 'The plan armed: every notification the operator may have to make, with the instrument that requires it.'}
          </div>
        </div>
        {active ? (
          <div className="erp-chbtn">
            <input
              className="erp-inp small"
              value={actor}
              placeholder="your name"
              onChange={(event) => setActor(event.target.value)}
            />
          </div>
        ) : null}
      </div>

      <div className="erp-card">
        <table className="erp-tbl">
          <thead>
            <tr>
              <th>Notify</th>
              <th>Within</th>
              <th>Basis</th>
              <th>From</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code} className={row.required && !row.made ? 'due' : undefined}>
                <td>
                  <b>{row.target}</b>
                  <div className="erp-tsub">{row.note}</div>
                </td>
                <td>
                  <span className="erp-within">{row.withinLabel}</span>
                </td>
                <td>
                  <span className="erp-basis">{row.basis}</span>
                </td>
                <td>
                  <span className="erp-mono">L{row.minLevel}+</span>
                </td>
                <td>
                  {row.made ? (
                    <>
                      <span className="erp-badge ok">made</span>
                      <div className="erp-tsub">
                        {hhmm(row.madeAt)} · {row.madeBy}
                        {row.channel ? ` · ${row.channel}` : ''}
                        {row.reference ? ` · ${row.reference}` : ''}
                      </div>
                    </>
                  ) : row.required ? (
                    <>
                      <span className="erp-badge due">outstanding</span>
                      {active ? (
                        <div className="erp-actions">
                          <button
                            type="button"
                            className="erp-btn tiny"
                            onClick={() => {
                              setOpen(open === row.code ? null : row.code)
                              setChannel('')
                              setRef('')
                            }}
                          >
                            Record
                          </button>
                        </div>
                      ) : null}
                      {open === row.code ? (
                        <div className="erp-sitbox">
                          <div className="erp-fg">
                            <label htmlFor={`nc-${row.code}`}>How it was made</label>
                            <input
                              id={`nc-${row.code}`}
                              className="erp-inp"
                              value={channel}
                              placeholder="telephone 02:14 UTC, duty officer"
                              onChange={(event) => setChannel(event.target.value)}
                            />
                          </div>
                          <div className="erp-fg">
                            <label htmlFor={`nr-${row.code}`}>Their reference</label>
                            <input
                              id={`nr-${row.code}`}
                              className="erp-inp"
                              value={ref}
                              onChange={(event) => setRef(event.target.value)}
                            />
                          </div>
                          <div className="erp-actions">
                            <button
                              type="button"
                              className="erp-btn danger tiny"
                              disabled={!actor.trim() || notify.isPending}
                              onClick={() =>
                                notify.mutate(
                                  { typeCode: row.code, actor, channel, reference: ref },
                                  { onSuccess: () => setOpen(null) },
                                )
                              }
                            >
                              Record as made
                            </button>
                            <span className="erp-hint">
                              {actor.trim() ? '' : 'enter your name above first'}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <span className="erp-mono">not required at this level</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!active ? (
        <div className="erp-actions">
          <button type="button" className="erp-btn" onClick={() => go('command')}>
            Back to command
          </button>
        </div>
      ) : null}
    </div>
  )
}
