// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { ClassesPage } from './ClassesPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { TrainingClass, ClassSubjectItem } from '../api/classApi'
import type { TrainingProgram } from '../api/trainingProgramApi'
import type { User } from '../api/userApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const sampleProgram: TrainingProgram = {
    id: 'prog-220-001',
    code: 'PROG-CNTT',
    name: 'Công nghệ thông tin',
    description: 'Chương trình đào tạo CNTT',
    duration_semesters: 8,
    standard_tuition_fee: 10000000,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
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
    subjects: [sampleSubject1],
    copied_subjects_count: 1,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
}

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

function RoleSessionWrapper({
    role,
    roles,
    children,
}: {
    role?: string | null
    roles?: string[]
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        if (role !== undefined) {
            startSession(
                { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
                role,
                `usr-${role}`,
                false,
                'Test User',
                `${role}@test.edu.vn`,
                roles ?? (role ? [role] : []),
            )
        }
    }, [role, roles, startSession])

    if (role !== undefined && !hasSession) {
        return <div>Initializing session...</div>
    }

    return <>{children}</>
}

function renderWithRole(
    ui: ReactNode,
    role = 'training_manager',
    roles: string[] = ['training_manager'],
) {
    return render(
        <MemoryRouter>
            <SessionProvider apiOrigin="http://localhost:5000">
                <RoleSessionWrapper role={role} roles={roles}>
                    {ui}
                </RoleSessionWrapper>
            </SessionProvider>
        </MemoryRouter>,
    )
}

describe('SCRUM-220: Phân công giảng viên và trợ giảng theo từng môn (TC220-01 -> TC220-10)', () => {
    // =========================================================================
    // 220-01: PHÂN CÔNG THEO TỪNG MÔN (TC220-01 -> TC220-04)
    // =========================================================================
    it('TC220-01: Chọn một môn -> gán được 1 giảng viên chính', async () => {
        const mockRequest = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.includes('/instructors') && init?.method === 'POST') {
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: {
                            class_id: sampleClass.id,
                            class_subject_id: sampleSubject1.id,
                            main_instructor: {
                                id: trainerA.id,
                                name: trainerA.name,
                                email: trainerA.email,
                                role: trainerA.role,
                            },
                            assistants: [],
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        renderWithRole(
            <ClassesPage
                initialClasses={[sampleClass]}
                initialPrograms={[sampleProgram]}
                initialInstructors={[trainerA, trainerB, assistant1]}
                customRequest={mockRequest}
            />,
        )

        // 1. Mở modal chi tiết môn học lớp
        const detailBtn = screen.getByTestId(`view-class-${sampleClass.id}`)
        fireEvent.click(detailBtn)
        expect(await screen.findByTestId('class-detail-modal')).toBeDefined()

        // 2. Click "Phân công giảng viên" cho môn CS101
        const assignBtn = screen.getByTestId(`assign-instructor-btn-${sampleSubject1.id}`)
        fireEvent.click(assignBtn)
        expect(await screen.findByTestId('assign-instructor-modal')).toBeDefined()

        // 3. Chọn giảng viên chính: Trainer A
        const selectMain = screen.getByTestId('main-instructor-select')
        fireEvent.change(selectMain, { target: { value: trainerA.id } })

        // 4. Lưu phân công
        const saveBtn = screen.getByTestId('save-assignment-btn')
        fireEvent.click(saveBtn)

        // 5. Kiểm tra call API đúng payload
        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                expect.stringContaining(`/api/v1/classes/${sampleClass.id}/subjects/${sampleSubject1.id}/instructors`),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        main_instructor_id: trainerA.id,
                        assistant_ids: [],
                    }),
                }),
            )
        })

        // 6. Tên giảng viên chính cập nhật trên bảng môn học
        await waitFor(() => {
            const cell = screen.getByTestId(`main-instructor-${sampleSubject1.id}`)
            expect(cell.textContent).toContain(trainerA.name)
        })
    })

    it('TC220-02: Gán nhiều trợ giảng -> lưu được nhiều người', async () => {
        const mockRequest = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.includes('/instructors') && init?.method === 'POST') {
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: {
                            class_id: sampleClass.id,
                            class_subject_id: sampleSubject1.id,
                            main_instructor: {
                                id: trainerA.id,
                                name: trainerA.name,
                                email: trainerA.email,
                                role: trainerA.role,
                            },
                            assistants: [
                                { id: assistant1.id, name: assistant1.name, email: assistant1.email, role: 'trainer' },
                                { id: assistant2.id, name: assistant2.name, email: assistant2.email, role: 'trainer' },
                            ],
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        renderWithRole(
            <ClassesPage
                initialClasses={[sampleClass]}
                initialPrograms={[sampleProgram]}
                initialInstructors={[trainerA, assistant1, assistant2]}
                customRequest={mockRequest}
            />,
        )

        fireEvent.click(screen.getByTestId(`view-class-${sampleClass.id}`))
        fireEvent.click(await screen.findByTestId(`assign-instructor-btn-${sampleSubject1.id}`))

        // Chọn GV chính
        fireEvent.change(screen.getByTestId('main-instructor-select'), { target: { value: trainerA.id } })

        // Check chọn 2 trợ giảng
        fireEvent.click(screen.getByTestId(`assistant-checkbox-${assistant1.id}`))
        fireEvent.click(screen.getByTestId(`assistant-checkbox-${assistant2.id}`))

        fireEvent.click(screen.getByTestId('save-assignment-btn'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                expect.stringContaining(`/api/v1/classes/${sampleClass.id}/subjects/${sampleSubject1.id}/instructors`),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        main_instructor_id: trainerA.id,
                        assistant_ids: [assistant1.id, assistant2.id],
                    }),
                }),
            )
        })

        await waitFor(() => {
            const cell = screen.getByTestId(`assistants-${sampleSubject1.id}`)
            expect(cell.textContent).toContain(assistant1.name)
            expect(cell.textContent).toContain(assistant2.name)
        })
    })

    it('TC220-03: Reload/fetch -> assignment persist đúng', async () => {
        const classWithInstructors: TrainingClass = {
            ...sampleClass,
            subjects: [
                {
                    ...sampleSubject1,
                    main_instructor: {
                        id: String(trainerA.id),
                        name: trainerA.name,
                        email: trainerA.email,
                        role: 'trainer',
                    },
                    assistants: [
                        { id: String(assistant1.id), name: assistant1.name, email: assistant1.email, role: 'trainer' },
                    ],
                },
            ],
        }

        renderWithRole(
            <ClassesPage
                initialClasses={[classWithInstructors]}
                initialPrograms={[sampleProgram]}
                initialInstructors={[trainerA, assistant1]}
            />,
        )

        fireEvent.click(screen.getByTestId(`view-class-${sampleClass.id}`))
        expect(await screen.findByTestId('class-detail-modal')).toBeDefined()

        const mainCell = screen.getByTestId(`main-instructor-${sampleSubject1.id}`)
        expect(mainCell.textContent).toContain(trainerA.name)

        const asstCell = screen.getByTestId(`assistants-${sampleSubject1.id}`)
        expect(asstCell.textContent).toContain(assistant1.name)
    })

    it('TC220-04: Đổi giảng viên chính -> môn chỉ còn đúng 1 main instructor mới', async () => {
        const mockRequest = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
            if (url.includes('/instructors') && init?.method === 'POST') {
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: {
                            class_id: sampleClass.id,
                            class_subject_id: sampleSubject1.id,
                            main_instructor: {
                                id: trainerB.id,
                                name: trainerB.name,
                                email: trainerB.email,
                                role: trainerB.role,
                            },
                            assistants: [],
                        },
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                )
            }
            return new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 })
        })

        const classWithTrainerA: TrainingClass = {
            ...sampleClass,
            subjects: [
                {
                    ...sampleSubject1,
                    main_instructor: {
                        id: String(trainerA.id),
                        name: trainerA.name,
                        email: trainerA.email,
                        role: 'trainer',
                    },
                    assistants: [],
                },
            ],
        }

        renderWithRole(
            <ClassesPage
                initialClasses={[classWithTrainerA]}
                initialPrograms={[sampleProgram]}
                initialInstructors={[trainerA, trainerB]}
                customRequest={mockRequest}
            />,
        )

        fireEvent.click(screen.getByTestId(`view-class-${sampleClass.id}`))
        fireEvent.click(await screen.findByTestId(`assign-instructor-btn-${sampleSubject1.id}`))

        // Đổi từ Trainer A sang Trainer B
        fireEvent.change(screen.getByTestId('main-instructor-select'), { target: { value: trainerB.id } })
        fireEvent.click(screen.getByTestId('save-assignment-btn'))

        await waitFor(() => {
            const mainCell = screen.getByTestId(`main-instructor-${sampleSubject1.id}`)
            expect(mainCell.textContent).toContain(trainerB.name)
            expect(mainCell.textContent).not.toContain(trainerA.name)
        })
    })
    // =========================================================================
    // 220-02: LỌC TÀI KHOẢN THEO VAI TRÒ & BACKEND VALIDATION (TC220-05 -> TC220-07)
    // =========================================================================
    it('TC220-05: Dropdown giảng viên chính chỉ hiển thị tài khoản có role trainer', async () => {
        renderWithRole(
            <ClassesPage
                initialClasses={[sampleClass]}
                initialPrograms={[sampleProgram]}
                // Danh sách gồm trainer, trainee và consultant
                initialInstructors={[trainerA, trainerB, traineeUser, consultantUser]}
            />,
        )

        fireEvent.click(screen.getByTestId(`view-class-${sampleClass.id}`))
        fireEvent.click(await screen.findByTestId(`assign-instructor-btn-${sampleSubject1.id}`))

        const selectMain = screen.getByTestId('main-instructor-select') as HTMLSelectElement
        const optionValues = Array.from(selectMain.options).map((o) => o.value)

        // Trainer A và Trainer B có trong dropdown
        expect(optionValues).toContain(String(trainerA.id))
        expect(optionValues).toContain(String(trainerB.id))

        // Trainee và Consultant KHÔNG có trong dropdown
        expect(optionValues).not.toContain(String(traineeUser.id))
        expect(optionValues).not.toContain(String(consultantUser.id))
    })

    it('TC220-06: Danh sách chọn trợ giảng chỉ hiển thị tài khoản đúng vai trò', async () => {
        renderWithRole(
            <ClassesPage
                initialClasses={[sampleClass]}
                initialPrograms={[sampleProgram]}
                initialInstructors={[trainerA, trainerB, assistant1, traineeUser, consultantUser]}
            />,
        )

        fireEvent.click(screen.getByTestId(`view-class-${sampleClass.id}`))
        fireEvent.click(await screen.findByTestId(`assign-instructor-btn-${sampleSubject1.id}`))

        // Các checkbox trợ giảng
        expect(screen.getByTestId(`assistant-checkbox-${assistant1.id}`)).toBeDefined()
        expect(screen.getByTestId(`assistant-checkbox-${trainerB.id}`)).toBeDefined()

        // Trainee và Consultant KHÔNG có checkbox
        expect(screen.queryByTestId(`assistant-checkbox-${traineeUser.id}`)).toBeNull()
        expect(screen.queryByTestId(`assistant-checkbox-${consultantUser.id}`)).toBeNull()
    })

    it('TC220-07: Call API với user sai role -> backend từ chối và frontend hiển thị lỗi tiếng Việt', async () => {
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
            <ClassesPage
                initialClasses={[sampleClass]}
                initialPrograms={[sampleProgram]}
                initialInstructors={[trainerA]}
                customRequest={mockRequest}
            />,
        )

        fireEvent.click(screen.getByTestId(`view-class-${sampleClass.id}`))
        fireEvent.click(await screen.findByTestId(`assign-instructor-btn-${sampleSubject1.id}`))

        fireEvent.change(screen.getByTestId('main-instructor-select'), { target: { value: trainerA.id } })
        fireEvent.click(screen.getByTestId('save-assignment-btn'))

        // Bắt thông báo lỗi tiếng Việt hiển thị trên modal
        await waitFor(() => {
            const errBanner = screen.getByTestId('assign-modal-error')
            expect(errBanner.textContent).toContain('Chỉ tài khoản có vai trò Giảng viên mới được phân công làm giảng viên chính.')
        })
    })
    // =========================================================================
    // 220-03: GIẢNG VIÊN THẤY LỚP CỦA MÌNH & SCOPE CLASS LIST (TC220-08 -> TC220-10)
    // =========================================================================
    it('TC220-08: Giảng viên A đăng nhập -> chỉ thấy các lớp được phân công', async () => {
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

        // Login as trainer
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

    it('TC220-09: Giảng viên B không được phân công -> không thấy lớp Class A', async () => {
        // Mock API trả về danh sách rỗng cho trainer B
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

    it('TC220-10: Gỡ assignment -> cập nhật danh sách lớp của giảng viên', async () => {
        let trainerClasses: TrainingClass[] = [sampleClass]

        const mockRequest = vi.fn().mockImplementation(async (url: string) => {
            if (url.includes('/api/v1/classes')) {
                return new Response(
                    JSON.stringify({
                        status: 'success',
                        data: {
                            items: trainerClasses,
                            total: trainerClasses.length,
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

        const { rerender } = renderWithRole(
            <ClassesPage
                initialClasses={trainerClasses}
                initialTotal={1}
                customRequest={mockRequest}
            />,
            'trainer',
            ['trainer'],
        )

        expect(screen.getByTestId(`class-code-${sampleClass.id}`)).toBeDefined()

        // Gỡ assignment -> danh sách của trainer trở thành rỗng
        trainerClasses = []
        rerender(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainer" roles={['trainer']}>
                        <ClassesPage
                            initialClasses={[]}
                            initialTotal={0}
                            customRequest={mockRequest}
                        />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.queryByTestId(`class-code-${sampleClass.id}`)).toBeNull()
        expect(screen.getByTestId('empty-state')).toBeDefined()
    })
})
