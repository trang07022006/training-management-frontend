// @vitest-environment jsdom

import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'

import { LoginPage } from './LoginPage'
import { SessionProvider } from '../auth/SessionProvider'

function setup(initialPath = '/login') {
    const fetcher = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetcher)

    render(
        <StrictMode>
            <MemoryRouter initialEntries={[initialPath]}>
                <SessionProvider apiOrigin="https://api.example.test">
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/" element={<h1>Trang chủ</h1>} />
                    </Routes>
                </SessionProvider>
            </MemoryRouter>
        </StrictMode>,
    )

    return fetcher
}

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

describe('SCRUM-30: Giao diện đăng nhập (LoginPage & LoginForm)', () => {
    it('hiển thị đầy đủ thông tin nhận diện hệ thống và tiêu đề', () => {
        setup('/login')

        // Tên hệ thống
        expect(screen.getByText('Hệ thống Quản lý Đào tạo')).toBeDefined()

        // Tiêu đề Đăng nhập
        expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeDefined()

        // Subtitle hướng dẫn
        expect(
            screen.getByText('Đăng nhập để tiếp tục sử dụng hệ thống.'),
        ).toBeDefined()
    })

    it('hiển thị các trường nhập liệu Email và Mật khẩu theo đúng chuẩn', () => {
        setup('/login')

        // Email field
        const emailInput = screen.getByRole('textbox', { name: 'Email' })
        expect(emailInput).toBeDefined()
        expect(emailInput.getAttribute('type')).toBe('email')
        expect(emailInput.getAttribute('placeholder')).toBe('name@example.com')

        // Password field
        const passwordInput = screen.getByLabelText('Mật khẩu')
        expect(passwordInput).toBeDefined()
        expect(passwordInput.getAttribute('type')).toBe('password')
        expect(passwordInput.getAttribute('placeholder')).toBe('Nhập mật khẩu')
    })

    it('hỗ trợ toggle ẩn/hiện mật khẩu', () => {
        setup('/login')

        const passwordInput = screen.getByLabelText('Mật khẩu')
        const toggleBtn = screen.getByRole('button', { name: 'Hiện mật khẩu' })

        expect(passwordInput.getAttribute('type')).toBe('password')

        // Bấm hiện mật khẩu
        fireEvent.click(toggleBtn)
        expect(passwordInput.getAttribute('type')).toBe('text')
        expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toBeDefined()

        // Bấm ẩn mật khẩu
        fireEvent.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }))
        expect(passwordInput.getAttribute('type')).toBe('password')
    })

    it('hiển thị checkbox ghi nhớ đăng nhập và link quên mật khẩu', () => {
        setup('/login')

        // Checkbox Ghi nhớ đăng nhập
        const rememberCheckbox = screen.getByRole('checkbox', {
            name: 'Ghi nhớ đăng nhập',
        })
        expect(rememberCheckbox).toBeDefined()
        expect((rememberCheckbox as HTMLInputElement).checked).toBe(false)

        fireEvent.click(rememberCheckbox)
        expect((rememberCheckbox as HTMLInputElement).checked).toBe(true)

        // Link Quên mật khẩu
        const forgotLink = screen.getByRole('link', { name: 'Quên mật khẩu?' })
        expect(forgotLink).toBeDefined()
        expect(forgotLink.getAttribute('href')).toBe('/forgot-password')
    })

    it('hiển thị nút Đăng nhập chính và thông tin hỗ trợ', () => {
        setup('/login')

        // Nút Đăng nhập
        const loginBtn = screen.getByRole('button', { name: 'Đăng nhập' })
        expect(loginBtn).toBeDefined()
        expect(loginBtn.getAttribute('type')).toBe('submit')

        // Footer thông tin
        expect(screen.getByText(/Phiên bản 1\.0/)).toBeDefined()
        expect(screen.getByText(/Hỗ trợ kỹ thuật:/)).toBeDefined()
    })

    it('đảm bảo cấu trúc layout container và card hỗ trợ responsive cho trang đăng nhập', () => {
        const { container } = render(
            <StrictMode>
                <MemoryRouter initialEntries={['/login']}>
                    <SessionProvider apiOrigin="https://api.example.test">
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />
                        </Routes>
                    </SessionProvider>
                </MemoryRouter>
            </StrictMode>,
        )

        const mainContainer = container.querySelector('.login-page-container')
        const loginCard = container.querySelector('.login-card')
        const brandLogo = container.querySelector('.login-brand-logo')
        const actionsRow = container.querySelector('.form-actions-row')

        expect(mainContainer).not.toBeNull()
        expect(loginCard).not.toBeNull()
        expect(brandLogo).not.toBeNull()
        expect(actionsRow).not.toBeNull()
    })

    it('hiển thị thông báo tài khoản hiện không hoạt động khi đăng nhập tài khoản inactive', async () => {
        const fetcher = setup('/login')
        fetcher.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    code: 'ACCOUNT_INACTIVE',
                    message: 'Tài khoản hiện không hoạt động. Vui lòng liên hệ quản trị viên.',
                }),
                {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                },
            ),
        )

        fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
            target: { value: 'inactive@example.com' },
        })
        fireEvent.change(screen.getByLabelText('Mật khẩu'), {
            target: { value: 'ValidPassword123!' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

        const alert = await screen.findByRole('alert')
        expect(alert.textContent).toBe('Tài khoản hiện không hoạt động. Vui lòng liên hệ quản trị viên.')
    })

    it('hiển thị thông báo tài khoản đang bị khóa khi đăng nhập tài khoản locked', async () => {
        const fetcher = setup('/login')
        fetcher.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    code: 'ACCOUNT_LOCKED',
                    message: 'Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.',
                }),
                {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                },
            ),
        )

        fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
            target: { value: 'locked@example.com' },
        })
        fireEvent.change(screen.getByLabelText('Mật khẩu'), {
            target: { value: 'ValidPassword123!' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

        const alert = await screen.findByRole('alert')
        expect(alert.textContent).toBe('Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.')
    })

    it('hiển thị lỗi nhập liệu cạnh trường khi để trống và không gửi request', async () => {
        const fetcher = setup('/login')

        const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' })
        fireEvent.click(submitBtn)

        expect(fetcher).not.toHaveBeenCalled()
        expect(await screen.findByTestId('login-email-error')).toBeDefined()
        expect(screen.getByTestId('login-email-error').textContent).toBe('Email là bắt buộc.')

        fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
            target: { value: 'user@example.com' },
        })
        fireEvent.click(submitBtn)

        expect(fetcher).not.toHaveBeenCalled()
        expect(await screen.findByTestId('login-password-error')).toBeDefined()
        expect(screen.getByTestId('login-password-error').textContent).toBe('Mật khẩu là bắt buộc.')
    })

    it('không trim khoảng trắng của mật khẩu khi gửi form', async () => {
        const fetcher = setup('/login')
        fetcher.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    access_token: 'acc-token',
                    refresh_token: 'ref-token',
                    token_type: 'Bearer',
                    user: { id: 'usr-1', email: 'test@example.com', role: 'admin' },
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
        )

        fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
            target: { value: '  test@example.com  ' },
        })
        // Mật khẩu có khoảng trắng đầu và cuối
        fireEvent.change(screen.getByLabelText('Mật khẩu'), {
            target: { value: '  SecretPass123!  ' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

        expect(fetcher).toHaveBeenCalledTimes(1)
        const callBody = JSON.parse(fetcher.mock.calls[0][1]?.body as string)
        expect(callBody.email).toBe('test@example.com')
        expect(callBody.password).toBe('  SecretPass123!  ')
    })

    it('nút hiện/ẩn mật khẩu type=button không kích hoạt gửi form và bảo toàn giá trị mật khẩu', async () => {
        const fetcher = setup('/login')

        const passwordInput = screen.getByLabelText('Mật khẩu')
        fireEvent.change(passwordInput, { target: { value: 'MySecretPassword123' } })

        const toggleBtn = screen.getByRole('button', { name: 'Hiện mật khẩu' })
        expect(toggleBtn.getAttribute('type')).toBe('button')

        fireEvent.click(toggleBtn)

        expect(fetcher).not.toHaveBeenCalled()
        expect((passwordInput as HTMLInputElement).value).toBe('MySecretPassword123')
        expect(passwordInput.getAttribute('type')).toBe('text')
    })

    it('phân biệt lỗi máy chủ 500: hiển thị toast lỗi máy chủ, không quy thành sai mật khẩu', async () => {
        const fetcher = setup('/login')
        fetcher.mockResolvedValueOnce(
            new Response(
                JSON.stringify({ message: 'Internal Server Error' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } },
            ),
        )

        fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
            target: { value: 'admin@example.com' },
        })
        fireEvent.change(screen.getByLabelText('Mật khẩu'), {
            target: { value: 'Password123!' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

        const toastMsg = await screen.findByTestId('toast-error')
        expect(toastMsg.textContent).toContain('Có lỗi máy chủ, vui lòng thử lại sau.')
        expect(toastMsg.textContent).not.toContain('Email hoặc mật khẩu không đúng')
    })

    it('phân biệt lỗi 503 SESSION_STORAGE_UNAVAILABLE: thông báo máy chủ tạm thời không lưu được phiên', async () => {
        const fetcher = setup('/login')
        fetcher.mockResolvedValueOnce(
            new Response(
                JSON.stringify({ code: 'SESSION_STORAGE_UNAVAILABLE' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } },
            ),
        )

        fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
            target: { value: 'admin@example.com' },
        })
        fireEvent.change(screen.getByLabelText('Mật khẩu'), {
            target: { value: 'Password123!' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

        const toastMsg = await screen.findByTestId('toast-error')
        expect(toastMsg.textContent).toContain('Hệ thống máy chủ tạm thời không thể lưu phiên đăng nhập')
        expect(toastMsg.textContent).not.toContain('Email hoặc mật khẩu không đúng')
    })

    it('phân biệt lỗi mạng: hiển thị thông báo kết nối, không quy thành sai mật khẩu', async () => {
        const fetcher = setup('/login')
        fetcher.mockRejectedValueOnce(new TypeError('Failed to fetch'))

        fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
            target: { value: 'admin@example.com' },
        })
        fireEvent.change(screen.getByLabelText('Mật khẩu'), {
            target: { value: 'Password123!' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

        const toastMsg = await screen.findByTestId('toast-error')
        expect(toastMsg.textContent).toContain('Không thể kết nối')
        expect(toastMsg.textContent).not.toContain('Email hoặc mật khẩu không đúng')
    })

    it('nhấn vào nhãn text "Ghi nhớ đăng nhập" toggle checkbox thành công', () => {
        setup('/login')

        const checkbox = screen.getByRole('checkbox', { name: 'Ghi nhớ đăng nhập' }) as HTMLInputElement
        expect(checkbox.checked).toBe(false)

        const labelText = screen.getByText('Ghi nhớ đăng nhập')
        fireEvent.click(labelText)
        expect(checkbox.checked).toBe(true)

        fireEvent.click(labelText)
        expect(checkbox.checked).toBe(false)
    })
})
