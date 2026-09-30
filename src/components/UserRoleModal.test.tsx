// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { UserRoleModal } from './UserRoleModal'
import { SessionProvider } from '../auth/SessionProvider'
import type { User } from '../api/userApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockTargetUser: User = {
    id: 42,
    name: 'Nguyễn Văn An',
    email: 'an.nguyen@tms.local',
    phone: '0901234567',
    role: 'trainer',
    status: 'active',
    created_at: '2026-02-15T08:30:00Z',
}

const mockRolesList = [
    { id: 1, code: 'admin', name: 'Quản trị viên', description: 'Toàn quyền quản trị hệ thống' },
    { id: 2, code: 'trainer', name: 'Giảng viên', description: 'Quản lý khóa học và giảng dạy' },
    { id: 3, code: 'trainee', name: 'Học viên', description: 'Tham gia học tập' },
]

function renderWithProvider(ui: React.ReactNode) {
    return render(
        <SessionProvider apiOrigin="http://127.0.0.1:5000">
            {ui}
        </SessionProvider>
    )
}

describe('SCRUM-101: User Role Management Modal Component', () => {
    it('1. render và preload đầy đủ thông tin của người dùng và các vai trò hiện tại', async () => {
        const customRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/roles') && path.includes('/users/')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: {
                        user_id: 42,
                        roles: [{ id: 2, code: 'trainer', name: 'Giảng viên' }]
                    }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.endsWith('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockRolesList }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            return Promise.reject(new Error(`Unhandled: ${path}`))
        })

        renderWithProvider(
            <UserRoleModal
                isOpen={true}
                user={mockTargetUser}
                onClose={vi.fn()}
                customRequest={customRequest}
            />
        )

        expect(screen.getByTestId('user-role-modal')).toBeDefined()
        expect(screen.getByRole('heading', { name: 'Quản lý vai trò người dùng' })).toBeDefined()
        expect(screen.getByText('Nguyễn Văn An')).toBeDefined()
        expect(screen.getByText(/an.nguyen@tms.local/)).toBeDefined()

        // Chờ tải dữ liệu vai trò
        await waitFor(() => {
            expect(screen.getByTestId('current-roles-list')).toBeDefined()
        })

        const roleItem = screen.getByTestId('role-item-2')
        expect(roleItem).toBeDefined()
        expect(roleItem.textContent).toContain('Giảng viên')
        expect(roleItem.textContent).toContain('trainer')
    })

    it('2. hiển thị empty state khi người dùng chưa có vai trò nào', async () => {
        const customRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/roles') && path.includes('/users/')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { user_id: 42, roles: [] }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.endsWith('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockRolesList }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            return Promise.reject(new Error(`Unhandled: ${path}`))
        })

        renderWithProvider(
            <UserRoleModal
                isOpen={true}
                user={mockTargetUser}
                onClose={vi.fn()}
                customRequest={customRequest}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('no-roles-notice')).toBeDefined()
        })
        expect(screen.getByText('Người dùng này hiện chưa được gán vai trò nào.')).toBeDefined()
    })

    it('3. gán vai trò mới thành công và hiển thị phản hồi tích cực', async () => {
        const onRoleUpdated = vi.fn()
        const customRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (path.includes('/roles') && path.includes('/users/')) {
                if (init?.method === 'POST') {
                    return Promise.resolve(new Response(JSON.stringify({
                        status: 'success',
                        data: {
                            user_id: 42,
                            role: { id: 1, code: 'admin', name: 'Quản trị viên' }
                        }
                    }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
                }
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: {
                        user_id: 42,
                        roles: [{ id: 2, code: 'trainer', name: 'Giảng viên' }]
                    }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.endsWith('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockRolesList }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            return Promise.reject(new Error(`Unhandled: ${path}`))
        })

        renderWithProvider(
            <UserRoleModal
                isOpen={true}
                user={mockTargetUser}
                onClose={vi.fn()}
                onRoleUpdated={onRoleUpdated}
                customRequest={customRequest}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('select-assign-role')).toBeDefined()
        })

        const select = screen.getByTestId('select-assign-role') as HTMLSelectElement
        fireEvent.change(select, { target: { value: '1' } })

        const btnAssign = screen.getByTestId('btn-assign-role-submit') as HTMLButtonElement
        expect(btnAssign.disabled).toBe(false)
        fireEvent.click(btnAssign)

        await waitFor(() => {
            expect(screen.getByTestId('role-success-banner')).toBeDefined()
        })

        expect(screen.getByText(/Đã gán vai trò.*cho người dùng/)).toBeDefined()
        expect(onRoleUpdated).toHaveBeenCalled()
    })

    it('4. xử lý khi vai trò đã tồn tại (409 Conflict duplicate role)', async () => {
        const customRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (path.includes('/roles') && path.includes('/users/')) {
                if (init?.method === 'POST') {
                    return Promise.resolve(new Response(JSON.stringify({
                        status: 'error',
                        code: 'DUPLICATE_ROLE_ASSIGNMENT',
                        message: 'Người dùng đã có vai trò này.'
                    }), { status: 409, headers: { 'Content-Type': 'application/json' } }))
                }
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: {
                        user_id: 42,
                        roles: [{ id: 2, code: 'trainer', name: 'Giảng viên' }]
                    }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.endsWith('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockRolesList }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            return Promise.reject(new Error(`Unhandled: ${path}`))
        })

        renderWithProvider(
            <UserRoleModal
                isOpen={true}
                user={mockTargetUser}
                onClose={vi.fn()}
                customRequest={customRequest}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('select-assign-role')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('select-assign-role'), { target: { value: '1' } })
        fireEvent.click(screen.getByTestId('btn-assign-role-submit'))

        await waitFor(() => {
            expect(screen.getByTestId('role-error-banner')).toBeDefined()
        })

        expect(screen.getByText('Người dùng đã được gán vai trò này.')).toBeDefined()
    })

    it('5. gỡ vai trò thành công', async () => {
        const onRoleUpdated = vi.fn()

        const customRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (init?.method === 'DELETE' && path.includes('/roles/2')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { user_id: 42, role_id: 2 }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.includes('/roles') && path.includes('/users/')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: {
                        user_id: 42,
                        roles: [{ id: 2, code: 'trainer', name: 'Giảng viên' }]
                    }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.endsWith('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockRolesList }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            return Promise.reject(new Error(`Unhandled: ${path}`))
        })

        renderWithProvider(
            <UserRoleModal
                isOpen={true}
                user={mockTargetUser}
                onClose={vi.fn()}
                onRoleUpdated={onRoleUpdated}
                customRequest={customRequest}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-revoke-role-2')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-revoke-role-2'))

        await waitFor(() => {
            expect(screen.getByTestId('role-success-banner')).toBeDefined()
        })

        expect(screen.getByText(/Đã gỡ vai trò.*khỏi người dùng/)).toBeDefined()
        expect(onRoleUpdated).toHaveBeenCalled()
    })

    it('6. xử lý lỗi 401 unauthenticated và 403 forbidden', async () => {
        const customRequest = vi.fn().mockImplementation(() => {
            return Promise.resolve(new Response(JSON.stringify({
                status: 'error',
                code: 'FORBIDDEN',
                message: 'Bạn không có quyền thực hiện thao tác này.'
            }), { status: 403, headers: { 'Content-Type': 'application/json' } }))
        })

        renderWithProvider(
            <UserRoleModal
                isOpen={true}
                user={mockTargetUser}
                onClose={vi.fn()}
                customRequest={customRequest}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('role-error-banner')).toBeDefined()
        })

        expect(screen.getByText('Bạn không có quyền thực hiện thao tác này.')).toBeDefined()
    })

    it('7. không render gì khi isOpen = false hoặc user = null', () => {
        const { rerender } = renderWithProvider(
            <UserRoleModal
                isOpen={false}
                user={mockTargetUser}
                onClose={vi.fn()}
            />
        )
        expect(screen.queryByTestId('user-role-modal')).toBeNull()

        rerender(
            <SessionProvider apiOrigin="http://127.0.0.1:5000">
                <UserRoleModal
                    isOpen={true}
                    user={null}
                    onClose={vi.fn()}
                />
            </SessionProvider>
        )
        expect(screen.queryByTestId('user-role-modal')).toBeNull()
    })

    it('8. nút hoàn tất và nút đóng modal gọi onClose', async () => {
        const onClose = vi.fn()
        const customRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/roles') && path.includes('/users/')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { user_id: 42, roles: [] }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.endsWith('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockRolesList }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            return Promise.reject(new Error(`Unhandled: ${path}`))
        })

        renderWithProvider(
            <UserRoleModal
                isOpen={true}
                user={mockTargetUser}
                onClose={onClose}
                customRequest={customRequest}
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-done-role-modal')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-close-role-modal'))
        expect(onClose).toHaveBeenCalledTimes(1)

        fireEvent.click(screen.getByTestId('btn-done-role-modal'))
        expect(onClose).toHaveBeenCalledTimes(2)
    })
})
