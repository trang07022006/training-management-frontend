import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { SessionRedirect } from './auth/SessionRedirect'
import './index.css'
import App from './App.tsx'
import { SessionProvider } from './auth/SessionProvider.tsx'
import { SessionNotice } from './auth/SessionNotice.tsx'
import { PublicLayout } from './layouts/PublicLayout'
import { HomePage } from './pages/HomePage'
import { AboutPage } from './pages/AboutPage'
import { PublicProgramsPage } from './pages/PublicProgramsPage'
import { PublicProgramDetailPage } from './pages/PublicProgramDetailPage'
import { AdmissionsPage } from './pages/AdmissionsPage'
import { ContactPage } from './pages/ContactPage'
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
// User Management Pages
import { UserManagementPage } from './pages/UserManagementPage'
import { UserCreatePage } from './pages/UserCreatePage'
import { UserDetailPage } from './pages/UserDetailPage'
import { UserEditPage } from './pages/UserEditPage'
import { UserRolePage } from './pages/UserRolePage'
import { UserImportPage } from './pages/UserImportPage'

// Course & Program Pages
import { CoursesRedirect } from './pages/CoursesRedirect'
import { TrainerRedirect } from './pages/TrainerRedirect'
import { TraineeRedirect } from './pages/TraineeRedirect'
import { TrainingProgramsPage } from './pages/TrainingProgramsPage'
import { TrainingProgramCreatePage } from './pages/TrainingProgramCreatePage'
import { TrainingProgramDetailPage } from './pages/TrainingProgramDetailPage'
import { TrainingProgramEditPage } from './pages/TrainingProgramEditPage'
import { ProgramStructurePage } from './pages/ProgramStructurePage'

// Subject Pages
import { SubjectsPage } from './pages/SubjectsPage'
import { SubjectCreatePage } from './pages/SubjectCreatePage'
import { SubjectDetailPage } from './pages/SubjectDetailPage'
import { SubjectEditPage } from './pages/SubjectEditPage'
import { SubjectSessionsPage } from './pages/SubjectSessionsPage'
import { SubjectSessionCreatePage } from './pages/SubjectSessionCreatePage'
import { SubjectSessionEditPage } from './pages/SubjectSessionEditPage'
import { SubjectSessionClonePage } from './pages/SubjectSessionClonePage'

// Class & Schedule Pages
import { ClassesPage } from './pages/ClassesPage'
import { ClassCreatePage } from './pages/ClassCreatePage'
import { ClassDetailPage } from './pages/ClassDetailPage'
import { ClassEnrollmentPage } from './pages/ClassEnrollmentPage'
import { ClassSubjectInstructorAssignPage } from './pages/ClassSubjectInstructorAssignPage'
import { ScheduleGeneratePage } from './pages/ScheduleGeneratePage'
import { ScheduleSessionDetailPage } from './pages/ScheduleSessionDetailPage'
import { ScheduleSessionEditPage } from './pages/ScheduleSessionEditPage'
import { ScheduleCalendarPage } from './pages/ScheduleCalendarPage'
import { StudentSchedulePage } from './pages/StudentSchedulePage'
import { StudentAttendanceHistoryPage } from './pages/StudentAttendanceHistoryPage'
import { StudentAbsenceRequestsPage } from './pages/StudentAbsenceRequestsPage'
import { CreateAbsenceRequestPage } from './pages/CreateAbsenceRequestPage'
import { InstructorAbsenceManagementPage } from './pages/InstructorAbsenceManagementPage'
import { SessionManagementPage } from './pages/SessionManagementPage'

// Student Pages
import { StudentsPage } from './pages/StudentsPage'
import { StudentDetailPage } from './pages/StudentDetailPage'
import { StudentEditPage } from './pages/StudentEditPage'
import { StudentReservePage } from './pages/StudentReservePage'
import { StudentTransferPage } from './pages/StudentTransferPage'
import { StudentDropPage } from './pages/StudentDropPage'
import { SessionAttendancePage } from './pages/SessionAttendancePage'

// Lead Pages
import { LeadsPage } from './pages/LeadsPage'
import { LeadCreatePage } from './pages/LeadCreatePage'
import { LeadDetailPage } from './pages/LeadDetailPage'
import { LeadEditPage } from './pages/LeadEditPage'

// Holiday Pages
import { HolidaysPage } from './pages/HolidaysPage'

// Classroom Pages
import { ClassroomsPage } from './pages/ClassroomsPage'

import { UserProfilePage } from './pages/UserProfilePage'
import { PublicConsultationPage } from './pages/PublicConsultationPage'
import { getApiOrigin } from './utils/apiConfig'

const apiOrigin = getApiOrigin()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider apiOrigin={apiOrigin}>
        <SessionRedirect />
        <SessionNotice />

        <Routes>
          {/* Public Website Routes (Không yêu cầu đăng nhập) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/programs" element={<PublicProgramsPage />} />
            <Route path="/programs/:id" element={<PublicProgramDetailPage />} />
            <Route path="/admissions" element={<AdmissionsPage />} />
            <Route path="/consultation" element={<PublicConsultationPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Route>

          {/* Standalone Public Auth Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/401" element={<UnauthorizedPage />} />

          {/* Protected Internal Routes */}
          <Route element={<RequireSession />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<App />} />
              <Route path="/forbidden" element={<ForbiddenPage />} />
              <Route path="/403" element={<ForbiddenPage />} />

              {/* Redirections for deprecated routes (replace to prevent history loop) */}
              <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
              <Route path="/courses" element={<CoursesRedirect />} />
              <Route path="/trainer" element={<TrainerRedirect />} />
              <Route path="/trainee" element={<TraineeRedirect />} />

              {/* User Management Module */}
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
                <Route path="/users/new" element={<UserCreatePage />} />
                <Route path="/users/import" element={<UserImportPage />} />
                <Route path="/users/:userId" element={<UserDetailPage />} />
                <Route path="/users/:userId/edit" element={<UserEditPage />} />
                <Route path="/users/:userId/roles" element={<UserRolePage />} />
              </Route>

              {/* Training Operations Module */}
              <Route
                element={
                  <RequirePermission
                    requiredPermission={SYSTEM_PERMISSIONS.COURSE_VIEW}
                    fallbackPath="/forbidden"
                  />
                }
              >
                {/* Training Programs */}
                <Route path="/training-programs" element={<TrainingProgramsPage />} />
                <Route path="/training-programs/new" element={<TrainingProgramCreatePage />} />
                <Route path="/training-programs/:programId" element={<TrainingProgramDetailPage />} />
                <Route path="/training-programs/:programId/edit" element={<TrainingProgramEditPage />} />
                <Route path="/training-programs/:programId/structure" element={<ProgramStructurePage />} />

                {/* Subjects */}
                <Route path="/subjects" element={<SubjectsPage />} />
                <Route path="/subjects/new" element={<SubjectCreatePage />} />
                <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
                <Route path="/subjects/:subjectId/edit" element={<SubjectEditPage />} />
                <Route path="/subjects/:subjectId/sessions" element={<SubjectSessionsPage />} />
                <Route path="/subjects/:subjectId/sessions/new" element={<SubjectSessionCreatePage />} />
                <Route path="/subjects/:subjectId/sessions/:sessionId/edit" element={<SubjectSessionEditPage />} />
                <Route path="/subjects/:subjectId/sessions/clone" element={<SubjectSessionClonePage />} />

                {/* Students */}
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/students/:studentId" element={<StudentDetailPage />} />
                <Route path="/students/:studentId/edit" element={<StudentEditPage />} />
                <Route
                  element={
                    <RequirePermission
                      requiredPermission={SYSTEM_PERMISSIONS.STUDENT_LIFECYCLE_MANAGE}
                      fallbackPath="/forbidden"
                    />
                  }
                >
                  <Route path="/students/:studentId/reserve" element={<StudentReservePage />} />
                  <Route path="/students/:studentId/transfer" element={<StudentTransferPage />} />
                  <Route path="/students/:studentId/drop" element={<StudentDropPage />} />
                </Route>

                {/* Classes */}
                <Route path="/classes" element={<ClassesPage />} />
                <Route path="/classes/new" element={<ClassCreatePage />} />
                <Route path="/classes/:classId" element={<ClassDetailPage />} />
                <Route path="/classes/:classId/subjects" element={<ClassDetailPage />} />
                <Route path="/classes/:classId/instructors" element={<ClassDetailPage />} />
                <Route path="/classes/:classId/students" element={<ClassDetailPage />} />
                <Route path="/classes/:classId/schedules" element={<ClassDetailPage />} />
                <Route path="/classes/:classId/attendance-summary" element={<ClassDetailPage />} />
                <Route path="/classes/:classId/assignments" element={<ClassDetailPage />} />
                <Route path="/classes/:classId/enrollments/new" element={<ClassEnrollmentPage />} />
                <Route path="/classes/:classId/subjects/:classSubjectId/instructors" element={<ClassSubjectInstructorAssignPage />} />
                <Route element={<RequirePermission requiredPermission={SYSTEM_PERMISSIONS.SCHEDULE_MANAGE} fallbackPath="/forbidden" />}><Route path="/classes/:classId/schedules/generate" element={<ScheduleGeneratePage />} /></Route>
                <Route path="/classes/:classId/schedules/:scheduleId" element={<ScheduleSessionDetailPage />} />
                <Route element={<RequirePermission requiredPermission={SYSTEM_PERMISSIONS.SCHEDULE_MANAGE} fallbackPath="/forbidden" />}><Route path="/classes/:classId/schedules/:scheduleId/edit" element={<ScheduleSessionEditPage />} /></Route>
                <Route element={<RequirePermission requiredPermission={SYSTEM_PERMISSIONS.ATTENDANCE_VIEW} fallbackPath="/forbidden" />}>
                  <Route path="/schedules/:scheduleId/attendance" element={<SessionAttendancePage />} />
                  <Route path="/classes/:classId/schedules/:scheduleId/attendance" element={<SessionAttendancePage />} />
                </Route>

                {/* Schedules */}
                <Route element={<RequirePermission requiredPermission={SYSTEM_PERMISSIONS.SCHEDULE_VIEW} fallbackPath="/forbidden" />}><Route path="/schedules" element={<ScheduleCalendarPage />} /></Route>
                <Route
                  element={
                    <RequirePermission
                      requiredPermission={SYSTEM_PERMISSIONS.SCHEDULE_PERSONAL_VIEW}
                      fallbackPath="/schedules"
                    />
                  }
                >
                  <Route path="/my-schedule" element={<StudentSchedulePage />} />
                  <Route path="/my-attendance-history" element={<StudentAttendanceHistoryPage />} />
                </Route>
                <Route
                  element={
                    <RequirePermission
                      requiredPermission={SYSTEM_PERMISSIONS.ABSENCE_REQUEST}
                      fallbackPath="/forbidden"
                    />
                  }
                >
                  <Route path="/my-absence-requests" element={<StudentAbsenceRequestsPage />} />
                  <Route path="/my-absence-requests/new" element={<CreateAbsenceRequestPage />} />
                </Route>
                <Route
                  element={
                    <RequirePermission
                      requiredPermission={SYSTEM_PERMISSIONS.ABSENCE_REVIEW}
                      fallbackPath="/forbidden"
                    />
                  }
                >
                  <Route path="/instructor/absence-requests" element={<InstructorAbsenceManagementPage />} />
                </Route>

                {/* Holidays */}
                <Route path="/holidays" element={<HolidaysPage />} />

                {/* Classrooms */}
                <Route path="/classrooms" element={<ClassroomsPage />} />
              </Route>

              {/* Admissions & Leads Module */}
              <Route
                element={
                  <RequirePermission
                    requiredPermission={SYSTEM_PERMISSIONS.COURSE_MANAGE}
                    fallbackPath="/forbidden"
                  />
                }
              >
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/leads/new" element={<LeadCreatePage />} />
                <Route path="/leads/:leadId" element={<LeadDetailPage />} />
                <Route path="/leads/:leadId/edit" element={<LeadEditPage />} />
              </Route>
              <Route
                element={
                  <RequirePermission
                    requiredPermission={SYSTEM_PERMISSIONS.SCHEDULE_MANAGE}
                    fallbackPath="/forbidden"
                  />
                }
              >
                <Route path="/sessions" element={<SessionManagementPage />} />
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
