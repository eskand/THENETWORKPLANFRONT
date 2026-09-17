/**
 * One headline figure of the Safety Management System.
 *
 * <b>The prototype's card, to the pixel.</b> A three-pixel coloured bar along
 * the bottom, a twenty-eight-pixel tinted icon chip in the top-right corner,
 * and nothing else — no corner marks. The colour is the family the figure
 * belongs to, not its state: « risks above tolerance » is red whether it reads
 * nought or nine, because red here means <em>risk</em>, and a bar that changed
 * colour with the number would make a good month look like a different screen.
 *
 * <b>It is scoped to this module on purpose.</b> The rest of the product uses
 * the platform's own {@code .kpi}; the Safety Manager reproduces the approved
 * annexe, and giving the two one class would drag every other screen along the
 * next time the annexe moved.
 *
 * @param tone  cyan · red · orange · slate · green — the annexe's five families
 * @param onOpen where the figure is explained, when clicking it leads somewhere
 */
export default function SmsKpi({ tone, label, value, sub, icon: Icon, onOpen }) {
  const content = (
    <>
      <span className={`sms-kc__ico sms-kc__ico--${tone}`} aria-hidden="true">
        <Icon size={14} strokeWidth={1.8} />
      </span>
      <span className="sms-kc__lbl">{label}</span>
      <span className="sms-kc__val">{value}</span>
      <span className="sms-kc__sub">{sub}</span>
    </>
  )

  if (!onOpen) {
    return <div className={`sms-kc sms-kc--${tone}`}>{content}</div>
  }
  return (
    <button type="button" className={`sms-kc sms-kc--${tone} is-clickable`} onClick={onOpen}>
      {content}
    </button>
  )
}
