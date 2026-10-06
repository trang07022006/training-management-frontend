// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { BulkUserImportModal } from './BulkUserImportModal'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { ImportPreviewData, ImportExecuteResult } from '../api/userApi'

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

function createMockFile(name: string, size = 1024): File {
    const content = new Array(size).fill('a').join('')
    return new File([content], name, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
}

const mockPreviewDataWithValid: ImportPreviewData = {
    filename: 'users_sample.xlsx',
    headers: ['name', 'email', 'password', 'phone', 'role', 'status'],
    total_rows: 3,
    valid_rows: 2,
    invalid_rows: 1,
    rows: [
        {
            row_number: 2,
            name: 'Nguyễn Văn A',
            email: 'a@daotao.edu.vn',
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
            email: 'b@daotao.edu.vn',
            phone: '0987654321',
            role: 'trainer',
            status: 'active',
            password_present: true,
            valid: true,
            errors: [],
        },
        {
            row_number: 4,
            name: 'Lê C',
            email: 'invalid-email',
            phone: null,
            role: 'manager',
            status: 'active',
            password_present: true,
            valid: false,
            errors: [{ field: 'email', code: 'INVALID_EMAIL', message: 'Email không đúng định dạng.' }],
        },
    ],
}

const mockPreviewDataNoValid: ImportPreviewData = {
    filename: 'all_invalid.xlsx',
    headers: ['name', 'email', 'password', 'phone', 'role', 'status'],
    total_rows: 1,
    valid_rows: 0,
    invalid_rows: 1,
    rows: [
        {
            row_number: 2,
            name: 'Hỏng Dữ Liệu',
            email: 'bad-email',
            phone: null,
            role: 'manager',
            status: 'active',
            password_present: true,
            valid: false,
            errors: [{ field: 'email', code: 'INVALID_EMAIL', message: 'Email không đúng định dạng.' }],
        },
    ],
}

const mockExecuteSuccessResponse: ImportExecuteResult = {
    status: 'success',
    message: 'Đã import 2/3 người dùng. Có 1 dòng không được import.',
    data: {
        filename: 'users_sample.xlsx',
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
            {
                row_number: 2,
                name: 'Nguyễn Văn A',
                email: 'a@daotao.edu.vn',
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
                email: 'b@daotao.edu.vn',
                phone: '0987654321',
                role: 'trainer',
                status: 'active',
                imported: true,
                result: 'imported',
                errors: [],
            },
            {
                row_number: 4,
                name: 'Lê C',
                email: 'invalid-email',
                phone: null,
                role: 'manager',
                status: 'active',
                imported: false,
                result: 'validation_error',
                errors: [{ field: 'email', code: 'INVALID_EMAIL', message: 'Email không đúng định dạng.' }],
            },
        ],
    },
}

const mockExecuteWithImportErrorResponse: ImportExecuteResult = {
    status: 'success',
    message: 'Đã import 1/3 người dùng. Có 2 dòng không được import.',
    data: {
        filename: 'users_sample.xlsx',
        total_rows: 3,
        valid_rows: 2,
        invalid_rows: 1,
        imported_rows: 1,
        skipped_rows: 2,
        failed_rows: 1,
        summary: {
            success: 1,
            validation_errors: 1,
            import_errors: 1,
        },
        error_summary: {
            INVALID_EMAIL: 1,
            DUPLICATE_EMAIL: 1,
        },
        rows: [
            {
                row_number: 2,
                name: 'Nguyễn Văn A',
                email: 'a@daotao.edu.vn',
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
                email: 'duplicate@daotao.edu.vn',
                phone: '0987654321',
                role: 'trainer',
                status: 'active',
                imported: false,
                result: 'import_error',
                errors: [{ field: 'email', code: 'DUPLICATE_EMAIL', message: 'Email này đã được sử dụng trong hệ thống.' }],
            },
            {
                row_number: 4,
                name: 'Lê C',
                email: 'invalid-email',
                phone: null,
                role: 'manager',
                status: 'active',
                imported: false,
                result: 'validation_error',
                errors: [{ field: 'email', code: 'INVALID_EMAIL', message: 'Email không đúng định dạng.' }],
            },
        ],
    },
}

describe('SCRUM-119: Activity A6.3 - Bulk User Import Execution & Confirmation Flow', () => {
    beforeEach(() => {
        localStorage.clear()
        sessionStorage.clear()
        window.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
        window.URL.revokeObjectURL = vi.fn()
    })

    // 1. preview có valid_rows > 0 → hiện nút Import
    it('1. preview có valid_rows > 0 → hiện nút Import', async () => {
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            const importBtn = screen.getByTestId('btn-start-import')
            expect(importBtn).toBeDefined()
            expect(importBtn.textContent).toContain('Import người dùng (2)')
        })
    })

    // 2. valid_rows = 0 → disable/ẩn import
    it('2. valid_rows = 0 → disable/ẩn import', async () => {
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataNoValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('bad.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.queryByTestId('btn-start-import')).toBeNull()
            const notice = screen.getByTestId('no-valid-rows-msg')
            expect(notice.textContent).toContain('Không có dòng hợp lệ để import.')
        })
    })

    // 3. click import mở confirm
    it('3. click import mở confirm', async () => {
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))

        expect(screen.getByTestId('import-confirm-box')).toBeDefined()
        expect(screen.getByTestId('import-confirm-box').textContent).toContain('Bạn có chắc muốn import 2 người dùng hợp lệ?')
        expect(screen.getByTestId('btn-confirm-import')).toBeDefined()
        expect(screen.getByTestId('btn-cancel-import')).toBeDefined()
    })

    // 4. cancel không gọi API
    it('4. cancel không gọi API', async () => {
        const allCalledPaths: string[] = []
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            allCalledPaths.push(path)
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        expect(screen.getByTestId('import-confirm-box')).toBeDefined()

        fireEvent.click(screen.getByTestId('btn-cancel-import'))

        expect(screen.queryByTestId('import-confirm-box')).toBeNull()
        expect(screen.getByTestId('btn-start-import')).toBeDefined()
        expect(allCalledPaths).not.toContain('/api/users/import')
    })

    // 5. confirm gọi POST /api/users/import
    it('5. confirm gọi POST /api/users/import', async () => {
        let calledImportPath = ''
        let calledImportMethod = ''

        const fakeRequest = vi.fn().mockImplementation(async (path: string, init?: RequestInit) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                calledImportPath = path
                calledImportMethod = init?.method ?? 'GET'
                return new Response(JSON.stringify(mockExecuteSuccessResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            expect(calledImportPath).toBe('/api/users/import')
            expect(calledImportMethod).toBe('POST')
        })
    })

    // 6. gửi đúng FormData/file
    it('6. gửi đúng FormData/file', async () => {
        let importBody: unknown = null

        const fakeRequest = vi.fn().mockImplementation(async (path: string, init?: RequestInit) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                importBody = init?.body
                return new Response(JSON.stringify(mockExecuteSuccessResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        const file = createMockFile('exec_test.xlsx')
        fireEvent.change(fileInput, { target: { files: [file] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            expect(importBody).toBeInstanceOf(FormData)
            const formData = importBody as FormData
            expect(formData.get('file')).toBeDefined()
            const attachedFile = formData.get('file') as File
            expect(attachedFile.name).toBe('exec_test.xlsx')
        })
    })

    // 7. loading state
    it('7. loading state', async () => {
        let resolveImport: (value: Response) => void
        const importPromise = new Promise<Response>((resolve) => {
            resolveImport = resolve
        })

        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                return importPromise
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        expect((screen.getByTestId('btn-close-import-modal') as HTMLButtonElement).disabled).toBe(true)
        expect((screen.getByTestId('btn-close-import-footer') as HTMLButtonElement).disabled).toBe(true)

        resolveImport!(
            new Response(JSON.stringify(mockExecuteSuccessResponse), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        )

        await waitFor(() => {
            expect(screen.getByTestId('import-result-message')).toBeDefined()
        })
    })

    // 8. không submit lặp
    it('8. không submit lặp', async () => {
        let resolveImport: (value: Response) => void
        const importPromise = new Promise<Response>((resolve) => {
            resolveImport = resolve
        })

        let importCallCount = 0

        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                importCallCount += 1
                return importPromise
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        expect(importCallCount).toBe(1)

        resolveImport!(
            new Response(JSON.stringify(mockExecuteSuccessResponse), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        )

        await waitFor(() => {
            expect(screen.getByTestId('import-result-message')).toBeDefined()
        })
    })

    // 9. hiển thị message thành công
    it('9. hiển thị message thành công', async () => {
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                return new Response(JSON.stringify(mockExecuteSuccessResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            const msgBanner = screen.getByTestId('import-result-message')
            expect(msgBanner.textContent).toContain('Đã import 2/3 người dùng. Có 1 dòng không được import.')
        })
    })

    // 10. hiển thị imported_rows
    it('10. hiển thị imported_rows', async () => {
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                return new Response(JSON.stringify(mockExecuteSuccessResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            expect(screen.getByTestId('summary-exec-success').textContent).toContain('2')
        })
    })

    // 11. hiển thị skipped_rows
    it('11. hiển thị skipped_rows', async () => {
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                return new Response(JSON.stringify(mockExecuteSuccessResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            expect(screen.getByTestId('summary-exec-skipped').textContent).toContain('1')
        })
    })

    // 12. hiển thị failed_rows
    it('12. hiển thị failed_rows', async () => {
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                return new Response(JSON.stringify(mockExecuteWithImportErrorResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            expect(screen.getByTestId('summary-exec-import-errors').textContent).toContain('1')
            expect(screen.getByTestId('summary-exec-validation-errors').textContent).toContain('1')
        })
    })

    // 13. hiển thị result imported
    it('13. hiển thị result imported', async () => {
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                return new Response(JSON.stringify(mockExecuteSuccessResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            expect(screen.getByTestId('exec-row-result-2').textContent).toBe('Đã import')
            expect(screen.getByTestId('exec-row-result-3').textContent).toBe('Đã import')
        })
    })

    // 14. hiển thị validation_error
    it('14. hiển thị validation_error', async () => {
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                return new Response(JSON.stringify(mockExecuteSuccessResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            expect(screen.getByTestId('exec-row-result-4').textContent).toBe('Lỗi dữ liệu')
            expect(screen.getByTestId('exec-row-errors-4').textContent).toContain('Email không đúng định dạng.')
        })
    })

    // 15. hiển thị import_error
    it('15. hiển thị import_error', async () => {
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                return new Response(JSON.stringify(mockExecuteWithImportErrorResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            expect(screen.getByTestId('exec-row-result-3').textContent).toBe('Import thất bại')
            expect(screen.getByTestId('exec-row-errors-3').textContent).toContain('Email này đã được sử dụng trong hệ thống.')
        })
    })

    // 16. error_summary hiển thị đúng
    it('16. error_summary hiển thị đúng', async () => {
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                return new Response(JSON.stringify(mockExecuteWithImportErrorResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            const errSummary = screen.getByTestId('import-error-summary')
            expect(errSummary.textContent).toContain('Tổng hợp lỗi')
            expect(screen.getByTestId('error-summary-INVALID_EMAIL').textContent).toContain('1')
            expect(screen.getByTestId('error-summary-DUPLICATE_EMAIL').textContent).toContain('1')
        })
    })

    // 17. không hiển thị password
    it('17. không hiển thị password', async () => {
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                return new Response(JSON.stringify(mockExecuteSuccessResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            const tableElem = screen.getByTestId('import-result-table')
            expect(tableElem.textContent).not.toContain('Mật khẩu')
            expect(tableElem.textContent).not.toContain('password')
            expect(tableElem.textContent).not.toContain('pbkdf2')
            expect(tableElem.textContent).not.toContain('bcrypt')
        })
    })

    // 18. API fail giữ nguyên preview
    it('18. API fail giữ nguyên preview', async () => {
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                return new Response(
                    JSON.stringify({
                        code: 'IMPORT_FAILED',
                        message: 'Lỗi khi lưu người dùng vào cơ sở dữ liệu.',
                    }),
                    { status: 500, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            const banner = screen.getByTestId('import-error-banner')
            expect(banner.textContent).toContain('Lỗi khi lưu người dùng vào cơ sở dữ liệu.')
            expect(screen.getByTestId('preview-summary')).toBeDefined()
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })
    })

    // 19. retry import hoạt động
    it('19. retry import hoạt động', async () => {
        let attempt = 0
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                attempt += 1
                if (attempt === 1) {
                    return new Response(
                        JSON.stringify({
                            code: 'IMPORT_FAILED',
                            message: 'Lỗi khi lưu người dùng vào cơ sở dữ liệu.',
                        }),
                        { status: 500, headers: { 'Content-Type': 'application/json' } },
                    )
                }
                return new Response(JSON.stringify(mockExecuteSuccessResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        // Lần 1 fail
        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            expect(screen.getByTestId('import-error-banner')).toBeDefined()
        })

        // Lần 2 retry success
        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            expect(screen.getByTestId('import-result-message')).toBeDefined()
            expect(screen.queryByTestId('import-error-banner')).toBeNull()
        })
    })

    // 20. imported_rows > 0 → refresh user list
    it('20. imported_rows > 0 → refresh user list', async () => {
        const handleSuccessMock = vi.fn()

        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                return new Response(JSON.stringify(mockExecuteSuccessResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(
            <BulkUserImportModal
                isOpen={true}
                onClose={() => {}}
                onSuccess={handleSuccessMock}
                customRequest={fakeRequest}
            />,
        )

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            expect(handleSuccessMock).toHaveBeenCalledTimes(1)
        })
    })

    // 21. Import file khác reset state
    it('21. Import file khác reset state', async () => {
        const fakeRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path === '/api/users/import/preview') {
                return new Response(JSON.stringify({ status: 'success', data: mockPreviewDataWithValid }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            if (path === '/api/users/import') {
                return new Response(JSON.stringify(mockExecuteSuccessResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }
            return new Response('{}', { status: 404 })
        })

        renderWithSession(<BulkUserImportModal isOpen={true} onClose={() => {}} customRequest={fakeRequest} />)

        const fileInput = screen.getByTestId('import-file-input')
        fireEvent.change(fileInput, { target: { files: [createMockFile('users.xlsx')] } })
        fireEvent.click(screen.getByTestId('btn-preview-data'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-start-import')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-start-import'))
        fireEvent.click(screen.getByTestId('btn-confirm-import'))

        await waitFor(() => {
            expect(screen.getByTestId('btn-import-another-file')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-import-another-file'))

        expect(screen.getByTestId('import-dropzone')).toBeDefined()
        expect(screen.queryByTestId('selected-file-info')).toBeNull()
        expect(screen.queryByTestId('import-result-message')).toBeNull()
        expect(screen.queryByTestId('import-result-table')).toBeNull()
    })
})
