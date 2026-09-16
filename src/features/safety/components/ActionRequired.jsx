import { useState } from 'react'
import { LoadingState } from '../../../components/States'
import { useAnswerSafetyQuery, useSafetyQueries } from '../../../hooks/useCommercial'
import { dayMonthYear } from '../../../lib/format'

/**
 * Action required.
 *
 * <b>What the reporter still owes.</b> A report that the Safety Manager cannot
 * classify without more detail stops here until the reporter answers — and
 * answering is what closes the loop, so the reply box is on the card rather
 * than behind a link.
 *
 * Nothing appears until a reporter is selected: a list of other people's
 * questions is not this page.
 */
export default function ActionRequired({ reporterName }) {
  const [open, setOpen] = useState(null)
  const [reply, setReply] = useState('')

  const queries = useSafetyQueries({ reporter: reporterName, openOnly: true })
  const answer = useAnswerSafetyQuery()

  if (!reporterName) {
    return (
      <div className="sr-empty">
        Select your name at the top of the page to see anything addressed to you.
      </div>
    )
  }
  if (queries.isError) {
    return <div className="sr-empty">{queries.error?.message}</div>
  }
  if (!queries.data) {
    return <LoadingState label="Checking what is waiting on you…" />
  }
  if (!queries.data.length) {
    return <div className="sr-empty">Nothing is waiting on you.</div>
  }

  return (
    <div className="sr-page">
      <header className="sr-head">
        <div>
          <h2 className="sr-h1">Action required</h2>
          <p className="sr-h2">
            Items needing your response. Answering closes the loop on the investigation.
          </p>
        </div>
      </header>

      {queries.data.map((query) => {
        const points = String(query.query ?? '')
          .split('\n')
          .map((line) => line.trim().replace(/^\d+[.)]\s*/, ''))
          .filter(Boolean)

        return (
          <article className="sr-card sr-q" key={query.occurrenceId}>
            <header className="sr-qh">
              <div>
                <div className="sr-qt">
                  Clarification — {query.reference} ({query.title})
                </div>
                <div className="sr-qm">
                  Request from {query.askedBy ?? 'the Safety Manager'}
                  {query.askedAt ? ` · ${dayMonthYear(query.askedAt)}` : ''}
                </div>
              </div>
              <span className="sr-pending">Pending</span>
            </header>

            <div className="sr-qbox">
              <div className="sr-qlead">
                The Safety Manager requests additional information:
              </div>
              <ol className="sr-qlist">
                {points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ol>
            </div>

            <div className="sr-qfoot">
              <button
                type="button"
                className="sr-btn primary"
                onClick={() => {
                  setOpen(open === query.occurrenceId ? null : query.occurrenceId)
                  setReply('')
                }}
              >
                {open === query.occurrenceId ? 'Cancel' : 'Respond now →'}
              </button>
            </div>

            {open === query.occurrenceId ? (
              <div className="sr-replybox">
                <textarea
                  className="sr-ta"
                  rows={4}
                  value={reply}
                  placeholder="Answer each point in turn."
                  onChange={(event) => setReply(event.target.value)}
                />
                {answer.isError ? (
                  <p className="sr-error">{answer.error?.message}</p>
                ) : null}
                <div className="sr-actions">
                  <button
                    type="button"
                    className="sr-btn primary"
                    disabled={!reply.trim() || answer.isPending}
                    onClick={() =>
                      answer.mutate(
                        { occurrenceId: query.occurrenceId, answer: reply },
                        {
                          onSuccess: () => {
                            setOpen(null)
                            setReply('')
                          },
                        },
                      )
                    }
                  >
                    Send response
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
