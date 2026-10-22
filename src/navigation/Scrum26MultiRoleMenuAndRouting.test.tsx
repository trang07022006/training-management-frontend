// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { useEffect, type ReactNode } from 'react'

import {
    APP_MENU_CONFIG,
    filterMenuItems,
    getRolePermissions,
    SYSTEM_PERMISSIONS,
} from './menuConfig'
import { RequirePermission } from '../auth/RequirePermission'
import { SessionProvider, useSession } from '../auth/SessionProvider'

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

function LocationDisplay() {
    const location = useLocation()
    return <span data-testid="location-display">{location.pathname}</span>
}

function MultiRoleTestAppWrapper({
    role,
    roles,
    permissions,
    children,
}: {
    role?: string | null
    roles?: string[]
    permissions?: string[]
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()

    useEffect(() => {
        if (role !== undefined || roles !== undefined) {
            startSession(
                { accessToken: 'test-acc-multi', refreshToken: 'test-ref-multi' },
                role ?? (roles?.[0] ?? null),
                'user-multi-123',
                false,
                'Học viên Test ICTU',
                'dtc245200753@ictu.edu.vn',
                roles,
                permissions,
            )
        }
    }, [role, roles, permissions, startSession])

    if (!hasSession && (role !== undefined || roles !== undefined)) {
        return <div>Initializing session...</div>
    }

    return (
        <>
            <LocationDisplay />
            {children}
        </>
    )
}

describe('SCRUM-26: Multi-Role Authorization & Menu Matrix', () => {
    describe('1. Union Permissions & Role Permissions', () => {
        it('single role trainee chỉ có quyền của học viên', () => {
            const perms = getRolePermissions('trainee')
            expect(perms).toContain(SYSTEM_PERMISSIONS.COURSE_VIEW)
            expect(perms).toContain(SYSTEM_PERMISSIONS.SESSION_VIEW)
            expect(perms).not.toContain(SYSTEM_PERMISSIONS.COURSE_MANAGE)
            expect(perms).not.toContain(SYSTEM_PERMISSIONS.USER_MANAGE)
        })

        it('single role trainer chỉ có quyền của giảng viên', () => {
            const perms = getRolePermissions('trainer')
            expect(perms).toContain(SYSTEM_PERMISSIONS.COURSE_VIEW)
            expect(perms).toContain(SYSTEM_PERMISSIONS.COURSE_MANAGE)
            expect(perms).toContain(SYSTEM_PERMISSIONS.SESSION_VIEW)
            expect(perms).not.toContain(SYSTEM_PERMISSIONS.USER_MANAGE)
        })

        it('multiple roles [trainee, trainer] là UNION quyền của cả hai vai trò', () => {
            const perms = getRolePermissions(['trainee', 'trainer'])
            expect(perms).toContain(SYSTEM_PERMISSIONS.COURSE_VIEW)
            expect(perms).toContain(SYSTEM_PERMISSIONS.COURSE_MANAGE)
            expect(perms).toContain(SYSTEM_PERMISSIONS.SESSION_VIEW)
            // Không được có quyền Admin
            expect(perms).not.toContain(SYSTEM_PERMISSIONS.USER_VIEW)
            expect(perms).not.toContain(SYSTEM_PERMISSIONS.USER_MANAGE)
        })
    })

    describe('2. Sidebar Menu Filtering (filterMenuItems)', () => {
        it('Case A: roles = [trainee] -> hiện Chương trình đào tạo & Lịch học của tôi, không hiện Góc Học viên, Không gian Giảng viên hay Admin', () => {
            const visible = filterMenuItems(APP_MENU_CONFIG, {
                hasSession: true,
                role: 'trainee',
                roles: ['trainee'],
            })
            const keys = visible.map((i) => i.key)
            expect(keys).toContain('my_schedule')
            expect(keys).toContain('training_programs')
            expect(keys).toContain('overview')
            expect(keys).not.toContain('trainee_dashboard')
            expect(keys).not.toContain('courses')
            expect(keys).not.toContain('trainer_dashboard')
            expect(keys).not.toContain('admin_dashboard')
            expect(keys).not.toContain('users')
        })

        it('Case B: roles = [trainer] -> hiện Chương trình đào tạo & Lịch giảng dạy, không hiện Góc Học viên, Admin hay Không gian Giảng viên', () => {
            const visible = filterMenuItems(APP_MENU_CONFIG, {
                hasSession: true,
                role: 'trainer',
                roles: ['trainer'],
            })
            const keys = visible.map((i) => i.key)
            expect(keys).toContain('my_schedule')
            expect(keys).toContain('training_programs')
            expect(keys).toContain('overview')
            expect(keys).not.toContain('trainer_dashboard')
            expect(keys).not.toContain('courses')
            expect(keys).not.toContain('trainee_dashboard')
            expect(keys).not.toContain('admin_dashboard')
            expect(keys).not.toContain('users')
        })

        it('Case C: roles = [trainee, trainer] -> hiện Lịch học/dạy, không hiện Góc Học viên, Không gian Giảng viên hay Admin', () => {
            const visible = filterMenuItems(APP_MENU_CONFIG, {
                hasSession: true,
                role: 'trainee',
                roles: ['trainee', 'trainer'],
            })
            const keys = visible.map((i) => i.key)
            expect(keys).toContain('my_schedule')
            expect(keys).toContain('training_programs')
            expect(keys).toContain('overview')
            expect(keys).not.toContain('trainee_dashboard')
            expect(keys).not.toContain('trainer_dashboard')
            expect(keys).not.toContain('courses')
            // Không có quyền admin
            expect(keys).not.toContain('admin_dashboard')
            expect(keys).not.toContain('users')
        })

        it('Case D: revoke trainer -> chỉ còn [trainee] -> cả hai mục giới thiệu đều không xuất hiện', () => {
            const visible = filterMenuItems(APP_MENU_CONFIG, {
                hasSession: true,
                role: 'trainee',
                roles: ['trainee'],
            })
            const keys = visible.map((i) => i.key)
            expect(keys).toContain('my_schedule')
            expect(keys).not.toContain('trainee_dashboard')
            expect(keys).not.toContain('trainer_dashboard')
        })
    })

    describe('3. Route Guard Protection (RequirePermission)', () => {
        it('user có roles [trainee, trainer] truy cập route yêu cầu quyền trainee -> PASS', () => {
            render(
                <MemoryRouter initialEntries={['/trainee-feature']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <MultiRoleTestAppWrapper role="trainee" roles={['trainee', 'trainer']}>
                            <Routes>
                                <Route
                                    element={
                                        <RequirePermission
                                            requiredRole="trainee"
                                            requiredPermission={SYSTEM_PERMISSIONS.COURSE_VIEW}
                                            fallbackPath="/forbidden"
                                        />
                                    }
                                >
                                    <Route path="/trainee-feature" element={<h1>Chức năng Học viên</h1>} />
                                </Route>
                                <Route path="/forbidden" element={<h1>Bị cấm truy cập 403</h1>} />
                            </Routes>
                        </MultiRoleTestAppWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )

            expect(screen.getByText('Chức năng Học viên')).toBeDefined()
            expect(screen.getByTestId('location-display').textContent).toBe('/trainee-feature')
        })

        it('user có roles [trainee, trainer] truy cập route yêu cầu quyền trainer -> PASS (không bị 403)', () => {
            render(
                <MemoryRouter initialEntries={['/trainer-feature']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <MultiRoleTestAppWrapper role="trainee" roles={['trainee', 'trainer']}>
                            <Routes>
                                <Route
                                    element={
                                        <RequirePermission
                                            requiredRole="trainer"
                                            requiredPermission={SYSTEM_PERMISSIONS.COURSE_MANAGE}
                                            fallbackPath="/forbidden"
                                        />
                                    }
                                >
                                    <Route path="/trainer-feature" element={<h1>Chức năng Giảng viên</h1>} />
                                </Route>
                                <Route path="/forbidden" element={<h1>Bị cấm truy cập 403</h1>} />
                            </Routes>
                        </MultiRoleTestAppWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )

            expect(screen.getByText('Chức năng Giảng viên')).toBeDefined()
            expect(screen.getByTestId('location-display').textContent).toBe('/trainer-feature')
        })

        it('user có roles [trainee, trainer] truy cập trực tiếp /admin -> 403 Forbidden', () => {
            render(
                <MemoryRouter initialEntries={['/admin']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <MultiRoleTestAppWrapper role="trainee" roles={['trainee', 'trainer']}>
                            <Routes>
                                <Route
                                    element={
                                        <RequirePermission
                                            requiredRole="admin"
                                            requiredPermission={SYSTEM_PERMISSIONS.USER_MANAGE}
                                            fallbackPath="/forbidden"
                                        />
                                    }
                                >
                                    <Route path="/admin" element={<h1>Bảng quản trị</h1>} />
                                </Route>
                                <Route path="/forbidden" element={<h1>Bị cấm truy cập 403</h1>} />
                            </Routes>
                        </MultiRoleTestAppWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )

            expect(screen.queryByText('Bảng quản trị')).toBeNull()
            expect(screen.getByText('Bị cấm truy cập 403')).toBeDefined()
            expect(screen.getByTestId('location-display').textContent).toBe('/forbidden')
        })

        it('user chỉ có role [trainee] truy cập route yêu cầu quyền trainer -> 403 Forbidden', () => {
            render(
                <MemoryRouter initialEntries={['/trainer-feature']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <MultiRoleTestAppWrapper role="trainee" roles={['trainee']}>
                            <Routes>
                                <Route
                                    element={
                                        <RequirePermission
                                            requiredRole="trainer"
                                            requiredPermission={SYSTEM_PERMISSIONS.COURSE_MANAGE}
                                            fallbackPath="/forbidden"
                                        />
                                    }
                                >
                                    <Route path="/trainer-feature" element={<h1>Chức năng Giảng viên</h1>} />
                                </Route>
                                <Route path="/forbidden" element={<h1>Bị cấm truy cập 403</h1>} />
                            </Routes>
                        </MultiRoleTestAppWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )

            expect(screen.queryByText('Chức năng Giảng viên')).toBeNull()
            expect(screen.getByText('Bị cấm truy cập 403')).toBeDefined()
            expect(screen.getByTestId('location-display').textContent).toBe('/forbidden')
        })
    })
})
