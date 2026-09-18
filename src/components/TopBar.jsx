import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronLeft, TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useOpenAlerts } from '../hooks/useDispatchBoard'
import { useVigilPanel } from '../hooks/useVigil'
import NotificationsPanel from './NotificationsPanel'
import VigilMark from './VigilMark'
import { useVigil } from './vigil/VigilContext'

/**
 * En-tete operationnel : degrade navy souligne d'un filet or, comme sur le
 * prototype approuve.
 *
 * L'ordre des controles est celui du prototype une fois la page rendue —
 * VIGIL, alertes de risque, notifications, boite OCC, avatar. Dans le
 * fichier d'origine seuls la cloche et la boite sont dans le HTML ; VIGIL et
 * le triangle sont injectes par leurs modules devant la cloche
 * (`bell.parentNode.insertBefore`). Ici les cinq sont ecrits a leur place.
 *
 * Les deux compteurs viennent de GET /v1/alerts, lu ici et non passe par les
 * ecrans : la requete porte la meme cle TanStack Query que celle des pages,
 * donc une seule requete part, et l'en-tete dit la meme chose partout. Le
 * triangle ne montre que les alertes critiques, la cloche toutes les alertes
 * ouvertes.
 *
 * @param inbox  etapes en attente d'une decision OCC, depuis le KPI
 *               `needsAction` du tableau de dispatch. Non fourni par les
 *               ecrans qui ne lisent pas ce tableau : la pastille disparait
 *               alors, plutot que d'afficher un zero qui se lirait comme
 *               « rien en attente »
 */
export default function TopBar({ title, subtitle, inbox = null, initials = 'AD', controls = null }) {
  const navigate = useNavigate()
  const alerts = useOpenAlerts()
  const [open, setOpen] = useState(null) // 'critical' | 'all' | null
  const rightRef = useRef(null)

  const all = alerts.data ?? []
  const critical = all.filter((alert) => alert.severity === 'CRITICAL')

  // Un clic en dehors ou Echap ferme le panneau : sans cela il reste ouvert
  // par-dessus l'ecran qu'on voulait consulter.
  useEffect(() => {
    if (open === null) return undefined
    function onPointerDown(event) {
      if (rightRef.current && !rightRef.current.contains(event.target)) setOpen(null)
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // La pastille de VIGIL dit l'etat du balayage VIGIL — UI.refresh() de
  // l'annexe (l. 99290) : rouge des qu'une alerte critique est active, ambre
  // s'il reste du « high », verte sinon. Les trois couleurs sont celles du
  // prototype (#f85149 / #F0A500 / #22c88a). Tant que le premier balayage
  // n'a pas repondu, la pastille lit le mur d'alertes, pour ne pas etre
  // verte par defaut.
  const { togglePanel } = useVigil()
  const vigilPanel = useVigilPanel()
  const vigilState = vigilPanel.data?.state
  const vigilTone = vigilState
    ? (vigilState === 'CRITICAL' ? 'crit' : vigilState === 'WARNING' ? 'warn' : 'ok')
    : critical.length > 0 ? 'crit' : all.length > 0 ? 'warn' : 'ok'

  const toggle = (which) => setOpen((current) => (current === which ? null : which))

  return (
    <header className="topbar">
      <button type="button" className="topbar__back" aria-label="Back">
        <ChevronLeft size={16} />
      </button>

      <div className="topbar-left">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="topbar-right" ref={rightRef}>
        {/* L'ancre des commandes de Flight Following (référence
            NETPLUS_FLIGHT_FOLLOWING index.html l. 30-39) : le module y pose
            LIVE, FLIGHT LIST et l'horloge tant que la vue est affichee
            (body.fw-topbar). Absente sur les autres ecrans. */}
        {controls ? (
          <div id="fwTopHost" aria-label="Flight Watch controls">
            {controls}
          </div>
        ) : null}
        <div
          className="vigil-btn"
          role="button"
          tabIndex={0}
          title="VIGIL — Continuous Operational Intelligence. Always watching. Always ahead."
          onClick={() => { setOpen(null); togglePanel() }}
          onKeyDown={(event) => { if (event.key === 'Enter') togglePanel() }}
        >
          <VigilMark size={26} />
          <span className="vgl-word">
            <b>V</b>IGIL
          </span>
          <span className={`vgl-dot ${vigilTone}`} />
        </div>

        <button
          type="button"
          className={`icon-btn${open === 'critical' ? ' on' : ''}`}
          aria-label="Critical alerts"
          aria-expanded={open === 'critical'}
          title="Critical alerts"
          onClick={() => toggle('critical')}
        >
          <TriangleAlert size={17} />
          {critical.length > 0 ? <span className="badge-pip">{critical.length}</span> : null}
        </button>

        <button
          type="button"
          className={`icon-btn${open === 'all' ? ' on' : ''}`}
          aria-label="Notifications"
          aria-expanded={open === 'all'}
          title="Notifications"
          onClick={() => toggle('all')}
        >
          <Bell size={17} />
          {all.length > 0 ? (
            <span className="badge-pip badge-pip--amber">{all.length}</span>
          ) : null}
        </button>

        <button
          type="button"
          className="icon-btn"
          aria-label="OCC inbox"
          title="OCC inbox — legs awaiting an OCC decision"
          onClick={() => {
            setOpen(null)
            navigate('/dispatch?tab=NEEDS_ACTION')
          }}
        >
          {/* L'avion cercle du prototype (#ibBtn) : cercle de 9.2 et le meme
              fuselage que la tuile « Active flights », reduit au centre. */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="17" height="17">
            <circle cx="12" cy="12" r="9.2" />
            <g transform="translate(12 12) scale(0.56) translate(-12 -12)">
              <path
                d="M12 3.2c.7 0 1.2.6 1.2 1.3v4.6l7.3 4.3v1.9l-7.3-2.3v4.2l2.5 1.8v1.6L12 19.4l-3.7 1.2v-1.6l2.5-1.8v-4.2L3.5 15.3v-1.9l7.3-4.3V4.5c0-.7.5-1.3 1.2-1.3z"
                fill="currentColor"
                stroke="none"
              />
            </g>
          </svg>
          {inbox ? <span className="badge-pip badge-pip--amber">{inbox}</span> : null}
        </button>

        <span className="avatar">{initials}</span>

        {open === null ? null : (
          <NotificationsPanel
            title={open === 'critical' ? 'Critical alerts' : 'Notifications'}
            alerts={open === 'critical' ? critical : all}
            loading={alerts.isLoading}
            error={alerts.isError}
            onClose={() => setOpen(null)}
          />
        )}
      </div>
    </header>
  )
}
