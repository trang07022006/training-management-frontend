// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { EditUserModal } from './EditUserModal'
import { SessionProvider } from '../auth/SessionProvider'
import type { User } from '../api/userApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockTargetUser: User = {
    id: 42,
    name: 'Đặng Thị Thu',
    email: 'thu.dang@tms.local',
    phone: '0912345678',
    role: 'trainer',
    status: 'active',
    created_at: '2026-02-15T08:30:00Z',
}

function renderWithProvider(ui: React.ReactNode) {
    return render(
        <SessionProvider apiOrigin="http://127.0.0.1:5000">
            {ui}
        </SessionProvider>
    )
}

describe('SCRUM-93: Edit User Modal Component', () => {
    it('1. render và preload đầy đủ thông tin hiện tại của người dùng', () => {
        renderWithProvider(
            <EditUserModal
                isOpen={true}
                user={mockTargetUser}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        expect(screen.getByTestId('edit-user-modal')).toBeDefined()
        expect(screen.getByRole('heading', { name: 'Chỉnh sửa người dùng #42' })).toBeDefined()

        const nameInput = screen.getByTestId('input-edit-name') as HTMLInputElement
        const emailInput = screen.getByTestId('input-edit-email') as HTMLInputElement
        const phoneInput = screen.getByTestId('input-edit-phone') as HTMLInputElement
        const statusSelect = screen.getByTestId('select-edit-status') as HTMLSelectElement

        expect(nameInput.value).toBe('Đặng Thị Thu')
        expect(emailInput.value).toBe('thu.dang@tms.local')
        expect(phoneInput.value).toBe('0912345678')
        expect(statusSelect.value).toBe('active')
    })

    it('2. hiển thị vai trò ở chế độ chỉ đọc (read-only/disabled)', () => {
        renderWithProvider(
            <EditUserModal
                isOpen={true}
                user={mockTargetUser}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        const roleInput = screen.getByTestId('input-edit-role-readonly') as HTMLInputElement
        expect(roleInput.value).toBe('Giảng viên')
        expect(roleInput.disabled).toBe(true)
        expect(screen.getByText(/Phân quyền vai trò được quản lý tại mục Phân quyền/)).toBeDefined()
    })

    it('3. tuyệt đối không xuất hiện trường mật khẩu trong biểu mẫu chỉnh sửa', () => {
        renderWithProvider(
            <EditUserModal
                isOpen={true}
                user={mockTargetUser}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        expect(screen.queryByLabelText(/Mật khẩu/i)).toBeNull()
        expect(screen.queryByPlaceholderText(/mật khẩu/i)).toBeNull()
    })

    it('4. không render gì khi isOpen = false hoặc user = null', () => {
        const { rerender } = renderWithProvider(
            <EditUserModal
                isOpen={false}
                user={mockTargetUser}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )
        expect(screen.queryByTestId('edit-user-modal')).toBeNull()

        rerender(
            <SessionProvider apiOrigin="http://127.0.0.1:5000">
                <EditUserModal
                    isOpen={true}
                    user={null}
                    onClose={vi.fn()}
                    onSuccess={vi.fn()}
                />
            </SessionProvider>
        )
        expect(screen.queryByTestId('edit-user-modal')).toBeNull()
    })

    it('5. hiển thị lỗi validation khi xóa trắng họ tên hoặc email sai định dạng', async () => {
        renderWithProvider(
            <EditUserModal
                isOpen={true}
                user={mockTargetUser}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        fireEvent.change(screen.getByTestId('input-edit-name'), { target: { value: '   ' } })
        fireEvent.change(screen.getByTestId('input-edit-email'), { target: { value: 'invalid-email' } })

        fireEvent.click(screen.getByTestId('btn-submit-edit'))

        await waitFor(() => {
            expect(screen.getByTestId('error-edit-name')).toBeDefined()
            expect(screen.getByText('Họ và tên không được để trống.')).toBeDefined()
            expect(screen.getByTestId('error-edit-email')).toBeDefined()
            expect(screen.getByText('Email không đúng định dạng.')).toBeDefined()
        })
    })

    it('6. submit thành công gọi PUT /api/users/:id với đúng payload an toàn', async () => {
        const handleSuccess = vi.fn()
        const handleClose = vi.fn()

        const updatedUser: User = {
            ...mockTargetUser,
            name: 'Đặng Thu Thảo',
            email: 'thuthao@tms.local',
            phone: '0999888777',
            status: 'locked',
        }

        const mockCustomRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                status: 'success',
                data: updatedUser,
            }),
        } as unknown as Response)

        renderWithProvider(
            <EditUserModal
                isOpen={true}
                user={mockTargetUser}
                onClose={handleClose}
                onSuccess={handleSuccess}
                customRequest={mockCustomRequest}
            />
        )

        fireEvent.change(screen.getByTestId('input-edit-name'), { target: { value: 'Đặng Thu Thảo' } })
        fireEvent.change(screen.getByTestId('input-edit-email'), { target: { value: 'thuthao@tms.local' } })
        fireEvent.change(screen.getByTestId('input-edit-phone'), { target: { value: '0999888777' } })
        fireEvent.change(screen.getByTestId('select-edit-status'), { target: { value: 'locked' } })

        fireEvent.click(screen.getByTestId('btn-submit-edit'))

        await waitFor(() => {
            expect(mockCustomRequest).toHaveBeenCalledTimes(1)
            const [url, init] = mockCustomRequest.mock.calls[0]
            expect(url).toBe('/api/users/42')
            expect(init.method).toBe('PUT')

            const body = JSON.parse(init.body)
            expect(body).toEqual({
                name: 'Đặng Thu Thảo',
                email: 'thuthao@tms.local',
                phone: '0999888777',
                status: 'locked',
            })

            // Tuyệt đối không gửi role hay password trong body PUT
            expect(body.role).toBeUndefined()
            expect(body.password).toBeUndefined()

            expect(handleSuccess).toHaveBeenCalledWith(updatedUser)
            expect(handleClose).toHaveBeenCalledTimes(1)
        })
    })

    it('7. xử lý lỗi 409 DUPLICATE_EMAIL và hiển thị lỗi email tương ứng', async () => {
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
            <EditUserModal
                isOpen={true}
                user={mockTargetUser}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
                customRequest={mockCustomRequest}
            />
        )

        fireEvent.change(screen.getByTestId('input-edit-email'), { target: { value: 'duplicate@tms.local' } })
        fireEvent.click(screen.getByTestId('btn-submit-edit'))

        await waitFor(() => {
            expect(screen.getByTestId('error-edit-email')).toBeDefined()
            expect(screen.getByText('Email này đã được sử dụng.')).toBeDefined()
        })
    })

    it('8. xử lý lỗi 404 USER_NOT_FOUND và hiển thị banner lỗi', async () => {
        const mockCustomRequest = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: async () => ({
                status: 'error',
                code: 'USER_NOT_FOUND',
                message: 'Người dùng không tồn tại.',
            }),
        } as unknown as Response)

        renderWithProvider(
            <EditUserModal
                isOpen={true}
                user={mockTargetUser}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
                customRequest={mockCustomRequest}
            />
        )

        fireEvent.click(screen.getByTestId('btn-submit-edit'))

        await waitFor(() => {
            expect(screen.getByTestId('edit-modal-error-banner')).toBeDefined()
            expect(screen.getByText('Không tìm thấy người dùng.')).toBeDefined()
        })
    })

    it('9. click Hủy bỏ hoặc nút Đóng (X) kích hoạt onClose và không gọi API update', () => {
        const handleClose = vi.fn()
        const mockCustomRequest = vi.fn()

        renderWithProvider(
            <EditUserModal
                isOpen={true}
                user={mockTargetUser}
                onClose={handleClose}
                onSuccess={vi.fn()}
                customRequest={mockCustomRequest}
            />
        )

        fireEvent.click(screen.getByTestId('btn-cancel-edit'))
        expect(handleClose).toHaveBeenCalledTimes(1)

        fireEvent.click(screen.getByTestId('btn-close-edit-modal'))
        expect(handleClose).toHaveBeenCalledTimes(2)

        expect(mockCustomRequest).not.toHaveBeenCalled()
    })
})
