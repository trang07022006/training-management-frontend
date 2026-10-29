// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { RequireSession } from '../auth/RequireSession'
import { saveStoredSession } from '../auth/sessionStorage'
import { PublicLayout } from '../layouts/PublicLayout'
import { HomePage } from '../pages/HomePage'
import { PublicConsultationPage } from '../pages/PublicConsultationPage'
import { LoginPage } from '../pages/LoginPage'
import { App } from '../App'
import { AppLayout } from './AppLayout'
import { APP_MENU_CONFIG } from './menuConfig'

function LocationTracker() {
    const location = useLocation()
    const { hasSession, role } = useSession()

    return (
        <aside style={{ display: 'none' }} data-testid="location-tracker">
            <span data-testid="tracker-path">{location.pathname}</span>
            <span data-testid="tracker-session">{hasSession ? 'active' : 'guest'}</span>
            <span data-testid="tracker-role">{role ?? 'none'}</span>
        </aside>
    )
}

function renderFullApp(initialPath = '/') {
    return render(
        <StrictMode>
            <MemoryRouter initialEntries={[initialPath]}>
                <SessionProvider apiOrigin="https://api.daotao.test">
                    <LocationTracker />
                    <Routes>
                        {/* Public Routes */}
                        <Route element={<PublicLayout />}>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/consultation" element={<PublicConsultationPage />} />
                            <Route path="/about" element={<h1>Về chúng tôi</h1>} />
                            <Route path="/programs" element={<h1>Chương trình đào tạo</h1>} />
                            <Route path="/admissions" element={<h1>Tuyển sinh</h1>} />
                            <Route path="/contact" element={<h1>Liên hệ</h1>} />
                        </Route>

                        {/* Auth Route */}
                        <Route path="/login" element={<LoginPage />} />

                        {/* Protected Internal Routes */}
                        <Route element={<RequireSession />}>
                            <Route element={<AppLayout />}>
                                <Route path="/dashboard" element={<App />} />
                            </Route>
                        </Route>
                    </Routes>
                </SessionProvider>
            </MemoryRouter>
        </StrictMode>,
    )
}

function primeUserSession(role = 'user') {
    saveStoredSession({
        tokens: { accessToken: 'valid-access-token', refreshToken: 'valid-refresh-token' },
        role,
        userId: 'usr-1',
        userName: 'Nguyễn Văn A',
        userEmail: 'user@ictu.edu.vn',
        roles: [role],
        permissions: [],
    })
}

describe('Public vs. Internal Routing Separation', () => {
    beforeEach(() => {
        window.sessionStorage.clear()
        window.localStorage.clear()
        vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string | URL | Request) => {
            const urlString = typeof url === 'string' ? url : url.toString()
            if (urlString.includes('/api/auth/session')) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        user_id: 'usr-1',
                        email: 'user@ictu.edu.vn',
                        role: 'user',
                        roles: ['user'],
                        permissions: [],
                    }),
                }
            }
            return {
                ok: true,
                status: 200,
                json: async () => ({ items: [], total: 10 }),
            }
        }))
    })

    afterEach(() => {
        cleanup()
        vi.unstubAllGlobals()
        window.sessionStorage.clear()
        window.localStorage.clear()
    })

    it('1. Guest: GET / -> Hiển thị Public Homepage, không có Sidebar quản trị nội bộ', async () => {
        renderFullApp('/')

        // Đường dẫn hiện tại là /
        expect(screen.getByTestId('tracker-path').textContent).toBe('/')
        expect(screen.getByTestId('tracker-session').textContent).toBe('guest')

        // Hiển thị Public Header và nội dung Public Homepage
        expect(screen.getByTestId('public-header')).toBeDefined()
        expect(screen.getByRole('heading', { name: /Khám phá ICTU/i })).toBeDefined()
        expect(screen.getByTestId('hero-building-image')).toBeDefined()

        // KHÔNG có sidebar quản trị
        expect(screen.queryByTestId('app-sidebar')).toBeNull()
    })

    it('2. Guest: GET /consultation -> Hiển thị trang Đăng ký tư vấn mà không cần đăng nhập', async () => {
        renderFullApp('/consultation')

        expect(screen.getByTestId('tracker-path').textContent).toBe('/consultation')
        expect(screen.getByTestId('tracker-session').textContent).toBe('guest')

        // Hiển thị Public Header và form đăng ký tư vấn
        expect(screen.getByTestId('public-header')).toBeDefined()
        expect(screen.getByRole('heading', { name: 'Đăng ký tư vấn' })).toBeDefined()
        expect(screen.getByLabelText(/Họ và tên/i)).toBeDefined()

        // KHÔNG bị redirect về login
        expect(screen.queryByRole('heading', { name: 'Đăng nhập' })).toBeNull()
    })

    it('3. Guest: truy cập internal Dashboard (/dashboard) -> tự động chuyển hướng về /login', async () => {
        renderFullApp('/dashboard')

        await waitFor(() => {
            expect(screen.getByTestId('tracker-path').textContent).toBe('/login')
        })

        // Trang đăng nhập được hiển thị
        expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeDefined()
        expect(screen.queryByTestId('app-sidebar')).toBeNull()
    })

    it('4. Login thành công -> Điều hướng về Dashboard nội bộ (/dashboard), KHÔNG quay về Public Homepage', async () => {
        const fetcher = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                access_token: 'jwt-access',
                refresh_token: 'jwt-refresh',
                token_type: 'Bearer',
                user: {
                    id: 'usr-1',
                    email: 'user@ictu.edu.vn',
                    role: 'user',
                },
            }),
        })
        vi.stubGlobal('fetch', fetcher)

        renderFullApp('/login')

        const emailInput = screen.getByRole('textbox', { name: 'Email' })
        const passwordInput = screen.getByLabelText('Mật khẩu')
        const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' })

        fireEvent.change(emailInput, { target: { value: 'user@ictu.edu.vn' } })
        fireEvent.change(passwordInput, { target: { value: 'Pass12345!' } })
        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(screen.getByTestId('tracker-path').textContent).toBe('/dashboard')
        })

        // Nằm trong trang quản trị nội bộ
        expect(screen.getByTestId('tracker-session').textContent).toBe('active')
        expect(screen.getByTestId('app-sidebar')).toBeDefined()
    })

    it('5. Logged-in user: click menu "Tổng quan" trong sidebar -> điều hướng đến Internal Dashboard (/dashboard)', async () => {
        primeUserSession('user')
        renderFullApp('/dashboard')

        await waitFor(() => {
            expect(screen.getByTestId('tracker-path').textContent).toBe('/dashboard')
        })

        const overviewLink = screen.getByTestId('menu-item-overview')
        expect(overviewLink).toBeDefined()
        expect(overviewLink.getAttribute('href')).toBe('/dashboard')

        // Kiểm tra item menu config
        const overviewConfig = APP_MENU_CONFIG.find((item) => item.key === 'overview')
        expect(overviewConfig?.path).toBe('/dashboard')
    })

    it('6. Logged-in user: click logo/brand trong sidebar -> điều hướng ra Public Homepage (/) mà không logout', async () => {
        primeUserSession('user')
        renderFullApp('/dashboard')

        await waitFor(() => {
            expect(screen.getByTestId('tracker-path').textContent).toBe('/dashboard')
        })

        const publicLink = screen.getByTestId('sidebar-public-link')
        expect(publicLink).toBeDefined()
        expect(publicLink.getAttribute('href')).toBe('/')

        fireEvent.click(publicLink)

        await waitFor(() => {
            expect(screen.getByTestId('tracker-path').textContent).toBe('/')
        })

        // Người dùng vẫn giữ phiên hoạt động (không bị logout)
        expect(screen.getByTestId('tracker-session').textContent).toBe('active')
        // Public Header hiển thị nút 'Vào hệ thống' thay vì 'Đăng nhập'
        expect(screen.getByTestId('header-dashboard-btn')).toBeDefined()
        expect(screen.queryByTestId('header-login-btn')).toBeNull()
    })

    it('7. Public Header: nút "Đăng ký tư vấn" dẫn tới /consultation', async () => {
        renderFullApp('/')

        const consultationBtn = screen.getByTestId('header-consultation-btn')
        expect(consultationBtn).toBeDefined()
        expect(consultationBtn.getAttribute('href')).toBe('/consultation')

        fireEvent.click(consultationBtn)

        await waitFor(() => {
            expect(screen.getByTestId('tracker-path').textContent).toBe('/consultation')
        })
    })

    it('8. Public Header: khách chưa login thấy nút "Đăng nhập" dẫn tới /login', async () => {
        renderFullApp('/')

        const loginBtn = screen.getByTestId('header-login-btn')
        expect(loginBtn).toBeDefined()
        expect(loginBtn.getAttribute('href')).toBe('/login')

        fireEvent.click(loginBtn)

        await waitFor(() => {
            expect(screen.getByTestId('tracker-path').textContent).toBe('/login')
        })
    })

    it('9. Không có luồng đăng ký tài khoản công khai (no public self-registration)', async () => {
        renderFullApp('/')

        // Không có link đăng ký tài khoản
        expect(screen.queryByRole('link', { name: /tạo tài khoản/i })).toBeNull()
        expect(screen.queryByRole('link', { name: /đăng ký tài khoản/i })).toBeNull()
        expect(screen.queryByRole('link', { name: /sign up/i })).toBeNull()
        expect(screen.queryByRole('link', { name: /register/i })).toBeNull()
    })

    it('10. Dashboard nội bộ cũ được giữ nguyên tại /dashboard với đầy đủ KPI/thống kê', async () => {
        primeUserSession('user')
        renderFullApp('/dashboard')

        await waitFor(() => {
            expect(screen.getByTestId('tracker-path').textContent).toBe('/dashboard')
        })

        // Kiểm tra component Dashboard cũ (App.tsx)
        expect(screen.getByTestId('welcome-banner')).toBeDefined()
        expect(screen.getByText('Tổng sinh viên')).toBeDefined()
        expect(screen.getByText('Biểu đồ tuyển sinh và học tập')).toBeDefined()
        expect(screen.getByText('Lịch công tác')).toBeDefined()
    })
})
