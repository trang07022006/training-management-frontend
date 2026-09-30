// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { UserManagementPage } from './UserManagementPage'
import { UserTable } from '../components/UserTable'
import { AccountLockModal } from '../components/AccountLockModal'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { User } from '../api/userApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const testUsers: User[] = [
    {
        id: 'u-admin-1',
        name: 'Quản trị viên Hệ thống',
        email: 'admin@tms.local',
        phone: '0901111111',
        role: 'admin',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
    },
    {
        id: 'u-trainee-2',
        name: 'Học viên Bị Khóa',
        email: 'trainee.locked@tms.local',
        phone: '0902222222',
        role: 'trainee',
        status: 'locked',
        created_at: '2026-01-02T00:00:00Z',
    },
    {
        id: 'u-trainer-3',
        name: 'Giảng viên Đang Hoạt Động',
        email: 'trainer.active@tms.local',
        phone: '0903333333',
        role: 'trainer',
        status: 'active',
        created_at: '2026-01-03T00:00:00Z',
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
        return <div>Khởi tạo phiên...</div>
    }

    return <>{children}</>
}

function renderWithRole(
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

describe('SCRUM-110: Kiểm thử tổng thể giao diện khóa và mở khóa tài khoản (UI Overall Test Matrix)', () => {
    describe('A. Account Status Matrix', () => {
        it('1. hiển thị badge "Hoạt động" chuẩn xác với class status-active cho tài khoản active', () => {
            render(<UserTable users={[testUsers[0]]} canManage={true} />)

            const badge = screen.getByTestId('user-status-u-admin-1')
            expect(badge.textContent?.trim()).toBe('Hoạt động')
            expect(badge.className).toContain('status-badge')
            expect(badge.className).toContain('status-active')
        })

        it('2. hiển thị badge "Bị khóa" chuẩn xác với class status-locked cho tài khoản locked', () => {
            render(<UserTable users={[testUsers[1]]} canManage={true} />)

            const badge = screen.getByTestId('user-status-u-trainee-2')
            expect(badge.textContent?.trim()).toBe('Bị khóa')
            expect(badge.className).toContain('status-badge')
            expect(badge.className).toContain('status-locked')
        })
    })

    describe('B. Lock Operation Matrix', () => {
        it('3. thực hiện khóa tài khoản thành công: API POST, thông báo thành công và cập nhật badge', async () => {
            const mockRequest = vi.fn().mockImplementation((path: string) => {
                if (path.includes('/lock')) {
                    return Promise.resolve(
                        new Response(
                            JSON.stringify({
                                status: 'success',
                                message: 'Khóa tài khoản thành công',
                                data: { user_id: 'u-trainer-3', status: 'locked' },
                            }),
                            { status: 200, headers: { 'Content-Type': 'application/json' } }
                        )
                    )
                }
                return Promise.reject(new Error(`Unexpected path: ${path}`))
            })

            renderWithRole(
                <UserManagementPage
                    initialUsers={[testUsers[2]]}
                    initialTotal={1}
                    customRequest={mockRequest}
                />,
                { role: 'admin' }
            )

            const lockBtn = await screen.findByTestId('btn-lock-user-u-trainer-3')
            fireEvent.click(lockBtn)

            const confirmBtn = screen.getByTestId('btn-confirm-lock')
            fireEvent.click(confirmBtn)

            await waitFor(() => {
                expect(mockRequest).toHaveBeenCalledWith('/api/users/u-trainer-3/lock', { method: 'POST' })
                expect(screen.queryByTestId('account-lock-modal')).toBeNull()
                expect(screen.getByTestId('user-success-state')).toBeDefined()
                expect(screen.getByTestId('user-success-text').textContent).toContain('Khóa tài khoản Giảng viên Đang Hoạt Động thành công')
                expect(screen.getByTestId('user-status-u-trainer-3').textContent).toContain('Bị khóa')
                expect(screen.getByTestId('btn-unlock-user-u-trainer-3')).toBeDefined()
            })
        })

        it('4. hiển thị modal xác nhận khóa với cảnh báo thu hồi phiên rõ ràng', async () => {
            renderWithRole(
                <UserManagementPage
                    initialUsers={[testUsers[0]]}
                    initialTotal={1}
                />,
                { role: 'admin' }
            )

            const lockBtn = await screen.findByTestId('btn-lock-user-u-admin-1')
            fireEvent.click(lockBtn)

            expect(screen.getByTestId('account-lock-modal')).toBeDefined()
            expect(screen.getByRole('heading', { name: 'Khóa tài khoản' })).toBeDefined()
            expect(screen.getByTestId('lock-user-name').textContent).toContain('Quản trị viên Hệ thống')
            expect(screen.getByText(/Người dùng sẽ bị thu hồi phiên làm việc hiện tại ngay lập tức/)).toBeDefined()
        })

        it('5. hủy thao tác khóa không gọi API và đóng modal an toàn', async () => {
            const mockRequest = vi.fn()
            renderWithRole(
                <UserManagementPage
                    initialUsers={[testUsers[0]]}
                    initialTotal={1}
                    customRequest={mockRequest}
                />,
                { role: 'admin' }
            )

            const lockBtn = await screen.findByTestId('btn-lock-user-u-admin-1')
            fireEvent.click(lockBtn)
            expect(screen.getByTestId('account-lock-modal')).toBeDefined()

            fireEvent.click(screen.getByTestId('btn-cancel-lock'))
            expect(screen.queryByTestId('account-lock-modal')).toBeNull()
            expect(mockRequest).not.toHaveBeenCalled()
        })

        it('6. xử lý lỗi khi khóa thất bại và hiển thị thông báo lỗi', async () => {
            const mockRequest = vi.fn().mockImplementation(() =>
                Promise.resolve(
                    new Response(
                        JSON.stringify({
                            code: 'LOCK_FAILED',
                            message: 'Máy chủ cơ sở dữ liệu tạm thời bận.',
                        }),
                        { status: 500, headers: { 'Content-Type': 'application/json' } }
                    )
                )
            )

            renderWithRole(
                <AccountLockModal
                    isOpen={true}
                    user={testUsers[0]}
                    action="lock"
                    onClose={vi.fn()}
                    onSuccess={vi.fn()}
                    customRequest={mockRequest}
                />
            )

            fireEvent.click(screen.getByTestId('btn-confirm-lock'))

            await waitFor(() => {
                const errorBanner = screen.getByTestId('lock-modal-error')
                expect(errorBanner.textContent).toContain('Máy chủ cơ sở dữ liệu tạm thời bận.')
            })
        })

        it('7. hiển thị spinner và vô hiệu hóa nút bấm trong quá trình khóa', async () => {
            let resolveFn: (value: Response) => void
            const slowPromise = new Promise<Response>((res) => {
                resolveFn = res
            })
            const mockRequest = vi.fn().mockReturnValue(slowPromise)

            renderWithRole(
                <AccountLockModal
                    isOpen={true}
                    user={testUsers[0]}
                    action="lock"
                    onClose={vi.fn()}
                    onSuccess={vi.fn()}
                    customRequest={mockRequest}
                />
            )

            const confirmBtn = screen.getByTestId('btn-confirm-lock')
            fireEvent.click(confirmBtn)

            expect(confirmBtn.hasAttribute('disabled')).toBe(true)
            expect(screen.getByTestId('btn-cancel-lock').hasAttribute('disabled')).toBe(true)
            expect(confirmBtn.textContent).toContain('Đang xử lý...')

            resolveFn!(
                new Response(
                    JSON.stringify({ status: 'success', data: { status: 'locked' } }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            )

            await waitFor(() => {
                expect(confirmBtn.textContent).not.toContain('Đang xử lý...')
            })
        })
    })

    describe('C. Unlock Operation Matrix', () => {
        it('8. thực hiện mở khóa tài khoản thành công: API POST, thông báo thành công và cập nhật badge', async () => {
            const mockRequest = vi.fn().mockImplementation((path: string) => {
                if (path.includes('/unlock')) {
                    return Promise.resolve(
                        new Response(
                            JSON.stringify({
                                status: 'success',
                                message: 'Mở khóa tài khoản thành công',
                                data: { user_id: 'u-trainee-2', status: 'active' },
                            }),
                            { status: 200, headers: { 'Content-Type': 'application/json' } }
                        )
                    )
                }
                return Promise.reject(new Error(`Unexpected path: ${path}`))
            })

            renderWithRole(
                <UserManagementPage
                    initialUsers={[testUsers[1]]}
                    initialTotal={1}
                    customRequest={mockRequest}
                />,
                { role: 'admin' }
            )

            const unlockBtn = await screen.findByTestId('btn-unlock-user-u-trainee-2')
            fireEvent.click(unlockBtn)

            const confirmBtn = screen.getByTestId('btn-confirm-unlock')
            fireEvent.click(confirmBtn)

            await waitFor(() => {
                expect(mockRequest).toHaveBeenCalledWith('/api/users/u-trainee-2/unlock', { method: 'POST' })
                expect(screen.queryByTestId('account-lock-modal')).toBeNull()
                expect(screen.getByTestId('user-success-state')).toBeDefined()
                expect(screen.getByTestId('user-success-text').textContent).toContain('Mở khóa tài khoản Học viên Bị Khóa thành công')
                expect(screen.getByTestId('user-status-u-trainee-2').textContent).toContain('Hoạt động')
                expect(screen.getByTestId('btn-lock-user-u-trainee-2')).toBeDefined()
            })
        })

        it('9. hiển thị modal xác nhận mở khóa với thông điệp rõ ràng', async () => {
            renderWithRole(
                <UserManagementPage
                    initialUsers={[testUsers[1]]}
                    initialTotal={1}
                />,
                { role: 'admin' }
            )

            const unlockBtn = await screen.findByTestId('btn-unlock-user-u-trainee-2')
            fireEvent.click(unlockBtn)

            expect(screen.getByTestId('account-lock-modal')).toBeDefined()
            expect(screen.getByRole('heading', { name: 'Mở khóa tài khoản' })).toBeDefined()
            expect(screen.getByTestId('lock-user-name').textContent).toContain('Học viên Bị Khóa')
            expect(screen.getByText(/Sau khi mở khóa, người dùng có thể đăng nhập bình thường/)).toBeDefined()
        })

        it('10. xử lý lỗi khi mở khóa thất bại và hiển thị thông báo lỗi', async () => {
            const mockRequest = vi.fn().mockImplementation(() =>
                Promise.resolve(
                    new Response(
                        JSON.stringify({
                            code: 'ALREADY_ACTIVE',
                            message: 'Tài khoản này đang ở trạng thái hoạt động.',
                        }),
                        { status: 409, headers: { 'Content-Type': 'application/json' } }
                    )
                )
            )

            renderWithRole(
                <AccountLockModal
                    isOpen={true}
                    user={testUsers[1]}
                    action="unlock"
                    onClose={vi.fn()}
                    onSuccess={vi.fn()}
                    customRequest={mockRequest}
                />
            )

            fireEvent.click(screen.getByTestId('btn-confirm-unlock'))

            await waitFor(() => {
                const errorBanner = screen.getByTestId('lock-modal-error')
                expect(errorBanner.textContent).toContain('Tài khoản này đang ở trạng thái hoạt động.')
            })
        })

        it('11. hiển thị spinner và vô hiệu hóa nút bấm trong quá trình mở khóa', async () => {
            let resolveFn: (value: Response) => void
            const slowPromise = new Promise<Response>((res) => {
                resolveFn = res
            })
            const mockRequest = vi.fn().mockReturnValue(slowPromise)

            renderWithRole(
                <AccountLockModal
                    isOpen={true}
                    user={testUsers[1]}
                    action="unlock"
                    onClose={vi.fn()}
                    onSuccess={vi.fn()}
                    customRequest={mockRequest}
                />
            )

            const confirmBtn = screen.getByTestId('btn-confirm-unlock')
            fireEvent.click(confirmBtn)

            expect(confirmBtn.hasAttribute('disabled')).toBe(true)
            expect(screen.getByTestId('btn-cancel-lock').hasAttribute('disabled')).toBe(true)
            expect(confirmBtn.textContent).toContain('Đang xử lý...')

            resolveFn!(
                new Response(
                    JSON.stringify({ status: 'success', data: { status: 'active' } }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            )

            await waitFor(() => {
                expect(confirmBtn.textContent).not.toContain('Đang xử lý...')
            })
        })
    })

    describe('D. Security & Permission Matrix', () => {
        it('12. người dùng có quyền user.manage (admin) nhìn thấy đầy đủ các nút thao tác', async () => {
            renderWithRole(
                <UserManagementPage
                    initialUsers={testUsers}
                    initialTotal={3}
                />,
                { role: 'admin' }
            )

            expect(await screen.findByTestId('btn-lock-user-u-admin-1')).toBeDefined()
            expect(await screen.findByTestId('btn-unlock-user-u-trainee-2')).toBeDefined()
            expect(await screen.findByTestId('btn-lock-user-u-trainer-3')).toBeDefined()
        })

        it('13. người dùng chỉ có quyền xem (trainee) KHÔNG nhìn thấy cột Thao tác và các nút khóa/mở khóa', () => {
            render(<UserTable users={testUsers} canManage={false} />)

            expect(screen.queryByRole('columnheader', { name: 'Thao tác' })).toBeNull()
            expect(screen.queryByTestId('btn-lock-user-u-admin-1')).toBeNull()
            expect(screen.queryByTestId('btn-unlock-user-u-trainee-2')).toBeNull()
            expect(screen.queryByTestId('btn-lock-user-u-trainer-3')).toBeNull()
        })

        it('14. không thể bypass quyền ở client: API trả về 403 được xử lý an toàn', async () => {
            const mockRequest = vi.fn().mockImplementation(() =>
                Promise.resolve(
                    new Response(
                        JSON.stringify({
                            code: 'FORBIDDEN',
                            message: 'Truy cập bị từ chối: yêu cầu quyền user.manage.',
                        }),
                        { status: 403, headers: { 'Content-Type': 'application/json' } }
                    )
                )
            )

            renderWithRole(
                <AccountLockModal
                    isOpen={true}
                    user={testUsers[0]}
                    action="lock"
                    onClose={vi.fn()}
                    onSuccess={vi.fn()}
                    customRequest={mockRequest}
                />
            )

            fireEvent.click(screen.getByTestId('btn-confirm-lock'))

            await waitFor(() => {
                const errorBanner = screen.getByTestId('lock-modal-error')
                expect(errorBanner.textContent).toContain('yêu cầu quyền user.manage')
            })
        })
    })

    describe('E. Integration & State Preservation Matrix', () => {
        it('15. cập nhật trạng thái người dùng bảo toàn toàn bộ danh sách các người dùng khác', async () => {
            const mockRequest = vi.fn().mockImplementation((path: string) => {
                if (path.includes('/lock')) {
                    return Promise.resolve(
                        new Response(
                            JSON.stringify({
                                status: 'success',
                                data: { user_id: 'u-trainer-3', status: 'locked' },
                            }),
                            { status: 200, headers: { 'Content-Type': 'application/json' } }
                        )
                    )
                }
                return Promise.reject(new Error(`Unexpected path: ${path}`))
            })

            renderWithRole(
                <UserManagementPage
                    initialUsers={testUsers}
                    initialTotal={3}
                    customRequest={mockRequest}
                />,
                { role: 'admin' }
            )

            const lockBtn = await screen.findByTestId('btn-lock-user-u-trainer-3')
            fireEvent.click(lockBtn)
            fireEvent.click(screen.getByTestId('btn-confirm-lock'))

            await waitFor(() => {
                expect(screen.getByTestId('user-row-u-admin-1')).toBeDefined()
                expect(screen.getByTestId('user-row-u-trainee-2')).toBeDefined()
                expect(screen.getByTestId('user-row-u-trainer-3')).toBeDefined()
            })
        })

        it('16. bộ lọc tìm kiếm và trạng thái vẫn được duy trì', async () => {
            renderWithRole(
                <UserManagementPage
                    initialUsers={testUsers}
                    initialTotal={3}
                />,
                { role: 'admin' }
            )

            const searchInput = await screen.findByTestId('filter-input-search')
            fireEvent.change(searchInput, { target: { value: 'Giảng viên' } })
            expect((searchInput as HTMLInputElement).value).toBe('Giảng viên')
        })
    })

    describe('G. Mobile Responsive Matrix (360px)', () => {
        it('28. container bảng hỗ trợ thanh cuộn ngang khi hiển thị trên màn hình 360px', () => {
            render(<UserTable users={testUsers} canManage={true} />)

            const scrollContainer = screen.getByLabelText('Bảng dữ liệu người dùng')
            expect(scrollContainer.className).toContain('user-table-scroll-wrapper')
        })

        it('29. các nút thao tác có đầy đủ aria-label và kích thước phù hợp', () => {
            render(<UserTable users={[testUsers[0], testUsers[1]]} canManage={true} />)

            const lockBtn = screen.getByTestId('btn-lock-user-u-admin-1')
            expect(lockBtn.getAttribute('aria-label')).toBe('Khóa tài khoản Quản trị viên Hệ thống')

            const unlockBtn = screen.getByTestId('btn-unlock-user-u-trainee-2')
            expect(unlockBtn.getAttribute('aria-label')).toBe('Mở khóa tài khoản Học viên Bị Khóa')
        })

        it('30. modal xác nhận có cấu trúc responsive chuẩn với dialog và role phù hợp', () => {
            renderWithRole(
                <AccountLockModal
                    isOpen={true}
                    user={testUsers[0]}
                    action="lock"
                    onClose={vi.fn()}
                    onSuccess={vi.fn()}
                />
            )

            const modal = screen.getByTestId('account-lock-modal')
            expect(modal.getAttribute('role')).toBe('dialog')
            expect(modal.getAttribute('aria-modal')).toBe('true')
            expect(screen.getByTestId('btn-confirm-lock')).toBeDefined()
            expect(screen.getByTestId('btn-cancel-lock')).toBeDefined()
        })
    })
})
