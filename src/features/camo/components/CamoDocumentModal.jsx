import { X } from 'lucide-react'
import Badge from '../../../components/Badge'
import { EMPTY, dayMonthYear } from '../../../lib/format'

/**
 * Les trois documents du dossier de navigabilite.
 *
 * <b>Pourquoi trois et pas un.</b> Le prototype ouvre trois fenetres
 * distinctes depuis le volet de droite — ARC File, AD/SB, Work Order — et
 * c'est la bonne decoupe : elles ne s'adressent pas aux memes gens. Le
 * certificat part a l'autorite, les consignes au bureau technique, les ordres
 * de travail a l'atelier. Une fenetre unique a onglets obligerait chacun a
 * traverser les deux autres.
 *
 * <b>Ce qui est imprimable est ce qui est affiche.</b> Le corps du document est
 * le meme noeud que celui montre a l'ecran : il n'existe pas de seconde mise en
 * page pour l'impression, donc pas de risque qu'elles divergent.
 */
export default function CamoDocumentModal({ kind, row, file, onClose }) {
  if (!kind || !row) return null

  const title = kind === 'ARC' ? 'Airworthiness Review Certificate'
    : kind === 'ADSB' ? 'Airworthiness Directives & Service Bulletins'
      : 'Maintenance Work Orders'

  return (
    <>
      <div className="rmodal__backdrop" onClick={onClose} />
      <div className="rmodal rmodal--wide" role="dialog" aria-modal="true" aria-label={title}>
        <div className="camo-doc" id="camoDocPrintArea">
          <div className="camo-doc__head">
            <div>
              <div className="camo-doc__org">{title}</div>
              <div className="camo-doc__sub">{row.registration} · {row.icaoType}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {kind === 'ARC' ? <ArcPill file={file} /> : null}
              {kind === 'ADSB' ? <AdsbPill file={file} /> : null}
              {kind === 'WO' ? <WorkOrderPill file={file} /> : null}
              <button type="button" className="drawer__close" onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          {kind === 'ARC' ? <ArcBody file={file} /> : null}
          {kind === 'ADSB' ? <AdsbBody file={file} registration={row.registration} /> : null}
          {kind === 'WO' ? <WorkOrderBody file={file} registration={row.registration} /> : null}
        </div>
      </div>
    </>
  )
}

/* ---------- ARC ---------- */

const ARC_TONE = { VALID: 'READY', DUE_SOON: 'PENDING', CRITICAL: 'PENDING', EXPIRED: 'ATTENTION', NONE: 'NEUTRAL' }
const ARC_LABEL = {
  VALID: 'Valid',
  DUE_SOON: 'Renewal approaching',
  CRITICAL: 'Renewal due soon',
  EXPIRED: 'Expired — not airworthy',
  NONE: 'No certificate on file',
}

function ArcPill({ file }) {
  const verdict = file?.arc?.verdict ?? 'NONE'
  return <Badge tone={ARC_TONE[verdict]} warn={verdict === 'EXPIRED'}>{ARC_LABEL[verdict]}</Badge>
}

function ArcBody({ file }) {
  const arc = file?.arc
  const history = file?.arcHistory ?? []

  if (!arc) {
    return (
      <div className="camo-doc__empty">
        No airworthiness review certificate is recorded for this registration.
        <div style={{ marginTop: 6 }}>
          That is a gap in the record, not a formatting problem: the aircraft cannot be
          dispatched on a certificate nobody holds.
        </div>
      </div>
    )
  }

  return (
    <>
      <table className="camo-doc__info">
        <tbody>
          <tr><td>ARC reference</td><td>{arc.certificateNo}</td></tr>
          <tr><td>Certificate of Airworthiness</td><td>{arc.cofaRef ?? EMPTY}</td></tr>
          <tr><td>Issue date</td><td>{dayMonthYear(arc.issuedOn)}</td></tr>
          <tr><td>Expiry date</td><td>{dayMonthYear(arc.expiresOn)}</td></tr>
          <tr>
            <td>Days remaining</td>
            <td>
              {arc.daysLeft == null ? EMPTY
                : arc.daysLeft < 0 ? `${Math.abs(arc.daysLeft)} d expired`
                  : `${arc.daysLeft} d`}
            </td>
          </tr>
          <tr><td>Review basis</td><td>{arc.reviewBasisLabel ?? arc.reviewBasis}</td></tr>
          <tr><td>Reviewed by</td><td>{arc.reviewedBy ?? EMPTY}{arc.reviewerApprovalNo ? ` (${arc.reviewerApprovalNo})` : ''}</td></tr>
        </tbody>
      </table>

      <div className="camo-doc__section">Renewal history</div>
      {history.length === 0 ? (
        <div className="camo-doc__empty">
          No earlier certificate on file — this is the first issued for the registration.
        </div>
      ) : (
        <table className="camo-doc__rows">
          <thead>
            <tr><th>Reference</th><th>Issued</th><th>Expiry</th><th>Basis</th></tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id}>
                <td className="camo-doc__num">{item.certificateNo}</td>
                <td>{dayMonthYear(item.issuedOn)}</td>
                <td>{dayMonthYear(item.expiresOn)}</td>
                <td>{item.reviewBasisLabel ?? item.reviewBasis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="camo-doc__decl">
        Issued in accordance with Part-M / Part-CAMO continuing airworthiness requirements
        (Regulation (EU) No 1321/2014, M.A.901 / M.A.710). Validity is conditional on continued
        compliance with the approved maintenance programme, applicable Airworthiness Directives
        and the life-limited parts replacement schedule for {arc.registration}.
      </div>
    </>
  )
}

/* ---------- AD / SB ---------- */

const DIRECTIVE_TONE = { OPEN: 'PENDING', DEFERRED: 'PENDING', COMPLIED: 'READY', NOT_APPLICABLE: 'NEUTRAL' }

function AdsbPill({ file }) {
  const open = (file?.directives ?? []).filter((item) => item.status === 'OPEN').length
  return <Badge tone={open > 0 ? 'PENDING' : 'READY'}>{open > 0 ? `${open} open` : 'Clear'}</Badge>
}

function AdsbBody({ file, registration }) {
  const rows = file?.directives ?? []
  return (
    <>
      {rows.length === 0 ? (
        <div className="camo-doc__empty">
          No open Airworthiness Directives or Service Bulletins for {registration}.
        </div>
      ) : (
        <table className="camo-doc__rows">
          <thead>
            <tr><th>Reference</th><th>Status</th><th>Complied on</th><th>Compliance ref</th><th>Remark</th></tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td className="camo-doc__num">{item.registration}</td>
                <td><Badge tone={DIRECTIVE_TONE[item.status] ?? 'NEUTRAL'}>{item.status}</Badge></td>
                <td>{dayMonthYear(item.compliedOn)}</td>
                <td>{item.compliedRef ?? EMPTY}</td>
                <td>{item.remark ?? EMPTY}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="camo-doc__decl">
        Compliance is tracked against the aircraft maintenance programme and applicable
        manufacturer and authority bulletins. Overdue items ground the aircraft until corrective
        action is embodied and released to service by certifying staff.
      </div>
    </>
  )
}

/* ---------- Work orders ---------- */

const WO_TONE = {
  DRAFT: 'NEUTRAL',
  SCHEDULED: 'INFO',
  IN_WORK: 'PENDING',
  AWAITING_PARTS: 'PENDING',
  CLOSED: 'READY',
  CANCELLED: 'NEUTRAL',
}

function WorkOrderPill({ file }) {
  const orders = file?.workOrders ?? []
  const overdue = orders.filter((order) => order.overdue).length
  const running = orders.filter((order) => order.status === 'IN_WORK' || order.status === 'AWAITING_PARTS').length
  if (overdue > 0) return <Badge tone="ATTENTION" warn>{overdue} past target</Badge>
  if (running > 0) return <Badge tone="PENDING">{running} in work</Badge>
  return <Badge tone="READY">Up to date</Badge>
}

function WorkOrderBody({ file, registration }) {
  const rows = file?.workOrders ?? []
  return (
    <>
      {rows.length === 0 ? (
        <div className="camo-doc__empty">No active work orders for {registration}.</div>
      ) : (
        <table className="camo-doc__rows">
          <thead>
            <tr><th>WO n°</th><th>Task</th><th>Facility</th><th>Opened</th><th>Target</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              <tr key={order.id}>
                <td className="camo-doc__num">{order.orderNo}</td>
                <td>
                  {order.title}
                  {order.labourHours ? (
                    <div className="camo-sub">{order.labourHours} man-hours est.</div>
                  ) : null}
                </td>
                <td>
                  {order.facility ?? EMPTY}
                  {order.facilityIcao ? <div className="camo-sub">{order.facilityIcao}</div> : null}
                </td>
                <td>{dayMonthYear(order.openedOn)}</td>
                <td>
                  {/* Une cible sans date le dit, au lieu d'en emprunter une. */}
                  {order.targetOn ? dayMonthYear(order.targetOn) : (order.targetNote ?? EMPTY)}
                  {order.targetOn && order.targetNote ? (
                    <div className="camo-sub">{order.targetNote}</div>
                  ) : null}
                </td>
                <td>
                  <Badge tone={order.overdue ? 'ATTENTION' : WO_TONE[order.status] ?? 'NEUTRAL'} warn={order.overdue}>
                    {order.overdue ? 'Past target' : order.status.replace('_', ' ')}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="camo-doc__decl">
        Work orders are coordinated with the approved maintenance organisation (Part-145 /
        Part-CAO) named above and closed only against a valid Certificate of Release to Service.
      </div>
    </>
  )
}
