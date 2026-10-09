// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { UserManagementPage } from './UserManagementPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { User, ImportPreviewData, ImportExecuteResult } from '../api/userApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
})

const initialUsersList: User[] = [
    {
        id: 'u-admin',
        name: 'Quản Trị Viên',
        email: 'admin@daotao.edu.vn',
        phone: '0901234567',
        role: 'admin',
        status: 'active',
    },
]

function RoleSessionWrapper({
    role = 'admin',
    children,
}: {
    role?: string | null
    children: ReactNode
}) {
    const { startSession, hasSession, role: currentRole } = useSession()
    useEffect(() => {
        if (role !== undefined && currentRole !== role) {
            startSession({ accessToken: 'valid-test-token', refreshToken: 'valid-refresh-token' }, role)
        }
    }, [role, currentRole, startSession])

    if (role !== undefined && (!hasSession || currentRole !== role)) {
        return <div>Đang khởi tạo phiên kiểm thử...</div>
    }

    return <>{children}</>
}

function renderUserManagementWithRoute(
    initialUrl = '/users',
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>,
    role = 'admin',
) {
    return render(
        <MemoryRouter initialEntries={[initialUrl]}>
            <SessionProvider apiOrigin="http://localhost:5000">
                <RoleSessionWrapper role={role}>
                    <Routes>
                        <Route
                            path="/users"
                            element={
                                <UserManagementPage
                                    initialUsers={initialUsersList}
                                    initialTotal={initialUsersList.length}
                                    customRequest={customRequest}
                                />
                            }
                        />
                    </Routes>
                </RoleSessionWrapper>
            </SessionProvider>
        </MemoryRouter>,
    )
}

function createMockExcelFile(name = 'users_test.xlsx', size = 2048): File {
    return new File([new ArrayBuffer(size)], name, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
}

describe('User Management: Full-Width Layout & Dedicated Tab Import Matrix', () => {
    // 1. /users default -> List tab
    it('1. /users mặc định hiển thị Tab [ Danh sách người dùng ], có đầy đủ search, table và nút Import Excel', async () => {
        renderUserManagementWithRoute('/users')

        await waitFor(() => {
            expect(screen.getByTestId('tab-user-list')).toBeDefined()
            expect(screen.getByTestId('tab-user-import')).toBeDefined()
            expect(screen.getByTestId('user-list-panel')).toBeDefined()
            expect(screen.queryByTestId('user-import-panel')).toBeNull()
        })

        // Check active tab button class
        const listTabBtn = screen.getByTestId('tab-user-list')
        expect(listTabBtn.classList.contains('active')).toBe(true)
        expect(screen.getByTestId('btn-import-excel')).toBeDefined()
        expect(screen.getByTestId('user-table')).toBeDefined()
    })

    // 2. Click Import Excel -> Import tab
    it('2. Bấm nút "Import Excel" trong header chuyển sang tab Import Excel mà không mở modal popup', async () => {
        renderUserManagementWithRoute('/users')

        await waitFor(() => {
            expect(screen.getByTestId('btn-import-excel')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-import-excel'))

        await waitFor(() => {
            expect(screen.getByTestId('user-import-panel')).toBeDefined()
            expect(screen.getByTestId('user-import-tab')).toBeDefined()
            expect(screen.queryByTestId('user-list-panel')).toBeNull()
        })

        const importTabBtn = screen.getByTestId('tab-user-import')
        expect(importTabBtn.classList.contains('active')).toBe(true)
    })

    // 3. Reload /users?tab=import -> keeps import tab
    it('3. Truy cập trực tiếp /users?tab=import mở ngay Tab Import Excel, bookmark và reload an toàn', async () => {
        renderUserManagementWithRoute('/users?tab=import')

        await waitFor(() => {
            expect(screen.getByTestId('user-import-panel')).toBeDefined()
            expect(screen.getByTestId('import-step-1')).toBeDefined()
            expect(screen.getByTestId('import-step-2')).toBeDefined()
            expect(screen.getByTestId('import-step-3')).toBeDefined()
        })

        // Click tab list quay lại
        fireEvent.click(screen.getByTestId('tab-user-list'))

        await waitFor(() => {
            expect(screen.getByTestId('user-list-panel')).toBeDefined()
            expect(screen.queryByTestId('user-import-panel')).toBeNull()
        })
    })

    // 4. Download template
    it('4. Tải file mẫu trong Tab 1 gọi đúng API GET /api/users/import/template', async () => {
        let requestedTemplate = false
        const customRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path.includes('/api/users/import/template')) {
                requestedTemplate = true
                return new Response(new Blob(['fake excel']), { status: 200 })
            }
            return new Response(JSON.stringify({ status: 'success', data: { items: initialUsersList, total: 1 } }), { status: 200 })
        })

        renderUserManagementWithRoute('/users?tab=import', customRequest)

        await waitFor(() => {
            expect(screen.getByTestId('btn-download-template')).toBeDefined()
        })

        window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
        window.URL.revokeObjectURL = vi.fn()

        fireEvent.click(screen.getByTestId('btn-download-template'))

        await waitFor(() => {
            expect(requestedTemplate).toBe(true)
            expect(screen.getByTestId('download-success-msg')).toBeDefined()
        })
    })

    // 5. Wrong extension validation
    it('5. Chọn file không đúng định dạng .xlsx sẽ báo lỗi rõ ràng và không cho preview', async () => {
        renderUserManagementWithRoute('/users?tab=import')

        await waitFor(() => {
            expect(screen.getByTestId('import-file-input')).toBeDefined()
        })

        const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement
        const txtFile = new File(['hello'], 'test.txt', { type: 'text/plain' })
        fireEvent.change(fileInput, { target: { files: [txtFile] } })

        await waitFor(() => {
            expect(screen.getByTestId('import-error-banner').textContent).toContain('Chỉ hỗ trợ file Excel định dạng .xlsx.')
            expect(screen.queryByTestId('selected-file-info')).toBeNull()
        })
    })

    // 6. Preview with Valid & Invalid rows, and filtering by [ Tất cả ] [ Hợp lệ ] [ Có lỗi ]
    it('6. Preview dữ liệu, kiểm tra summary metrics và chuyển đổi bộ lọc [ Tất cả ] [ Hợp lệ ] [ Có lỗi ]', async () => {
        const mockPreviewData: ImportPreviewData = {
            filename: 'test_preview.xlsx',
            headers: ['name', 'email', 'phone', 'role', 'status'],
            total_rows: 3,
            valid_rows: 2,
            invalid_rows: 1,
            rows: [
                {
                    row_number: 2,
                    name: 'Học Viên 1',
                    email: 'hv1@tms.local',
                    phone: '0901111111',
                    role: 'trainee',
                    status: 'active',
                    password_present: true,
                    valid: true,
                    errors: [],
                },
                {
                    row_number: 3,
                    name: 'Học Viên 2',
                    email: 'hv2_invalid_email',
                    phone: '0902222222',
                    role: 'trainee',
                    status: 'active',
                    password_present: true,
                    valid: false,
                    errors: [{ code: 'INVALID_EMAIL', field: 'email', message: 'Email không đúng định dạng RFC 5322.' }],
                },
                {
                    row_number: 4,
                    name: 'Học Viên 3',
                    email: 'hv3@tms.local',
                    phone: '0903333333',
                    role: 'trainee',
                    status: 'active',
                    password_present: true,
                    valid: true,
                    errors: [],
                },
            ],
        }

        const customRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path.includes('/api/users/import/preview')) {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewData }), { status: 200 })
            }
            return new Response(JSON.stringify({ status: 'success', data: { items: initialUsersList, total: 1 } }), { status: 200 })
        })

        renderUserManagementWithRoute('/users?tab=import', customRequest)

        const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement
        fireEvent.change(fileInput, { target: { files: [createMockExcelFile('test_preview.xlsx')] } })

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-data')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('import-preview-content')).toBeDefined()
        })

        // Check summary counts
        expect(screen.getByTestId('summary-total-rows').textContent).toContain('3')
        expect(screen.getByTestId('summary-valid-rows').textContent).toContain('2')
        expect(screen.getByTestId('summary-invalid-rows').textContent).toContain('1')

        // Default: 3 rows visible
        expect(screen.getByTestId('preview-row-2')).toBeDefined()
        expect(screen.getByTestId('preview-row-3')).toBeDefined()
        expect(screen.getByTestId('preview-row-4')).toBeDefined()

        // Filter: Valid only
        fireEvent.click(screen.getByTestId('preview-filter-valid'))
        expect(screen.getByTestId('preview-row-2')).toBeDefined()
        expect(screen.queryByTestId('preview-row-3')).toBeNull()
        expect(screen.getByTestId('preview-row-4')).toBeDefined()

        // Filter: Errors only
        fireEvent.click(screen.getByTestId('preview-filter-error'))
        expect(screen.queryByTestId('preview-row-2')).toBeNull()
        expect(screen.getByTestId('preview-row-3')).toBeDefined()
        expect(screen.queryByTestId('preview-row-4')).toBeNull()
        expect(screen.getByTestId('row-errors-3').textContent).toContain('Email không đúng định dạng RFC 5322.')

        // Filter: All again
        fireEvent.click(screen.getByTestId('preview-filter-all'))
        expect(screen.getByTestId('preview-row-2')).toBeDefined()
        expect(screen.getByTestId('preview-row-3')).toBeDefined()
    })

    // 7. Large file support (1,000+ rows) with pagination
    it('7. Hỗ trợ file lớn (1.200 dòng): phân trang hiển thị 50 dòng/trang, chuyển trang mượt mà không lag DOM', async () => {
        // Generate 1200 mock rows
        const largeRows = Array.from({ length: 1200 }, (_, i) => ({
            row_number: i + 2,
            name: `User ${i + 1}`,
            email: `user${i + 1}@tms.local`,
            phone: '0901234567',
            role: 'trainee',
            status: 'active',
            password_present: true,
            valid: i % 10 !== 0, // every 10th row has error
            errors: i % 10 === 0 ? [{ code: 'INVALID_PHONE', field: 'phone', message: 'Số điện thoại không hợp lệ.' }] : [],
        }))

        const largePreviewData: ImportPreviewData = {
            filename: 'large_data.xlsx',
            headers: ['name', 'email', 'phone', 'role', 'status'],
            total_rows: 1200,
            valid_rows: 1080,
            invalid_rows: 120,
            rows: largeRows,
        }

        const customRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path.includes('/api/users/import/preview')) {
                return new Response(JSON.stringify({ status: 'success', data: largePreviewData }), { status: 200 })
            }
            return new Response(JSON.stringify({ status: 'success', data: { items: initialUsersList, total: 1 } }), { status: 200 })
        })

        renderUserManagementWithRoute('/users?tab=import', customRequest)

        const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement
        fireEvent.change(fileInput, { target: { files: [createMockExcelFile('large_data.xlsx')] } })

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-data')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('import-preview-content')).toBeDefined()
        })

        // Verify summary
        expect(screen.getByTestId('summary-total-rows').textContent).toContain('1200')
        expect(screen.getByTestId('summary-valid-rows').textContent).toContain('1080')
        expect(screen.getByTestId('summary-invalid-rows').textContent).toContain('120')

        // Page 1 displays up to 50 rows (row 2 to row 51)
        expect(screen.getByTestId('preview-row-2')).toBeDefined()
        expect(screen.getByTestId('preview-row-51')).toBeDefined()
        expect(screen.queryByTestId('preview-row-52')).toBeNull()

        // Click next page
        const nextBtn = screen.getByRole('button', { name: /Trang sau →/ })
        fireEvent.click(nextBtn)

        // Now page 2 is shown (row 52 to row 101)
        expect(screen.queryByTestId('preview-row-2')).toBeNull()
        expect(screen.getByTestId('preview-row-52')).toBeDefined()
    })

    // 8. Partial Import execution & back to user list
    it('8. Thực hiện Partial Import: xác nhận 2 tài khoản hợp lệ, hiển thị báo cáo và quay lại danh sách người dùng', async () => {
        const mockPreviewData: ImportPreviewData = {
            filename: 'partial.xlsx',
            headers: ['name', 'email', 'phone', 'role', 'status'],
            total_rows: 3,
            valid_rows: 2,
            invalid_rows: 1,
            rows: [
                { row_number: 2, name: 'User A', email: 'a@tms.local', phone: null, role: 'trainee', status: 'active', password_present: true, valid: true, errors: [] },
                { row_number: 3, name: 'User B', email: 'b_invalid', phone: null, role: 'trainee', status: 'active', password_present: true, valid: false, errors: [{ code: 'INVALID_EMAIL', field: 'email', message: 'Email lỗi' }] },
                { row_number: 4, name: 'User C', email: 'c@tms.local', phone: null, role: 'trainee', status: 'active', password_present: true, valid: true, errors: [] },
            ],
        }

        const mockExecuteResult: ImportExecuteResult = {
            message: 'Import hoàn tất: 2/3 tài khoản đã được nhập thành công.',
            data: {
                filename: 'partial.xlsx',
                total_rows: 3,
                valid_rows: 2,
                invalid_rows: 1,
                imported_rows: 2,
                skipped_rows: 1,
                failed_rows: 0,
                summary: {
                    success: 2,
                    validation_errors: 1,
                    import_errors: 0,
                },
                error_summary: {
                    INVALID_EMAIL: 1,
                },
                rows: [
                    { row_number: 2, name: 'User A', email: 'a@tms.local', phone: null, role: 'trainee', status: 'active', imported: true, result: 'imported', errors: [] },
                    { row_number: 3, name: 'User B', email: 'b_invalid', phone: null, role: 'trainee', status: 'active', imported: false, result: 'validation_error', errors: [{ code: 'INVALID_EMAIL', field: 'email', message: 'Email lỗi' }] },
                    { row_number: 4, name: 'User C', email: 'c@tms.local', phone: null, role: 'trainee', status: 'active', imported: true, result: 'imported', errors: [] },
                ],
            },
        }

        let userListFetchCount = 0
        const customRequest = vi.fn().mockImplementation(async (path: string, init?: RequestInit) => {
            if (path.includes('/api/users/import/preview')) {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewData }), { status: 200 })
            }
            if (path.includes('/api/users/import') && init?.method === 'POST') {
                return new Response(JSON.stringify(mockExecuteResult), { status: 200 })
            }
            if (path.includes('/api/users')) {
                userListFetchCount++
                return new Response(JSON.stringify({ status: 'success', data: { items: initialUsersList, total: 1 } }), { status: 200 })
            }
            return new Response('{}', { status: 200 })
        })

        renderUserManagementWithRoute('/users?tab=import', customRequest)

        // Select file & preview
        const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement
        fireEvent.change(fileInput, { target: { files: [createMockExcelFile('partial.xlsx')] } })
        await waitFor(() => expect(screen.getByTestId('btn-preview-data')).toBeDefined())
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        // Start import -> Confirm Box
        await waitFor(() => expect(screen.getByTestId('btn-start-import')).toBeDefined())
        fireEvent.click(screen.getByTestId('btn-start-import'))

        await waitFor(() => expect(screen.getByTestId('import-confirm-box')).toBeDefined())
        expect(screen.getByTestId('import-confirm-box').textContent).toContain('2')

        // Confirm
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        // Wait for execution result
        await waitFor(() => {
            expect(screen.getByTestId('import-result-content')).toBeDefined()
            expect(screen.getByTestId('summary-exec-success').textContent).toContain('2')
            expect(screen.getByTestId('summary-exec-skipped').textContent).toContain('1')
        })

        // Return to user list
        const backBtn = screen.getByTestId('btn-close-import-footer')
        fireEvent.click(backBtn)

        await waitFor(() => {
            expect(screen.getByTestId('user-list-panel')).toBeDefined()
            expect(screen.queryByTestId('user-import-panel')).toBeNull()
        })
        expect(userListFetchCount).toBeGreaterThan(0)
    })
})
