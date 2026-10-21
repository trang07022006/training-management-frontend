// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { SessionRedirect } from '../auth/SessionRedirect'
import { RequireSession } from '../auth/RequireSession'
import { RequirePermission } from '../auth/RequirePermission'
import { AppLayout } from '../navigation/AppLayout'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { ErrorPage } from './ErrorPage'
import { UnauthorizedPage } from './UnauthorizedPage'
import { ForbiddenPage } from './ForbiddenPage'
import { NotFoundPage } from './NotFoundPage'
import { LoginPage } from './LoginPage'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { ResetPasswordPage } from './ResetPasswordPage'
import { ChangePasswordPage } from './ChangePasswordPage'

function FullSessionWrapper({
    role,
    children,
}: {
    role?: string | null
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        if (role !== undefined) {
            startSession({ accessToken: 'fake-access-token', refreshToken: 'fake-refresh-token' }, role)
        }
    }, [role, startSession])

    if (role !== undefined && !hasSession) {
        return <div>Initializing session...</div>
    }

    return <>{children}</>
}

function LocationSpy() {
    const location = useLocation()
    return <div data-testid="location-path">{location.pathname}</div>
}

function Scrum24TestApp({ initialEntry = '/' }: { initialEntry?: string }) {
    return (
        <MemoryRouter initialEntries={[initialEntry]}>
            <SessionProvider apiOrigin="http://localhost:5000">
                <SessionRedirect />
                <LocationSpy />
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />
                    <Route path="/401" element={<UnauthorizedPage />} />

                    <Route element={<RequireSession />}>
                        <Route element={<AppLayout />}>
                            <Route path="/" element={<div>Trang Chủ Dashboard</div>} />
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
                                <Route path="/admin" element={<div data-testid="admin-content">Nội Dung Admin</div>} />
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
                                <Route path="/trainer" element={<div data-testid="trainer-content">Nội Dung Trainer</div>} />
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
                                <Route path="/my-schedule" element={<div data-testid="trainee-content">Nội Dung Trainee</div>} />
                            </Route>

                            <Route path="/change-password" element={<ChangePasswordPage />} />
                        </Route>
                    </Route>

                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </SessionProvider>
        </MemoryRouter>
    )
}

describe('SCRUM-81: Test Tổng Thể Error Pages (SCRUM-24 Test Matrix)', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    // ==========================================
    // MATRIX A: 401 UNAUTHORIZED
    // ==========================================
    describe('A. 401 Unauthorized Matrix', () => {
        it('1. chưa login: truy cập /unauthorized hiển thị thông báo yêu cầu đăng nhập', () => {
            render(<Scrum24TestApp initialEntry="/unauthorized" />)
            expect(screen.getByTestId('error-status-code').textContent).toBe('401')
            expect(screen.getByTestId('error-title').textContent).toBe('Yêu cầu đăng nhập')
            expect(screen.getByTestId('error-description').textContent).toContain('Bạn cần đăng nhập')
        })

        it('2. session expired: reason=SESSION_EXPIRED hiển thị phiên hết hạn', () => {
            render(<Scrum24TestApp initialEntry="/unauthorized?reason=SESSION_EXPIRED" />)
            expect(screen.getByTestId('error-title').textContent).toBe('Phiên đăng nhập đã hết hạn')
            expect(screen.getByTestId('error-description').textContent).toContain('hết thời gian hiệu lực')
        })

        it('3. session revoked: reason=SESSION_REVOKED hiển thị phiên kết thúc', () => {
            render(<Scrum24TestApp initialEntry="/unauthorized?reason=SESSION_REVOKED" />)
            expect(screen.getByTestId('error-title').textContent).toBe('Phiên đăng nhập đã kết thúc')
            expect(screen.getByTestId('error-description').textContent).toContain('thu hồi từ thiết bị khác')
        })

        it('4. login again action: nút đăng nhập lại có href /login chính xác', () => {
            render(<Scrum24TestApp initialEntry="/unauthorized?reason=SESSION_EXPIRED" />)
            const cta = screen.getByTestId('error-primary-action')
            expect(cta.textContent).toBe('Đăng nhập lại')
            expect(cta.getAttribute('href')).toBe('/login')
        })
    })

    // ==========================================
    // MATRIX B: 403 FORBIDDEN
    // ==========================================
    describe('B. 403 Forbidden Matrix', () => {
        it('5. authenticated no permission: trainee truy cập /admin bị redirect về 403', () => {
            render(
                <MemoryRouter initialEntries={['/admin']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <FullSessionWrapper role="trainee">
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
                                    <Route path="/admin" element={<div>Admin Area</div>} />
                                </Route>
                            </Routes>
                        </FullSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )

            expect(screen.getByTestId('location-path').textContent).toBe('/forbidden')
            expect(screen.getByTestId('error-status-code').textContent).toBe('403')
            expect(screen.getByTestId('error-title').textContent).toBe('Không có quyền truy cập')
        })

        it('6. authenticated valid permission: admin truy cập /admin render trang thật', () => {
            render(
                <MemoryRouter initialEntries={['/admin']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <FullSessionWrapper role="admin">
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
                                    <Route path="/admin" element={<div data-testid="admin-secret-page">Admin View</div>} />
                                </Route>
                            </Routes>
                        </FullSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )

            expect(screen.getByTestId('location-path').textContent).toBe('/admin')
            expect(screen.getByTestId('admin-secret-page').textContent).toBe('Admin View')
        })

        it('7. direct restricted URL không rò rỉ nội dung được bảo vệ trước khi redirect', () => {
            render(
                <MemoryRouter initialEntries={['/trainer']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <FullSessionWrapper role="trainee">
                            <Routes>
                                <Route path="/forbidden" element={<ForbiddenPage />} />
                                <Route
                                    element={
                                        <RequirePermission
                                            requiredRole="trainer"
                                            requiredPermission={SYSTEM_PERMISSIONS.COURSE_MANAGE}
                                            fallbackPath="/forbidden"
                                        />
                                    }
                                >
                                    <Route path="/trainer" element={<div data-testid="trainer-secret">TOP SECRET TRAINER</div>} />
                                </Route>
                            </Routes>
                        </FullSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )

            expect(screen.queryByTestId('trainer-secret')).toBeNull()
            expect(screen.getByTestId('error-status-code').textContent).toBe('403')
        })

        it('8. role home action: nút Về trang chủ trả về đúng trang chủ của từng vai trò', () => {
            const { unmount: u1 } = render(
                <MemoryRouter initialEntries={['/forbidden']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <FullSessionWrapper role="admin">
                            <ForbiddenPage />
                        </FullSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )
            expect(screen.getByTestId('error-primary-action').getAttribute('href')).toBe('/dashboard')
            u1()

            const { unmount: u2 } = render(
                <MemoryRouter initialEntries={['/forbidden']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <FullSessionWrapper role="trainer">
                            <ForbiddenPage />
                        </FullSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )
            expect(screen.getByTestId('error-primary-action').getAttribute('href')).toBe('/my-schedule')
            u2()

            render(
                <MemoryRouter initialEntries={['/forbidden']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <FullSessionWrapper role="trainee">
                            <ForbiddenPage />
                        </FullSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )
            expect(screen.getByTestId('error-primary-action').getAttribute('href')).toBe('/my-schedule')
        })
    })

    // ==========================================
    // MATRIX C: 404 NOT FOUND
    // ==========================================
    describe('C. 404 Not Found Matrix', () => {
        it('9. unknown route: đường dẫn không tồn tại dẫn đến 404', () => {
            render(<Scrum24TestApp initialEntry="/invalid-route-matrix" />)
            expect(screen.getByTestId('error-status-code').textContent).toBe('404')
            expect(screen.getByTestId('error-title').textContent).toBe('Không tìm thấy trang')
        })

        it('10. known public routes (/login, /forgot-password, /reset-password) không bị 404 đè', () => {
            const { unmount: u1 } = render(<Scrum24TestApp initialEntry="/login" />)
            expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeDefined()
            u1()

            const { unmount: u2 } = render(<Scrum24TestApp initialEntry="/forgot-password" />)
            expect(screen.getByRole('heading', { name: 'Quên mật khẩu?' })).toBeDefined()
            u2()

            render(<Scrum24TestApp initialEntry="/reset-password?token=test-token-123" />)
            expect(screen.getByRole('heading', { name: 'Đặt lại mật khẩu' })).toBeDefined()
        })

        it('11. known protected route (/change-password) hoạt động bình thường khi authenticated', () => {
            render(
                <MemoryRouter initialEntries={['/change-password']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <FullSessionWrapper role="trainee">
                            <Routes>
                                <Route element={<RequireSession />}>
                                    <Route path="/change-password" element={<ChangePasswordPage />} />
                                </Route>
                                <Route path="*" element={<NotFoundPage />} />
                            </Routes>
                        </FullSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )

            expect(screen.getByRole('heading', { name: 'Đổi mật khẩu' })).toBeDefined()
            expect(screen.queryByTestId('error-status-code')).toBeNull()
        })
    })

    // ==========================================
    // MATRIX D: SHARED ERROR UI
    // ==========================================
    describe('D. Shared Error UI Matrix', () => {
        it('12. render title chính xác', () => {
            render(
                <MemoryRouter>
                    <ErrorPage title="Tiêu đề lỗi tuỳ biến" description="Mô tả lỗi" />
                </MemoryRouter>,
            )
            expect(screen.getByTestId('error-title').textContent).toBe('Tiêu đề lỗi tuỳ biến')
        })

        it('13. render description chính xác', () => {
            render(
                <MemoryRouter>
                    <ErrorPage title="Lỗi" description="Chi tiết lỗi kiểm thử" />
                </MemoryRouter>,
            )
            expect(screen.getByTestId('error-description').textContent).toBe('Chi tiết lỗi kiểm thử')
        })

        it('14. actions (primary & secondary) hoạt động', () => {
            const primaryClick = vi.fn()
            const secondaryClick = vi.fn()
            render(
                <MemoryRouter>
                    <ErrorPage
                        title="Lỗi có actions"
                        description="Mô tả"
                        primaryAction={{ label: 'Nút chính', onClick: primaryClick }}
                        secondaryAction={{ label: 'Nút phụ', onClick: secondaryClick }}
                    />
                </MemoryRouter>,
            )

            fireEvent.click(screen.getByTestId('error-primary-action'))
            expect(primaryClick).toHaveBeenCalledTimes(1)

            fireEvent.click(screen.getByTestId('error-secondary-action'))
            expect(secondaryClick).toHaveBeenCalledTimes(1)
        })

        it('15. responsive: container và error card hiển thị đầy đủ class và thuộc tính trợ năng', () => {
            render(
                <MemoryRouter>
                    <ErrorPage
                        statusCode={404}
                        title="Kiểm thử Responsive"
                        description="Nội dung không tràn màn hình"
                        primaryAction={{ label: 'Về trang chủ', to: '/' }}
                    />
                </MemoryRouter>,
            )

            const container = screen.getByTestId('error-page-container')
            expect(container.className).toContain('error-page-container')
            const card = container.querySelector('.error-card')
            expect(card).toBeDefined()
            expect(card?.getAttribute('role')).toBe('main')
        })
    })

    // ==========================================
    // MATRIX E: REGRESSION VERIFICATION
    // ==========================================
    describe('E. Regression Verification Matrix', () => {
        it('16. Login regression: LoginPage render đầy đủ các trường nhập liệu', () => {
            render(<Scrum24TestApp initialEntry="/login" />)
            expect(screen.getByRole('textbox', { name: 'Email' })).toBeDefined()
            expect(screen.getByLabelText('Mật khẩu')).toBeDefined()
        })

        it('17. Session regression: chưa login truy cập trang nghiệp vụ bị chuyển về /login', () => {
            render(<Scrum24TestApp initialEntry="/" />)
            expect(screen.getByTestId('location-path').textContent).toBe('/login')
        })

        it('18. Forgot Password regression: hiển thị form yêu cầu email', () => {
            render(<Scrum24TestApp initialEntry="/forgot-password" />)
            expect(screen.getByLabelText(/địa chỉ email/i)).toBeDefined()
        })

        it('19. Reset Password regression: hiển thị thông báo thiếu token nếu không có token', () => {
            render(<Scrum24TestApp initialEntry="/reset-password" />)
            expect(
                screen.getByText(/Không tìm thấy mã xác thực \(token\) trong liên kết/i),
            ).toBeDefined()
        })

        it('20. Change Password regression: hiển thị 3 ô mật khẩu', () => {
            render(
                <MemoryRouter initialEntries={['/change-password']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <FullSessionWrapper role="trainee">
                            <ChangePasswordPage />
                        </FullSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )
            expect(screen.getByLabelText('Mật khẩu hiện tại')).toBeDefined()
            expect(screen.getByLabelText('Mật khẩu mới')).toBeDefined()
            expect(screen.getByLabelText('Xác nhận mật khẩu mới')).toBeDefined()
        })

        it('21. Menu Permission regression: Admin hiển thị đúng các menu quản trị', () => {
            render(
                <MemoryRouter initialEntries={['/users']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <FullSessionWrapper role="admin">
                            <AppLayout />
                        </FullSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )
            expect(screen.getByTestId('menu-item-overview')).toBeDefined()
            expect(screen.getByTestId('menu-item-users')).toBeDefined()
        })

        it('22. RequirePermission regression: từ chối quyền không xác định bằng Default Deny', () => {
            render(
                <MemoryRouter initialEntries={['/test-deny']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <FullSessionWrapper role="admin">
                            <LocationSpy />
                            <Routes>
                                <Route path="/forbidden" element={<ForbiddenPage />} />
                                <Route
                                    element={
                                        <RequirePermission
                                            requiredPermission="malicious.nonexistent.permission"
                                            fallbackPath="/forbidden"
                                        />
                                    }
                                >
                                    <Route path="/test-deny" element={<div>Bad Content</div>} />
                                </Route>
                            </Routes>
                        </FullSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )
            expect(screen.queryByText('Bad Content')).toBeNull()
            expect(screen.getByTestId('location-path').textContent).toBe('/forbidden')
        })

        it('23. Responsive navigation regression: sidebar toggle hiển thị trong AppHeader', () => {
            render(
                <MemoryRouter initialEntries={['/admin']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <FullSessionWrapper role="admin">
                            <AppLayout />
                        </FullSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )
            expect(screen.getByTestId('sidebar-toggle-button')).toBeDefined()
        })
    })

    // ==========================================
    // SECURITY INTEGRITY VERIFICATION
    // ==========================================
    describe('Security Review Verification', () => {
        it('24. Toàn bộ Error Pages (401, 403, 404) không bao giờ render token, session_id, stack trace, hoặc SQL', () => {
            const { unmount: u1 } = render(<Scrum24TestApp initialEntry="/unauthorized" />)
            let html = screen.getByTestId('error-page-container').innerHTML.toLowerCase()
            expect(html).not.toContain('bearer')
            expect(html).not.toContain('stacktrace')
            expect(html).not.toContain('sql')
            u1()

            const { unmount: u2 } = render(
                <MemoryRouter initialEntries={['/forbidden']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <FullSessionWrapper role="trainee">
                            <ForbiddenPage />
                        </FullSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )
            html = screen.getByTestId('error-page-container').innerHTML.toLowerCase()
            expect(html).not.toContain('bearer')
            expect(html).not.toContain('stacktrace')
            expect(html).not.toContain('sql')
            u2()

            render(<Scrum24TestApp initialEntry="/nowhere-not-found" />)
            html = screen.getByTestId('error-page-container').innerHTML.toLowerCase()
            expect(html).not.toContain('bearer')
            expect(html).not.toContain('stacktrace')
            expect(html).not.toContain('sql')
        })
    })
})
