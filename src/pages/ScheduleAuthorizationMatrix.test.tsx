// @vitest-environment jsdom
/**
 * Test Matrix Phân Quyền Lịch ICTU (SCRUM-228 & RBAC):
 * - Admin chỉ có vai trò quản trị: chỉ thấy Thời khóa biểu (/schedules), không thấy Lịch học của tôi (/my-schedule).
 * - Quản lý đào tạo: chỉ thấy Thời khóa biểu (/schedules), không thấy Lịch học của tôi.
 * - Giảng viên: thấy Thời khóa biểu và Lịch giảng dạy của tôi.
 * - Học viên: thấy Lịch học của tôi, không thấy Thời khóa biểu quản trị.
 * - Tài khoản nhiều vai trò (Admin + Trainee): thấy cả hai và xem được lịch học cá nhân.
 * - Trạng thái giao diện phân biệt rõ: không có quyền, chưa liên kết hồ sơ, chưa ghi danh, chưa có lịch.
 */

import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { Sidebar } from '../navigation/Sidebar'
import { RequirePermission } from '../auth/RequirePermission'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { StudentSchedulePage } from './StudentSchedulePage'
import * as scheduleApi from '../api/scheduleApi'
import { useEffect } from 'react'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

function LocationDisplay() {
    const loc = useLocation()
    return <div data-testid="current-location">{loc.pathname}</div>
}

function TestAppWrapper({
    role,
    roles,
    permissions,
    children,
}: {
    role?: string | null
    roles?: string[] | null
    permissions?: string[] | null
    children?: React.ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        startSession(
            { accessToken: 'test-token', refreshToken: 'test-refresh' },
            role,
            'user-id-test',
            false,
            'Test User',
            'test@ictu.edu.vn',
            roles ?? (role ? [role] : []),
            permissions,
        )
    }, [role, roles, permissions, startSession])

    if (!hasSession) {
        return <div>Initializing test session...</div>
    }

    return (
        <>
            <LocationDisplay />
            {children}
        </>
    )
}

describe('SCRUM-228: Test Matrix Phân Quyền Lịch Hệ Thống ICTU', () => {
    it('1. Admin chỉ có vai trò quản trị: thấy "Thời khóa biểu", KHÔNG thấy "Lịch học của tôi"', async () => {
        render(
            <MemoryRouter initialEntries={['/schedules']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TestAppWrapper role="admin">
                        <Sidebar />
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('menu-item-schedules_calendar')).toBeDefined()
        })
        expect(screen.getByTestId('menu-item-schedules_calendar').textContent).toContain('Thời khóa biểu')
        expect(screen.queryByTestId('menu-item-my_schedule')).toBeNull()
        expect(screen.queryByTestId('menu-item-sessions')).toBeNull()
    })

    it('2. Quản lý đào tạo (training_manager): thấy "Thời khóa biểu" và "Quản lý buổi học", KHÔNG thấy "Lịch học của tôi"', async () => {
        render(
            <MemoryRouter initialEntries={['/schedules']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TestAppWrapper role="training_manager">
                        <Sidebar />
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('menu-item-schedules_calendar')).toBeDefined()
        })
        expect(screen.getByTestId('menu-item-schedules_calendar').textContent).toContain('Thời khóa biểu')
        expect(screen.getByTestId('menu-item-sessions')).toBeDefined()
        expect(screen.queryByTestId('menu-item-my_schedule')).toBeNull()
    })

    it('3. Giảng viên (trainer): thấy "Thời khóa biểu" và menu lịch cá nhân đổi tên thành "Lịch giảng dạy của tôi"', async () => {
        render(
            <MemoryRouter initialEntries={['/trainer']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TestAppWrapper role="trainer">
                        <Sidebar />
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('menu-item-schedules_calendar')).toBeDefined()
        })
        expect(screen.getByTestId('menu-item-my_schedule')).toBeDefined()
        expect(screen.getByTestId('menu-item-my_schedule').textContent).toContain('Lịch giảng dạy của tôi')
    })

    it('4. Học viên (trainee): thấy "Lịch học của tôi", KHÔNG thấy "Thời khóa biểu" quản lý', async () => {
        render(
            <MemoryRouter initialEntries={['/my-schedule']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TestAppWrapper role="trainee">
                        <Sidebar />
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('menu-item-my_schedule')).toBeDefined()
        })
        expect(screen.getByTestId('menu-item-my_schedule').textContent).toContain('Lịch học của tôi')
        expect(screen.queryByTestId('menu-item-schedules_calendar')).toBeNull()
    })

    it('5. Tài khoản nhiều vai trò (Admin + Trainee): thấy cả "Thời khóa biểu" và "Lịch học của tôi"', async () => {
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TestAppWrapper role="admin" roles={['admin', 'trainee']}>
                        <Sidebar />
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('menu-item-schedules_calendar')).toBeDefined()
        })
        expect(screen.getByTestId('menu-item-my_schedule')).toBeDefined()
        expect(screen.getByTestId('menu-item-my_schedule').textContent).toContain('Lịch học của tôi')
    })

    it('6. Admin truy cập URL trực tiếp /my-schedule được Route Guard chuyển hướng về /schedules mà không gây lặp', async () => {
        render(
            <MemoryRouter initialEntries={['/my-schedule']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TestAppWrapper role="admin">
                        <Routes>
                            <Route
                                element={
                                    <RequirePermission
                                        requiredPermission={SYSTEM_PERMISSIONS.SCHEDULE_PERSONAL_VIEW}
                                        fallbackPath="/schedules"
                                    />
                                }
                            >
                                <Route path="/my-schedule" element={<div data-testid="page-my-schedule">My Schedule Page</div>} />
                            </Route>
                            <Route path="/schedules" element={<div data-testid="page-schedules">Schedules Timetable Page</div>} />
                        </Routes>
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('page-schedules')).toBeDefined()
        })
        expect(screen.getByTestId('current-location').textContent).toBe('/schedules')
        expect(screen.queryByTestId('page-my-schedule')).toBeNull()
    })

    it('7. Multi-role Admin + Trainee truy cập URL /my-schedule được phép xem lịch học', async () => {
        render(
            <MemoryRouter initialEntries={['/my-schedule']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TestAppWrapper role="admin" roles={['admin', 'trainee']}>
                        <Routes>
                            <Route
                                element={
                                    <RequirePermission
                                        requiredPermission={SYSTEM_PERMISSIONS.SCHEDULE_PERSONAL_VIEW}
                                        fallbackPath="/schedules"
                                    />
                                }
                            >
                                <Route path="/my-schedule" element={<div data-testid="page-my-schedule">My Schedule Page</div>} />
                            </Route>
                            <Route path="/schedules" element={<div data-testid="page-schedules">Schedules Timetable Page</div>} />
                        </Routes>
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('page-my-schedule')).toBeDefined()
        })
        expect(screen.getByTestId('current-location').textContent).toBe('/my-schedule')
    })

    it('8. Multi-role Admin + Training Manager: thấy cả "Quản lý Người dùng", "Quản lý buổi học" và "Thời khóa biểu"', async () => {
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TestAppWrapper role="admin" roles={['admin', 'training_manager']}>
                        <Sidebar />
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('menu-item-schedules_calendar')).toBeDefined()
        })
        expect(screen.getByTestId('menu-item-users')).toBeDefined()
        expect(screen.getByTestId('menu-item-sessions')).toBeDefined()
        expect(screen.getByTestId('menu-item-schedules_calendar')).toBeDefined()
        // Admin + Training Manager thuần túy vẫn không thấy Lịch cá nhân
        expect(screen.queryByTestId('menu-item-my_schedule')).toBeNull()
    })

    it('9. Admin thuần túy dù có permissions chứa schedule.personal_view vẫn KHÔNG thấy menu lịch cá nhân', async () => {
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TestAppWrapper
                        role="admin"
                        roles={['admin']}
                        permissions={['schedule.view', 'schedule.personal_view']}
                    >
                        <Sidebar />
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('menu-item-schedules_calendar')).toBeDefined()
        })
        // Tuyệt đối không hiển thị "Lịch học của tôi"
        expect(screen.queryByTestId('menu-item-my_schedule')).toBeNull()
    })

    it('10. Multi-role có vai trò Giảng viên (Trainer) thấy "Lịch giảng dạy của tôi" nếu không có Trainee', async () => {
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TestAppWrapper role="admin" roles={['admin', 'trainer']}>
                        <Sidebar />
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('menu-item-my_schedule')).toBeDefined()
        })
        expect(screen.getByTestId('menu-item-my_schedule').textContent).toContain('Lịch giảng dạy của tôi')
    })

    it('11. Giảng viên xem Lịch giảng dạy thấy liên kết điểm danh buổi học theo đúng quyền SCRUM-254', async () => {
        vi.spyOn(scheduleApi, 'getMyPersonalSchedule').mockResolvedValue({
            user_type: 'trainer',
            active_context: 'teaching',
            available_contexts: ['teaching'],
            assignment_status: 'has_schedule',
            profile_linked: true,
            student: null,
            instructor: {
                id: 'inst-01',
                full_name: 'ThS. Trần Giảng Viên',
                email: 'gv@ictu.edu.vn',
            },
            assigned_classes: [{ class_id: 'cls-101', class_code: 'CNTT-K21' }],
            enrolled_classes: [],
            next_session: {
                id: 'sch-next-01',
                class_id: 'cls-101',
                class_code: 'CNTT-K21',
                session_number: 1,
                topic: 'Buổi 1: Giới thiệu môn học',
                learning_date: '2026-10-19',
                day_of_week: 'Thứ 2',
                start_time: '08:00:00',
                end_time: '11:30:00',
                is_online: false,
                status: 'scheduled',
                attendance_checked: false,
                teaching_role: 'main',
                teaching_role_label: 'Giảng viên chính',
            },
            week_sessions: [
                {
                    id: 'sch-week-01',
                    class_id: 'cls-101',
                    class_code: 'CNTT-K21',
                    session_number: 1,
                    topic: 'Buổi 1: Giới thiệu môn học',
                    learning_date: '2026-10-19',
                    day_of_week: 'Thứ 2',
                    start_time: '08:00:00',
                    end_time: '11:30:00',
                    is_online: false,
                    status: 'scheduled',
                    attendance_checked: false,
                    teaching_role: 'main',
                    teaching_role_label: 'Giảng viên chính',
                },
            ],
            total_week_sessions: 1,
            date_from: '2026-10-19',
            date_to: '2026-10-25',
            period_title: 'Tuần 19/10/2026 - 25/10/2026',
        })

        render(
            <MemoryRouter initialEntries={['/my-schedule']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TestAppWrapper role="trainer" roles={['trainer']}>
                        <StudentSchedulePage />
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('student-schedule-page')).toBeDefined()
        })

        // Nút điểm danh trên thẻ tuần
        const attendanceBtn = screen.getByTestId('btn-attendance-sch-week-01')
        expect(attendanceBtn).toBeDefined()
        expect(attendanceBtn.getAttribute('href')).toBe('/classes/cls-101/schedules/sch-week-01/attendance')

        // Nút điểm danh trên hero buổi tiếp theo
        const heroAttendanceBtn = screen.getByTestId('hero-btn-attendance')
        expect(heroAttendanceBtn).toBeDefined()
        expect(heroAttendanceBtn.getAttribute('href')).toBe('/classes/cls-101/schedules/sch-next-01/attendance')
    })

    it('12. Tài khoản không có quyền schedule.view khi bị từ chối 403 KHÔNG thấy nút Đến Thời khóa biểu', async () => {
        vi.spyOn(scheduleApi, 'getMyPersonalSchedule').mockRejectedValue({
            status: 403,
            code: 'FORBIDDEN',
            message: 'Không có quyền truy cập.',
        })

        render(
            <MemoryRouter initialEntries={['/my-schedule']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TestAppWrapper role="consultant" roles={['consultant']} permissions={['course.view']}>
                        <StudentSchedulePage />
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('schedule-forbidden-state')).toBeDefined()
        })

        // Nút đến thời khóa biểu bị ẩn vì không có quyền schedule.view
        expect(screen.queryByTestId('btn-forbidden-schedules')).toBeNull()
        // Nút về trang chủ xuất hiện đúng đường dẫn vai trò tư vấn (/leads)
        const homeBtn = screen.getByTestId('btn-forbidden-home')
        expect(homeBtn).toBeDefined()
        expect(homeBtn.getAttribute('href')).toBe('/leads')
    })

    it('13. Đổi tài khoản từ Trainee sang Admin không lưu vết menu Lịch học của tôi', async () => {
        function SwitchUserApp() {
            const { startSession, logout } = useSession()
            return (
                <div>
                    <Sidebar />
                    <button
                        type="button"
                        data-testid="btn-login-trainee"
                        onClick={() =>
                            startSession(
                                { accessToken: 'tok-1', refreshToken: 'ref-1' },
                                'trainee',
                                'u-1',
                                false,
                                'Học viên A',
                                'hva@ictu.edu.vn',
                                ['trainee'],
                                ['schedule.personal_view'],
                            )
                        }
                    >
                        Login Trainee
                    </button>
                    <button
                        type="button"
                        data-testid="btn-login-admin"
                        onClick={async () => {
                            await logout()
                            startSession(
                                { accessToken: 'tok-2', refreshToken: 'ref-2' },
                                'admin',
                                'u-2',
                                false,
                                'Minh Trang',
                                'admin@ictu.edu.vn',
                                ['admin'],
                                ['user.view', 'course.view', 'schedule.view'],
                            )
                        }}
                    >
                        Login Admin
                    </button>
                </div>
            )
        }

        render(
            <MemoryRouter initialEntries={['/']}>
                <SessionProvider apiOrigin="http://localhost:5000" autoRestore={false}>
                    <SwitchUserApp />
                </SessionProvider>
            </MemoryRouter>,
        )

        // 1. Đăng nhập Trainee
        screen.getByTestId('btn-login-trainee').click()
        await waitFor(() => {
            expect(screen.getByTestId('menu-item-my_schedule')).toBeDefined()
        })
        expect(screen.getByTestId('menu-item-my_schedule').textContent).toContain('Lịch học của tôi')

        // 2. Chuyển sang Admin
        screen.getByTestId('btn-login-admin').click()
        await waitFor(() => {
            expect(screen.queryByTestId('menu-item-my_schedule')).toBeNull()
            expect(screen.getByTestId('menu-item-schedules_calendar')).toBeDefined()
        })
    })
})
