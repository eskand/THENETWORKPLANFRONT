import { useEffect, useImperativeHandle, useMemo, useRef } from 'react'

/**
 * La grille de Gantt.
 *
 * Un choix de fond, repris du prototype : les barres sont posees en
 * **pixels**, pas en pourcentage. Une heure vaut PX_PER_HOUR pixels, la
 * grille deborde et defile horizontalement. En pourcentage, passer de 1 a
 * 7 jours ecrase les vols jusqu'a les rendre illisibles ; en pixels, une
 * heure a toujours la meme largeur et c'est la fenetre qui s'allonge.
 *
 * Le curseur « maintenant » n'est pas decoratif : c'est le seul repere qui
 * dise, d'un coup d'oeil, ce qui est deja parti et ce qui reste a faire.
 */

/** Largeur d'une heure. 75 px est la valeur du prototype (hour-cell). */
export const PX_PER_HOUR = 75
const TAIL_COL = 230

const TONE_CLASS = {
  SCHEDULED: 'tlb--scheduled',
  ENROUTE: 'tlb--enroute',
  DELAYED: 'tlb--delayed',
  CLOSED: 'tlb--closed',
  CANCELLED: 'tlb--cancelled',
  AOG: 'tlb--aog',
  MAINTENANCE: 'tlb--maint',
  GROUND: 'tlb--ground',
}

function hhmmUtc(iso) {
  const at = new Date(iso)
  return `${String(at.getUTCHours()).padStart(2, '0')}:${String(at.getUTCMinutes()).padStart(2, '0')}`
}

/**
 * L'avion vu de dessus, comme dans le prototype.
 *
 * Il y dessinait une image PNG en base64 de 21px (tail-icon::before,
 * l. 1130) ; c'est la meme silhouette, en trace vectoriel — une fleche de
 * navigation, qui est ce qui figurait ici, se lit comme un cap et non comme
 * un appareil.
 */
function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c.62 0 1.05.88 1.05 2v5.2l8 4.62v1.9l-8-2.4v4.4l2.6 1.7v1.4L12 19.63l-3.65 1.2v-1.4l2.6-1.71v-4.4l-8 2.4v-1.9l8-4.62V4c0-1.12.43-2 1.05-2z" />
    </svg>
  )
}

export default function TimelineGrid({ data, onSelectLeg, ref }) {
  const scrollRef = useRef(null)
  const hasScrolled = useRef(false)

  const start = new Date(data.windowStart).getTime()
  const end = new Date(data.windowEnd).getTime()
  const hours = Math.max(1, Math.round((end - start) / 3_600_000))
  const laneWidth = hours * PX_PER_HOUR

  /** Les cellules d'heure de l'en-tete, une par heure de la fenetre. */
  const hourCells = useMemo(
    () =>
      Array.from({ length: hours }, (_, index) => {
        const at = new Date(start + index * 3_600_000)
        return {
          key: index,
          label: `${String(at.getUTCHours()).padStart(2, '0')}:00`,
          day: at.getUTCHours() === 0 ? at.toUTCString().slice(5, 11).toUpperCase() : null,
        }
      }),
    [hours, start],
  )

  // « maintenant » ne vaut que si l'instant tombe dans la fenetre affichee.
  // Une fenetre passee n'a pas de curseur, plutot qu'un curseur colle au bord.
  const now = Date.now()
  const nowOffset = now >= start && now <= end ? ((now - start) / 3_600_000) * PX_PER_HOUR : null

  /** Les lignes, regroupees sous leur intitule de flotte. */
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

  // Le bouton « now » de la barre d'outils appelle la meme fonction que le
  // calage automatique : un seul comportement, deux declencheurs.
  useImperativeHandle(ref, () => ({ scrollToNow }))

  // A l'ouverture, la vue se cale sur l'heure courante plutot que sur minuit :
  // un OCC regarde maintenant, pas le debut de la journee.
  useEffect(() => {
    if (hasScrolled.current || nowOffset === null || !scrollRef.current) return
    scrollRef.current.scrollLeft = Math.max(0, nowOffset - 260)
    hasScrolled.current = true
  }, [nowOffset])

  const place = (segment) => {
    const from = new Date(segment.startsAt).getTime()
    const to = new Date(segment.endsAt).getTime()
    const left = ((Math.max(from, start) - start) / 3_600_000) * PX_PER_HOUR
    const width = ((Math.min(to, end) - Math.max(from, start)) / 3_600_000) * PX_PER_HOUR
    return { left: `${left}px`, width: `${Math.max(width, 3)}px` }
  }

  return (
    <div className="tlg" style={{ '--tl-tail': `${TAIL_COL}px` }}>
      <div className="tlg__scroll" ref={scrollRef}>
        <div className="tlg__grid" style={{ width: `${TAIL_COL + laneWidth}px` }}>
          <div className="tlg__header">
            <div className="tlg__tailcol">Aircraft</div>
            <div className="tlg__hours" style={{ width: `${laneWidth}px` }}>
              {hourCells.map((cell) => (
                <div
                  className={`tlg__hour${cell.day ? ' tlg__hour--day' : ''}`}
                  key={cell.key}
                  style={{ width: `${PX_PER_HOUR}px` }}
                >
                  {cell.day ? <b>{cell.day}</b> : null}
                  {cell.label}
                </div>
              ))}
            </div>
          </div>

          <div className="tlg__rows">
            {nowOffset === null ? null : (
              <>
                <div className="tlg__now" style={{ left: `${TAIL_COL + nowOffset}px` }} />
                <div className="tlg__nowlabel" style={{ left: `${TAIL_COL + nowOffset}px` }}>
                  {hhmmUtc(new Date(now).toISOString())} <i>UTC</i>
                </div>
              </>
            )}

            {sections.map(([section, rows]) => (
              <div key={section}>
                <div className="tlg__section">
                  <span>{section}</span>
                </div>

                {rows.map((row) => (
                  <div className="tlg__row" key={row.aircraftId}>
                    <div className="tlg__tailcol">
                      <span className="tlg__tailicon">
                        <PlaneIcon />
                      </span>
                      <span className="tlg__tailinfo">
                        <b>{row.registration}</b>
                        <i title={row.model ?? undefined}>{row.icaoType}</i>
                      </span>
                      <span
                        className={`tlg__dot tlg__dot--${(row.status ?? '').toLowerCase()}`}
                        title={row.statusReason ?? row.status}
                      />
                    </div>

                    <div className="tlg__lane" style={{ width: `${laneWidth}px` }}>
                      {hourCells.map((cell) => (
                        <span
                          className="tlg__cell"
                          key={cell.key}
                          style={{ width: `${PX_PER_HOUR}px` }}
                        />
                      ))}

                      {row.segments.map((segment, index) => {
                        if (segment.kind === 'GROUND' && !segment.tight) {
                          return null
                        }
                        const grounded =
                          segment.kind === 'MAINTENANCE' || segment.statusTone === 'AOG'
                        const classes = [
                          'tlb',
                          TONE_CLASS[segment.statusTone] ?? 'tlb--scheduled',
                          grounded ? 'tlb--band' : '',
                          segment.kind === 'GROUND' ? 'tlb--tight' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')

                        if (grounded) {
                          return (
                            <span
                              key={`band-${index}`}
                              className={classes}
                              style={place(segment)}
                              title={segment.note ?? segment.status}
                            >
                              {segment.status === 'AOG'
                                ? segment.note
                                  ? `AOG — ${segment.note}`
                                  : 'AOG'
                                : 'Scheduled maintenance'}
                            </span>
                          )
                        }

                        if (segment.kind === 'GROUND') {
                          return (
                            <span
                              key={`tight-${index}`}
                              className={classes}
                              style={place(segment)}
                              title={segment.note ?? undefined}
                            >
                              {segment.minutes}′
                            </span>
                          )
                        }

                        return (
                          <button
                            type="button"
                            key={segment.legId ?? `f-${index}`}
                            className={classes}
                            style={place(segment)}
                            onClick={() => onSelectLeg?.(segment, row)}
                            title={`${segment.flightNo} · ${segment.depIcao}→${segment.arrIcao} · ${hhmmUtc(segment.startsAt)}–${hhmmUtc(segment.endsAt)}Z${
                              segment.delayMinutes > 0 ? ` · ${segment.delayMinutes} min late` : ''
                            }`}
                          >
                            <span className="tlb__ico">
                              <PlaneIcon />
                            </span>
                            <span className="tlb__txt">
                              <b>{segment.flightNo}</b>
                              <i>
                                {segment.depIcao} → {segment.arrIcao}
                              </i>
                              <u>
                                {hhmmUtc(segment.startsAt)}–{hhmmUtc(segment.endsAt)}
                              </u>
                            </span>
                            {segment.melReference ? (
                              <span
                                className={`tlb__chip${segment.melBlocking ? ' tlb__chip--stop' : ''}`}
                                title={`${segment.melReference}${segment.melBlocking ? ' — blocks dispatch' : ''}`}
                              >
                                !
                              </span>
                            ) : null}
                            {segment.ftlStatus && segment.ftlStatus !== 'OK' ? (
                              <span
                                className={`tlb__ftl tlb__ftl--${segment.ftlStatus.toLowerCase()}`}
                                title={`Crew FTL: ${segment.ftlStatus.toLowerCase()}`}
                              >
                                FTL
                              </span>
                            ) : null}
                          </button>
                        )
                      })}

                      {row.flights === 0 && row.status === 'SERVICEABLE' ? (
                        // La pastille se cale sur le curseur « maintenant »
                        // plutot qu'au milieu de la voie : sur une fenetre de
                        // trois jours, le milieu est hors de l'ecran et
                        // l'information disparaissait.
                        <span
                          className="tlg__idle"
                          style={{ left: `${nowOffset ?? laneWidth / 2}px` }}
                        >
                          GROUNDED · {row.baseIcao ?? 'base unknown'}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
