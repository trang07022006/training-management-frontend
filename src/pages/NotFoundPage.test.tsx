// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { RequireSession } from '../auth/RequireSession'
import { NotFoundPage } from './NotFoundPage'

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

describe('NotFoundPage (SCRUM-79)', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('1. render giao diện 404 với status code, icon và thông báo tiếng Việt', () => {
        render(
            <MemoryRouter initialEntries={['/unknown-route-xyz']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <NotFoundPage />
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('error-status-code').textContent).toBe('404')
        expect(screen.getByTestId('error-title').textContent).toBe('Không tìm thấy trang')
        expect(screen.getByTestId('error-description').textContent).toContain('không tồn tại')
    })

    it('2. route không tồn tại (wildcard) điều hướng tới 404 mà không redirect về login hoặc 403', () => {
        render(
            <MemoryRouter initialEntries={['/random-unmapped-path']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <Routes>
                        <Route path="/login" element={<div>Trang đăng nhập</div>} />
                        <Route path="/forbidden" element={<div>Trang 403</div>} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('error-status-code').textContent).toBe('404')
        expect(screen.queryByText('Trang đăng nhập')).toBeNull()
        expect(screen.queryByText('Trang 403')).toBeNull()
    })

    it('3. không phá vỡ các public routes (/login, /forgot-password, /reset-password)', () => {
        const { unmount: u1 } = render(
            <MemoryRouter initialEntries={['/login']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <Routes>
                        <Route path="/login" element={<div>Trang Login Đích thực</div>} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </SessionProvider>
            </MemoryRouter>,
        )
        expect(screen.getByText('Trang Login Đích thực')).toBeDefined()
        expect(screen.queryByTestId('error-status-code')).toBeNull()
        u1()

        const { unmount: u2 } = render(
            <MemoryRouter initialEntries={['/forgot-password']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <Routes>
                        <Route path="/forgot-password" element={<div>Trang Quên Mật Khẩu</div>} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </SessionProvider>
            </MemoryRouter>,
        )
        expect(screen.getByText('Trang Quên Mật Khẩu')).toBeDefined()
        expect(screen.queryByTestId('error-status-code')).toBeNull()
        u2()

        render(
            <MemoryRouter initialEntries={['/reset-password']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <Routes>
                        <Route path="/reset-password" element={<div>Trang Đặt Lại Mật Khẩu</div>} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </SessionProvider>
            </MemoryRouter>,
        )
        expect(screen.getByText('Trang Đặt Lại Mật Khẩu')).toBeDefined()
        expect(screen.queryByTestId('error-status-code')).toBeNull()
    })

    it('4. không phá vỡ protected routes hợp lệ khi user đã đăng nhập', () => {
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin">
                        <Routes>
                            <Route element={<RequireSession />}>
                                <Route path="/dashboard" element={<div>Trang Dashboard Admin</div>} />
                            </Route>
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByText('Trang Dashboard Admin')).toBeDefined()
        expect(screen.queryByTestId('error-status-code')).toBeNull()
    })

    it('5. nút về trang chủ: điều hướng về role home khi authenticated, về /login khi unauthenticated', () => {
        // Unauthenticated -> Về /login
        const { unmount } = render(
            <MemoryRouter initialEntries={['/nowhere']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <NotFoundPage />
                </SessionProvider>
            </MemoryRouter>,
        )

        const unauthHome = screen.getByTestId('error-primary-action')
        expect(unauthHome.getAttribute('href')).toBe('/login')
        unmount()

        // Authenticated Admin -> Về /dashboard
        const { unmount: uAdmin } = render(
            <MemoryRouter initialEntries={['/nowhere']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin">
                        <NotFoundPage />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )
        const adminHome = screen.getByTestId('error-primary-action')
        expect(adminHome.getAttribute('href')).toBe('/dashboard')
        uAdmin()

        // Authenticated Trainer -> Về /trainer
        render(
            <MemoryRouter initialEntries={['/nowhere']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainer">
                        <NotFoundPage />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )
        const trainerHome = screen.getByTestId('error-primary-action')
        expect(trainerHome.getAttribute('href')).toBe('/trainer')
    })

    it('6. nút quay lại hoạt động an toàn', () => {
        render(
            <MemoryRouter initialEntries={['/start', '/unknown-xyz']} initialIndex={1}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <NotFoundPage />
                </SessionProvider>
            </MemoryRouter>,
        )

        const backBtn = screen.getByTestId('error-secondary-action')
        expect(backBtn.textContent).toBe('Quay lại')
        fireEvent.click(backBtn)
    })
})
