import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * L'etat d'ouverture du panneau VIGIL, partage par toute l'application.
 *
 * <p>Chez l'annexe, {@code UI.togglePanel()} est une fonction globale que le
 * bouton de l'en-tete, le menu du dossier de vol et la bande IROPS appellent
 * indifferemment ({@code TNPVIGIL.openPanel()}, l. 99436). Ici c'est un
 * contexte : n'importe quel ecran ouvre le meme panneau, monte une seule
 * fois a la racine, sans en porter une copie.
 */
const VigilContext = createContext(null)

export function VigilProvider({ children }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [dashboardOpen, setDashboardOpen] = useState(false)

  const openPanel = useCallback(() => setPanelOpen(true), [])
  const closePanel = useCallback(() => setPanelOpen(false), [])
  const togglePanel = useCallback(() => setPanelOpen((current) => !current), [])
  const openDashboard = useCallback(() => setDashboardOpen(true), [])
  const closeDashboard = useCallback(() => setDashboardOpen(false), [])

  const value = useMemo(() => ({
    panelOpen, openPanel, closePanel, togglePanel,
    dashboardOpen, openDashboard, closeDashboard,
  }), [panelOpen, openPanel, closePanel, togglePanel, dashboardOpen, openDashboard, closeDashboard])

  return <VigilContext.Provider value={value}>{children}</VigilContext.Provider>
}

export function useVigil() {
  const context = useContext(VigilContext)
  if (!context) throw new Error('useVigil must be used inside <VigilProvider>')
  return context
}
