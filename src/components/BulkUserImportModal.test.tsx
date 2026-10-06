// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { BulkUserImportModal } from './BulkUserImportModal'
import { UserManagementPage } from '../pages/UserManagementPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { User } from '../api/userApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
})

function RoleSessionWrapper({
    role,
    children,
}: {
    role?: string | null
    children: ReactNode
}) {
    const { startSession, hasSession, role: currentRole } = useSession()
    useEffect(() => {
        if (role !== undefined && currentRole !== role) {
            startSession({ accessToken: 'test-token', refreshToken: 'test-refresh' }, role)
        }
    }, [role, currentRole, startSession])

    if (role !== undefined && (!hasSession || currentRole !== role)) {
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
    return render(
        <MemoryRouter>
            <SessionProvider apiOrigin="http://localhost:5000">
                <RoleSessionWrapper role={options.role ?? 'admin'}>
                    {ui}
                </RoleSessionWrapper>
            </SessionProvider>
        </MemoryRouter>,
    )
}

describe('SCRUM-119: Activity A6.1 - Bulk User Import Modal & Entry Point', () => {
    beforeEach(() => {
        localStorage.clear()
        sessionStorage.clear()
        window.URL.createObjectURL = vi.fn(() => 'blob:mock-excel-url')
        window.URL.revokeObjectURL = vi.fn()
    })

    // 1. Entry point check in UserManagementPage
    it('1. Hiển thị nút "Import Excel" cạnh "Thêm người dùng" khi user có quyền quản trị (Admin)', async () => {
        const dummyUsers: User[] = [
            { id: '1', name: 'Admin User', email: 'admin@daotao.edu.vn', role: 'admin', status: 'active' },
        ]

        renderWithSession(<UserManagementPage initialUsers={dummyUsers} initialTotal={1} />, { role: 'admin' })

        await waitFor(() => {
            expect(screen.getByTestId('btn-import-excel')).toBeDefined()
            expect(screen.getByTestId('btn-create-user')).toBeDefined()
        })

        const importBtn = screen.getByTestId('btn-import-excel')
        expect(importBtn.textContent).toContain('Import Excel')
    })

    it('2. Ẩn nút "Import Excel" khi user không có quyền quản lý người dùng (Trainer/Trainee)', async () => {
        const dummyUsers: User[] = [
            { id: '2', name: 'Trainer Nam', email: 'trainer@daotao.edu.vn', role: 'trainer', status: 'active' },
        ]

        renderWithSession(<UserManagementPage initialUsers={dummyUsers} initialTotal={1} />, { role: 'trainer' })

        await waitFor(() => {
            expect(screen.queryByTestId('btn-import-excel')).toBeNull()
            expect(screen.queryByTestId('btn-create-user')).toBeNull()
        })
    })

    it('3. Click nút "Import Excel" mở modal import với đầy đủ cấu trúc 3 bước', async () => {
        const dummyUsers: User[] = [
            { id: '1', name: 'Admin', email: 'admin@daotao.edu.vn', role: 'admin', status: 'active' },
        ]

        renderWithSession(<UserManagementPage initialUsers={dummyUsers} initialTotal={1} />, { role: 'admin' })

        const importBtn = await screen.findByTestId('btn-import-excel')
        fireEvent.click(importBtn)

        expect(screen.getByTestId('bulk-import-modal')).toBeDefined()
        expect(screen.getByRole('heading', { level: 2, name: 'Import người dùng từ Excel' })).toBeDefined()
        expect(screen.getByTestId('import-modal-description').textContent).toContain(
            'Tải file mẫu, điền thông tin người dùng và tải file lên để kiểm tra trước khi import.',
        )

        // 3 bước
        expect(screen.getByTestId('import-step-1')).toBeDefined()
        expect(screen.getByTestId('import-step-2')).toBeDefined()
        expect(screen.getByTestId('import-step-3')).toBeDefined()
    })

    // 2. Download template flow in BulkUserImportModal
    it('4. Click "Tải file mẫu" gọi đúng GET /api/users/import/template và tải file user_import_template.xlsx', async () => {
        let calledPath = ''
        let calledMethod = ''

        const fakeRequest = vi.fn().mockImplementation(async (path: string, init?: RequestInit) => {
            calledPath = path
            calledMethod = init?.method ?? 'GET'
            const dummyBlob = new Blob(['dummy excel content'], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            })
            return new Response(dummyBlob, {
                status: 200,
                headers: {
                    'Content-Disposition': 'attachment; filename="user_import_template.xlsx"',
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
            })
        })

        renderWithSession(
            <BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />,
        )

        const downloadBtn = screen.getByTestId('btn-download-template')
        expect(downloadBtn.textContent).toContain('Tải file mẫu')

        fireEvent.click(downloadBtn)

        await waitFor(() => {
            expect(calledPath).toBe('/api/users/import/template')
            expect(calledMethod).toBe('GET')
            expect(window.URL.createObjectURL).toHaveBeenCalled()
            expect(screen.getByTestId('download-success-msg').textContent).toContain('Đã tải file mẫu.')
        })
    })

    it('5. Hiển thị trạng thái loading "Đang tải..." và disable nút khi tải file mẫu', async () => {
        let resolveDownload: (value: Response) => void
        const downloadPromise = new Promise<Response>((resolve) => {
            resolveDownload = resolve
        })

        const fakeRequest = vi.fn().mockImplementation(() => downloadPromise)

        renderWithSession(
            <BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />,
        )

        const downloadBtn = screen.getByTestId('btn-download-template')
        fireEvent.click(downloadBtn)

        // Đang tải
        expect((downloadBtn as HTMLButtonElement).disabled).toBe(true)
        expect(downloadBtn.textContent).toContain('Đang tải...')

        // Hoàn tất tải
        resolveDownload!(
            new Response(new Blob(['content']), {
                status: 200,
            }),
        )

        await waitFor(() => {
            expect((downloadBtn as HTMLButtonElement).disabled).toBe(false)
            expect(downloadBtn.textContent).toContain('Tải file mẫu')
            expect(screen.getByTestId('download-success-msg')).toBeDefined()
        })
    })

    it('6. Hiển thị thông báo lỗi tiếng Việt khi API tải template thất bại (403/500)', async () => {
        const fakeRequest = vi.fn().mockImplementation(async () => {
            return new Response(
                JSON.stringify({
                    code: 'FORBIDDEN',
                    message: 'Bạn không có quyền thực hiện thao tác này.',
                }),
                {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                },
            )
        })

        renderWithSession(
            <BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />,
        )

        const downloadBtn = screen.getByTestId('btn-download-template')
        fireEvent.click(downloadBtn)

        await waitFor(() => {
            expect(screen.getByTestId('import-error-banner')).toBeDefined()
            expect(screen.getByTestId('import-error-banner').textContent).toContain(
                'Bạn không có quyền thực hiện thao tác này.',
            )
            expect((downloadBtn as HTMLButtonElement).disabled).toBe(false)
        })
    })

    it('7. Hiển thị thông báo lỗi generic khi có lỗi mạng bất ngờ', async () => {
        const fakeRequest = vi.fn().mockRejectedValue(new Error('Network failure'))

        renderWithSession(
            <BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />,
        )

        const downloadBtn = screen.getByTestId('btn-download-template')
        fireEvent.click(downloadBtn)

        await waitFor(() => {
            expect(screen.getByTestId('import-error-banner')).toBeDefined()
            expect(screen.getByTestId('import-error-banner').textContent).toContain(
                'Không thể tải file mẫu. Vui lòng thử lại.',
            )
        })
    })

    it('8. Đóng modal qua nút X, nút Đóng, hoặc phím Escape', async () => {
        const handleClose = vi.fn()

        const { rerender } = renderWithSession(
            <BulkUserImportModal isOpen={true} onClose={handleClose} />,
        )

        // Click nút X
        const closeBtn = screen.getByTestId('btn-close-import-modal')
        fireEvent.click(closeBtn)
        expect(handleClose).toHaveBeenCalledTimes(1)

        // Click nút Đóng ở footer
        const footerCloseBtn = screen.getByTestId('btn-close-import-footer')
        fireEvent.click(footerCloseBtn)
        expect(handleClose).toHaveBeenCalledTimes(2)

        // Nhấn phím Escape
        fireEvent.keyDown(window, { key: 'Escape' })
        expect(handleClose).toHaveBeenCalledTimes(3)

        // Khi isOpen = false -> không render modal
        rerender(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin">
                        <BulkUserImportModal isOpen={false} onClose={handleClose} />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )
        expect(screen.queryByTestId('bulk-import-modal')).toBeNull()
    })

    it('9. Đóng modal qua backdrop click', () => {
        const handleClose = vi.fn()

        renderWithSession(
            <BulkUserImportModal isOpen={true} onClose={handleClose} />,
        )

        const backdrop = screen.getByTestId('bulk-import-modal-backdrop')
        fireEvent.click(backdrop)
        expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('10. Đóng và mở lại modal tự động reset sạch sẽ trạng thái error và success cũ', async () => {
        const fakeRequest = vi.fn().mockRejectedValue(new Error('Fail once'))

        const { rerender } = renderWithSession(
            <BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />,
        )

        // Kích hoạt lỗi
        fireEvent.click(screen.getByTestId('btn-download-template'))
        await waitFor(() => {
            expect(screen.getByTestId('import-error-banner')).toBeDefined()
        })

        // Đóng modal
        rerender(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin">
                        <BulkUserImportModal isOpen={false} onClose={() => {}} customRequest={fakeRequest} />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        // Mở lại modal
        rerender(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin">
                        <BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        // Lỗi cũ không còn xuất hiện
        expect(screen.queryByTestId('import-error-banner')).toBeNull()
        expect(screen.queryByTestId('download-success-msg')).toBeNull()
    })
})
