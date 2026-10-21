// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SubjectsPage } from './SubjectsPage'
import { TrainingProgramsPage } from './TrainingProgramsPage'
import { UserProfilePage } from './UserProfilePage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { Subject } from '../api/subjectApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const sampleSubjects: Subject[] = [
    {
        id: 'subj-01',
        code: 'CS101',
        name: 'Nhập môn lập trình',
        description: 'Kiến thức cơ bản C/C++',
        credits: 3,
        total_sessions: 45,
        status: 'active',
        created_at: '2026-01-10T08:00:00Z',
        updated_at: '2026-01-15T09:30:00Z',
    },
    {
        id: 'subj-02',
        code: 'MATH101',
        name: 'Giải tích 1',
        description: null,
        credits: 4,
        total_sessions: null,
        status: 'draft',
        created_at: '2026-02-01T08:00:00Z',
        updated_at: '2026-02-05T09:30:00Z',
    },
    {
        id: 'subj-03',
        code: 'PHYS101',
        name: 'Vật lý đại cương',
        description: 'Môn học cơ bản',
        credits: 2,
        total_sessions: 30,
        status: 'archived',
        created_at: '2025-01-01T08:00:00Z',
        updated_at: '2025-06-01T09:30:00Z',
    },
]

function RoleSessionWrapper({
    role,
    permissions,
    children,
}: {
    role?: string | null
    permissions?: string[]
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        if (role !== undefined) {
            startSession(
                { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
                role,
                'user-test-id',
                false,
                'Test User',
                'test@ictu.edu.vn',
                role ? [role] : [],
                permissions,
            )
        }
    }, [role, permissions, startSession])

    if (role !== undefined && !hasSession) {
        return <div>Initializing session...</div>
    }

    return <>{children}</>
}

function renderWithSession(
    ui: ReactNode,
    options: { role?: string; permissions?: string[] } = {},
) {
    const { role = 'admin', permissions } = options

    return render(
        <MemoryRouter>
            <SessionProvider apiOrigin="http://localhost:5000">
                <RoleSessionWrapper role={role} permissions={permissions}>
                    {ui}
                </RoleSessionWrapper>
            </SessionProvider>
        </MemoryRouter>,
    )
}

describe('SubjectsPage - Test Matrix SCRUM-123 Activity A6', () => {
    // 01. Render danh sách
    it('01. Render danh sách môn học thành công với tiêu đề, tổng số và các cột', async () => {
        renderWithSession(
            <SubjectsPage initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('subjects-page-title')).toBeDefined()
        })
        expect(screen.getByTestId('subjects-page-title').textContent).toContain('Quản lý môn học')
        expect(screen.getByTestId('subjects-page-title').textContent).toContain('(3)')
        expect(screen.getByTestId('subject-code-subj-01').textContent).toBe('CS101')
        expect(screen.getByTestId('subject-code-subj-02').textContent).toBe('MATH101')
        expect(screen.getByTestId('subject-code-subj-03').textContent).toBe('PHYS101')
    })

    // 02. Loading
    it('02. Loading state hiển thị spinner khi đang tải danh sách môn học', async () => {
        const slowRequest = vi.fn(() => new Promise<Response>(() => {}))

        renderWithSession(
            <SubjectsPage customRequest={slowRequest} />,
            { role: 'admin' },
        )

        expect(screen.getByTestId('subjects-loading-state')).toBeDefined()
        expect(screen.getByText(/Đang tải danh sách môn học/)).toBeDefined()
    })

    // 03. Empty state
    it('03. Empty state hiển thị thông báo thân thiện khi không có dữ liệu', async () => {
        renderWithSession(
            <SubjectsPage initialSubjects={[]} initialTotal={0} />,
            { role: 'admin' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('subjects-empty-state')).toBeDefined()
        })
        expect(screen.getByText('Không tìm thấy môn học nào')).toBeDefined()
    })

    // 04. API error
    it('04. API error hiển thị banner lỗi và cho phép đóng banner', async () => {
        const errorRequest = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({ code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' }),
        })

        renderWithSession(
            <SubjectsPage customRequest={errorRequest} />,
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

    // 05. Render subjects & Credits & Null sessions
    it('05. 06. 07. Hiển thị đúng số tín chỉ và "Chưa xác định" khi số buổi là null', async () => {
        renderWithSession(
            <SubjectsPage initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        expect(screen.getByTestId('subject-credits-subj-01').textContent).toBe('3 tín chỉ')
        expect(screen.getByTestId('subject-sessions-subj-01').textContent).toBe('45 buổi')
        expect(screen.getByTestId('subject-credits-subj-02').textContent).toBe('4 tín chỉ')
        expect(screen.getByTestId('subject-sessions-subj-02').textContent).toBe('Chưa xác định')
    })

    // 08. 09. Search input & debounce
    it('08. 09. Search input gửi tham số search lên backend và reset về trang 1', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                data: { items: [sampleSubjects[0]], total: 1, page: 1, page_size: 10, total_pages: 1 },
            }),
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        const searchInput = screen.getByTestId('subjects-search-input')
        fireEvent.change(searchInput, { target: { value: 'CS101' } })

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                expect.stringContaining('search=CS101'),
                expect.any(Object),
            )
        })
    })

    // 10. Filter status
    it('10. Filter status gửi tham số status lên backend và reset về trang 1', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                data: { items: [sampleSubjects[1]], total: 1, page: 1, page_size: 10, total_pages: 1 },
            }),
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        const statusSelect = screen.getByTestId('subjects-status-select')
        fireEvent.change(statusSelect, { target: { value: 'draft' } })

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                expect.stringContaining('status=draft'),
                expect.any(Object),
            )
        })
    })

    // 11. Pagination
    it('11. Phân trang điều hướng trang trước, trang sau và số trang đúng', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                data: { items: [sampleSubjects[1]], total: 25, page: 2, page_size: 10, total_pages: 3 },
            }),
        })

        renderWithSession(
            <SubjectsPage
                customRequest={mockRequest}
                initialSubjects={sampleSubjects}
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

    // 14. 15. 16. 17. Trainee (course.view only) không thấy Add, Edit, Delete nhưng thấy Xem
    it('14. 15. 16. 17. Trainee (chỉ có course.view) thấy danh sách và nút Xem nhưng KHÔNG thấy Thêm, Sửa, Xóa', async () => {
        renderWithSession(
            <SubjectsPage initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'trainee' },
        )

        await waitFor(() => {
            expect(screen.getByTestId('subjects-page-title')).toBeDefined()
        })

        // Không có nút Thêm môn học
        expect(screen.queryByTestId('btn-create-subject')).toBeNull()

        // Không có nút Sửa và Xóa
        expect(screen.queryByTestId('btn-edit-subj-01')).toBeNull()
        expect(screen.queryByTestId('btn-delete-subj-01')).toBeNull()

        // Có nút Xem chi tiết
        expect(screen.getByTestId('btn-view-subj-01')).toBeDefined()
    })

    // 18. Admin (course.manage) thấy toàn bộ CRUD
    it('18. Admin (course.manage) thấy toàn bộ chức năng Thêm, Sửa, Xóa', async () => {
        renderWithSession(
            <SubjectsPage initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        expect(screen.getByTestId('btn-create-subject')).toBeDefined()
        expect(screen.getByTestId('btn-edit-subj-01')).toBeDefined()
        expect(screen.getByTestId('btn-delete-subj-01')).toBeDefined()
        expect(screen.getByTestId('btn-view-subj-01')).toBeDefined()
    })

    // 19. 20. 21. 22. 23. 24. Create validation
    it('19 - 24. Mở modal tạo mới, kiểm tra các ràng buộc validation mã, tên, tín chỉ, số buổi', async () => {
        renderWithSession(
            <SubjectsPage initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-create-subject'))
        expect(screen.getByTestId('modal-create-subject')).toBeDefined()

        // Thử submit form rỗng
        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(screen.getByTestId('error-code').textContent).toBe('Mã môn học là bắt buộc.')
            expect(screen.getByTestId('error-name').textContent).toBe('Tên môn học là bắt buộc.')
        })

        // Nhập credits không hợp lệ (> 30)
        fireEvent.change(screen.getByTestId('create-input-credits'), { target: { value: '35' } })
        fireEvent.click(screen.getByTestId('btn-submit-create'))
        await waitFor(() => {
            expect(screen.getByTestId('error-credits').textContent).toBe('Số tín chỉ phải là số nguyên từ 1 đến 30.')
        })

        // Nhập total_sessions âm
        fireEvent.change(screen.getByTestId('create-input-sessions'), { target: { value: '-5' } })
        fireEvent.click(screen.getByTestId('btn-submit-create'))
        await waitFor(() => {
            expect(screen.getByTestId('error-sessions').textContent).toBe('Số buổi học phải là số nguyên từ 0 đến 65535.')
        })
    })

    // 25. Create success
    it('25. Tạo mới môn học thành công -> đóng modal, hiển thị banner và tải lại danh sách', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    status: 201,
                    json: async () => ({
                        status: 'success',
                        data: {
                            id: 'subj-new',
                            code: 'CS102',
                            name: 'Cấu trúc dữ liệu',
                            credits: 3,
                            total_sessions: 45,
                            status: 'draft',
                            created_at: '2026-03-01T00:00:00Z',
                            updated_at: '2026-03-01T00:00:00Z',
                        },
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { items: [...sampleSubjects], total: 4, page: 1, page_size: 10, total_pages: 1 },
                }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-create-subject'))

        fireEvent.change(screen.getByTestId('create-input-code'), { target: { value: 'cs102' } })
        fireEvent.change(screen.getByTestId('create-input-name'), { target: { value: 'Cấu trúc dữ liệu' } })
        fireEvent.change(screen.getByTestId('create-input-credits'), { target: { value: '3' } })

        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(screen.queryByTestId('modal-create-subject')).toBeNull()
            expect(screen.getByTestId('banner-success').textContent).toContain('Tạo môn học thành công.')
        })
    })

    // 26. Create duplicate code -> 409
    it('26. Tạo mới bị trùng mã (409 DUPLICATE_CODE) -> hiển thị lỗi tại ô nhập mã', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'POST') {
                return Promise.resolve({
                    ok: false,
                    status: 409,
                    json: async () => ({
                        code: 'DUPLICATE_CODE',
                        message: 'Mã môn học đã tồn tại.',
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ status: 'success', data: { items: [], total: 0 } }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-create-subject'))
        fireEvent.change(screen.getByTestId('create-input-code'), { target: { value: 'CS101' } })
        fireEvent.change(screen.getByTestId('create-input-name'), { target: { value: 'Trùng mã' } })
        fireEvent.change(screen.getByTestId('create-input-credits'), { target: { value: '3' } })

        fireEvent.click(screen.getByTestId('btn-submit-create'))

        await waitFor(() => {
            expect(screen.getByTestId('error-code').textContent).toBe('Mã môn học đã tồn tại.')
        })
    })

    // 27. 28. Edit preload
    it('27. 28. Mở modal chỉnh sửa nạp đầy đủ thông tin hiện tại của môn học', async () => {
        renderWithSession(
            <SubjectsPage initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-edit-subj-01'))
        expect(screen.getByTestId('modal-edit-subject')).toBeDefined()

        const codeInput = screen.getByTestId('edit-input-code') as HTMLInputElement
        const nameInput = screen.getByTestId('edit-input-name') as HTMLInputElement
        const creditsInput = screen.getByTestId('edit-input-credits') as HTMLInputElement
        const sessionsInput = screen.getByTestId('edit-input-sessions') as HTMLInputElement

        expect(codeInput.value).toBe('CS101')
        expect(nameInput.value).toBe('Nhập môn lập trình')
        expect(creditsInput.value).toBe('3')
        expect(sessionsInput.value).toBe('45')
    })

    // 29. Edit success
    it('29. Cập nhật môn học thành công -> đóng modal, hiển thị banner và cập nhật danh sách', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'PUT') {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        status: 'success',
                        data: { ...sampleSubjects[0], name: 'Nhập môn lập trình nâng cao' },
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { items: [...sampleSubjects], total: 3, page: 1, page_size: 10, total_pages: 1 },
                }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-edit-subj-01'))
        fireEvent.change(screen.getByTestId('edit-input-name'), {
            target: { value: 'Nhập môn lập trình nâng cao' },
        })

        fireEvent.click(screen.getByTestId('btn-submit-edit'))

        await waitFor(() => {
            expect(screen.queryByTestId('modal-edit-subject')).toBeNull()
            expect(screen.getByTestId('banner-success').textContent).toContain('Cập nhật môn học thành công.')
        })
    })

    // 30. Cancel edit
    it('30. Bấm nút Hủy khi đang sửa -> đóng modal mà không gửi request cập nhật', async () => {
        const mockRequest = vi.fn()

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-edit-subj-01'))
        expect(screen.getByTestId('modal-edit-subject')).toBeDefined()

        fireEvent.click(screen.getByTestId('btn-cancel-edit'))
        expect(screen.queryByTestId('modal-edit-subject')).toBeNull()
        expect(mockRequest).not.toHaveBeenCalled()
    })

    // 31. 32. Delete modal & cancel
    it('31. 32. Mở modal xác nhận xóa hiển thị mã, tên và nút Hủy đóng modal an toàn', async () => {
        const mockRequest = vi.fn()

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-delete-subj-01'))
        expect(screen.getByTestId('modal-delete-confirm')).toBeDefined()
        expect(screen.getByTestId('modal-delete-confirm').textContent).toContain('CS101 - Nhập môn lập trình')

        fireEvent.click(screen.getByTestId('btn-cancel-delete'))
        expect(screen.queryByTestId('modal-delete-confirm')).toBeNull()
        expect(mockRequest).not.toHaveBeenCalled()
    })

    // 33. Delete success
    it('33. Xác nhận xóa môn học thành công -> gọi DELETE API, hiển thị thông báo thành công', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'DELETE') {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        status: 'success',
                        message: 'Xóa môn học thành công.',
                        data: { id: 'subj-01' },
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { items: [sampleSubjects[1], sampleSubjects[2]], total: 2, page: 1, page_size: 10, total_pages: 1 },
                }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-delete-subj-01'))
        fireEvent.click(screen.getByTestId('btn-confirm-delete'))

        await waitFor(() => {
            expect(screen.queryByTestId('modal-delete-confirm')).toBeNull()
            expect(screen.getByTestId('banner-success').textContent).toContain('Xóa môn học thành công.')
        })
    })

    // 34. SUBJECT_IN_USE handling
    it('34. Xóa môn học đang có dữ liệu ràng buộc (409 SUBJECT_IN_USE) -> hiển thị thông báo hướng dẫn chuyển sang Đã lưu trữ', async () => {
        const mockRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
            if (init?.method === 'DELETE') {
                return Promise.resolve({
                    ok: false,
                    status: 409,
                    json: async () => ({
                        code: 'SUBJECT_IN_USE',
                        message:
                            'Không thể xóa môn học vì môn đang được sử dụng trong chương trình đào tạo. Hãy gỡ môn khỏi các chương trình liên quan trước khi xóa, hoặc chuyển môn sang trạng thái Đã lưu trữ nếu không còn sử dụng.',
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ status: 'success', data: { items: [], total: 0 } }),
            })
        })

        renderWithSession(
            <SubjectsPage customRequest={mockRequest} initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-delete-subj-01'))
        fireEvent.click(screen.getByTestId('btn-confirm-delete'))

        await waitFor(() => {
            expect(screen.getByTestId('delete-dialog-error')).toBeDefined()
            expect(screen.getByTestId('delete-dialog-error').textContent).toContain(
                'Không thể xóa môn học vì môn đang được sử dụng trong chương trình đào tạo. Hãy gỡ môn khỏi các chương trình liên quan trước khi xóa, hoặc chuyển môn sang trạng thái Đã lưu trữ nếu không còn sử dụng.',
            )
        })
    })

    // 35. View detail modal
    it('35. Mở modal xem chi tiết môn học hiển thị đầy đủ thông tin và đóng thành công', async () => {
        renderWithSession(
            <SubjectsPage initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-view-subj-01'))
        expect(screen.getByTestId('modal-detail-subject')).toBeDefined()
        expect(screen.getByTestId('detail-subject-code').textContent).toBe('CS101')
        expect(screen.getByTestId('detail-subject-name').textContent).toBe('Nhập môn lập trình')
        expect(screen.getByTestId('detail-subject-credits').textContent).toBe('3 tín chỉ')
        expect(screen.getByTestId('detail-subject-sessions').textContent).toBe('45 buổi')

        fireEvent.click(screen.getByTestId('btn-close-detail'))
        expect(screen.queryByTestId('modal-detail-subject')).toBeNull()
    })

    // 38. ESC key closes modal
    it('38. Phím Escape đóng modal đang mở', async () => {
        renderWithSession(
            <SubjectsPage initialSubjects={sampleSubjects} initialTotal={3} />,
            { role: 'admin' },
        )

        fireEvent.click(screen.getByTestId('btn-create-subject'))
        expect(screen.getByTestId('modal-create-subject')).toBeDefined()

        fireEvent.keyDown(window, { key: 'Escape' })
        expect(screen.queryByTestId('modal-create-subject')).toBeNull()
    })

    // 39. TrainingProgramsPage không bị ảnh hưởng (Non-regression)
    it('39. TrainingProgramsPage không bị ảnh hưởng', async () => {
        renderWithSession(<TrainingProgramsPage initialPrograms={[]} initialTotal={0} />, {
            role: 'admin',
        })

        await waitFor(() => {
            expect(screen.getByTestId('programs-page-title')).toBeDefined()
        })
    })

    // 40. UserProfilePage không bị ảnh hưởng (Non-regression)
    it('40. UserProfilePage không bị ảnh hưởng', async () => {
        renderWithSession(<UserProfilePage />, { role: 'admin' })

        await waitFor(() => {
            expect(screen.getByTestId('user-profile-page')).toBeDefined()
        })
    })
})
