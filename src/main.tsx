import { StrictMode } from 'react'
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
import { ForbiddenPage } from './pages/ForbiddenPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RequireSession } from './auth/RequireSession'
import { RequirePermission } from './auth/RequirePermission'
import { AppLayout } from './navigation/AppLayout'
import { SYSTEM_PERMISSIONS } from './navigation/menuConfig'
import { RoleDashboard } from './pages/RoleDashboard'
import { UserManagementPage } from './pages/UserManagementPage'
import { CourseManagementPage } from './pages/CourseManagementPage'
import { TrainingProgramsPage } from './pages/TrainingProgramsPage'
import { SubjectsPage } from './pages/SubjectsPage'
import { UserProfilePage } from './pages/UserProfilePage'
import { ProgramStructurePage } from './pages/ProgramStructurePage'
import { PublicConsultationPage } from './pages/PublicConsultationPage'

const apiOrigin =
  import.meta.env.VITE_API_ORIGIN ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? `http://${window.location.hostname}:5000`
    : window.location.origin)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider apiOrigin={apiOrigin}>
        <SessionRedirect />
        <SessionNotice />

        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/consultation" element={<PublicConsultationPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/401" element={<UnauthorizedPage />} />

          <Route element={<RequireSession />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<App />} />
              <Route path="/forbidden" element={<ForbiddenPage />} />
              <Route path="/403" element={<ForbiddenPage />} />
              <Route
                element={
                  <RequirePermission
                    requiredRole="admin"
                    requiredPermission={SYSTEM_PERMISSIONS.USER_MANAGE}
                    fallbackPath="/forbidden"
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
                    fallbackPath="/forbidden"
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
                    fallbackPath="/forbidden"
                  />
                }
              >
                <Route path="/trainee" element={<RoleDashboard role="trainee" />} />
              </Route>
              <Route
                element={
                  <RequirePermission
                    requiredRole="admin"
                    requiredPermission={SYSTEM_PERMISSIONS.USER_VIEW}
                    fallbackPath="/forbidden"
                  />
                }
              >
                <Route path="/users" element={<UserManagementPage />} />
              </Route>
              <Route
                element={
                  <RequirePermission
                    requiredPermission={SYSTEM_PERMISSIONS.COURSE_VIEW}
                    fallbackPath="/forbidden"
                  />
                }
              >
                <Route path="/courses" element={<CourseManagementPage />} />
                <Route path="/training-programs" element={<TrainingProgramsPage />} />
                <Route path="/training-programs/:programId/structure" element={<ProgramStructurePage />} />
                <Route path="/subjects" element={<SubjectsPage />} />
              </Route>
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/profile" element={<UserProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
)