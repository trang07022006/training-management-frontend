// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import { UserManagementPage } from './UserManagementPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { User, UserListResponseData } from '../api/userApi'

afterEach(() => {
    cleanup()
})

const mock11Users: User[] = Array.from({ length: 11 }, (_, idx) => ({
    id: idx + 1,
    name: `User ${idx + 1}`,
    email: `user${idx + 1}@tms.local`,
    phone: `090000000${idx}`,
    role: idx < 3 ? 'trainee' : 'user',
    status: 'active',
}))

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

function renderWithAdmin(ui: ReactNode) {
    return render(
        <SessionProvider apiOrigin="http://127.0.0.1:5000">
            <RoleSessionWrapper role="admin">
                {ui}
            </RoleSessionWrapper>
        </SessionProvider>
    )
}

describe('SCRUM-25 Integration: User Management Pagination (10 users / page)', () => {
    it('1. Trang 1 hiển thị 10 user đầu, gọi API với page=1&page_size=10, Trước disabled, Sau enabled', async () => {
        const page1Response: UserListResponseData = {
            items: mock11Users.slice(0, 10),
            users: mock11Users.slice(0, 10),
            page: 1,
            page_size: 10,
            total: 11,
            total_pages: 2,
        }

        const mockCustomRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                status: 'success',
                data: page1Response,
            }),
        } as unknown as Response)

        renderWithAdmin(<UserManagementPage customRequest={mockCustomRequest} />)

        await waitFor(() => {
            expect(mockCustomRequest).toHaveBeenCalledTimes(1)
            const firstCallUrl = mockCustomRequest.mock.calls[0][0]
            expect(firstCallUrl).toContain('page=1')
            expect(firstCallUrl).toContain('page_size=10')

            // Kiểm tra hiển thị thông tin
            const infoEl = screen.getByTestId('pagination-info')
            expect(infoEl.textContent).toBe('Hiển thị 1 - 10 trên tổng số 11 người dùng')

            // Nút điều hướng
            const prevBtn = screen.getByTestId('btn-pagination-prev') as HTMLButtonElement
            const nextBtn = screen.getByTestId('btn-pagination-next') as HTMLButtonElement
            expect(prevBtn.disabled).toBe(true)
            expect(nextBtn.disabled).toBe(false)

            // Hiển thị đúng 10 hàng
            expect(screen.getByText('User 1')).toBeDefined()
            expect(screen.getByText('User 10')).toBeDefined()
            expect(screen.queryByText('User 11')).toBeNull()
        })
    })

    it('2. Chuyển trang: Click Sau -> Trang 2 hiển thị 1 user còn lại, Trước enabled, Sau disabled', async () => {
        const page1Response: UserListResponseData = {
            items: mock11Users.slice(0, 10),
            users: mock11Users.slice(0, 10),
            page: 1,
            page_size: 10,
            total: 11,
            total_pages: 2,
        }

        const page2Response: UserListResponseData = {
            items: mock11Users.slice(10, 11),
            users: mock11Users.slice(10, 11),
            page: 2,
            page_size: 10,
            total: 11,
            total_pages: 2,
        }

        const mockCustomRequest = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ status: 'success', data: page1Response }),
            } as unknown as Response)
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ status: 'success', data: page2Response }),
            } as unknown as Response)

        renderWithAdmin(<UserManagementPage customRequest={mockCustomRequest} />)

        await waitFor(() => {
            expect(screen.getByTestId('btn-pagination-next')).toBeDefined()
        })

        // Bấm nút Sau
        const nextBtn = screen.getByTestId('btn-pagination-next')
        fireEvent.click(nextBtn)

        await waitFor(() => {
            expect(mockCustomRequest).toHaveBeenCalledTimes(2)
            const secondCallUrl = mockCustomRequest.mock.calls[1][0]
            expect(secondCallUrl).toContain('page=2')
            expect(secondCallUrl).toContain('page_size=10')

            // Info trên trang 2
            const infoEl = screen.getByTestId('pagination-info')
            expect(infoEl.textContent).toBe('Hiển thị 11 - 11 trên tổng số 11 người dùng')

            const prevBtn = screen.getByTestId('btn-pagination-prev') as HTMLButtonElement
            const updatedNextBtn = screen.getByTestId('btn-pagination-next') as HTMLButtonElement
            expect(prevBtn.disabled).toBe(false)
            expect(updatedNextBtn.disabled).toBe(true)

            expect(screen.getByText('User 11')).toBeDefined()
            expect(screen.queryByText('User 1')).toBeNull()
        })
    })

    it('3. Khi tìm kiếm hoặc lọc, phân trang tự động reset về page=1', async () => {
        const mockCustomRequest = vi
            .fn()
            .mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: [mock11Users[0]],
                        users: [mock11Users[0]],
                        page: 1,
                        page_size: 10,
                        total: 1,
                        total_pages: 1,
                    },
                }),
            } as unknown as Response)

        renderWithAdmin(<UserManagementPage customRequest={mockCustomRequest} />)

        await waitFor(() => {
            expect(screen.getByTestId('filter-input-search')).toBeDefined()
        })

        // Nhập tìm kiếm và submit
        const searchInput = screen.getByTestId('filter-input-search')
        fireEvent.change(searchInput, { target: { value: 'User 1' } })
        fireEvent.click(screen.getByTestId('btn-filter-submit'))

        await waitFor(() => {
            const lastCallUrl = mockCustomRequest.mock.calls[mockCustomRequest.mock.calls.length - 1][0]
            expect(lastCallUrl).toContain('page=1')
            expect(lastCallUrl).toContain('search=User+1')
        })

        // Lọc vai trò trainee
        fireEvent.change(screen.getByTestId('filter-select-role'), { target: { value: 'trainee' } })

        await waitFor(() => {
            const lastCallUrl = mockCustomRequest.mock.calls[mockCustomRequest.mock.calls.length - 1][0]
            expect(lastCallUrl).toContain('page=1')
            expect(lastCallUrl).toContain('role=trainee')
        })

        // Lọc trạng thái active
        fireEvent.change(screen.getByTestId('filter-select-status'), { target: { value: 'active' } })

        await waitFor(() => {
            const lastCallUrl = mockCustomRequest.mock.calls[mockCustomRequest.mock.calls.length - 1][0]
            expect(lastCallUrl).toContain('page=1')
            expect(lastCallUrl).toContain('status=active')
        })
    })

    it('4. Khi bấm Đặt lại, reset toàn bộ bộ lọc và quay về page=1', async () => {
        const mockCustomRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                status: 'success',
                data: {
                    items: mock11Users.slice(0, 10),
                    users: mock11Users.slice(0, 10),
                    page: 1,
                    page_size: 10,
                    total: 11,
                    total_pages: 2,
                },
            }),
        } as unknown as Response)

        renderWithAdmin(<UserManagementPage customRequest={mockCustomRequest} />)

        await waitFor(() => {
            expect(screen.getByTestId('btn-filter-reset')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-filter-reset'))

        await waitFor(() => {
            const lastCallUrl = mockCustomRequest.mock.calls[mockCustomRequest.mock.calls.length - 1][0]
            expect(lastCallUrl).toContain('page=1')
            expect(lastCallUrl).not.toContain('search=')
            expect(lastCallUrl).not.toContain('role=')
            expect(lastCallUrl).not.toContain('status=')
        })
    })

    it('5. Lọc kết quả còn 3 user -> chỉ 1 trang, nút Sau disabled', async () => {
        const trainee3Users = mock11Users.slice(0, 3)
        const mockCustomRequest = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                status: 'success',
                data: {
                    items: trainee3Users,
                    users: trainee3Users,
                    page: 1,
                    page_size: 10,
                    total: 3,
                    total_pages: 1,
                },
            }),
        } as unknown as Response)

        renderWithAdmin(<UserManagementPage customRequest={mockCustomRequest} />)

        await waitFor(() => {
            const infoEl = screen.getByTestId('pagination-info')
            expect(infoEl.textContent).toBe('Hiển thị 1 - 3 trên tổng số 3 người dùng')

            const prevBtn = screen.getByTestId('btn-pagination-prev') as HTMLButtonElement
            const nextBtn = screen.getByTestId('btn-pagination-next') as HTMLButtonElement
            expect(prevBtn.disabled).toBe(true)
            expect(nextBtn.disabled).toBe(true)
        })
    })
})
