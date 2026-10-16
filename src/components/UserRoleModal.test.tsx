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
        expect(roleItem.textContent).not.toContain('trainer')
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

        // Nút Gán vai trò đã bị xóa hoàn toàn
        expect(screen.queryByTestId('btn-assign-role-submit')).toBeNull()
        expect(screen.queryByText('Gán vai trò')).toBeNull()

        const select = screen.getByTestId('select-assign-role') as HTMLSelectElement
        // Tự động gán ngay khi chọn vai trò trong dropdown
        fireEvent.change(select, { target: { value: '1' } })

        await waitFor(() => {
            expect(screen.getByTestId('role-success-banner')).toBeDefined()
        })

        expect(screen.getByText(/Đã gán vai trò.*Quản trị viên/)).toBeDefined()
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

        // Tự động gán ngay khi chọn vai trò
        fireEvent.change(screen.getByTestId('select-assign-role'), { target: { value: '1' } })

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

    it('9. khi API gán vai trò gặp lỗi hệ thống: reset dropdown, không thêm vai trò và hiển thị thông báo lỗi chuẩn', async () => {
        const customRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (path.includes('/roles') && path.includes('/users/')) {
                if (init?.method === 'POST') {
                    return Promise.resolve(new Response(JSON.stringify({
                        status: 'error',
                        message: 'Database connection failed',
                    }), { status: 500, headers: { 'Content-Type': 'application/json' } }))
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

        const select = screen.getByTestId('select-assign-role') as HTMLSelectElement
        fireEvent.change(select, { target: { value: '1' } })

        await waitFor(() => {
            expect(screen.getByTestId('role-error-banner')).toBeDefined()
        })

        expect(screen.getByText('Không thể gán vai trò. Vui lòng thử lại.')).toBeDefined()
        // Dropdown được reset về rỗng
        expect(select.value).toBe('')
        // Không thêm role 1 vào danh sách hiện tại
        expect(screen.queryByTestId('role-item-1')).toBeNull()
        expect(screen.getByTestId('role-item-2')).toBeDefined()
    })

    it('10. hiển thị loading indicator và disable dropdown trong lúc đang gọi API gán vai trò', async () => {
        let resolveAssign: (value: Response) => void
        const assignPromise = new Promise<Response>((resolve) => {
            resolveAssign = resolve
        })

        const customRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (path.includes('/roles') && path.includes('/users/')) {
                if (init?.method === 'POST') {
                    return assignPromise
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

        const select = screen.getByTestId('select-assign-role') as HTMLSelectElement
        fireEvent.change(select, { target: { value: '1' } })

        // Đang gọi API: dropdown bị disabled và hiển thị loading indicator
        expect(select.disabled).toBe(true)
        expect(screen.getByTestId('assign-role-loading')).toBeDefined()
        expect(screen.getByText('Đang gán...')).toBeDefined()

        // Hoàn tất promise
        resolveAssign!(new Response(JSON.stringify({
            status: 'success',
            data: {
                user_id: 42,
                role: { id: 1, code: 'admin', name: 'Quản trị viên' }
            }
        }), { status: 201, headers: { 'Content-Type': 'application/json' } }))

        await waitFor(() => {
            expect(screen.getByTestId('role-success-banner')).toBeDefined()
        })

        expect(screen.queryByTestId('assign-role-loading')).toBeNull()
        expect(screen.getByTestId('role-item-1')).toBeDefined()
    })

    it('11. vai trò đã có không hiển thị trong dropdown và không gửi request gán trùng', async () => {
        const customRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/roles') && path.includes('/users/')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: {
                        user_id: 42,
                        roles: [
                            { id: 1, code: 'admin', name: 'Quản trị viên' },
                            { id: 2, code: 'trainer', name: 'Giảng viên' },
                            { id: 3, code: 'trainee', name: 'Học viên' },
                        ]
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

        const select = screen.getByTestId('select-assign-role') as HTMLSelectElement
        // Dropdown bị disabled vì user đã có tất cả các role
        expect(select.disabled).toBe(true)
        expect(screen.getByText('Người dùng đã có tất cả các vai trò')).toBeDefined()
        // Không có option nào để gán
        expect(select.options.length).toBe(1)
    })

    it('12. gán vai trò "Tư vấn tuyển sinh" tự động lưu và hiển thị thông báo "Đã gán vai trò Tư vấn tuyển sinh."', async () => {
        const admissionsRole = {
            id: 99,
            code: 'admissions_counselor',
            name: 'Tư vấn tuyển sinh',
            description: 'Tư vấn tuyển sinh và quản lý khách hàng tiềm năng',
        }

        const customRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (path.includes('/roles') && path.includes('/users/')) {
                if (init?.method === 'POST') {
                    return Promise.resolve(new Response(JSON.stringify({
                        status: 'success',
                        data: {
                            user_id: 42,
                            role: admissionsRole,
                        }
                    }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
                }
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: {
                        user_id: 42,
                        roles: []
                    }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.endsWith('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: [...mockRolesList, admissionsRole] }
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

        const select = screen.getByTestId('select-assign-role') as HTMLSelectElement
        fireEvent.change(select, { target: { value: '99' } })

        await waitFor(() => {
            expect(screen.getByTestId('role-success-banner')).toBeDefined()
        })

        expect(screen.getByText('Đã gán vai trò Tư vấn tuyển sinh.')).toBeDefined()
        expect(screen.getByTestId('role-item-99')).toBeDefined()
        expect(screen.getByText('Tư vấn tuyển sinh')).toBeDefined()
    })

    it('12. dropdown hiển thị vai trò Quản lý đào tạo và tự động gán khi chọn', async () => {
        const tmRole = {
            id: 100,
            code: 'training_manager',
            name: 'Quản lý đào tạo',
            description: 'Quản lý chương trình và điều hành đào tạo',
        }

        const customRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (path.includes('/roles') && path.includes('/users/')) {
                if (init?.method === 'POST') {
                    return Promise.resolve(new Response(JSON.stringify({
                        status: 'success',
                        data: {
                            user_id: 42,
                            role: tmRole,
                        }
                    }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
                }
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: {
                        user_id: 42,
                        roles: []
                    }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.endsWith('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: [...mockRolesList, tmRole] }
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

        const select = screen.getByTestId('select-assign-role') as HTMLSelectElement
        // Kiểm tra option hiển thị
        const optionsText = Array.from(select.options).map((o) => o.text)
        expect(optionsText.some((t) => t.includes('Quản lý đào tạo'))).toBe(true)

        fireEvent.change(select, { target: { value: '100' } })

        await waitFor(() => {
            expect(screen.getByTestId('role-success-banner')).toBeDefined()
        })

        expect(screen.getByText('Đã gán vai trò Quản lý đào tạo.')).toBeDefined()
        expect(screen.getByTestId('role-item-100')).toBeDefined()
        expect(screen.getByText('Quản lý đào tạo')).toBeDefined()
    })

    it('13. dropdown và danh sách vai trò chỉ hiển thị tiếng Việt thuần túy, KHÔNG chứa internal code (admin, trainer, trainee, consultant, training_manager)', async () => {
        const fullRolesList = [
            { id: 1, code: 'admin', name: 'Quản trị viên' },
            { id: 2, code: 'trainer', name: 'Giảng viên' },
            { id: 3, code: 'trainee', name: 'Học viên' },
            { id: 4, code: 'consultant', name: 'consultant' },
            { id: 5, code: 'training_manager', name: 'Quản lý đào tạo' },
            { id: 6, code: 'user', name: 'user' },
        ]

        const customRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/roles') && path.includes('/users/')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: {
                        user_id: 42,
                        roles: [{ id: 4, code: 'consultant', name: 'consultant' }],
                    }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.endsWith('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: fullRolesList }
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

        // Vai trò hiện tại của user không chứa mã kỹ thuật 'consultant'
        const currentRoleItem = screen.getByTestId('role-item-4')
        expect(currentRoleItem.textContent).toContain('Tư vấn tuyển sinh')
        expect(currentRoleItem.textContent).not.toContain('(consultant)')
        expect(currentRoleItem.textContent).not.toContain('consultant')

        // Dropdown không chứa internal code trong ngoặc đơn
        const select = screen.getByTestId('select-assign-role') as HTMLSelectElement
        const optionsText = Array.from(select.options).map((o) => o.text)

        expect(optionsText).toContain('-- Chọn vai trò để phân quyền --')
        expect(optionsText).toContain('Quản trị viên')
        expect(optionsText).toContain('Giảng viên')
        expect(optionsText).toContain('Học viên')
        expect(optionsText).toContain('Quản lý đào tạo')
        expect(optionsText).toContain('Người dùng')

        // Tuyệt đối không chứa internal code ở bất kỳ option nào
        for (const text of optionsText) {
            expect(text).not.toMatch(/\(admin\)|\(trainer\)|\(trainee\)|\(consultant\)|\(training_manager\)|\(user\)/)
        }
    })
})

