// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { SessionRedirect } from '../auth/SessionRedirect'
import { RequireSession } from '../auth/RequireSession'
import { RequirePermission } from '../auth/RequirePermission'
import { SessionApiError } from '../auth/sessionClient'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { UnauthorizedPage } from './UnauthorizedPage'
import { ForbiddenPage } from './ForbiddenPage'
import { NotFoundPage } from './NotFoundPage'

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
            startSession({ accessToken: 'test-token-jwt', refreshToken: 'test-refresh-jwt' }, role)
        }
    }, [role, startSession])

    if (role !== undefined && !hasSession) {
        return <div>Initializing session...</div>
    }

    return <>{children}</>
}

function LocationSpy() {
    const location = useLocation()
    return <div data-testid="active-path">{location.pathname}</div>
}

function ApiCaller() {
    const { request, hasSession } = useSession()
    const navigate = useNavigate()

    const callForbiddenApi = async () => {
        try {
            await request('/api/admin/restricted')
        } catch (err) {
            if (err instanceof SessionApiError && err.status === 403) {
                navigate('/forbidden')
            }
        }
    }

    return (
        <div>
            <span data-testid="session-state">{hasSession ? 'active' : 'none'}</span>
            <button onClick={callForbiddenApi} data-testid="call-api-btn">
                Call API
            </button>
        </div>
    )
}

function IntegratedTestApp({ initialEntry = '/' }: { initialEntry?: string }) {
    return (
        <MemoryRouter initialEntries={[initialEntry]}>
            <SessionProvider apiOrigin="http://localhost:5000">
                <SessionRedirect />
                <LocationSpy />
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<div data-testid="page-login">Trang Đăng Nhập</div>} />
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />
                    <Route path="/401" element={<UnauthorizedPage />} />

                    {/* Protected Area */}
                    <Route element={<RequireSession />}>
                        <Route path="/" element={<div data-testid="page-home">Trang Chủ App</div>} />
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
                            <Route path="/admin" element={<div data-testid="admin-view">Admin Secret View</div>} />
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
                            <Route path="/trainer" element={<div data-testid="trainer-view">Trainer View</div>} />
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
                            <Route path="/trainee" element={<div data-testid="trainee-view">Trainee View</div>} />
                        </Route>

                        <Route path="/api-test" element={<ApiCaller />} />
                    </Route>

                    {/* Wildcard 404 */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </SessionProvider>
        </MemoryRouter>
    )
}

describe('Error Routing Flow Integration (SCRUM-80)', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it('1. 401 route flow: truy cập /unauthorized và /401 hiển thị đúng trang 401', () => {
        const { unmount } = render(<IntegratedTestApp initialEntry="/unauthorized" />)
        expect(screen.getByTestId('error-status-code').textContent).toBe('401')
        expect(screen.getByTestId('error-title').textContent).toBe('Yêu cầu đăng nhập')
        expect(screen.getByTestId('error-primary-action').getAttribute('href')).toBe('/login')
        unmount()

        render(<IntegratedTestApp initialEntry="/401" />)
        expect(screen.getByTestId('error-status-code').textContent).toBe('401')
    })

    it('2. 403 route flow: truy cập trực tiếp /forbidden hoặc /403 hiển thị trang 403', () => {
        render(
            <MemoryRouter initialEntries={['/forbidden']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <FullSessionWrapper role="trainee">
                        <ForbiddenPage />
                    </FullSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('error-status-code').textContent).toBe('403')
        expect(screen.getByTestId('error-title').textContent).toBe('Không có quyền truy cập')
        expect(screen.getByTestId('error-primary-action').getAttribute('href')).toBe('/trainee')
    })

    it('3. 404 route flow: URL lạ không làm redirect mà hiển thị 404 Not Found', () => {
        render(<IntegratedTestApp initialEntry="/some/unknown/deep/link" />)

        expect(screen.getByTestId('error-status-code').textContent).toBe('404')
        expect(screen.getByTestId('error-title').textContent).toBe('Không tìm thấy trang')
        expect(screen.getByTestId('active-path').textContent).toBe('/some/unknown/deep/link')
    })

    it('4. session expired flow: khi có reason SESSION_EXPIRED thì hiển thị thông điệp hết phiên không redirect loop', () => {
        render(<IntegratedTestApp initialEntry="/unauthorized?reason=SESSION_EXPIRED" />)

        expect(screen.getByTestId('error-title').textContent).toBe('Phiên đăng nhập đã hết hạn')
        expect(screen.getByTestId('error-primary-action').textContent).toBe('Đăng nhập lại')
        expect(screen.getByTestId('error-primary-action').getAttribute('href')).toBe('/login')
    })

    it('5. forbidden API response handling: API trả về 403 thì giữ nguyên phiên đăng nhập và không coi là 401', async () => {
        const fetcher = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    code: 'FORBIDDEN',
                    message: 'Bạn không có quyền thực hiện thao tác này.',
                }),
                {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                },
            ),
        )
        vi.stubGlobal('fetch', fetcher)

        render(
            <MemoryRouter initialEntries={['/api-test']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <FullSessionWrapper role="trainee">
                        <LocationSpy />
                        <Routes>
                            <Route path="/api-test" element={<ApiCaller />} />
                            <Route path="/forbidden" element={<ForbiddenPage />} />
                        </Routes>
                    </FullSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('session-state').textContent).toBe('active')
        fireEvent.click(screen.getByTestId('call-api-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('active-path').textContent).toBe('/forbidden')
        })

        // Phiên vẫn active, không bị revoke hay logout nhầm sang 401
        expect(screen.getByTestId('error-status-code').textContent).toBe('403')
    })

    it('6. direct URL behavior: trainee truy cập trực tiếp /admin bị chặn và chuyển sang /forbidden', () => {
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
                                <Route path="/admin" element={<div data-testid="admin-view">Admin Secret</div>} />
                            </Route>
                        </Routes>
                    </FullSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.queryByTestId('admin-view')).toBeNull()
        expect(screen.getByTestId('active-path').textContent).toBe('/forbidden')
        expect(screen.getByTestId('error-title').textContent).toBe('Không có quyền truy cập')
    })

    it('7. history back hoạt động: gọi navigate(-1) an toàn', () => {
        render(
            <MemoryRouter initialEntries={['/origin', '/unauthorized']} initialIndex={1}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <UnauthorizedPage />
                </SessionProvider>
            </MemoryRouter>,
        )

        const backBtn = screen.getByTestId('error-secondary-action')
        expect(backBtn.textContent).toBe('Quay lại')
        fireEvent.click(backBtn)
    })

    it('8. role home hoạt động: nút Về trang chủ trả về đúng trang của từng role', () => {
        // Admin
        const { unmount: u1 } = render(
            <MemoryRouter initialEntries={['/forbidden']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <FullSessionWrapper role="admin">
                        <ForbiddenPage />
                    </FullSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )
        expect(screen.getByTestId('error-primary-action').getAttribute('href')).toBe('/admin')
        u1()

        // Trainer
        const { unmount: u2 } = render(
            <MemoryRouter initialEntries={['/forbidden']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <FullSessionWrapper role="trainer">
                        <ForbiddenPage />
                    </FullSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )
        expect(screen.getByTestId('error-primary-action').getAttribute('href')).toBe('/trainer')
        u2()

        // Trainee
        render(
            <MemoryRouter initialEntries={['/forbidden']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <FullSessionWrapper role="trainee">
                        <ForbiddenPage />
                    </FullSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )
        expect(screen.getByTestId('error-primary-action').getAttribute('href')).toBe('/trainee')
    })
})
