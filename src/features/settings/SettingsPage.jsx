import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  BarChart3,
  CalendarRange,
  Database,
  Clock,
  MapPin,
  Send,
  Settings as Gear,
  Shield,
  User,
  Wrench,
} from 'lucide-react'
import TopBar from '../../components/TopBar'
import { ErrorState, LoadingState } from '../../components/States'
import {
  useImportSettings,
  useResetSettings,
  useSettingsForm,
  useUpdateSetting,
} from '../../hooks/usePlatform'
import SettingField from './components/SettingField'
import OpsQualificationsSection from './components/OpsQualificationsSection'
import '../../styles/settings.css'

/** Une icône par rubrique, dans l'esprit des SVG inline du prototype (l. 66157-66166). */
const SECTION_ICON = {
  general: Gear,
  alerts: Bell,
  timeline: CalendarRange,
  dispatch: Send,
  following: Clock,
  crew: User,
  safety: Shield,
  airports: MapPin,
  data: Database,
  opsqual: User,
  administration: User,
  maintenance: Wrench,
  sales: BarChart3,
}

/**
 * Settings — configuration de la plateforme.
 *
 * <b>La forme vient de l'annexe A4</b> (SETTINGS_SCHEMA l. 66172-66338,
 * renderNav/renderBody l. 66405-66502) : une colonne de rubriques à gauche, le
 * corps à droite avec son titre, son chapeau, ses cartes à titre de groupe, et
 * ses lignes « libellé + explication à gauche, contrôle à droite ». Le pied de
 * page porte les trois mêmes boutons, dans le même ordre.
 *
 * <b>Trois différences assumées.</b>
 *
 * 1. Le schéma vient du serveur, pas du code. Le prototype n'a pas de serveur :
 *    il range sa configuration dans le localStorage du navigateur, donc chaque
 *    poste a la sienne et personne ne voit celle du voisin.
 *
 * 2. Chaque ligne dit quel service lit la clé, ou qu'aucun ne la lit encore.
 *    Sur les cinquante-quatre champs du prototype, six agissent ; les autres
 *    sont des boutons qui ne commandent rien — c'est le reproche que l'audit
 *    lui fait, et le taire en le recopiant aurait été le reprendre à notre
 *    compte.
 *
 * 3. Deux rubriques de plus, Maintenance (CAMO) et Sales & CRM, parce que deux
 *    réglages déjà lus par un service n'entraient dans aucune des siennes.
 */
export default function SettingsPage() {
  const form = useSettingsForm()
  const update = useUpdateSetting()
  const reset = useResetSettings()
  const importAll = useImportSettings()

  const [activeId, setActiveId] = useState('general')
  const [toast, setToast] = useState(null)
  const fileInput = useRef(null)

  const sections = form.data?.sections ?? []
  const active = useMemo(
    () => sections.find((section) => section.id === activeId) ?? sections[0],
    [sections, activeId],
  )

  /* Une valeur par clé, pour les conditions d'affichage : une ligne masquée
     tant qu'une autre est éteinte a besoin de lire cette autre, qui peut être
     dans un autre groupe. */
  const valueByKey = useMemo(() => {
    const map = {}
    sections.forEach((section) => section.groups.forEach((group) => group.fields.forEach((field) => {
      map[field.settingKey] = field.settingValue
    })))
    return map
  }, [sections])

  const autosave = valueByKey['data.autosave'] !== 'false'

  /* Les effets que le prototype applique vraiment (applyLiveEffects,
     l. 66381-66401) : la densité et les quatre couleurs de statut. Ils
     agissent ici pour de bon — une couleur choisie repeint la timeline. */
  useEffect(() => {
    if (!Object.keys(valueByKey).length) return
    const root = document.documentElement
    const colours = {
      'timeline.colScheduled': '--status-scheduled',
      'timeline.colEnroute': '--status-enroute',
      'timeline.colDelayed': '--status-delayed',
      'timeline.colAog': '--status-aog',
    }
    Object.entries(colours).forEach(([key, property]) => {
      if (valueByKey[key]) root.style.setProperty(property, valueByKey[key])
    })
    if (valueByKey['general.density']) {
      document.body.setAttribute('data-density', valueByKey['general.density'])
    }
  }, [valueByKey])

  const flash = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 1600)
  }

  const save = (setting, value) => {
    update.mutate({ settingId: setting.id, settingValue: value }, {
      onSuccess: () => flash('Saved'),
      onError: (error) => flash(error?.response?.data?.message ?? 'Not saved'),
    })
  }

  const exportConfig = () => {
    const values = {}
    sections.forEach((section) => section.groups.forEach((group) => group.fields.forEach((field) => {
      values[field.settingKey] = field.settingValue
    })))
    const blob = new Blob([JSON.stringify(values, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `netplus-settings-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.setTimeout(() => URL.revokeObjectURL(url), 500)
    flash('Configuration exported')
  }

  const readFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      let parsed
      try {
        parsed = JSON.parse(reader.result)
      } catch {
        flash('Not a valid configuration file')
        return
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        flash('Not a valid configuration file')
        return
      }
      importAll.mutate(parsed, {
        onSuccess: (result) => flash(`${result.changed} setting${result.changed === 1 ? '' : 's'} restored`),
        onError: (error) => flash(error?.response?.data?.message ?? 'Import refused'),
      })
    }
    reader.readAsText(file)
  }

  return (
    <>
      <TopBar title="Settings" subtitle="Platform configuration · settings by module" />

      {form.isError ? (
        <div className="shell__scroll"><main className="page">
          <ErrorState error={form.error} onRetry={() => form.refetch()} />
        </main></div>
      ) : !form.data ? (
        <div className="shell__scroll"><main className="page">
          <LoadingState label="Reading the configuration…" />
        </main></div>
      ) : (
        <div className="set-wrap">
          <nav className="set-nav">
            <div className="set-nav__title">Configuration</div>
            {sections.map((section) => {
              const Icon = SECTION_ICON[section.id] ?? Gear
              return (
                <button key={section.id} type="button"
                        className={section.id === active?.id ? 'set-nav__item set-nav__item--active' : 'set-nav__item'}
                        onClick={() => setActiveId(section.id)}>
                  <Icon size={15} strokeWidth={1.7} />
                  <span>{section.title}</span>
                  {section.unreadCount > 0 ? (
                    <span className="set-nav__unread"
                          title={`${section.unreadCount} setting${section.unreadCount === 1 ? '' : 's'} no service reads yet`}>
                      {section.unreadCount}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </nav>

          <div className="set-body">
            {active ? (
              <>
                <div className="set-head">
                  <h2>{active.title}</h2>
                  <p>{active.blurb}</p>
                </div>

                {active.custom === 'OPS_QUALIFICATIONS' ? (
                  <OpsQualificationsSection onFlash={flash} />
                ) : active.custom === 'ADMINISTRATION' ? (
                  <AdministrationPlaceholder />
                ) : (
                  <>
                    {active.groups.map((group) => {
                      const rows = group.fields.filter((field) => !field.showIfKey
                        || valueByKey[field.showIfKey] === field.showIfValue)
                      if (rows.length === 0) return null
                      return (
                        <div className="set-card" key={group.title}>
                          <div className="set-card__title">{group.title}</div>
                          {rows.map((field) => (
                            <SettingField key={field.id} setting={field}
                                          saving={update.isPending}
                                          onChange={(value) => save(field, value)} />
                          ))}
                        </div>
                      )
                    })}

                    {active.actions ? (
                      <div className="set-card">
                        <div className="set-card__title">Configuration backup</div>
                        <div className="set-row">
                          <div className="set-row__label">
                            <div className="lbl">Export the configuration</div>
                            <div className="desc">Downloads a JSON file holding every setting.</div>
                          </div>
                          <div className="set-row__ctrl">
                            <button type="button" className="set-btn" onClick={exportConfig}>Export</button>
                          </div>
                        </div>
                        <div className="set-row">
                          <div className="set-row__label">
                            <div className="lbl">Import a configuration</div>
                            <div className="desc">
                              Restores the settings from a JSON file. Unknown keys are ignored, never
                              created, and one rejected value cancels the whole import.
                            </div>
                          </div>
                          <div className="set-row__ctrl">
                            <button type="button" className="set-btn" disabled={importAll.isPending}
                                    onClick={() => fileInput.current?.click()}>Import</button>
                            <input ref={fileInput} type="file" accept="application/json,.json"
                                   style={{ display: 'none' }}
                                   onChange={(event) => {
                                     readFile(event.target.files?.[0])
                                     event.target.value = ''
                                   }} />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="set-footer">
                      <div className="set-footer__note">
                        {autosave
                          ? 'Autosave on · every change is written straight away.'
                          : 'Autosave off · changes are still written on the server as you make them.'}
                        {active.unreadCount > 0
                          ? ` ${active.unreadCount} of ${active.fieldCount} settings in this section are stored but not read by any service yet.`
                          : ''}
                      </div>
                      <div className="set-footer__btns">
                        <button type="button" className="set-btn set-btn--danger" disabled={reset.isPending}
                                onClick={() => {
                                  if (!window.confirm(`Reset every setting in “${active.title}” to its default values?`)) return
                                  reset.mutate(active.name, {
                                    onSuccess: (result) => flash(`${result.reset} setting${result.reset === 1 ? '' : 's'} reset`),
                                  })
                                }}>
                          Reset this section
                        </button>
                        <button type="button" className="set-btn set-btn--danger" disabled={reset.isPending}
                                onClick={() => {
                                  if (!window.confirm('Reset the ENTIRE platform configuration? This cannot be undone.')) return
                                  reset.mutate(undefined, {
                                    onSuccess: (result) => flash(`${result.reset} setting${result.reset === 1 ? '' : 's'} reset`),
                                  })
                                }}>
                          Reset everything
                        </button>
                        {/* Le prototype a un bouton « Save » parce que sa sauvegarde
                            automatique est optionnelle. Ici chaque champ écrit sur le
                            serveur à la saisie : le bouton relit, ce qui est la seule
                            chose honnête qu'il puisse encore faire. */}
                        <button type="button" className="set-btn set-btn--primary"
                                onClick={() => { form.refetch(); flash('Reloaded from the server') }}>
                          Reload
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      <div className={toast ? 'set-toast set-toast--show' : 'set-toast'} role="status">{toast}</div>
    </>
  )
}

/**
 * Administration.
 *
 * <p>Huit onglets dans le prototype — utilisateurs, organisation, organigramme,
 * rôles, matrice des permissions, groupes, journal d'activité, authentification
 * (l. 88241-88923). C'est un module, pas une rubrique de formulaire, et il
 * n'est pas encore écrit. Dire ce qu'il contiendra vaut mieux qu'une page vide,
 * et bien mieux qu'un écran d'apparence qui ne ferait rien.
 */
function AdministrationPlaceholder() {
  const tabs = [
    ['Users', 'Accounts, their department, their status and who they report to'],
    ['Organisation', 'The company structure the accounts hang from'],
    ['Org chart', 'The same structure, drawn'],
    ['Roles', 'What a role is allowed to do, module by module'],
    ['Permissions', 'The matrix: ten actions across every module, per role'],
    ['Groups', 'Distribution and duty groups an account belongs to'],
    ['Activity log', 'Who changed what, and when'],
    ['Authentication', 'Password policy, session length, second factor'],
  ]
  return (
    <div className="set-card">
      <div className="set-card__title">Not built yet</div>
      {tabs.map(([name, what]) => (
        <div className="set-row" key={name}>
          <div className="set-row__label">
            <div className="lbl">{name}</div>
            <div className="desc">{what}</div>
          </div>
          <div className="set-row__ctrl">
            <span className="set-unit">pending</span>
          </div>
        </div>
      ))}
    </div>
  )
}
