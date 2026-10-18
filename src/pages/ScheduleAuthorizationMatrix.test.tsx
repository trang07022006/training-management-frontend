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
    })
})
