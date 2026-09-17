/**
 * The small pieces the annexe's Safety Manager is built from.
 *
 * <b>These emit the prototype's own class names.</b> {@code .kc}, {@code .badge},
 * {@code .sev-dot}, {@code .ftag} — the stylesheet in {@code styles/safeops.css}
 * is the annexe's, copied verbatim, and the only way to get the annexe's screen
 * is to hand that stylesheet the markup it was written for. Inventing parallel
 * class names and matching the result by eye is what produced a screen that was
 * close and never right.
 *
 * <b>Colours are looked up by meaning.</b> Critical is #C0392B wherever it
 * appears, because the function decides it — not the order something happens to
 * sit in a list.
 */

/** The annexe's severity palette, used by dots, bars and tiles alike. */
export const SEV_COLOUR = {
  critical: '#C0392B',
  high: '#E67E22',
  medium: '#E0C22A',
  low: '#27AE60',
}

/** A headline figure. `tone` is the annexe's c1…c5, `ico` its ic-b…ic-g. */
export function KpiCard({ tone, ico, label, value, sub, icon: Icon, onOpen }) {
  return (
    <div className={`kc ${tone}`} style={onOpen ? { cursor: 'pointer' } : undefined}
         onClick={onOpen} role={onOpen ? 'button' : undefined}
         tabIndex={onOpen ? 0 : undefined}
         onKeyDown={onOpen ? (event) => { if (event.key === 'Enter') onOpen() } : undefined}>
      <div className={`kc-ico ${ico}`}><Icon size={14} strokeWidth={1.8} /></div>
      <div className="kc-lbl">{label}</div>
      <div className="kc-val">{value}</div>
      <div className="kc-sub">{sub}</div>
    </div>
  )
}

export function SevDot({ sev }) {
  return <span className="sev-dot" style={{ background: SEV_COLOUR[sev] ?? SEV_COLOUR.low }} />
}

/**
 * The tolerability band of a risk index, ICAO Doc 9859.
 *
 * <p>The thresholds are the annexe's: 15 and above is intolerable, 10 to 14
 * high, 5 to 9 medium, below that acceptable. They are here rather than in each
 * screen so a figure cannot be banded two different ways on two tabs.
 */
export function riskBand(index) {
  if (index >= 15) return { cls: 'critical', short: 'Intolerable' }
  if (index >= 10) return { cls: 'high', short: 'High' }
  if (index >= 5) return { cls: 'medium', short: 'Tolerable' }
  return { cls: 'low', short: 'Acceptable' }
}

export function RiskBadge({ index }) {
  if (index == null) return <span className="badge low">not assessed</span>
  const band = riskBand(index)
  return <span className={`badge ${band.cls}`}>{index} · {band.short}</span>
}

const STATUS_CLS = {
  REPORTED: 'medium',
  UNDER_REVIEW: 'medium',
  RISK_ASSESSED: 'high',
  ACTIONS_OPEN: 'high',
  CLOSED: 'low',
  OPEN: 'critical',
  IN_PROGRESS: 'high',
  PLANNED: 'medium',
  CANCELLED: 'low',
  DONE: 'low',
}

export function StatusBadge({ status, label }) {
  const key = String(status ?? '').toUpperCase()
  return (
    <span className={`badge ${STATUS_CLS[key] ?? 'medium'}`}>
      {label ?? titleise(status)}
    </span>
  )
}

export function Empty({ children }) {
  return <div className="sms-empty">{children}</div>
}

/** A filter chip. The annexe calls it a ftag and marks the live one `on`. */
export function FTag({ active, onClick, children }) {
  return (
    <div className={`ftag${active ? ' on' : ''}`} onClick={onClick} role="button" tabIndex={0}
         onKeyDown={(event) => { if (event.key === 'Enter') onClick() }}>
      {children}
    </div>
  )
}

/** « ACTIONS_OPEN » is not what an accountable manager reads on a page. */
export function titleise(value) {
  if (!value) return '—'
  const spaced = String(value).replace(/_/g, ' ').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
