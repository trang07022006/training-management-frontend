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
})
