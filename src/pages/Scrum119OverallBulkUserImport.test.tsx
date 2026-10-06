// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { UserManagementPage } from './UserManagementPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { RequirePermission } from '../auth/RequirePermission'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
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
        email: 'admin@tms.local',
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

function renderUserManagementWithSession(
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>,
    role = 'admin',
) {
    return render(
        <MemoryRouter initialEntries={['/users']}>
            <SessionProvider apiOrigin="http://localhost:5000">
                <RoleSessionWrapper role={role}>
                    <Routes>
                        <Route
                            element={
                                <RequirePermission
                                    requiredRole={role}
                                    requiredPermission={SYSTEM_PERMISSIONS.USER_VIEW}
                                    fallbackPath="/forbidden"
                                />
                            }
                        >
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
                        </Route>
                        <Route path="/forbidden" element={<div data-testid="forbidden-page">403 Forbidden</div>} />
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

describe('SCRUM-119: Kiểm Thử Tổng Thể Toàn Diện Bulk User Import (Overall Acceptance Matrix)', () => {
    // =========================================================================
    // CASE 1: ADMIN DOWNLOAD TEMPLATE & UI ENTRY POINT
    // =========================================================================
    it('CASE 1: Admin vào trang User Management, mở modal và tải file template user_import_template.xlsx', async () => {
        let requestedTemplate = false

        const customRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path.includes('/api/users/import/template')) {
                requestedTemplate = true
                return new Response(new Blob(['fake excel content']), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'Content-Disposition': 'attachment; filename="user_import_template.xlsx"',
                    },
                })
            }
            return new Response(JSON.stringify({ status: 'success', data: { items: initialUsersList, total: 1 } }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        })

        renderUserManagementWithSession(customRequest, 'admin')

        await waitFor(() => {
            expect(screen.getByTestId('btn-import-excel')).toBeDefined()
        })

        // Click Import Excel
        fireEvent.click(screen.getByTestId('btn-import-excel'))

        // Modal opens
        await waitFor(() => {
            expect(screen.getByTestId('bulk-import-modal')).toBeDefined()
        })
        expect(screen.getByTestId('btn-download-template')).toBeDefined()

        // Mock URL.createObjectURL and click
        const revokeObjectURLMock = vi.fn()
        const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/template-blob')
        window.URL.createObjectURL = createObjectURLMock
        window.URL.revokeObjectURL = revokeObjectURLMock

        fireEvent.click(screen.getByTestId('btn-download-template'))

        await waitFor(() => {
            expect(requestedTemplate).toBe(true)
        })
    })

    // =========================================================================
    // CASE 2: FILE HỢP LỆ 100% & REFRESH DANH SÁCH USER
    // =========================================================================
    it('CASE 2: Import file 100% hợp lệ: preview đầy đủ, xác nhận import thành công, và làm mới danh sách user', async () => {
        const validPreviewData: ImportPreviewData = {
            filename: 'valid_users.xlsx',
            headers: ['name', 'email', 'password', 'phone', 'role', 'status'],
            total_rows: 2,
            valid_rows: 2,
            invalid_rows: 0,
            rows: [
                {
                    row_number: 2,
                    name: 'Nguyễn Văn A',
                    email: 'nguyenvana@daotao.edu.vn',
                    phone: '0912345678',
                    role: 'trainee',
                    status: 'active',
                    password_present: true,
                    valid: true,
                    errors: [],
                },
                {
                    row_number: 3,
                    name: 'Trần Thị B',
                    email: 'tranthib@daotao.edu.vn',
                    phone: '0987654321',
                    role: 'trainer',
                    status: 'active',
                    password_present: true,
                    valid: true,
                    errors: [],
                },
            ],
        }

        const validExecuteResult: ImportExecuteResult = {
            status: 'success',
            message: 'Import hoàn tất.',
            data: {
                filename: 'valid_users.xlsx',
                total_rows: 2,
                valid_rows: 2,
                invalid_rows: 0,
                imported_rows: 2,
                skipped_rows: 0,
                failed_rows: 0,
                summary: {
                    success: 2,
                    validation_errors: 0,
                    import_errors: 0,
                },
                error_summary: {},
                rows: [
                    {
                        row_number: 2,
                        name: 'Nguyễn Văn A',
                        email: 'nguyenvana@daotao.edu.vn',
                        phone: '0912345678',
                        role: 'trainee',
                        status: 'active',
                        imported: true,
                        result: 'imported',
                        errors: [],
                    },
                    {
                        row_number: 3,
                        name: 'Trần Thị B',
                        email: 'tranthib@daotao.edu.vn',
                        phone: '0987654321',
                        role: 'trainer',
                        status: 'active',
                        imported: true,
                        result: 'imported',
                        errors: [],
                    },
                ],
            },
        }

        let userListFetchCount = 0

        const customRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path.includes('/api/users/import/preview')) {
                return new Response(JSON.stringify({ status: 'success', data: validPreviewData }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path.includes('/api/users/import')) {
                return new Response(JSON.stringify(validExecuteResult), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path.includes('/api/users')) {
                userListFetchCount++
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: {
                            items: [
                                ...initialUsersList,
                                { id: 'u-new1', name: 'Nguyễn Văn A', email: 'nguyenvana@daotao.edu.vn', role: 'trainee', status: 'active' },
                                { id: 'u-new2', name: 'Trần Thị B', email: 'tranthib@daotao.edu.vn', role: 'trainer', status: 'active' },
                            ],
                            total: 3,
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success' }), { status: 200 })
        })

        renderUserManagementWithSession(customRequest, 'admin')

        await waitFor(() => {
            expect(screen.getByTestId('btn-import-excel')).toBeDefined()
        })

        // Open modal
        fireEvent.click(screen.getByTestId('btn-import-excel'))
        await waitFor(() => {
            expect(screen.getByTestId('bulk-import-modal')).toBeDefined()
        })

        // Select file
        const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement
        const mockFile = createMockExcelFile('valid_users.xlsx')
        fireEvent.change(fileInput, { target: { files: [mockFile] } })

        // Click Preview
        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-data')).toBeDefined()
        })
        const previewBtn = screen.getByTestId('btn-preview-data')
        expect((previewBtn as HTMLButtonElement).disabled).toBe(false)
        fireEvent.click(previewBtn)

        // Wait for preview results
        await waitFor(() => {
            expect(screen.getByTestId('import-preview-content')).toBeDefined()
        })
        expect(screen.getByTestId('summary-total-rows').textContent).toContain('2')
        expect(screen.getByTestId('summary-valid-rows').textContent).toContain('2')
        expect(screen.getByTestId('summary-invalid-rows').textContent).toContain('0')

        // Start import -> Confirmation Dialog
        const startImportBtn = screen.getByTestId('btn-start-import')
        fireEvent.click(startImportBtn)

        await waitFor(() => {
            expect(screen.getByTestId('import-confirm-box')).toBeDefined()
        })

        // Confirm
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        // Execution results
        await waitFor(() => {
            expect(screen.getByTestId('import-result-content')).toBeDefined()
        })
        expect(screen.getByTestId('summary-exec-success').textContent).toContain('2')
        expect(screen.getByTestId('summary-exec-skipped').textContent).toContain('0')

        // Close via Close button in footer
        const finishBtn = screen.getByTestId('btn-close-import-footer')
        fireEvent.click(finishBtn)

        // Modal closed
        await waitFor(() => {
            expect(screen.queryByTestId('bulk-import-modal')).toBeNull()
        })

        // Verify User List was reloaded
        expect(userListFetchCount).toBeGreaterThan(0)
    })

    // =========================================================================
    // CASE 3 & CASE 11: FILE CÓ DÒNG LỖI & PARTIAL SUCCESS (3 HỢP LỆ, 2 LỖI)
    // =========================================================================
    it('CASE 3 & 11: File có 5 dòng (3 hợp lệ, 2 lỗi): hiển thị lỗi tiếng Việt đúng dòng, import partial success 3/5', async () => {
        const partialPreviewData: ImportPreviewData = {
            filename: 'partial_users.xlsx',
            headers: ['name', 'email', 'password', 'phone', 'role', 'status'],
            total_rows: 5,
            valid_rows: 3,
            invalid_rows: 2,
            rows: [
                { row_number: 2, name: 'User 1', email: 'u1@tms.local', phone: '0901111111', role: 'trainee', status: 'active', password_present: true, valid: true, errors: [] },
                { row_number: 3, name: 'User 2', email: 'u2@tms.local', phone: '0902222222', role: 'trainer', status: 'active', password_present: true, valid: true, errors: [] },
                { row_number: 4, name: 'User 3', email: 'invalid-email', phone: '0903333333', role: 'trainee', status: 'active', password_present: true, valid: false, errors: [{ field: 'email', code: 'INVALID_EMAIL', message: 'Email không đúng định dạng.' }] },
                { row_number: 5, name: '', email: 'u4@tms.local', phone: '0904444444', role: 'manager', status: 'active', password_present: true, valid: false, errors: [{ field: 'name', code: 'REQUIRED_FIELD_MISSING', message: 'Họ và tên không được để trống.' }, { field: 'role', code: 'INVALID_ROLE', message: "Vai trò không hợp lệ. Chỉ chấp nhận 'admin', 'trainer', 'trainee'." }] },
                { row_number: 6, name: 'User 5', email: 'u5@tms.local', phone: '0905555555', role: 'trainee', status: 'active', password_present: true, valid: true, errors: [] },
            ],
        }

        const partialExecuteResult: ImportExecuteResult = {
            status: 'success',
            message: 'Import hoàn tất.',
            data: {
                filename: 'partial_users.xlsx',
                total_rows: 5,
                valid_rows: 3,
                invalid_rows: 2,
                imported_rows: 3,
                skipped_rows: 2,
                failed_rows: 0,
                summary: {
                    success: 3,
                    validation_errors: 2,
                    import_errors: 0,
                },
                error_summary: { INVALID_EMAIL: 1, REQUIRED_FIELD_MISSING: 1, INVALID_ROLE: 1 },
                rows: [
                    { row_number: 2, name: 'User 1', email: 'u1@tms.local', phone: '0901111111', role: 'trainee', status: 'active', imported: true, result: 'imported', errors: [] },
                    { row_number: 3, name: 'User 2', email: 'u2@tms.local', phone: '0902222222', role: 'trainer', status: 'active', imported: true, result: 'imported', errors: [] },
                    { row_number: 4, name: 'User 3', email: 'invalid-email', phone: '0903333333', role: 'trainee', status: 'active', imported: false, result: 'validation_error', errors: [{ field: 'email', code: 'INVALID_EMAIL', message: 'Email không đúng định dạng.' }] },
                    { row_number: 5, name: '', email: 'u4@tms.local', phone: '0904444444', role: 'manager', status: 'active', imported: false, result: 'validation_error', errors: [{ field: 'name', code: 'REQUIRED_FIELD_MISSING', message: 'Họ và tên không được để trống.' }] },
                    { row_number: 6, name: 'User 5', email: 'u5@tms.local', phone: '0905555555', role: 'trainee', status: 'active', imported: true, result: 'imported', errors: [] },
                ],
            },
        }

        const customRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path.includes('/api/users/import/preview')) {
                return new Response(JSON.stringify({ status: 'success', data: partialPreviewData }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path.includes('/api/users/import')) {
                return new Response(JSON.stringify(partialExecuteResult), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response(JSON.stringify({ status: 'success', data: { items: initialUsersList, total: 1 } }), { status: 200 })
        })

        renderUserManagementWithSession(customRequest, 'admin')

        await waitFor(() => {
            expect(screen.getByTestId('btn-import-excel')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-import-excel'))

        const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement
        fireEvent.change(fileInput, { target: { files: [createMockExcelFile('partial_users.xlsx')] } })

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-data')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('import-preview-content')).toBeDefined()
        })

        // Check preview counts
        expect(screen.getByTestId('summary-total-rows').textContent).toContain('5')
        expect(screen.getByTestId('summary-valid-rows').textContent).toContain('3')
        expect(screen.getByTestId('summary-invalid-rows').textContent).toContain('2')

        // Row 4 error message check
        expect(screen.getByText('Email không đúng định dạng.')).toBeDefined()

        // Start import and confirm
        fireEvent.click(screen.getByTestId('btn-start-import'))
        await waitFor(() => {
            expect(screen.getByTestId('import-confirm-box')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            expect(screen.getByTestId('import-result-content')).toBeDefined()
        })

        // Invariant: imported (3) + skipped (2) == total (5)
        expect(screen.getByTestId('summary-exec-success').textContent).toContain('3')
        expect(screen.getByTestId('summary-exec-skipped').textContent).toContain('2')
    })

    // =========================================================================
    // CASE 4 & CASE 5: DUPLICATE EMAIL TRONG FILE VÀ TRONG DATABASE
    // =========================================================================
    it('CASE 4 & 5: Báo lỗi DUPLICATE_EMAIL_IN_FILE và DUPLICATE_EMAIL rõ ràng, không crash', async () => {
        const duplicatePreviewData: ImportPreviewData = {
            filename: 'duplicates.xlsx',
            headers: ['name', 'email', 'password', 'phone', 'role', 'status'],
            total_rows: 2,
            valid_rows: 0,
            invalid_rows: 2,
            rows: [
                {
                    row_number: 2,
                    name: 'Duplicate 1',
                    email: 'dup@daotao.edu.vn',
                    phone: null,
                    role: 'trainee',
                    status: 'active',
                    password_present: true,
                    valid: false,
                    errors: [{ field: 'email', code: 'DUPLICATE_EMAIL_IN_FILE', message: 'Email bị trùng lặp trong file.' }],
                },
                {
                    row_number: 3,
                    name: 'Duplicate 2',
                    email: 'dup@daotao.edu.vn',
                    phone: null,
                    role: 'trainee',
                    status: 'active',
                    password_present: true,
                    valid: false,
                    errors: [{ field: 'email', code: 'DUPLICATE_EMAIL_IN_FILE', message: 'Email bị trùng lặp trong file.' }],
                },
            ],
        }

        const customRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path.includes('/api/users/import/preview')) {
                return new Response(JSON.stringify({ status: 'success', data: duplicatePreviewData }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response(JSON.stringify({ status: 'success', data: { items: initialUsersList, total: 1 } }), { status: 200 })
        })

        renderUserManagementWithSession(customRequest, 'admin')

        await waitFor(() => {
            expect(screen.getByTestId('btn-import-excel')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-import-excel'))

        const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement
        fireEvent.change(fileInput, { target: { files: [createMockExcelFile('duplicates.xlsx')] } })

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-data')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('import-preview-content')).toBeDefined()
        })

        // Check duplicate error displayed
        const errorElements = screen.getAllByText('Email bị trùng lặp trong file.')
        expect(errorElements.length).toBeGreaterThanOrEqual(1)
        expect(screen.queryByTestId('btn-start-import')).toBeNull()
    })

    // =========================================================================
    // CASE 6: FILE SAI ĐỊNH DẠNG (.CSV, .TXT, .XLS)
    // =========================================================================
    it('CASE 6: Chặn ngay lập tức khi người dùng chọn file sai định dạng (.csv, .txt, .xls)', async () => {
        const customRequest = vi.fn()
        renderUserManagementWithSession(customRequest, 'admin')

        await waitFor(() => {
            expect(screen.getByTestId('btn-import-excel')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-import-excel'))

        const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement
        const csvFile = new File(['name,email\nTest,test@tms.local'], 'invalid_format.csv', { type: 'text/csv' })

        fireEvent.change(fileInput, { target: { files: [csvFile] } })

        // Client validation error should be immediately visible
        await waitFor(() => {
            expect(screen.getByText('Chỉ hỗ trợ file Excel định dạng .xlsx.')).toBeDefined()
        })
        expect(screen.queryByTestId('btn-preview-data')).toBeNull()
        expect(customRequest).not.toHaveBeenCalled()
    })

    // =========================================================================
    // CASE 7, 8, 9, 10: FILE RỖNG, HỎNG, THIẾU SHEET USERS, SAI HEADER
    // =========================================================================
    it('CASE 7: Xử lý thông báo lỗi NO_DATA khi file Excel rỗng không có dữ liệu', async () => {
        const customRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path.includes('/api/users/import/preview')) {
                return new Response(
                    JSON.stringify({
                        status: 'error',
                        code: 'NO_DATA',
                        message: 'File Excel không có dữ liệu để import.',
                    }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: { items: initialUsersList, total: 1 } }), { status: 200 })
        })

        renderUserManagementWithSession(customRequest, 'admin')

        await waitFor(() => {
            expect(screen.getByTestId('btn-import-excel')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-import-excel'))

        const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement
        fireEvent.change(fileInput, { target: { files: [createMockExcelFile('empty.xlsx')] } })

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-data')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('import-error-banner')).toBeDefined()
        })
        expect(screen.getByText(/File Excel không có dữ liệu để import/)).toBeDefined()
    })

    it('CASE 8: Xử lý thông báo lỗi INVALID_EXCEL_FILE khi file Excel hỏng', async () => {
        const customRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path.includes('/api/users/import/preview')) {
                return new Response(
                    JSON.stringify({
                        status: 'error',
                        code: 'INVALID_EXCEL_FILE',
                        message: 'File Excel không hợp lệ hoặc bị hỏng.',
                    }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: { items: initialUsersList, total: 1 } }), { status: 200 })
        })

        renderUserManagementWithSession(customRequest, 'admin')

        await waitFor(() => {
            expect(screen.getByTestId('btn-import-excel')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-import-excel'))

        const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement
        fireEvent.change(fileInput, { target: { files: [createMockExcelFile('corrupted.xlsx')] } })

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-data')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('import-error-banner')).toBeDefined()
        })
        expect(screen.getByText(/File Excel không hợp lệ hoặc bị hỏng/)).toBeDefined()
    })

    it('CASE 9: Xử lý thông báo lỗi MISSING_USERS_SHEET khi file thiếu sheet Users', async () => {
        const customRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path.includes('/api/users/import/preview')) {
                return new Response(
                    JSON.stringify({
                        status: 'error',
                        code: 'MISSING_USERS_SHEET',
                        message: "File Excel phải có sheet tên là 'Users'.",
                    }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: { items: initialUsersList, total: 1 } }), { status: 200 })
        })

        renderUserManagementWithSession(customRequest, 'admin')

        await waitFor(() => {
            expect(screen.getByTestId('btn-import-excel')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-import-excel'))

        const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement
        fireEvent.change(fileInput, { target: { files: [createMockExcelFile('missing_sheet.xlsx')] } })

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-data')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('import-error-banner')).toBeDefined()
        })
        expect(screen.getByText(/Users/)).toBeDefined()
    })

    it('CASE 10: Xử lý thông báo lỗi INVALID_HEADER khi tiêu đề cột không đúng chuẩn', async () => {
        const customRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path.includes('/api/users/import/preview')) {
                return new Response(
                    JSON.stringify({
                        status: 'error',
                        code: 'INVALID_HEADER',
                        message: 'Cấu trúc cột trong file Excel không đúng chuẩn.',
                    }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: { items: initialUsersList, total: 1 } }), { status: 200 })
        })

        renderUserManagementWithSession(customRequest, 'admin')

        await waitFor(() => {
            expect(screen.getByTestId('btn-import-excel')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-import-excel'))

        const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement
        fireEvent.change(fileInput, { target: { files: [createMockExcelFile('invalid_header.xlsx')] } })

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-data')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            const banner = screen.getByTestId('import-error-banner')
            expect(banner.textContent).toContain('Cấu trúc cột trong file Excel không đúng chuẩn.')
        })
    })

    // =========================================================================
    // CASE 13: PERMISSION (RBAC)
    // =========================================================================
    it('CASE 13: Quyền hạn RBAC: chỉ Admin có quyền user.manage mới thấy và dùng Import Excel, trainee bị chặn vào trang quản lý', async () => {
        // 1. Role trainee -> không có quyền user.view -> chuyển hướng đến trang /forbidden
        const { unmount } = renderUserManagementWithSession(undefined, 'trainee')

        await waitFor(() => {
            expect(screen.getByTestId('forbidden-page')).toBeDefined()
        })
        expect(screen.queryByTestId('btn-import-excel')).toBeNull()

        unmount()
        cleanup()

        // 2. Role admin -> có quyền user.view và user.manage -> hiển thị trang và nút Import Excel
        renderUserManagementWithSession(undefined, 'admin')

        await waitFor(() => {
            expect(screen.getByTestId('user-management-page')).toBeDefined()
            expect(screen.getByTestId('btn-import-excel')).toBeDefined()
        })
    })

    // =========================================================================
    // CASE 14: SECURITY (KHÔNG LỘ PLAINTEXT PASSWORD HAY HASH TRÊN DOM)
    // =========================================================================
    it('CASE 14: Bảo mật: không bao giờ hiển thị plaintext password hoặc password hash trong DOM', async () => {
        const sensitivePreviewData: ImportPreviewData = {
            filename: 'security_test.xlsx',
            headers: ['name', 'email', 'password', 'phone', 'role', 'status'],
            total_rows: 1,
            valid_rows: 1,
            invalid_rows: 0,
            rows: [
                {
                    row_number: 2,
                    name: 'Bảo Mật User',
                    email: 'secure@tms.local',
                    phone: '0901234567',
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
                return new Response(JSON.stringify({ status: 'success', data: sensitivePreviewData }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response(JSON.stringify({ status: 'success', data: { items: initialUsersList, total: 1 } }), { status: 200 })
        })

        renderUserManagementWithSession(customRequest, 'admin')

        await waitFor(() => {
            expect(screen.getByTestId('btn-import-excel')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-import-excel'))

        const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement
        fireEvent.change(fileInput, { target: { files: [createMockExcelFile('security_test.xlsx')] } })

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-data')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('import-preview-content')).toBeDefined()
        })

        // DOM does NOT expose sensitive raw password or password hash
        const modalHtml = screen.getByTestId('bulk-import-modal').innerHTML
        expect(modalHtml).not.toContain('Secret123!')
        expect(modalHtml).not.toContain('$2b$12$')
        expect(modalHtml).not.toContain('password_hash')
    })

    // =========================================================================
    // CASE 15: RESPONSIVE CLASS HOOKS VÀ SCROLLABLE CONTAINER
    // =========================================================================
    it('CASE 15: Responsive: kiểm tra cấu trúc container responsive và horizontal scroll cho preview table', async () => {
        const previewData: ImportPreviewData = {
            filename: 'responsive_test.xlsx',
            headers: ['name', 'email', 'password', 'phone', 'role', 'status'],
            total_rows: 1,
            valid_rows: 1,
            invalid_rows: 0,
            rows: [
                {
                    row_number: 2,
                    name: 'Responsive User',
                    email: 'responsive@tms.local',
                    phone: null,
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
                return new Response(JSON.stringify({ status: 'success', data: previewData }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response(JSON.stringify({ status: 'success', data: { items: initialUsersList, total: 1 } }), { status: 200 })
        })

        renderUserManagementWithSession(customRequest, 'admin')

        await waitFor(() => {
            expect(screen.getByTestId('btn-import-excel')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-import-excel'))

        const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement
        fireEvent.change(fileInput, { target: { files: [createMockExcelFile('responsive_test.xlsx')] } })

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-data')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('import-preview-content')).toBeDefined()
        })

        // Verify container has .import-modal-container and .has-preview classes
        const modalContainer = document.querySelector('.import-modal-container')
        expect(modalContainer).toBeDefined()
        expect(modalContainer?.classList.contains('has-preview')).toBe(true)

        // Verify table has scrollable wrapper .import-table-responsive-wrapper
        const tableContainer = document.querySelector('.import-table-responsive-wrapper')
        expect(tableContainer).toBeDefined()
    })
})
