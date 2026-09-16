import { useState } from 'react'
import { useErpLog } from '../../../hooks/useErp'
import { dayMonthYear, hhmm } from '../../../lib/format'

/**
 * The crisis log.
 *
 * Stored in the database, not in the browser. The prototype keeps it in
 * localStorage and warns itself when it cannot — a crisis log that is not
 * stored does not exist, and this is the record an inquiry asks for first.
 */
export default function LogPage({ data }) {
  const add = useErpLog()
  const [text, setText] = useState('')
  const [actor, setActor] = useState('')

  return (
    <div className="erp-page">
      <div className="erp-head">
        <div>
          <div className="erp-h1">Crisis log</div>
          <div className="erp-h2">
            Every entry is timestamped in UTC and kept. Entries are added, never edited: correcting
            a figure is expected, overwriting history is not.
          </div>
        </div>
      </div>

      <div className="erp-card">
        <div className="erp-logadd">
          <input
            className="erp-inp"
            value={text}
            placeholder="What happened, what was decided, who was told."
            onChange={(event) => setText(event.target.value)}
          />
          <input
            className="erp-inp small"
            value={actor}
            placeholder="your name"
            onChange={(event) => setActor(event.target.value)}
          />
          <button
            type="button"
            className="erp-btn danger"
            disabled={!text.trim() || add.isPending}
            onClick={() =>
              add.mutate(
                { text, actor: actor || null },
                { onSuccess: () => setText('') },
              )
            }
          >
            Add entry
          </button>
        </div>

        <div className="erp-logfull">
          {data.log.length ? (
            data.log.map((entry) => (
              <div className={`erp-le k-${entry.kind}`} key={entry.id}>
                <div className="erp-le-t">
                  {hhmm(entry.at)}
                  <span>{dayMonthYear(entry.at)}</span>
                </div>
                <div className="erp-le-k">{entry.kind}</div>
                <div className="erp-le-x">
                  {entry.text}
                  <span>
                    {entry.actor ? entry.actor : 'system'}
                    {entry.level != null ? ` · level ${entry.level}` : ''}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="erp-empty">
              The log is empty. It opens with the first action of the first response.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
