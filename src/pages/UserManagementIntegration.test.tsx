// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { UserManagementPage } from './UserManagementPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { User, UserListResponseData } from '../api/userApi'
import { useEffect, type ReactNode } from 'react'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockUsersPage1: User[] = [
    {
        id: 1,
        name: 'Nguyễn Văn Admin',
        email: 'admin@tms.local',
        phone: '0901234567',
        role: 'admin',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
    },
    {
        id: 2,
        name: 'Trần Thị Giảng Viên',
        email: 'trainer@tms.local',
        phone: '0907654321',
        role: 'trainer',
        status: 'active',
        created_at: '2026-01-02T00:00:00Z',
    },
]

const mockUsersPage2: User[] = [
    {
        id: 3,
        name: 'Lê Văn Học Viên',
        email: 'trainee@tms.local',
        phone: '0988112233',
        role: 'trainee',
        status: 'locked',
        created_at: '2026-01-03T00:00:00Z',
    },
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
        startSession({ accessToken: 'test-token', refreshToken: 'test-refresh' }, role)
    }, [role, startSession])

    if (!hasSession) {
        return <div>Initializing session...</div>
    }
    return <>{children}</>
}

function renderWithRole(
    ui: React.ReactNode,
    role: string = 'admin'
) {
    return render(
        <SessionProvider apiOrigin="http://127.0.0.1:5000">
            <RoleSessionWrapper role={role}>
                {ui}
            </RoleSessionWrapper>
        </SessionProvider>
    )
}

describe('SCRUM-94: User Management State & Integration', () => {
    it('1. tích hợp đầy đủ luồng: tải danh sách, hiển thị bộ lọc, bảng dữ liệu và phân trang', async () => {
        const mockResponseData: UserListResponseData = {
            items: mockUsersPage1,
            users: mockUsersPage1,
            page: 1,
            page_size: 20,
            total: 25,
            total_pages: 2,
        }

        const mockCustomRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                status: 'success',
                data: mockResponseData,
            }),
        } as unknown as Response)

        renderWithRole(<UserManagementPage customRequest={mockCustomRequest} />)

        await waitFor(() => {
            // Hiển thị bộ lọc
            expect(screen.getByTestId('user-filter-bar')).toBeDefined()
            // Hiển thị bảng dữ liệu
            expect(screen.getByTestId('user-table')).toBeDefined()
            expect(screen.getByText('Nguyễn Văn Admin')).toBeDefined()
            expect(screen.getByText('Trần Thị Giảng Viên')).toBeDefined()
            // Hiển thị phân trang
            expect(screen.getByTestId('user-pagination')).toBeDefined()
            expect(screen.getByText(/Hiển thị/)).toBeDefined()
            expect(screen.getByTestId('btn-page-1')).toBeDefined()
            expect(screen.getByTestId('btn-page-2')).toBeDefined()
        })
    })

    it('2. chuyển trang gọi API với số trang mới và giữ nguyên các tham số lọc', async () => {
        const mockCustomRequest = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: mockUsersPage1,
                        users: mockUsersPage1,
                        page: 1,
                        page_size: 20,
                        total: 25,
                        total_pages: 2,
                    },
                }),
            } as unknown as Response)
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: mockUsersPage2,
                        users: mockUsersPage2,
                        page: 2,
                        page_size: 20,
                        total: 25,
                        total_pages: 2,
                    },
                }),
            } as unknown as Response)

        renderWithRole(<UserManagementPage customRequest={mockCustomRequest} />)

        await waitFor(() => {
            expect(screen.getByTestId('btn-page-2')).toBeDefined()
        })

        const page2Btn = screen.getByTestId('btn-page-2')
        fireEvent.click(page2Btn)

        await waitFor(() => {
            expect(mockCustomRequest).toHaveBeenCalledTimes(2)
            const secondCallUrl = mockCustomRequest.mock.calls[1][0]
            expect(secondCallUrl).toContain('page=2')
            expect(screen.getByText('Lê Văn Học Viên')).toBeDefined()
        })
    })

    it('3. thay đổi bộ lọc hoặc tìm kiếm tự động đưa về trang 1', async () => {
        const mockCustomRequest = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: mockUsersPage1,
                        users: mockUsersPage1,
                        page: 1,
                        page_size: 20,
                        total: 25,
                        total_pages: 2,
                    },
                }),
            } as unknown as Response)
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: [mockUsersPage1[0]],
                        users: [mockUsersPage1[0]],
                        page: 1,
                        page_size: 20,
                        total: 1,
                        total_pages: 1,
                    },
                }),
            } as unknown as Response)

        renderWithRole(<UserManagementPage customRequest={mockCustomRequest} />)

        await waitFor(() => {
            expect(screen.getByTestId('filter-input-search')).toBeDefined()
        })

        const searchInput = screen.getByTestId('filter-input-search')
        fireEvent.change(searchInput, { target: { value: 'Admin' } })

        const submitFilterBtn = screen.getByTestId('btn-filter-submit')
        fireEvent.click(submitFilterBtn)

        await waitFor(() => {
            expect(mockCustomRequest).toHaveBeenCalledTimes(2)
            const secondCallUrl = mockCustomRequest.mock.calls[1][0]
            expect(secondCallUrl).toContain('page=1')
            expect(secondCallUrl).toContain('search=Admin')
        })
    })

    it('4. mở modal thêm người dùng, tạo thành công và cập nhật lại danh sách', async () => {
        const newUser: User = {
            id: 99,
            name: 'Nguyễn Văn Mới',
            email: 'moi.nguyen@tms.local',
            phone: '0933333333',
            role: 'trainer',
            status: 'active',
        }

        const mockCustomRequest = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: mockUsersPage1,
                        users: mockUsersPage1,
                        page: 1,
                        page_size: 20,
                        total: 2,
                        total_pages: 1,
                    },
                }),
            } as unknown as Response)
            .mockResolvedValueOnce({
                ok: true,
                status: 201,
                json: async () => ({
                    status: 'success',
                    data: newUser,
                }),
            } as unknown as Response)
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: [newUser, ...mockUsersPage1],
                        users: [newUser, ...mockUsersPage1],
                        page: 1,
                        page_size: 20,
                        total: 3,
                        total_pages: 1,
                    },
                }),
            } as unknown as Response)

        renderWithRole(<UserManagementPage customRequest={mockCustomRequest} />)

        await waitFor(() => {
            expect(screen.getByTestId('btn-create-user')).toBeDefined()
        })

        // Mở modal tạo
        fireEvent.click(screen.getByTestId('btn-create-user'))
        expect(screen.getByTestId('create-user-modal')).toBeDefined()

        // Nhập form
        fireEvent.change(screen.getByTestId('input-create-name'), { target: { value: 'Nguyễn Văn Mới' } })
        fireEvent.change(screen.getByTestId('input-create-email'), { target: { value: 'moi.nguyen@tms.local' } })
        fireEvent.change(screen.getByTestId('input-create-password'), { target: { value: 'Password123' } })
        fireEvent.change(screen.getByTestId('input-create-phone'), { target: { value: '0933333333' } })

        // Submit form
        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            // Modal đã đóng
            expect(screen.queryByTestId('create-user-modal')).toBeNull()
            // Danh sách đã cập nhật
            expect(screen.getByText('Nguyễn Văn Mới')).toBeDefined()
        })
    })

    it('5. mở modal chỉnh sửa từ bảng, cập nhật thành công và hiển thị thông tin mới', async () => {
        const updatedAdmin: User = {
            ...mockUsersPage1[0],
            name: 'Nguyễn Văn Admin Cập Nhật',
            phone: '0999999999',
        }

        const mockCustomRequest = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: mockUsersPage1,
                        users: mockUsersPage1,
                        page: 1,
                        page_size: 20,
                        total: 2,
                        total_pages: 1,
                    },
                }),
            } as unknown as Response)
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: updatedAdmin,
                }),
            } as unknown as Response)

        renderWithRole(<UserManagementPage customRequest={mockCustomRequest} />)

        await waitFor(() => {
            expect(screen.getByTestId('btn-edit-user-1')).toBeDefined()
        })

        // Bấm nút chỉnh sửa trên hàng user 1
        fireEvent.click(screen.getByTestId('btn-edit-user-1'))
        expect(screen.getByTestId('edit-user-modal')).toBeDefined()

        // Sửa tên
        fireEvent.change(screen.getByTestId('input-edit-name'), {
            target: { value: 'Nguyễn Văn Admin Cập Nhật' },
        })

        // Submit form chỉnh sửa
        fireEvent.click(screen.getByTestId('btn-submit-edit'))

        await waitFor(() => {
            expect(screen.queryByTestId('edit-user-modal')).toBeNull()
            expect(screen.getByText('Nguyễn Văn Admin Cập Nhật')).toBeDefined()
        })
    })

    it('6. hiển thị banner lỗi và nút Thử lại khi API gặp sự cố', async () => {
        const mockCustomRequest = vi
            .fn()
            .mockRejectedValueOnce(new Error('Máy chủ đang bận, vui lòng thử lại sau.'))
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: mockUsersPage1,
                        users: mockUsersPage1,
                        page: 1,
                        page_size: 20,
                        total: 2,
                        total_pages: 1,
                    },
                }),
            } as unknown as Response)

        renderWithRole(<UserManagementPage customRequest={mockCustomRequest} />)

        await waitFor(() => {
            expect(screen.getByTestId('user-error-state')).toBeDefined()
            expect(screen.getByText('Máy chủ đang bận, vui lòng thử lại sau.')).toBeDefined()
        })

        // Bấm nút thử lại
        const retryBtn = screen.getByTestId('btn-retry-users')
        fireEvent.click(retryBtn)

        await waitFor(() => {
            expect(screen.queryByTestId('user-error-state')).toBeNull()
            expect(screen.getByText('Nguyễn Văn Admin')).toBeDefined()
        })
    })

    it('7. trainer có quyền user.view nhưng không có user.manage: xem được bảng nhưng không thấy nút Thêm và Chỉnh sửa', async () => {
        const mockCustomRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                status: 'success',
                data: {
                    items: mockUsersPage1,
                    users: mockUsersPage1,
                    page: 1,
                    page_size: 20,
                    total: 2,
                    total_pages: 1,
                },
            }),
        } as unknown as Response)

        renderWithRole(<UserManagementPage customRequest={mockCustomRequest} />, 'trainer')

        await waitFor(() => {
            expect(screen.getByTestId('user-table')).toBeDefined()
            expect(screen.getByText('Nguyễn Văn Admin')).toBeDefined()
            // Không có nút Thêm người dùng
            expect(screen.queryByTestId('btn-create-user')).toBeNull()
            // Không có nút Chỉnh sửa
            expect(screen.queryByTestId('btn-edit-user-1')).toBeNull()
        })
    })
})
