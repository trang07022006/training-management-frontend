// @vitest-environment jsdom

import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { LoginPage } from './LoginPage'
import { ChangePasswordPage } from './ChangePasswordPage'
import { RequireSession } from '../auth/RequireSession'
import { SessionProvider } from '../auth/SessionProvider'
import { saveStoredSession, loadStoredSession } from '../auth/sessionStorage'

describe('SCRUM-215: Force Change Password on First Login Flow', () => {
    afterEach(() => {
        cleanup()
        vi.useRealTimers()
        vi.unstubAllGlobals()
        sessionStorage.clear()
        localStorage.clear()
    })

    function setupApp(initialPath = '/login') {
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        render(
            <MemoryRouter initialEntries={[initialPath]}>
                <SessionProvider apiOrigin="https://api.test">
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/change-password" element={<ChangePasswordPage />} />
                        <Route element={<RequireSession />}>
                            <Route path="/dashboard" element={<div>Dashboard Content Area</div>} />
                            <Route path="/trainee" element={<div>Trainee Portal Area</div>} />
                        </Route>
                    </Routes>
                </SessionProvider>
            </MemoryRouter>,
        )

        return fetchMock
    }

    it('TC-03 & TC-04: Đăng nhập lần đầu với must_change_password=true bắt buộc chuyển tới Đổi mật khẩu và chặn Dashboard', async () => {
        const fetcher = setupApp('/login')

        fetcher.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    access_token: 'student-temp-acc',
                    refresh_token: 'student-temp-ref',
                    token_type: 'Bearer',
                    must_change_password: true,
                    user: {
                        id: 'stu-user-1',
                        email: 'student@example.edu.vn',
                        role: 'trainee',
                        must_change_password: true,
                    },
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
        )

        fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
            target: { value: 'student@example.edu.vn' },
        })
        fireEvent.change(screen.getByLabelText('Mật khẩu'), {
            target: { value: 'InitialPass@2026' },
        })

        const loginBtn = screen.getByRole('button', { name: 'Đăng nhập' })
        await act(async () => {
            fireEvent.click(loginBtn)
        })

        // Phải chuyển sang trang Đổi mật khẩu
        expect(await screen.findByText('Bạn cần đổi mật khẩu trước khi tiếp tục sử dụng hệ thống.')).toBeDefined()
        expect(screen.getByLabelText('Mật khẩu hiện tại')).toBeDefined()
        expect(screen.getByLabelText('Mật khẩu mới')).toBeDefined()
        expect(screen.getByLabelText('Xác nhận mật khẩu mới')).toBeDefined()

        // Nút quay lại bảng điều khiển bị ẩn trong chế độ bắt buộc đổi mật khẩu
        expect(screen.queryByText(/Quay lại trang chủ/)).toBeNull()
    })

    it('TC-04: Thử truy cập Dashboard khi chưa đổi mật khẩu sẽ bị chặn và điều hướng lại /change-password', async () => {
        saveStoredSession({
            tokens: {
                accessToken: 'student-temp-acc',
                refreshToken: 'student-temp-ref',
            },
            role: 'trainee',
            userId: 'stu-user-1',
            userEmail: 'student@example.edu.vn',
            mustChangePassword: true,
        })

        const fetcher = setupApp('/dashboard')

        // Mock current session bootstrap API response
        fetcher.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    id: 'sess-1',
                    session_id: 'sess-1',
                    user_id: 'stu-user-1',
                    email: 'student@example.edu.vn',
                    role: 'trainee',
                    must_change_password: true,
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
        )

        // Phải bị chặn truy cập Dashboard và chuyển sang trang Đổi mật khẩu
        expect(await screen.findByText('Bạn cần đổi mật khẩu trước khi tiếp tục sử dụng hệ thống.')).toBeDefined()
        expect(screen.queryByText('Dashboard Content Area')).toBeNull()
    })

    it('TC-05 & TC-07: Đổi mật khẩu thành công sẽ clear flag must_change_password và cho phép vào hệ thống', async () => {
        saveStoredSession({
            tokens: {
                accessToken: 'student-temp-acc',
                refreshToken: 'student-temp-ref',
            },
            role: 'trainee',
            userId: 'stu-user-1',
            userEmail: 'student@example.edu.vn',
            mustChangePassword: true,
        })

        const fetcher = setupApp('/change-password')

        // Mock change password API response
        fetcher.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    status: 'success',
                    code: 'PASSWORD_CHANGED',
                    message: 'Đổi mật khẩu thành công.',
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
        )

        fireEvent.change(screen.getByLabelText('Mật khẩu hiện tại'), {
            target: { value: 'InitialPass@2026' },
        })
        fireEvent.change(screen.getByLabelText('Mật khẩu mới'), {
            target: { value: 'NewStudentSecure@123' },
        })
        fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), {
            target: { value: 'NewStudentSecure@123' },
        })

        const submitBtn = screen.getByRole('button', { name: 'Đổi mật khẩu' })
        await act(async () => {
            fireEvent.click(submitBtn)
        })

        // Thông báo đổi mật khẩu thành công
        expect(await screen.findByText('Đổi mật khẩu thành công.')).toBeDefined()

        // Kiểm tra stored session đã clear flag mustChangePassword
        const restored = loadStoredSession()
        expect(restored).toBeTruthy()
        expect(restored?.mustChangePassword).toBe(false)
    })

    it('TC-08: Account cũ với must_change_password=false đăng nhập bình thường và vào thẳng trang chức năng', async () => {
        const fetcher = setupApp('/login')

        fetcher.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    access_token: 'old-acc',
                    refresh_token: 'old-ref',
                    token_type: 'Bearer',
                    must_change_password: false,
                    user: {
                        id: 'old-user-1',
                        email: 'existing@example.edu.vn',
                        role: 'trainee',
                        must_change_password: false,
                    },
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
        )

        fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
            target: { value: 'existing@example.edu.vn' },
        })
        fireEvent.change(screen.getByLabelText('Mật khẩu'), {
            target: { value: 'CurrentPass@123' },
        })

        const loginBtn = screen.getByRole('button', { name: 'Đăng nhập' })
        await act(async () => {
            fireEvent.click(loginBtn)
        })

        // Không bị bắt đổi mật khẩu, được điều hướng vào trainee area
        expect(await screen.findByText('Trainee Portal Area')).toBeDefined()
        expect(screen.queryByText('Bạn cần đổi mật khẩu trước khi tiếp tục sử dụng hệ thống.')).toBeNull()
    })
})
