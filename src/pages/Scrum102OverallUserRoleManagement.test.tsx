// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { UserManagementPage } from './UserManagementPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { RequirePermission } from '../auth/RequirePermission'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import type { User, RoleItem } from '../api/userApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockUsers: User[] = [
    {
        id: 1,
        name: 'Quản Trị Viên',
        email: 'admin@tms.local',
        phone: '0901234567',
        role: 'admin',
        status: 'active',
    },
    {
        id: 2,
        name: 'Giảng Viên Mẫu',
        email: 'trainer@tms.local',
        phone: '0912345678',
        role: 'trainer',
        status: 'active',
    },
]

const mockRolesList: RoleItem[] = [
    { id: 1, code: 'admin', name: 'Quản trị viên', description: 'Toàn quyền quản trị hệ thống' },
    { id: 2, code: 'trainer', name: 'Giảng viên', description: 'Quản lý khóa học và giảng dạy' },
    { id: 3, code: 'trainee', name: 'Học viên', description: 'Tham gia học tập' },
]

function RoleSessionWrapper({
    role = 'admin',
    children,
}: {
    role?: string
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        startSession({ accessToken: 'valid-access-token', refreshToken: 'valid-refresh-token' }, role)
    }, [role, startSession])

    if (!hasSession) {
        return <div>Initializing test session...</div>
    }
    return <>{children}</>
}

function renderAppWithRoute({
    role = 'admin',
    initialEntries = ['/users'],
    customRequest,
}: {
    role?: string
    initialEntries?: string[]
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>
}) {
    return render(
        <SessionProvider apiOrigin="http://127.0.0.1:5000">
            <RoleSessionWrapper role={role}>
                <MemoryRouter initialEntries={initialEntries}>
                    <Routes>
                        <Route
                            element={
                                <RequirePermission
                                    requiredRole="admin"
                                    requiredPermission={SYSTEM_PERMISSIONS.USER_VIEW}
                                    fallbackPath="/forbidden"
                                />
                            }
                        >
                            <Route path="/users" element={<UserManagementPage customRequest={customRequest} />} />
                        </Route>
                        <Route path="/forbidden" element={<div data-testid="page-forbidden">403 - Bạn không có quyền truy cập</div>} />
                        <Route path="/login" element={<div data-testid="page-login">Trang Đăng Nhập</div>} />
                    </Routes>
                </MemoryRouter>
            </RoleSessionWrapper>
        </SessionProvider>
    )
}

describe('SCRUM-102: Frontend Overall User Role Management Matrix', () => {
    // 17. user role display: hiển thị vai trò trong bảng và trong modal
    it('17. hiển thị vai trò người dùng trên bảng và mở modal xem chi tiết vai trò', async () => {
        const customRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/api/users') && !path.includes('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockUsers, total: mockUsers.length, page: 1, page_size: 20 },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.includes('/users/2/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: {
                        user_id: 2,
                        roles: [{ id: 2, code: 'trainer', name: 'Giảng viên' }],
                    },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.endsWith('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockRolesList },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            return Promise.reject(new Error(`Unhandled: ${path}`))
        })

        renderAppWithRoute({ role: 'admin', customRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-manage-role-2')).toBeDefined()
        })

        // Bấm nút Vai trò trên dòng user #2
        fireEvent.click(screen.getByTestId('btn-manage-role-2'))

        await waitFor(() => {
            expect(screen.getByTestId('user-role-modal')).toBeDefined()
        })
        expect(screen.getByText('Quản lý vai trò người dùng')).toBeDefined()
        expect(screen.getByTestId('role-user-info').textContent).toContain('Giảng Viên Mẫu')
        expect(screen.getByTestId('role-item-2')).toBeDefined()
    })

    // 18. role list: danh mục vai trò hợp lệ được tải và render vào dropdown
    it('18. danh mục vai trò hợp lệ được tải từ API và hiển thị trong danh sách lựa chọn', async () => {
        const customRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/api/users') && !path.includes('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockUsers, total: mockUsers.length, page: 1, page_size: 20 },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.includes('/users/2/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { user_id: 2, roles: [{ id: 2, code: 'trainer', name: 'Giảng viên' }] },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.endsWith('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockRolesList },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            return Promise.reject(new Error(`Unhandled: ${path}`))
        })

        renderAppWithRoute({ role: 'admin', customRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-manage-role-2')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-manage-role-2'))

        await waitFor(() => {
            expect(screen.getByTestId('select-assign-role')).toBeDefined()
        })

        const select = screen.getByTestId('select-assign-role') as HTMLSelectElement
        // Role 2 đã gán, các role chưa gán là 1 (admin) và 3 (trainee)
        const optionValues = Array.from(select.options).map((opt) => opt.value)
        expect(optionValues).toContain('1')
        expect(optionValues).toContain('3')
        expect(optionValues).not.toContain('2')
    })

    // 19. assign role: phân vai trò mới thành công
    it('19. thực hiện phân vai trò mới thành công cho người dùng', async () => {
        const customRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (init?.method === 'POST' && path.includes('/users/2/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: {
                        user_id: 2,
                        role: { id: 1, code: 'admin', name: 'Quản trị viên' },
                    },
                }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.includes('/api/users') && !path.includes('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockUsers, total: mockUsers.length, page: 1, page_size: 20 },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.includes('/users/2/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { user_id: 2, roles: [{ id: 2, code: 'trainer', name: 'Giảng viên' }] },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.endsWith('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockRolesList },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            return Promise.reject(new Error(`Unhandled: ${path}`))
        })

        renderAppWithRoute({ role: 'admin', customRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-manage-role-2')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-manage-role-2'))

        await waitFor(() => {
            expect(screen.getByTestId('select-assign-role')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('select-assign-role'), { target: { value: '1' } })
        fireEvent.click(screen.getByTestId('btn-assign-role-submit'))

        await waitFor(() => {
            expect(screen.getByTestId('role-success-banner')).toBeDefined()
        })
        expect(screen.getByText(/Đã gán vai trò "Quản trị viên" cho người dùng/)).toBeDefined()
    })

    // 20. revoke role: gỡ vai trò thành công
    it('20. thực hiện gỡ vai trò thành công khi người dùng xác nhận', async () => {
        const customRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (init?.method === 'DELETE' && path.includes('/users/2/roles/2')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { user_id: 2, role_id: 2, role_code: 'trainer' },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.includes('/api/users') && !path.includes('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockUsers, total: mockUsers.length, page: 1, page_size: 20 },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.includes('/users/2/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { user_id: 2, roles: [{ id: 2, code: 'trainer', name: 'Giảng viên' }] },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.endsWith('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockRolesList },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            return Promise.reject(new Error(`Unhandled: ${path}`))
        })

        renderAppWithRoute({ role: 'admin', customRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-manage-role-2')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-manage-role-2'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-revoke-role-2')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-revoke-role-2'))

        await waitFor(() => {
            expect(screen.getByTestId('role-success-banner')).toBeDefined()
        })
        expect(screen.getByText(/Đã gỡ vai trò "Giảng viên" khỏi người dùng/)).toBeDefined()
    })

    // 21. duplicate response: xử lý lỗi 409 conflict
    it('21. xử lý lỗi trùng vai trò khi nhận phản hồi 409 DUPLICATE_ROLE_ASSIGNMENT', async () => {
        const customRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (init?.method === 'POST' && path.includes('/users/2/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'error',
                    code: 'DUPLICATE_ROLE_ASSIGNMENT',
                    message: 'Người dùng đã có vai trò này.',
                }), { status: 409, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.includes('/api/users') && !path.includes('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockUsers, total: mockUsers.length, page: 1, page_size: 20 },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.includes('/users/2/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { user_id: 2, roles: [] },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.endsWith('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockRolesList },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            return Promise.reject(new Error(`Unhandled: ${path}`))
        })

        renderAppWithRoute({ role: 'admin', customRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-manage-role-2')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-manage-role-2'))

        await waitFor(() => {
            expect(screen.getByTestId('select-assign-role')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('select-assign-role'), { target: { value: '2' } })
        fireEvent.click(screen.getByTestId('btn-assign-role-submit'))

        await waitFor(() => {
            expect(screen.getByTestId('role-error-banner')).toBeDefined()
        })
        expect(screen.getByText('Người dùng đã được gán vai trò này.')).toBeDefined()
    })

    // 22. error state: hiển thị banner lỗi rõ ràng
    it('22. hiển thị thông báo lỗi khi API vai trò bị lỗi hệ thống', async () => {
        const customRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/api/users') && !path.includes('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockUsers, total: mockUsers.length, page: 1, page_size: 20 },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.includes('/users/2/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'error',
                    code: 'SERVER_ERROR',
                    message: 'Lỗi máy chủ khi tải vai trò.',
                }), { status: 500, headers: { 'Content-Type': 'application/json' } }))
            }
            return Promise.resolve(new Response(JSON.stringify({
                status: 'success',
                data: { items: mockRolesList },
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        })

        renderAppWithRoute({ role: 'admin', customRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-manage-role-2')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-manage-role-2'))

        await waitFor(() => {
            expect(screen.getByTestId('role-error-banner')).toBeDefined()
        })
        expect(screen.getByText('Lỗi máy chủ khi tải vai trò.')).toBeDefined()
    })

    // 23. loading state: spinner hiển thị trong lúc tải dữ liệu
    it('23. hiển thị trạng thái loading spinner khi mở modal tải vai trò', async () => {
        const customRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/api/users') && !path.includes('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockUsers, total: mockUsers.length, page: 1, page_size: 20 },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            // Trả về promise chưa resolve để giữ modal ở trạng thái loading
            return new Promise(() => {})
        })

        renderAppWithRoute({ role: 'admin', customRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-manage-role-2')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-manage-role-2'))

        await waitFor(() => {
            expect(screen.getByTestId('role-loading-state')).toBeDefined()
        })
        expect(screen.getByText('Đang tải danh sách vai trò...')).toBeDefined()
    })

    // 24. permission guard: Trainer không có quyền quản lý người dùng -> truy cập /users bị chuyển về /forbidden (403)
    it('24. Trainer truy cập trực tiếp /users bị từ chối 403 và chuyển về /forbidden', async () => {
        renderAppWithRoute({ role: 'trainer' })

        await waitFor(() => {
            expect(screen.getByTestId('page-forbidden')).toBeDefined()
            expect(screen.getByText(/403 - Bạn không có quyền truy cập/)).toBeDefined()
            expect(screen.queryByTestId('user-management-page')).toBeNull()
        })
    })

    // 25. responsive 360px layout
    it('25. bảng và modal có các lớp CSS và cấu trúc cuộn hỗ trợ responsive 360px', async () => {
        const customRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/api/users') && !path.includes('/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { items: mockUsers, total: mockUsers.length, page: 1, page_size: 20 },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            if (path.includes('/users/1/roles')) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    data: { user_id: 1, roles: [{ id: 1, code: 'admin', name: 'Quản trị viên' }] },
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            }
            return Promise.resolve(new Response(JSON.stringify({
                status: 'success',
                data: { items: mockRolesList },
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        })

        renderAppWithRoute({ role: 'admin', customRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-manage-role-1')).toBeDefined()
        })

        // Container cuộn ngang trên mobile
        const scrollWrapper = screen.getByLabelText('Bảng dữ liệu người dùng')
        expect(scrollWrapper.className).toContain('user-table-scroll-wrapper')

        // Mở modal kiểm tra cấu trúc
        fireEvent.click(screen.getByTestId('btn-manage-role-1'))

        await waitFor(() => {
            expect(screen.getByTestId('user-role-modal')).toBeDefined()
        })
        const modal = screen.getByTestId('user-role-modal')
        expect(modal.className).toContain('role-modal-container')
    })
})
