// @vitest-environment jsdom
/**
 * Automated Tests cho SCRUM-228 Frontend:
 * - AC 1: Mặc định hiển thị buổi kế tiếp và các buổi trong tuần.
 * - AC 2: Chỉ thấy buổi của lớp mình tham gia.
 * - Hiển thị thông tin phòng hoặc liên kết học trực tuyến khi dữ liệu có sẵn.
 * - Trạng thái rỗng khi chưa có lịch hoặc chưa ghi danh.
 */

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import { StudentSchedulePage } from './StudentSchedulePage'

const mockRequest = vi.fn()

// Mock useSession hook
vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        hasSession: true,
        user: { id: 'u-trainee-1', role: 'trainee', name: 'Nguyễn Văn Học Viên' },
        permissions: ['course.view', 'session.view'],
        request: mockRequest,
    }),
}))

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('SCRUM-228: Lịch học riêng của học viên', () => {
    const mockStudent = {
        id: 'stu-001',
        student_code: 'STU000001',
        full_name: 'Nguyễn Văn Học Viên',
        email: 'hocvien@ictu.edu.vn',
        phone: '0987654321',
        program_name: 'Công nghệ thông tin',
    }

    const mockEnrolledClasses = [
        {
            class_id: 'cls-101',
            class_code: 'CNTT-K21A',
            learning_mode: 'offline',
            program_name: 'Công nghệ thông tin',
        },
    ]

    const mockNextSession = {
        id: 'sch-next-01',
        class_id: 'cls-101',
        class_code: 'CNTT-K21A',
        session_number: 3,
        topic: 'Bài 3: React Hooks và State Management',
        learning_date: '2026-10-15',
        day_of_week: 'Thứ 5',
        shift: 'Ca 1 (07:30 - 09:30)',
        start_time: '07:30:00',
        end_time: '09:30:00',
        room_id: 'https://meet.google.com/ictu-react-class',
        is_online: true,
        online_url: 'https://meet.google.com/ictu-react-class',
        room_name: null,
        instructor_id: 'inst-01',
        instructor_name: 'TS. Nguyễn Văn A',
        instructor_email: 'nguyenvana@ictu.edu.vn',
        subject_name: 'Lập trình Web nâng cao',
        subject_code: 'WEB201',
        status: 'scheduled',
        cancellation_reason: null,
        attendance_checked: false,
    }

    const mockWeekSessions = [
        {
            id: 'sch-week-01',
            class_id: 'cls-101',
            class_code: 'CNTT-K21A',
            session_number: 2,
            topic: 'Bài 2: Tổng quan Typescript trong React',
            learning_date: '2026-10-13',
            day_of_week: 'Thứ 3',
            shift: 'Ca 1 (07:30 - 09:30)',
            start_time: '07:30:00',
            end_time: '09:30:00',
            room_id: 'P201',
            is_online: false,
            online_url: null,
            room_name: 'P201',
            instructor_id: 'inst-01',
            instructor_name: 'TS. Nguyễn Văn A',
            instructor_email: 'nguyenvana@ictu.edu.vn',
            subject_name: 'Lập trình Web nâng cao',
            subject_code: 'WEB201',
            status: 'scheduled',
            cancellation_reason: null,
            attendance_checked: false,
        },
        mockNextSession,
        {
            id: 'sch-week-03',
            class_id: 'cls-101',
            class_code: 'CNTT-K21A',
            session_number: 4,
            topic: 'Bài 4: Thực hành kiểm thử tự động',
            learning_date: '2026-10-17',
            day_of_week: 'Thứ 7',
            shift: 'Ca 2 (09:45 - 11:45)',
            start_time: '09:45:00',
            end_time: '11:45:00',
            room_id: 'Lab 3',
            is_online: false,
            online_url: null,
            room_name: 'Lab 3',
            instructor_id: 'inst-01',
            instructor_name: 'TS. Nguyễn Văn A',
            instructor_email: 'nguyenvana@ictu.edu.vn',
            subject_name: 'Lập trình Web nâng cao',
            subject_code: 'WEB201',
            status: 'cancelled',
            cancellation_reason: 'Phòng Lab 3 bảo trì máy tính',
            attendance_checked: false,
        },
    ]

    const makeMockResponse = (data: any, status = 200, ok = true) =>
        ({
            ok,
            status,
            json: async () => data,
        } as unknown as Response)

    beforeEach(() => {
        vi.clearAllMocks()
        mockRequest.mockImplementation((path: string) => {
            if (path.includes('/students/my-schedule')) {
                return Promise.resolve(
                    makeMockResponse({
                        code: 'MY_SCHEDULE_RETRIEVED',
                        data: {
                            student: mockStudent,
                            enrolled_classes: mockEnrolledClasses,
                            next_session: mockNextSession,
                            week_sessions: mockWeekSessions,
                            total_week_sessions: mockWeekSessions.length,
                            date_from: '2026-10-12',
                            date_to: '2026-10-18',
                            period_title: 'Tuần từ 12/10/2026 đến 18/10/2026',
                        },
                    })
                )
            }
            return Promise.resolve(makeMockResponse({ data: {} }))
        })
    })

    it('hiển thị mặc định buổi kế tiếp sắp tới và các buổi học trong tuần (AC 1)', async () => {
        render(
            <MemoryRouter>
                <StudentSchedulePage />
            </MemoryRouter>
        )

        expect(screen.getByTestId('student-schedule-page')).toBeDefined()

        // Chờ dữ liệu load xong
        await waitFor(() => {
            expect(screen.getByTestId('next-session-hero')).toBeDefined()
        })

        // Kiểm tra thông tin buổi kế tiếp
        const heroTitle = screen.getByTestId('hero-topic-title')
        expect(heroTitle.textContent).toContain('Bài 3: React Hooks và State Management')
        expect(screen.getAllByText(/TS. Nguyễn Văn A/).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/CNTT-K21A/).length).toBeGreaterThan(0)

        // Kiểm tra danh sách tuần
        expect(screen.getByTestId('week-sessions-grid')).toBeDefined()
        expect(screen.getByTestId('session-count-badge').textContent).toContain('3 buổi')
        expect(screen.getByTestId('session-card-sch-week-01')).toBeDefined()
        expect(screen.getByTestId('session-card-sch-next-01')).toBeDefined()
        expect(screen.getByTestId('session-card-sch-week-03')).toBeDefined()
    })

    it('hiển thị đúng liên kết học trực tuyến cho buổi online và phòng học cho buổi offline (AC 1 & 2)', async () => {
        render(
            <MemoryRouter>
                <StudentSchedulePage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-join-next-meeting')).toBeDefined()
        })

        // Nút vào học trực tuyến ở card hero
        const joinLink = screen.getByTestId('btn-join-next-meeting') as HTMLAnchorElement
        expect(joinLink.href).toContain('meet.google.com/ictu-react-class')
        expect(joinLink.target).toBe('_blank')

        // Thẻ buổi học 1 là phòng vật lý P201
        expect(screen.getByTestId('badge-room-sch-week-01').textContent).toContain('P201')
    })

    it('hiển thị cảnh báo và lý do hủy đối với buổi học đã bị hủy (SCRUM-226 & SCRUM-228)', async () => {
        render(
            <MemoryRouter>
                <StudentSchedulePage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('card-cancelled-sch-week-03')).toBeDefined()
        })

        const cancelAlert = screen.getByTestId('card-cancelled-sch-week-03')
        expect(cancelAlert.textContent).toContain('Đã hủy buổi học')
        expect(cancelAlert.textContent).toContain('Phòng Lab 3 bảo trì máy tính')
    })

    it('cho phép điều hướng tuần trước, tuần sau và trở về tuần này', async () => {
        render(
            <MemoryRouter>
                <StudentSchedulePage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('period-title')).toBeDefined()
        })

        const initialTitle = screen.getByTestId('period-title').textContent

        // Bấm Tuần sau →
        fireEvent.click(screen.getByTestId('btn-next-week'))
        await waitFor(() => {
            expect(screen.getByTestId('period-title').textContent).not.toEqual(initialTitle)
        })

        // Bấm Tuần trước ←
        fireEvent.click(screen.getByTestId('btn-prev-week'))
        await waitFor(() => {
            expect(screen.getByTestId('period-title').textContent).toEqual(initialTitle)
        })

        // Bấm Tuần này
        fireEvent.click(screen.getByTestId('btn-current-week'))
        expect(screen.getByTestId('period-title')).toBeDefined()
    })

    it('hiển thị trạng thái rỗng khi chưa có lớp hoặc chưa có lịch học trong tuần', async () => {
        mockRequest.mockImplementationOnce(() =>
            Promise.resolve(
                makeMockResponse({
                    code: 'MY_SCHEDULE_RETRIEVED',
                    data: {
                        student: mockStudent,
                        enrolled_classes: [],
                        next_session: null,
                        week_sessions: [],
                        total_week_sessions: 0,
                        date_from: '2026-10-12',
                        date_to: '2026-10-18',
                        period_title: 'Tuần từ 12/10/2026 đến 18/10/2026',
                    },
                })
            )
        )

        render(
            <MemoryRouter>
                <StudentSchedulePage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('no-enrollments-state')).toBeDefined()
        })

        expect(screen.getByText(/Chưa có lớp học nào được ghi danh/)).toBeDefined()
    })

    it('hiển thị trạng thái chưa liên kết hồ sơ học viên khi profile_linked là false hoặc student là null (SCRUM-228 Requirement 5)', async () => {
        mockRequest.mockImplementationOnce(() =>
            Promise.resolve(
                makeMockResponse({
                    code: 'MY_SCHEDULE_RETRIEVED',
                    data: {
                        user_type: 'trainee',
                        profile_linked: false,
                        student: null,
                        enrolled_classes: [],
                        next_session: null,
                        week_sessions: [],
                        total_week_sessions: 0,
                        date_from: '2026-10-12',
                        date_to: '2026-10-18',
                        period_title: 'Tuần từ 12/10/2026 đến 18/10/2026',
                    },
                })
            )
        )

        render(
            <MemoryRouter>
                <StudentSchedulePage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('unlinked-profile-state')).toBeDefined()
        })

        expect(screen.getByText(/Tài khoản chưa được liên kết hồ sơ học viên/)).toBeDefined()
        // Không được hiển thị sai thành "Chưa có lớp học nào được ghi danh"
        expect(screen.queryByTestId('no-enrollments-state')).toBeNull()
    })

    it('hiển thị trạng thái không có quyền (403) khi tài khoản quản trị truy cập nhầm và có nút đến Thời khóa biểu (SCRUM-228 Requirement 5)', async () => {
        mockRequest.mockImplementationOnce(() =>
            Promise.reject({
                status: 403,
                code: 'FORBIDDEN',
                message: 'Tài khoản quản trị không sử dụng lịch cá nhân. Vui lòng truy cập trang Thời khóa biểu.',
            })
        )

        render(
            <MemoryRouter>
                <StudentSchedulePage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('schedule-forbidden-state')).toBeDefined()
        })

        expect(screen.getByText(/Không có quyền truy cập lịch học cá nhân/)).toBeDefined()
        expect(screen.getByText(/Đến Thời khóa biểu/)).toBeDefined()
        // Tuyệt đối không biến lỗi 403 thành "Chưa có lớp học nào được ghi danh"
        expect(screen.queryByTestId('no-enrollments-state')).toBeNull()
        expect(screen.queryByTestId('unlinked-profile-state')).toBeNull()
    })

    it('hiển thị giao diện Lịch giảng dạy của tôi đối với tài khoản Giảng viên (SCRUM-228 Requirement 2 & 3)', async () => {
        mockRequest.mockImplementationOnce(() =>
            Promise.resolve(
                makeMockResponse({
                    code: 'MY_SCHEDULE_RETRIEVED',
                    data: {
                        user_type: 'trainer',
                        profile_linked: true,
                        student: null,
                        instructor: {
                            id: 'u-trainer-01',
                            full_name: 'TS. Nguyễn Văn Giảng Viên',
                            email: 'giangvien@ictu.edu.vn',
                        },
                        assigned_classes: [
                            { class_id: 'cls-101', class_code: 'CNTT-K21A', program_name: 'CNTT' }
                        ],
                        enrolled_classes: [
                            { class_id: 'cls-101', class_code: 'CNTT-K21A', program_name: 'CNTT' }
                        ],
                        next_session: mockNextSession,
                        week_sessions: [mockNextSession],
                        total_week_sessions: 1,
                        date_from: '2026-10-12',
                        date_to: '2026-10-18',
                        period_title: 'Tuần từ 12/10/2026 đến 18/10/2026',
                    },
                })
            )
        )

        render(
            <MemoryRouter>
                <StudentSchedulePage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByText('Lịch giảng dạy của tôi')).toBeDefined()
        })

        expect(screen.getByTestId('trainer-profile-pill')).toBeDefined()
        expect(screen.getByText(/TS. Nguyễn Văn Giảng Viên/)).toBeDefined()
        expect(screen.queryByTestId('no-enrollments-state')).toBeNull()
    })

    it('hiển thị bộ chuyển đổi ngữ cảnh (Context Switcher) khi tài khoản có cả vai trò trainer + trainee', async () => {
        mockRequest.mockImplementationOnce(() =>
            Promise.resolve(
                makeMockResponse({
                    code: 'MY_SCHEDULE_RETRIEVED',
                    data: {
                        user_type: 'trainee',
                        active_context: 'learning',
                        available_contexts: ['learning', 'teaching'],
                        profile_linked: true,
                        student: mockStudent,
                        enrolled_classes: mockEnrolledClasses,
                        next_session: mockNextSession,
                        week_sessions: mockWeekSessions,
                        total_week_sessions: 1,
                        date_from: '2026-10-12',
                        date_to: '2026-10-18',
                    },
                })
            )
        )

        render(
            <MemoryRouter>
                <StudentSchedulePage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('schedule-context-switcher')).toBeDefined()
        })

        expect(screen.getByTestId('switch-context-learning')).toBeDefined()
        expect(screen.getByTestId('switch-context-teaching')).toBeDefined()
        expect(screen.getByTestId('switch-context-learning').className).toContain('btn-primary')
    })

    it('phân biệt rõ trạng thái chưa phân công (not_assigned) với đã phân công nhưng chưa có lịch (assigned_no_schedule)', async () => {
        // TH1: not_assigned
        mockRequest.mockImplementationOnce(() =>
            Promise.resolve(
                makeMockResponse({
                    code: 'MY_SCHEDULE_RETRIEVED',
                    data: {
                        user_type: 'trainer',
                        active_context: 'teaching',
                        available_contexts: ['teaching'],
                        assignment_status: 'not_assigned',
                        profile_linked: true,
                        instructor: { id: 'u-trainer-01', full_name: 'TS. Giảng Viên' },
                        assigned_classes: [],
                        enrolled_classes: [],
                        next_session: null,
                        week_sessions: [],
                        total_week_sessions: 0,
                    },
                })
            )
        )

        const { unmount } = render(
            <MemoryRouter>
                <StudentSchedulePage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('no-assigned-classes-state')).toBeDefined()
        })
        expect(screen.getByText('Chưa có lịch phân công giảng dạy')).toBeDefined()

        unmount()

        // TH2: assigned_no_schedule
        mockRequest.mockImplementationOnce(() =>
            Promise.resolve(
                makeMockResponse({
                    code: 'MY_SCHEDULE_RETRIEVED',
                    data: {
                        user_type: 'trainer',
                        active_context: 'teaching',
                        available_contexts: ['teaching'],
                        assignment_status: 'assigned_no_schedule',
                        profile_linked: true,
                        instructor: { id: 'u-trainer-01', full_name: 'TS. Giảng Viên' },
                        assigned_classes: [{ class_id: 'cls-101', class_code: 'CNTT-K21A' }],
                        enrolled_classes: [{ class_id: 'cls-101', class_code: 'CNTT-K21A' }],
                        next_session: null,
                        week_sessions: [],
                        total_week_sessions: 0,
                    },
                })
            )
        )

        render(
            <MemoryRouter>
                <StudentSchedulePage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('assigned-no-sessions-state')).toBeDefined()
        })
        expect(screen.getByText('Chưa có buổi dạy nào trong tuần này')).toBeDefined()
        expect(screen.getByText(/Bạn đã được phân công/)).toBeDefined()
    })

    it('hiển thị nhãn vai trò giảng dạy (Trợ giảng, Dạy thay) trên thẻ buổi học của Giảng viên', async () => {
        const assistantSession = {
            ...mockNextSession,
            teaching_role: 'assistant',
            teaching_role_label: 'Trợ giảng',
        }

        mockRequest.mockImplementationOnce(() =>
            Promise.resolve(
                makeMockResponse({
                    code: 'MY_SCHEDULE_RETRIEVED',
                    data: {
                        user_type: 'trainer',
                        active_context: 'teaching',
                        available_contexts: ['teaching'],
                        assignment_status: 'has_schedule',
                        profile_linked: true,
                        instructor: { id: 'u-trainer-assistant', full_name: 'ThS. Trợ Giảng' },
                        assigned_classes: [{ class_id: 'cls-101', class_code: 'CNTT-K21A' }],
                        enrolled_classes: [{ class_id: 'cls-101', class_code: 'CNTT-K21A' }],
                        next_session: assistantSession,
                        week_sessions: [assistantSession],
                        total_week_sessions: 1,
                    },
                })
            )
        )

        render(
            <MemoryRouter>
                <StudentSchedulePage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('next-session-hero')).toBeDefined()
        })

        // Phải có nhãn Trợ giảng
        const assistantBadges = screen.getAllByText('Trợ giảng')
        expect(assistantBadges.length).toBeGreaterThan(0)
    })
})
