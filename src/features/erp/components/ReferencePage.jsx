import { useState } from 'react'
import { LoadingState } from '../../../components/States'
import { useErpCatalogue, useErpReference } from '../../../hooks/useErp'

const TABS = [
  { k: 'levels', l: 'Levels' },
  { k: 'events', l: 'Emergency catalogue' },
  { k: 'org', l: 'Crisis organisation' },
  { k: 'checklists', l: 'Checklists' },
  { k: 'standdown', l: 'Stand-down criteria' },
  { k: 'contacts', l: 'Contacts' },
]

/**
 * The plan itself, readable with nothing happening.
 *
 * This is the tab that gets used when the console is armed — someone
 * familiarising themselves, or an auditor asking to see the plan. It shows the
 * whole manual as stored, not a summary of it.
 */
export default function ReferencePage() {
  const reference = useErpReference()
  const catalogue = useErpCatalogue()
  const [tab, setTab] = useState('levels')

  if (reference.isError) {
    return (
      <div className="erp-page">
        <div className="erp-warn">The plan could not be read: {reference.error?.message}</div>
      </div>
    )
  }
  if (!reference.data) {
    return <LoadingState label="Loading the plan…" />
  }
  const data = reference.data

  return (
    <div className="erp-page">
      <div className="erp-head">
        <div>
          <div className="erp-h1">Emergency reference</div>
          <div className="erp-h2">
            The plan as it stands in the register: five levels, the emergency catalogue, the crisis
            organisation, every checklist and the conditions for standing down.
          </div>
        </div>
      </div>

      <div className="erp-reftabs">
        {TABS.map((entry) => (
          <div
            key={entry.k}
            className={`erp-rt${tab === entry.k ? ' on' : ''}`}
            onClick={() => setTab(entry.k)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setTab(entry.k)
            }}
          >
            {entry.l}
          </div>
        ))}
      </div>

      {tab === 'levels' ? (
        <div className="erp-card">
          {data.levels.map((level) => (
            <div className={`erp-lvrow lv${level.level}`} key={level.level}>
              <div className="erp-lvbadge">{level.level}</div>
              <div>
                <b>{level.name}</b>
                <div className="erp-lvd">{level.description}</div>
                <div className="erp-lva">
                  <span>Activation</span>
                  {level.activation}
                </div>
                <div className="erp-lva">
                  <span>Who stands up</span>
                  {level.standsUp}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'events' ? (
        catalogue.data ? (
          catalogue.data.categories.map((category) => (
            <div className="erp-card" key={category.code}>
              <div className="erp-ch">
                <span>{category.name}</span>
              </div>
              {category.events.map((event) => (
                <div className="erp-evref" key={event.code}>
                  <span className={`erp-ev-b lv${event.baseLevel}`}>L{event.baseLevel}</span>
                  <div>
                    <b>{event.label}</b>
                    {event.squawk ? <i> · squawk {event.squawk}</i> : null}
                    <span>{event.note}</span>
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          <LoadingState label="Loading the catalogue…" />
        )
      ) : null}

      {tab === 'org' ? (
        <div className="erp-card">
          <div className="erp-orggrid">
            {data.cells.map((cell) => (
              <div className="erp-org" style={{ '--c': cell.colour }} key={cell.code}>
                <div className="erp-org-n">{cell.name}</div>
                <div className="erp-org-l">{cell.leadName || '— unassigned —'}</div>
                <div className="erp-org-r">{cell.leadRole}</div>
                <div className="erp-org-s">{cell.scope}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'checklists'
        ? data.checklists.map((list) => (
            <div className="erp-card" key={list.deptCode}>
              <div className="erp-ch">
                <span>{list.deptName}</span>
                <div className="erp-chbtn">
                  <span className="erp-mono">{list.total} action(s)</span>
                </div>
              </div>
              {list.items.map((item) => (
                <div className="erp-refitem" key={item.code}>
                  {item.minLevel != null ? (
                    <span className={`erp-item-l lv${item.minLevel}`}>L{item.minLevel}+</span>
                  ) : (
                    <span className="erp-item-l">P0</span>
                  )}
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          ))
        : null}

      {tab === 'standdown' ? (
        <div className="erp-card">
          <div className="erp-ch">
            <span>Every one of these must hold before the plan closes</span>
          </div>
          {data.standDown.map((criterion) => (
            <div className="erp-refitem" key={criterion.code}>
              <span className="erp-item-l">{criterion.code.toUpperCase()}</span>
              <span>{criterion.text}</span>
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'contacts' ? (
        <div className="erp-card">
          <div className="erp-ch">
            <span>Crisis contacts</span>
          </div>
          <div className="erp-auth">
            <div>
              <span>Family enquiry line</span>
              <b>{data.crisisPhone || '—'}</b>
            </div>
            <div>
              <span>Media enquiries</span>
              <b>{data.mediaEmail || '—'}</b>
            </div>
            <div>
              <span>Emergency Response Centre</span>
              <b>{data.ercLocation || '—'}</b>
            </div>
          </div>
          <div className="erp-note">
            These fill {'{PHONE}'} and {'{MEDIA}'} in every template. They are settings, not code: a
            crisis number that rings into nothing is worse than no number at all.
          </div>
        </div>
      ) : null}
    </div>
  )
}
