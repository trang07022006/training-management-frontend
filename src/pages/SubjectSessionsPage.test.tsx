// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SubjectSessionsPage } from './SubjectSessionsPage'
import { validateSessionNumber } from '../utils/subjectSessionValidation'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { SubjectSession, SubjectSummary } from '../api/subjectSessionApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockSubjectSummary: SubjectSummary = {
    id: 'sub-101',
    code: 'CS101',
    name: 'Cấu trúc dữ liệu & Giải thuật',
    total_sessions: 15,
}

const mockSessionsData: SubjectSession[] = [
    {
        id: 'sess-1',
        subject_id: 'sub-101',
        session_number: 1,
        topic: 'Giới thiệu môn học',
        objective: 'Nắm được đề cương chi tiết và nội dung môn học',
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
    },
    {
        id: 'sess-2',
        subject_id: 'sub-101',
        session_number: 2,
        topic: 'Mảng và Danh sách liên kết',
        objective: 'Hiểu cấu trúc dữ liệu mảng động và danh sách liên kết đơn',
        created_at: '2026-03-02T00:00:00Z',
        updated_at: '2026-03-02T00:00:00Z',
    },
    {
        id: 'sess-3',
        subject_id: 'sub-101',
        session_number: 3,
        topic: 'Ngăn xếp và Hàng đợi',
        objective: 'Ứng dụng Stack và Queue trong giải thuật duyệt',
        created_at: '2026-03-03T00:00:00Z',
        updated_at: '2026-03-03T00:00:00Z',
    },
]

function RoleSessionWrapper({
    role,
    children,
}: {
    role?: string | null
    children: ReactNode
}) {
    const { startSession } = useSession()
    useEffect(() => {
        if (role !== undefined) {
            startSession({ accessToken: 'mock-token', refreshToken: 'mock-refresh' }, role)
        }
    }, [role, startSession])
    return <>{children}</>
}

function renderSubjectSessionsPage({
    role = 'admin',
    subjectId = 'sub-101',
    customRequest,
    canManageOverride,
    initialSessions,
    initialSubject,
}: {
    role?: string | null
    subjectId?: string
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>
    canManageOverride?: boolean
    initialSessions?: SubjectSession[]
    initialSubject?: SubjectSummary
}) {
    const defaultMockRequest = vi.fn().mockImplementation(async (path: string, _init?: RequestInit) => {
        if (path.includes('/clone')) {
            return {
                ok: true,
                json: async () => ({
                    status: 'success',
                    message: 'Đã nhân bản 3 buổi học thành công.',
                    data: {
                        cloned_count: 3,
                        total_sessions: 3,
                        items: mockSessionsData,
                    },
                }),
            }
        }
        if (path.includes('/sessions') && !path.includes('/reorder')) {
            return {
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: {
                        subject: initialSubject || mockSubjectSummary,
                        items: initialSessions || mockSessionsData,
                    },
                }),
            }
        }
        if (path.includes('/subjects?') || path === '/api/v1/subjects') {
            return {
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: [
                            {
                                id: 'source-subj-1',
                                code: 'QA-S129-SOURCE',
                                name: 'Nguồn buổi học',
                                total_sessions: 3,
                                status: 'active',
                            },
                        ],
                        total: 1,
                        page: 1,
                        page_size: 100,
                        total_pages: 1,
                    },
                }),
            }
        }
        if (path.includes('/subjects/')) {
            return {
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: {
                        id: subjectId,
                        code: 'CS101',
                        name: 'Cấu trúc dữ liệu & Giải thuật',
                        status: 'active',
                    },
                }),
            }
        }
        return { ok: true, json: async () => ({ status: 'success' }) }
    })

    const req = customRequest || defaultMockRequest

    return render(
        <MemoryRouter initialEntries={[`/subjects/${subjectId}/sessions`]}>
            <SessionProvider apiOrigin="http://localhost:5000">
                <RoleSessionWrapper role={role}>
                    <Routes>
                        <Route
                            path="/subjects/:subjectId/sessions"
                            element={
                                <SubjectSessionsPage
                                    subjectIdProp={subjectId}
                                    customRequest={req as any}
                                    canManageOverride={canManageOverride}
                                    initialSessions={initialSessions}
                                    initialSubject={initialSubject}
                                />
                            }
                        />
                        <Route path="/subjects" element={<div data-testid="subjects-page-mock">Trang danh sách môn học</div>} />
                    </Routes>
                </RoleSessionWrapper>
            </SessionProvider>
        </MemoryRouter>,
    )
}

describe('SubjectSessionsPage - Test Suite SCRUM-129 Activity A6', () => {
    it('1. Hiển thị thông tin tóm tắt môn học và tiến độ số buổi cấu hình', async () => {
        renderSubjectSessionsPage({
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        expect(screen.getByTestId('page-title').textContent).toContain('CS101 - Cấu trúc dữ liệu & Giải thuật')
        expect(screen.getByTestId('badge-subject-code').textContent).toContain('Mã: CS101')
        expect(screen.getByTestId('badge-subject-progress').textContent).toContain('3 / 15 buổi đã tạo')
    })

    it('2. Hiển thị thông báo chưa giới hạn khi total_sessions là null', async () => {
        renderSubjectSessionsPage({
            initialSubject: { ...mockSubjectSummary, total_sessions: null },
            initialSessions: mockSessionsData,
        })

        expect(screen.getByTestId('badge-subject-progress').textContent).toContain('3 buổi đã tạo (Chưa giới hạn số buổi)')
    })

    it('3. Hiển thị danh sách các buổi học đúng số thứ tự và nội dung', async () => {
        renderSubjectSessionsPage({
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        expect(screen.getByTestId('session-row-sess-1')).toBeDefined()
        expect(screen.getByTestId('session-number-sess-1').textContent).toContain('Buổi 1')
        expect(screen.getByTestId('session-topic-sess-1').textContent).toContain('Giới thiệu môn học')
        expect(screen.getByTestId('session-objective-sess-1').textContent).toContain('Nắm được đề cương chi tiết')

        expect(screen.getByTestId('session-row-sess-2')).toBeDefined()
        expect(screen.getByTestId('session-number-sess-2').textContent).toContain('Buổi 2')
    })

    it('4. Hiển thị trạng thái rỗng khi chưa có buổi học nào', async () => {
        renderSubjectSessionsPage({
            initialSubject: mockSubjectSummary,
            initialSessions: [],
        })

        expect(screen.getByTestId('empty-state')).toBeDefined()
        expect(screen.getByText('Chưa có buổi học nào')).toBeDefined()
    })

    it('5. RBAC: Quyền chỉ xem (course.view) không thấy các nút Thêm, Sửa, Xóa và không thể kéo thả', async () => {
        renderSubjectSessionsPage({
            role: 'trainee',
            canManageOverride: false,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        expect(screen.queryByTestId('btn-add-session')).toBeNull()
        expect(screen.queryByTestId('btn-edit-sess-1')).toBeNull()
        expect(screen.queryByTestId('btn-delete-sess-1')).toBeNull()
        expect(screen.queryByTestId('drag-handle-sess-1')).toBeNull()
        expect(screen.getByTestId('session-row-sess-1').getAttribute('draggable')).toBe('false')
    })

    it('6. RBAC: Quyền quản lý (course.manage) thấy các nút thao tác và hàng có thể kéo thả', async () => {
        renderSubjectSessionsPage({
            role: 'admin',
            canManageOverride: true,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        expect(screen.getByTestId('btn-add-session')).toBeDefined()
        expect(screen.getByTestId('btn-edit-sess-1')).toBeDefined()
        expect(screen.getByTestId('btn-delete-sess-1')).toBeDefined()
        expect(screen.getByTestId('drag-handle-sess-1')).toBeDefined()
        expect(screen.getByTestId('session-row-sess-1').getAttribute('draggable')).toBe('true')
        expect(screen.getByTestId('session-row-sess-1').classList.contains('is-draggable')).toBe(true)
        // Hai nút mũi tên cũ đã bị loại bỏ hoàn toàn
        expect(screen.queryByTestId('btn-move-up-sess-1')).toBeNull()
        expect(screen.queryByTestId('btn-move-down-sess-1')).toBeNull()
    })

    it('7. Thêm mới buổi học thành công và gửi đúng dữ liệu', async () => {
        const mockRequest = vi.fn().mockImplementation(async (_path: string, init?: RequestInit) => {
            if (init?.method === 'POST') {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            id: 'sess-4',
                            subject_id: 'sub-101',
                            session_number: 4,
                            topic: 'Cây nhị phân tìm kiếm',
                            objective: 'Hiểu cấu trúc BST',
                        },
                    }),
                }
            }
            return {
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: {
                        subject: mockSubjectSummary,
                        items: mockSessionsData,
                    },
                }),
            }
        })

        renderSubjectSessionsPage({
            customRequest: mockRequest,
            canManageOverride: true,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        // Mở modal thêm
        fireEvent.click(screen.getByTestId('btn-add-session'))
        expect(screen.getByText('Thêm buổi học mới')).toBeDefined()

        // Điền form
        fireEvent.change(screen.getByTestId('input-session-number'), { target: { value: '4' } })
        fireEvent.change(screen.getByTestId('input-session-topic'), { target: { value: 'Cây nhị phân tìm kiếm' } })
        fireEvent.change(screen.getByTestId('input-session-objective'), { target: { value: 'Hiểu cấu trúc BST' } })

        // Submit form
        const form = screen.getByRole('dialog').querySelector('form')!
        fireEvent.submit(form)

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/subjects/sub-101/sessions',
                expect.objectContaining({ method: 'POST' }),
            )
        })
    })

    it('8. Chặn thêm buổi học khi số buổi vượt quá total_sessions', async () => {
        renderSubjectSessionsPage({
            canManageOverride: true,
            initialSubject: { ...mockSubjectSummary, total_sessions: 5 },
            initialSessions: mockSessionsData,
        })

        fireEvent.click(screen.getByTestId('btn-add-session'))
        fireEvent.change(screen.getByTestId('input-session-number'), { target: { value: '6' } })
        fireEvent.change(screen.getByTestId('input-session-topic'), { target: { value: 'Chủ đề 6' } })
        fireEvent.change(screen.getByTestId('input-session-objective'), { target: { value: 'Mục tiêu 6' } })

        const form = screen.getByRole('dialog').querySelector('form')!
        fireEvent.submit(form)

        expect(screen.getByText('Số thứ tự buổi học không được vượt quá 5.')).toBeDefined()
        expect(screen.getByTestId('input-session-number').classList.contains('input-invalid')).toBe(true)
    })

    it('9. Chỉnh sửa buổi học thành công và gửi đúng dữ liệu', async () => {
        const mockRequest = vi.fn().mockImplementation(async (_path: string, init?: RequestInit) => {
            if (init?.method === 'PATCH') {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: { ...mockSessionsData[0], topic: 'Chủ đề đã sửa' },
                    }),
                }
            }
            return {
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { subject: mockSubjectSummary, items: mockSessionsData },
                }),
            }
        })

        renderSubjectSessionsPage({
            customRequest: mockRequest,
            canManageOverride: true,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        // Mở modal sửa buổi 1
        fireEvent.click(screen.getByTestId('btn-edit-sess-1'))
        expect(screen.getByText('Chỉnh sửa Buổi 1')).toBeDefined()

        // Sửa topic
        fireEvent.change(screen.getByTestId('input-edit-topic'), { target: { value: 'Chủ đề đã sửa' } })
        const form = screen.getByRole('dialog').querySelector('form')!
        fireEvent.submit(form)

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/subjects/sub-101/sessions/sess-1',
                expect.objectContaining({ method: 'PATCH' }),
            )
        })
    })

    it('10. Loại bỏ hoàn toàn 2 nút mũi tên Lên/Xuống, thay thế bằng khả năng kéo thả trên cả dòng', async () => {
        renderSubjectSessionsPage({
            canManageOverride: true,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        // Nút mũi tên cũ không còn tồn tại
        expect(screen.queryByTestId('btn-move-up-sess-1')).toBeNull()
        expect(screen.queryByTestId('btn-move-down-sess-1')).toBeNull()
        expect(screen.queryByTestId('btn-move-up-sess-3')).toBeNull()
        expect(screen.queryByTestId('btn-move-down-sess-3')).toBeNull()

        // Các hàng đều có thuộc tính draggable và class is-draggable
        const row1 = screen.getByTestId('session-row-sess-1')
        const row2 = screen.getByTestId('session-row-sess-2')
        const row3 = screen.getByTestId('session-row-sess-3')
        expect(row1.getAttribute('draggable')).toBe('true')
        expect(row2.getAttribute('draggable')).toBe('true')
        expect(row3.getAttribute('draggable')).toBe('true')
        expect(row1.classList.contains('is-draggable')).toBe(true)
    })

    it('11. Sắp xếp lại buổi học gọi API reorder đúng thứ tự', async () => {
        const mockRequest = vi.fn().mockImplementation(async (path: string, init?: RequestInit) => {
            if (init?.method === 'PATCH' && path.includes('/reorder')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: [
                            { ...mockSessionsData[1], session_number: 1 },
                            { ...mockSessionsData[0], session_number: 2 },
                            mockSessionsData[2],
                        ],
                    }),
                }
            }
            return {
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { subject: mockSubjectSummary, items: mockSessionsData },
                }),
            }
        })

        renderSubjectSessionsPage({
            customRequest: mockRequest,
            canManageOverride: true,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        // Kéo buổi 1 (sess-1) thả vào vị trí buổi 2 (sess-2)
        fireEvent.dragStart(screen.getByTestId('session-row-sess-1'), {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        fireEvent.dragOver(screen.getByTestId('session-row-sess-2'), {
            dataTransfer: { dropEffect: 'move' },
        })
        fireEvent.drop(screen.getByTestId('session-row-sess-2'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/subjects/sub-101/sessions/reorder',
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify({ session_ids: ['sess-2', 'sess-1', 'sess-3'] }),
                }),
            )
        })
    })

    it('12. Xóa buổi học: mở confirm dialog, cho phép hủy hoặc xác nhận xóa', async () => {
        const mockRequest = vi.fn().mockImplementation(async (_path: string, init?: RequestInit) => {
            if (init?.method === 'DELETE') {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        message: 'Xóa buổi học thành công.',
                    }),
                }
            }
            return {
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { subject: mockSubjectSummary, items: mockSessionsData },
                }),
            }
        })

        renderSubjectSessionsPage({
            customRequest: mockRequest,
            canManageOverride: true,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        // Mở modal xóa buổi 2
        fireEvent.click(screen.getByTestId('btn-delete-sess-2'))
        expect(screen.getByText('Xác nhận xóa buổi học')).toBeDefined()
        expect(screen.getByText(/Thao tác này chỉ xóa buổi học, không xóa môn học/i)).toBeDefined()

        // Bấm xác nhận xóa
        fireEvent.click(screen.getByTestId('btn-submit-delete'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/subjects/sub-101/sessions/sess-2',
                expect.objectContaining({ method: 'DELETE' }),
            )
        })
    })

    it('13. Điều hướng quay lại danh sách môn học qua link', async () => {
        renderSubjectSessionsPage({
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        const backLink = screen.getByTestId('link-back-subjects')
        expect(backLink).toBeDefined()
        expect(backLink.getAttribute('href')).toBe('/subjects')
    })

    it('14. Vô hiệu hóa nút Thêm, Sửa, Xóa, Sắp xếp khi môn học đã lưu trữ (SCRUM-129 A8)', async () => {
        const archivedSubject: SubjectSummary = {
            ...mockSubjectSummary,
            status: 'archived',
        }

        renderSubjectSessionsPage({
            initialSubject: archivedSubject,
            initialSessions: mockSessionsData,
            canManageOverride: true,
        })

        // Banner cảnh báo lưu trữ hiển thị
        expect(screen.getByTestId('banner-archived')).toBeDefined()
        expect(screen.getByTestId('banner-archived').textContent).toContain('Đã lưu trữ')

        // Nút Thêm buổi học bị disable
        const addBtn = screen.getByTestId('btn-add-session') as HTMLButtonElement
        expect(addBtn.disabled).toBe(true)
        expect(addBtn.getAttribute('title')).toContain('Môn học đã được lưu trữ, không thể chỉnh sửa buổi học.')

        // Các nút thao tác trên từng hàng buổi học bị disable
        const editBtn = screen.getByTestId('btn-edit-sess-1') as HTMLButtonElement
        expect(editBtn.disabled).toBe(true)
        expect(editBtn.getAttribute('title')).toContain('Môn học đã được lưu trữ, không thể chỉnh sửa buổi học.')

        const deleteBtn = screen.getByTestId('btn-delete-sess-1') as HTMLButtonElement
        expect(deleteBtn.disabled).toBe(true)
        expect(deleteBtn.getAttribute('title')).toContain('Môn học đã được lưu trữ, không thể chỉnh sửa buổi học.')

        // Hàng không thể kéo thả và không có drag handle indicator
        expect(screen.getByTestId('session-row-sess-1').getAttribute('draggable')).toBe('false')
        expect(screen.getByTestId('session-row-sess-1').classList.contains('is-draggable')).toBe(false)
        expect(screen.queryByTestId('drag-handle-sess-1')).toBeNull()
        expect(screen.queryByTestId('btn-move-up-sess-1')).toBeNull()
        expect(screen.queryByTestId('btn-move-down-sess-1')).toBeNull()
    })

    it('15. Không cho phép mở modal tạo hoặc sửa khi môn học đã lưu trữ (SCRUM-129 A8)', async () => {
        const archivedSubject: SubjectSummary = {
            ...mockSubjectSummary,
            status: 'archived',
        }

        renderSubjectSessionsPage({
            initialSubject: archivedSubject,
            initialSessions: mockSessionsData,
            canManageOverride: true,
        })

        // Click nút Thêm buổi học
        fireEvent.click(screen.getByTestId('btn-add-session'))
        expect(screen.queryByText('Thêm buổi học mới')).toBeNull()

        // Click nút Sửa buổi học
        fireEvent.click(screen.getByTestId('btn-edit-sess-1'))
        expect(screen.queryByText('Chỉnh sửa buổi học')).toBeNull()
    })

    it('16. Header có nút "Nhân bản buổi học" bên cạnh "+ Thêm buổi học"', async () => {
        renderSubjectSessionsPage({
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        const cloneBtn = screen.getByTestId('btn-clone-sessions')
        expect(cloneBtn).toBeDefined()
        expect(cloneBtn.textContent).toContain('Nhân bản buổi học')

        const addBtn = screen.getByTestId('btn-add-session')
        expect(addBtn).toBeDefined()
    })

    it('17. Mở modal "Nhân bản danh sách buổi học" và load danh sách môn nguồn (không chứa môn hiện tại)', async () => {
        renderSubjectSessionsPage({
            subjectId: 'sub-101',
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        fireEvent.click(screen.getByTestId('btn-clone-sessions'))

        await waitFor(() => {
            expect(screen.getByText('Nhân bản danh sách buổi học')).toBeDefined()
        })

        const select = screen.getByTestId('select-source-subject') as HTMLSelectElement
        expect(select).toBeDefined()

        await waitFor(() => {
            expect(screen.getByText('QA-S129-SOURCE – Nguồn buổi học')).toBeDefined()
            expect(screen.queryByText('CS101 – Cấu trúc dữ liệu & Giải thuật')).toBeNull()
        })
    })

    it('18. TC129-CLONE-01: Xem trước và nhân bản 3 buổi học thành công (0/3 -> 3/3)', async () => {
        const targetSubject: SubjectSummary = {
            id: 'qa-target-1',
            code: 'QA-S129-TARGET',
            name: 'Nhận buổi học',
            total_sessions: 3,
        }

        const sourceSessions: SubjectSession[] = [
            {
                id: 'src-1',
                subject_id: 'source-subj-1',
                session_number: 1,
                topic: 'Tổng quan môn học',
                objective: 'Nắm được nội dung và mục tiêu của môn học',
                created_at: '2026-03-01T00:00:00Z',
                updated_at: '2026-03-01T00:00:00Z',
            },
            {
                id: 'src-2',
                subject_id: 'source-subj-1',
                session_number: 2,
                topic: 'Kiến thức nền tảng',
                objective: 'Hiểu các khái niệm cơ bản',
                created_at: '2026-03-02T00:00:00Z',
                updated_at: '2026-03-02T00:00:00Z',
            },
            {
                id: 'src-3',
                subject_id: 'source-subj-1',
                session_number: 3,
                topic: 'Thực hành',
                objective: 'Vận dụng kiến thức vào bài thực hành',
                created_at: '2026-03-03T00:00:00Z',
                updated_at: '2026-03-03T00:00:00Z',
            },
        ]

        let currentTargetSessions: SubjectSession[] = []

        const customMockRequest = vi.fn().mockImplementation(async (path: string, _init?: RequestInit) => {
            if (path.includes('/clone')) {
                currentTargetSessions = [...sourceSessions]
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        message: 'Đã nhân bản 3 buổi học thành công.',
                        data: {
                            cloned_count: 3,
                            total_sessions: 3,
                            items: currentTargetSessions,
                        },
                    }),
                }
            }
            if (path.includes('/source-subj-1/sessions')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            subject: { id: 'source-subj-1', code: 'QA-S129-SOURCE', name: 'Nguồn buổi học' },
                            items: sourceSessions,
                        },
                    }),
                }
            }
            if (path.includes('/sessions') && !path.includes('/reorder')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            subject: targetSubject,
                            items: currentTargetSessions,
                        },
                    }),
                }
            }
            if (path.includes('/subjects?') || path === '/api/v1/subjects') {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            items: [
                                {
                                    id: 'source-subj-1',
                                    code: 'QA-S129-SOURCE',
                                    name: 'Nguồn buổi học',
                                    total_sessions: 3,
                                    status: 'active',
                                },
                            ],
                            total: 1,
                            page: 1,
                            page_size: 100,
                            total_pages: 1,
                        },
                    }),
                }
            }
            if (path.includes('/subjects/')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            ...targetSubject,
                            status: 'active',
                        },
                    }),
                }
            }
            return { ok: true, json: async () => ({ status: 'success' }) }
        })

        renderSubjectSessionsPage({
            subjectId: 'qa-target-1',
            initialSubject: targetSubject,
            initialSessions: [],
            customRequest: customMockRequest,
        })

        // Ban đầu 0 / 3 buổi
        expect(screen.getByTestId('badge-subject-progress').textContent).toContain('0 / 3 buổi đã tạo')

        // Mở modal nhân bản
        fireEvent.click(screen.getByTestId('btn-clone-sessions'))

        await waitFor(() => {
            expect(screen.getByText('Nhân bản danh sách buổi học')).toBeDefined()
        })

        // Chọn môn nguồn
        const select = screen.getByTestId('select-source-subject')
        fireEvent.change(select, { target: { value: 'source-subj-1' } })

        // Chờ preview hiển thị
        await waitFor(() => {
            expect(screen.getByTestId('clone-preview-source-info').textContent).toContain('QA-S129-SOURCE – Nguồn buổi học')
            expect(screen.getByTestId('clone-preview-count').textContent).toContain('3 buổi')
            expect(screen.getByText('Buổi 1 – Tổng quan môn học')).toBeDefined()
            expect(screen.getByText('Mục tiêu: Nắm được nội dung và mục tiêu của môn học')).toBeDefined()
            expect(screen.getByText('Buổi 2 – Kiến thức nền tảng')).toBeDefined()
            expect(screen.getByText('Buổi 3 – Thực hành')).toBeDefined()
        })

        // Bấm nút Nhân bản
        const submitBtn = screen.getByTestId('btn-submit-clone')
        expect((submitBtn as HTMLButtonElement).disabled).toBe(false)
        fireEvent.click(submitBtn)

        // Chờ hoàn thành
        await waitFor(() => {
            expect(screen.getByTestId('banner-success').textContent).toContain('Đã nhân bản 3 buổi học thành công.')
            expect(screen.getByTestId('badge-subject-progress').textContent).toContain('3 / 3 buổi đã tạo')
        })
    })

    it('19. TC129-CLONE-04: Chặn nhân bản khi TARGET max = 2 mà SOURCE có 3 buổi', async () => {
        const targetSubject: SubjectSummary = {
            id: 'qa-target-small',
            code: 'QA-S129-TARGET-2',
            name: 'Môn đích 2 buổi',
            total_sessions: 2,
        }

        const sourceSessions: SubjectSession[] = [
            { id: 's1', subject_id: 'src-1', session_number: 1, topic: 'B1', objective: 'O1', created_at: '', updated_at: '' },
            { id: 's2', subject_id: 'src-1', session_number: 2, topic: 'B2', objective: 'O2', created_at: '', updated_at: '' },
            { id: 's3', subject_id: 'src-1', session_number: 3, topic: 'B3', objective: 'O3', created_at: '', updated_at: '' },
        ]

        const customMockRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path.includes('/source-subj-1/sessions')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            subject: { id: 'source-subj-1', code: 'QA-S129-SOURCE', name: 'Nguồn buổi học' },
                            items: sourceSessions,
                        },
                    }),
                }
            }
            if (path.includes('/sessions') && !path.includes('/reorder')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: { subject: targetSubject, items: [] },
                    }),
                }
            }
            if (path.includes('/subjects?') || path === '/api/v1/subjects') {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            items: [{ id: 'source-subj-1', code: 'QA-S129-SOURCE', name: 'Nguồn buổi học', total_sessions: 3, status: 'active' }],
                            total: 1, page: 1, page_size: 100, total_pages: 1,
                        },
                    }),
                }
            }
            return { ok: true, json: async () => ({ status: 'success' }) }
        })

        renderSubjectSessionsPage({
            subjectId: 'qa-target-small',
            initialSubject: targetSubject,
            initialSessions: [],
            customRequest: customMockRequest,
        })

        fireEvent.click(screen.getByTestId('btn-clone-sessions'))
        await waitFor(() => screen.getByTestId('select-source-subject'))

        fireEvent.change(screen.getByTestId('select-source-subject'), { target: { value: 'source-subj-1' } })

        await waitFor(() => {
            expect(screen.getByTestId('clone-error-banner').textContent).toContain(
                'Không thể nhân bản. Môn học này chỉ được khai báo tối đa 2 buổi.',
            )
        })

        const submitBtn = screen.getByTestId('btn-submit-clone') as HTMLButtonElement
        expect(submitBtn.disabled).toBe(true)
    })

    it('20. TC129-CLONE-05: Chặn nhân bản khi tổng số buổi sau clone vượt quá max (3 + 3 > 5)', async () => {
        const targetSubject: SubjectSummary = {
            id: 'qa-target-5',
            code: 'QA-S129-TARGET-5',
            name: 'Môn đích 5 buổi',
            total_sessions: 5,
        }

        const targetCurrentSessions: SubjectSession[] = [
            { id: 't1', subject_id: 'qa-target-5', session_number: 1, topic: 'T1', objective: 'O1', created_at: '', updated_at: '' },
            { id: 't2', subject_id: 'qa-target-5', session_number: 2, topic: 'T2', objective: 'O2', created_at: '', updated_at: '' },
            { id: 't3', subject_id: 'qa-target-5', session_number: 3, topic: 'T3', objective: 'O3', created_at: '', updated_at: '' },
        ]

        const sourceSessions: SubjectSession[] = [
            { id: 's1', subject_id: 'src-1', session_number: 1, topic: 'B1', objective: 'O1', created_at: '', updated_at: '' },
            { id: 's2', subject_id: 'src-1', session_number: 2, topic: 'B2', objective: 'O2', created_at: '', updated_at: '' },
            { id: 's3', subject_id: 'src-1', session_number: 3, topic: 'B3', objective: 'O3', created_at: '', updated_at: '' },
        ]

        const customMockRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path.includes('/source-subj-1/sessions')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            subject: { id: 'source-subj-1', code: 'QA-S129-SOURCE', name: 'Nguồn buổi học' },
                            items: sourceSessions,
                        },
                    }),
                }
            }
            if (path.includes('/sessions') && !path.includes('/reorder')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: { subject: targetSubject, items: targetCurrentSessions },
                    }),
                }
            }
            if (path.includes('/subjects?') || path === '/api/v1/subjects') {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            items: [{ id: 'source-subj-1', code: 'QA-S129-SOURCE', name: 'Nguồn buổi học', total_sessions: 3, status: 'active' }],
                            total: 1, page: 1, page_size: 100, total_pages: 1,
                        },
                    }),
                }
            }
            return { ok: true, json: async () => ({ status: 'success' }) }
        })

        renderSubjectSessionsPage({
            subjectId: 'qa-target-5',
            initialSubject: targetSubject,
            initialSessions: targetCurrentSessions,
            customRequest: customMockRequest,
        })

        fireEvent.click(screen.getByTestId('btn-clone-sessions'))
        await waitFor(() => screen.getByTestId('select-source-subject'))

        fireEvent.change(screen.getByTestId('select-source-subject'), { target: { value: 'source-subj-1' } })

        await waitFor(() => {
            expect(screen.getByTestId('clone-error-banner').textContent).toContain(
                'Không thể nhân bản vì số buổi sau khi nhân bản sẽ vượt quá giới hạn của môn học.',
            )
        })

        const submitBtn = screen.getByTestId('btn-submit-clone') as HTMLButtonElement
        expect(submitBtn.disabled).toBe(true)
    })

    it('21. TC129-CLONE-07: Hiển thị cảnh báo khi môn nguồn không có buổi học nào', async () => {
        const customMockRequest = vi.fn().mockImplementation(async (path: string) => {
            if (path.includes('/source-empty/sessions')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            subject: { id: 'source-empty', code: 'EMPTY-SOURCE', name: 'Môn nguồn rỗng' },
                            items: [],
                        },
                    }),
                }
            }
            if (path.includes('/sessions') && !path.includes('/reorder')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: { subject: mockSubjectSummary, items: [] },
                    }),
                }
            }
            if (path.includes('/subjects?') || path === '/api/v1/subjects') {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            items: [{ id: 'source-empty', code: 'EMPTY-SOURCE', name: 'Môn nguồn rỗng', total_sessions: 3, status: 'active' }],
                            total: 1, page: 1, page_size: 100, total_pages: 1,
                        },
                    }),
                }
            }
            return { ok: true, json: async () => ({ status: 'success' }) }
        })

        renderSubjectSessionsPage({
            subjectId: 'sub-101',
            initialSubject: mockSubjectSummary,
            initialSessions: [],
            customRequest: customMockRequest,
        })

        fireEvent.click(screen.getByTestId('btn-clone-sessions'))
        await waitFor(() => screen.getByTestId('select-source-subject'))

        fireEvent.change(screen.getByTestId('select-source-subject'), { target: { value: 'source-empty' } })

        await waitFor(() => {
            expect(screen.getByTestId('clone-error-banner').textContent).toContain(
                'Môn học được chọn chưa có buổi học để nhân bản.',
            )
            expect(screen.getByTestId('clone-preview-empty').textContent).toContain(
                'Môn học này chưa có buổi học nào để nhân bản.',
            )
        })

        const submitBtn = screen.getByTestId('btn-submit-clone') as HTMLButtonElement
        expect(submitBtn.disabled).toBe(true)
    })

    it('22. A. Kéo Buổi 3 lên vị trí 1 -> Cập nhật thứ tự mới và gọi API reorder', async () => {
        let sentSessionIds: string[] = []
        const customMockRequest = vi.fn().mockImplementation(async (path: string, init?: RequestInit) => {
            if (init?.method === 'PATCH' && path.includes('/reorder')) {
                const body = JSON.parse(init.body as string)
                sentSessionIds = body.session_ids
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: [
                            { ...mockSessionsData[2], session_number: 1 },
                            { ...mockSessionsData[0], session_number: 2 },
                            { ...mockSessionsData[1], session_number: 3 },
                        ],
                    }),
                }
            }
            return {
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { subject: mockSubjectSummary, items: mockSessionsData },
                }),
            }
        })

        renderSubjectSessionsPage({
            customRequest: customMockRequest,
            canManageOverride: true,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        const row1 = screen.getByTestId('session-row-sess-1')
        const row3 = screen.getByTestId('session-row-sess-3')

        // Kéo Buổi 3 (sess-3: Thực hành) lên vị trí Buổi 1 (sess-1)
        fireEvent.dragStart(row3, {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        fireEvent.dragOver(row1, {
            dataTransfer: { dropEffect: 'move' },
        })
        fireEvent.drop(row1)

        // Optimistic UI update
        await waitFor(() => {
            expect(screen.getByTestId('session-number-sess-3').textContent).toBe('Buổi 1')
            expect(screen.getByTestId('session-number-sess-1').textContent).toBe('Buổi 2')
            expect(screen.getByTestId('session-number-sess-2').textContent).toBe('Buổi 3')
            expect(screen.getByTestId('banner-success').textContent).toContain('Đã cập nhật thứ tự buổi học.')
        })

        expect(sentSessionIds).toEqual(['sess-3', 'sess-1', 'sess-2'])
    })

    it('23. B. Reload trang: thứ tự mới được bảo lưu từ API', async () => {
        const reorderedData = [
            { ...mockSessionsData[2], session_number: 1 },
            { ...mockSessionsData[0], session_number: 2 },
            { ...mockSessionsData[1], session_number: 3 },
        ]

        const customMockRequest = vi.fn().mockImplementation(async (path: string, init?: RequestInit) => {
            if (init?.method === 'PATCH' && path.includes('/reorder')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: reorderedData,
                    }),
                }
            }
            if (path.includes('/sessions') && !path.includes('/reorder')) {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            subject: mockSubjectSummary,
                            items: reorderedData,
                        },
                    }),
                }
            }
            return { ok: true, json: async () => ({ status: 'success' }) }
        })

        const { unmount } = renderSubjectSessionsPage({
            customRequest: customMockRequest,
            canManageOverride: true,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        // Kéo sess-3 lên row 1
        fireEvent.dragStart(screen.getByTestId('session-row-sess-3'), {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        fireEvent.drop(screen.getByTestId('session-row-sess-1'))

        await waitFor(() => {
            expect(screen.getByTestId('session-number-sess-3').textContent).toBe('Buổi 1')
        })

        unmount()

        // Giả lập Reload trang (render lại với cùng API trả về reorderedData)
        renderSubjectSessionsPage({
            customRequest: customMockRequest,
            canManageOverride: true,
            initialSubject: mockSubjectSummary,
            initialSessions: reorderedData,
        })

        expect(screen.getByTestId('session-number-sess-3').textContent).toBe('Buổi 1')
        expect(screen.getByTestId('session-topic-sess-3').textContent).toBe(mockSessionsData[2].topic)
        expect(screen.getByTestId('session-number-sess-1').textContent).toBe('Buổi 2')
        expect(screen.getByTestId('session-number-sess-2').textContent).toBe('Buổi 3')
    })

    it('24. C & D. Kéo bằng tên chủ đề (topic) hoặc vùng mục tiêu (objective) đều hoạt động thành công', async () => {
        const customMockRequest = vi.fn().mockImplementation(async (path: string, init?: RequestInit) => {
            if (init?.method === 'PATCH' && path.includes('/reorder')) {
                return {
                    ok: true,
                    json: async () => ({ status: 'success', data: mockSessionsData }),
                }
            }
            return {
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { subject: mockSubjectSummary, items: mockSessionsData },
                }),
            }
        })

        renderSubjectSessionsPage({
            customRequest: customMockRequest,
            canManageOverride: true,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        // C. Kéo bằng topic
        const topicCell3 = screen.getByTestId('session-topic-sess-3')
        const row1 = screen.getByTestId('session-row-sess-1')

        fireEvent.dragStart(topicCell3, {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        fireEvent.dragOver(row1, { dataTransfer: { dropEffect: 'move' } })
        fireEvent.drop(row1)

        await waitFor(() => {
            expect(customMockRequest).toHaveBeenCalledWith(
                '/api/v1/subjects/sub-101/sessions/reorder',
                expect.objectContaining({ method: 'PATCH' }),
            )
        })

        // D. Kéo bằng objective
        const objectiveCell2 = screen.getByTestId('session-objective-sess-2')
        fireEvent.dragStart(objectiveCell2, {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        fireEvent.dragOver(row1, { dataTransfer: { dropEffect: 'move' } })
        fireEvent.drop(row1)

        await waitFor(() => {
            expect(customMockRequest).toHaveBeenCalledTimes(2)
        })
    })

    it('25. E & F. Click vào nút Sửa hoặc Xóa không kích hoạt drag (preventDefault)', async () => {
        renderSubjectSessionsPage({
            canManageOverride: true,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        const editBtn = screen.getByTestId('btn-edit-sess-1')
        const deleteBtn = screen.getByTestId('btn-delete-sess-1')

        // E. Click Sửa -> mở modal sửa bình thường, không drag
        fireEvent.click(editBtn)
        expect(screen.getByText('Chỉnh sửa Buổi 1')).toBeDefined()
        fireEvent.click(screen.getByText('Hủy'))

        // F. Click Xóa -> mở dialog xóa bình thường, không drag
        fireEvent.click(deleteBtn)
        expect(screen.getByText('Xác nhận xóa buổi học')).toBeDefined()
        fireEvent.click(screen.getByText('Hủy'))
    })

    it('26. Visual feedback: dragOver hiển thị row-drop-target và dragStart hiển thị row-dragging', async () => {
        renderSubjectSessionsPage({
            canManageOverride: true,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        const row1 = screen.getByTestId('session-row-sess-1')
        const row2 = screen.getByTestId('session-row-sess-2')

        fireEvent.dragStart(row1, {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })

        // row1 đang kéo có class row-dragging
        expect(row1.classList.contains('row-dragging')).toBe(true)

        // dragOver qua row2 -> row2 có class row-drop-target
        fireEvent.dragOver(row2, { dataTransfer: { dropEffect: 'move' } })
        expect(row2.classList.contains('row-drop-target')).toBe(true)

        // dragLeave khỏi row2 -> mất class row-drop-target
        fireEvent.dragLeave(row2)
        expect(row2.classList.contains('row-drop-target')).toBe(false)

        // dragEnd -> row1 mất class row-dragging
        fireEvent.dragEnd(row1)
        expect(row1.classList.contains('row-dragging')).toBe(false)
    })

    it('27. Optimistic rollback khi API reorder trả về lỗi', async () => {
        const customMockRequest = vi.fn().mockImplementation(async (path: string, init?: RequestInit) => {
            if (init?.method === 'PATCH' && path.includes('/reorder')) {
                return {
                    ok: false,
                    status: 500,
                    json: async () => ({
                        message: 'Không thể cập nhật thứ tự buổi học. Vui lòng thử lại.',
                    }),
                }
            }
            return {
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { subject: mockSubjectSummary, items: mockSessionsData },
                }),
            }
        })

        renderSubjectSessionsPage({
            customRequest: customMockRequest,
            canManageOverride: true,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        const row1 = screen.getByTestId('session-row-sess-1')
        const row2 = screen.getByTestId('session-row-sess-2')

        // Kéo buổi 1 thả xuống buổi 2
        fireEvent.dragStart(row1, {
            dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
        })
        fireEvent.drop(row2)

        // Rollback về thứ tự ban đầu và hiển thị lỗi
        await waitFor(() => {
            expect(screen.getByTestId('banner-error').textContent).toContain(
                'Không thể cập nhật thứ tự buổi học. Vui lòng thử lại.',
            )
            expect(screen.getByTestId('session-number-sess-1').textContent).toBe('Buổi 1')
            expect(screen.getByTestId('session-number-sess-2').textContent).toBe('Buổi 2')
        })
    })

    describe('SCRUM-129 - Vietnamese Validation & Native Browser Tooltip Replacement', () => {
        it('28. validateSessionNumber unit tests for all validation cases', () => {
            // Case: Để trống
            expect(validateSessionNumber('', 3)).toBe('Vui lòng nhập số thứ tự buổi học.')
            expect(validateSessionNumber('   ', 3)).toBe('Vui lòng nhập số thứ tự buổi học.')

            // Case: Không phải số nguyên hợp lệ
            expect(validateSessionNumber('abc', 3)).toBe('Vui lòng nhập số thứ tự buổi học hợp lệ.')
            expect(validateSessionNumber('1.5', 3)).toBe('Vui lòng nhập số thứ tự buổi học hợp lệ.')
            expect(validateSessionNumber('3,5', 3)).toBe('Vui lòng nhập số thứ tự buổi học hợp lệ.')

            // Case: Nhập 0 hoặc số nhỏ hơn 1
            expect(validateSessionNumber('0', 3)).toBe('Số thứ tự buổi học phải lớn hơn hoặc bằng 1.')
            expect(validateSessionNumber('-1', 3)).toBe('Số thứ tự buổi học phải lớn hơn hoặc bằng 1.')
            expect(validateSessionNumber('-10', 3)).toBe('Số thứ tự buổi học phải lớn hơn hoặc bằng 1.')

            // Case: Vượt quá total_sessions (động, không hard-code)
            expect(validateSessionNumber('4', 3)).toBe('Số thứ tự buổi học không được vượt quá 3.')
            expect(validateSessionNumber('11', 10)).toBe('Số thứ tự buổi học không được vượt quá 10.')
            expect(validateSessionNumber('100', 50)).toBe('Số thứ tự buổi học không được vượt quá 50.')

            // Case: Hợp lệ
            expect(validateSessionNumber('1', 3)).toBeNull()
            expect(validateSessionNumber('2', 3)).toBeNull()
            expect(validateSessionNumber('3', 3)).toBeNull()
            expect(validateSessionNumber('10', 10)).toBeNull()
            expect(validateSessionNumber('5', null)).toBeNull()
        })

        it('29. Test 1 (nhập 4 với total_sessions = 3): Hiển thị "Số thứ tự buổi học không được vượt quá 3." và form có noValidate', async () => {
            renderSubjectSessionsPage({
                canManageOverride: true,
                initialSubject: { ...mockSubjectSummary, total_sessions: 3 },
                initialSessions: [mockSessionsData[0], mockSessionsData[1]], // 2/3 buổi
            })

            fireEvent.click(screen.getByTestId('btn-add-session'))
            const form = screen.getByRole('dialog').querySelector('form')!
            expect(form.noValidate).toBe(true)

            const inputNumber = screen.getByTestId('input-session-number')
            fireEvent.change(inputNumber, { target: { value: '4' } })

            // Hiển thị ngay dưới input
            expect(screen.getByText('Số thứ tự buổi học không được vượt quá 3.')).toBeDefined()
            expect(inputNumber.classList.contains('input-invalid')).toBe(true)

            // Submit không được gọi API
            const submitBtn = screen.getByTestId('btn-submit-create')
            fireEvent.click(submitBtn)
            expect(screen.getByText('Số thứ tự buổi học không được vượt quá 3.')).toBeDefined()
        })

        it('30. Test 2 (nhập 0): Hiển thị "Số thứ tự buổi học phải lớn hơn hoặc bằng 1."', async () => {
            renderSubjectSessionsPage({
                canManageOverride: true,
                initialSubject: { ...mockSubjectSummary, total_sessions: 3 },
                initialSessions: [mockSessionsData[0]],
            })

            fireEvent.click(screen.getByTestId('btn-add-session'))
            const inputNumber = screen.getByTestId('input-session-number')
            fireEvent.change(inputNumber, { target: { value: '0' } })

            expect(screen.getByText('Số thứ tự buổi học phải lớn hơn hoặc bằng 1.')).toBeDefined()
            expect(inputNumber.classList.contains('input-invalid')).toBe(true)
        })

        it('31. Test 3 (để trống): Hiển thị "Vui lòng nhập số thứ tự buổi học."', async () => {
            renderSubjectSessionsPage({
                canManageOverride: true,
                initialSubject: { ...mockSubjectSummary, total_sessions: 3 },
                initialSessions: [mockSessionsData[0]],
            })

            fireEvent.click(screen.getByTestId('btn-add-session'))
            const inputNumber = screen.getByTestId('input-session-number')
            fireEvent.change(inputNumber, { target: { value: '' } })

            expect(screen.getByText('Vui lòng nhập số thứ tự buổi học.')).toBeDefined()
            expect(inputNumber.classList.contains('input-invalid')).toBe(true)
        })

        it('32. Test 4 (nhập 3 với total_sessions = 3): Field hợp lệ, lỗi biến mất', async () => {
            const mockRequest = vi.fn().mockImplementation(async (_path: string, init?: RequestInit) => {
                if (init?.method === 'POST') {
                    return {
                        ok: true,
                        json: async () => ({
                            status: 'success',
                            data: {
                                id: 'sess-3',
                                subject_id: 'sub-101',
                                session_number: 3,
                                topic: 'Buổi cuối',
                                objective: 'Mục tiêu hoàn thành',
                            },
                        }),
                    }
                }
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: {
                            subject: { ...mockSubjectSummary, total_sessions: 3 },
                            items: [mockSessionsData[0], mockSessionsData[1]],
                        },
                    }),
                }
            })

            renderSubjectSessionsPage({
                customRequest: mockRequest,
                canManageOverride: true,
                initialSubject: { ...mockSubjectSummary, total_sessions: 3 },
                initialSessions: [mockSessionsData[0], mockSessionsData[1]],
            })

            fireEvent.click(screen.getByTestId('btn-add-session'))
            const inputNumber = screen.getByTestId('input-session-number')

            // Ban đầu nhập 4 (bị lỗi)
            fireEvent.change(inputNumber, { target: { value: '4' } })
            expect(screen.getByText('Số thứ tự buổi học không được vượt quá 3.')).toBeDefined()

            // Sửa lại thành 3 (hợp lệ)
            fireEvent.change(inputNumber, { target: { value: '3' } })
            expect(screen.queryByTestId('error-session-number')).toBeNull()
            expect(inputNumber.classList.contains('input-invalid')).toBe(false)

            // Điền topic, objective và submit
            fireEvent.change(screen.getByTestId('input-session-topic'), { target: { value: 'Buổi cuối' } })
            fireEvent.change(screen.getByTestId('input-session-objective'), { target: { value: 'Mục tiêu hoàn thành' } })
            fireEvent.click(screen.getByTestId('btn-submit-create'))

            await waitFor(() => {
                expect(mockRequest).toHaveBeenCalledWith(
                    '/api/v1/subjects/sub-101/sessions',
                    expect.objectContaining({
                        method: 'POST',
                        body: JSON.stringify({
                            session_number: 3,
                            topic: 'Buổi cuối',
                            objective: 'Mục tiêu hoàn thành',
                        }),
                    }),
                )
            })
        })

        it('33. Khi đã đủ 3/3 buổi đã tạo: disable nút "+ Thêm buổi học" với tooltip tiếng Việt', async () => {
            renderSubjectSessionsPage({
                canManageOverride: true,
                initialSubject: { ...mockSubjectSummary, total_sessions: 3 },
                initialSessions: [mockSessionsData[0], mockSessionsData[1], mockSessionsData[2]], // 3/3 buổi
            })

            const addBtn = screen.getByTestId('btn-add-session') as HTMLButtonElement
            expect(addBtn.disabled).toBe(true)
            expect(addBtn.getAttribute('title')).toBe('Môn học đã khai báo đủ 3/3 buổi.')

            // Không mở được modal tạo
            fireEvent.click(addBtn)
            expect(screen.queryByText('Thêm buổi học mới')).toBeNull()
        })

        it('34. Khi API trả về 400 INVALID_PARAMS: hiển thị error-state, KHÔNG giả thành empty-state hay hiện nút thêm', async () => {
            const mockBadRequest = vi.fn().mockImplementation(async (path: string) => {
                if (path.includes('/sessions')) {
                    return {
                        ok: false,
                        status: 400,
                        json: async () => ({
                            code: 'INVALID_PARAMS',
                            message: 'Mã định danh môn học không đúng định dạng UUID.',
                        }),
                    }
                }
                return { ok: true, json: async () => ({}) }
            })

            renderSubjectSessionsPage({
                canManageOverride: true,
                subjectId: 'sub-py-7db24fb8',
                customRequest: mockBadRequest,
            })

            await waitFor(() => {
                expect(screen.getByTestId('error-state')).toBeDefined()
            })

            expect(screen.getByText('Không thể tải danh sách buổi học')).toBeDefined()
            expect(screen.getByTestId('sessions-error-message').textContent).toContain('Mã định danh môn học không đúng định dạng UUID.')
            expect(screen.getByTestId('btn-retry')).toBeDefined()
            expect(screen.getByTestId('btn-back-to-subjects')).toBeDefined()

            // KHÔNG hiển thị empty state
            expect(screen.queryByTestId('empty-state')).toBeNull()
            expect(screen.queryByText('Chưa có buổi học nào')).toBeNull()
            expect(screen.queryByTestId('btn-empty-add-session')).toBeNull()

            // KHÔNG hiển thị nút thêm hoặc nhân bản trên header
            expect(screen.queryByTestId('btn-add-session')).toBeNull()
            expect(screen.queryByTestId('btn-clone-sessions')).toBeNull()
        })

        it('35. Bấm nút "Thử lại" trên error-state sẽ gọi lại API tải dữ liệu', async () => {
            let attempt = 0
            const mockRetryRequest = vi.fn().mockImplementation(async (path: string) => {
                if (path.includes('/sessions')) {
                    attempt++
                    if (attempt === 1) {
                        return {
                            ok: false,
                            status: 400,
                            json: async () => ({
                                code: 'INVALID_PARAMS',
                                message: 'Mã định danh môn học không đúng định dạng UUID.',
                            }),
                        }
                    }
                    return {
                        ok: true,
                        json: async () => ({
                            status: 'success',
                            data: {
                                subject: mockSubjectSummary,
                                items: mockSessionsData,
                            },
                        }),
                    }
                }
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: { ...mockSubjectSummary, status: 'active' },
                    }),
                }
            })

            renderSubjectSessionsPage({
                canManageOverride: true,
                subjectId: 'sub-101',
                customRequest: mockRetryRequest,
            })

            await waitFor(() => {
                expect(screen.getByTestId('error-state')).toBeDefined()
            })

            // Bấm Thử lại
            fireEvent.click(screen.getByTestId('btn-retry'))

            await waitFor(() => {
                expect(screen.getByTestId('sessions-table-wrapper')).toBeDefined()
            })

            expect(screen.queryByTestId('error-state')).toBeNull()
            expect(screen.getByText('Giới thiệu môn học')).toBeDefined()
        })

        it('36. Khi API trả về 404 hoặc 403: hiển thị thông báo lỗi phù hợp, không hiển thị empty-state', async () => {
            const mock404Request = vi.fn().mockImplementation(async () => {
                return {
                    ok: false,
                    status: 404,
                    json: async () => ({
                        code: 'SUBJECT_NOT_FOUND',
                        message: 'Không tìm thấy môn học.',
                    }),
                }
            })

            renderSubjectSessionsPage({
                canManageOverride: true,
                subjectId: 'sub-non-existent',
                customRequest: mock404Request,
            })

            await waitFor(() => {
                expect(screen.getByTestId('error-state')).toBeDefined()
            })

            expect(screen.getByTestId('sessions-error-message').textContent).toContain('Không tìm thấy')
            expect(screen.queryByTestId('empty-state')).toBeNull()
        })

        it('37. Khi API thành công và danh sách rỗng: hiển thị empty-state và nút thêm buổi đầu tiên', async () => {
            const mockEmptyRequest = vi.fn().mockImplementation(async (path: string) => {
                if (path.includes('/sessions')) {
                    return {
                        ok: true,
                        json: async () => ({
                            status: 'success',
                            data: {
                                subject: mockSubjectSummary,
                                items: [],
                            },
                        }),
                    }
                }
                return {
                    ok: true,
                    json: async () => ({
                        status: 'success',
                        data: { ...mockSubjectSummary, status: 'active' },
                    }),
                }
            })

            renderSubjectSessionsPage({
                canManageOverride: true,
                subjectId: 'sub-101',
                customRequest: mockEmptyRequest,
            })

            await waitFor(() => {
                expect(screen.getByTestId('empty-state')).toBeDefined()
            })

            expect(screen.getByText('Chưa có buổi học nào')).toBeDefined()
            expect(screen.getByTestId('btn-empty-add-session')).toBeDefined()
            expect(screen.queryByTestId('error-state')).toBeNull()
            expect(screen.queryByTestId('sessions-table-wrapper')).toBeNull()
        })
    })
})


