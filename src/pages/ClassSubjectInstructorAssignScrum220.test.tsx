// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { ClassSubjectInstructorAssignPage } from './ClassSubjectInstructorAssignPage'
import { ClassDetailPage } from './ClassDetailPage'
import { ClassesPage } from './ClassesPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { TrainingClass, ClassSubjectItem } from '../api/classApi'
import type { User } from '../api/userApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const trainerA: User = {
    id: 'trainer-01',
    name: 'Thầy Nguyễn Văn A',
    email: 'trainer.a@ictu.edu.vn',
    role: 'trainer',
    status: 'active',
}

const trainerB: User = {
    id: 'trainer-02',
    name: 'Cô Trần Thị B',
    email: 'trainer.b@ictu.edu.vn',
    role: 'trainer',
    status: 'active',
}

const assistant1: User = {
    id: 'asst-01',
    name: 'Trợ giảng Lê C',
    email: 'assistant.c@ictu.edu.vn',
    role: 'trainer',
    status: 'active',
}

const assistant2: User = {
    id: 'asst-02',
    name: 'Trợ giảng Phạm D',
    email: 'assistant.d@ictu.edu.vn',
    role: 'trainer',
    status: 'active',
}

const traineeUser: User = {
    id: 'trainee-01',
    name: 'Học viên E',
    email: 'trainee.e@ictu.edu.vn',
    role: 'trainee',
    status: 'active',
}

const consultantUser: User = {
    id: 'consultant-01',
    name: 'Tư vấn viên F',
    email: 'consultant.f@ictu.edu.vn',
    role: 'consultant',
    status: 'active',
}

const sampleSubject1: ClassSubjectItem = {
    id: 'cs-220-01',
    class_id: 'cls-220-001',
    subject_id: 'sub-01',
    subject_code: 'CS101',
    subject_name: 'Nhập môn lập trình',
    credits: 3,
    semester: 1,
    is_mandatory: true,
    order_index: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    main_instructor: null,
    assistants: [],
}

const sampleSubject2: ClassSubjectItem = {
    id: 'cs-220-02',
    class_id: 'cls-220-001',
    subject_id: 'sub-02',
    subject_code: 'CS102',
    subject_name: 'Cấu trúc dữ liệu và giải thuật',
    credits: 4,
    semester: 1,
    is_mandatory: true,
    order_index: 2,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    main_instructor: null,
    assistants: [],
}

const sampleClass: TrainingClass = {
    id: 'cls-220-001',
    class_code: 'CNTT-220A',
    program_id: 'prog-220-001',
    program_code: 'PROG-CNTT',
    program_name: 'Công nghệ thông tin',
    expected_start_date: '2026-09-01',
    max_capacity: 30,
    learning_mode: 'offline',
    status: 'preparing',
    status_label: 'Chuẩn bị',
    enrolled_count: 5,
    subjects: [sampleSubject1, sampleSubject2],
    copied_subjects_count: 2,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
}

function RoleSessionWrapper({
    role = 'training_manager',
    roles,
    permissions,
    children,
}: {
    role?: string | null
    roles?: string[]
    permissions?: string[]
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        if (role !== undefined && !hasSession) {
            startSession(
                { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
                role,
                `usr-${role}`,
                false,
                'Test User',
                `${role}@test.edu.vn`,
                roles ?? (role ? [role] : []),
                permissions ?? (role === 'trainer' ? ['course.view'] : ['course.manage', 'course.view']),
            )
        }
    }, [role, roles, permissions, hasSession, startSession])

    if (role !== undefined && !hasSession) {
        return <div>Initializing session...</div>
    }

    return <>{children}</>
}

function renderWithRole(
    ui: ReactNode,
    role = 'training_manager',
    roles = ['training_manager'],
    permissions?: string[],
) {
    return render(
        <MemoryRouter>
            <SessionProvider apiOrigin="http://localhost:5000">
                <RoleSessionWrapper role={role} roles={roles} permissions={permissions}>
                    {ui}
                </RoleSessionWrapper>
            </SessionProvider>
        </MemoryRouter>,
    )
}

describe('SCRUM-220: Hoàn thiện phân công giảng viên và trợ giảng tại /classes/:classId/instructors', () => {
    // =========================================================================
    // 1. CHỌN VÀ THAY ĐỔI GIẢNG VIÊN CHÍNH
    // =========================================================================
    it('TC220-01: Chọn giảng viên chính A, sau đó đổi sang B: chỉ còn B là giảng viên chính', async () => {
        let savedPayload: unknown = null
        const mockRequest = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.includes('/instructors') && init?.method === 'POST') {
                savedPayload = JSON.parse(init.body as string)
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: {
                            class_id: sampleClass.id,
                            class_subject_id: sampleSubject1.id,
                            main_instructor: { id: trainerB.id, name: trainerB.name, email: trainerB.email },
                            assistants: [],
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        renderWithRole(
            <ClassSubjectInstructorAssignPage
                initialClass={sampleClass}
                initialSubject={sampleSubject1}
                initialInstructors={[trainerA, trainerB]}
                customRequest={mockRequest}
            />,
        )

        const selectMain = screen.getByTestId('main-instructor-select') as HTMLSelectElement

        // Chọn GV chính A
        fireEvent.change(selectMain, { target: { value: trainerA.id } })
        expect(selectMain.value).toBe(trainerA.id)

        // Đổi sang GV chính B
        fireEvent.change(selectMain, { target: { value: trainerB.id } })
        expect(selectMain.value).toBe(trainerB.id)

        // Click Lưu phân công
        fireEvent.click(screen.getByTestId('save-assignment-btn'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalled()
        })

        // Chỉ gửi B làm giảng viên chính
        expect(savedPayload).toEqual({
            main_instructor_id: trainerB.id,
            assistant_ids: [],
        })
    })

    // =========================================================================
    // 2. THÊM NHIỀU TRỢ GIẢNG KHÔNG TRÙNG LẶP
    // =========================================================================
    it('TC220-02: Thêm hai trợ giảng: lưu được cả hai, không trùng lặp', async () => {
        let savedPayload: unknown = null
        const mockRequest = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.includes('/instructors') && init?.method === 'POST') {
                savedPayload = JSON.parse(init.body as string)
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: {
                            class_id: sampleClass.id,
                            class_subject_id: sampleSubject1.id,
                            main_instructor: { id: trainerA.id, name: trainerA.name, email: trainerA.email },
                            assistants: [
                                { id: assistant1.id, name: assistant1.name, email: assistant1.email },
                                { id: assistant2.id, name: assistant2.name, email: assistant2.email },
                            ],
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        renderWithRole(
            <ClassSubjectInstructorAssignPage
                initialClass={sampleClass}
                initialSubject={sampleSubject1}
                initialInstructors={[trainerA, assistant1, assistant2]}
                customRequest={mockRequest}
            />,
        )

        // Chọn GV chính
        fireEvent.change(screen.getByTestId('main-instructor-select'), { target: { value: trainerA.id } })

        // Check 2 trợ giảng
        const checkbox1 = screen.getByTestId(`assistant-checkbox-${assistant1.id}`)
        const checkbox2 = screen.getByTestId(`assistant-checkbox-${assistant2.id}`)

        fireEvent.click(checkbox1)
        fireEvent.click(checkbox2)

        // Lưu phân công
        fireEvent.click(screen.getByTestId('save-assignment-btn'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalled()
        })

        expect(savedPayload).toEqual({
            main_instructor_id: trainerA.id,
            assistant_ids: [assistant1.id, assistant2.id],
        })
    })

    // =========================================================================
    // 3. LỌC TÀI KHOẢN ĐÚNG VAI TRÒ
    // =========================================================================
    it('TC220-03: Tài khoản sai vai trò (trainee, consultant) không xuất hiện trong dropdown và danh sách chọn', async () => {
        renderWithRole(
            <ClassSubjectInstructorAssignPage
                initialClass={sampleClass}
                initialSubject={sampleSubject1}
                initialInstructors={[trainerA, trainerB, assistant1, traineeUser, consultantUser]}
            />,
        )

        const selectMain = screen.getByTestId('main-instructor-select') as HTMLSelectElement
        const optionValues = Array.from(selectMain.options).map((o) => o.value)

        // Trainer A và Trainer B có trong dropdown
        expect(optionValues).toContain(String(trainerA.id))
        expect(optionValues).toContain(String(trainerB.id))

        // Trainee và Consultant KHÔNG có trong dropdown giảng viên chính
        expect(optionValues).not.toContain(String(traineeUser.id))
        expect(optionValues).not.toContain(String(consultantUser.id))

        // Checkbox trợ giảng: có assistant1 và trainerB, KHÔNG có trainee và consultant
        expect(screen.getByTestId(`assistant-checkbox-${assistant1.id}`)).toBeDefined()
        expect(screen.getByTestId(`assistant-checkbox-${trainerB.id}`)).toBeDefined()
        expect(screen.queryByTestId(`assistant-checkbox-${traineeUser.id}`)).toBeNull()
        expect(screen.queryByTestId(`assistant-checkbox-${consultantUser.id}`)).toBeNull()
    })

    // =========================================================================
    // 4. KIỂM TRA LỖI API & THÔNG BÁO TIẾNG VIỆT
    // =========================================================================
    it('TC220-04: API từ chối hoặc thất bại -> hiển thị thông báo lỗi tiếng Việt trên trang', async () => {
        const mockRequest = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.includes('/instructors') && init?.method === 'POST') {
                return new Response(
                    JSON.stringify({
                        status: 'error',
                        code: 'INVALID_INSTRUCTOR_ROLE',
                        message: 'Chỉ tài khoản có vai trò Giảng viên mới được phân công làm giảng viên chính.',
                    }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        renderWithRole(
            <ClassSubjectInstructorAssignPage
                initialClass={sampleClass}
                initialSubject={sampleSubject1}
                initialInstructors={[trainerA]}
                customRequest={mockRequest}
            />,
        )

        fireEvent.change(screen.getByTestId('main-instructor-select'), { target: { value: trainerA.id } })
        fireEvent.click(screen.getByTestId('save-assignment-btn'))

        await waitFor(() => {
            const errBanner = screen.getByTestId('assign-modal-error')
            expect(errBanner.textContent).toContain('Chỉ tài khoản có vai trò Giảng viên mới được phân công làm giảng viên chính.')
        })
    })

    // =========================================================================
    // 5. HIỂN THỊ HỌ TÊN NGƯỜI ĐƯỢC PHÂN CÔNG TẠI TAB GIẢNG VIÊN & LINK ĐẾN TRANG RIÊNG
    // =========================================================================
    it('TC220-05: Tab Giảng viên tại /classes/:classId/instructors hiển thị họ tên người được phân công và link phân công', async () => {
        const subjectWithInstructors: ClassSubjectItem = {
            ...sampleSubject1,
            main_instructor: {
                id: String(trainerA.id),
                name: trainerA.name,
                email: trainerA.email,
            },
            assistants: [
                {
                    id: String(assistant1.id),
                    name: assistant1.name,
                    email: assistant1.email,
                },
            ],
        }

        const mockRequest = vi.fn().mockImplementation(async (url: string) => {
            if (url.includes('/subjects')) {
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: [subjectWithInstructors],
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            if (url.includes('/classes/')) {
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: {
                            ...sampleClass,
                            subjects: [subjectWithInstructors],
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        vi.spyOn(globalThis, 'fetch').mockImplementation(mockRequest as unknown as typeof fetch)

        render(
            <MemoryRouter initialEntries={[`/classes/${sampleClass.id}/instructors`]}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin" roles={['admin']}>
                        <Routes>
                            <Route path="/classes/:classId/instructors" element={<ClassDetailPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        // Đợi dữ liệu load xong
        await waitFor(() => {
            expect(screen.getByTestId(`main-instructor-cell-${sampleSubject1.id}`)).toBeDefined()
        })

        // Hiển thị đúng họ tên giảng viên chính
        const mainCell = screen.getByTestId(`main-instructor-cell-${sampleSubject1.id}`)
        expect(mainCell.textContent).toContain(trainerA.name)
        expect(mainCell.textContent).toContain(trainerA.email)

        // Hiển thị đúng họ tên trợ giảng
        const astCell = screen.getByTestId(`assistants-cell-${sampleSubject1.id}`)
        expect(astCell.textContent).toContain(assistant1.name)
        expect(astCell.textContent).toContain(assistant1.email)

        // Nút chỉnh sửa phân công
        const assignBtn = screen.getByTestId(`assign-instructor-btn-${sampleSubject1.id}`) as HTMLAnchorElement
        expect(assignBtn.textContent).toContain('Chỉnh sửa phân công')
        expect(assignBtn.getAttribute('href')).toBe(`/classes/${sampleClass.id}/subjects/${sampleSubject1.id}/instructors`)

        // Nội dung hướng dẫn cũ không còn xuất hiện
        expect(screen.queryByText(/Phân công theo thời khóa biểu buổi học/i)).toBeNull()
        expect(screen.queryByText(/Giảng viên và trợ giảng được phân công trực tiếp khi lập lịch học/i)).toBeNull()
    })

    // =========================================================================
    // 6. PHÂN CÔNG MÔN NÀY KHÔNG ẢNH HƯỞNG MÔN KHÁC
    // =========================================================================
    it('TC220-06: Phân công môn này không làm thay đổi môn khác', async () => {
        const sub1Assigned: ClassSubjectItem = {
            ...sampleSubject1,
            main_instructor: { id: String(trainerA.id), name: trainerA.name, email: trainerA.email },
            assistants: [],
        }
        const sub2Assigned: ClassSubjectItem = {
            ...sampleSubject2,
            main_instructor: { id: String(trainerB.id), name: trainerB.name, email: trainerB.email },
            assistants: [{ id: String(assistant1.id), name: assistant1.name, email: assistant1.email }],
        }

        const mockRequest = vi.fn().mockImplementation(async (url: string) => {
            if (url.includes('/subjects')) {
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: [sub1Assigned, sub2Assigned],
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            if (url.includes('/classes/')) {
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: {
                            ...sampleClass,
                            subjects: [sub1Assigned, sub2Assigned],
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        vi.spyOn(globalThis, 'fetch').mockImplementation(mockRequest as unknown as typeof fetch)

        render(
            <MemoryRouter initialEntries={[`/classes/${sampleClass.id}/instructors`]}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin" roles={['admin']}>
                        <Routes>
                            <Route path="/classes/:classId/instructors" element={<ClassDetailPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        // Đợi dữ liệu load xong
        await waitFor(() => {
            expect(screen.getByTestId(`main-instructor-cell-${sampleSubject1.id}`)).toBeDefined()
            expect(screen.getByTestId(`main-instructor-cell-${sampleSubject2.id}`)).toBeDefined()
        })

        // Môn 1 chỉ có GV chính Trainer A, không có trợ giảng
        const sub1MainCell = screen.getByTestId(`main-instructor-cell-${sampleSubject1.id}`)
        expect(sub1MainCell.textContent).toContain(trainerA.name)
        expect(sub1MainCell.textContent).not.toContain(trainerB.name)
        const sub1AstCell = screen.getByTestId(`assistants-cell-${sampleSubject1.id}`)
        expect(sub1AstCell.textContent).toContain('Chưa có')

        // Môn 2 có GV chính Trainer B và Trợ giảng Assistant 1
        const sub2MainCell = screen.getByTestId(`main-instructor-cell-${sampleSubject2.id}`)
        expect(sub2MainCell.textContent).toContain(trainerB.name)
        expect(sub2MainCell.textContent).not.toContain(trainerA.name)
        const sub2AstCell = screen.getByTestId(`assistants-cell-${sampleSubject2.id}`)
        expect(sub2AstCell.textContent).toContain(assistant1.name)
    })

    // =========================================================================
    // 7. ĐĂNG NHẬP GIẢNG VIÊN ĐƯỢC PHÂN CÔNG: THẤY ĐÚNG LỚP
    // =========================================================================
    it('TC220-07: Đăng nhập giảng viên được phân công: thấy đúng lớp trong danh sách', async () => {
        const assignedClassA: TrainingClass = {
            ...sampleClass,
            id: 'cls-assigned-to-a',
            class_code: 'CNTT-A-01',
        }

        const mockRequest = vi.fn().mockImplementation(async (url: string) => {
            if (url.includes('/api/v1/classes')) {
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: {
                            items: [assignedClassA],
                            total: 1,
                            page: 1,
                            page_size: 50,
                            total_pages: 1,
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        renderWithRole(
            <ClassesPage
                initialClasses={[assignedClassA]}
                initialTotal={1}
                customRequest={mockRequest}
            />,
            'trainer',
            ['trainer'],
        )

        // Class A xuất hiện
        expect(await screen.findByTestId(`class-code-${assignedClassA.id}`)).toBeDefined()
        expect(screen.getByTestId(`class-code-${assignedClassA.id}`).textContent).toBe('CNTT-A-01')

        // Giảng viên không có nút "Mở lớp mới"
        expect(screen.queryByTestId('create-class-btn')).toBeNull()
    })

    // =========================================================================
    // 8. ĐĂNG NHẬP GIẢNG VIÊN KHÔNG ĐƯỢC PHÂN CÔNG: KHÔNG THẤY LỚP
    // =========================================================================
    it('TC220-08: Đăng nhập giảng viên không được phân công: không thấy lớp trong danh sách', async () => {
        const mockRequest = vi.fn().mockImplementation(async (url: string) => {
            if (url.includes('/api/v1/classes')) {
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: {
                            items: [],
                            total: 0,
                            page: 1,
                            page_size: 50,
                            total_pages: 0,
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        renderWithRole(
            <ClassesPage
                initialClasses={[]}
                initialTotal={0}
                customRequest={mockRequest}
            />,
            'trainer',
            ['trainer'],
        )

        // Không thấy lớp nào
        expect(await screen.findByTestId('empty-state')).toBeDefined()
        expect(screen.queryByTestId(`class-row-${sampleClass.id}`)).toBeNull()
    })
})
