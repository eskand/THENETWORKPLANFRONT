import { Check, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAcknowledgeAlert } from '../hooks/useDispatchBoard'

/**
 * Le panneau des alertes, derriere le triangle et la cloche de l'en-tete.
 *
 * Les deux boutons montraient un compte sans rien ouvrir : un chiffre qu'on
 * ne peut pas deplier ne sert a rien, il inquiete sans informer. Ils ouvrent
 * desormais la liste correspondante.
 *
 * Ce que le panneau affiche vient de GET /v1/alerts et de rien d'autre : pas
 * de regroupement invente, pas d'alerte de demonstration. Une liste vide est
 * affichee comme vide.
 *
 * « Acknowledge » est une vraie ecriture (POST /v1/alerts/{id}/acknowledge) :
 * la ligne disparait parce que `acked_at` est pose en base. Recharger la page
 * ne la fait pas revenir — c'est la difference avec un masquage cote
 * navigateur.
 */

/** Le nom de la regle, en clair. Une regle inconnue s'affiche telle quelle. */
const RULE_LABEL = {
  AIRCRAFT_AOG: 'Aircraft on ground',
  FTL_MARGIN: 'Flight time limitation',
  PERMIT_DEADLINE: 'Permit deadline',
  SLOT_ISSUED: 'Slot issued',
  CREW_UNASSIGNED: 'Crew not assigned',
  MEL_EXPIRY: 'MEL rectification due',
}

const SEVERITY_ORDER = { CRITICAL: 0, ATTENTION: 1, INFO: 2 }

/** « il y a 3 h », « il y a 12 min ». Au-dela de deux jours, la date. */
function age(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const minutes = Math.round((Date.now() - then) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h ago`
  return new Date(then).toISOString().slice(0, 10)
}

export default function NotificationsPanel({ title, alerts, loading, error, onClose }) {
  const navigate = useNavigate()
  const acknowledge = useAcknowledgeAlert()

  const rows = [...(alerts ?? [])].sort((a, b) => {
    const bySeverity =
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    if (bySeverity !== 0) return bySeverity
    return new Date(b.raisedAt).getTime() - new Date(a.raisedAt).getTime()
  })

  return (
    <div className="ntf-panel" role="dialog" aria-label={title}>
      <div className="ntf-head">
        <span>{title}</span>
        <span className="ntf-count">{loading ? '…' : `${rows.length} open`}</span>
      </div>

      <div className="ntf-list">
        {error ? (
          <div className="ntf-empty">The alert wall did not answer. Nothing is being hidden.</div>
        ) : loading ? (
          <div className="ntf-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="ntf-empty">No open alert.</div>
        ) : (
          rows.map((alert) => (
            <div key={alert.id} className={`ntf-row sev-${(alert.severity ?? '').toLowerCase()}`}>
              <span className="ntf-sev">{alert.severity}</span>
              <div className="ntf-body">
                <div className="ntf-rule">{RULE_LABEL[alert.rule] ?? alert.rule}</div>
                <div className="ntf-cause">{alert.cause}</div>
                <div className="ntf-meta">
                  <span>{age(alert.raisedAt)}</span>
                  {alert.targetRole ? <span>· {alert.targetRole.replace(/_/g, ' ').toLowerCase()}</span> : null}
                </div>
                <div className="ntf-acts">
                  {alert.legId ? (
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/dispatch?leg=${alert.legId}`)
                        onClose()
                      }}
                    >
                      Open the leg
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={acknowledge.isPending}
                    onClick={() => acknowledge.mutate(alert.id)}
                  >
                    {acknowledge.isPending && acknowledge.variables === alert.id ? (
                      <Loader2 size={11} className="ntf-spin" />
                    ) : (
                      <Check size={11} />
                    )}
                    Acknowledge
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="ntf-foot">
        From <code>GET /v1/alerts</code> · refreshed every minute
      </div>
    </div>
  )
}
