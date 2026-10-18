// @vitest-environment jsdom

import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'

import { LoginPage } from './LoginPage'
import { TrainerRedirect } from './TrainerRedirect'
import { TraineeRedirect } from './TraineeRedirect'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { RequireSession } from '../auth/RequireSession'

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

function LocationWatcher() {
    const location = useLocation()
    const { hasSession, role } = useSession()

    return (
        <aside style={{ display: 'none' }}>
            <span data-testid="current-path">{location.pathname}</span>
            <span data-testid="current-session">{hasSession ? 'active' : 'empty'}</span>
            <span data-testid="current-role">{role ?? 'none'}</span>
        </aside>
    )
}

function setupTestApp(initialPath = '/login') {
    const fetcher = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetcher)

    render(
        <StrictMode>
            <MemoryRouter initialEntries={[initialPath]}>
                <SessionProvider apiOrigin="https://api.daotao.test">
                    <LocationWatcher />
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />

                        <Route element={<RequireSession />}>
                            <Route path="/dashboard" element={<h1>Trang chủ hệ thống</h1>} />
                            <Route path="/admin" element={<h1>Bảng quản trị</h1>} />
                            <Route path="/my-schedule" element={<h1>Lịch học và giảng dạy</h1>} />
                            <Route path="/trainer" element={<TrainerRedirect />} />
                            <Route path="/trainee" element={<TraineeRedirect />} />
                        </Route>
                    </Routes>
                </SessionProvider>
            </MemoryRouter>
        </StrictMode>,
    )

    return fetcher
}

async function fillAndSubmitLoginForm(email: string, password: string) {
    const emailInput = screen.getByRole('textbox', { name: 'Email' })
    const passwordInput = screen.getByLabelText('Mật khẩu')
    const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' })

    fireEvent.change(emailInput, { target: { value: email } })
    fireEvent.change(passwordInput, { target: { value: password } })
    fireEvent.click(submitBtn)
}

beforeEach(() => {
    window.sessionStorage.clear()
    window.localStorage.clear()
})

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    window.sessionStorage.clear()
    window.localStorage.clear()
})

describe('SCRUM-35: Điều hướng trang chủ theo vai trò (Role Routing)', () => {
    it('đăng nhập thành công với vai trò admin thì điều hướng tới /dashboard', async () => {
        const fetcher = setupTestApp('/login')

        fetcher.mockResolvedValueOnce(
            jsonResponse({
                access_token: 'jwt-access-admin',
                refresh_token: 'jwt-refresh-admin',
                token_type: 'Bearer',
                user: {
                    id: 'usr-admin-1',
                    email: 'admin.super@test.vn',
                    role: 'admin',
                },
            }),
        )

        await fillAndSubmitLoginForm('admin.super@test.vn', 'Secret123!')

        await waitFor(() => {
            expect(screen.getByTestId('current-path').textContent).toBe('/dashboard')
        })

        expect(screen.getByTestId('current-session').textContent).toBe('active')
        expect(screen.getByTestId('current-role').textContent).toBe('admin')
        expect(
            screen.getByRole('heading', { name: 'Trang chủ hệ thống' }),
        ).toBeDefined()
    })

    it('đăng nhập thành công với vai trò trainer thì điều hướng tới /my-schedule', async () => {
        const fetcher = setupTestApp('/login')

        fetcher.mockResolvedValueOnce(
            jsonResponse({
                access_token: 'jwt-access-trainer',
                refresh_token: 'jwt-refresh-trainer',
                token_type: 'Bearer',
                user: {
                    id: 'usr-trainer-2',
                    email: 'trainer.nguyen@test.vn',
                    role: 'trainer',
                },
            }),
        )

        await fillAndSubmitLoginForm('trainer.nguyen@test.vn', 'Secret123!')

        await waitFor(() => {
            expect(screen.getByTestId('current-path').textContent).toBe('/my-schedule')
        })

        expect(screen.getByTestId('current-session').textContent).toBe('active')
        expect(screen.getByTestId('current-role').textContent).toBe('trainer')
        expect(
            screen.getByRole('heading', { name: 'Lịch học và giảng dạy' }),
        ).toBeDefined()
    })

    it('đăng nhập thành công với vai trò trainee thì điều hướng tới /my-schedule', async () => {
        const fetcher = setupTestApp('/login')

        fetcher.mockResolvedValueOnce(
            jsonResponse({
                access_token: 'jwt-access-trainee',
                refresh_token: 'jwt-refresh-trainee',
                token_type: 'Bearer',
                user: {
                    id: 'usr-trainee-3',
                    email: 'trainee.tran@test.vn',
                    role: 'trainee',
                },
            }),
        )

        await fillAndSubmitLoginForm('trainee.tran@test.vn', 'Secret123!')

        await waitFor(() => {
            expect(screen.getByTestId('current-path').textContent).toBe('/my-schedule')
        })

        expect(screen.getByTestId('current-session').textContent).toBe('active')
        expect(screen.getByTestId('current-role').textContent).toBe('trainee')
        expect(
            screen.getByRole('heading', { name: 'Lịch học và giảng dạy' }),
        ).toBeDefined()
    })

    it('đăng nhập thành công với vai trò user mặc định thì điều hướng về /dashboard', async () => {
        const fetcher = setupTestApp('/login')

        fetcher.mockResolvedValueOnce(
            jsonResponse({
                access_token: 'jwt-access-user',
                refresh_token: 'jwt-refresh-user',
                token_type: 'Bearer',
                user: {
                    id: 'usr-default-4',
                    email: 'default.user@test.vn',
                    role: 'user',
                },
            }),
        )

        await fillAndSubmitLoginForm('default.user@test.vn', 'Secret123!')

        await waitFor(() => {
            expect(screen.getByTestId('current-path').textContent).toBe('/dashboard')
        })

        expect(screen.getByTestId('current-session').textContent).toBe('active')
        expect(
            screen.getByRole('heading', { name: 'Trang chủ hệ thống' }),
        ).toBeDefined()
    })

    it('không hard-code vai trò theo email (email trainee nhưng role admin vẫn sang /dashboard)', async () => {
        const fetcher = setupTestApp('/login')

        fetcher.mockResolvedValueOnce(
            jsonResponse({
                access_token: 'jwt-access-custom',
                refresh_token: 'jwt-refresh-custom',
                token_type: 'Bearer',
                user: {
                    id: 'usr-custom-5',
                    email: 'trainee-named-email@example.com',
                    role: 'admin',
                },
            }),
        )

        await fillAndSubmitLoginForm('trainee-named-email@example.com', 'Secret123!')

        await waitFor(() => {
            expect(screen.getByTestId('current-path').textContent).toBe('/dashboard')
        })

        expect(screen.getByTestId('current-role').textContent).toBe('admin')
    })

    it('đăng nhập thất bại thì hiển thị lỗi và không điều hướng', async () => {
        const fetcher = setupTestApp('/login')

        fetcher.mockResolvedValueOnce(
            jsonResponse(
                {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Email hoặc mật khẩu không đúng',
                },
                401,
            ),
        )

        await fillAndSubmitLoginForm('wrong@test.vn', 'WrongPassword!')

        const alert = await screen.findByRole('alert')
        expect(alert.textContent).toContain('Email hoặc mật khẩu không đúng')
        expect(screen.getByTestId('current-path').textContent).toBe('/login')
        expect(screen.getByTestId('current-session').textContent).toBe('empty')
    })

    it('tài khoản bị khóa tạm thời thì hiển thị thông báo khóa từ backend', async () => {
        const fetcher = setupTestApp('/login')

        fetcher.mockResolvedValueOnce(
            jsonResponse(
                {
                    code: 'ACCOUNT_LOCKED',
                    message:
                        'Tài khoản tạm thời bị khóa 15 phút do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau.',
                },
                403,
            ),
        )

        await fillAndSubmitLoginForm('locked@test.vn', 'WrongPassword!')

        const alert = await screen.findByRole('alert')
        expect(alert.textContent).toContain(
            'Tài khoản tạm thời bị khóa 15 phút do nhập sai mật khẩu quá 5 lần',
        )
        expect(screen.getByTestId('current-path').textContent).toBe('/login')
    })

    it('tài khoản không hoạt động (inactive) thì hiển thị thông báo không hoạt động và không điều hướng', async () => {
        const fetcher = setupTestApp('/login')

        fetcher.mockResolvedValueOnce(
            jsonResponse(
                {
                    code: 'ACCOUNT_INACTIVE',
                    message: 'Tài khoản hiện không hoạt động. Vui lòng liên hệ quản trị viên.',
                },
                403,
            ),
        )

        await fillAndSubmitLoginForm('inactive@test.vn', 'AnyPassword123!')

        const alert = await screen.findByRole('alert')
        expect(alert.textContent).toContain('Tài khoản hiện không hoạt động. Vui lòng liên hệ quản trị viên.')
        expect(screen.getByTestId('current-path').textContent).toBe('/login')
        expect(screen.getByTestId('current-session').textContent).toBe('empty')
    })

    it('truy cập trực tiếp /trainee khi chưa đăng nhập thì chuyển hướng về /login', async () => {
        setupTestApp('/trainee')

        await waitFor(() => {
            expect(screen.getByTestId('current-path').textContent).toBe('/login')
        })
    })
})
