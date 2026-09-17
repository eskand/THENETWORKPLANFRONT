import {
  Activity, AlertCircle, AlertTriangle, Calendar, CheckCheck, CheckSquare, Clock, Plus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Chart from '../../../components/Chart'
import { Empty, KpiCard, RiskBadge, SEV_COLOUR } from './SafeOps'
import { EMPTY, dayMonthYear } from '../../../lib/format'

/**
 * Safety Overview — the accountable manager's view.
 *
 * <b>Nothing on this screen is stored.</b> The counters come from the
 * occurrence register, the indicators from the module that owns each answer,
 * and the findings from the scan that runs when the page opens. That is the
 * difference the audit drew: the prototype writes its dashboard figures into
 * its own code, which is how it announces four open audit findings while its
 * own audit list carries five.
 *
 * <b>The rows are the annexe's, in its order.</b> What happened, then what we
 * measure of it, then what we are doing about it — two cards, two cards, two
 * cards, three cards. A free grid reorders them at every window width and puts
 * « corrective actions » above the risk profile that justifies them.
 */
export default function SafetyOverview({ data, onScan, scanning, onOpenTab }) {
  const navigate = useNavigate()

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Safety Overview</div>
          <div className="page-sub">
            ICAO Annex 19 · EASA ORO.GEN.200 · IS-BAO Stage 2 — accountable manager view
          </div>
        </div>
        <div className="btn-row">
          <button className="btn-o" disabled={scanning} onClick={onScan}>
            {scanning ? 'Scanning…' : 'Run safety scan'}
          </button>
          {/* Enregistrer une occurrence se fait sur l'ecran de declaration : un
              deuxieme formulaire ici finirait par diverger du premier, et c'est
              le brouillon de l'un qui manquerait a l'autre. */}
          <button className="btn-p" onClick={() => navigate('/safety-reports')}>
            <Plus size={12} strokeWidth={2.4} /> Record occurrence
          </button>
        </div>
      </div>

      <Alerts data={data} onOpenTab={onOpenTab} />

      <div className="kpi-row">
        <KpiCard tone="c1" ico="ic-b" icon={AlertTriangle}
                 label="Occurrences this month" value={data.occurrencesThisMonth}
                 sub={`${data.occurrencesStillOpen} still open`}
                 onOpen={() => onOpenTab('OCCURRENCES')} />
        <KpiCard tone="c2" ico="ic-r" icon={AlertCircle}
                 label="Risks above tolerance" value={data.risksAboveTolerance}
                 sub="residual index ≥ 10" onOpen={() => onOpenTab('RISK')} />
        <KpiCard tone="c5" ico="ic-o" icon={Clock}
                 label="Overdue actions" value={data.overdueActions}
                 sub={data.overdueActions ? 'escalation required' : 'all within date'}
                 onOpen={() => onOpenTab('ASSURANCE')} />
        <KpiCard tone="c3" ico="ic-s" icon={CheckSquare}
                 label="Open audit findings" value={data.openAuditFindings}
                 sub={`${data.auditsPlanned} audits planned`}
                 onOpen={() => onOpenTab('ASSURANCE')} />
        <KpiCard tone="c4" ico="ic-g" icon={Activity}
                 label="Live monitoring findings" value={data.monitoring.total}
                 sub={`${data.monitoring.critical} critical · ${data.monitoring.high} high`}
                 onOpen={() => onOpenTab('MONITORING')} />
      </div>

      <div className="row-chart">
        <RiskProfile profile={data.riskProfile} onOpenTab={onOpenTab} />
        <Trend points={data.trend} />
      </div>

      <div className="row-wide">
        <Indicators indicators={data.indicators} onOpenTab={onOpenTab} />
        <OperationalRisk domains={data.monitoring.byDomain} onOpenTab={onOpenTab} />
      </div>

      <div className="row-wide">
        <RecentOccurrences occurrences={data.recentOccurrences} onOpenTab={onOpenTab} />
        <ResidualVsInitial domains={data.riskByDomain} />
      </div>

      <div className="row3">
        <CorrectiveActions actions={data.correctiveActions} onOpenTab={onOpenTab} />
        <AuditProgramme audits={data.auditProgramme} onOpenTab={onOpenTab} />
        <Accountability accountability={data.accountability} changes={data.changes}
                        onOpenTab={onOpenTab} />
      </div>
    </>
  )
}

/* ─────────────────────────────── les bannieres ─────────────────────────── */

/**
 * Les quatre choses qu'un dirigeant responsable doit voir en premier.
 *
 * <p>Dans l'ordre de l'annexe : le roster publie, les constats critiques, les
 * actions correctives en retard, puis les notifications obligatoires. L'ordre
 * n'est pas decoratif — il va du plus contraignant (un roster illegal arrete
 * des vols) au plus administratif (un depot a l'autorite).
 */
function Alerts({ data, onOpenTab }) {
  const roster = data.rosterCheck
  const critical = data.monitoring.critical
  const overdue = (data.correctiveActions ?? []).filter((action) => action.overdue)
  const mor = morOutstanding(data)

  return (
    <>
      {roster && roster.months.length ? (
        roster.exceedances === 0 ? (
          /* Le texte de l'annexe, au point final pres. Le cas « zero garde
             controlee » ne se presente pas ici : une version de roster publiee
             sans aucune garde enregistree est traitee plus bas, et une banniere
             verte ne peut donc jamais annoncer un resultat propre sur rien. */
          roster.dutiesChecked === 0 ? (
            <div className="alert"
                 style={{ background: 'rgba(224,194,42,.08)', borderColor: 'rgba(224,194,42,.3)' }}>
              <div className="alert-txt" style={{ color: '#8a6d0b', fontWeight: 600 }}>
                📋 Published Roster: {roster.months.join(', ')} is published but holds no recorded
                duty, so no FTL check could be run against it.
              </div>
            </div>
          ) : (
            <div className="alert"
                 style={{ background: 'rgba(34,197,94,.06)', borderColor: 'rgba(34,197,94,.2)' }}>
              <div className="alert-txt" style={{ color: '#166534', fontWeight: 600 }}>
                📋 Published Roster: no FTL/currency exceedances found across{' '}
                {roster.months.join(', ')}.
              </div>
            </div>
          )
        ) : (
          <Alert colour="#C0392B" onOpen={() => onOpenTab('PERSONNEL')}
                 title={`${roster.exceedances} Published Roster FTL exceedance${
                   roster.exceedances > 1 ? 's' : ''}`}
                 detail={`${roster.crewAffected.join(', ')} — from the published crew roster.`} />
        )
      ) : null}

      {critical ? (
        <Alert colour="#C0392B" onOpen={() => onOpenTab('MONITORING')}
               title={`${critical} critical safety finding${critical > 1 ? 's' : ''}`}
               detail="Conditions that prevent safe operation are active across the fleet or crew." />
      ) : null}

      {overdue.length ? (
        <Alert colour="#E67E22" onOpen={() => onOpenTab('ASSURANCE')}
               title={`${overdue.length} overdue corrective action${
                 overdue.length > 1 ? 's' : ''}`}
               detail={overdue.slice(0, 2)
                 .map((action) => `${action.reference} — ${action.title}`).join(' · ')} />
      ) : null}

      {mor ? (
        <Alert colour="#C0392B" onOpen={() => onOpenTab('OCCURRENCES')}
               title={`${mor} mandatory occurrence report${mor > 1 ? 's' : ''} not yet filed`}
               detail="Regulation (EU) 376/2014 requires notification within 72 hours of becoming aware of the occurrence." />
      ) : null}
    </>
  )
}

function Alert({ colour, title, detail, onOpen }) {
  return (
    <div className="alert" style={{ borderColor: `${colour}33`, background: `${colour}0f` }}>
      <div className="alert-ico" style={{ background: `${colour}1a` }}>
        <AlertTriangle size={13} style={{ stroke: colour }} />
      </div>
      <div className="alert-txt" style={{ color: colour }}>
        <b>{title}</b> — {detail}
      </div>
      <div className="alert-cta" style={{ color: colour }} onClick={onOpen}
           role="button" tabIndex={0}
           onKeyDown={(event) => { if (event.key === 'Enter') onOpen() }}>
        Open →
      </div>
    </div>
  )
}

/**
 * Les occurrences a notification obligatoire qui n'ont pas ete deposees.
 *
 * <p>Une occurrence classee autrement que « occurrence » par ECCAIRS doit etre
 * notifiee ; tant que la date d'export est vide, elle ne l'est pas. Le compte
 * se derive de l'etat reel, jamais d'un drapeau qu'on oublierait de lever.
 */
function morOutstanding(data) {
  return (data.recentOccurrences ?? []).filter((occurrence) => {
    const kind = occurrence.eccairsOccurrenceClass
    return Boolean(kind) && kind.toUpperCase() !== 'OCCURRENCE'
      && occurrence.eccairsExportedAt == null
  }).length
}

/* ─────────────────────────── profil de risque ──────────────────────────── */

function RiskProfile({ profile, onOpenTab }) {
  const bands = [
    ['Recorded', profile.recorded, 'var(--navy)', 'all classes'],
    ['Intolerable', profile.intolerable, '#C0392B', 'index ≥ 15'],
    ['High', profile.high, '#E67E22', 'index 10–14'],
    ['Tolerable', profile.tolerable, '#27AE60', 'index ≤ 9'],
  ]

  return (
    <div className="card">
      <div className="card-hdr">
        <div className="card-title">Occurrence risk profile</div>
        <div className="viewall" onClick={() => onOpenTab('OCCURRENCES')}
             role="button" tabIndex={0}
             onKeyDown={(event) => { if (event.key === 'Enter') onOpenTab('OCCURRENCES') }}>
          Register ›
        </div>
      </div>

      <div className="mini-kpis">
        {bands.map(([label, value, colour, hint]) => (
          <div className="mini-kpi" key={label} style={{ borderBottomColor: colour }}>
            <div className="mini-v" style={{ color: colour }}>{value}</div>
            <div className="mini-l">{label}</div>
            <div className="mini-s">{hint}</div>
          </div>
        ))}
      </div>

      <Chart chart={{
        id: 'ov-donut', title: 'Occurrences by risk band', kind: 'donut', width: 'full',
        labels: ['High (10–14)', 'Intolerable (≥ 15)', 'Tolerable (≤ 9)'],
        series: [{
          label: 'Occurrences',
          data: [profile.high, profile.intolerable, profile.tolerable],
          colours: ['#E67E22', '#C0392B', '#27AE60'],
        }],
      }} bare />

      {/* Une occurrence sans severite ni probabilite n'est pas « a faible
          risque » : elle n'a pas ete evaluee, et le dire est le point de depart
          de l'evaluation. */}
      {profile.unassessed > 0 ? (
        <div className="mtx-note">
          {profile.unassessed} occurrence{profile.unassessed > 1 ? 's have' : ' has'} no risk
          assessment on file and {profile.unassessed > 1 ? 'are' : 'is'} counted in none of the
          three bands.
        </div>
      ) : null}
    </div>
  )
}

/* ───────────────────────────── la tendance ─────────────────────────────── */

function Trend({ points }) {
  return (
    <div className="card">
      <div className="card-hdr">
        <div className="card-title">Safety trend analysis</div>
        <div className="rleg">
          <span><i style={{ background: '#1B2D6B' }} />Occurrences reported</span>
          <span><i style={{ background: '#C0392B' }} />High &amp; intolerable</span>
        </div>
      </div>

      <Chart chart={{
        id: 'ov-trend', title: 'Six month occurrence and high-risk trend', kind: 'line',
        width: 'full',
        labels: points.map((point) => point.month),
        series: [
          { label: 'Occurrences reported',
            data: points.map((point) => point.occurrences), colour: '#1B2D6B' },
          { label: 'High & intolerable',
            data: points.map((point) => point.highAndIntolerable), colour: '#C0392B' },
        ],
      }} bare />

      <div className="mtx-note">
        Rolling six months, every month counted from the occurrence register. These two series are
        the inputs to SPI-01 (occurrence rate) and SPI-02 (high and critical risk occurrences).
      </div>
    </div>
  )
}

/* ──────────────────────────── les indicateurs ──────────────────────────── */

function Indicators({ indicators, onOpenTab }) {
  return (
    <div className="card">
      <div className="card-hdr">
        <div className="card-title">Safety performance indicators — against target</div>
        <div className="viewall" onClick={() => onOpenTab('ASSURANCE')}
             role="button" tabIndex={0}
             onKeyDown={(event) => { if (event.key === 'Enter') onOpenTab('ASSURANCE') }}>
          Safety assurance ›
        </div>
      </div>

      {indicators.map((spi) => {
        const colour = spi.breachesAlert ? '#C0392B' : spi.meetsTarget ? '#27AE60' : '#E67E22'
        /* La barre montre l'atteinte de la cible, bornee a 100 % : au-dela,
           depasser la cible n'est pas « plus vert », c'est atteint. */
        const ratio = spi.value == null || Number(spi.target) === 0
          ? (spi.meetsTarget ? 1 : 0)
          : spi.direction === 'HIGHER'
            ? Math.min(1, Number(spi.value) / Number(spi.target))
            : Math.min(1, Number(spi.target) / Math.max(Number(spi.value), 0.01))

        return (
          <div className="spi-row" key={spi.code}>
            <div className="spi-name">
              <b>{spi.name}</b>
              <span>
                {spi.code} · target {spi.direction === 'LOWER' ? '≤' : '≥'} {Number(spi.target)}
                {spi.unit ? ` ${spi.unit}` : ''}
              </span>
            </div>
            <div className="spi-bar">
              <div className="spi-fill"
                   style={{ width: `${Math.round(ratio * 100)}%`, background: colour }} />
            </div>
            {/* Null n'est pas zero : « pas mesurable » et « aucun evenement » ne
                veulent pas dire la meme chose sur un indicateur de securite. */}
            <div className="spi-val"
                 style={{ color: spi.value == null ? '#64748b' : colour }}
                 title={spi.value == null ? 'No exposure figure to measure this against yet'
                   : spi.computedBy}>
              {spi.value == null ? 'n/m' : Number(spi.value)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ────────────────────── le risque operationnel vivant ──────────────────── */

function OperationalRisk({ domains, onOpenTab }) {
  return (
    <div className="card">
      <div className="card-hdr">
        <div className="card-title">Live operational risk picture</div>
        <div className="viewall" onClick={() => onOpenTab('MONITORING')}
             role="button" tabIndex={0}
             onKeyDown={(event) => { if (event.key === 'Enter') onOpenTab('MONITORING') }}>
          Open monitoring ›
        </div>
      </div>

      {domains.length === 0 ? (
        <Empty>No open findings in any operational module.</Empty>
      ) : domains.map((domain) => (
        <div className="domrow" key={domain.domain}
             onClick={() => onOpenTab('MONITORING')} role="button" tabIndex={0}
             onKeyDown={(event) => { if (event.key === 'Enter') onOpenTab('MONITORING') }}>
          <span className="domrow-n">{domain.label}</span>
          <div className="domrow-bars">
            {['critical', 'high', 'medium', 'low'].map((sev) => (
              domain[sev] ? (
                <div className="db" key={sev}
                     style={{ background: SEV_COLOUR[sev], flex: domain[sev] }}
                     title={`${domain[sev]} ${sev}`} />
              ) : null
            ))}
          </div>
          <span className="domrow-c">{domain.total}</span>
        </div>
      ))}
    </div>
  )
}

/* ──────────────────────── residuel contre initial ──────────────────────── */

/**
 * Ce que les barrieres ont reellement enleve, par domaine.
 *
 * <b>Deux series sur les memes categories, pas une.</b> Un registre qui ne
 * montrerait que le residuel laisserait croire que le domaine est calme ; c'est
 * l'ecart entre les deux qui dit ce que les controles achetent, et un ecart nul
 * dit qu'ils n'achetent rien.
 */
function ResidualVsInitial({ domains }) {
  const rows = domains ?? []
  return (
    <div className="card">
      <div className="card-hdr">
        <div className="card-title">Risk profile — residual vs initial</div>
        <div className="dots">
          <div className="dot" /><div className="dot" /><div className="dot" />
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty>No hazard is on the register yet.</Empty>
      ) : (
        <Chart chart={{
          id: 'ov-riskchart', title: 'Risk index by domain', kind: 'bar', width: 'full',
          labels: rows.map((row) => row.label),
          series: [
            { label: 'Initial risk', data: rows.map((row) => row.initialIndex), colour: '#C0392B' },
            { label: 'Residual after controls',
              data: rows.map((row) => row.residualIndex), colour: '#27AE60' },
          ],
        }} bare />
      )}

      <div className="mtx-note">
        Both figures are the ICAO Doc 9859 index — severity times likelihood. The residual is what
        the recorded controls leave behind; where the two bars are the same height, the controls on
        file are not yet reducing the risk.
      </div>
    </div>
  )
}

/* ──────────────────────────────── les listes ───────────────────────────── */

function RecentOccurrences({ occurrences, onOpenTab }) {
  const open = () => onOpenTab('OCCURRENCES')
  return (
    <div className="card">
      <div className="card-hdr">
        <div className="card-title">Recent occurrences</div>
        <div className="viewall" onClick={open} role="button" tabIndex={0}
             onKeyDown={(event) => { if (event.key === 'Enter') open() }}>
          View register ›
        </div>
      </div>

      {occurrences.length === 0 ? <Empty>No occurrences recorded.</Empty> : null}

      {occurrences.slice(0, 6).map((occurrence) => {
        const index = occurrence.riskSeverity && occurrence.riskProbability
          ? severityValue(occurrence.riskSeverity) * occurrence.riskProbability
          : null
        const band = index == null ? 'l'
          : index >= 15 ? 'c' : index >= 10 ? 'h' : index >= 5 ? 'm' : 'l'
        return (
          <div className="fi" key={occurrence.id} onClick={open} role="button" tabIndex={0}
               onKeyDown={(event) => { if (event.key === 'Enter') open() }}>
            <div className={`fi-d ${band}`}><AlertTriangle size={12} /></div>
            <div className="fi-info">
              <div className="fi-t">{occurrence.title}</div>
              <div className="fi-m">
                {occurrence.reference} · {occurrence.category}
                {occurrence.registration ? ` · ${occurrence.registration}` : ''}
                {occurrence.eccairsOccurrenceClass
                  && occurrence.eccairsOccurrenceClass.toUpperCase() !== 'OCCURRENCE'
                  ? <> · <b>MOR</b></> : null}
              </div>
            </div>
            <div className="fi-r">
              <RiskBadge index={index} />
              <span className="fi-time">{dayMonthYear(occurrence.occurredAt)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** La valeur numerique d'une severite ICAO : A vaut 5, E vaut 1. */
function severityValue(severity) {
  return { A: 5, B: 4, C: 3, D: 2, E: 1 }[String(severity).toUpperCase()] ?? 3
}

function CorrectiveActions({ actions, onOpenTab }) {
  const open = () => onOpenTab('ASSURANCE')
  return (
    <div className="card">
      <div className="card-hdr">
        <div className="card-title">Corrective actions</div>
        <div className="viewall" onClick={open} role="button" tabIndex={0}
             onKeyDown={(event) => { if (event.key === 'Enter') open() }}>
          All ›
        </div>
      </div>

      {actions.length === 0 ? <Empty>No corrective actions.</Empty> : null}

      {actions.slice(0, 5).map((action) => (
        <div className="ai" key={action.id} onClick={open} role="button" tabIndex={0}
             onKeyDown={(event) => { if (event.key === 'Enter') open() }}>
          <div className="ai-ico"><CheckCheck size={12} /></div>
          <div>
            <div className="ai-name">{action.title}</div>
            <div className="ai-sub">{action.reference} · {action.ownerName ?? 'unassigned'}</div>
          </div>
          <div className="ai-r">
            <div className={`ai-b ${action.overdue ? 'due' : 'soon'}`}>
              {action.overdue ? `${action.daysLate} d late`
                : action.dueOn ? dayMonthYear(action.dueOn) : 'no date'}
            </div>
            <div className="ai-pc">{String(action.status ?? '').toLowerCase()}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function AuditProgramme({ audits, onOpenTab }) {
  const open = () => onOpenTab('ASSURANCE')
  return (
    <div className="card">
      <div className="card-hdr">
        <div className="card-title">Audit programme</div>
        <div className="viewall" onClick={open} role="button" tabIndex={0}
             onKeyDown={(event) => { if (event.key === 'Enter') open() }}>
          All ›
        </div>
      </div>

      {audits.length === 0 ? <Empty>No audits in the programme.</Empty> : null}

      {audits.slice(0, 5).map((audit) => (
        <div className="ai" key={audit.id} onClick={open} role="button" tabIndex={0}
             onKeyDown={(event) => { if (event.key === 'Enter') open() }}>
          <div className="ai-ico"><Calendar size={12} /></div>
          <div>
            <div className="ai-name">{audit.name}</div>
            <div className="ai-sub">{audit.standard} · {dayMonthYear(audit.plannedOn)}</div>
          </div>
          <div className="ai-r">
            <div className={`ai-b ${audit.status === 'CLOSED' ? 'closed'
              : audit.status === 'IN_PROGRESS' ? 'due' : 'soon'}`}>
              {String(audit.status).replace('_', ' ').toLowerCase()}
            </div>
            <div className="ai-pc">{audit.openFindings ? `${audit.openFindings} open` : EMPTY}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Accountability({ accountability, changes, onOpenTab }) {
  const active = (changes ?? []).filter((change) => change.active).length
  const rows = [
    ['Accountable Manager', accountability?.accountableManager],
    ['Safety Manager', accountability?.safetyManager],
    ['Operator', accountability?.operator],
    ['AOC reference', accountability?.aocReference],
    ['Management of change', `${active} active`],
    ['Last safety scan', accountability?.lastScanAt
      ? `${new Date(accountability.lastScanAt).toISOString().slice(11, 16)} UTC` : EMPTY],
  ]

  return (
    <div className="card">
      <div className="card-hdr">
        <div className="card-title">SMS accountability</div>
      </div>
      {rows.map(([label, value]) => (
        <div className="acc-row" key={label}>
          <span>{label}</span>
          <b>{value || 'not set'}</b>
        </div>
      ))}
      <div style={{ marginTop: 10 }}>
        <button className="btn-nav" style={{ width: '100%' }}
                onClick={() => onOpenTab('SETTINGS')}>
          SMS configuration
        </button>
      </div>
    </div>
  )
}
