import { useMemo, useState } from 'react'
import { LoadingState } from '../../../components/States'
import { useMarkRexRead, useRexLibrary } from '../../../hooks/useCommercial'
import { EMPTY, dayMonthYear } from '../../../lib/format'

/**
 * The REX library.
 *
 * <b>Experience feedback is not an occurrence report.</b> Nothing went wrong —
 * somebody learned something and chose to pass it on. It is voluntary and
 * non-punitive, and the page says so, because a library that feels like a
 * register is a library nobody contributes to.
 *
 * <b>Reads are counted per reader.</b> Opening one records who read it, which
 * is what lets safety promotion say who has <em>not</em> — a bare counter
 * cannot.
 */

const SCOPE = {
  fleet: 'Everyone in the company',
  type: 'Crews on this aircraft type only',
  department: 'This department only',
}

export default function RexLibrary({ reporterName, onSubmitRex }) {
  const [filter, setFilter] = useState('all')
  const [openId, setOpenId] = useState(null)

  const library = useRexLibrary(reporterName)
  const markRead = useMarkRexRead(reporterName)

  const published = useMemo(
    () => (library.data ?? []).filter((rex) => rex.status === 'published'),
    [library.data],
  )

  if (library.isError) {
    return <div className="sr-empty">{library.error?.message}</div>
  }
  if (!library.data) {
    return <LoadingState label="Opening the experience library…" />
  }

  const categories = [...new Set(published.map((rex) => rex.category))].sort()
  const mine = reporterName
    ? published.filter((rex) => rex.authorName === reporterName)
    : []

  const shown = filter === 'all'
    ? published
    : filter === 'mine'
      ? mine
      : published.filter((rex) => rex.category === filter)

  const totalReads = published.reduce((sum, rex) => sum + rex.reads, 0)

  return (
    <div className="sr-page">
      <header className="sr-head sr-head--split">
        <div>
          <h2 className="sr-h1">REX library — lessons learned</h2>
          <p className="sr-h2">
            Experience feedback shared across the company · non-punitive, Just Culture
          </p>
        </div>
        <button type="button" className="sr-btn primary" onClick={onSubmitRex}>
          + Submit REX
        </button>
      </header>

      <div className="sr-stats three">
        <Stat label="REX published" value={published.length}
              sub="shared company-wide" colour="#7c3aed" />
        <Stat label="My contributions" value={mine.length}
              sub={mine.length ? 'thank you for sharing' : 'none yet — consider adding one'}
              colour="#00b4d8" />
        <Stat label="Total reads" value={totalReads}
              sub="colleagues who learned from them" colour="#1f9d5c" />
      </div>

      <div className="sr-filters">
        <Chip label="All REX" count={published.length}
              on={filter === 'all'} onPick={() => setFilter('all')} />
        <Chip label="My REX" count={mine.length}
              on={filter === 'mine'} onPick={() => setFilter('mine')} />
        {categories.map((category) => (
          <Chip
            key={category}
            label={category}
            count={published.filter((rex) => rex.category === category).length}
            on={filter === category}
            onPick={() => setFilter(category)}
          />
        ))}
      </div>

      {shown.length ? (
        shown.map((rex) => (
          <article className="sr-card rx-card" key={rex.id}>
            <header className="rx-h">
              <div>
                <div className="rx-ref">
                  {rex.reference}
                  {rex.authorName && rex.authorName === reporterName ? (
                    <span className="rx-my">MY REX</span>
                  ) : null}
                </div>
                <div className="rx-t">{rex.title}</div>
                <div className="rx-m">
                  {[
                    rex.authorName ?? 'Anonymous',
                    rex.authorRole,
                    rex.aircraftType,
                    rex.phase && rex.phase !== 'N/A' ? rex.phase : null,
                    rex.location && rex.location !== '—' ? rex.location : null,
                    dayMonthYear(rex.publishedOn),
                  ].filter(Boolean).join(' · ')}
                </div>
              </div>
              <span className="rx-pub">Published</span>
            </header>

            <p className="rx-what">{rex.narrative}</p>

            <div className="rx-lessons">
              <div className="rx-ll">Lessons learned</div>
              {rex.lessons.map((lesson) => (
                <div className="rx-l" key={lesson}>
                  <span className="rx-tick">✓</span>
                  {lesson}
                </div>
              ))}
            </div>

            {rex.recommendation ? (
              <p className="rx-rec">
                <b>Recommendation</b> — {rex.recommendation}
              </p>
            ) : null}

            <footer className="rx-f">
              <span className="rx-cat">{rex.category}</span>
              <span className="rx-reads">
                ◉ {rex.reads} read{rex.reads === 1 ? '' : 's'}
                {rex.readByMe ? ' · you have read this' : ''}
              </span>
              <button
                type="button"
                className="sr-btn tiny"
                onClick={() => {
                  const next = openId === rex.id ? null : rex.id
                  setOpenId(next)
                  if (next && reporterName && !rex.readByMe) {
                    markRead.mutate({ rexId: rex.id, reader: reporterName })
                  }
                }}
              >
                {openId === rex.id ? 'Close' : 'Read full REX'}
              </button>
            </footer>

            {openId === rex.id ? (
              <div className="rx-full">
                <dl className="sr-kv">
                  <Kv label="Category" value={rex.category} />
                  <Kv label="Phase" value={rex.phase} />
                  <Kv label="Aircraft type" value={rex.aircraftType ?? 'not type specific'} />
                  <Kv label="Aerodrome" value={rex.location} />
                  <Kv label="Shared with" value={SCOPE[rex.scope] ?? rex.scope} />
                  <Kv
                    label="Attribution"
                    value={rex.attribution === 'anonymous'
                      ? 'Anonymous' : 'Published with name'}
                  />
                </dl>
                <p className="sr-note">
                  Experience feedback is voluntary and non-punitive. It is not an occurrence
                  report and carries no disciplinary consequence for the author.
                </p>
              </div>
            ) : null}
          </article>
        ))
      ) : (
        <div className="sr-empty">
          {filter === 'mine'
            ? 'You have not published any experience feedback yet.'
            : 'No experience feedback in this category.'}
        </div>
      )}
    </div>
  )
}

function Chip({ label, count, on, onPick }) {
  return (
    <button type="button" className={`sr-chip${on ? ' on' : ''}`} onClick={onPick}>
      {label} ({count})
    </button>
  )
}

function Stat({ label, value, sub, colour }) {
  return (
    <div className="sr-stat" style={{ borderBottomColor: colour }}>
      <div className="sr-stat-l">{label}</div>
      <div className="sr-stat-v" style={{ color: colour }}>{value}</div>
      <div className="sr-stat-s">{sub}</div>
    </div>
  )
}

function Kv({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || EMPTY}</dd>
    </div>
  )
}
