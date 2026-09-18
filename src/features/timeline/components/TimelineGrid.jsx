import { useEffect, useImperativeHandle, useMemo, useRef } from 'react'

/**
 * La grille de Gantt — le DOM de `renderTimelineRows()` de l'annexe
 * (TNP_DEMO_FINAL_v226_114.html l. 11206-11409), son en-tete
 * (`tlBuildHourHeader`, l. 10007-10043) et son trait de l'heure courante
 * (`occUpdateNowLine`, l. 12432-12466), dessines par SA feuille de style
 * (l. 1052-1452, copiee telle quelle dans timeline.css).
 *
 * <b>Le DOM est le sien, classe pour classe</b> : `.tl-row.section >
 * .section-label > .section-label-text`, `.tl-row > .tail-col + .tl-lane`,
 * `.strip.<statut>.sz-*` avec `.strip-content > .strip-ico + .strip-txt`,
 * `.strip-grounded`, `#nowLine.now-line > #nowTag.now-tag`. Redessiner la
 * grille avec ses propres classes avait donne une autre palette et une autre
 * geometrie de barre ; la feuille de l'annexe ne dessine que ces noms-la.
 *
 * <b>Les barres sont posees en pixels</b>, une heure = HOUR_W (75 px par
 * defaut, l. 9445) : la grille deborde et defile horizontalement, la colonne
 * des immatriculations reste collee a gauche (CSS `.tail-col` sticky).
 */

/** Largeur d'une heure — `HOUR_W = 75` de l'annexe (l. 9445). */
export const PX_PER_HOUR = 75
const HOUR_W = PX_PER_HOUR
/** Largeur de la colonne « Aircraft » — `.tail-col{ width:230px }` (l. 1063, 1105). */
const TAIL_COL = 230

/** La classe `.strip.<statut>` par ton de statut (feuille l. 1224-1231). */
const STRIP_CLASS = {
  SCHEDULED: 'scheduled',
  ENROUTE: 'enroute',
  DELAYED: 'delayed',
  AOG: 'aog',
  MAINTENANCE: 'maint',
  CANCELLED: 'cancelled',
  // L'annexe ne pose jamais landed/completed (defaut A-D20) ; sa table de
  // couleurs (TL_STATUS_COLORS, l. 11189-11193) les range avec « scheduled ».
  CLOSED: 'scheduled',
}

/** L'avion de la pastille d'une barre — le trace de l'annexe (l. 11400). */
const STRIP_PLANE = 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z'
/** `planeIcon` de l'annexe (l. 9450) — la feuille le masque derriere une image (`.tail-icon::before`). */
const TAIL_PLANE = 'M2 12l19-9-7 19-3-8-9-2z'

function hhmmUtc(at) {
  const date = at instanceof Date ? at : new Date(at)
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

/** `statusDotClass()` de l'annexe (l. 10186-10190). */
function dotClass(status) {
  if (status === 'AOG') return 'aog'
  if (status === 'MAINTENANCE') return 'maint'
  return 'ok'
}

/** Densite de l'etiquette selon la largeur reelle de la barre (l. 11395). */
function density(width) {
  return width >= 150 ? 'sz-lg' : width >= 104 ? 'sz-md' : width >= 64 ? 'sz-sm' : 'sz-xs'
}

export default function TimelineGrid({ data, onSelectLeg, ref }) {
  const scrollRef = useRef(null)
  const hasScrolled = useRef(false)

  const start = new Date(data.windowStart).getTime()
  const end = new Date(data.windowEnd).getTime()
  const hours = Math.max(1, Math.round((end - start) / 3_600_000))
  const laneWidth = hours * HOUR_W

  const now = Date.now()
  const nowDate = new Date(now)
  const todayKey = nowDate.toISOString().slice(0, 10)
  const nowHour = nowDate.getUTCHours()

  /** Les cellules de l'en-tete — une par heure, la cellule de minuit datee (l. 10024-10041). */
  const hourCells = useMemo(
    () => Array.from({ length: hours }, (_, index) => {
      const at = new Date(start + index * 3_600_000)
      const hour = at.getUTCHours()
      const isToday = at.toISOString().slice(0, 10) === todayKey
      return {
        key: index,
        hour,
        isToday,
        className: 'hour-cell'
          + (isToday && hour === nowHour ? ' now-hour' : '')
          + (hour === 0 ? ' day-start' : ''),
        date: hour === 0
          ? at.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })
            + (isToday ? ' · today' : '')
          : null,
      }
    }),
    [hours, start, todayKey, nowHour],
  )

  // Le trait ne vaut que si l'instant tombe dans la fenetre affichee (l. 12440).
  const nowOffset = now >= start && now <= end ? ((now - start) / 3_600_000) * HOUR_W : null

  /** Les lignes, sous leur intitule de section de flotte, dans l'ordre du serveur. */
  const sections = useMemo(() => {
    const grouped = new Map()
    data.rows.forEach((row) => {
      const key = row.fleetSection ?? 'Other Fleet'
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(row)
    })
    return [...grouped.entries()]
  }, [data.rows])

  const scrollToNow = () => {
    if (nowOffset === null || !scrollRef.current) return
    scrollRef.current.scrollTo({ left: Math.max(0, nowOffset - 260), behavior: 'smooth' })
  }

  useImperativeHandle(ref, () => ({ scrollToNow }))

  useEffect(() => {
    if (hasScrolled.current || nowOffset === null || !scrollRef.current) return
    scrollRef.current.scrollLeft = Math.max(0, nowOffset - 260)
    hasScrolled.current = true
  }, [nowOffset])

  /** left = etd × HOUR_W ; width = max((eta − etd) × HOUR_W − 4, 30) (l. 11314-11315), borne a la fenetre. */
  const place = (segment) => {
    const from = Math.max(new Date(segment.startsAt).getTime(), start)
    const to = Math.min(new Date(segment.endsAt).getTime(), end)
    const left = ((from - start) / 3_600_000) * HOUR_W
    const width = Math.max(((to - from) / 3_600_000) * HOUR_W - 4, 30)
    return { left, width }
  }

  return (
    <div className="timeline-wrap" id="tlTimelineWrap">
      <div className="tl-body">
        <div className="tl-scroll" id="tlScroll" ref={scrollRef}>
          <div className="tl-grid" id="tlGrid" style={{ minWidth: `${TAIL_COL + laneWidth}px` }}>
            <div className="tl-header">
              <div className="tail-col">Aircraft</div>
              <div className="tl-hours" id="tlHours">
                {hourCells.map((cell) => (
                  <div className={cell.className} key={cell.key} style={{ width: `${HOUR_W}px` }}>
                    {cell.date
                      ? <span className="hc-date">{cell.date}</span>
                      : `${String(cell.hour).padStart(2, '0')}:00`}
                  </div>
                ))}
              </div>
            </div>

            <div id="tlRows" style={{ '--tl-hour-w': `${HOUR_W}px` }}>
              {sections.map(([section, rows]) => (
                <Section key={section} section={section} rows={rows} laneWidth={laneWidth}
                         place={place} onSelectLeg={onSelectLeg} />
              ))}
            </div>

            {nowOffset === null ? null : (
              <div className="now-line" id="nowLine" style={{ left: `${TAIL_COL + nowOffset}px` }}>
                <div className="now-tag" id="nowTag" title={`Current time — ${hhmmUtc(nowDate)} UTC`}>
                  {hhmmUtc(nowDate)}<span className="tz">UTC</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Une section de flotte : sa ligne d'intitule puis ses appareils (l. 11216-11223). */
function Section({ section, rows, laneWidth, place, onSelectLeg }) {
  return (
    <>
      <div className="tl-row section">
        <div className="section-label"><span className="section-label-text">{section}</span></div>
      </div>
      {rows.map((row) => (
        <Row key={row.aircraftId} row={row} laneWidth={laneWidth} place={place} onSelectLeg={onSelectLeg} />
      ))}
    </>
  )
}

/** Une ligne d'appareil (l. 11261-11282) et sa voie. */
function Row({ row, laneWidth, place, onSelectLeg }) {
  // Un appareil sans vol reel ce jour dit ou il se trouve (l. 11292-11305).
  const grounded = row.flights === 0 && row.status === 'SERVICEABLE'

  return (
    <div className="tl-row">
      <div className="tail-col">
        <div className="tail-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d={TAIL_PLANE} /></svg>
        </div>
        <div className="tail-info">
          <div className="reg">{row.registration}</div>
          <div className="type" title={row.model ?? row.icaoType ?? undefined}>{row.icaoType}</div>
        </div>
        <div className={`tail-status ${dotClass(row.status)}`} title={row.statusReason ?? row.status} />
      </div>

      <div className="tl-lane" style={{ width: `${laneWidth}px` }} data-reg={row.registration}>
        {grounded ? (
          <div className="strip-grounded" style={{ left: `${laneWidth / 2 - 78}px`, top: '50%' }}
               title={`No flight scheduled today — aircraft on the ground at ${row.baseIcao ?? '—'}`}>
            <span className="sg-dot" />GROUNDED · {row.baseIcao ?? '—'}
          </div>
        ) : null}

        {row.segments.map((segment, index) => {
          // Les segments sol du serveur ne sont pas des barres chez l'annexe :
          // une escale trop courte y est un badge de rotation sur la barre.
          if (segment.kind === 'GROUND') return null
          if (segment.kind === 'MAINTENANCE') {
            return <Band key={`band-${index}`} segment={segment} geometry={place(segment)} />
          }
          return (
            <Strip key={segment.legId ?? `f-${index}`} segment={segment} row={row}
                   geometry={place(segment)} onSelectLeg={onSelectLeg} />
          )
        })}
      </div>
    </div>
  )
}

/**
 * La bande sol pleine journee — `tnpApplyAogBands` (l. 10853-10869) et le
 * placeholder de maintenance (l. 10925-10933) : `.strip.aog.aog-band.ground`
 * « AOG — raison », `.strip.maint.ground` « Scheduled maintenance ».
 */
function Band({ segment, geometry }) {
  const aog = segment.status === 'AOG'
  const label = aog ? (segment.note ? `AOG — ${segment.note}` : 'AOG') : 'Scheduled maintenance'
  return (
    <div className={`strip ${aog ? 'aog aog-band' : 'maint'} ${density(geometry.width)} ground`}
         style={{ left: `${geometry.left}px`, width: `${geometry.width}px` }} title={label}>
      <div className="strip-content">
        <span className="strip-txt"><span className="fn">{label}</span></span>
      </div>
    </div>
  )
}

/** Une barre de vol (l. 11337-11405). */
function Strip({ segment, row, geometry, onSelectLeg }) {
  const tone = STRIP_CLASS[segment.statusTone] ?? 'scheduled'
  // crewFtlIssue (l. 11364-11365) : un depassement FTL critique pose le lisere
  // « airport-alert » et son infobulle (l. 11391).
  const ftlCritical = String(segment.ftlStatus ?? '').toUpperCase() === 'BREACH'
  const title = ftlCritical
    ? 'Crew FTL exceedance (FDP/rest/currency) — click to review in Crew tab.'
    : 'Click to view · drag to reschedule or reassign'
  const open = () => onSelectLeg?.(segment, row)

  return (
    <div className={`strip ${tone} ${density(geometry.width)}${ftlCritical ? ' airport-alert' : ''}`}
         data-uid={segment.legId ?? undefined}
         style={{ left: `${geometry.left}px`, width: `${geometry.width}px` }}
         title={title} role="button" tabIndex={0}
         onClick={open} onKeyDown={(event) => { if (event.key === 'Enter') open() }}>
      <div className="strip-content">
        <span className="strip-ico">
          <svg viewBox="0 0 24 24"><path d={STRIP_PLANE} /></svg>
        </span>
        <span className="strip-txt">
          <span className="fn">{segment.flightNo}</span>
          <span className="route">{segment.depIcao} → {segment.arrIcao}</span>
          <span className="time">{hhmmUtc(segment.startsAt)}–{hhmmUtc(segment.endsAt)}</span>
        </span>
      </div>
    </div>
  )
}
