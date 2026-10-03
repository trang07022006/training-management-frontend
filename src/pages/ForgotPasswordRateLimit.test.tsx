// @vitest-environment jsdom

import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ForgotPasswordPage } from './ForgotPasswordPage'

describe('ForgotPasswordPage Rate Limiting & Anti-Spam UX (Part B)', () => {
    afterEach(() => {
        cleanup()
        vi.useRealTimers()
        vi.unstubAllGlobals()
        sessionStorage.clear()
        localStorage.clear()
    })

    function setup(props = {}) {
        return render(
            <MemoryRouter initialEntries={['/forgot-password']}>
                <Routes>
                    <Route
                        path="/forgot-password"
                        element={<ForgotPasswordPage apiOrigin="https://api.test" {...props} />}
                    />
                    <Route path="/login" element={<div>Trang đăng nhập</div>} />
                </Routes>
            </MemoryRouter>
        )
    }

    it('1. Gửi lần đầu thành công -> hiển thị thông báo generic, khóa nút và chạy countdown 60s', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                message:
                    'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi tới email của bạn.',
            }),
            headers: new Headers(),
        })
        vi.stubGlobal('fetch', fetchMock)

        setup()

        const emailInput = screen.getByLabelText(/địa chỉ email/i)
        fireEvent.change(emailInput, { target: { value: 'user@ictu.edu.vn' } })

        const submitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
        expect(submitBtn.hasAttribute('disabled')).toBe(false)

        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(
                screen.getByText(
                    'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi tới email của bạn.'
                )
            ).toBeDefined()
        })

        // Nút bị disable sau khi gửi yêu cầu
        const button = screen.getByRole('button', { name: /gửi lại liên kết đặt lại/i })
        expect(button.hasAttribute('disabled')).toBe(true)

        // Hiển thị countdown "Có thể gửi lại sau 01:00" hoặc "Có thể gửi lại sau 00:59"
        expect(screen.getByText(/Có thể gửi lại sau 0[01]:[0-5][0-9]/)).toBeDefined()
    })

    it('2. Countdown về 0 -> nút "Gửi lại liên kết đặt lại" được kích hoạt trở lại', async () => {
        vi.useFakeTimers()

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                message:
                    'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi tới email của bạn.',
            }),
            headers: new Headers(),
        })
        vi.stubGlobal('fetch', fetchMock)

        setup()

        const emailInput = screen.getByLabelText(/địa chỉ email/i)
        fireEvent.change(emailInput, { target: { value: 'user@ictu.edu.vn' } })

        const submitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
        fireEvent.click(submitBtn)

        // Chờ hoàn tất promise
        await act(async () => {
            await Promise.resolve()
            await Promise.resolve()
        })

        // Nút đang bị khóa
        const buttonAfterSend = screen.getByRole('button', { name: /gửi lại liên kết đặt lại/i })
        expect(buttonAfterSend.hasAttribute('disabled')).toBe(true)
        expect(screen.getByText(/Có thể gửi lại sau/)).toBeDefined()

        // Tiến tới 60 giây sau
        act(() => {
            vi.advanceTimersByTime(60000)
        })

        // Nút được mở khóa trở lại
        expect(buttonAfterSend.hasAttribute('disabled')).toBe(false)
        expect(screen.queryByText(/Có thể gửi lại sau/)).toBeNull()
    })

    it('3. Backend trả mã 429 rate limit -> đọc retry_after_seconds và hiển thị thông báo cooldown', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: false,
            status: 429,
            json: async () => ({
                code: 'FORGOT_PASSWORD_COOLDOWN',
                message: 'Bạn vừa yêu cầu đặt lại mật khẩu. Vui lòng chờ trước khi gửi lại.',
                retry_after_seconds: 45,
            }),
            headers: new Headers({ 'Retry-After': '45' }),
        })
        vi.stubGlobal('fetch', fetchMock)

        setup()

        const emailInput = screen.getByLabelText(/địa chỉ email/i)
        fireEvent.change(emailInput, { target: { value: 'spam@ictu.edu.vn' } })

        const submitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(
                screen.getByText(
                    'Bạn vừa yêu cầu đặt lại mật khẩu. Vui lòng chờ trước khi gửi lại.'
                )
            ).toBeDefined()
        })

        // Nút bị khóa
        const button = screen.getByRole('button', { name: /gửi lại liên kết đặt lại/i })
        expect(button.hasAttribute('disabled')).toBe(true)

        // Countdown đọc chính xác thời gian từ backend: 45 giây -> "00:45"
        expect(screen.getByText('Có thể gửi lại sau 00:45')).toBeDefined()
    })

    it('4. F5 / Reload trang trong lúc cooldown -> duy trì countdown và nút vẫn bị khóa', () => {
        // Giả lập trạng thái sessionStorage còn 30 giây cooldown
        const until = Date.now() + 30 * 1000
        sessionStorage.setItem('forgot_password_cooldown_until', String(until))

        setup()

        // Ngay khi mount, nút bị khóa
        const button = screen.getByRole('button', { name: /gửi lại liên kết đặt lại/i })
        expect(button.hasAttribute('disabled')).toBe(true)

        // Countdown vẫn hiển thị
        expect(screen.getByText(/Có thể gửi lại sau 00:30|Có thể gửi lại sau 00:29/)).toBeDefined()
    })

    it('5. Anti-enumeration: Không hiển thị "Email không tồn tại" hay "Tài khoản không tồn tại"', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                message:
                    'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi tới email của bạn.',
            }),
            headers: new Headers(),
        })
        vi.stubGlobal('fetch', fetchMock)

        setup()

        const emailInput = screen.getByLabelText(/địa chỉ email/i)
        fireEvent.change(emailInput, { target: { value: 'ghost@ictu.edu.vn' } })

        const submitBtn = screen.getByRole('button', { name: /gửi liên kết đặt lại/i })
        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(
                screen.getByText(
                    'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi tới email của bạn.'
                )
            ).toBeDefined()
        })

        expect(screen.queryByText(/email không tồn tại/i)).toBeNull()
        expect(screen.queryByText(/tài khoản không tồn tại/i)).toBeNull()
    })
})
