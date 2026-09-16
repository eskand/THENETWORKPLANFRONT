import { AlertTriangle, FileText, Wrench } from 'lucide-react'
import Badge from '../../../components/Badge'
import { LoadingState } from '../../../components/States'
import { EMPTY, dayMonthYear } from '../../../lib/format'

const STATUS_TONE = { SERVICEABLE: 'READY', MAINTENANCE: 'PENDING', AOG: 'ATTENTION' }
const STATUS_LABEL = { SERVICEABLE: 'Compliant', MAINTENANCE: 'In maintenance', AOG: 'Non-compliant' }

const DUE_DOT = {
  OVERDUE: 'var(--attention-fg)',
  DUE_SOON: 'var(--pending-fg)',
  PLANNED: 'var(--info-fg)',
  UNKNOWN: 'var(--text-faint)',
}

/**
 * Le dossier de navigabilite d'une immatriculation.
 *
 * <b>Un volet, pas un tiroir.</b> Le prototype garde ce dossier ouvert a droite
 * du tableau pendant qu'on parcourt la flotte (.camo-layout, annexe A4
 * l. 1894) ; un tiroir modal obligerait a fermer pour comparer deux appareils,
 * ce qui est exactement ce que fait un planificateur devant cette liste.
 *
 * <b>Trois boutons, dans cet ordre.</b> ARC File, AD/SB, Work Order — l'ordre
 * du prototype, qui est aussi celui de la gravite : le certificat decide si
 * l'appareil peut voler, les consignes s'il peut voler aujourd'hui, les ordres
 * de travail quand il revolera.
 */
export default function AirworthinessFile({ row, file, onOpenDocument }) {
  if (!row) {
    return (
      <aside className="camo-file">
        <div className="state" style={{ padding: '48px 8px' }}>
          <FileText size={30} strokeWidth={1.3} style={{ opacity: 0.3 }} />
          <h3>No aircraft selected</h3>
          <p>Select a registration to open its airworthiness file.</p>
        </div>
      </aside>
    )
  }

  const data = file?.data
  const arc = data?.arc

  return (
    <aside className="camo-file">
      <div className="camo-file__head">
        <div>
          <div className="camo-file__reg">{row.registration}</div>
          <div className="camo-file__type">{row.icaoType}</div>
        </div>
        <Badge tone={STATUS_TONE[row.status] ?? 'NEUTRAL'} warn={row.status === 'AOG'}
               title={row.statusReason ?? undefined}>
          {STATUS_LABEL[row.status] ?? row.status}
        </Badge>
      </div>

      <div className="camo-file__grid">
        <div className="camo-file__cell">
          <div className="lbl">ARC — due date</div>
          <div className="val">{arc ? dayMonthYear(arc.expiresOn) : EMPTY}</div>
        </div>
        <div className="camo-file__cell">
          <div className="lbl">Days remaining</div>
          <div className="val">
            {/* Negatif quand le certificat est perime : dire « 0 d » masquerait
                de combien, et c'est la seule chose qui compte a ce moment-la. */}
            {arc?.daysLeft == null ? EMPTY
              : arc.daysLeft < 0 ? `${Math.abs(arc.daysLeft)} d expired`
                : `${arc.daysLeft} d`}
          </div>
        </div>
        <div className="camo-file__cell">
          <div className="lbl">Hours since new</div>
          <div className="val">{row.hoursSinceNew ?? EMPTY}</div>
        </div>
        <div className="camo-file__cell">
          <div className="lbl">Cycles since new</div>
          <div className="val">{row.cyclesSinceNew ?? EMPTY}</div>
        </div>
      </div>

      <div className="camo-file__divider" />
      <h3 className="camo-file__title">Life-limited parts</h3>
      {file?.isLoading ? <LoadingState label="Reading the file…" /> : null}
      {data && data.lifeLimitedParts.length === 0 ? (
        <div className="camo-doc__empty" style={{ padding: '12px 0' }}>
          No life-limited part recorded for this registration.
        </div>
      ) : null}
      {(data?.lifeLimitedParts ?? []).map((part) => (
        <div className="llp-row" key={part.id}>
          <div className="llp-row__name">
            {part.name}
            {part.position ? <div className="llp-row__pos">{part.position}</div> : null}
          </div>
          <div className="mini-bar">
            <div className={`mini-bar__fill mini-bar__fill--${part.severity}`}
                 style={{ width: `${part.percentRemaining}%` }} />
          </div>
          <div className="llp-row__value">{part.percentRemaining}% life</div>
        </div>
      ))}

      <div className="camo-file__divider" />
      <h3 className="camo-file__title">Upcoming due dates</h3>
      {data && data.tasks.length === 0 ? (
        <div className="camo-doc__empty" style={{ padding: '12px 0' }}>Nothing due on file.</div>
      ) : null}
      {(data?.tasks ?? []).slice(0, 6).map((task) => (
        <div className="event-item" key={task.taskId}>
          <div className="event-item__dot" style={{ background: DUE_DOT[task.status] ?? 'var(--text-faint)' }} />
          <div>
            <div className="event-item__t">{task.code} — {task.title}</div>
            <div className="event-item__d">
              {task.dueOn ? dayMonthYear(task.dueOn) : 'no calendar limit'}
              {task.remainingDays == null ? '' :
                task.remainingDays < 0 ? ` · ${Math.abs(task.remainingDays)} d late`
                  : ` · in ${task.remainingDays} d`}
            </div>
          </div>
        </div>
      ))}

      <div className="camo-actions">
        <button type="button" onClick={() => onOpenDocument('ARC')}>
          <FileText size={15} strokeWidth={1.7} />ARC File
        </button>
        <button type="button" onClick={() => onOpenDocument('ADSB')}>
          <AlertTriangle size={15} strokeWidth={1.7} />AD / SB
        </button>
        <button type="button" onClick={() => onOpenDocument('WO')}>
          <Wrench size={15} strokeWidth={1.7} />Work Order
        </button>
      </div>
    </aside>
  )
}
