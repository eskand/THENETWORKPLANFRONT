import { useState } from 'react'
import { LoadingState } from '../../../components/States'
import { useErpTemplates } from '../../../hooks/useErp'

/**
 * Communication.
 *
 * The templates arrive from the server with their tokens already filled from
 * the live event. A token that could not be filled is left visible as
 * {LIKE_THIS} rather than blanked — a holding statement that reads "registered
 * {REG}" tells the person about to send it that a fact is missing; one that
 * reads "registered " does not.
 */
export default function CommsPage({ data }) {
  const templates = useErpTemplates()
  const [open, setOpen] = useState(null)
  const [copied, setCopied] = useState(null)

  if (!templates.data) {
    return <LoadingState label="Loading the communication templates…" />
  }

  const level = data.active?.level ?? 0
  const current = templates.data.find((template) => template.code === open) ?? null

  return (
    <div className="erp-page">
      <div className="erp-head">
        <div>
          <div className="erp-h1">Communication</div>
          <div className="erp-h2">
            Nothing goes out until the Accountable Manager authorises it. The first statement exists
            to show the operator is engaged, not to explain anything.
          </div>
        </div>
      </div>

      <div className="erp-cols">
        <div className="erp-card">
          <div className="erp-ch">
            <span>Templates</span>
          </div>
          {templates.data.map((template) => (
            <div
              className="erp-tpl"
              key={template.code}
              onClick={() => setOpen(template.code)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter') setOpen(template.code)
              }}
            >
              <div>
                <b>{template.title}</b>
                <span>{template.audience}</span>
              </div>
              <span className="erp-tpl-l">
                L{template.minLevel}+
                {level < template.minLevel ? ' · not yet' : ''}
              </span>
            </div>
          ))}
        </div>

        <div className="erp-card">
          <div className="erp-ch">
            <span>{current ? current.title : 'Select a template'}</span>
            {current ? (
              <div className="erp-chbtn">
                <button
                  type="button"
                  className="erp-btn tiny"
                  onClick={() => {
                    navigator.clipboard?.writeText(current.body)
                    setCopied(current.code)
                  }}
                >
                  {copied === current.code ? 'Copied' : 'Copy text'}
                </button>
              </div>
            ) : null}
          </div>

          {current ? (
            <>
              {current.unresolved.length ? (
                <div className="erp-warn amber">
                  {current.unresolved.length} field(s) not yet known:{' '}
                  {current.unresolved.map((token) => `{${token}}`).join(', ')}. They are left in the
                  text so nothing is sent with a silent gap.
                </div>
              ) : null}
              {level < current.minLevel ? (
                <div className="erp-warn">
                  This template belongs to level {current.minLevel} and above. The response is at
                  level {level}.
                </div>
              ) : null}
              <textarea className="erp-ta mono" rows={22} readOnly value={current.body} />
            </>
          ) : (
            <div className="erp-empty">
              Choose a template. Each one is filled from the live event; nothing is invented.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
