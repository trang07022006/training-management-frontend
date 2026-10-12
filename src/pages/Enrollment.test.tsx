// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { ClassesPage } from './ClassesPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { TrainingClass } from '../api/classApi'
import type { Student } from '../api/studentApi'
import type { EnrollmentItem } from '../api/enrollmentApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const sampleClass: TrainingClass = {
    id: 'cls-001',
    class_code: 'CNTT-K21A',
    program_id: 'prog-001',
    program_code: 'PROG-CNTT',
    program_name: 'Công nghệ thông tin',
    expected_start_date: '2026-06-01',
    max_capacity: 3,
    learning_mode: 'offline',
    status: 'preparing',
    status_label: 'Chuẩn bị',
    enrolled_count: 1,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
}

const sampleFullClass: TrainingClass = {
    id: 'cls-full',
    class_code: 'CNTT-FULL',
    program_id: 'prog-001',
    program_code: 'PROG-CNTT',
    program_name: 'Công nghệ thông tin',
    expected_start_date: '2026-06-01',
    max_capacity: 2,
    learning_mode: 'offline',
    status: 'preparing',
    status_label: 'Chuẩn bị',
    enrolled_count: 2,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
}

const sampleStudents: Student[] = [
    {
        id: 'st-01',
        student_code: 'HV001',
        full_name: 'Nguyễn Văn A',
        phone: '0988111222',
        email: 'vana@example.com',
        program_id: 'prog-001',
        user_id: 'u-01',
        lead_id: 'l-01',
        status: 'enrolled',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    },
    {
        id: 'st-02',
        student_code: 'HV002',
        full_name: 'Trần Thị B',
        phone: '0988333444',
        email: 'thib@example.com',
        program_id: 'prog-001',
        user_id: 'u-02',
        lead_id: 'l-02',
        status: 'enrolled',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    },
    {
        id: 'st-03',
        student_code: 'HV003',
        full_name: 'Lê Văn C',
        phone: '0988555666',
        email: 'vanc@example.com',
        program_id: 'prog-001',
        user_id: 'u-03',
        lead_id: 'l-03',
        status: 'enrolled',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    },
]

const sampleRosterItems: EnrollmentItem[] = [
    {
        id: 'enr-01',
        class_id: 'cls-001',
        student_id: 'st-01',
        status: 'enrolled',
        enrolled_at: '2026-05-10T08:30:00Z',
        enrolled_by: 'admin-id',
        student_code: 'HV001',
        full_name: 'Nguyễn Văn A',
        phone: '0988111222',
        email: 'vana@example.com',
        enrolled_by_name: 'Quản trị viên Hệ thống',
        enrolled_by_email: 'admin@ictu.edu.vn',
        class_code: 'CNTT-K21A',
    },
]

function RoleSessionWrapper({
    role = 'admin',
    permissions = ['course.manage', 'course.view'],
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
    const { role = 'admin', permissions = ['course.manage', 'course.view'] } = options

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

describe('SCRUM-218: Ghi danh học viên vào lớp (TC218-01 -> TC218-10)', () => {
    // =========================================================================
    // Sub-task 218-01: Ghi danh đơn lẻ và hàng loạt
    // =========================================================================

    it('TC218-01: Mở modal ghi danh và ghi danh một học viên đơn lẻ thành công', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string, options?: RequestInit) => {
            if (path.includes('/enrollments') && (!options || options.method === 'GET')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 'success', data: { class: sampleClass, items: sampleRosterItems, total: 1 } }),
                })
            }
            if (path.includes('/enrollments') && options?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'success',
                            code: 'ENROLLMENT_SUCCESS',
                            message: 'Ghi danh thành công',
                            data: {
                                class_id: sampleClass.id,
                                class_code: sampleClass.class_code,
                                enrolled_count: 1,
                                total_enrolled: 2,
                                max_capacity: 3,
                                items: [
                                    {
                                        id: 'enr-new-1',
                                        class_id: sampleClass.id,
                                        student_id: 'st-02',
                                        status: 'enrolled',
                                        enrolled_at: '2026-05-12T10:00:00Z',
                                        enrolled_by: 'admin-id',
                                    },
                                ],
                            },
                        }),
                })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'success', data: {} }) })
        })

        renderWithSession(
            <ClassesPage
                initialClasses={[sampleClass]}
                initialStudents={sampleStudents}
                customRequest={mockRequest}
                canManageOverride={true}
            />,
        )

        // 1. Nhấn nút Ghi danh
        const enrollBtn = screen.getByTestId(`enroll-class-${sampleClass.id}`)
        fireEvent.click(enrollBtn)

        // 2. Modal ghi danh hiển thị
        await waitFor(() => {
            expect(screen.getByTestId('enroll-modal')).toBeDefined()
        })

        // 3. Chọn học viên st-02 (HV002)
        const checkSt2 = screen.getByTestId('student-checkbox-st-02')
        fireEvent.click(checkSt2)

        expect(screen.getByTestId('selected-count').textContent).toBe('1')

        // 4. Submit ghi danh
        const confirmBtn = screen.getByTestId('confirm-enroll-btn') as HTMLButtonElement
        expect(confirmBtn.disabled).toBe(false)
        fireEvent.click(confirmBtn)

        // 5. Kiểm tra request POST được gửi đúng
        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/classes/${sampleClass.id}/enrollments`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ student_ids: ['st-02'] }),
                }),
            )
        })

        // 6. Hiển thị thông báo thành công và cập nhật sĩ số
        await waitFor(() => {
            expect(screen.getByTestId('success-alert')).toBeDefined()
            expect(screen.getByTestId(`class-capacity-${sampleClass.id}`).textContent).toContain('2 / 3')
        })
    })

    it('TC218-02: Ghi danh hàng loạt nhiều học viên vào lớp học thành công', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string, options?: RequestInit) => {
            if (path.includes('/enrollments') && (!options || options.method === 'GET')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 'success', data: { class: sampleClass, items: [], total: 0 } }),
                })
            }
            if (path.includes('/enrollments') && options?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'success',
                            code: 'ENROLLMENT_SUCCESS',
                            data: {
                                class_id: sampleClass.id,
                                class_code: sampleClass.class_code,
                                enrolled_count: 2,
                                total_enrolled: 2,
                                max_capacity: 3,
                                items: [],
                            },
                        }),
                })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'success', data: {} }) })
        })

        renderWithSession(
            <ClassesPage
                initialClasses={[{ ...sampleClass, enrolled_count: 0 }]}
                initialStudents={sampleStudents}
                customRequest={mockRequest}
                canManageOverride={true}
            />,
        )

        fireEvent.click(screen.getByTestId(`enroll-class-${sampleClass.id}`))

        await waitFor(() => {
            expect(screen.getByTestId('enroll-modal')).toBeDefined()
        })

        // Chọn cả st-01 và st-02
        fireEvent.click(screen.getByTestId('student-checkbox-st-01'))
        fireEvent.click(screen.getByTestId('student-checkbox-st-02'))

        expect(screen.getByTestId('selected-count').textContent).toBe('2')

        fireEvent.click(screen.getByTestId('confirm-enroll-btn'))

        await waitFor(() => {
            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/classes/${sampleClass.id}/enrollments`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ student_ids: ['st-01', 'st-02'] }),
                }),
            )
        })

        await waitFor(() => {
            expect(screen.getByTestId('success-alert')).toBeDefined()
        })
    })

    it('TC218-03: Xem danh sách học viên trong lớp (Roster Modal) hiển thị đầy đủ thông tin', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/enrollments')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'success',
                            data: {
                                class: sampleClass,
                                items: sampleRosterItems,
                                total: 1,
                            },
                        }),
                })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'success', data: {} }) })
        })

        renderWithSession(
            <ClassesPage
                initialClasses={[sampleClass]}
                customRequest={mockRequest}
            />,
        )

        // Nhấn nút xem danh sách lớp
        const rosterBtn = screen.getByTestId(`roster-class-${sampleClass.id}`)
        fireEvent.click(rosterBtn)

        await waitFor(() => {
            expect(screen.getByTestId('roster-modal')).toBeDefined()
            expect(screen.getByTestId('roster-table')).toBeDefined()
        })

        // Kiểm tra thông tin học viên trong bảng roster
        expect(screen.getByTestId('roster-student-code-enr-01').textContent).toContain('HV001')
        expect(screen.getByTestId('roster-student-name-enr-01').textContent).toContain('Nguyễn Văn A')
        expect(screen.getByTestId('roster-enrolled-by-enr-01').textContent).toContain('Quản trị viên Hệ thống')
    })

    // =========================================================================
    // Sub-task 218-02: Chặn lớp đầy và ghi danh trùng
    // =========================================================================

    it('TC218-04: Hiển thị cảnh báo khi lớp học đã đầy sĩ số tối đa và vô hiệu hoá nút ghi danh', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/enrollments')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'success',
                            data: { class: sampleFullClass, items: [], total: 2 },
                        }),
                })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'success', data: {} }) })
        })

        renderWithSession(
            <ClassesPage
                initialClasses={[sampleFullClass]}
                initialStudents={sampleStudents}
                customRequest={mockRequest}
                canManageOverride={true}
            />,
        )

        fireEvent.click(screen.getByTestId(`enroll-class-${sampleFullClass.id}`))

        await waitFor(() => {
            expect(screen.getByTestId('enroll-modal')).toBeDefined()
            expect(screen.getByTestId('class-full-banner')).toBeDefined()
            expect((screen.getByTestId('confirm-enroll-btn') as HTMLButtonElement).disabled).toBe(true)
        })
    })

    it('TC218-05: Cảnh báo khi số lượng học viên chọn vượt quá sĩ số còn lại của lớp', async () => {
        const almostFullClass = { ...sampleClass, enrolled_count: 2, max_capacity: 3 }

        const mockRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/enrollments')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 'success', data: { class: almostFullClass, items: [], total: 2 } }),
                })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'success', data: {} }) })
        })

        renderWithSession(
            <ClassesPage
                initialClasses={[almostFullClass]}
                initialStudents={sampleStudents}
                customRequest={mockRequest}
                canManageOverride={true}
            />,
        )

        fireEvent.click(screen.getByTestId(`enroll-class-${almostFullClass.id}`))

        await waitFor(() => {
            expect(screen.getByTestId('enroll-modal')).toBeDefined()
        })

        // Chọn 2 học viên (vượt quá 1 chỗ còn lại)
        fireEvent.click(screen.getByTestId('student-checkbox-st-01'))
        fireEvent.click(screen.getByTestId('student-checkbox-st-02'))

        // Phải hiển thị warning vượt quá sĩ số
        expect(screen.getByTestId('capacity-exceeded-warning')).toBeDefined()
    })

    it('TC218-06: Đánh dấu học viên đã có trong lớp với badge "Đã có trong lớp" và vô hiệu hoá checkbox', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/enrollments')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'success',
                            data: { class: sampleClass, items: [{ student_id: 'st-01' }], total: 1 },
                        }),
                })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'success', data: {} }) })
        })

        renderWithSession(
            <ClassesPage
                initialClasses={[sampleClass]}
                initialStudents={sampleStudents}
                customRequest={mockRequest}
                canManageOverride={true}
            />,
        )

        fireEvent.click(screen.getByTestId(`enroll-class-${sampleClass.id}`))

        await waitFor(() => {
            expect(screen.getByTestId('already-enrolled-st-01')).toBeDefined()
            expect((screen.getByTestId('student-checkbox-st-01') as HTMLInputElement).disabled).toBe(true)
            // st-02 chưa có trong lớp thì không bị disabled
            expect((screen.getByTestId('student-checkbox-st-02') as HTMLInputElement).disabled).toBe(false)
        })
    })

    it('TC218-07: Hiển thị thông báo lỗi từ server khi ghi danh thất bại (CLASS_CAPACITY_FULL)', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string, options?: RequestInit) => {
            if (path.includes('/enrollments') && options?.method === 'POST') {
                return Promise.resolve({
                    ok: false,
                    status: 400,
                    json: () =>
                        Promise.resolve({
                            status: 'error',
                            code: 'CLASS_CAPACITY_FULL',
                            message: 'Lớp học đã đủ số lượng học viên tối đa.',
                        }),
                })
            }
            if (path.includes('/enrollments') && (!options || options.method === 'GET')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 'success', data: { class: sampleClass, items: [], total: 1 } }),
                })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'success', data: {} }) })
        })

        renderWithSession(
            <ClassesPage
                initialClasses={[sampleClass]}
                initialStudents={sampleStudents}
                customRequest={mockRequest}
                canManageOverride={true}
            />,
        )

        fireEvent.click(screen.getByTestId(`enroll-class-${sampleClass.id}`))

        await waitFor(() => {
            expect(screen.getByTestId('enroll-modal')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('student-checkbox-st-02'))
        fireEvent.click(screen.getByTestId('confirm-enroll-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('enroll-error-alert')).toBeDefined()
            expect(screen.getByTestId('enroll-error-alert').textContent).toContain('Lớp học đã đủ số lượng học viên tối đa.')
        })
    })

    // =========================================================================
    // Sub-task 218-03: Ngày ghi danh và người thực hiện
    // =========================================================================

    it('TC218-08: Roster hiển thị ngày ghi danh và người thực hiện rõ ràng', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/enrollments')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'success',
                            data: {
                                class: sampleClass,
                                items: sampleRosterItems,
                                total: 1,
                            },
                        }),
                })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'success', data: {} }) })
        })

        renderWithSession(
            <ClassesPage
                initialClasses={[sampleClass]}
                customRequest={mockRequest}
            />,
        )

        fireEvent.click(screen.getByTestId(`roster-class-${sampleClass.id}`))

        await waitFor(() => {
            expect(screen.getByTestId('roster-modal')).toBeDefined()
        })

        expect(screen.getByTestId('roster-enrolled-at-enr-01').textContent).not.toBe('-')
        expect(screen.getByTestId('roster-enrolled-by-enr-01').textContent).toContain('Quản trị viên Hệ thống')
    })

    it('TC218-09: Roster hiển thị trạng thái rỗng khi lớp chưa có học viên nào', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/enrollments')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            status: 'success',
                            data: {
                                class: sampleClass,
                                items: [],
                                total: 0,
                            },
                        }),
                })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'success', data: {} }) })
        })

        renderWithSession(
            <ClassesPage
                initialClasses={[sampleClass]}
                customRequest={mockRequest}
            />,
        )

        fireEvent.click(screen.getByTestId(`roster-class-${sampleClass.id}`))

        await waitFor(() => {
            expect(screen.getByTestId('empty-roster-state')).toBeDefined()
            expect(screen.getByTestId('empty-roster-state').textContent).toContain('Chưa có học viên nào được ghi danh vào lớp này.')
        })
    })

    it('TC218-10: Tìm kiếm học viên trong modal ghi danh theo mã hoặc tên', async () => {
        const mockRequest = vi.fn().mockImplementation((path: string) => {
            if (path.includes('/enrollments')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 'success', data: { class: sampleClass, items: [], total: 0 } }),
                })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'success', data: {} }) })
        })

        renderWithSession(
            <ClassesPage
                initialClasses={[sampleClass]}
                initialStudents={sampleStudents}
                customRequest={mockRequest}
                canManageOverride={true}
            />,
        )

        fireEvent.click(screen.getByTestId(`enroll-class-${sampleClass.id}`))

        await waitFor(() => {
            expect(screen.getByTestId('enroll-modal')).toBeDefined()
        })

        // Tìm kiếm 'HV002'
        const searchInput = screen.getByTestId('student-search-input')
        fireEvent.change(searchInput, { target: { value: 'HV002' } })

        // Chỉ hiển thị st-02, st-01 và st-03 bị ẩn
        expect(screen.getByTestId('student-item-st-02')).toBeDefined()
        expect(screen.queryByTestId('student-item-st-01')).toBeNull()
        expect(screen.queryByTestId('student-item-st-03')).toBeNull()
    })

    // =========================================================================
    // TC218-UI-01 -> TC218-UI-05: Manual UAT Integration Verification
    // =========================================================================

    describe('SCRUM-218 UAT Action Visibility & Regression (TC218-UI-01 -> TC218-UI-05)', () => {
        const testPreparingClass: TrainingClass = {
            id: 'cls-uat-01',
            class_code: 'CNTT-K24A',
            program_id: 'prog-001',
            program_code: 'PROG-CNTT',
            program_name: 'Công nghệ thông tin',
            expected_start_date: '2026-09-01',
            max_capacity: 30,
            learning_mode: 'offline',
            status: 'preparing',
            status_label: 'Chuẩn bị',
            enrolled_count: 0,
            subjects: [
                {
                    id: 'sub-uat-1',
                    class_id: 'cls-uat-01',
                    subject_id: 's-01',
                    subject_code: 'IT101',
                    subject_name: 'Tin học đại cương',
                    credits: 3,
                    semester: 1,
                    is_mandatory: true,
                    order_index: 1,
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                },
            ],
            created_at: '2026-05-01T00:00:00Z',
            updated_at: '2026-05-01T00:00:00Z',
        }

        it('TC218-UI-01: Mở /classes - thấy action Ghi danh, Môn học lớp, Danh sách lớp ở lớp Chuẩn bị 0/30', async () => {
            renderWithSession(
                <ClassesPage
                    initialClasses={[testPreparingClass]}
                    initialStudents={sampleStudents}
                    canManageOverride={true}
                />,
            )

            // Cột Thao tác phải có tối thiểu: [Môn học lớp], [Ghi danh], [Danh sách lớp]
            expect(screen.getByTestId(`view-class-${testPreparingClass.id}`)).toBeDefined()
            expect(screen.getByTestId(`view-class-${testPreparingClass.id}`).textContent).toBe('Môn học lớp')

            expect(screen.getByTestId(`enroll-class-${testPreparingClass.id}`)).toBeDefined()
            expect(screen.getByTestId(`enroll-class-${testPreparingClass.id}`).textContent).toBe('Ghi danh')

            expect(screen.getByTestId(`roster-class-${testPreparingClass.id}`)).toBeDefined()
            expect(screen.getByTestId(`roster-class-${testPreparingClass.id}`).textContent).toBe('Danh sách lớp')

            // Sĩ số 0 / 30 hiển thị đúng
            expect(screen.getByTestId(`class-capacity-${testPreparingClass.id}`).textContent).toContain('0 / 30')
        })

        it('TC218-UI-02: Bấm Ghi danh - modal mở', async () => {
            renderWithSession(
                <ClassesPage
                    initialClasses={[testPreparingClass]}
                    initialStudents={sampleStudents}
                    canManageOverride={true}
                />,
            )

            const enrollBtn = screen.getByTestId(`enroll-class-${testPreparingClass.id}`)
            fireEvent.click(enrollBtn)

            await waitFor(() => {
                expect(screen.getByTestId('enroll-modal')).toBeDefined()
                expect(screen.getByText(`Ghi danh học viên - Lớp ${testPreparingClass.class_code}`)).toBeDefined()
            })
        })

        it('TC218-UI-03: Modal hiển thị Student thật, có thể chọn 1 hoặc nhiều học viên', async () => {
            renderWithSession(
                <ClassesPage
                    initialClasses={[testPreparingClass]}
                    initialStudents={sampleStudents}
                    canManageOverride={true}
                />,
            )

            fireEvent.click(screen.getByTestId(`enroll-class-${testPreparingClass.id}`))

            await waitFor(() => {
                expect(screen.getByTestId('enroll-modal')).toBeDefined()
            })

            // Hiển thị các Student thật
            expect(screen.getByText(/Nguyễn Văn A/)).toBeDefined()
            expect(screen.getByText(/Trần Thị B/)).toBeDefined()
            expect(screen.getByText(/Lê Văn C/)).toBeDefined()

            // Chọn 1 học viên
            fireEvent.click(screen.getByTestId('student-checkbox-st-01'))
            expect(screen.getByTestId('selected-count').textContent).toBe('1')

            // Chọn thêm học viên thứ 2
            fireEvent.click(screen.getByTestId('student-checkbox-st-02'))
            expect(screen.getByTestId('selected-count').textContent).toBe('2')
        })

        it('TC218-UI-04: Bấm Danh sách lớp - roster mở', async () => {
            const mockRequest = vi.fn().mockImplementation((path: string) => {
                if (path.includes('/enrollments')) {
                    return Promise.resolve({
                        ok: true,
                        json: () =>
                            Promise.resolve({
                                status: 'success',
                                data: {
                                    class: testPreparingClass,
                                    items: sampleRosterItems,
                                    total: 1,
                                },
                            }),
                    })
                }
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'success', data: {} }) })
            })

            renderWithSession(
                <ClassesPage
                    initialClasses={[testPreparingClass]}
                    customRequest={mockRequest}
                    canManageOverride={true}
                />,
            )

            const rosterBtn = screen.getByTestId(`roster-class-${testPreparingClass.id}`)
            fireEvent.click(rosterBtn)

            await waitFor(() => {
                expect(screen.getByTestId('roster-modal')).toBeDefined()
                expect(screen.getByTestId('roster-table')).toBeDefined()
                expect(screen.getByText('HV001')).toBeDefined()
            })
        })

        it('TC218-UI-05: SCRUM-217 regression - Môn học lớp, lifecycle, tạo lớp vẫn hoạt động', async () => {
            const mockRequest = vi.fn().mockImplementation((path: string, options?: RequestInit) => {
                if (path.includes('/status') && options?.method === 'PUT') {
                    return Promise.resolve({
                        ok: true,
                        json: () =>
                            Promise.resolve({
                                status: 'success',
                                data: {
                                    ...testPreparingClass,
                                    status: 'in_progress',
                                    status_label: 'Đang học',
                                },
                            }),
                    })
                }
                if (path === '/api/v1/classes' && options?.method === 'POST') {
                    return Promise.resolve({
                        ok: true,
                        json: () =>
                            Promise.resolve({
                                status: 'success',
                                data: {
                                    id: 'cls-created-new',
                                    class_code: 'CNTT-NEW',
                                    program_id: 'prog-001',
                                    program_name: 'Công nghệ thông tin',
                                    status: 'preparing',
                                    status_label: 'Chuẩn bị',
                                    enrolled_count: 0,
                                    max_capacity: 30,
                                    copied_subjects_count: 1,
                                },
                            }),
                    })
                }
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'success', data: {} }) })
            })

            renderWithSession(
                <ClassesPage
                    initialClasses={[testPreparingClass]}
                    initialPrograms={[{ id: 'prog-001', code: 'PROG-CNTT', name: 'CNTT', description: 'Chương trình CNTT', duration_semesters: 8, standard_tuition_fee: 10000000, status: 'active', created_at: '', updated_at: '' }]}
                    customRequest={mockRequest}
                    canManageOverride={true}
                />,
            )

            // 1. Môn học lớp vẫn mở modal chi tiết
            fireEvent.click(screen.getByTestId(`view-class-${testPreparingClass.id}`))
            await waitFor(() => {
                expect(screen.getByTestId('class-detail-modal')).toBeDefined()
                expect(screen.getByText('Tin học đại cương')).toBeDefined()
            })
            fireEvent.click(screen.getByTestId('close-detail-modal-btn'))

            // 2. Lifecycle vẫn hoạt động
            const statusSelect = screen.getByTestId(`status-select-${testPreparingClass.id}`)
            fireEvent.change(statusSelect, { target: { value: 'in_progress' } })
            await waitFor(() => {
                expect(screen.getByTestId('success-alert')).toBeDefined()
            })

            // 3. Tạo lớp vẫn mở modal và hoạt động
            fireEvent.click(screen.getByTestId('create-class-btn'))
            expect(screen.getByTestId('create-class-modal')).toBeDefined()
            fireEvent.change(screen.getByTestId('class-code-input'), { target: { value: 'CNTT-NEW' } })
            fireEvent.click(screen.getByTestId('submit-class-btn'))
            await waitFor(() => {
                expect(screen.getByTestId('success-alert').textContent).toContain("Mở lớp học 'CNTT-NEW' thành công")
            })
        })
    })
})
