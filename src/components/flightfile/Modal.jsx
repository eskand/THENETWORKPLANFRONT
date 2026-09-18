import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * La boite de l'annexe — {@code .tnp-modal-overlay} / {@code .tnp-modal-box}
 * (prototype l. 2029), avec sa croix, son titre et sa ligne d'actions.
 *
 * <b>Elle se pose sur {@code document.body}, pas dans le panneau.</b> C'est la
 * disposition de l'annexe : {@code showTnpModal()} ecrit dans
 * {@code #tnpModalHost} (l. 16615), un hote cree a la racine du document. Le
 * detail n'est pas cosmetique — la feuille « FLIGHT LABEL · MASTER DESIGN »
 * repeint {@code .fl-master .fd-section} en banniere bleue pleine largeur, avec
 * {@code !important} (l. 75862). Une modale rendue DANS le panneau heritait de
 * cette banniere, et le titre de section « Flight Creation -> Flight Closed »
 * s'affichait en bleu plein au lieu du petit libelle gris de l'annexe. Le
 * portail remet la modale hors de portee de ces regles, exactement comme chez
 * elle.
 *
 * <p>Elle vit dans son propre fichier parce que trois modales la partagent :
 * la frise OCC, la note de vol et le refus MVT.
 */
export default function Modal({ title, subtitle, children, actions, onClose }) {
  useEffect(() => {
    function onKey(event) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="tnp-modal-overlay"
         onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="tnp-modal-box">
        <div className="tnp-modal-close" role="button" tabIndex={0} onClick={onClose}>✕</div>
        {title ? <div className="tnp-modal-title">{title}</div> : null}
        {subtitle ? <div className="tnp-modal-sub">{subtitle}</div> : null}
        {children}
        {actions ? <div className="tnp-modal-actions">{actions}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
