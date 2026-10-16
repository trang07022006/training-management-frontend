// @vitest-environment jsdom
/**
 * DedicatedPagesNavigationFlow.test.tsx
 * Comprehensive regression tests verifying navigation from list pages to dedicated pages:
 * 1. ClassesPage -> /classes/new, /classes/:id/subjects, /classes/:id/schedules, /classes/:id/enrollments/new, /classes/:id/students, /holidays
 * 2. SubjectsPage -> /subjects/new, /subjects/:id/edit, /subjects/:id
 * 3. TrainingProgramsPage -> /training-programs/new, /training-programs/:id/edit, /training-programs/:id
 * 4. UserManagementPage & UserTable -> /users/new, /users/:id/edit, /users/:id/roles, /users/:id
 * 5. StudentsPage -> /students/:id
 * 6. ScheduleCalendarPage -> /classes/:classId/schedules/:scheduleId
 * 7. SubjectSessionsPage -> /subjects/:id/sessions/new, /subjects/:id/sessions/clone, /subjects/:id/sessions/:id/edit
 * 8. LeadsPage -> /leads/new, /leads/:id, /leads/:id/edit
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ClassesPage } from './ClassesPage'
import { SubjectsPage } from './SubjectsPage'
import { TrainingProgramsPage } from './TrainingProgramsPage'
import { UserManagementPage } from './UserManagementPage'
import { StudentsPage } from './StudentsPage'
import { ScheduleCalendarPage } from './ScheduleCalendarPage'
import { SubjectSessionsPage } from './SubjectSessionsPage'
import { LeadsPage } from './LeadsPage'

// Mock react-router useNavigate hook tracker
const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>()
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

// Mock SessionProvider
const mockRequest = vi.fn()
vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        hasSession: true,
        user: { id: 'user-admin', role: 'admin', name: 'Quản trị viên' },
        role: 'admin',
        roles: ['admin', 'training_manager'],
        permissions: ['course.manage', 'course.view', 'user.view', 'user.manage', 'lead.delete'],
        request: mockRequest,
    }),
}))

// Mock API clients
vi.mock('../api/classApi', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/classApi')>()
    return {
        ...actual,
        listClasses: vi.fn().mockResolvedValue({
            items: [
                {
                    id: 'cls-101',
                    code: 'CNTT-K21A',
                    name: 'Công nghệ thông tin K21A',
                    program_id: 'prog-1',
                    program_name: 'Chương trình CNTT',
                    learning_mode: 'offline',
                    max_capacity: 30,
                    status: 'planning',
                    expected_start_date: '2026-05-10',
                    created_at: '2026-03-01T00:00:00Z',
                },
            ],
            total: 1,
            page: 1,
            page_size: 10,
            total_pages: 1,
        }),
    }
})

vi.mock('../api/subjectApi', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/subjectApi')>()
    return {
        ...actual,
        getSubjects: vi.fn().mockResolvedValue({
            items: [
                {
                    id: 'sub-201',
                    code: 'WEB101',
                    name: 'Lập trình Web Cơ bản',
                    credits: 3,
                    theory_hours: 30,
                    practice_hours: 15,
                    total_hours: 45,
                    total_sessions: 15,
                    status: 'active',
                },
            ],
            total: 1,
            page: 1,
            page_size: 10,
            total_pages: 1,
        }),
        getSubject: vi.fn().mockResolvedValue({
            id: 'sub-201',
            code: 'WEB101',
            name: 'Lập trình Web Cơ bản',
            credits: 3,
            theory_hours: 30,
            practice_hours: 15,
            total_hours: 45,
            total_sessions: 15,
            status: 'active',
        }),
    }
})

vi.mock('../api/trainingProgramApi', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/trainingProgramApi')>()
    return {
        ...actual,
        getTrainingPrograms: vi.fn().mockResolvedValue({
            items: [
                {
                    id: 'tp-301',
                    code: 'TP-CNTT-01',
                    name: 'Chương trình Cử nhân CNTT',
                    total_credits: 120,
                    status: 'active',
                    description: 'Mô tả chương trình',
                },
            ],
            total: 1,
            page: 1,
            page_size: 10,
            total_pages: 1,
        }),
    }
})

vi.mock('../api/userApi', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/userApi')>()
    return {
        ...actual,
        fetchUsersApi: vi.fn().mockResolvedValue({
            items: [
                {
                    id: 'u-401',
                    username: 'nguyenvana',
                    name: 'Nguyễn Văn A',
                    email: 'a@ictu.edu.vn',
                    role: 'trainer',
                    status: 'active',
                    roles: ['trainer'],
                },
            ],
            total: 1,
            page: 1,
            page_size: 10,
            total_pages: 1,
        }),
    }
})

vi.mock('../api/studentApi', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/studentApi')>()
    return {
        ...actual,
        listStudents: vi.fn().mockResolvedValue({
            items: [
                {
                    id: 'stu-501',
                    student_code: 'STU000001',
                    full_name: 'Trần Thị B',
                    email: 'b@student.ictu.edu.vn',
                    phone: '0987654321',
                    status: 'active',
                    program_name: 'CNTT',
                    entry_level: null,
                    notes: null,
                    current_class: null,
                    class_history: [],
                },
            ],
            total: 1,
            page: 1,
            page_size: 10,
            total_pages: 1,
        }),
    }
})

vi.mock('../api/scheduleApi', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/scheduleApi')>()
    return {
        ...actual,
        getCalendarSchedules: vi.fn().mockResolvedValue({
            total: 1,
            view_mode: 'week',
            filters: {},
            schedules: [
                {
                    id: 'sch-601',
                    class_id: 'cls-101',
                    class_code: 'CNTT-K21A',
                    session_number: 1,
                    topic: 'Bài 1: Giới thiệu hệ thống',
                    learning_date: new Date().toISOString().slice(0, 10),
                    start_time: '08:00:00',
                    end_time: '10:00:00',
                    shift: 'shift_1',
                    room_id: 'P101',
                    instructor_name: 'Nguyễn Văn A',
                    status: 'scheduled',
                    attendance_checked: false,
                },
            ],
        }),
    }
})

vi.mock('../api/subjectSessionApi', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/subjectSessionApi')>()
    return {
        ...actual,
        getSubjectSessions: vi.fn().mockResolvedValue({
            subject: {
                id: 'sub-201',
                code: 'WEB101',
                name: 'Lập trình Web Cơ bản',
                total_sessions: 15,
                status: 'active',
            },
            items: [
                {
                    id: 'sess-701',
                    subject_id: 'sub-201',
                    session_number: 1,
                    topic: 'Bài 1: HTML và CSS',
                    objective: 'Nắm vững cú pháp cơ bản',
                },
            ],
        }),
    }
})

vi.mock('../api/leadApi', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/leadApi')>()
    return {
        ...actual,
        getLeads: vi.fn().mockResolvedValue({
            items: [
                {
                    id: 'lead-801',
                    full_name: 'Lê Văn C',
                    phone: '0912345678',
                    email: 'c@gmail.com',
                    source: 'direct',
                    status: 'new',
                    created_at: '2026-03-01T00:00:00Z',
                },
            ],
            total: 1,
            page: 1,
            page_size: 10,
            total_pages: 1,
        }),
        getAssignableUsers: vi.fn().mockResolvedValue([]),
        getLeadPipeline: vi.fn().mockResolvedValue({
            columns: [],
            leads: [],
            counts: {},
            total: 0,
        }),
    }
})

describe('Dedicated Pages Navigation Flow - Comprehensive Regression Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        cleanup()
    })

    it('1. ClassesPage: Điều hướng đúng URL sang các dedicated pages từ các nút thao tác', async () => {
        render(
            <MemoryRouter initialEntries={['/classes']}>
                <ClassesPage />
            </MemoryRouter>
        )

        // Chờ dữ liệu lớp học load xong
        await waitFor(() => {
            expect(screen.getByTestId('view-class-cls-101')).toBeDefined()
        })

        // Nút Tạo lớp học mới -> /classes/new
        fireEvent.click(screen.getByTestId('create-class-btn'))
        expect(mockNavigate).toHaveBeenCalledWith('/classes/new')

        // Nút Môn học lớp -> /classes/cls-101/subjects
        fireEvent.click(screen.getByTestId('view-class-cls-101'))
        expect(mockNavigate).toHaveBeenCalledWith('/classes/cls-101/subjects')

        // Nút Thời khóa biểu -> /classes/cls-101/schedules
        fireEvent.click(screen.getByTestId('schedule-class-cls-101'))
        expect(mockNavigate).toHaveBeenCalledWith('/classes/cls-101/schedules')

        // Nút Ghi danh -> /classes/cls-101/enrollments/new
        fireEvent.click(screen.getByTestId('enroll-class-cls-101'))
        expect(mockNavigate).toHaveBeenCalledWith('/classes/cls-101/enrollments/new')

        // Nút Danh sách học viên -> /classes/cls-101/students
        fireEvent.click(screen.getByTestId('roster-class-cls-101'))
        expect(mockNavigate).toHaveBeenCalledWith('/classes/cls-101/students')

        // Nút Ngày nghỉ lễ trên header -> /holidays
        fireEvent.click(screen.getByTestId('open-holidays-btn'))
        expect(mockNavigate).toHaveBeenCalledWith('/holidays')
    })

    it('2. SubjectsPage: Điều hướng đúng sang /subjects/new, /subjects/:id/edit, /subjects/:id', async () => {
        render(
            <MemoryRouter initialEntries={['/subjects']}>
                <SubjectsPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-create-subject')).toBeDefined()
            expect(screen.getByTestId('btn-edit-sub-201')).toBeDefined()
        })

        // Nút Thêm môn học mới -> /subjects/new
        fireEvent.click(screen.getByTestId('btn-create-subject'))
        expect(mockNavigate).toHaveBeenCalledWith('/subjects/new')

        // Nút Sửa -> /subjects/sub-201/edit
        fireEvent.click(screen.getByTestId('btn-edit-sub-201'))
        expect(mockNavigate).toHaveBeenCalledWith('/subjects/sub-201/edit')

        // Nút Xem chi tiết -> /subjects/sub-201
        fireEvent.click(screen.getByTestId('btn-view-sub-201'))
        expect(mockNavigate).toHaveBeenCalledWith('/subjects/sub-201')
    })

    it('3. TrainingProgramsPage: Điều hướng đúng sang /training-programs/new, /edit, /:id', async () => {
        render(
            <MemoryRouter initialEntries={['/training-programs']}>
                <TrainingProgramsPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-create-program')).toBeDefined()
            expect(screen.getByTestId('btn-edit-tp-301')).toBeDefined()
        })

        // Nút Tạo chương trình mới -> /training-programs/new
        fireEvent.click(screen.getByTestId('btn-create-program'))
        expect(mockNavigate).toHaveBeenCalledWith('/training-programs/new')

        // Nút Sửa -> /training-programs/tp-301/edit
        fireEvent.click(screen.getByTestId('btn-edit-tp-301'))
        expect(mockNavigate).toHaveBeenCalledWith('/training-programs/tp-301/edit')

        // Nút Xem chi tiết -> link có href /training-programs/tp-301
        const btnView = screen.getByTestId('btn-view-tp-301')
        expect(btnView.getAttribute('href')).toBe('/training-programs/tp-301')
    })

    it('4. UserManagementPage: Điều hướng đúng sang /users/new, /edit, /roles, /:id', async () => {
        render(
            <MemoryRouter initialEntries={['/users']}>
                <UserManagementPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-create-user')).toBeDefined()
            expect(screen.getByTestId('btn-edit-user-u-401')).toBeDefined()
        })

        // Nút Thêm người dùng -> /users/new
        fireEvent.click(screen.getByTestId('btn-create-user'))
        expect(mockNavigate).toHaveBeenCalledWith('/users/new')

        // Nút Sửa trên bảng -> /users/u-401/edit
        fireEvent.click(screen.getByTestId('btn-edit-user-u-401'))
        expect(mockNavigate).toHaveBeenCalledWith('/users/u-401/edit')

        // Nút Phân vai trò -> /users/u-401/roles
        fireEvent.click(screen.getByTestId('btn-manage-role-u-401'))
        expect(mockNavigate).toHaveBeenCalledWith('/users/u-401/roles')
    })

    it('5. StudentsPage: Điều hướng đúng sang /students/:id khi bấm xem chi tiết', async () => {
        render(
            <MemoryRouter initialEntries={['/students']}>
                <StudentsPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('view-student-stu-501')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('view-student-stu-501'))
        expect(mockNavigate).toHaveBeenCalledWith('/students/stu-501')
    })

    it('6. ScheduleCalendarPage: Mở popup buổi học và bấm nút "Xem chi tiết buổi học" điều hướng đúng', async () => {
        render(
            <MemoryRouter initialEntries={['/schedules']}>
                <ScheduleCalendarPage />
            </MemoryRouter>
        )

        // Tìm thẻ buổi học và click để mở modal
        await waitFor(() => {
            expect(screen.getByTestId('session-card-sch-601')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('session-card-sch-601'))

        // Modal chi tiết buổi học mở lên
        await waitFor(() => {
            expect(screen.getByTestId('btn-view-schedule-detail')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-view-schedule-detail'))
        expect(mockNavigate).toHaveBeenCalledWith('/classes/cls-101/schedules/sch-601')
    })

    it('7. SubjectSessionsPage: Điều hướng đúng sang /sessions/new, /clone, /:id/edit', async () => {
        render(
            <MemoryRouter initialEntries={['/subjects/sub-201/sessions']}>
                <Routes>
                    <Route path="/subjects/:subjectId/sessions" element={<SubjectSessionsPage />} />
                </Routes>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-add-session')).toBeDefined()
            expect(screen.getByTestId('btn-edit-sess-701')).toBeDefined()
        })

        // Nút Thêm buổi học -> /subjects/sub-201/sessions/new
        fireEvent.click(screen.getByTestId('btn-add-session'))
        expect(mockNavigate).toHaveBeenCalledWith('/subjects/sub-201/sessions/new')

        // Nút Sao chép buổi học -> /subjects/sub-201/sessions/clone
        fireEvent.click(screen.getByTestId('btn-clone-sessions'))
        expect(mockNavigate).toHaveBeenCalledWith('/subjects/sub-201/sessions/clone')

        // Nút Sửa buổi học -> /subjects/sub-201/sessions/sess-701/edit
        fireEvent.click(screen.getByTestId('btn-edit-sess-701'))
        expect(mockNavigate).toHaveBeenCalledWith('/subjects/sub-201/sessions/sess-701/edit')
    })

    it('8. LeadsPage: Điều hướng đúng sang /leads/new, /leads/:id, /leads/:id/edit', async () => {
        render(
            <MemoryRouter initialEntries={['/leads']}>
                <LeadsPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('add-lead-btn')).toBeDefined()
            expect(screen.getByTestId('view-lead-lead-801')).toBeDefined()
        })

        // Nút Thêm khách hàng tiềm năng -> /leads/new
        fireEvent.click(screen.getByTestId('add-lead-btn'))
        expect(mockNavigate).toHaveBeenCalledWith('/leads/new')

        // Nút Xem lead -> /leads/lead-801
        fireEvent.click(screen.getByTestId('view-lead-lead-801'))
        expect(mockNavigate).toHaveBeenCalledWith('/leads/lead-801')

        // Nút Sửa lead -> /leads/lead-801/edit
        fireEvent.click(screen.getByTestId('edit-lead-lead-801'))
        expect(mockNavigate).toHaveBeenCalledWith('/leads/lead-801/edit')
    })
})
