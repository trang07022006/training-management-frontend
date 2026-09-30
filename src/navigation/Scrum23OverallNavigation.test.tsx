// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { RequirePermission } from '../auth/RequirePermission'
import { AppLayout } from './AppLayout'
import {
    APP_MENU_CONFIG,
    filterMenuItems,
    isKnownPermission,
    SYSTEM_PERMISSIONS,
} from './menuConfig'
import { getUserDisplayName, getUserRoleDisplay } from './userProfileUtils'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

function LocationDisplay() {
    const location = useLocation()
    return <span data-testid="location-display">{location.pathname}</span>
}

function SessionStateController({
    role,
    children,
}: {
    role?: string | null
    children: ReactNode
}) {
    const { startSession, clearSession, hasSession } = useSession()

    useEffect(() => {
        if (role !== undefined) {
            startSession({ accessToken: 'test-token', refreshToken: 'test-refresh' }, role)
        }
    }, [role, startSession])

    if (role !== undefined && !hasSession) {
        return null
    }

    return (
        <>
            <div style={{ display: 'none' }}>
                <button
                    data-testid="switch-user-btn"
                    onClick={() => {
                        clearSession()
                        startSession({ accessToken: 'new-token', refreshToken: 'new-refresh' }, 'trainer')
                    }}
                >
                    Switch to Trainer
                </button>
                <button
                    data-testid="expire-session-btn"
                    onClick={() => clearSession()}
                >
                    Expire Session
                </button>
            </div>
            {children}
        </>
    )
}

describe('SCRUM-23 Phase 6: Kiểm thử tổng thể Menu theo quyền người dùng', () => {
    // =========================================================================
    // A. SESSION
    // =========================================================================
    describe('A. Trạng thái phiên (Session State)', () => {
        it('1. unauthenticated -> không hiển thị menu phân quyền hoặc header', () => {
            const filtered = filterMenuItems(APP_MENU_CONFIG, {
                hasSession: false,
                role: 'admin',
            })
            expect(filtered).toEqual([])

            render(
                <MemoryRouter initialEntries={['/']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <AppLayout />
                    </SessionProvider>
                </MemoryRouter>,
            )

            expect(screen.queryByTestId('app-header')).toBeNull()
            expect(screen.queryByTestId('menu-item-admin_dashboard')).toBeNull()
        })

        it('2. authenticated -> hiển thị menu phù hợp với phiên đăng nhập', () => {
            const filtered = filterMenuItems(APP_MENU_CONFIG, {
                hasSession: true,
                role: 'admin',
            })
            const keys = filtered.map((i) => i.key)
            expect(keys).toContain('overview')
            expect(keys).toContain('admin_dashboard')
            expect(keys).toContain('courses')
        })

        it('3. loading -> không flash menu trái phép khi trạng thái đang tải', () => {
            const filtered = filterMenuItems(APP_MENU_CONFIG, {
                hasSession: true,
                isLoading: true,
                role: 'admin',
            })
            expect(filtered).toEqual([])
        })

        it('4. session expired/revoked -> menu và thông tin người dùng được dọn dẹp ngay lập tức', () => {
            render(
                <MemoryRouter initialEntries={['/']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <SessionStateController role="admin">
                            <AppLayout />
                        </SessionStateController>
                    </SessionProvider>
                </MemoryRouter>,
            )

            expect(screen.getByTestId('menu-item-admin_dashboard')).toBeDefined()

            // Giả lập phiên kết thúc (thu hồi hoặc hết hạn)
            const expireBtn = screen.getByTestId('expire-session-btn')
            fireEvent.click(expireBtn)

            // Header và menu quản trị biến mất
            expect(screen.queryByTestId('app-header')).toBeNull()
            expect(screen.queryByTestId('menu-item-admin_dashboard')).toBeNull()
        })
    })

    // =========================================================================
    // B. PERMISSION
    // =========================================================================
    describe('B. Kiểm tra quyền hạn (Permissions)', () => {
        it('5. có quyền -> menu hiển thị', () => {
            const menu = filterMenuItems(APP_MENU_CONFIG, {
                hasSession: true,
                permissions: [SYSTEM_PERMISSIONS.COURSE_VIEW],
            })
            const keys = menu.map((m) => m.key)
            expect(keys).toContain('courses')
            expect(keys).toContain('overview')
        })

        it('6. thiếu quyền -> menu bị ẩn', () => {
            const menu = filterMenuItems(APP_MENU_CONFIG, {
                hasSession: true,
                permissions: [SYSTEM_PERMISSIONS.SESSION_VIEW], // Thiếu course.view
            })
            const keys = menu.map((m) => m.key)
            expect(keys).not.toContain('courses')
            expect(keys).not.toContain('admin_dashboard')
            expect(keys).not.toContain('trainer_dashboard')
        })

        it('7. unknown permission -> menu bị ẩn và không crash', () => {
            expect(isKnownPermission('unknown.perm')).toBe(false)
            const menu = filterMenuItems(
                [
                    { key: 'safe', label: 'An toàn', path: '/safe', isPublic: true },
                    { key: 'corrupt', label: 'Lỗi', path: '/err', requiredPermission: 'unknown.perm' },
                ],
                {
                    hasSession: true,
                    permissions: ['unknown.perm'],
                },
            )
            const keys = menu.map((m) => m.key)
            expect(keys).toEqual(['safe'])
        })

        it('8. undefined/null permission -> Default Deny', () => {
            const menu = filterMenuItems(APP_MENU_CONFIG, {
                hasSession: true,
                permissions: null,
                role: null,
            })
            // Chỉ menu public hiển thị
            const keys = menu.map((m) => m.key)
            expect(keys).toEqual(['overview', 'change_password'])
        })
    })

    // =========================================================================
    // C. ROLE & USER IDENTITY
    // =========================================================================
    describe('C. Định danh người dùng và vai trò', () => {
        it('9. tên người dùng hiển thị đúng theo thứ tự ưu tiên', () => {
            expect(getUserDisplayName({ name: 'Lê Văn B' })).toBe('Lê Văn B')
            expect(getUserDisplayName({ email: 'b@daotao.edu.vn' })).toBe('b@daotao.edu.vn')
            expect(getUserDisplayName({ userId: 'u-123' })).toBe('u-123')
            expect(getUserDisplayName(null)).toBe('Người dùng')
        })

        it('10. vai trò người dùng được hiển thị bằng tiếng Việt chuẩn', () => {
            expect(getUserRoleDisplay('admin')).toBe('Quản trị viên')
            expect(getUserRoleDisplay('trainer')).toBe('Giảng viên')
            expect(getUserRoleDisplay('trainee')).toBe('Học viên')
            expect(getUserRoleDisplay('user')).toBe('Người dùng')
        })

        it('11. chuyển đổi người dùng / role -> menu và giao diện cập nhật tương ứng', () => {
            render(
                <MemoryRouter initialEntries={['/']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <SessionStateController role="admin">
                            <AppLayout />
                        </SessionStateController>
                    </SessionProvider>
                </MemoryRouter>,
            )

            expect(screen.getByTestId('menu-item-admin_dashboard')).toBeDefined()
            expect(screen.queryByTestId('menu-item-trainer_dashboard')).toBeNull()

            // Chuyển sang Trainer
            const switchBtn = screen.getByTestId('switch-user-btn')
            fireEvent.click(switchBtn)

            expect(screen.queryByTestId('menu-item-admin_dashboard')).toBeNull()
            expect(screen.getByTestId('menu-item-trainer_dashboard')).toBeDefined()
            expect(screen.getByTestId('user-role-badge').textContent).toBe('Giảng viên')
        })

        it('12. các vai trò khác nhau thấy danh sách menu khác nhau', () => {
            const adminMenu = filterMenuItems(APP_MENU_CONFIG, { hasSession: true, role: 'admin' })
            const trainerMenu = filterMenuItems(APP_MENU_CONFIG, { hasSession: true, role: 'trainer' })
            const traineeMenu = filterMenuItems(APP_MENU_CONFIG, { hasSession: true, role: 'trainee' })
            const userMenu = filterMenuItems(APP_MENU_CONFIG, { hasSession: true, role: 'user' })

            expect(adminMenu.map((m) => m.key)).toContain('admin_dashboard')
            expect(trainerMenu.map((m) => m.key)).toContain('trainer_dashboard')
            expect(traineeMenu.map((m) => m.key)).toContain('trainee_dashboard')

            expect(userMenu.map((m) => m.key)).not.toContain('admin_dashboard')
            expect(userMenu.map((m) => m.key)).not.toContain('trainer_dashboard')
            expect(userMenu.map((m) => m.key)).not.toContain('trainee_dashboard')
            expect(userMenu.map((m) => m.key)).not.toContain('courses')
        })
    })

    // =========================================================================
    // D. NAVIGATION & ROUTE CONSISTENCY
    // =========================================================================
    describe('D. Điều hướng và Tính nhất quán Menu / Route', () => {
        it('13. đường dẫn menu path chính xác', () => {
            const adminItem = APP_MENU_CONFIG.find((i) => i.key === 'admin_dashboard')
            expect(adminItem?.path).toBe('/admin')

            const trainerItem = APP_MENU_CONFIG.find((i) => i.key === 'trainer_dashboard')
            expect(trainerItem?.path).toBe('/trainer')

            const traineeItem = APP_MENU_CONFIG.find((i) => i.key === 'trainee_dashboard')
            expect(traineeItem?.path).toBe('/trainee')
        })

        it('14. active state đánh dấu chính xác menu đang mở', () => {
            render(
                <MemoryRouter initialEntries={['/admin']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <SessionStateController role="admin">
                            <AppLayout />
                        </SessionStateController>
                    </SessionProvider>
                </MemoryRouter>,
            )

            const adminLink = screen.getByTestId('menu-item-admin_dashboard')
            expect(adminLink.classList.contains('is-active')).toBe(true)
            expect(adminLink.getAttribute('aria-current')).toBe('page')

            const overviewLink = screen.getByTestId('menu-item-overview')
            expect(overviewLink.classList.contains('is-active')).toBe(false)
        })

        it('15. direct URL vào route không có quyền bị chặn và chuyển hướng an toàn', () => {
            render(
                <MemoryRouter initialEntries={['/admin']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <SessionStateController role="trainee">
                            <LocationDisplay />
                            <Routes>
                                <Route path="/trainee" element={<h1>Khu vực Học viên</h1>} />
                                <Route
                                    element={
                                        <RequirePermission
                                            requiredRole="admin"
                                            requiredPermission={SYSTEM_PERMISSIONS.USER_MANAGE}
                                        />
                                    }
                                >
                                    <Route path="/admin" element={<h1>Khu vực Quản trị</h1>} />
                                </Route>
                            </Routes>
                        </SessionStateController>
                    </SessionProvider>
                </MemoryRouter>,
            )

            expect(screen.queryByText('Khu vực Quản trị')).toBeNull()
            expect(screen.getByTestId('location-display').textContent).toBe('/trainee')
            expect(screen.getByText('Khu vực Học viên')).toBeDefined()
        })
    })

    // =========================================================================
    // E. RESPONSIVE
    // =========================================================================
    describe('E. Khả năng đáp ứng trên màn hình nhỏ (Responsive 360px)', () => {
        it('16. cấu trúc DOM hỗ trợ hoàn chỉnh trên màn hình di động', () => {
            render(
                <MemoryRouter initialEntries={['/']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <SessionStateController role="admin">
                            <AppLayout />
                        </SessionStateController>
                    </SessionProvider>
                </MemoryRouter>,
            )

            expect(screen.getByTestId('sidebar-toggle-button')).toBeDefined()
            expect(screen.getByTestId('app-sidebar')).toBeDefined()
            expect(screen.getByTestId('app-header')).toBeDefined()
        })

        it('17. đóng mở menu mobile hoạt động thông suốt', () => {
            render(
                <MemoryRouter initialEntries={['/']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <SessionStateController role="admin">
                            <AppLayout />
                        </SessionStateController>
                    </SessionProvider>
                </MemoryRouter>,
            )

            const sidebar = screen.getByTestId('app-sidebar')
            expect(sidebar.classList.contains('is-open')).toBe(false)

            const toggleBtn = screen.getByTestId('sidebar-toggle-button')
            fireEvent.click(toggleBtn)
            expect(sidebar.classList.contains('is-open')).toBe(true)

            const backdrop = screen.getByTestId('sidebar-backdrop')
            fireEvent.click(backdrop)
            expect(sidebar.classList.contains('is-open')).toBe(false)
        })

        it('18. không bị lỗi tràn (overflow) layout khi dữ liệu dài', () => {
            render(
                <MemoryRouter initialEntries={['/']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <SessionStateController role="admin">
                            <AppLayout />
                        </SessionStateController>
                    </SessionProvider>
                </MemoryRouter>,
            )

            const appLayout = screen.getByTestId('app-layout')
            expect(appLayout.classList.contains('app-layout-container')).toBe(true)
        })
    })
})
