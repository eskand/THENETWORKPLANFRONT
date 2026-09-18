import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/theme.css'
import './styles/shell.css'
import './styles/occ.css'
import './styles/dispatch.css'
import './styles/crew.css'
import './styles/operations.css'
import './styles/timeline.css'
import './styles/flightwatch.css'
import './styles/commercial.css'
import './styles/vigil.css'
import './styles/optimizer.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // An OCC screen should not hammer the API on every mount, and a failed
      // read should surface rather than retry silently three times.
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 15_000,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
