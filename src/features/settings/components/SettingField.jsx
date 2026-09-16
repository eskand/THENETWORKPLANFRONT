import { useEffect, useState } from 'react'

/**
 * Une ligne de réglage : libellé, explication, contrôle à droite.
 *
 * <b>Le contrôle vient du serveur.</b> La colonne {@code control} dit quoi
 * dessiner — interrupteur, segment, sélecteur, nuancier, étiquettes. Le
 * prototype décide la même chose, mais dans son propre code source
 * (fieldCtrl, annexe A4 l. 66443-66486) ; ici deux exploitants peuvent offrir
 * des fuseaux ou des services différents sans qu'on recompile.
 *
 * <b>Quand la valeur part.</b> Un interrupteur, un segment, un sélecteur et un
 * nuancier écrivent au clic : le geste est la décision. Un texte et un nombre
 * écrivent à la sortie du champ, pas à chaque frappe — sinon taper « 120 »
 * enverrait 1, puis 12, puis 120, et le 1 franchirait la borne basse.
 */
export default function SettingField({ setting, onChange, saving }) {
  const readOnly = !setting.editable || saving

  return (
    <div className="set-row">
      {/* La clé est en infobulle et non en clair : c'est elle qu'un manuel
          d'exploitation cite, mais l'imprimer sous chaque ligne doublerait la
          hauteur de la rubrique pour une information qu'on cherche rarement. */}
      <div className="set-row__label" title={setting.settingKey}>
        <div className="lbl">{setting.label}</div>
        {setting.description ? <div className="desc">{setting.description}</div> : null}
        <div className={setting.readBy ? 'set-row__reader' : 'set-row__reader set-row__reader--none'}>
          {setting.readBy ? `read by ${setting.readBy}` : 'not read by any service yet'}
        </div>
      </div>
      <div className="set-row__ctrl">
        <Control setting={setting} onChange={onChange} readOnly={readOnly} />
      </div>
    </div>
  )
}

function Control({ setting, onChange, readOnly }) {
  switch (setting.control) {
    case 'TOGGLE': return <Toggle setting={setting} onChange={onChange} readOnly={readOnly} />
    case 'SEGMENT': return <Segment setting={setting} onChange={onChange} readOnly={readOnly} />
    case 'SELECT': return <Select setting={setting} onChange={onChange} readOnly={readOnly} />
    case 'NUMBER': return <NumberField setting={setting} onChange={onChange} readOnly={readOnly} />
    case 'COLOR': return <ColorField setting={setting} onChange={onChange} readOnly={readOnly} />
    case 'TAGS': return <Tags setting={setting} onChange={onChange} readOnly={readOnly} />
    case 'TIME': return <TextField setting={setting} onChange={onChange} readOnly={readOnly} type="time" />
    default: return <TextField setting={setting} onChange={onChange} readOnly={readOnly} type="text" />
  }
}

function Toggle({ setting, onChange, readOnly }) {
  const checked = setting.settingValue === 'true'
  return (
    <label className="set-toggle">
      <input type="checkbox" checked={checked} disabled={readOnly}
             aria-label={setting.label}
             onChange={(event) => onChange(String(event.target.checked))} />
      <span className="track" />
      <span className="thumb" />
    </label>
  )
}

function Segment({ setting, onChange, readOnly }) {
  return (
    <div className="set-seg" role="group" aria-label={setting.label}>
      {(setting.options ?? []).map((option) => (
        <button key={option.value} type="button" disabled={readOnly}
                className={option.value === setting.settingValue ? 'active' : undefined}
                onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Select({ setting, onChange, readOnly }) {
  return (
    <select className="set-select" value={setting.settingValue} disabled={readOnly}
            aria-label={setting.label}
            onChange={(event) => onChange(event.target.value)}>
      {(setting.options ?? []).map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  )
}

/**
 * Un nombre, borné.
 *
 * Les bornes sont posées sur le champ ET vérifiées par le serveur. Celles du
 * navigateur évitent la faute de frappe ; celles du serveur évitent qu'un
 * appel direct pose un intervalle de rafraîchissement négatif.
 */
function NumberField({ setting, onChange, readOnly }) {
  const [draft, setDraft] = useState(setting.settingValue)
  useEffect(() => { setDraft(setting.settingValue) }, [setting.settingValue])

  const commit = () => {
    if (draft !== setting.settingValue && draft !== '') onChange(draft)
    else setDraft(setting.settingValue)
  }

  return (
    <>
      <input className="set-input set-input--num" type="number" value={draft} disabled={readOnly}
             aria-label={setting.label}
             min={setting.minValue ?? undefined}
             max={setting.maxValue ?? undefined}
             step={setting.stepValue ?? undefined}
             onChange={(event) => setDraft(event.target.value)}
             onBlur={commit}
             onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} />
      {setting.unit ? <span className="set-unit">{setting.unit}</span> : null}
    </>
  )
}

function TextField({ setting, onChange, readOnly, type }) {
  const [draft, setDraft] = useState(setting.settingValue)
  useEffect(() => { setDraft(setting.settingValue) }, [setting.settingValue])

  return (
    <input className="set-input" type={type} value={draft} disabled={readOnly}
           aria-label={setting.label}
           placeholder={setting.placeholder ?? ''}
           onChange={(event) => setDraft(event.target.value)}
           onBlur={() => { if (draft !== setting.settingValue) onChange(draft) }}
           onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} />
  )
}

function ColorField({ setting, onChange, readOnly }) {
  return (
    <input className="set-input set-input--color" type="color" value={setting.settingValue}
           disabled={readOnly} aria-label={setting.label}
           /* onBlur et non onChange : un nuancier émet à chaque mouvement de
              la souris, ce qui ferait une écriture par pixel parcouru. */
           onBlur={(event) => {
             if (event.target.value !== setting.settingValue) onChange(event.target.value)
           }} />
  )
}

/** Une liste, stockée en CSV comme la clé qu'elle remplace l'était déjà. */
function Tags({ setting, onChange, readOnly }) {
  const [draft, setDraft] = useState('')
  const tags = setting.settingValue ? setting.settingValue.split(',').filter(Boolean) : []

  const add = () => {
    const value = draft.trim()
    if (!value || tags.includes(value)) { setDraft(''); return }
    onChange([...tags, value].join(','))
    setDraft('')
  }

  return (
    <div className="set-tags">
      <div className="set-tags__list">
        {tags.map((tag, index) => (
          <span className="set-tag" key={tag}>
            {tag}
            <button type="button" disabled={readOnly} aria-label={`Remove ${tag}`}
                    onClick={() => onChange(tags.filter((_, i) => i !== index).join(','))}>×</button>
          </span>
        ))}
      </div>
      <input className="set-input" type="text" value={draft} disabled={readOnly}
             aria-label={`Add to ${setting.label}`}
             placeholder={setting.placeholder ?? 'Add…'}
             onChange={(event) => setDraft(event.target.value)}
             onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add() } }}
             onBlur={add} />
    </div>
  )
}
