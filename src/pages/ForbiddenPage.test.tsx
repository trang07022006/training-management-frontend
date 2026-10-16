// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { RequirePermission } from '../auth/RequirePermission'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { ForbiddenPage } from './ForbiddenPage'

function RoleSessionWrapper({
    role,
    children,
}: {
    role?: string | null
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        if (role !== undefined) {
            startSession({ accessToken: 'test-token', refreshToken: 'test-refresh' }, role)
        }
    }, [role, startSession])

    if (role !== undefined && !hasSession) {
        return <div>Initializing test session...</div>
    }

    return <>{children}</>
}

function LocationSpy() {
    const location = useLocation()
    return <div data-testid="current-pathname">{location.pathname}</div>
}

describe('ForbiddenPage & 403 Flow (SCRUM-78)', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('1. render giao diện 403 với status code, icon và thông báo tiếng Việt', () => {
        render(
            <MemoryRouter initialEntries={['/forbidden']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainee">
                        <ForbiddenPage />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('error-status-code').textContent).toBe('403')
        expect(screen.getByTestId('error-title').textContent).toBe('Không có quyền truy cập')
        expect(screen.getByTestId('error-description').textContent).toBe(
            'Bạn không có quyền truy cập chức năng này.',
        )
    })

    it('2. nút về trang chủ điều hướng đúng theo role (admin -> /dashboard, trainer -> /trainer, trainee -> /trainee)', () => {
        // Test role Trainee
        const { unmount } = render(
            <MemoryRouter initialEntries={['/forbidden']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainee">
                        <ForbiddenPage />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        const homeActionTrainee = screen.getByTestId('error-primary-action')
        expect(homeActionTrainee.textContent).toBe('Về trang chủ')
        expect(homeActionTrainee.getAttribute('href')).toBe('/trainee')

        unmount()

        // Test role Trainer
        const { unmount: unmountTrainer } = render(
            <MemoryRouter initialEntries={['/forbidden']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainer">
                        <ForbiddenPage />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        const homeActionTrainer = screen.getByTestId('error-primary-action')
        expect(homeActionTrainer.getAttribute('href')).toBe('/trainer')

        unmountTrainer()

        // Test role Admin
        render(
            <MemoryRouter initialEntries={['/forbidden']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin">
                        <ForbiddenPage />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        const homeActionAdmin = screen.getByTestId('error-primary-action')
        expect(homeActionAdmin.getAttribute('href')).toBe('/dashboard')
    })

    it('3. nút quay lại hoạt động an toàn', () => {
        render(
            <MemoryRouter initialEntries={['/previous', '/forbidden']} initialIndex={1}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainee">
                        <ForbiddenPage />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        const backBtn = screen.getByTestId('error-secondary-action')
        expect(backBtn.textContent).toBe('Quay lại')
        fireEvent.click(backBtn)
    })

    it('4. tích hợp RequirePermission: user authenticated nhưng không đủ quyền -> chuyển hướng tới 403', () => {
        render(
            <MemoryRouter initialEntries={['/admin']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainee">
                        <LocationSpy />
                        <Routes>
                            <Route path="/forbidden" element={<ForbiddenPage />} />
                            <Route
                                element={
                                    <RequirePermission
                                        requiredRole="admin"
                                        requiredPermission={SYSTEM_PERMISSIONS.USER_MANAGE}
                                        fallbackPath="/forbidden"
                                    />
                                }
                            >
                                <Route path="/admin" element={<div data-testid="admin-secret">Admin Secret</div>} />
                            </Route>
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        // Không leak content trang bị hạn chế
        expect(screen.queryByTestId('admin-secret')).toBeNull()
        // Đã chuyển hướng sang /forbidden
        expect(screen.getByTestId('current-pathname').textContent).toBe('/forbidden')
        expect(screen.getByTestId('error-title').textContent).toBe('Không có quyền truy cập')
    })

    it('5. tích hợp RequirePermission: user authenticated và đủ quyền -> hiển thị trang thật', () => {
        render(
            <MemoryRouter initialEntries={['/admin']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin">
                        <LocationSpy />
                        <Routes>
                            <Route path="/forbidden" element={<ForbiddenPage />} />
                            <Route
                                element={
                                    <RequirePermission
                                        requiredRole="admin"
                                        requiredPermission={SYSTEM_PERMISSIONS.USER_MANAGE}
                                        fallbackPath="/forbidden"
                                    />
                                }
                            >
                                <Route path="/admin" element={<div data-testid="admin-secret">Admin Secret Content</div>} />
                            </Route>
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('admin-secret')).toBeDefined()
        expect(screen.getByTestId('admin-secret').textContent).toBe('Admin Secret Content')
        expect(screen.getByTestId('current-pathname').textContent).toBe('/admin')
    })

    it('6. bảo mật: không tiết lộ permission code, DB schema, SQL, internals, token', () => {
        render(
            <MemoryRouter initialEntries={['/forbidden']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainee">
                        <ForbiddenPage />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        const container = screen.getByTestId('error-page-container')
        const html = container.innerHTML.toLowerCase()

        expect(html).not.toContain('system_permissions')
        expect(html).not.toContain('user_manage')
        expect(html).not.toContain('course_manage')
        expect(html).not.toContain('bearer')
        expect(html).not.toContain('jwt')
        expect(html).not.toContain('postgres')
        expect(html).not.toContain('sqlite')
        expect(html).not.toContain('table')
    })
})
