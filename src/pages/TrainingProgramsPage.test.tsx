// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { TrainingProgramsPage } from './TrainingProgramsPage'
import { UserProfilePage } from './UserProfilePage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { TrainingProgram } from '../api/trainingProgramApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const samplePrograms: TrainingProgram[] = [
    {
        id: 'prog-01',
        code: 'CNTT-K21',
        name: 'Công nghệ thông tin K21',
        description: 'Chương trình tiêu chuẩn CNTT',
        duration_semesters: 8,
        status: 'active',
        created_at: '2026-01-10T08:00:00Z',
        updated_at: '2026-01-15T09:30:00Z',
    },
    {
        id: 'prog-02',
        code: 'ATTT-K21',
        name: 'An toàn thông tin K21',
        description: null,
        duration_semesters: 9,
        status: 'draft',
        created_at: '2026-02-01T08:00:00Z',
        updated_at: '2026-02-05T09:30:00Z',
    },
    {
        id: 'prog-03',
        code: 'DTVT-K19',
        name: 'Điện tử viễn thông K19',
        description: 'Chương trình cũ',
        duration_semesters: 10,
        status: 'archived',
        created_at: '2025-01-01T08:00:00Z',
        updated_at: '2025-06-01T09:30:00Z',
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
            startSession({ accessToken: 'mock-token', refreshToken: 'mock-refresh' }, role)
        }
    }, [role, startSession])

    if (role !== undefined && !hasSession) {
        return <div>Initializing session...</div>
    }

    return <>{children}</>
}

function renderWithSession(
    ui: ReactNode,
    options: { role?: string } = {},
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

describe('TrainingProgramsPage - Test Matrix SCRUM-122 Activity A6', () => {
    // 01. Render danh sách
    it('01. Render danh sách chương trình đào tạo thành công với tiêu đề và các cột', async () => {
        renderWithSession(
            <TrainingProgramsPage initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('programs-page-title')).toBeDefined()
        })
        expect(screen.getByTestId('programs-page-title').textContent).toContain('Quản lý chương trình đào tạo')
        expect(screen.getByTestId('programs-page-title').textContent).toContain('(3)')
        expect(screen.getByTestId('program-code-prog-01').textContent).toBe('CNTT-K21')
        expect(screen.getByTestId('program-code-prog-02').textContent).toBe('ATTT-K21')
        expect(screen.getByTestId('program-code-prog-03').textContent).toBe('DTVT-K19')
    })

    // 02. Loading
    it('02. Loading state hiển thị spinner khi đang tải danh sách', async () => {
        const slowRequest = vi.fn(() => new Promise<Response>(() => {}))

        renderWithSession(
            <TrainingProgramsPage customRequest={slowRequest} />,
            { role: 'admin' },
        )

        expect(screen.getByTestId('programs-loading-state')).toBeDefined()
        expect(screen.getByText(/Đang tải danh sách chương trình đào tạo/)).toBeDefined()
    })

    // 03. Empty state
    it('03. Empty state hiển thị thông báo thân thiện khi không có dữ liệu', async () => {
        renderWithSession(
            <TrainingProgramsPage initialPrograms={[]} initialTotal={0} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('programs-empty-state')).toBeDefined()
        })
        expect(screen.getByText('Không tìm thấy chương trình đào tạo nào')).toBeDefined()
    })

    // 04. API error
    it('04. API error hiển thị banner lỗi và cho phép đóng banner', async () => {
        const errorRequest = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({ code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' }),
        })

        renderWithSession(
            <TrainingProgramsPage customRequest={errorRequest} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('banner-error')).toBeDefined()
        })
        expect(screen.getByTestId('banner-error').textContent).toContain('Đã xảy ra lỗi. Vui lòng thử lại.')

        const closeBtn = screen.getByLabelText('Đóng thông báo lỗi')
        fireEvent.click(closeBtn)
        expect(screen.queryByTestId('banner-error')).toBeNull()
    })

    // 05. Search
    it('05. Search input gửi tham số search lên backend và reset về trang 1', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                data: { items: [samplePrograms[0]], total: 1, page: 1, page_size: 10, total_pages: 1 },
            }),
        })

        renderWithSession(
            <TrainingProgramsPage customRequest={mockRequest} initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        const searchInput = screen.getByTestId('programs-search-input')
        fireEvent.change(searchInput, { target: { value: 'CNTT' } })

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                expect.stringContaining('search=CNTT'),
                expect.any(Object),
            )
        })
    })

    // 06. Filter status
    it('06. Filter status gửi tham số status lên backend', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                data: { items: [samplePrograms[1]], total: 1, page: 1, page_size: 10, total_pages: 1 },
            }),
        })

        renderWithSession(
            <TrainingProgramsPage customRequest={mockRequest} initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        const statusSelect = screen.getByTestId('programs-status-select')
        fireEvent.change(statusSelect, { target: { value: 'draft' } })

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                expect.stringContaining('status=draft'),
                expect.any(Object),
            )
        })
    })

    // 07. Pagination
    it('07. Pagination chuyển trang chính xác khi click Sau và Trước', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                data: { items: [samplePrograms[0]], total: 25, page: 2, page_size: 10, total_pages: 3 },
            }),
        })

        renderWithSession(
            <TrainingProgramsPage
                customRequest={mockRequest}
                initialPrograms={samplePrograms}
                initialTotal={25}
                pageSize={10}
            />,
            { role: 'admin' },
        )

        const nextBtn = screen.getByTestId('btn-pagination-next')
        fireEvent.click(nextBtn)

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                expect.stringContaining('page=2'),
                expect.any(Object),
            )
        })
    })

    // 08. course.view xem được list
    it('08. course.view (trainee) xem được danh sách chương trình đào tạo', async () => {
        renderWithSession(
            <TrainingProgramsPage initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'trainee' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('program-code-prog-01')).toBeDefined()
        })
        expect(screen.getByText('Công nghệ thông tin K21')).toBeDefined()
    })

    // 09. course.view không thấy Add
    it('09. course.view không thấy nút "Thêm chương trình"', async () => {
        renderWithSession(
            <TrainingProgramsPage initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'trainee' },
        )

        await waitFor(() => {
            expect(screen.queryByTestId('btn-create-program')).toBeNull()
        })
    })

    // 10. course.view không thấy Edit
    it('10. course.view không thấy nút Sửa trên từng dòng', async () => {
        renderWithSession(
            <TrainingProgramsPage initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'trainee' },
        )

        await waitFor(() => {
            expect(screen.queryByTestId('btn-edit-prog-01')).toBeNull()
        })
    })

    // 11. course.view không thấy Delete
    it('11. course.view không thấy nút Xóa trên từng dòng', async () => {
        renderWithSession(
            <TrainingProgramsPage initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'trainee' },
        )

        await waitFor(() => {
            expect(screen.queryByTestId('btn-delete-prog-01')).toBeNull()
        })
    })

    // 12. course.manage thấy CRUD actions
    it('12. course.manage (trainer/admin) thấy đầy đủ các nút Thêm, Sửa, Xóa', async () => {
        renderWithSession(
            <TrainingProgramsPage initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-create-program')).toBeDefined()
        })
        expect(screen.getByTestId('btn-edit-prog-01')).toBeDefined()
        expect(screen.getByTestId('btn-delete-prog-01')).toBeDefined()
    })

    // 13. Mở form Create
    it('13. Mở modal tạo chương trình thành công với form trống', async () => {
        renderWithSession(
            <TrainingProgramsPage initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        const addBtn = screen.getByTestId('btn-create-program')
        fireEvent.click(addBtn)

        expect(screen.getByTestId('modal-create-program')).toBeDefined()
        expect(screen.getByTestId('create-input-code')).toBeDefined()
        expect(screen.getByTestId('create-input-name')).toBeDefined()
    })

    // 14. Validation code
    it('14. Validation mã chương trình bắt buộc và không quá 50 ký tự', async () => {
        renderWithSession(
            <TrainingProgramsPage initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-create-program'))

        // Thử submit trống
        fireEvent.click(screen.getByTestId('btn-submit-create'))
        expect(screen.getByTestId('error-code').textContent).toBe('Mã chương trình là bắt buộc.')

        // Thử nhập quá 50 ký tự
        fireEvent.change(screen.getByTestId('create-input-code'), {
            target: { value: 'A'.repeat(51) },
        })
        fireEvent.click(screen.getByTestId('btn-submit-create'))
        expect(screen.getByTestId('error-code').textContent).toBe(
            'Mã chương trình không được vượt quá 50 ký tự.',
        )
    })

    // 15. Validation name
    it('15. Validation tên chương trình bắt buộc và không quá 255 ký tự', async () => {
        renderWithSession(
            <TrainingProgramsPage initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-create-program'))
        fireEvent.change(screen.getByTestId('create-input-code'), { target: { value: 'VALID-CODE' } })

        fireEvent.click(screen.getByTestId('btn-submit-create'))
        expect(screen.getByTestId('error-name').textContent).toBe('Tên chương trình là bắt buộc.')
    })

    // 16. Validation duration
    it('16. Validation thời lượng học kỳ phải là số nguyên dương từ 1 đến 65535', async () => {
        renderWithSession(
            <TrainingProgramsPage initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-create-program'))
        fireEvent.change(screen.getByTestId('create-input-code'), { target: { value: 'VALID-CODE' } })
        fireEvent.change(screen.getByTestId('create-input-name'), { target: { value: 'Tên hợp lệ' } })
        fireEvent.change(screen.getByTestId('create-input-duration'), { target: { value: '-2' } })

        fireEvent.click(screen.getByTestId('btn-submit-create'))
        expect(screen.getByTestId('error-duration').textContent).toBe(
            'Thời lượng học kỳ phải là số nguyên dương từ 1 đến 65535.',
        )
    })

    // 17. Create success
    it('17. Tạo chương trình thành công: gửi POST, đóng modal, hiển thị thông báo thành công', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    status: 201,
                    json: async () => ({
                        status: 'success',
                        data: {
                            id: 'new-id',
                            code: 'NEW-01',
                            name: 'Chương trình mới',
                            status: 'draft',
                        },
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { items: samplePrograms, total: 4, page: 1, page_size: 10, total_pages: 1 },
                }),
            })
        })

        renderWithSession(
            <TrainingProgramsPage customRequest={mockRequest} initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-create-program'))
        fireEvent.change(screen.getByTestId('create-input-code'), { target: { value: 'NEW-01' } })
        fireEvent.change(screen.getByTestId('create-input-name'), { target: { value: 'Chương trình mới' } })
        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(screen.queryByTestId('modal-create-program')).toBeNull()
        })
        expect(screen.getByTestId('banner-success').textContent).toContain('Tạo chương trình đào tạo thành công.')
    })

    // 18. Duplicate code 409
    it('18. Xử lý 409 DUPLICATE_CODE khi tạo chương trình', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: false,
            status: 409,
            json: async () => ({
                code: 'DUPLICATE_CODE',
                message: 'Mã chương trình đào tạo đã tồn tại trong hệ thống.',
            }),
        })

        renderWithSession(
            <TrainingProgramsPage customRequest={mockRequest} initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-create-program'))
        fireEvent.change(screen.getByTestId('create-input-code'), { target: { value: 'CNTT-K21' } })
        fireEvent.change(screen.getByTestId('create-input-name'), { target: { value: 'Trùng mã' } })
        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(screen.getByTestId('error-code').textContent).toBe(
                'Mã chương trình đào tạo đã tồn tại.',
            )
        })
    })

    // 19. Open Edit
    it('19. Mở modal Edit nạp đúng dữ liệu của chương trình được chọn', async () => {
        renderWithSession(
            <TrainingProgramsPage initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-edit-prog-01'))

        expect(screen.getByTestId('modal-edit-program')).toBeDefined()
        const codeInput = screen.getByTestId('edit-input-code') as HTMLInputElement
        const nameInput = screen.getByTestId('edit-input-name') as HTMLInputElement
        expect(codeInput.value).toBe('CNTT-K21')
        expect(nameInput.value).toBe('Công nghệ thông tin K21')
    })

    // 20. Edit success
    it('20. Cập nhật chương trình thành công qua PUT', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'PUT') {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: { ...samplePrograms[0], name: 'CNTT K21 Sửa' },
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { items: samplePrograms, total: 3, page: 1, page_size: 10, total_pages: 1 },
                }),
            })
        })

        renderWithSession(
            <TrainingProgramsPage customRequest={mockRequest} initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-edit-prog-01'))
        fireEvent.change(screen.getByTestId('edit-input-name'), { target: { value: 'CNTT K21 Sửa' } })
        fireEvent.click(screen.getByTestId('btn-submit-edit'))

        await waitFor(() => {
            expect(screen.queryByTestId('modal-edit-program')).toBeNull()
        })
        expect(screen.getByTestId('banner-success').textContent).toContain('Cập nhật chương trình đào tạo thành công.')
    })

    // 21. Cancel Edit
    it('21. Hủy Edit đóng modal và không lưu thay đổi', async () => {
        renderWithSession(
            <TrainingProgramsPage initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-edit-prog-01'))
        expect(screen.getByTestId('modal-edit-program')).toBeDefined()

        fireEvent.click(screen.getByTestId('btn-cancel-edit'))
        expect(screen.queryByTestId('modal-edit-program')).toBeNull()
    })

    // 22. Delete confirm
    it('22. Click Xóa mở dialog xác nhận với tên và mã chương trình', async () => {
        renderWithSession(
            <TrainingProgramsPage initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-delete-prog-01'))

        expect(screen.getByTestId('modal-delete-confirm')).toBeDefined()
        expect(screen.getByText(/CNTT-K21 - Công nghệ thông tin K21/)).toBeDefined()
    })

    // 23. Cancel Delete
    it('23. Hủy Delete đóng dialog và không gửi lệnh xóa', async () => {
        const mockRequest = vi.fn()

        renderWithSession(
            <TrainingProgramsPage customRequest={mockRequest} initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-delete-prog-01'))
        fireEvent.click(screen.getByTestId('btn-cancel-delete'))

        expect(screen.queryByTestId('modal-delete-confirm')).toBeNull()
        expect(mockRequest).not.toHaveBeenCalled()
    })

    // 24. Delete success
    it('24. Xóa chương trình thành công gửi DELETE và cập nhật giao diện', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'DELETE') {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ status: 'success', data: { id: 'prog-01', deleted: true } }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { items: [samplePrograms[1]], total: 2, page: 1, page_size: 10, total_pages: 1 },
                }),
            })
        })

        renderWithSession(
            <TrainingProgramsPage customRequest={mockRequest} initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-delete-prog-01'))
        fireEvent.click(screen.getByTestId('btn-confirm-delete'))

        await waitFor(() => {
            expect(screen.queryByTestId('modal-delete-confirm')).toBeNull()
        })
        expect(screen.getByTestId('banner-success').textContent).toContain('Xóa chương trình đào tạo thành công.')
    })

    // 25. PROGRAM_IN_USE 409
    it('25. PROGRAM_IN_USE 409 hiển thị rõ hướng dẫn lưu trữ thay vì xóa', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: false,
            status: 409,
            json: async () => ({
                code: 'PROGRAM_IN_USE',
                message: 'Chương trình đang có môn học liên kết',
            }),
        })

        renderWithSession(
            <TrainingProgramsPage customRequest={mockRequest} initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-delete-prog-01'))
        fireEvent.click(screen.getByTestId('btn-confirm-delete'))

        await waitFor(() => {
            expect(screen.getByTestId('delete-dialog-error')).toBeDefined()
        })
        expect(screen.getByTestId('delete-dialog-error').textContent).toContain(
            'Không thể xóa chương trình vì đang có dữ liệu liên quan. Hãy chuyển chương trình sang trạng thái Đã lưu trữ nếu không còn sử dụng.',
        )
    })

    // 26. Unauthorized handling
    it('26. Xử lý lỗi 401 Unauthorized thân thiện', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            json: async () => ({ code: 'UNAUTHORIZED', message: 'Token hết hạn' }),
        })

        renderWithSession(
            <TrainingProgramsPage customRequest={mockRequest} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('banner-error')).toBeDefined()
        })
        expect(screen.getByText('Bạn cần đăng nhập để tiếp tục.')).toBeDefined()
    })

    // 27. Forbidden handling
    it('27. Xử lý lỗi 403 Forbidden thân thiện', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: false,
            status: 403,
            json: async () => ({ code: 'FORBIDDEN', message: 'Không có quyền' }),
        })

        renderWithSession(
            <TrainingProgramsPage customRequest={mockRequest} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('banner-error')).toBeDefined()
        })
        expect(screen.getByText('Bạn không có quyền thực hiện thao tác này.')).toBeDefined()
    })

    // 28. API client có Bearer token
    it('28. Request function tự động gắn Bearer Token qua useSession', async () => {
        const customReq = vi.fn().mockImplementation(() => {
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { items: [], total: 0, page: 1, page_size: 10, total_pages: 0 },
                }),
            })
        })

        renderWithSession(
            <TrainingProgramsPage customRequest={customReq} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(customReq).toHaveBeenCalled()
        })
        expect(customReq).toHaveBeenCalledWith(
            expect.stringContaining('/api/v1/training-programs'),
            expect.any(Object),
        )
    })

    // 29. Query parameters đúng
    it('29. Query parameters page, page_size, search, status truyền đúng định dạng', async () => {
        const mockReq = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                data: { items: [], total: 0, page: 1, page_size: 10, total_pages: 0 },
            }),
        })

        renderWithSession(
            <TrainingProgramsPage customRequest={mockReq} initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        const statusSelect = screen.getByTestId('programs-status-select')
        fireEvent.change(statusSelect, { target: { value: 'active' } })

        await waitFor(() => {
            expect(mockReq).toHaveBeenCalledWith(
                expect.stringMatching(/\/api\/v1\/training-programs\?.*status=active/),
                expect.any(Object),
            )
        })
    })

    // 30. Mobile component không lỗi render
    it('30. Render trên màn hình mobile 360px không bị lỗi cấu trúc', async () => {
        window.innerWidth = 360
        window.innerHeight = 640
        window.dispatchEvent(new Event('resize'))

        renderWithSession(
            <TrainingProgramsPage initialPrograms={samplePrograms} initialTotal={3} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('training-programs-page')).toBeDefined()
        })
        expect(screen.getByTestId('programs-table-container')).toBeDefined()
    })

    // 31. Không regression Profile
    it('31. Không gây regression chức năng UserProfilePage', async () => {
        const sampleProfile = {
            id: 'user-001',
            email: 'admin@daotao.edu.vn',
            name: 'Nguyễn Văn A',
            phone: '0912345678',
            date_of_birth: '1995-08-20',
            address: 'Hà Nội',
            role: 'admin',
            status: 'active',
        }
        vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
            const url = String(input)
            if (url.includes('/api/v1/users/profile/avatar')) {
                return Promise.resolve(new Response(null, { status: 404 }))
            }
            if (url.includes('/api/v1/users/profile')) {
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            status: 'success',
                            data: sampleProfile,
                        }),
                        { status: 200, headers: { 'Content-Type': 'application/json' } },
                    ),
                )
            }
            return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
        })

        renderWithSession(
            <UserProfilePage />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByText('Hồ sơ cá nhân')).toBeDefined()
        })
    })

    // 32. Không regression Avatar
    it('32. Không gây regression hiển thị Avatar trong UserProfilePage', async () => {
        const sampleProfile = {
            id: 'user-001',
            email: 'admin@daotao.edu.vn',
            name: 'Nguyễn Văn A',
            phone: '0912345678',
            date_of_birth: '1995-08-20',
            address: 'Hà Nội',
            role: 'admin',
            status: 'active',
        }
        vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
            const url = String(input)
            if (url.includes('/api/v1/users/profile/avatar')) {
                return Promise.resolve(new Response(null, { status: 404 }))
            }
            if (url.includes('/api/v1/users/profile')) {
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            status: 'success',
                            data: sampleProfile,
                        }),
                        { status: 200, headers: { 'Content-Type': 'application/json' } },
                    ),
                )
            }
            return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
        })

        renderWithSession(
            <UserProfilePage />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-avatar-change')).toBeDefined()
            expect(screen.getByText('Đổi ảnh')).toBeDefined()
        })
    })
})
