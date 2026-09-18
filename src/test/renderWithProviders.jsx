import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { VigilProvider } from '../components/vigil/VigilContext'

/**
 * Rend un composant dans les fournisseurs que l'application monte a la racine
 * (TanStack Query, routeur, contexte VIGIL), avec un client de requetes qui ne
 * reessaie jamais — un test doit echouer vite, pas attendre trois tentatives.
 */
export function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <VigilProvider>{ui}</VigilProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
