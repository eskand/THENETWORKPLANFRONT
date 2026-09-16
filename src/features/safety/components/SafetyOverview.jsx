import { AlertTriangle, CalendarCheck, CheckSquare, ClipboardList, ShieldCheck } from 'lucide-react'
import Badge from '../../../components/Badge'
import { EMPTY, dayMonthYear } from '../../../lib/format'

const AUDIT_TONE = { CLOSED: 'READY', IN_PROGRESS: 'PENDING', PLANNED: 'INFO', CANCELLED: 'NEUTRAL' }

/**
 * Le tableau de bord du Safety Manager.
 *
 * <b>Aucun chiffre de cet écran n'est stocké.</b> Les compteurs viennent du
 * registre des occurrences, les indicateurs du module qui détient la réponse,
 * et les constats du balayage lancé au moment où la page s'ouvre. C'est la
 * différence que relevait l'audit : le prototype écrit ses chiffres de tableau
 * de bord dans son propre code, ce qui lui fait annoncer quatre constats
 * d'audit ouverts quand sa liste d'audits en porte cinq.
 */
export default function SafetyOverview({ data, onScan, scanning, onOpenTab }) {
  const tiles = [
    {
      label: 'Occurrences this month', value: data.occurrencesThisMonth,
      hint: `${data.occurrencesStillOpen} still open`, accent: 'var(--info-fg)',
      icon: AlertTriangle,
    },
    {
      label: 'Risks above tolerance', value: data.risksAboveTolerance,
      hint: 'residual index ≥ 15', accent: 'var(--attention-fg)',
      alert: data.risksAboveTolerance > 0, icon: AlertTriangle,
    },
    {
      label: 'Overdue actions', value: data.overdueActions,
      hint: 'escalation required', accent: 'var(--pending-fg)',
      alert: data.overdueActions > 0, icon: ClipboardList,
    },
    {
      label: 'Open audit findings', value: data.openAuditFindings,
      hint: `${data.auditsPlanned} audits planned`, accent: 'var(--accent-teal)',
      icon: CheckSquare,
    },
    {
      label: 'Live monitoring findings', value: data.monitoring.total,
      hint: `${data.monitoring.critical} critical · ${data.monitoring.high} high`,
      accent: 'var(--ready-fg)', alert: data.monitoring.critical > 0, icon: ShieldCheck,
    },
  ]

  return (
    <>
      <div className="page__head">
        <div>
          <h1>Safety Overview</h1>
          <p>ICAO Annex 19 · EASA ORO.GEN.200 · IS-BAO Stage 2 — accountable manager view</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="toolbar__button" disabled={scanning} onClick={onScan}>
            {scanning ? 'Scanning…' : 'Run safety scan'}
          </button>
        </div>
      </div>

      <Banners data={data} onOpenTab={onOpenTab} />

      <div className="kpi-strip">
        {tiles.map((tile) => (
          <div className="kpi" key={tile.label}
               style={{ '--kpi-accent': tile.accent,
                        '--kpi-value': tile.alert ? tile.accent : undefined }}>
            <span className="kpi__corners" />
            <div className="eyebrow">{tile.label}</div>
            <div className="kpi__value">{tile.value}</div>
            <div className="kpi__hint">{tile.hint}</div>
          </div>
        ))}
      </div>

      <div className="sms-grid">
        <RiskProfile profile={data.riskProfile} />
        <Trend points={data.trend} />
        <Indicators indicators={data.indicators} />
        <OperationalRisk domains={data.monitoring.byDomain} onOpenTab={onOpenTab} />
        <RecentOccurrences occurrences={data.recentOccurrences} />
        <CorrectiveActions actions={data.correctiveActions} />
        <AuditProgramme audits={data.auditProgramme} />
        <Accountability accountability={data.accountability} />
      </div>
    </>
  )
}

/* ---------- bannières ---------- */

function Banners({ data, onOpenTab }) {
  const critical = data.monitoring.critical
  return (
    <>
      {critical === 0 ? (
        <div className="sms-banner sms-banner--ok">
          <span className="sms-banner__icon"><ShieldCheck size={16} /></span>
          <span className="sms-banner__text">
            <b>No critical safety finding</b> — the scan found nothing that prevents safe operation.
          </span>
        </div>
      ) : (
        <div className="sms-banner sms-banner--critical">
          <span className="sms-banner__icon"><AlertTriangle size={16} /></span>
          <span className="sms-banner__text">
            <b>{critical} critical safety finding{critical > 1 ? 's' : ''}</b> — conditions that
            prevent safe operation are active across the fleet or crew.
          </span>
          <button type="button" className="sms-banner__link" onClick={() => onOpenTab('MONITORING')}>
            Open →
          </button>
        </div>
      )}

      {data.overdueActions > 0 ? (
        <div className="sms-banner sms-banner--warn">
          <span className="sms-banner__icon"><AlertTriangle size={16} /></span>
          <span className="sms-banner__text">
            <b>{data.overdueActions} overdue corrective action
              {data.overdueActions > 1 ? 's' : ''}</b>
            {' — '}
            {data.correctiveActions.filter((a) => a.overdue).slice(0, 2)
              .map((a) => `${a.reference} — ${a.title}`).join(' · ') || 'past their due date'}
          </span>
        </div>
      ) : null}
    </>
  )
}

/* ---------- profil de risque ---------- */

function RiskProfile({ profile }) {
  const bands = [
    ['', 'Recorded', 'all classes', profile.recorded],
    ['intolerable', 'Intolerable', 'index ≥ 15', profile.intolerable],
    ['high', 'High', 'index 10–14', profile.high],
    ['tolerable', 'Tolerable', 'index ≤ 9', profile.tolerable],
  ]

  return (
    <section className="sms-card">
      <div className="sms-card__head">
        <h3 className="sms-card__title">Occurrence risk profile</h3>
      </div>
      <div className="sms-bands">
        {bands.map(([modifier, label, hint, value]) => (
          <div className={modifier ? `sms-band sms-band--${modifier}` : 'sms-band'} key={label}>
            <div className="sms-band__value">{value}</div>
            <div className="sms-band__label">{label}</div>
            <div className="sms-band__hint">{hint}</div>
          </div>
        ))}
      </div>
      {/* Une occurrence sans severite ni probabilite n'est pas « a faible
          risque » : elle n'a pas ete evaluee, et le dire est le point de
          depart de l'evaluation. */}
      {profile.unassessed > 0 ? (
        <p className="sms-note">
          {profile.unassessed} occurrence{profile.unassessed > 1 ? 's have' : ' has'} no risk
          assessment on file and {profile.unassessed > 1 ? 'are' : 'is'} counted in none of the
          three bands.
        </p>
      ) : null}
    </section>
  )
}

/* ---------- tendance ---------- */

function Trend({ points }) {
  const width = 460
  const height = 150
  const pad = { left: 26, right: 8, top: 10, bottom: 22 }
  const max = Math.max(4, ...points.map((p) => p.occurrences))
  const stepX = (width - pad.left - pad.right) / Math.max(1, points.length - 1)
  const y = (value) => pad.top + (height - pad.top - pad.bottom) * (1 - value / max)
  const x = (index) => pad.left + index * stepX

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.occurrences)}`).join(' ')
  const area = `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
  const severe = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.highAndIntolerable)}`).join(' ')

  return (
    <section className="sms-card">
      <div className="sms-card__head">
        <h3 className="sms-card__title">Safety trend analysis</h3>
        <div className="sms-legend">
          <span><i style={{ background: 'var(--info-fg)' }} />Occurrences reported</span>
          <span><i style={{ background: 'var(--attention-fg)' }} />High &amp; intolerable</span>
        </div>
      </div>

      <svg className="sms-trend" viewBox={`0 0 ${width} ${height}`} role="img"
           aria-label="Occurrences reported over the last six months">
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <g key={fraction}>
            <line className="sms-trend__grid" x1={pad.left} x2={width - pad.right}
                  y1={y(max * fraction)} y2={y(max * fraction)} />
            <text className="sms-trend__axis" x={pad.left - 6} y={y(max * fraction) + 3}
                  textAnchor="end">{Math.round(max * fraction)}</text>
          </g>
        ))}
        <path className="sms-trend__area" d={area} />
        <path className="sms-trend__line" d={line} />
        <path className="sms-trend__severe" d={severe} />
        {points.map((p, i) => (
          <g key={p.month}>
            <circle className="sms-trend__dot" cx={x(i)} cy={y(p.occurrences)} r="3" />
            <circle className="sms-trend__dot sms-trend__dot--severe" cx={x(i)}
                    cy={y(p.highAndIntolerable)} r="2.5" />
            <text className="sms-trend__axis" x={x(i)} y={height - 6} textAnchor="middle">
              {p.month}
            </text>
          </g>
        ))}
      </svg>

      <p className="sms-note">
        Rolling six months, every month counted from the occurrence register. These two series are
        the inputs to SPI-01 (occurrence rate) and SPI-02 (high and critical risk occurrences).
      </p>
    </section>
  )
}

/* ---------- indicateurs ---------- */

function Indicators({ indicators }) {
  return (
    <section className="sms-card">
      <div className="sms-card__head">
        <h3 className="sms-card__title">Safety performance indicators — against target</h3>
      </div>
      {indicators.map((spi) => {
        const state = spi.breachesAlert ? 'alert' : spi.meetsTarget ? 'ok' : 'miss'
        /* La barre montre l'atteinte de la cible, bornee a 100 % : au-dela,
           depasser la cible n'est pas « plus vert », c'est atteint. */
        const ratio = spi.value == null || Number(spi.target) === 0
          ? (spi.meetsTarget ? 1 : 0)
          : spi.direction === 'HIGHER'
            ? Math.min(1, Number(spi.value) / Number(spi.target))
            : Math.min(1, Number(spi.target) / Math.max(Number(spi.value), 0.01))

        return (
          <div className="sms-spi" key={spi.code}>
            <div className="sms-spi__label">
              <div className="sms-spi__name">{spi.name}</div>
              <div className="sms-spi__meta">
                {spi.code} · target {spi.direction === 'LOWER' ? '≤' : '≥'} {Number(spi.target)}
                {spi.unit ? ` ${spi.unit}` : ''}
                {spi.computedBy ? ` · ${spi.computedBy}` : ''}
              </div>
            </div>
            <div className="sms-spi__gauge">
              <div className={`sms-spi__fill sms-spi__fill--${state}`}
                   style={{ width: `${Math.round(ratio * 100)}%` }} />
            </div>
            {/* Null n'est pas zero : « pas mesurable » et « aucun evenement »
                ne veulent pas dire la meme chose sur un indicateur de securite. */}
            <div className={spi.value == null
              ? 'sms-spi__value sms-spi__value--none'
              : `sms-spi__value sms-spi__value--${state === 'ok' ? 'ok' : state}`}
                 title={spi.value == null ? 'No exposure figure to measure this against yet' : undefined}>
              {spi.value == null ? 'not measured' : Number(spi.value)}
            </div>
          </div>
        )
      })}
    </section>
  )
}

/* ---------- risque opérationnel ---------- */

function OperationalRisk({ domains, onOpenTab }) {
  return (
    <section className="sms-card">
      <div className="sms-card__head">
        <h3 className="sms-card__title">Live operational risk picture</h3>
        <button type="button" className="sms-card__link" onClick={() => onOpenTab('MONITORING')}>
          Open monitoring ›
        </button>
      </div>
      {domains.length === 0 ? (
        <p className="sms-note">The scan found nothing outstanding in any domain.</p>
      ) : null}
      {domains.map((domain) => (
        <div className="sms-domain" key={domain.domain}>
          <div className="sms-domain__name">{domain.label}</div>
          <div className="sms-domain__bar">
            {[['critical', domain.critical], ['high', domain.high],
              ['medium', domain.medium], ['low', domain.low]].map(([kind, count]) => (
                count > 0 ? (
                  <div key={kind} className={`sms-domain__seg sms-domain__seg--${kind}`}
                       style={{ width: `${(count / domain.total) * 100}%` }}
                       title={`${count} ${kind}`} />
                ) : null
              ))}
          </div>
          <div className="sms-domain__count">{domain.total}</div>
        </div>
      ))}
    </section>
  )
}

/* ---------- listes ---------- */

function RecentOccurrences({ occurrences }) {
  return (
    <section className="sms-card">
      <div className="sms-card__head">
        <h3 className="sms-card__title">Recent occurrences</h3>
      </div>
      {occurrences.map((occurrence) => (
        <div className="sms-item" key={occurrence.id}>
          <span className="sms-item__icon"><AlertTriangle size={14} /></span>
          <div className="sms-item__body">
            <div className="sms-item__title">{occurrence.title}</div>
            <div className="sms-item__meta">
              {occurrence.reference} · {occurrence.category}
              {occurrence.registration ? ` · ${occurrence.registration}` : ''}
              {occurrence.eccairsReference ? ` · ${occurrence.eccairsReference}` : ''}
            </div>
          </div>
          <div className="sms-item__right">{dayMonthYear(occurrence.occurredAt)}</div>
        </div>
      ))}
      {occurrences.length === 0 ? <p className="sms-note">Nothing recorded yet.</p> : null}
    </section>
  )
}

function CorrectiveActions({ actions }) {
  return (
    <section className="sms-card">
      <div className="sms-card__head">
        <h3 className="sms-card__title">Corrective actions</h3>
      </div>
      {actions.map((action) => (
        <div className="sms-item" key={action.id}>
          <span className="sms-item__icon"><CheckSquare size={14} /></span>
          <div className="sms-item__body">
            <div className="sms-item__title">{action.title}</div>
            <div className="sms-item__meta">
              {action.reference}{action.ownerName ? ` · ${action.ownerName}` : ''}
            </div>
          </div>
          <div className="sms-item__right">
            {action.overdue ? (
              <Badge tone="ATTENTION" warn>{action.daysLate} d late</Badge>
            ) : (
              <>{action.dueOn ? dayMonthYear(action.dueOn) : EMPTY}</>
            )}
          </div>
        </div>
      ))}
      {actions.length === 0 ? <p className="sms-note">No action outstanding.</p> : null}
    </section>
  )
}

function AuditProgramme({ audits }) {
  return (
    <section className="sms-card">
      <div className="sms-card__head">
        <h3 className="sms-card__title">Audit programme</h3>
      </div>
      {audits.map((audit) => (
        <div className="sms-item" key={audit.id}>
          <span className="sms-item__icon"><CalendarCheck size={14} /></span>
          <div className="sms-item__body">
            <div className="sms-item__title">{audit.name}</div>
            <div className="sms-item__meta">
              {audit.standard} · {dayMonthYear(audit.plannedOn)}
              {audit.externalAudit ? ' · external' : ' · internal'}
              {audit.scorePercent != null ? ` · ${audit.scorePercent}% conformity` : ''}
            </div>
          </div>
          <div className="sms-item__right">
            <Badge tone={AUDIT_TONE[audit.status] ?? 'NEUTRAL'}>
              {audit.status.replace('_', ' ').toLowerCase()}
            </Badge>
            <div style={{ marginTop: 3 }}>
              {audit.openFindings > 0 ? `${audit.openFindings} open` : EMPTY}
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}

function Accountability({ accountability }) {
  const rows = [
    ['Accountable Manager', accountability.accountableManager],
    ['Safety Manager', accountability.safetyManager],
    ['Operator', accountability.operator],
    ['AOC reference', accountability.aocReference],
    ['Management of change', `${accountability.activeChanges} active`],
  ]
  return (
    <section className="sms-card">
      <div className="sms-card__head">
        <h3 className="sms-card__title">SMS accountability</h3>
      </div>
      {rows.map(([label, value]) => (
        <div className="sms-account" key={label}>
          <span className="sms-account__label">{label}</span>
          <span className="sms-account__value">{value ?? EMPTY}</span>
        </div>
      ))}
      <p className="sms-note">
        {/* Le panneau du prototype affiche ces noms en dur. Ici ils sont des
            reglages : ils se saisissent dans Settings, et l'ecran dit d'ou ils
            viennent plutot que de les affirmer. */}
        Declared in Settings → Safety (SMS). Last scan{' '}
        {new Date(accountability.lastScanAt).toISOString().slice(11, 16)} UTC.
      </p>
    </section>
  )
}
