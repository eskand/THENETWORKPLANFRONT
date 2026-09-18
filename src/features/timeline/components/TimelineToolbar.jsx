import {
  ChevronLeft,
  ChevronRight,
  Clock,
  TriangleAlert,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * La barre de commande de la Flight Timeline, dans l'ordre du prototype :
 * bascule Timeline/Table, raccourci MEL/CDL/HIL, retour a l'heure courante,
 * zoom, navigation par date, puis les trois selecteurs et la legende.
 *
 * Les trois selecteurs ne sont pas remplis a partir des lignes affichees mais
 * a partir de la reponse du serveur (`fleetSections`, `bases`) : filtrer sur
 * une base ne doit pas faire disparaitre les autres bases de la liste qui
 * permet d'y revenir.
 *
 * Le bouton « Optimize » est celui du prototype (#tlOptimizeBtn, l. 7653) et
 * ouvre la meme fenetre, TIMELINE OPTIMIZER (TNPOptimizer.open, l. 95582).
 * Le moteur derriere tourne sur le serveur, sur la base : le detecteur, le
 * modele de couts et les instructions sont ceux de l'annexe, sans le tirage
 * au sort de son moteur « stub ».
 */

const ZOOMS = [1, 3, 7]

const LEGEND = [
  ['Scheduled', 'var(--tl-scheduled)'],
  ['In flight', 'var(--tl-enroute)'],
  ['Delayed', 'var(--tl-delayed)'],
  ['AOG', 'var(--tl-aog)'],
  ['Maintenance', 'var(--tl-maint)'],
]

/** « Fri, September 11, 2026 (today) » */
function longDate(iso, todayIso) {
  const at = new Date(`${iso}T00:00:00Z`)
  const label = at.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return iso === todayIso ? `${label} (today)` : label
}

function shiftDays(iso, days) {
  const at = new Date(`${iso}T00:00:00Z`)
  at.setUTCDate(at.getUTCDate() + days)
  return at.toISOString().slice(0, 10)
}

export default function TimelineToolbar({
  mode,
  onModeChange,
  from,
  onFromChange,
  todayIso,
  days,
  onDaysChange,
  fleet,
  onFleetChange,
  base,
  onBaseChange,
  status,
  onStatusChange,
  options,
  onJumpToNow,
  onOptimize,
}) {
  const navigate = useNavigate()
  const zoomIndex = Math.max(0, ZOOMS.indexOf(days))

  return (
    <>
      <div className="tltb">
        <div className="tltb__seg">
          <button
            type="button"
            className={mode === 'timeline' ? 'is-on' : ''}
            onClick={() => onModeChange('timeline')}
          >
            Timeline
          </button>
          <button
            type="button"
            className={mode === 'table' ? 'is-on' : ''}
            onClick={() => onModeChange('table')}
          >
            Table
          </button>
        </div>

        <button
          type="button"
          className="tltb__btn"
          title="Open MEL / CDL / HIL"
          onClick={() => navigate('/mel')}
        >
          <TriangleAlert size={13} />
          HIL
        </button>

        <button
          type="button"
          className="tltb__btn tltb__btn--icon"
          title="Scroll the timeline back to the current time"
          aria-label="Jump to now"
          onClick={onJumpToNow}
        >
          <Clock size={14} />
        </button>

        <div className="tltb__zoom">
          <button
            type="button"
            title="Zoom out — show more days"
            aria-label="Zoom out"
            disabled={zoomIndex >= ZOOMS.length - 1}
            onClick={() => onDaysChange(ZOOMS[Math.min(zoomIndex + 1, ZOOMS.length - 1)])}
          >
            <ZoomOut size={14} />
          </button>
          <span>
            {days} day{days === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            title="Zoom in — closer view"
            aria-label="Zoom in"
            disabled={zoomIndex <= 0}
            onClick={() => onDaysChange(ZOOMS[Math.max(zoomIndex - 1, 0)])}
          >
            <ZoomIn size={14} />
          </button>
        </div>

        <div className="tltb__date">
          <button type="button" aria-label="Previous day" onClick={() => onFromChange(shiftDays(from, -1))}>
            <ChevronLeft size={14} />
          </button>
          <span className="tltb__today">{longDate(from, todayIso)}</span>
          <button type="button" aria-label="Next day" onClick={() => onFromChange(shiftDays(from, 1))}>
            <ChevronRight size={14} />
          </button>
          <input
            type="date"
            value={from}
            onChange={(event) => onFromChange(event.target.value)}
            title="Jump to any date"
          />
        </div>

        <button
          type="button"
          className="tltb__btn"
          title="Optimize the live plan over a chosen date range and time window — proposals only, nothing is written"
          onClick={onOptimize}
        >
          {/* Le viseur de l'annexe (#tlOptimizeBtn, l. 7656) : quatre traits et un cercle. */}
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><circle cx="12" cy="12" r="5" />
          </svg>
          Optimize
        </button>

        <div className="tltb__filters">
          <select value={fleet} onChange={(event) => onFleetChange(event.target.value)}>
            <option value="">Fleet: All</option>
            {options.fleetSections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>

          <select value={base} onChange={(event) => onBaseChange(event.target.value)}>
            <option value="">Base: All</option>
            {options.bases.map((icao) => (
              <option key={icao} value={icao}>
                Base: {icao}
              </option>
            ))}
          </select>

          <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
            <option value="">Status: All</option>
            <option value="SCHEDULED">Status: Scheduled</option>
            <option value="ENROUTE">Status: In flight</option>
            <option value="DELAYED">Status: Delayed</option>
            <option value="AOG">Status: AOG</option>
            <option value="MAINTENANCE">Status: Maintenance</option>
          </select>
        </div>
      </div>

      <div className="tllegend">
        {LEGEND.map(([label, colour]) => (
          <span key={label}>
            <i style={{ background: colour }} />
            {label}
          </span>
        ))}
      </div>
    </>
  )
}
