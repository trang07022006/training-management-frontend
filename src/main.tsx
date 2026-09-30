import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { SessionRedirect } from './auth/SessionRedirect'
import './index.css'
import App from './App.tsx'
import { SessionProvider } from './auth/SessionProvider.tsx'
import { SessionNotice } from './auth/SessionNotice.tsx'
import { LoginPage } from './pages/LoginPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { RequireSession } from './auth/RequireSession'

const SessionDevPanel = import.meta.env.DEV
  ? lazy(() => import('./auth/SessionDevPanel.tsx'))
  : null
const DraftDevPanel = import.meta.env.DEV
  ? lazy(() => import('./drafts/DraftDevPanel'))
  : null
const apiOrigin =
  import.meta.env.VITE_API_ORIGIN || window.location.origin

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider apiOrigin={apiOrigin}>
        <SessionRedirect />
        <SessionNotice />

        {SessionDevPanel && (
          <Suspense fallback={null}>
            <SessionDevPanel />
          </Suspense>
        )}

        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireSession />}>
            <Route
              path="/"
              element={
                <>
                  {DraftDevPanel && (
                    <Suspense fallback={null}>
                      <DraftDevPanel />
                    </Suspense>
                  )}

                  <App />
                </>
              }
            />
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
)