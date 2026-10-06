// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { BulkUserImportModal } from './BulkUserImportModal'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { ImportPreviewData } from '../api/userApi'

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

/**
 * Helper tạo mock File object
 */
function createMockFile(name: string, size = 1024, type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'): File {
    const content = new Array(size).fill('a').join('')
    return new File([content], name, { type })
}

/**
 * Mock data preview chuẩn từ backend
 */
const mockPreviewSuccessData: ImportPreviewData = {
    filename: 'users_sample.xlsx',
    headers: ['name', 'email', 'password', 'phone', 'role', 'status'],
    total_rows: 3,
    valid_rows: 2,
    invalid_rows: 1,
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
        {
            row_number: 4,
            name: 'Lê Văn Lỗi',
            email: 'invalid-email',
            phone: '123',
            role: 'manager',
            status: 'unknown',
            password_present: false,
            valid: false,
            errors: [
                { field: 'email', code: 'INVALID_EMAIL', message: 'Email không đúng định dạng.' },
                { field: 'role', code: 'INVALID_ROLE', message: 'Vai trò không hợp lệ: manager.' },
                { field: 'password', code: 'PASSWORD_REQUIRED', message: 'Mật khẩu là bắt buộc.' },
            ],
        },
    ],
}

describe('SCRUM-119: Activity A6.2 - Bulk User Import File Selection & Preview Test Suite', () => {
    beforeEach(() => {
        localStorage.clear()
        sessionStorage.clear()
        window.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
        window.URL.revokeObjectURL = vi.fn()
    })

    // 1. Chọn file .xlsx hợp lệ
    it('1. Cho phép chọn file .xlsx hợp lệ và hiển thị giao diện file đã chọn', () => {
        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} />)

        const fileInput = screen.getByTestId('import-file-input')
        const file = createMockFile('danh_sach_nhan_vien.xlsx', 2048)

        fireEvent.change(fileInput, { target: { files: [file] } })

        expect(screen.getByTestId('selected-file-info')).toBeDefined()
        expect(screen.getByTestId('selected-file-name').textContent).toBe('danh_sach_nhan_vien.xlsx')
        expect(screen.queryByTestId('import-error-banner')).toBeNull()
    })

    // 2. Từ chối file không phải .xlsx
    it('2. Từ chối file không phải .xlsx, không lưu file và hiển thị thông báo lỗi', () => {
        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} />)

        const fileInput = screen.getByTestId('import-file-input')
        const invalidFile = createMockFile('danh_sach.csv', 1024, 'text/csv')

        fireEvent.change(fileInput, { target: { files: [invalidFile] } })

        // Không hiển thị file info
        expect(screen.queryByTestId('selected-file-info')).toBeNull()
        // Hiển thị thông báo lỗi
        const banner = screen.getByTestId('import-error-banner')
        expect(banner.textContent).toContain('Chỉ hỗ trợ file Excel định dạng .xlsx.')
    })

    // 3. Hiển thị tên file và dung lượng
    it('3. Hiển thị đầy đủ tên file và dung lượng định dạng chuẩn', () => {
        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} />)

        const fileInput = screen.getByTestId('import-file-input')
        // 5120 bytes = 5.0 KB
        const file = createMockFile('users_batch_1.xlsx', 5120)

        fireEvent.change(fileInput, { target: { files: [file] } })

        const nameElem = screen.getByTestId('selected-file-name')
        const sizeElem = screen.getByTestId('selected-file-size')

        expect(nameElem.textContent).toBe('users_batch_1.xlsx')
        expect(sizeElem.textContent).toContain('KB')
    })

    // 4. Bỏ file / chọn lại
    it('4. Cho phép bỏ file đã chọn và quay lại khu vực dropzone ban đầu', () => {
        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} />)

        const fileInput = screen.getByTestId('import-file-input')
        const file = createMockFile('users.xlsx', 1024)

        fireEvent.change(fileInput, { target: { files: [file] } })
        expect(screen.getByTestId('selected-file-info')).toBeDefined()

        // Bấm nút bỏ file
        const removeBtn = screen.getByTestId('btn-remove-file')
        fireEvent.click(removeBtn)

        expect(screen.queryByTestId('selected-file-info')).toBeNull()
        expect(screen.getByTestId('import-dropzone')).toBeDefined()
    })

    // 5. Click kiểm tra gọi đúng POST /api/users/import/preview
    it('5. Click "Kiểm tra dữ liệu" gọi đúng POST /api/users/import/preview', async () => {
        let calledPath = ''
        let calledMethod = ''

        const fakeRequest = vi.fn().mockImplementation(async (path: string, init?: RequestInit) => {
            calledPath = path
            calledMethod = init?.method ?? 'GET'
            return new Response(JSON.stringify({ status: 'success', data: mockPreviewSuccessData }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        const file = createMockFile('users.xlsx', 1024)
        fireEvent.change(fileInput, { target: { files: [file] } })

        const previewBtn = screen.getByTestId('btn-preview-data')
        expect(previewBtn.textContent).toContain('Kiểm tra dữ liệu')

        fireEvent.click(previewBtn)

        await waitFor(() => {
            expect(calledPath).toBe('/api/users/import/preview')
            expect(calledMethod).toBe('POST')
        })
    })

    // 6. Gửi multipart/form-data đúng
    it('6. Gửi đúng FormData chứa trường "file" với file đã chọn', async () => {
        let capturedBody: unknown = null

        const fakeRequest = vi.fn().mockImplementation(async (_path: string, init?: RequestInit) => {
            capturedBody = init?.body
            return new Response(JSON.stringify({ status: 'success', data: mockPreviewSuccessData }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        const file = createMockFile('my_data.xlsx', 1024)
        fireEvent.change(fileInput, { target: { files: [file] } })

        const previewBtn = screen.getByTestId('btn-preview-data')
        fireEvent.click(previewBtn)

        await waitFor(() => {
            expect(capturedBody).toBeInstanceOf(FormData)
            const formData = capturedBody as FormData
            expect(formData.get('file')).toBeDefined()
            const attachedFile = formData.get('file') as File
            expect(attachedFile.name).toBe('my_data.xlsx')
        })
    })

    // 7. Loading state
    it('7. Hiển thị loading "Đang kiểm tra...", spinner và disable các nút thao tác', async () => {
        let resolvePreview: (value: Response) => void
        const previewPromise = new Promise<Response>((resolve) => {
            resolvePreview = resolve
        })

        const fakeRequest = vi.fn().mockImplementation(() => previewPromise)

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        const file = createMockFile('users.xlsx', 1024)
        fireEvent.change(fileInput, { target: { files: [file] } })

        const previewBtn = screen.getByTestId('btn-preview-data')
        const removeBtn = screen.getByTestId('btn-remove-file')
        const closeBtn = screen.getByTestId('btn-close-import-modal')

        fireEvent.click(previewBtn)

        // Đang kiểm tra
        expect((previewBtn as HTMLButtonElement).disabled).toBe(true)
        expect(previewBtn.textContent).toContain('Đang kiểm tra...')
        expect((removeBtn as HTMLButtonElement).disabled).toBe(true)
        expect((closeBtn as HTMLButtonElement).disabled).toBe(true)

        // Kết thúc kiểm tra
        resolvePreview!(
            new Response(JSON.stringify({ status: 'success', data: mockPreviewSuccessData }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        )

        await waitFor(() => {
            expect((closeBtn as HTMLButtonElement).disabled).toBe(false)
            expect(screen.getByTestId('preview-summary')).toBeDefined()
        })
    })

    // 8. Summary total/valid/invalid đúng
    it('8. Hiển thị chính xác summary: tổng số dòng, dòng hợp lệ và dòng có lỗi', async () => {
        const fakeRequest = vi.fn().mockImplementation(async () => {
            return new Response(JSON.stringify({ status: 'success', data: mockPreviewSuccessData }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })

        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('summary-total-rows').textContent).toContain('3')
            expect(screen.getByTestId('summary-valid-rows').textContent).toContain('2')
            expect(screen.getByTestId('summary-invalid-rows').textContent).toContain('1')
        })
    })

    // 9. Valid row hiển thị đúng
    it('9. Hiển thị dòng hợp lệ với đầy đủ thông tin và huy hiệu "Hợp lệ"', async () => {
        const fakeRequest = vi.fn().mockImplementation(async () => {
            return new Response(JSON.stringify({ status: 'success', data: mockPreviewSuccessData }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })

        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            const row2 = screen.getByTestId('preview-row-2')
            expect(row2.textContent).toContain('Nguyễn Văn A')
            expect(row2.textContent).toContain('nguyenvana@daotao.edu.vn')
            expect(row2.textContent).toContain('0912345678')
            expect(row2.textContent).toContain('trainee')
            expect(row2.textContent).toContain('active')

            const resultPill = screen.getByTestId('row-result-2')
            expect(resultPill.textContent).toBe('Hợp lệ')
        })
    })

    // 10. Invalid row hiển thị lỗi đầy đủ
    it('10. Hiển thị dòng không hợp lệ với huy hiệu "Có lỗi" và toàn bộ danh sách lỗi chi tiết', async () => {
        const fakeRequest = vi.fn().mockImplementation(async () => {
            return new Response(JSON.stringify({ status: 'success', data: mockPreviewSuccessData }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })

        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            const row4 = screen.getByTestId('preview-row-4')
            expect(row4.textContent).toContain('Lê Văn Lỗi')

            const resultPill = screen.getByTestId('row-result-4')
            expect(resultPill.textContent).toBe('Có lỗi')

            const errorList = screen.getByTestId('row-errors-4')
            expect(errorList.textContent).toContain('Email không đúng định dạng.')
            expect(errorList.textContent).toContain('Vai trò không hợp lệ: manager.')
            expect(errorList.textContent).toContain('Mật khẩu là bắt buộc.')
        })
    })

    // 11. Tuyệt đối không hiển thị password hay password hash
    it('11. Tuyệt đối không hiển thị plaintext password hay password hash trên giao diện', async () => {
        const sensitiveData: ImportPreviewData = {
            filename: 'users_secrets.xlsx',
            headers: ['name', 'email', 'password', 'phone', 'role', 'status'],
            total_rows: 1,
            valid_rows: 1,
            invalid_rows: 0,
            rows: [
                {
                    row_number: 2,
                    name: 'Bảo Mật Cao',
                    email: 'secret@daotao.edu.vn',
                    phone: '0900000000',
                    role: 'admin',
                    status: 'active',
                    password_present: true,
                    valid: true,
                    errors: [],
                },
            ],
        }

        const fakeRequest = vi.fn().mockImplementation(async () => {
            return new Response(JSON.stringify({ status: 'success', data: sensitiveData }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('preview-table')).toBeDefined()
        })

        const tableElem = screen.getByTestId('preview-table')
        // Không chứa cột Mật khẩu
        expect(tableElem.textContent).not.toContain('Mật khẩu')
        expect(tableElem.textContent).not.toContain('Password')
        expect(tableElem.textContent).not.toContain('pbkdf2')
        expect(tableElem.textContent).not.toContain('bcrypt')
    })

    // 12. API error hiển thị tiếng Việt thân thiện
    it('12. Hiển thị thông báo lỗi tiếng Việt dễ hiểu khi backend trả lỗi upload / cấu trúc file', async () => {
        const fakeRequest = vi.fn().mockImplementation(async () => {
            return new Response(
                JSON.stringify({
                    code: 'MISSING_USERS_SHEET',
                    message: "File Excel phải có sheet tên là 'Users'.",
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                },
            )
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('invalid_sheet.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            const banner = screen.getByTestId('import-error-banner')
            expect(banner.textContent).toContain("File Excel phải có sheet tên là 'Users'.")
            // Không chứa mã kỹ thuật
            expect(banner.textContent).not.toContain('MISSING_USERS_SHEET')
        })
    })

    // 13. Chọn file mới reset preview cũ
    it('13. Chọn file mới lập tức reset kết quả preview và summary của file trước đó', async () => {
        const fakeRequest = vi.fn().mockImplementation(async () => {
            return new Response(JSON.stringify({ status: 'success', data: mockPreviewSuccessData }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('file1.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('preview-summary')).toBeDefined()
        })

        // Chọn file mới
        fireEvent.change(fileInput, { target: { files: [createMockFile('file2.xlsx')] } })

        // Preview cũ phải bị reset ngay
        expect(screen.queryByTestId('preview-summary')).toBeNull()
        expect(screen.queryByTestId('preview-table')).toBeNull()
        expect(screen.getByTestId('selected-file-name').textContent).toBe('file2.xlsx')
    })

    // 14. Đóng / mở modal reset state
    it('14. Đóng và mở lại modal reset toàn bộ state (file, preview, lỗi, loading)', async () => {
        const fakeRequest = vi.fn().mockImplementation(async () => {
            return new Response(JSON.stringify({ status: 'success', data: mockPreviewSuccessData }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        })

        const { rerender } = renderWithSession(
            <BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />,
        )

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('preview-summary')).toBeDefined()
        })

        // Đóng modal (isOpen = false)
        rerender(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin">
                        <BulkUserImportModal isOpen={false} onClose={() => {}} customRequest={fakeRequest} />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.queryByTestId('bulk-import-modal')).toBeNull()

        // Mở lại modal (isOpen = true)
        rerender(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin">
                        <BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        // State được reset về ban đầu
        expect(screen.getByTestId('import-dropzone')).toBeDefined()
        expect(screen.queryByTestId('selected-file-info')).toBeNull()
        expect(screen.queryByTestId('preview-summary')).toBeNull()
        expect(screen.queryByTestId('import-error-banner')).toBeNull()
    })

    // 15. Tuyệt đối không gọi POST /api/users/import trong Activity A6.2
    it('15. Tuyệt đối không gọi POST /api/users/import trong Activity A6.2', async () => {
        const allCalledPaths: string[] = []

        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            allCalledPaths.push(path)
            return new Response(JSON.stringify({ status: 'success', data: mockPreviewSuccessData }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('preview-table')).toBeDefined()
        })

        // Xác nhận không có bất kỳ request nào gửi tới /api/users/import
        expect(allCalledPaths).not.toContain('/api/users/import')
        expect(allCalledPaths.some((p) => p === '/api/users/import')).toBe(false)
    })
})
