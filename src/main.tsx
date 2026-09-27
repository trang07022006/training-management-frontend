import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import App from './App.tsx'
import { SessionProvider } from './auth/SessionProvider'
import { SessionNotice } from './auth/SessionNotice'

const SessionDevPanel = import.meta.env.DEV
  ? lazy(() => import('./auth/SessionDevPanel'))
  : null

const apiOrigin =
  import.meta.env.VITE_API_ORIGIN || window.location.origin

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider apiOrigin={apiOrigin}>
      <SessionNotice />

      {SessionDevPanel && (
        <Suspense fallback={null}>
          <SessionDevPanel />
        </Suspense>
      )}

      <App />
    </SessionProvider>
  </StrictMode>,
)