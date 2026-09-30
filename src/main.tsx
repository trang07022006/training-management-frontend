import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { SessionRedirect } from './auth/SessionRedirect'
import './index.css'
import App from './App.tsx'
import { SessionProvider } from './auth/SessionProvider.tsx'
import { SessionNotice } from './auth/SessionNotice.tsx'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { RequireSession } from './auth/RequireSession'
import { RequirePermission } from './auth/RequirePermission'
import { AppLayout } from './navigation/AppLayout'
import { SYSTEM_PERMISSIONS } from './navigation/menuConfig'
import { RoleDashboard } from './pages/RoleDashboard'

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
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/401" element={<UnauthorizedPage />} />

          <Route element={<RequireSession />}>
            <Route element={<AppLayout />}>
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
              <Route
                element={
                  <RequirePermission
                    requiredRole="admin"
                    requiredPermission={SYSTEM_PERMISSIONS.USER_MANAGE}
                  />
                }
              >
                <Route path="/admin" element={<RoleDashboard role="admin" />} />
              </Route>
              <Route
                element={
                  <RequirePermission
                    requiredRole="trainer"
                    requiredPermission={SYSTEM_PERMISSIONS.COURSE_MANAGE}
                  />
                }
              >
                <Route path="/trainer" element={<RoleDashboard role="trainer" />} />
              </Route>
              <Route
                element={
                  <RequirePermission
                    requiredRole="trainee"
                    requiredPermission={SYSTEM_PERMISSIONS.COURSE_VIEW}
                  />
                }
              >
                <Route path="/trainee" element={<RoleDashboard role="trainee" />} />
              </Route>
              <Route path="/change-password" element={<ChangePasswordPage />} />
            </Route>
          </Route>
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
)