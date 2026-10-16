// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'

// Dedicated pages to test
import { SubjectCreatePage } from './SubjectCreatePage'
import { SubjectDetailPage } from './SubjectDetailPage'
import { SubjectEditPage } from './SubjectEditPage'
import { SubjectSessionCreatePage } from './SubjectSessionCreatePage'
import { SubjectSessionEditPage } from './SubjectSessionEditPage'
import { SubjectSessionClonePage } from './SubjectSessionClonePage'

import { TrainingProgramCreatePage } from './TrainingProgramCreatePage'
import { TrainingProgramDetailPage } from './TrainingProgramDetailPage'
import { TrainingProgramEditPage } from './TrainingProgramEditPage'

import { ClassCreatePage } from './ClassCreatePage'
import { ClassDetailPage } from './ClassDetailPage'
import { ClassEnrollmentPage } from './ClassEnrollmentPage'
import { ScheduleGeneratePage } from './ScheduleGeneratePage'
import { ScheduleSessionDetailPage } from './ScheduleSessionDetailPage'
import { ScheduleSessionEditPage } from './ScheduleSessionEditPage'

import { StudentDetailPage } from './StudentDetailPage'
import { StudentEditPage } from './StudentEditPage'

import { UserCreatePage } from './UserCreatePage'
import { UserDetailPage } from './UserDetailPage'
import { UserEditPage } from './UserEditPage'
import { UserRolePage } from './UserRolePage'
import { UserImportPage } from './UserImportPage'

import { LeadCreatePage } from './LeadCreatePage'
import { LeadDetailPage } from './LeadDetailPage'
import { LeadEditPage } from './LeadEditPage'

import { HolidaysPage } from './HolidaysPage'

// Stable mock references to prevent infinite re-renders in useEffect
const mockRequest = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}')))
const mockRoles = ['admin']
const mockPermissions = ['course.manage', 'course.view', 'user.manage', 'user.view', 'lead.delete']

// Mock useSession
vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        userId: 'usr-1',
        userEmail: 'admin@ictu.edu.vn',
        userName: 'Admin User',
        role: 'admin',
        roles: mockRoles,
        permissions: mockPermissions,
        hasSession: true,
        isLoading: false,
        request: mockRequest,
    }),
}))

// Mock APIs
vi.mock('../api/subjectApi', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return {
        ...actual,
        getSubject: vi.fn().mockResolvedValue({
            id: 'sub-1',
            code: 'IT101',
            name: 'Nhập môn Lập trình',
            credits: 3,
            total_sessions: 30,
            status: 'active',
            created_at: '2026-01-01T00:00:00Z',
        }),
        createSubject: vi.fn(),
        updateSubject: vi.fn(),
        getSubjectStatusLabel: vi.fn().mockReturnValue('Đang áp dụng'),
    }
})

vi.mock('../api/subjectSessionApi', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return {
        ...actual,
        getSubjectSessions: vi.fn().mockResolvedValue({ items: [], subject: { id: 'sub-1', code: 'CS101', name: 'Nhập môn Lập trình', total_sessions: 30 } }),
        getSubjectSession: vi.fn().mockResolvedValue({
            id: 'sess-1',
            subject_id: 'sub-1',
            session_number: 1,
            topic: 'Giới thiệu môn học',
            session_type: 'theory',
        }),
        getAvailableSessionNumbers: vi.fn().mockResolvedValue([1, 2, 3]),
        getSubjectForCloneOptions: vi.fn().mockResolvedValue([]),
    }
})

vi.mock('../api/trainingProgramApi', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return {
        ...actual,
        getTrainingProgram: vi.fn().mockResolvedValue({
            id: 'prog-1',
            code: 'SE_2026',
            name: 'Kỹ thuật Phần mềm',
            duration_semesters: 8,
            standard_tuition_fee: 15000000,
            status: 'active',
        }),
        getTrainingPrograms: vi.fn().mockResolvedValue({ items: [], total: 0 }),
        createTrainingProgram: vi.fn(),
        updateTrainingProgram: vi.fn(),
        getProgramStatusLabel: vi.fn().mockReturnValue('Đang áp dụng'),
    }
})

vi.mock('../api/classApi', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return {
        ...actual,
        getClassDetail: vi.fn().mockResolvedValue({
            id: 'cls-1',
            class_code: 'SE01',
            program_id: 'prog-1',
            program_name: 'Kỹ thuật Phần mềm',
            status: 'in_progress',
            max_capacity: 30,
            enrolled_count: 25,
            subjects: [],
        }),
        listClasses: vi.fn().mockResolvedValue({ items: [], total: 0 }),
        getClassRoster: vi.fn().mockResolvedValue({ items: [] }),
        generateClassSchedule: vi.fn(),
        saveOfficialClassSchedule: vi.fn(),
        getScheduleDetail: vi.fn().mockResolvedValue({
            id: 'sch-1',
            class_id: 'cls-1',
            subject_name: 'Nhập môn Lập trình',
            date: '2026-10-20',
            shift_label: 'Ca 1 (07:00 - 09:15)',
            classroom_name: 'P301',
            instructor_name: 'Nguyễn Văn A',
            status: 'scheduled',
            attendance_taken: false,
        }),
        updateScheduleSession: vi.fn(),
        cancelScheduleSession: vi.fn(),
    }
})

vi.mock('../api/studentApi', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return {
        ...actual,
        getStudentDetail: vi.fn().mockResolvedValue({
            id: 'stu-1',
            student_code: 'SV2026001',
            full_name: 'Trần Văn B',
            email: 'b@ictu.edu.vn',
            phone: '0987654321',
            status: 'active',
        }),
        getStudentClasses: vi.fn().mockResolvedValue([]),
        updateStudentProfile: vi.fn(),
        listStudents: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    }
})

vi.mock('../api/userApi', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return {
        ...actual,
        fetchUsersApi: vi.fn().mockResolvedValue({ items: [], total: 0 }),
        fetchAvailableRolesApi: vi.fn().mockResolvedValue([
            { code: 'user', name: 'Người dùng' },
            { code: 'admin', name: 'Quản trị viên' },
        ]),
        fetchUserByIdApi: vi.fn().mockResolvedValue({
            id: 'usr-1',
            name: 'Admin User',
            email: 'admin@ictu.edu.vn',
            phone: '0912345678',
            role: 'admin',
            roles: ['admin'],
            status: 'active',
        }),
        fetchRolesApi: vi.fn().mockResolvedValue({
            roles: [{ id: 'admin', name: 'Quản trị viên' }, { id: 'trainer', name: 'Giảng viên' }],
        }),
        fetchUserRolesApi: vi.fn().mockResolvedValue({
            roles: ['admin'],
        }),
        createUserApi: vi.fn().mockResolvedValue({ id: 'new-usr-1' }),
        updateUserApi: vi.fn(),
        assignUserRolesApi: vi.fn(),
        downloadUserImportTemplateApi: vi.fn(),
        previewUserImportApi: vi.fn(),
        importUsersBulkApi: vi.fn(),
    }
})

vi.mock('../api/leadApi', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return {
        ...actual,
        getLead: vi.fn().mockResolvedValue({
            id: 'lead-1',
            full_name: 'Lê Văn C',
            phone: '0901234567',
            email: 'c@gmail.com',
            source: 'facebook',
            status: 'new',
            created_at: '2026-10-10T00:00:00Z',
        }),
        getAssignableUsers: vi.fn().mockResolvedValue([]),
        getLeadAssignmentHistory: vi.fn().mockResolvedValue([]),
        getLeadStatusHistory: vi.fn().mockResolvedValue([]),
        getLeadCareLogs: vi.fn().mockResolvedValue([]),
        checkLeadPhone: vi.fn().mockResolvedValue({ exists: false }),
        createLead: vi.fn(),
        updateLead: vi.fn(),
        updateLeadStatus: vi.fn(),
        getLeadStatusLabel: vi.fn().mockReturnValue('Mới tiếp nhận'),
        getLeadSourceLabel: vi.fn().mockReturnValue('Facebook'),
        LEAD_SOURCES: [{ value: 'direct', label: 'Trực tiếp' }, { value: 'facebook', label: 'Facebook' }],
        LEAD_STATUS_BADGE_CLASSES: { new: 'status-new' },
        REJECTION_REASONS: ['Không còn nhu cầu'],
        formatCallbackDateDisplay: vi.fn().mockReturnValue('20/10/2026'),
        isLeadCallbackOverdue: vi.fn().mockReturnValue(false),
    }
})

vi.mock('../api/scheduleApi', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return {
        ...actual,
        getClassSchedules: vi.fn().mockResolvedValue({
            schedules: [
                {
                    id: 'sch-1',
                    class_id: 'cls-1',
                    subject_name: 'Nhập môn Lập trình',
                    learning_date: '2026-10-20',
                    scheduled_date: '2026-10-20',
                    shift: 'shift_1',
                    shift_label: 'Ca 1 (07:00 - 09:15)',
                    classroom_name: 'P301',
                    instructor_name: 'Nguyễn Văn A',
                    status: 'scheduled',
                    attendance_taken: false,
                    session_number: 1,
                },
            ],
        }),
        updateClassScheduleItem: vi.fn(),
        cancelClassScheduleItem: vi.fn().mockResolvedValue({
            notifications_sent: 5,
            schedule: { id: 'sch-1', status: 'cancelled' },
        }),
        listHolidays: vi.fn().mockResolvedValue([]),
        createHoliday: vi.fn(),
        deleteHoliday: vi.fn(),
    }
})

function renderWithProviders(ui: React.ReactElement, initialPath: string) {
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            {ui}
        </MemoryRouter>
    )
}

describe('Dedicated Routes & Pages Refactor - Verifications', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        cleanup()
    })

    // 1. Phân hệ Môn học (Subjects)
    it('Môn học: /subjects/new renders SubjectCreatePage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/subjects/new" element={<SubjectCreatePage />} />
            </Routes>,
            '/subjects/new'
        )
        expect(screen.getByTestId('subject-create-page')).toBeDefined()
        expect(screen.getByText('Thêm môn học mới')).toBeDefined()
    })

    it('Môn học: /subjects/:subjectId renders SubjectDetailPage with data', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
            </Routes>,
            '/subjects/sub-1'
        )
        await waitFor(() => {
            expect(screen.getByTestId('subject-detail-page')).toBeDefined()
            expect(screen.getAllByText('Nhập môn Lập trình').length).toBeGreaterThan(0)
        })
    })

    it('Môn học: /subjects/:subjectId/edit renders SubjectEditPage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
                <Route path="/subjects/:subjectId/edit" element={<SubjectEditPage />} />
            </Routes>,
            '/subjects/sub-1/edit'
        )
        await waitFor(() => {
            expect(screen.getByTestId('subject-edit-page')).toBeDefined()
        })
    })

    it('Môn học: /subjects/:subjectId/sessions/new renders SubjectSessionCreatePage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/subjects/:subjectId/sessions/new" element={<SubjectSessionCreatePage />} />
            </Routes>,
            '/subjects/sub-1/sessions/new'
        )
        await waitFor(() => {
            expect(screen.getByTestId('subject-session-create-page')).toBeDefined()
        })
    })

    it('Môn học: /subjects/:subjectId/sessions/:sessionId/edit renders SubjectSessionEditPage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/subjects/:subjectId/sessions/:sessionId/edit" element={<SubjectSessionEditPage />} />
            </Routes>,
            '/subjects/sub-1/sessions/sess-1/edit'
        )
        await waitFor(() => {
            expect(screen.getByTestId('subject-session-edit-page')).toBeDefined()
        })
    })

    it('Môn học: /subjects/:subjectId/sessions/clone renders SubjectSessionClonePage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/subjects/:subjectId/sessions/clone" element={<SubjectSessionClonePage />} />
            </Routes>,
            '/subjects/sub-1/sessions/clone'
        )
        await waitFor(() => {
            expect(screen.getByTestId('subject-session-clone-page')).toBeDefined()
        })
    })

    // 2. Phân hệ Chương trình đào tạo (Training Programs)
    it('Chương trình đào tạo: /training-programs/new renders TrainingProgramCreatePage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/training-programs/new" element={<TrainingProgramCreatePage />} />
            </Routes>,
            '/training-programs/new'
        )
        expect(screen.getByTestId('training-program-create-page')).toBeDefined()
    })

    it('Chương trình đào tạo: /training-programs/:programId renders TrainingProgramDetailPage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/training-programs/:programId" element={<TrainingProgramDetailPage />} />
            </Routes>,
            '/training-programs/prog-1'
        )
        await waitFor(() => {
            expect(screen.getByTestId('training-program-detail-page')).toBeDefined()
            expect(screen.getAllByText('Kỹ thuật Phần mềm').length).toBeGreaterThan(0)
        })
    })

    it('Chương trình đào tạo: /training-programs/:programId/edit renders TrainingProgramEditPage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/training-programs/:programId/edit" element={<TrainingProgramEditPage />} />
            </Routes>,
            '/training-programs/prog-1/edit'
        )
        await waitFor(() => {
            expect(screen.getByTestId('training-program-edit-page')).toBeDefined()
        })
    })

    // 3. Phân hệ Lớp học (Classes)
    it('Lớp học: /classes/new renders ClassCreatePage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/classes/new" element={<ClassCreatePage />} />
            </Routes>,
            '/classes/new'
        )
        expect(screen.getByTestId('class-create-page')).toBeDefined()
    })

    it('Lớp học: /classes/:classId renders ClassDetailPage with DetailNavTabs', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/classes/:classId" element={<ClassDetailPage />} />
            </Routes>,
            '/classes/cls-1'
        )
        await waitFor(() => {
            expect(screen.getByTestId('class-detail-page')).toBeDefined()
            expect(screen.getByText('Thông tin chung')).toBeDefined()
            expect(screen.getAllByText(/Môn học/i).length).toBeGreaterThan(0)
            expect(screen.getAllByText(/Giảng viên/i).length).toBeGreaterThan(0)
            expect(screen.getAllByText(/Học viên/i).length).toBeGreaterThan(0)
            expect(screen.getAllByText(/Thời khóa biểu/i).length).toBeGreaterThan(0)
        })
    })

    it('Lớp học: /classes/:classId/enrollments/new renders ClassEnrollmentPage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/classes/:classId/enrollments/new" element={<ClassEnrollmentPage />} />
            </Routes>,
            '/classes/cls-1/enrollments/new'
        )
        await waitFor(() => {
            expect(screen.getByTestId('class-enrollment-page')).toBeDefined()
        })
    })

    // 4. Phân hệ Thời khóa biểu (Schedules)
    it('Thời khóa biểu: /classes/:classId/schedules/generate renders ScheduleGeneratePage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/classes/:classId/schedules/generate" element={<ScheduleGeneratePage />} />
            </Routes>,
            '/classes/cls-1/schedules/generate'
        )
        await waitFor(() => {
            expect(screen.getByTestId('schedule-generate-page')).toBeDefined()
        })
    })

    it('Thời khóa biểu: /classes/:classId/schedules/:scheduleId renders ScheduleSessionDetailPage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/classes/:classId/schedules/:scheduleId" element={<ScheduleSessionDetailPage />} />
            </Routes>,
            '/classes/cls-1/schedules/sch-1'
        )
        await waitFor(() => {
            expect(screen.getByTestId('schedule-session-detail-page')).toBeDefined()
        })
    })

    it('Thời khóa biểu: /classes/:classId/schedules/:scheduleId/edit renders ScheduleSessionEditPage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/classes/:classId/schedules/:scheduleId/edit" element={<ScheduleSessionEditPage />} />
            </Routes>,
            '/classes/cls-1/schedules/sch-1/edit'
        )
        await waitFor(() => {
            expect(screen.getByTestId('schedule-session-edit-page')).toBeDefined()
        })
    })

    // 5. Phân hệ Học viên (Students)
    it('Học viên: /students/:studentId renders StudentDetailPage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/students/:studentId" element={<StudentDetailPage />} />
            </Routes>,
            '/students/stu-1'
        )
        await waitFor(() => {
            expect(screen.getByTestId('student-detail-page')).toBeDefined()
            expect(screen.getAllByText('Trần Văn B').length).toBeGreaterThan(0)
        })
    })

    it('Học viên: /students/:studentId/edit renders StudentEditPage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/students/:studentId/edit" element={<StudentEditPage />} />
            </Routes>,
            '/students/stu-1/edit'
        )
        await waitFor(() => {
            expect(screen.getByTestId('student-edit-page')).toBeDefined()
        })
    })

    // 6. Phân hệ Người dùng (Users)
    it('Người dùng: /users/new renders UserCreatePage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/users/new" element={<UserCreatePage />} />
            </Routes>,
            '/users/new'
        )
        await waitFor(() => {
            expect(screen.getByTestId('user-create-page')).toBeDefined()
        })
    })

    it('Người dùng: /users/:userId renders UserDetailPage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/users/:userId" element={<UserDetailPage />} />
            </Routes>,
            '/users/usr-1'
        )
        await waitFor(() => {
            expect(screen.getByTestId('user-detail-page')).toBeDefined()
            expect(screen.getAllByText('Admin User').length).toBeGreaterThan(0)
        })
    })

    it('Người dùng: /users/:userId/edit renders UserEditPage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/users/:userId/edit" element={<UserEditPage />} />
            </Routes>,
            '/users/usr-1/edit'
        )
        await waitFor(() => {
            expect(screen.getByTestId('user-edit-page')).toBeDefined()
        })
    })

    it('Người dùng: /users/:userId/roles renders UserRolePage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/users/:userId/roles" element={<UserRolePage />} />
            </Routes>,
            '/users/usr-1/roles'
        )
        await waitFor(() => {
            expect(screen.getByTestId('user-role-page')).toBeDefined()
        })
    })

    it('Người dùng: /users/import renders UserImportPage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/users/import" element={<UserImportPage />} />
            </Routes>,
            '/users/import'
        )
        expect(screen.getByText('Import người dùng từ Excel')).toBeDefined()
    })

    // 7. Phân hệ Tư vấn tuyển sinh (Leads)
    it('Tư vấn tuyển sinh: /leads/new renders LeadCreatePage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/leads/new" element={<LeadCreatePage />} />
            </Routes>,
            '/leads/new'
        )
        expect(screen.getByText('Thêm khách hàng tiềm năng mới')).toBeDefined()
    })

    it('Tư vấn tuyển sinh: /leads/:leadId renders LeadDetailPage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/leads/:leadId" element={<LeadDetailPage />} />
            </Routes>,
            '/leads/lead-1'
        )
        await waitFor(() => {
            expect(screen.getAllByText('Lê Văn C').length).toBeGreaterThan(0)
            expect(screen.getByText(/Nhật ký chăm sóc khách hàng/i)).toBeDefined()
        })
    })

    it('Tư vấn tuyển sinh: /leads/:leadId/edit renders LeadEditPage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/leads/:leadId/edit" element={<LeadEditPage />} />
            </Routes>,
            '/leads/lead-1/edit'
        )
        await waitFor(() => {
            expect(screen.getByText(/Chỉnh sửa khách hàng: Lê Văn C/i)).toBeDefined()
        })
    })

    // 8. Phân hệ Ngày nghỉ (Holidays)
    it('Ngày nghỉ: /holidays renders HolidaysPage', async () => {
        renderWithProviders(
            <Routes>
                <Route path="/holidays" element={<HolidaysPage />} />
            </Routes>,
            '/holidays'
        )
        await waitFor(() => {
            expect(screen.getByText('Quản lý ngày nghỉ lễ')).toBeDefined()
        })
    })
})
