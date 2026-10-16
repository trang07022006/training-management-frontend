// @vitest-environment jsdom

import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { LoginPage } from './LoginPage'
import { SessionProvider } from '../auth/SessionProvider'

describe('Login Account Restrictions & Security UX (Part A)', () => {
    afterEach(() => {
        cleanup()
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    function setup(initialPath = '/login') {
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        render(
            <MemoryRouter initialEntries={[initialPath]}>
                <SessionProvider apiOrigin="https://api.test">
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/dashboard" element={<div>Admin Home</div>} />
                    </Routes>
                </SessionProvider>
            </MemoryRouter>,
        )

        return fetchMock
    }

    it('1. Đăng nhập thành công với active user: nút Đăng nhập hiển thị và hoạt động', async () => {
        const fetcher = setup()
        fetcher.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    access_token: 'valid-acc',
                    refresh_token: 'valid-ref',
                    token_type: 'Bearer',
                    user: {
                        id: 'usr-1',
                        email: 'active@daotao.edu.vn',
                        role: 'admin',
                    },
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
        )

        const loginBtn = screen.getByRole('button', { name: 'Đăng nhập' })
        expect(loginBtn).toBeDefined()

        fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
            target: { value: 'active@daotao.edu.vn' },
        })
        fireEvent.change(screen.getByLabelText('Mật khẩu'), {
            target: { value: 'Secret123!' },
        })

        await act(async () => {
            fireEvent.click(loginBtn)
        })

        expect(await screen.findByText('Admin Home')).toBeDefined()
    })

    it('2. Sai mật khẩu dưới ngưỡng: báo sai thông tin generic, nút Đăng nhập vẫn hiển thị', async () => {
        const fetcher = setup()
        fetcher.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    code: 'INVALID_CREDENTIALS',
                    message: 'Email hoặc mật khẩu không đúng',
                }),
                { status: 401, headers: { 'Content-Type': 'application/json' } },
            ),
        )

        fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
            target: { value: 'active@daotao.edu.vn' },
        })
        fireEvent.change(screen.getByLabelText('Mật khẩu'), {
            target: { value: 'WrongPass!' },
        })

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
        })

        const alert = await screen.findByRole('alert')
        expect(alert.textContent).toContain('Email hoặc mật khẩu không đúng')

        // Nút Đăng nhập vẫn phải hiển thị
        const loginBtn = screen.getByRole('button', { name: 'Đăng nhập' })
        expect(loginBtn).toBeDefined()
    })

    it('3. Inactive account: báo tài khoản không hoạt động, ẩn nút Đăng nhập', async () => {
        const fetcher = setup()
        fetcher.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    code: 'ACCOUNT_INACTIVE',
                    message: 'Tài khoản hiện không hoạt động. Vui lòng liên hệ quản trị viên.',
                }),
                { status: 403, headers: { 'Content-Type': 'application/json' } },
            ),
        )

        fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
            target: { value: 'inactive@daotao.edu.vn' },
        })
        fireEvent.change(screen.getByLabelText('Mật khẩu'), {
            target: { value: 'Pass123!' },
        })

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
        })

        const alert = await screen.findByRole('alert')
        expect(alert.textContent).toContain('Tài khoản hiện không hoạt động. Vui lòng liên hệ quản trị viên.')

        // Nút Đăng nhập bị ẩn
        expect(screen.queryByRole('button', { name: 'Đăng nhập' })).toBeNull()
    })

    it('4. Locked account: báo tài khoản đang bị khóa, ẩn nút Đăng nhập', async () => {
        const fetcher = setup()
        fetcher.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    code: 'ACCOUNT_LOCKED',
                    message: 'Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.',
                }),
                { status: 403, headers: { 'Content-Type': 'application/json' } },
            ),
        )

        fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
            target: { value: 'locked@daotao.edu.vn' },
        })
        fireEvent.change(screen.getByLabelText('Mật khẩu'), {
            target: { value: 'Pass123!' },
        })

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
        })

        const alert = await screen.findByRole('alert')
        expect(alert.textContent).toContain('Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.')

        // Nút Đăng nhập bị ẩn
        expect(screen.queryByRole('button', { name: 'Đăng nhập' })).toBeNull()
    })

    it('5. Temporary lock: ẩn nút Đăng nhập, hiển thị countdown, và nút tự hiện lại khi hết giờ', async () => {
        vi.useFakeTimers()
        try {
            const fetcher = setup()
            fetcher.mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        code: 'ACCOUNT_TEMP_LOCKED',
                        message: 'Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá số lần cho phép. Vui lòng thử lại sau.',
                        retry_after_seconds: 5,
                    }),
                    { status: 403, headers: { 'Content-Type': 'application/json' } },
                ),
            )

            fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
                target: { value: 'locked@daotao.edu.vn' },
            })
            fireEvent.change(screen.getByLabelText('Mật khẩu'), {
                target: { value: 'WrongPass!' },
            })

            fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

            // Flush fetch microtasks
            await act(async () => {
                await Promise.resolve()
                await Promise.resolve()
            })

            // Thông báo khóa tạm và countdown
            const alert = screen.getByRole('alert')
            expect(alert.textContent).toContain('Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá số lần cho phép. Vui lòng thử lại sau.')
            expect(alert.textContent).toContain('Thời gian còn lại: 00:05')

            // Nút Đăng nhập bị ẨN trong thời gian khóa
            expect(screen.queryByRole('button', { name: 'Đăng nhập' })).toBeNull()

            // Countdown trôi qua 2 giây -> 00:03
            act(() => {
                vi.advanceTimersByTime(2000)
            })
            expect(alert.textContent).toContain('Thời gian còn lại: 00:03')
            expect(screen.queryByRole('button', { name: 'Đăng nhập' })).toBeNull()

            // Countdown trôi nốt 3 giây -> về 0
            act(() => {
                vi.advanceTimersByTime(3000)
            })

            // Nút Đăng nhập tự xuất hiện lại mà không cần reload trang
            expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeDefined()
        } finally {
            vi.useRealTimers()
        }
    })
})
