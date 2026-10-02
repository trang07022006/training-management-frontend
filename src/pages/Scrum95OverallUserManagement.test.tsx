// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
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
    vi.restoreAllMocks()
})

const mockAdminUser: User = {
    id: 1,
    name: 'Quản Trị Viên Hệ Thống',
    email: 'admin@tms.local',
    phone: '0901234567',
    role: 'admin',
    status: 'active',
}

const mockTrainerUser: User = {
    id: 2,
    name: 'Giảng Viên Cao Cấp',
    email: 'trainer@tms.local',
    phone: null,
    role: 'trainer',
    status: 'active',
}

const mockTraineeUser: User = {
    id: 3,
    name: 'Học Viên Mẫu',
    email: 'trainee@tms.local',
    phone: '0988776655',
    role: 'trainee',
    status: 'locked',
}

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

describe('SCRUM-95: Test Tổng Thể Giao Diện Quản Trị Người Dùng (Overall Test Matrix)', () => {
    // ========================================================
    // A. View & Render Matrix
    // ========================================================
    describe('A. View & Render Matrix', () => {
        it('1. Admin vào /users thấy đầy đủ header, action, filter, table, pagination', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: [mockAdminUser, mockTrainerUser],
                        users: [mockAdminUser, mockTrainerUser],
                        page: 1,
                        page_size: 20,
                        total: 2,
                        total_pages: 1,
                    },
                }),
            } as unknown as Response)

            renderAppWithRoute({ role: 'admin', customRequest: mockCustomRequest })

            await waitFor(() => {
                expect(screen.getByRole('heading', { level: 1 })).toBeDefined()
                expect(screen.getByText('Quản lý người dùng')).toBeDefined()
                expect(screen.getByTestId('btn-create-user')).toBeDefined()
                expect(screen.getByTestId('user-filter-bar')).toBeDefined()
                expect(screen.getByTestId('user-table')).toBeDefined()
                expect(screen.getByTestId('user-pagination')).toBeDefined()
            })
        })

        it('2. Trainer truy cập trực tiếp /users bị từ chối 403 và chuyển về /forbidden', async () => {
            renderAppWithRoute({ role: 'trainer' })

            await waitFor(() => {
                expect(screen.getByTestId('page-forbidden')).toBeDefined()
                expect(screen.getByText(/403 - Bạn không có quyền truy cập/)).toBeDefined()
                expect(screen.queryByTestId('user-management-page')).toBeNull()
            })
        })

        it('3. Trainee không có quyền user.view truy cập /users bị chuyển về /forbidden', async () => {
            renderAppWithRoute({ role: 'trainee' })

            await waitFor(() => {
                expect(screen.getByTestId('page-forbidden')).toBeDefined()
                expect(screen.getByText(/403 - Bạn không có quyền truy cập/)).toBeDefined()
                expect(screen.queryByTestId('user-management-page')).toBeNull()
            })
        })
    })

    // ========================================================
    // B. Filter & Search Matrix
    // ========================================================
    describe('B. Filter & Search Matrix', () => {
        it('4. Tìm kiếm theo tên/email/phone gửi query params đúng chuẩn', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: [mockAdminUser],
                        users: [mockAdminUser],
                        page: 1,
                        page_size: 20,
                        total: 1,
                        total_pages: 1,
                    },
                }),
            } as unknown as Response)

            renderAppWithRoute({ role: 'admin', customRequest: mockCustomRequest })

            await waitFor(() => {
                expect(screen.getByTestId('filter-input-search')).toBeDefined()
            })

            const searchInput = screen.getByTestId('filter-input-search')
            fireEvent.change(searchInput, { target: { value: '  admin@tms.local  ' } })

            fireEvent.click(screen.getByTestId('btn-filter-submit'))

            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledTimes(2)
                const secondCallUrl = mockCustomRequest.mock.calls[1][0]
                expect(secondCallUrl).toContain('search=admin%40tms.local')
            })
        })

        it('5. Lọc theo vai trò và trạng thái kích hoạt gọi API lọc ngay lập tức', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: [mockTrainerUser],
                        users: [mockTrainerUser],
                        page: 1,
                        page_size: 20,
                        total: 1,
                        total_pages: 1,
                    },
                }),
            } as unknown as Response)

            renderAppWithRoute({ role: 'admin', customRequest: mockCustomRequest })

            await waitFor(() => {
                expect(screen.getByTestId('filter-select-role')).toBeDefined()
            })

            // Chọn vai trò trainer
            fireEvent.change(screen.getByTestId('filter-select-role'), { target: { value: 'trainer' } })

            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledTimes(2)
                expect(mockCustomRequest.mock.calls[1][0]).toContain('role=trainer')
            })

            // Chọn trạng thái locked
            fireEvent.change(screen.getByTestId('filter-select-status'), { target: { value: 'locked' } })

            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledTimes(3)
                expect(mockCustomRequest.mock.calls[2][0]).toContain('status=locked')
            })
        })

        it('6. Đặt lại bộ lọc xóa sạch tiêu chí và gọi lại API với giá trị mặc định', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: [mockAdminUser, mockTrainerUser],
                        users: [mockAdminUser, mockTrainerUser],
                        page: 1,
                        page_size: 20,
                        total: 2,
                        total_pages: 1,
                    },
                }),
            } as unknown as Response)

            renderAppWithRoute({ role: 'admin', customRequest: mockCustomRequest })

            await waitFor(() => {
                expect(screen.getByTestId('btn-filter-reset')).toBeDefined()
            })

            // Bấm reset
            fireEvent.click(screen.getByTestId('btn-filter-reset'))

            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledTimes(2)
                const secondCallUrl = mockCustomRequest.mock.calls[1][0]
                expect(secondCallUrl).toContain('page=1')
                expect(secondCallUrl).not.toContain('search=')
                expect(secondCallUrl).not.toContain('role=')
            })
        })
    })

    // ========================================================
    // C. Create User Modal Matrix
    // ========================================================
    describe('C. Create User Modal Matrix', () => {
        it('7. Validate required fields và toggle password', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: [],
                        users: [],
                        page: 1,
                        page_size: 20,
                        total: 0,
                        total_pages: 1,
                    },
                }),
            } as unknown as Response)

            renderAppWithRoute({ role: 'admin', customRequest: mockCustomRequest })

            await waitFor(() => {
                expect(screen.getByTestId('btn-create-user')).toBeDefined()
            })

            fireEvent.click(screen.getByTestId('btn-create-user'))
            expect(screen.getByTestId('create-user-modal')).toBeDefined()

            // Thử submit trống
            fireEvent.click(screen.getByTestId('btn-submit-create'))

            await waitFor(() => {
                expect(screen.getByText('Họ và tên không được để trống.')).toBeDefined()
                expect(screen.getByText('Email không được để trống.')).toBeDefined()
                expect(screen.getByText('Mật khẩu không được để trống.')).toBeDefined()
            })

            // Toggle password
            const passwordInput = screen.getByTestId('input-create-password') as HTMLInputElement
            expect(passwordInput.type).toBe('password')
            fireEvent.click(screen.getByTestId('btn-toggle-create-password'))
            expect(passwordInput.type).toBe('text')
        })

        it('8. Xử lý trùng email 409 DUPLICATE_EMAIL hiển thị rõ ràng trên ô email', async () => {
            const mockCustomRequest = vi
                .fn()
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        status: 'success',
                        data: { items: [], users: [], page: 1, page_size: 20, total: 0, total_pages: 1 },
                    }),
                } as unknown as Response)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 409,
                    json: async () => ({
                        status: 'error',
                        code: 'DUPLICATE_EMAIL',
                        message: 'Email đã được sử dụng.',
                    }),
                } as unknown as Response)

            renderAppWithRoute({ role: 'admin', customRequest: mockCustomRequest })

            await waitFor(() => {
                expect(screen.getByTestId('btn-create-user')).toBeDefined()
            })

            fireEvent.click(screen.getByTestId('btn-create-user'))

            fireEvent.change(screen.getByTestId('input-create-name'), { target: { value: 'User Trùng' } })
            fireEvent.change(screen.getByTestId('input-create-email'), { target: { value: 'duplicate@tms.local' } })
            fireEvent.change(screen.getByTestId('input-create-password'), { target: { value: 'Password123' } })

            fireEvent.click(screen.getByTestId('btn-submit-create'))

            await waitFor(() => {
                expect(screen.getByTestId('error-create-email')).toBeDefined()
                expect(screen.getByText('Email này đã được sử dụng.')).toBeDefined()
            })
        })
    })

    // ========================================================
    // D. Edit User Modal Matrix
    // ========================================================
    describe('D. Edit User Modal Matrix', () => {
        it('9. Preload thông tin, vai trò là read-only, không có ô mật khẩu, cập nhật thành công', async () => {
            const mockCustomRequest = vi
                .fn()
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        status: 'success',
                        data: {
                            items: [mockTraineeUser],
                            users: [mockTraineeUser],
                            page: 1,
                            page_size: 20,
                            total: 1,
                            total_pages: 1,
                        },
                    }),
                } as unknown as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        status: 'success',
                        data: {
                            ...mockTraineeUser,
                            name: 'Học Viên Mẫu Đã Cập Nhật',
                            status: 'active',
                        },
                    }),
                } as unknown as Response)

            renderAppWithRoute({ role: 'admin', customRequest: mockCustomRequest })

            await waitFor(() => {
                expect(screen.getByTestId('btn-edit-user-3')).toBeDefined()
            })

            fireEvent.click(screen.getByTestId('btn-edit-user-3'))

            // Kiểm tra modal
            expect(screen.getByTestId('edit-user-modal')).toBeDefined()
            // Không có mật khẩu
            expect(screen.queryByLabelText(/Mật khẩu/i)).toBeNull()
            // Role là read-only
            const roleInput = screen.getByTestId('input-edit-role-readonly') as HTMLInputElement
            expect(roleInput.disabled).toBe(true)
            expect(roleInput.value).toBe('Học viên')

            // Thay đổi họ tên và trạng thái
            fireEvent.change(screen.getByTestId('input-edit-name'), {
                target: { value: 'Học Viên Mẫu Đã Cập Nhật' },
            })
            fireEvent.change(screen.getByTestId('select-edit-status'), {
                target: { value: 'active' },
            })

            fireEvent.click(screen.getByTestId('btn-submit-edit'))

            await waitFor(() => {
                expect(screen.queryByTestId('edit-user-modal')).toBeNull()
                expect(screen.getByText('Học Viên Mẫu Đã Cập Nhật')).toBeDefined()
            })
        })
    })

    // ========================================================
    // E. Pagination & State Matrix
    // ========================================================
    describe('E. Pagination & State Matrix', () => {
        it('10. Hiển thị thông số 20 bản ghi/trang và chuyển trang mượt mà', async () => {
            const page1Data: User[] = Array.from({ length: 20 }, (_, idx) => ({
                id: idx + 1,
                name: `User ${idx + 1}`,
                email: `user${idx + 1}@tms.local`,
                role: 'user',
                status: 'active',
            }))

            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: page1Data,
                        users: page1Data,
                        page: 1,
                        page_size: 20,
                        total: 35,
                        total_pages: 2,
                    },
                }),
            } as unknown as Response)

            renderAppWithRoute({ role: 'admin', customRequest: mockCustomRequest })

            await waitFor(() => {
                const infoEl = screen.getByTestId('pagination-info')
                expect(infoEl).toBeDefined()
                expect(infoEl.textContent).toContain('Hiển thị 1 - 20 trên tổng số 35 người dùng')
            })
        })

        it('11. Hiển thị empty state card khi không có bản ghi nào', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: [],
                        users: [],
                        page: 1,
                        page_size: 20,
                        total: 0,
                        total_pages: 0,
                    },
                }),
            } as unknown as Response)

            renderAppWithRoute({ role: 'admin', customRequest: mockCustomRequest })

            await waitFor(() => {
                expect(screen.getByTestId('user-empty-state')).toBeDefined()
                expect(screen.getByText('Không tìm thấy người dùng')).toBeDefined()
            })
        })
    })

    // ========================================================
    // F. Error & Session Matrix
    // ========================================================
    describe('F. Error & Session Matrix', () => {
        it('12. Hiển thị banner lỗi khi API gặp sự cố và cho phép phục hồi bằng nút Thử lại', async () => {
            const mockCustomRequest = vi
                .fn()
                .mockRejectedValueOnce(new Error('Lỗi kết nối máy chủ đào tạo.'))
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        status: 'success',
                        data: {
                            items: [mockAdminUser],
                            users: [mockAdminUser],
                            page: 1,
                            page_size: 20,
                            total: 1,
                            total_pages: 1,
                        },
                    }),
                } as unknown as Response)

            renderAppWithRoute({ role: 'admin', customRequest: mockCustomRequest })

            await waitFor(() => {
                expect(screen.getByTestId('user-error-state')).toBeDefined()
                expect(screen.getByText('Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối và thử lại.')).toBeDefined()
            })

            fireEvent.click(screen.getByTestId('btn-retry-users'))

            await waitFor(() => {
                expect(screen.queryByTestId('user-error-state')).toBeNull()
                expect(screen.getByText('Quản Trị Viên Hệ Thống')).toBeDefined()
            })
        })
    })
})
