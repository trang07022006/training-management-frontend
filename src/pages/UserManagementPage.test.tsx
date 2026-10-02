// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { UserManagementPage } from './UserManagementPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { RequirePermission } from '../auth/RequirePermission'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import type { User } from '../api/userApi'

afterEach(() => {
    cleanup()
})

const mockUsers: User[] = [
    {
        id: 'u-1',
        name: 'Nguyễn Văn A',
        email: 'a@daotao.edu.vn',
        phone: '0912345678',
        role: 'trainer',
        status: 'active',
    },
    {
        id: 'u-2',
        name: 'Trần Thị B',
        email: 'b@daotao.edu.vn',
        phone: '0987654321',
        role: 'trainee',
        status: 'locked',
    },
]

function RoleSessionWrapper({
    role,
    children,
}: {
    role?: string | null
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        if (role !== undefined) {
            startSession({ accessToken: 'test-token', refreshToken: 'test-refresh' }, role)
        }
    }, [role, startSession])

    if (role !== undefined && !hasSession) {
        return <div>Initializing session...</div>
    }

    return <>{children}</>
}

function renderWithSession(
    ui: React.ReactNode,
    options: {
        role?: string
    } = {},
) {
    const { role = 'admin' } = options

    return render(
        <MemoryRouter>
            <SessionProvider apiOrigin="http://localhost:5000">
                <RoleSessionWrapper role={role}>
                    {ui}
                </RoleSessionWrapper>
            </SessionProvider>
        </MemoryRouter>,
    )
}

describe('SCRUM-89: User Management Page', () => {
    it('1. render page với đầy đủ tiêu đề, mô tả và cấu trúc chính', async () => {
        renderWithSession(
            <UserManagementPage initialUsers={mockUsers} initialTotal={2} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('user-management-page')).toBeDefined()
        })
        expect(screen.getByRole('heading', { level: 1 })).toBeDefined()
        expect(screen.getByText('Quản lý người dùng')).toBeDefined()
        expect(screen.getByText(/Xem danh sách, tìm kiếm, tạo mới/)).toBeDefined()
        expect(screen.getByTestId('user-search-filter-section')).toBeDefined()
        expect(screen.getByTestId('user-table-section')).toBeDefined()
        expect(screen.getByTestId('user-pagination-section')).toBeDefined()
    })

    it('2. permission guard: người dùng không có quyền bị chặn, người có quyền được vào', async () => {
        render(
            <MemoryRouter initialEntries={['/users']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainee">
                        <Routes>
                            <Route
                                element={
                                    <RequirePermission
                                        requiredPermission={SYSTEM_PERMISSIONS.USER_VIEW}
                                        fallbackPath="/forbidden"
                                    />
                                }
                            >
                                <Route path="/users" element={<UserManagementPage initialUsers={[]} />} />
                            </Route>
                            <Route path="/forbidden" element={<div data-testid="forbidden-page">Truy cập bị từ chối</div>} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('forbidden-page')).toBeDefined()
        })
        expect(screen.queryByTestId('user-management-page')).toBeNull()
    })

    it('3. hiển thị trạng thái loading khi đang tải danh sách người dùng', async () => {
        const customRequest = vi.fn().mockImplementation(() => new Promise(() => {}))

        renderWithSession(
            <UserManagementPage customRequest={customRequest} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('user-loading-state')).toBeDefined()
        })
        expect(screen.getByText('Đang tải danh sách người dùng...')).toBeDefined()
    })

    it('4. hiển thị trạng thái error khi API gặp sự cố và hỗ trợ nút Thử lại', async () => {
        const customRequest = vi.fn().mockRejectedValue(new Error('Lỗi kết nối máy chủ.'))

        renderWithSession(
            <UserManagementPage customRequest={customRequest} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('user-error-state')).toBeDefined()
        })
        expect(screen.getByText('Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối và thử lại.')).toBeDefined()

        const retryBtn = screen.getByTestId('btn-retry-users')
        expect(retryBtn).toBeDefined()
        fireEvent.click(retryBtn)
        await waitFor(() => {
            expect(customRequest).toHaveBeenCalledTimes(2)
        })
    })

    it('5. hiển thị trạng thái empty khi danh sách rỗng', async () => {
        renderWithSession(
            <UserManagementPage initialUsers={[]} initialTotal={0} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('user-empty-state')).toBeDefined()
        })
        expect(screen.getByText('Không tìm thấy người dùng')).toBeDefined()
    })

    it('6. nút tạo người dùng chỉ hiển thị khi có quyền user.manage', async () => {
        // 1. Admin có quyền user.manage -> hiển thị nút
        const { unmount } = renderWithSession(
            <UserManagementPage initialUsers={mockUsers} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-create-user')).toBeDefined()
        })
        unmount()

        // 2. Trainer có user.view nhưng không có user.manage -> không hiển thị nút tạo
        renderWithSession(
            <UserManagementPage initialUsers={mockUsers} />,
            { role: 'trainer' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('user-management-page')).toBeDefined()
        })
        expect(screen.queryByTestId('btn-create-user')).toBeNull()
    })

    it('7. bấm nút Vai trò trên dòng người dùng mở modal quản lý vai trò', async () => {
        renderWithSession(
            <UserManagementPage initialUsers={mockUsers} initialTotal={mockUsers.length} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-manage-role-u-1')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-manage-role-u-1'))

        await waitFor(() => {
            expect(screen.getByTestId('user-role-modal')).toBeDefined()
        })
        expect(screen.getByText('Quản lý vai trò người dùng')).toBeDefined()
    })
})
