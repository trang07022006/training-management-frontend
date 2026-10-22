// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { ProgramStructurePage } from './ProgramStructurePage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { ProgramStructure } from '../api/programStructureApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

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

// Test Data theo đặc tả SCRUM-124 Section 13:
// Program: QA-S122-03 – Kiểm thử SCRUM-122
// Học kỳ 1:
// 1. QA-S124-C – Môn nâng cao
// 2. QA-S124-B – Môn trung gian
// 3. QA-S124-A – Môn nền tảng
const mockScrum124Data: ProgramStructure = {
    program: {
        id: 'prog-s122-03',
        code: 'QA-S122-03',
        name: 'Kiểm thử SCRUM-122',
        description: 'Chương trình kiểm thử SCRUM-122 và SCRUM-124',
        duration_semesters: 2,
        status: 'draft',
    },
    total_subjects: 4,
    total_credits: 12,
    items: [
        {
            program_subject_id: 'ps-c',
            program_id: 'prog-s122-03',
            subject_id: 'sub-c',
            code: 'QA-S124-C',
            name: 'Môn nâng cao',
            credits: 3,
            total_sessions: 30,
            status: 'active',
            semester: 1,
            is_mandatory: true,
            order_index: 1,
            prerequisites: [],
        },
        {
            program_subject_id: 'ps-b',
            program_id: 'prog-s122-03',
            subject_id: 'sub-b',
            code: 'QA-S124-B',
            name: 'Môn trung gian',
            credits: 3,
            total_sessions: 30,
            status: 'active',
            semester: 1,
            is_mandatory: true,
            order_index: 2,
            prerequisites: [],
        },
        {
            program_subject_id: 'ps-a',
            program_id: 'prog-s122-03',
            subject_id: 'sub-a',
            code: 'QA-S124-A',
            name: 'Môn nền tảng',
            credits: 3,
            total_sessions: 30,
            status: 'active',
            semester: 1,
            is_mandatory: true,
            order_index: 3,
            prerequisites: [],
        },
        {
            program_subject_id: 'ps-sem2',
            program_id: 'prog-s122-03',
            subject_id: 'sub-sem2',
            code: 'QA-S124-SEM2',
            name: 'Môn học kỳ 2',
            credits: 3,
            total_sessions: 30,
            status: 'active',
            semester: 2,
            is_mandatory: false,
            order_index: 1,
            prerequisites: [],
        },
    ],
}

function renderProgramStructurePage(options: {
    programId?: string
    role?: string
    permissions?: string[]
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>
}) {
    const {
        programId = 'prog-s122-03',
        role = 'admin',
        permissions = ['course.manage', 'course.view'],
        customRequest,
    } = options

    return render(
        <MemoryRouter initialEntries={[`/training-programs/${programId}/structure`]}>
            <SessionProvider apiOrigin="http://localhost:5000">
                <RoleSessionWrapper role={role} permissions={permissions}>
                    <Routes>
                        <Route
                            path="/training-programs/:id/structure"
                            element={<ProgramStructurePage customRequest={customRequest} />}
                        />
                    </Routes>
                </RoleSessionWrapper>
            </SessionProvider>
        </MemoryRouter>,
    )
}

describe('SCRUM-124: Drag & Drop Subject Ordering in Program Structure', () => {
    // 1. UP/DOWN BUTTONS REMOVED & DRAG HANDLE ADDED
    it('1. Xóa hoàn toàn các nút ▲ và ▼, thay bằng Drag Handle (icon grip) có đầy đủ aria-label', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockScrum124Data,
        })

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('drag-handle-ps-c')).toBeDefined()
            expect(screen.getByTestId('drag-handle-ps-b')).toBeDefined()
            expect(screen.getByTestId('drag-handle-ps-a')).toBeDefined()
        })

        // Nút di chuyển cũ ▲ và ▼ không còn xuất hiện trong DOM
        expect(screen.queryByTestId('btn-move-up-ps-c')).toBeNull()
        expect(screen.queryByTestId('btn-move-down-ps-c')).toBeNull()
        expect(screen.queryByTestId('btn-move-up-ps-b')).toBeNull()
        expect(screen.queryByTestId('btn-move-down-ps-b')).toBeNull()
        expect(screen.queryByTestId('btn-move-up-ps-a')).toBeNull()
        expect(screen.queryByTestId('btn-move-down-ps-a')).toBeNull()

        // Drag handle có aria-label trợ năng
        const handleA = screen.getByTestId('drag-handle-ps-a')
        expect(handleA.getAttribute('aria-label')).toContain('Thay đổi thứ tự môn QA-S124-A')
        expect(handleA.getAttribute('draggable')).toBe('true')
    })

    // 2. DRAG AND DROP REORDER IN SAME SEMESTER (1 C, 2 B, 3 A -> Drag A to pos 1 -> 1 A, 2 C, 3 B)
    it('2. Kéo thả môn QA-S124-A từ vị trí 3 lên vị trí 1 -> Cập nhật UI thành 1 A, 2 C, 3 B và gọi API reorder', async () => {
        let reorderPayload: unknown = null
        const mockRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (init?.method === 'PATCH' && path.includes('/reorder')) {
                reorderPayload = JSON.parse(init.body as string)
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ message: 'Sắp xếp thành công', semester: 1 }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockScrum124Data,
            })
        })

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('subject-row-ps-c')).toBeDefined()
        })

        // Thứ tự ban đầu: 1: C, 2: B, 3: A
        expect(screen.getByTestId('order-badge-ps-c').textContent).toBe('1')
        expect(screen.getByTestId('order-badge-ps-b').textContent).toBe('2')
        expect(screen.getByTestId('order-badge-ps-a').textContent).toBe('3')

        const handleA = screen.getByTestId('drag-handle-ps-a')
        const rowC = screen.getByTestId('subject-row-ps-c')

        // Giả lập luồng Drag & Drop: Drag A -> Drop vào row C (vị trí 1)
        fireEvent.dragStart(handleA, {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        fireEvent.dragOver(rowC, {
            dataTransfer: { dropEffect: 'move' },
        })
        fireEvent.drop(rowC)

        // Optimistic UI: Thứ tự mới ngay lập tức
        await waitFor(() => {
            expect(screen.getByTestId('order-badge-ps-a').textContent).toBe('1')
            expect(screen.getByTestId('order-badge-ps-c').textContent).toBe('2')
            expect(screen.getByTestId('order-badge-ps-b').textContent).toBe('3')
        })

        // API reorder được gọi với đúng thứ tự mới: ['ps-a', 'ps-c', 'ps-b']
        expect(reorderPayload).toEqual({
            semester: 1,
            ordered_ids: ['ps-a', 'ps-c', 'ps-b'],
        })

        // Thông báo thành công
        expect(screen.getByTestId('banner-success').textContent).toContain('Đã cập nhật thứ tự môn học.')
    })

    // 3. OPTIMISTIC ROLLBACK ON API FAILURE
    it('3. Khi API reorder thất bại -> Rollback về thứ tự ban đầu và hiển thị thông báo lỗi', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (init?.method === 'PATCH' && path.includes('/reorder')) {
                return Promise.resolve({
                    ok: false,
                    status: 500,
                    json: async () => ({ message: 'Lỗi cơ sở dữ liệu khi sắp xếp lại' }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockScrum124Data,
            })
        })

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('subject-row-ps-c')).toBeDefined()
        })

        const handleA = screen.getByTestId('drag-handle-ps-a')
        const rowC = screen.getByTestId('subject-row-ps-c')

        fireEvent.dragStart(handleA, {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        fireEvent.drop(rowC)

        // Khi API lỗi: Rollback về thứ tự ban đầu (1 C, 2 B, 3 A)
        await waitFor(() => {
            expect(screen.getByTestId('banner-error').textContent).toContain(
                'Không thể cập nhật thứ tự môn học. Vui lòng thử lại.',
            )
            expect(screen.getByTestId('order-badge-ps-c').textContent).toBe('1')
            expect(screen.getByTestId('order-badge-ps-b').textContent).toBe('2')
            expect(screen.getByTestId('order-badge-ps-a').textContent).toBe('3')
        })
    })

    // 4. CROSS-SEMESTER DRAG PREVENTION (Section 8: CHỈ KÉO TRONG CÙNG HỌC KỲ)
    it('4. Chặn kéo thả giữa 2 học kỳ khác nhau: Kéo môn từ Học kỳ 1 sang Học kỳ 2 bị từ chối', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockScrum124Data,
        })

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('subject-row-ps-sem2')).toBeDefined()
        })

        const handleA = screen.getByTestId('drag-handle-ps-a') // Semester 1
        const rowSem2 = screen.getByTestId('subject-row-ps-sem2') // Semester 2

        fireEvent.dragStart(handleA, {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        // Thử drop vào Học kỳ 2
        fireEvent.dragOver(rowSem2)
        fireEvent.drop(rowSem2)

        // Không gọi API reorder nào
        expect(mockRequest).not.toHaveBeenCalledWith(
            expect.stringContaining('/reorder'),
            expect.anything(),
        )

        // Thứ tự các học kỳ không bị thay đổi
        expect(screen.getByTestId('order-badge-ps-a').textContent).toBe('3')
        expect(screen.getByTestId('order-badge-ps-sem2').textContent).toBe('1')
    })

    // 5. RELOAD PERSISTENCE TEST (Section 7 & 15: RELOAD TEST)
    it('5. Reload test: Sau khi kéo thả thành công, reload trang vẫn giữ nguyên thứ tự 1 A, 2 C, 3 B', async () => {
        let currentData = { ...mockScrum124Data }

        const mockRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (init?.method === 'PATCH' && path.includes('/reorder')) {
                // Giả lập backend cập nhật order_index vào database
                currentData = {
                    ...currentData,
                    items: currentData.items.map((item) => {
                        if (item.program_subject_id === 'ps-a') return { ...item, order_index: 1 }
                        if (item.program_subject_id === 'ps-c') return { ...item, order_index: 2 }
                        if (item.program_subject_id === 'ps-b') return { ...item, order_index: 3 }
                        return item
                    }),
                }
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ message: 'Sắp xếp thành công', semester: 1 }),
                })
            }
            // GET structure
            return Promise.resolve({
                ok: true,
                json: async () => currentData,
            })
        })

        const { unmount } = renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('subject-row-ps-c')).toBeDefined()
        })

        const handleA = screen.getByTestId('drag-handle-ps-a')
        const rowC = screen.getByTestId('subject-row-ps-c')

        fireEvent.dragStart(handleA, {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        fireEvent.drop(rowC)

        await waitFor(() => {
            expect(screen.getByTestId('order-badge-ps-a').textContent).toBe('1')
        })

        // Giả lập F5 / Reload trang (unmount và mount lại component với dữ liệu đã lưu ở backend)
        unmount()

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('subject-row-ps-a')).toBeDefined()
        })

        // Kết quả sau reload PHẢI vẫn là: 1: A, 2: C, 3: B
        expect(screen.getByTestId('order-badge-ps-a').textContent).toBe('1')
        expect(screen.getByTestId('order-badge-ps-c').textContent).toBe('2')
        expect(screen.getByTestId('order-badge-ps-b').textContent).toBe('3')
    })

    // 6. ACCESSIBILITY: KEYBOARD REORDER (Section 11)
    it('6. Trợ năng bàn phím: Drag Handle nhận focus và hỗ trợ phím mũi tên lên/xuống để đổi thứ tự', async () => {
        let reorderPayload: unknown = null
        const mockRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (init?.method === 'PATCH' && path.includes('/reorder')) {
                reorderPayload = JSON.parse(init.body as string)
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ message: 'Sắp xếp thành công', semester: 1 }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockScrum124Data,
            })
        })

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('drag-handle-ps-b')).toBeDefined()
        })

        const handleB = screen.getByTestId('drag-handle-ps-b') // Index 1 (B)
        // Nhấn ArrowUp để di chuyển B lên vị trí 0 (trước C)
        fireEvent.keyDown(handleB, { key: 'ArrowUp' })

        await waitFor(() => {
            expect(screen.getByTestId('order-badge-ps-b').textContent).toBe('1')
            expect(screen.getByTestId('order-badge-ps-c').textContent).toBe('2')
        })

        expect(reorderPayload).toEqual({
            semester: 1,
            ordered_ids: ['ps-b', 'ps-c', 'ps-a'],
        })
    })

    // 7. PRESERVED FEATURES: SUMMARY CARDS & ACTION BUTTONS (Section 12)
    it('7. Bảo toàn toàn bộ các tính năng không đổi: Thời lượng, Tổng số môn, Tổng tín chỉ, Tiên quyết, Sửa, Gỡ, Thêm môn', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockScrum124Data,
        })

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('stat-duration')).toBeDefined()
        })

        // Summary Cards
        expect(screen.getByTestId('stat-duration').textContent).toContain('2 học kỳ')
        expect(screen.getByTestId('stat-total-subjects').textContent).toContain('4 môn')
        expect(screen.getByTestId('stat-total-credits').textContent).toContain('12 tín chỉ')

        // Nút Thêm môn học
        expect(screen.getByTestId('btn-open-add-subject')).toBeDefined()

        // Nút Tiên quyết, Sửa, Gỡ
        expect(screen.getByTestId('btn-prereq-ps-c')).toBeDefined()
        expect(screen.getByTestId('btn-edit-ps-c')).toBeDefined()
        expect(screen.getByTestId('btn-remove-ps-c')).toBeDefined()
    })

    // 8. DRAG BẰNG MÃ MÔN
    it('8. Kéo thả bằng mã môn (cell-subject-code) -> Đổi thứ tự thành 1 A, 2 C, 3 B và gọi API reorder', async () => {
        let reorderPayload: unknown = null
        const mockRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (init?.method === 'PATCH' && path.includes('/reorder')) {
                reorderPayload = JSON.parse(init.body as string)
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ message: 'Sắp xếp thành công', semester: 1 }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockScrum124Data,
            })
        })

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('subject-code-ps-a')).toBeDefined()
        })

        const codeA = screen.getByTestId('subject-code-ps-a')
        const rowC = screen.getByTestId('subject-row-ps-c')

        fireEvent.dragStart(codeA, {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        fireEvent.dragOver(rowC, {
            dataTransfer: { dropEffect: 'move' },
        })
        fireEvent.drop(rowC)

        await waitFor(() => {
            expect(screen.getByTestId('order-badge-ps-a').textContent).toBe('1')
            expect(screen.getByTestId('order-badge-ps-c').textContent).toBe('2')
            expect(screen.getByTestId('order-badge-ps-b').textContent).toBe('3')
        })

        expect(reorderPayload).toEqual({
            semester: 1,
            ordered_ids: ['ps-a', 'ps-c', 'ps-b'],
        })
    })

    // 9. DRAG BẰNG TÊN MÔN
    it('9. Kéo thả bằng tên môn (cell-subject-name) -> Đổi thứ tự thành 1 A, 2 C, 3 B và gọi API reorder', async () => {
        let reorderPayload: unknown = null
        const mockRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (init?.method === 'PATCH' && path.includes('/reorder')) {
                reorderPayload = JSON.parse(init.body as string)
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ message: 'Sắp xếp thành công', semester: 1 }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockScrum124Data,
            })
        })

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('subject-name-ps-a')).toBeDefined()
        })

        const nameA = screen.getByTestId('subject-name-ps-a')
        const rowC = screen.getByTestId('subject-row-ps-c')

        fireEvent.dragStart(nameA, {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        fireEvent.dragOver(rowC, {
            dataTransfer: { dropEffect: 'move' },
        })
        fireEvent.drop(rowC)

        await waitFor(() => {
            expect(screen.getByTestId('order-badge-ps-a').textContent).toBe('1')
            expect(screen.getByTestId('order-badge-ps-c').textContent).toBe('2')
            expect(screen.getByTestId('order-badge-ps-b').textContent).toBe('3')
        })

        expect(reorderPayload).toEqual({
            semester: 1,
            ordered_ids: ['ps-a', 'ps-c', 'ps-b'],
        })
    })

    // 10. DRAG BẰNG SỐ THỨ TỰ
    it('10. Kéo thả bằng số thứ tự (order-badge) -> Đổi thứ tự thành 1 A, 2 C, 3 B và gọi API reorder', async () => {
        let reorderPayload: unknown = null
        const mockRequest = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
            if (init?.method === 'PATCH' && path.includes('/reorder')) {
                reorderPayload = JSON.parse(init.body as string)
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ message: 'Sắp xếp thành công', semester: 1 }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockScrum124Data,
            })
        })

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('order-badge-ps-a')).toBeDefined()
        })

        const badgeA = screen.getByTestId('order-badge-ps-a')
        const rowC = screen.getByTestId('subject-row-ps-c')

        fireEvent.dragStart(badgeA, {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        fireEvent.dragOver(rowC, {
            dataTransfer: { dropEffect: 'move' },
        })
        fireEvent.drop(rowC)

        await waitFor(() => {
            expect(screen.getByTestId('order-badge-ps-a').textContent).toBe('1')
            expect(screen.getByTestId('order-badge-ps-c').textContent).toBe('2')
            expect(screen.getByTestId('order-badge-ps-b').textContent).toBe('3')
        })

        expect(reorderPayload).toEqual({
            semester: 1,
            ordered_ids: ['ps-a', 'ps-c', 'ps-b'],
        })
    })

    // 11. CLICK TIÊN QUYẾT -> KHÔNG DRAG, MỞ MODAL TIÊN QUYẾT
    it('11. Click Tiên quyết -> Hành vi mở modal hoạt động bình thường, không kích hoạt drag', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/prerequisites')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        program_subject_id: 'ps-c',
                        prerequisites: [],
                    }),
                })
            }
            return Promise.resolve({
                ok: true,
                json: async () => mockScrum124Data,
            })
        })

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-prereq-ps-c')).toBeDefined()
        })

        const btnPrereq = screen.getByTestId('btn-prereq-ps-c')

        // Thử kích hoạt dragStart từ nút Tiên quyết: bị ngăn chặn
        const defaultPrevented = !fireEvent.dragStart(btnPrereq, {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        expect(defaultPrevented).toBe(true)

        // Click nút Tiên quyết mở modal
        fireEvent.click(btnPrereq)

        await waitFor(() => {
            expect(screen.getByText(/Môn học tiên quyết: QA-S124-C/i)).toBeDefined()
        })
    })

    // 12. CLICK SỬA -> KHÔNG DRAG, MỞ MODAL SỬA
    it('12. Click Sửa -> Hành vi mở modal hoạt động bình thường, không kích hoạt drag', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockScrum124Data,
        })

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-edit-ps-c')).toBeDefined()
        })

        const btnEdit = screen.getByTestId('btn-edit-ps-c')

        // Thử kích hoạt dragStart từ nút Sửa: bị ngăn chặn
        const defaultPrevented = !fireEvent.dragStart(btnEdit, {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        expect(defaultPrevented).toBe(true)

        // Click nút Sửa mở modal
        fireEvent.click(btnEdit)

        await waitFor(() => {
            expect(screen.getByText('Chỉnh sửa thông tin môn học')).toBeDefined()
        })
    })

    // 13. CLICK GỠ -> KHÔNG DRAG, MỞ MODAL XÁC NHẬN GỠ
    it('13. Click Gỡ -> Hành vi mở modal hoạt động bình thường, không kích hoạt drag', async () => {
        const mockRequest = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockScrum124Data,
        })

        renderProgramStructurePage({ customRequest: mockRequest })

        await waitFor(() => {
            expect(screen.getByTestId('btn-remove-ps-c')).toBeDefined()
        })

        const btnRemove = screen.getByTestId('btn-remove-ps-c')

        // Thử kích hoạt dragStart từ nút Gỡ: bị ngăn chặn
        const defaultPrevented = !fireEvent.dragStart(btnRemove, {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        expect(defaultPrevented).toBe(true)

        // Click nút Gỡ mở modal
        fireEvent.click(btnRemove)

        await waitFor(() => {
            expect(screen.getByText('Xác nhận gỡ môn học')).toBeDefined()
        })
    })
})
