import { useState } from 'react'
import { LoadingState } from '../../../components/States'
import { useErpCheck, useErpChecklists } from '../../../hooks/useErp'
import { hhmm } from '../../../lib/format'

/**
 * The checklists.
 *
 * Phase 0 first and always: twelve items a duty officer completes without
 * deciding anything. The departmental cells follow, and each shows only the
 * actions in force at the level the response is actually running at — a cell
 * cannot be judged against actions the level has not called for.
 */
export default function ChecklistsPage({ data, go }) {
  const lists = useErpChecklists()
  const check = useErpCheck()
  const [dept, setDept] = useState('P0')
  const [actor, setActor] = useState('')

  if (!data.active) {
    return <Armed go={go} />
  }
  if (!lists.data) {
    return <LoadingState label="Loading the checklists…" />
  }

  const current = lists.data.find((list) => list.deptCode === dept) ?? lists.data[0]

  return (
    <div className="erp-page">
      <div className="erp-head">
        <div>
          <div className="erp-h1">Checklists</div>
          <div className="erp-h2">
            Every tick carries a name and a time. An action recorded without either proves nothing
            to a board of inquiry, so the console asks for both.
          </div>
        </div>
        <div className="erp-chbtn">
          <input
            className="erp-inp small"
            value={actor}
            placeholder="your name"
            onChange={(event) => setActor(event.target.value)}
          />
        </div>
      </div>

      <div className="erp-deptbar">
        {lists.data.map((list) => (
          <div
            key={list.deptCode}
            className={`erp-dtab${current.deptCode === list.deptCode ? ' on' : ''}${
              list.total === 0 ? ' lock' : ''
            }`}
            style={{ '--c': list.colour }}
            onClick={() => setDept(list.deptCode)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setDept(list.deptCode)
            }}
          >
            {list.deptName}
            <span>
              {list.done}/{list.total}
            </span>
          </div>
        ))}
      </div>

      {current.leadName ? (
        <div className="erp-deptmeta">
          Cell lead: <b>{current.leadName}</b>
        </div>
      ) : null}

      <div className="erp-card">
        <div className="erp-ch">
          <span>{current.deptName}</span>
          <div className="erp-chbtn">
            <span className="erp-p0p">{current.percent}%</span>
          </div>
        </div>
        <div className="erp-p0bar">
          <div style={{ width: `${current.percent}%` }} />
        </div>

        {current.items.length ? (
          current.items.map((item) => (
            <div
              className={`erp-item${item.done ? ' done' : ''}`}
              key={item.code}
              onClick={() => {
                if (!actor.trim()) return
                check.mutate({ itemCode: item.code, done: !item.done, actor })
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && actor.trim()) {
                  check.mutate({ itemCode: item.code, done: !item.done, actor })
                }
              }}
            >
              <span className="erp-box">{item.done ? '✓' : ''}</span>
              <span className="erp-item-t">{item.text}</span>
              {item.minLevel != null ? (
                <span className={`erp-item-l lv${item.minLevel}`}>L{item.minLevel}+</span>
              ) : null}
              {item.done ? (
                <span className="erp-item-w">
                  {hhmm(item.doneAt)} · {item.doneBy}
                </span>
              ) : null}
            </div>
          ))
        ) : (
          <div className="erp-locked">
            Nothing in this cell is in force at level {data.active.level}. Its actions start at a
            higher level.
          </div>
        )}
      </div>

      {!actor.trim() ? (
        <div className="erp-warn amber">
          Enter your name above before ticking anything. A tick with no name is not a record.
        </div>
      ) : null}
    </div>
  )
}

function Armed({ go }) {
  return (
    <div className="erp-page">
      <div className="erp-idle">
        <div className="erp-idle-i">
          <svg viewBox="0 0 24 24">
            <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
          </svg>
        </div>
        <div className="erp-idle-t">ERP armed — no active event</div>
        <div className="erp-idle-s">
          The checklists are worked against a live activation. The plan itself is in the Reference
          tab.
        </div>
        <button type="button" className="erp-btn danger" onClick={() => go('activate')}>
          Assess a situation
        </button>
      </div>
    </div>
  )
}
