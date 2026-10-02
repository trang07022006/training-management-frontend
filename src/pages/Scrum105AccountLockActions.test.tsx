// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { UserManagementPage } from './UserManagementPage'
import { AccountLockModal } from '../components/AccountLockModal'
import { UserTable } from '../components/UserTable'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { User } from '../api/userApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const activeUser: User = {
    id: 'user-active-1',
    name: 'Nguyễn Văn Đang Hoạt Động',
    email: 'active@tms.local',
    phone: '0901234567',
    role: 'trainee',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
}

const lockedUser: User = {
    id: 'user-locked-2',
    name: 'Trần Thị Bị Khóa',
    email: 'locked@tms.local',
    phone: '0912345678',
    role: 'trainer',
    status: 'locked',
    created_at: '2026-01-02T00:00:00Z',
}

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
        return <div>Đang khởi tạo phiên...</div>
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

describe('SCRUM-105: Thao tác khóa / mở khóa tài khoản người dùng', () => {
    it('1. hiển thị nút "Khóa tài khoản" cho tài khoản đang ở trạng thái active', () => {
        render(<UserTable users={[activeUser]} canManage={true} />)

        const lockBtn = screen.getByTestId('btn-lock-user-user-active-1')
        expect(lockBtn).toBeDefined()
        expect(lockBtn.textContent).toContain('Khóa tài khoản')
        expect(screen.queryByTestId('btn-unlock-user-user-active-1')).toBeNull()
    })

    it('2. hiển thị nút "Mở khóa" cho tài khoản đang ở trạng thái locked', () => {
        render(<UserTable users={[lockedUser]} canManage={true} />)

        const unlockBtn = screen.getByTestId('btn-unlock-user-user-locked-2')
        expect(unlockBtn).toBeDefined()
        expect(unlockBtn.textContent).toContain('Mở khóa')
        expect(screen.queryByTestId('btn-lock-user-user-locked-2')).toBeNull()
    })

    it('3. click nút Khóa mở modal xác nhận với đầy đủ thông tin người dùng và cảnh báo', async () => {
        renderWithSession(
            <UserManagementPage
                initialUsers={[activeUser]}
                initialTotal={1}
            />,
            { role: 'admin' }
        )

        const lockBtn = await screen.findByTestId('btn-lock-user-user-active-1')
        fireEvent.click(lockBtn)

        expect(screen.getByTestId('account-lock-modal')).toBeDefined()
        expect(screen.getByRole('heading', { name: 'Khóa tài khoản' })).toBeDefined()
        expect(screen.getByTestId('lock-user-name').textContent).toContain('Nguyễn Văn Đang Hoạt Động')
        expect(screen.getByText(/Cảnh báo: Người dùng sẽ bị thu hồi phiên làm việc/)).toBeDefined()
        expect(screen.getByTestId('btn-confirm-lock')).toBeDefined()
        expect(screen.getByTestId('btn-cancel-lock')).toBeDefined()
    })

    it('4. click nút Hủy hoặc đóng hộp thoại đóng modal mà không gọi API', async () => {
        const mockRequest = vi.fn()
        renderWithSession(
            <UserManagementPage
                initialUsers={[activeUser]}
                initialTotal={1}
                customRequest={mockRequest}
            />,
            { role: 'admin' }
        )

        const lockBtn = await screen.findByTestId('btn-lock-user-user-active-1')
        fireEvent.click(lockBtn)
        expect(screen.getByTestId('account-lock-modal')).toBeDefined()

        fireEvent.click(screen.getByTestId('btn-cancel-lock'))
        expect(screen.queryByTestId('account-lock-modal')).toBeNull()
        expect(mockRequest).not.toHaveBeenCalled()
    })

    it('5. xác nhận khóa thành công: gọi đúng API POST /api/users/<id>/lock và hiển thị thông báo thành công', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (path === '/api/users/user-active-1/lock' && init?.method === 'POST') {
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            status: 'success',
                            message: 'Khóa tài khoản thành công',
                            data: { user_id: 'user-active-1', status: 'locked' },
                        }),
                        { status: 200, headers: { 'Content-Type': 'application/json' } }
                    )
                )
            }
            return Promise.reject(new Error(`Unexpected path: ${path}`))
        })

        renderWithSession(
            <UserManagementPage
                initialUsers={[activeUser]}
                initialTotal={1}
                customRequest={mockRequest}
            />,
            { role: 'admin' }
        )

        const lockBtn = await screen.findByTestId('btn-lock-user-user-active-1')
        fireEvent.click(lockBtn)
        fireEvent.click(screen.getByTestId('btn-confirm-lock'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith('/api/users/user-active-1/lock', { method: 'POST' })
        })

        await waitFor(() => {
            expect(screen.queryByTestId('account-lock-modal')).toBeNull()
            expect(screen.getByTestId('user-success-state')).toBeDefined()
            expect(screen.getByTestId('user-success-text').textContent).toContain('Khóa tài khoản Nguyễn Văn Đang Hoạt Động thành công')
        })

        // Trạng thái của hàng được cập nhật sang "Bị khóa" và nút đổi sang "Mở khóa"
        expect(screen.getByTestId('user-status-user-active-1').textContent).toContain('Bị khóa')
        expect(screen.getByTestId('btn-unlock-user-user-active-1')).toBeDefined()
    })

    it('6. xác nhận mở khóa thành công: gọi đúng API POST /api/users/<id>/unlock và hiển thị thông báo thành công', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (path === '/api/users/user-locked-2/unlock' && init?.method === 'POST') {
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            status: 'success',
                            message: 'Mở khóa tài khoản thành công',
                            data: { user_id: 'user-locked-2', status: 'active' },
                        }),
                        { status: 200, headers: { 'Content-Type': 'application/json' } }
                    )
                )
            }
            return Promise.reject(new Error(`Unexpected path: ${path}`))
        })

        renderWithSession(
            <UserManagementPage
                initialUsers={[lockedUser]}
                initialTotal={1}
                customRequest={mockRequest}
            />,
            { role: 'admin' }
        )

        const unlockBtn = await screen.findByTestId('btn-unlock-user-user-locked-2')
        fireEvent.click(unlockBtn)
        expect(screen.getByRole('heading', { name: 'Mở khóa tài khoản' })).toBeDefined()

        fireEvent.click(screen.getByTestId('btn-confirm-unlock'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith('/api/users/user-locked-2/unlock', { method: 'POST' })
        })

        await waitFor(() => {
            expect(screen.queryByTestId('account-lock-modal')).toBeNull()
            expect(screen.getByTestId('user-success-state')).toBeDefined()
            expect(screen.getByTestId('user-success-text').textContent).toContain('Mở khóa tài khoản Trần Thị Bị Khóa thành công')
        })

        // Trạng thái được cập nhật sang "Hoạt động" và nút đổi sang "Khóa tài khoản"
        expect(screen.getByTestId('user-status-user-locked-2').textContent).toContain('Hoạt động')
        expect(screen.getByTestId('btn-lock-user-user-locked-2')).toBeDefined()
    })

    it('7. xử lý lỗi API thất bại (ví dụ 409 ALREADY_LOCKED): hiển thị banner lỗi trong modal và giữ nguyên trạng thái', async () => {
        const mockRequest = vi.fn().mockImplementation(() =>
            Promise.resolve(
                new Response(
                    JSON.stringify({
                        code: 'ALREADY_LOCKED',
                        message: 'Tài khoản này đã bị khóa từ trước.',
                    }),
                    { status: 409, headers: { 'Content-Type': 'application/json' } }
                )
            )
        )

        renderWithSession(
            <UserManagementPage
                initialUsers={[activeUser]}
                initialTotal={1}
                customRequest={mockRequest}
            />,
            { role: 'admin' }
        )

        const lockBtn = await screen.findByTestId('btn-lock-user-user-active-1')
        fireEvent.click(lockBtn)
        fireEvent.click(screen.getByTestId('btn-confirm-lock'))

        await waitFor(() => {
            const errorBanner = screen.getByTestId('lock-modal-error')
            expect(errorBanner).toBeDefined()
            expect(errorBanner.textContent).toContain('Tài khoản này đã bị khóa từ trước.')
        })

        // Modal vẫn mở để người dùng biết lỗi
        expect(screen.getByTestId('account-lock-modal')).toBeDefined()
    })

    it('8. xử lý lỗi 401 Unauthorized khi phiên hết hạn trong quá trình thao tác', async () => {
        const mockRequest = vi.fn().mockImplementation(() =>
            Promise.resolve(
                new Response(
                    JSON.stringify({
                        code: 'UNAUTHORIZED',
                        message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
                    }),
                    { status: 401, headers: { 'Content-Type': 'application/json' } }
                )
            )
        )

        renderWithSession(
            <AccountLockModal
                isOpen={true}
                user={activeUser}
                action="lock"
                onClose={vi.fn()}
                onSuccess={vi.fn()}
                customRequest={mockRequest}
            />
        )

        fireEvent.click(screen.getByTestId('btn-confirm-lock'))

        await waitFor(() => {
            const errorBanner = screen.getByTestId('lock-modal-error')
            expect(errorBanner.textContent).toContain('Bạn cần đăng nhập để tiếp tục.')
        })
    })

    it('9. xử lý lỗi 403 Forbidden khi người dùng không đủ quyền user.manage', async () => {
        const mockRequest = vi.fn().mockImplementation(() =>
            Promise.resolve(
                new Response(
                    JSON.stringify({
                        code: 'FORBIDDEN',
                        message: 'Bạn không có quyền thực hiện thao tác này.',
                    }),
                    { status: 403, headers: { 'Content-Type': 'application/json' } }
                )
            )
        )

        renderWithSession(
            <AccountLockModal
                isOpen={true}
                user={activeUser}
                action="lock"
                onClose={vi.fn()}
                onSuccess={vi.fn()}
                customRequest={mockRequest}
            />
        )

        fireEvent.click(screen.getByTestId('btn-confirm-lock'))

        await waitFor(() => {
            const errorBanner = screen.getByTestId('lock-modal-error')
            expect(errorBanner.textContent).toContain('Bạn không có quyền thực hiện thao tác này.')
        })
    })

    it('10. hiển thị trạng thái loading và vô hiệu hóa nút bấm trong quá trình gửi request', async () => {
        let resolveApi: (value: Response) => void
        const slowPromise = new Promise<Response>((resolve) => {
            resolveApi = resolve
        })
        const mockRequest = vi.fn().mockReturnValue(slowPromise)

        renderWithSession(
            <AccountLockModal
                isOpen={true}
                user={activeUser}
                action="lock"
                onClose={vi.fn()}
                onSuccess={vi.fn()}
                customRequest={mockRequest}
            />
        )

        const confirmBtn = screen.getByTestId('btn-confirm-lock')
        const cancelBtn = screen.getByTestId('btn-cancel-lock')

        fireEvent.click(confirmBtn)

        expect(confirmBtn.hasAttribute('disabled')).toBe(true)
        expect(cancelBtn.hasAttribute('disabled')).toBe(true)
        expect(confirmBtn.textContent).toContain('Đang xử lý...')

        // Resolve request
        resolveApi!(
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
