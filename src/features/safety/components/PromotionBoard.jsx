import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Badge from '../../../components/Badge'
import { LoadingState } from '../../../components/States'
import { usePromotionBoard } from '../../../hooks/useCommercial'
import { EMPTY, dayMonthYear } from '../../../lib/format'

/**
 * Promotion, from the Safety Manager's side.
 *
 * <b>The number that matters is reach, not publication.</b> A safety alert that
 * nobody acknowledged has not been communicated, whatever the publication date
 * says — so every bar here is acknowledgements over audience, and the alert
 * with the worst reach is the one the Safety Review Board has to explain.
 *
 * The crew's own bulletin board is the Safety Promotion module in the sidebar.
 * Same records, the other audience.
 */

const KIND_TONE = {
  ALERT: 'ATTENTION', BULLETIN: 'INFO', LESSON: 'PENDING', POLICY: 'READY',
}

export default function PromotionBoard() {
  const navigate = useNavigate()
  const board = usePromotionBoard()

  if (board.isError) {
    return <div className="sms-empty">{board.error?.message}</div>
  }
  if (!board.data) {
    return <LoadingState label="Reading the promotion record…" />
  }

  const items = board.data.campaigns ?? []
  const needingAck = items.filter((item) => item.acknowledgementRequired)
  const worst = needingAck.length
    ? Math.min(...needingAck.map((item) => item.reachPercent ?? 0))
    : null

  const objectives = board.data.objectives ?? []
  /* La portee globale est le rapport des accuses sur les audiences, pas la
     moyenne des pourcentages : une alerte lue par 2 personnes sur 2 ne vaut
     pas une alerte lue par 2 sur 200. */
  const audienceTotal = needingAck.reduce((sum, item) => sum + (item.audienceSize ?? 0), 0)
  const ackTotal = needingAck.reduce((sum, item) => sum + (item.acknowledgements ?? 0), 0)
  const overallReach = audienceTotal === 0 ? null : Math.round((ackTotal / audienceTotal) * 100)

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Safety Promotion</div>
          <div className="page-sub">Safety communication, alerts, lessons learned and the Just Culture policy</div>
        </div>
        <div className="btn-row">
          <button type="button" className="btn-p"
                  onClick={() => navigate('/safety-promotion')}>
            <Plus size={13} /> Publish communication
          </button>
        </div>
      </div>

      <div className="kpi-row">
        <Kpi label="Published" value={items.length} hint="alerts, bulletins and lessons" />
        <Kpi label="Requiring acknowledgement" value={needingAck.length}
             hint="tracked to the individual" accent="var(--pending-fg)" />
        <Kpi
          label="Lowest reach"
          value={worst === null ? EMPTY : `${worst}%`}
          hint={worst === null ? 'nothing to acknowledge' : 'the one to explain'}
          accent="var(--attention-fg)"
          alarm={worst !== null && worst < 90}
        />
      </div>

      <div className="sms-row sms-row--promo">
      <section className="card">
        <header className="card-hdr">
          <h2>Published communications</h2>
          <span className="mtx-note">{items.length}</span>
        </header>

        {items.length ? (
          items.map((item) => {
            const reach = item.reachPercent ?? 0
            const colour = reach >= 90 ? 'var(--ready-fg)'
              : reach >= 50 ? 'var(--accent-orange)' : 'var(--attention-fg)'
            return (
              <article className="promo-row" key={item.id}>
                <header>
                  <div>
                    <b>{item.title}</b>
                    <span>
                      {item.reference} · {dayMonthYear(item.publishedOn)}
                      {item.authorName ? ` · ${item.authorName}` : ''}
                    </span>
                  </div>
                  <Badge tone={KIND_TONE[item.kind] ?? 'NEUTRAL'}>{item.kind}</Badge>
                </header>

                {item.body ? <p>{item.body}</p> : null}

                <footer>
                  <span className="promo-row__aud">
                    Audience: <b>{item.audience ?? 'All personnel'}</b>
                  </span>
                  {item.acknowledgementRequired ? (
                    <>
                      <span className="promo-bar">
                        <i style={{ width: `${reach}%`, background: colour }} />
                      </span>
                      <span className="promo-row__ack">
                        {item.acknowledgements} / {item.audienceSize} acknowledged
                      </span>
                    </>
                  ) : (
                    <span className="promo-row__ack">No acknowledgement required</span>
                  )}
                </footer>
              </article>
            )
          })
        ) : (
          <div className="sms-empty">Nothing has been published.</div>
        )}
      </section>

      <div className="promo-side">
        <section className="card">
          <div className="card-hdr">
            <h3 className="card-title">Reach and acknowledgement</h3>
          </div>
          <div className="promo-reach">
            <div className="promo-reach__pct">
              {overallReach == null ? '—' : `${overallReach}%`}
            </div>
            <div className="promo-reach__hint">overall acknowledgement</div>
          </div>
          {needingAck.map((item) => {
            const reach = item.reachPercent ?? 0
            const colour = reach >= 90 ? 'var(--ready-fg)'
              : reach >= 50 ? 'var(--accent-orange)' : 'var(--attention-fg)'
            return (
              <div className="promo-mini" key={item.id}>
                <div className="promo-mini__head">
                  <span>{item.reference}</span>
                  <b style={{ color: colour }}>{reach}%</b>
                </div>
                <span className="promo-bar">
                  <i style={{ width: `${reach}%`, background: colour }} />
                </span>
              </div>
            )
          })}
          {needingAck.length === 0 ? (
            <p className="mtx-note">Nothing published requires an acknowledgement.</p>
          ) : null}
        </section>

        <section className="card">
          <div className="card-hdr">
            <h3 className="card-title">Safety objectives</h3>
          </div>
          {objectives.map((objective) => (
            <div className="promo-obj" key={objective.code}>
              <span className="promo-obj__name">{objective.name}</span>
              {/* La cible se lit a cote de la valeur : « 5 » ne dit rien sans
                  « sur un objectif de 0 ». */}
              <span className={`promo-obj__val${objective.breachesAlert ? ' is-bad'
                : objective.meetsTarget ? ' is-good' : ''}`}>
                {objective.value == null ? 'not measured' : Number(objective.value)}
                <i>/ {Number(objective.target)}</i>
              </span>
            </div>
          ))}
          {objectives.length === 0 ? (
            <p className="mtx-note">No safety objective is declared for this year.</p>
          ) : null}
        </section>
      </div>
      </div>
    </>
  )
}

/**
 * Une tuile de l'annexe.
 *
 * <p>Les pages appellent encore ce helper avec leurs propres arguments ; il
 * rend maintenant la carte du prototype. La couleur vient de l'etat — un
 * chiffre en alerte prend le rouge de l'annexe — et l'icone reste neutre :
 * ces trois pages n'en declarent pas, et en inventer une par tuile aurait
 * ajoute un symbole que l'annexe ne porte pas.
 */
function Kpi({ label, value, hint, accent, alarm }) {
  const tone = alarm ? 'c2' : accent === 'var(--pending-fg)' ? 'c5'
    : accent === 'var(--ready-fg)' ? 'c4' : 'c1'
  return (
    <div className={`kc ${tone}`}>
      <div className="kc-lbl">{label}</div>
      <div className="kc-val">{value}</div>
      <div className="kc-sub">{hint}</div>
    </div>
  )
}
