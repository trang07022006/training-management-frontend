// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SubjectSessionsPage } from './SubjectSessionsPage'
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

    it('5. RBAC: Quyền chỉ xem (course.view) không thấy các nút Thêm, Sửa, Xóa, Sắp xếp', async () => {
        renderSubjectSessionsPage({
            role: 'trainee',
            canManageOverride: false,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        expect(screen.queryByTestId('btn-add-session')).toBeNull()
        expect(screen.queryByTestId('btn-edit-sess-1')).toBeNull()
        expect(screen.queryByTestId('btn-delete-sess-1')).toBeNull()
        expect(screen.queryByTestId('btn-move-up-sess-1')).toBeNull()
    })

    it('6. RBAC: Quyền quản lý (course.manage) thấy đầy đủ các nút thao tác', async () => {
        renderSubjectSessionsPage({
            role: 'admin',
            canManageOverride: true,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        expect(screen.getByTestId('btn-add-session')).toBeDefined()
        expect(screen.getByTestId('btn-edit-sess-1')).toBeDefined()
        expect(screen.getByTestId('btn-delete-sess-1')).toBeDefined()
        expect(screen.getByTestId('btn-move-up-sess-1')).toBeDefined()
        expect(screen.getByTestId('btn-move-down-sess-1')).toBeDefined()
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

        expect(screen.getByText(/Số thứ tự buổi học vượt quá tổng số buổi của môn học/i)).toBeDefined()
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

    it('10. Sắp xếp lại buổi học: Move Up disabled ở buổi đầu, Move Down disabled ở buổi cuối', async () => {
        renderSubjectSessionsPage({
            canManageOverride: true,
            initialSubject: mockSubjectSummary,
            initialSessions: mockSessionsData,
        })

        const upBtn = screen.getByTestId('btn-move-up-sess-1') as HTMLButtonElement
        const downBtn = screen.getByTestId('btn-move-down-sess-1') as HTMLButtonElement
        expect(upBtn.disabled).toBe(true)
        expect(downBtn.disabled).toBe(false)

        const lastDownBtn = screen.getByTestId('btn-move-down-sess-3') as HTMLButtonElement
        const lastUpBtn = screen.getByTestId('btn-move-up-sess-3') as HTMLButtonElement
        expect(lastDownBtn.disabled).toBe(true)
        expect(lastUpBtn.disabled).toBe(false)
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

        // Bấm di chuyển buổi 1 xuống dưới
        fireEvent.click(screen.getByTestId('btn-move-down-sess-1'))

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

        const moveUpBtn = screen.getByTestId('btn-move-up-sess-2') as HTMLButtonElement
        expect(moveUpBtn.disabled).toBe(true)
        expect(moveUpBtn.getAttribute('title')).toContain('Môn học đã được lưu trữ, không thể chỉnh sửa buổi học.')

        const moveDownBtn = screen.getByTestId('btn-move-down-sess-1') as HTMLButtonElement
        expect(moveDownBtn.disabled).toBe(true)
        expect(moveDownBtn.getAttribute('title')).toContain('Môn học đã được lưu trữ, không thể chỉnh sửa buổi học.')
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
})

