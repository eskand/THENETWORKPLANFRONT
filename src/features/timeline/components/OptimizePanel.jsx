import { useEffect, useMemo } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { countBySeverity, findTimelineIssues } from '../../../lib/timelineFindings'

/**
 * Le panneau « Optimize » de la Flight Timeline.
 *
 * Il tient la promesse que le prototype affichait sans la tenir : « proposals
 * only, nothing is written ». Ici c'est structurel — le panneau n'a aucune
 * mutation a sa disposition, il lit la reponse de GET /v1/timeline et la
 * commente.
 *
 * Ce qu'il ne montre pas, et pourquoi : pas de score sur 100, pas d'economies
 * en dollars, pas de « 14 inefficiencies detected · $23,400 available ». Ces
 * chiffres, dans le prototype, sortent d'un moteur declare stub dont le coeur
 * est `Math.random()`. Les afficher ici les rendrait credibles, ce qui est
 * exactement le reproche de l'audit A3 §6.2.
 */

const TONE = {
  BLOCKING: 'optfind--blocking',
  WARNING: 'optfind--warning',
  WATCH: 'optfind--watch',
}

const HEADING = {
  BLOCKING: 'Blocking — the plan cannot fly as written',
  WARNING: 'Warning — the plan flies, but something is missing',
  WATCH: 'Watch — nothing is broken, keep an eye on it',
}

export default function OptimizePanel({ data, onClose }) {
  const findings = useMemo(() => findTimelineIssues(data), [data])
  const counts = countBySeverity(findings)

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const groups = ['BLOCKING', 'WARNING', 'WATCH'].filter((severity) => counts[severity] > 0)

  return (
    <>
      <div className="rmodal__backdrop" onClick={onClose} />
      <div className="rmodal rmodal--wide" role="dialog" aria-modal="true" aria-label="Optimize the plan">
        <div className="rmodal__head">
          <div>
            <h3>Optimize — {data?.days ?? 0} day window</h3>
            <p>
              {findings.length} finding{findings.length === 1 ? '' : 's'} · read-only · nothing is
              written
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="rmodal__body">
          {findings.length === 0 ? (
            <div className="optfind optfind--none">
              <CheckCircle2 size={18} />
              <div>
                <b>Nothing to correct in this window.</b>
                <p>
                  Every leg departs where the previous one landed, no two legs overlap on a tail,
                  no grounded aircraft carries a flight, and no crew verdict is a breach.
                </p>
              </div>
            </div>
          ) : null}

          {groups.map((severity) => (
            <section key={severity}>
              <div className="optfind__heading">
                {HEADING[severity]} · {counts[severity]}
              </div>
              {findings
                .filter((finding) => finding.severity === severity)
                .map((finding) => (
                  <div className={`optfind ${TONE[severity]}`} key={finding.id}>
                    <div className="optfind__top">
                      <b>{finding.label}</b>
                      <span>
                        {finding.registration}
                        {finding.icaoType ? ` · ${finding.icaoType}` : ''}
                        {finding.when ? ` · ${finding.when}` : ''}
                      </span>
                    </div>
                    <p>{finding.detail}</p>
                    <div className="optfind__rule">{finding.rule}</div>
                  </div>
                ))}
            </section>
          ))}

          {/* Ce que cet ecran ne fait pas encore, dit ici plutot que suggere par
              un bouton qui n'agirait pas. */}
          <div className="crewbanner" style={{ margin: '16px 0 0' }}>
            <span>
              <b>This finds, it does not solve.</b> Proposing a corrected plan — re-assigning
              tails, re-timing legs, costing the alternatives — needs a real solver server-side.
              The prototype's button runs an engine its own code declares a stub
              (<code>solveRate = 0.6 + Math.random()*0.25</code>), which is why no score and no
              savings figure appear above: audit A3 §6.2 asks for that stub to be taken off
              production screens, not copied onto them.
            </span>
          </div>
        </div>

        <div className="rmodal__actions">
          <span className="optfind__sum">
            {counts.BLOCKING} blocking · {counts.WARNING} warning · {counts.WATCH} watch
          </span>
          <div className="rmodal__actions-right">
            <button type="button" className="rmodal__btn rmodal__btn--primary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
