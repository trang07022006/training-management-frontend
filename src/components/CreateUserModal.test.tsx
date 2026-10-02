// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { CreateUserModal } from './CreateUserModal'
import { SessionProvider } from '../auth/SessionProvider'
import type { User } from '../api/userApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockCreatedUser: User = {
    id: 99,
    name: 'Phan Văn Mới',
    email: 'newuser@tms.local',
    phone: '0988776655',
    role: 'trainee',
    status: 'active',
    created_at: '2026-03-30T10:00:00Z',
}

function renderWithProvider(ui: React.ReactNode) {
    return render(
        <SessionProvider apiOrigin="http://127.0.0.1:5000">
            {ui}
        </SessionProvider>
    )
}

describe('SCRUM-92: Create User Modal Component', () => {
    it('1. render đầy đủ các trường nhập liệu và nút thao tác', () => {
        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        expect(screen.getByTestId('create-user-modal')).toBeDefined()
        expect(screen.getByRole('heading', { name: 'Thêm người dùng mới' })).toBeDefined()
        expect(screen.getByTestId('input-create-name')).toBeDefined()
        expect(screen.getByTestId('input-create-email')).toBeDefined()
        expect(screen.getByTestId('input-create-password')).toBeDefined()
        expect(screen.getByTestId('input-create-phone')).toBeDefined()
        expect(screen.getByTestId('select-create-role')).toBeDefined()
        expect(screen.getByTestId('select-create-status')).toBeDefined()
        expect(screen.getByTestId('btn-submit-create')).toBeDefined()
        expect(screen.getByTestId('btn-cancel-create')).toBeDefined()
        expect(screen.getByTestId('btn-close-create-modal')).toBeDefined()
    })

    it('2. không render gì khi isOpen = false', () => {
        renderWithProvider(
            <CreateUserModal
                isOpen={false}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        expect(screen.queryByTestId('create-user-modal')).toBeNull()
    })

    it('3. hiển thị lỗi validation khi submit form trống', async () => {
        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        const submitBtn = screen.getByTestId('btn-submit-create')
        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(screen.getByTestId('error-create-name')).toBeDefined()
            expect(screen.getByText('Họ và tên không được để trống.')).toBeDefined()
            expect(screen.getByTestId('error-create-email')).toBeDefined()
            expect(screen.getByText('Email không được để trống.')).toBeDefined()
            expect(screen.getByTestId('error-create-password')).toBeDefined()
            expect(screen.getByText('Mật khẩu không được để trống.')).toBeDefined()
        })
    })

    it('4. hiển thị lỗi khi email sai định dạng hoặc mật khẩu dưới 8 ký tự', async () => {
        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        fireEvent.change(screen.getByTestId('input-create-name'), { target: { value: 'Lê Văn A' } })
        fireEvent.change(screen.getByTestId('input-create-email'), { target: { value: 'not-an-email' } })
        fireEvent.change(screen.getByTestId('input-create-password'), { target: { value: '12345' } })

        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(screen.getByText('Email không đúng định dạng.')).toBeDefined()
            expect(screen.getByText('Mật khẩu phải có ít nhất 8 ký tự.')).toBeDefined()
        })
    })

    it('5. toggle ẩn/hiện mật khẩu thay đổi input type tương ứng', () => {
        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        const passwordInput = screen.getByTestId('input-create-password') as HTMLInputElement
        const toggleBtn = screen.getByTestId('btn-toggle-create-password')

        expect(passwordInput.type).toBe('password')

        fireEvent.click(toggleBtn)
        expect(passwordInput.type).toBe('text')

        fireEvent.click(toggleBtn)
        expect(passwordInput.type).toBe('password')
    })

    it('6. submit thành công gọi API, kích hoạt onSuccess và đóng modal', async () => {
        const handleSuccess = vi.fn()
        const handleClose = vi.fn()

        const mockCustomRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 201,
            json: async () => ({
                status: 'success',
                data: mockCreatedUser,
            }),
        } as unknown as Response)

        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={handleClose}
                onSuccess={handleSuccess}
                customRequest={mockCustomRequest}
            />
        )

        fireEvent.change(screen.getByTestId('input-create-name'), { target: { value: 'Phan Văn Mới' } })
        fireEvent.change(screen.getByTestId('input-create-email'), { target: { value: 'newuser@tms.local' } })
        fireEvent.change(screen.getByTestId('input-create-password'), { target: { value: 'SecurePass123' } })
        fireEvent.change(screen.getByTestId('input-create-phone'), { target: { value: '0988776655' } })
        fireEvent.change(screen.getByTestId('select-create-role'), { target: { value: 'trainee' } })
        fireEvent.change(screen.getByTestId('select-create-status'), { target: { value: 'active' } })

        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(mockCustomRequest).toHaveBeenCalledTimes(1)
            const [url, init] = mockCustomRequest.mock.calls[0]
            expect(url).toBe('/api/users')
            expect(init.method).toBe('POST')

            const body = JSON.parse(init.body)
            expect(body.name).toBe('Phan Văn Mới')
            expect(body.email).toBe('newuser@tms.local')
            expect(body.password).toBe('SecurePass123')
            expect(body.phone).toBe('0988776655')
            expect(body.role).toBe('trainee')
            expect(body.status).toBe('active')

            expect(handleSuccess).toHaveBeenCalledWith(mockCreatedUser)
            expect(handleClose).toHaveBeenCalledTimes(1)
        })
    })

    it('7. xử lý lỗi 409 DUPLICATE_EMAIL và hiển thị thông báo lỗi ô email', async () => {
        const mockCustomRequest = vi.fn().mockResolvedValue({
            ok: false,
            status: 409,
            json: async () => ({
                status: 'error',
                code: 'DUPLICATE_EMAIL',
                message: 'Email đã được sử dụng.',
            }),
        } as unknown as Response)

        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
                customRequest={mockCustomRequest}
            />
        )

        fireEvent.change(screen.getByTestId('input-create-name'), { target: { value: 'Lê Văn A' } })
        fireEvent.change(screen.getByTestId('input-create-email'), { target: { value: 'existing@tms.local' } })
        fireEvent.change(screen.getByTestId('input-create-password'), { target: { value: 'SecurePass123' } })

        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(screen.getByTestId('error-create-email')).toBeDefined()
            expect(screen.getByText('Email này đã được sử dụng.')).toBeDefined()
        })
    })

    it('8. click nút Hủy bỏ hoặc nút Đóng (X) kích hoạt onClose', () => {
        const handleClose = vi.fn()
        renderWithProvider(
            <CreateUserModal
                isOpen={true}
                onClose={handleClose}
                onSuccess={vi.fn()}
            />
        )

        fireEvent.click(screen.getByTestId('btn-cancel-create'))
        expect(handleClose).toHaveBeenCalledTimes(1)

        fireEvent.click(screen.getByTestId('btn-close-create-modal'))
        expect(handleClose).toHaveBeenCalledTimes(2)
    })
})
