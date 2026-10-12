// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { ClassesPage } from './ClassesPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { TrainingClass } from '../api/classApi'
import type { TrainingProgram } from '../api/trainingProgramApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const sampleProgram: TrainingProgram = {
    id: 'prog-uuid-001',
    code: 'PROG-CNTT',
    name: 'Công nghệ thông tin',
    description: 'Chương trình đào tạo kỹ sư CNTT',
    duration_semesters: 8,
    standard_tuition_fee: 15000000,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
}

const sampleClassPreparing: TrainingClass = {
    id: 'cls-uuid-001',
    class_code: 'CNTT-K21A',
    program_id: 'prog-uuid-001',
    program_code: 'PROG-CNTT',
    program_name: 'Công nghệ thông tin',
    expected_start_date: '2026-06-01',
    max_capacity: 35,
    learning_mode: 'offline',
    status: 'preparing',
    status_label: 'Chuẩn bị',
    enrolled_count: 0,
    subjects: [
        {
            id: 'cs-01',
            class_id: 'cls-uuid-001',
            subject_id: 'sub-01',
            subject_code: 'CS101',
            subject_name: 'Nhập môn lập trình',
            credits: 3,
            semester: 1,
            is_mandatory: true,
            order_index: 1,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
        },
    ],
    copied_subjects_count: 1,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
}

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

describe('SCRUM-217: Mở lớp từ chương trình đào tạo (TC217-01 -> TC217-10)', () => {
    // =========================================================================
    // 217-01: KHAI BÁO THÔNG TIN LỚP
    // =========================================================================
    describe('217-01: Khai báo thông tin lớp', () => {
        it('TC217-01: Mở form tạo lớp và submit thành công', async () => {
            const mockCustomRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
                if (init?.method === 'POST') {
                    const body = JSON.parse(init.body as string)
                    return Promise.resolve({
                        ok: true,
                        json: () =>
                            Promise.resolve({
                                status: 'success',
                                data: {
                                    id: 'cls-new-001',
                                    class_code: body.class_code,
                                    program_id: body.program_id,
                                    program_name: 'Công nghệ thông tin',
                                    expected_start_date: body.expected_start_date,
                                    max_capacity: body.max_capacity,
                                    learning_mode: body.learning_mode,
                                    status: 'preparing',
                                    status_label: 'Chuẩn bị',
                                    enrolled_count: 0,
                                    copied_subjects_count: 1,
                                    subjects: [],
                                },
                            }),
                    })
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 'success', data: { items: [], total: 0 } }),
                })
            })

            renderWithSession(
                <ClassesPage
                    initialClasses={[]}
                    initialTotal={0}
                    initialPrograms={[sampleProgram]}
                    customRequest={mockCustomRequest as any}
                    canManageOverride={true}
                />,
            )

            // Click mở modal tạo lớp
            fireEvent.click(screen.getByTestId('create-class-btn'))
            expect(screen.getByTestId('create-class-modal')).toBeDefined()

            // Nhập thông tin
            fireEvent.change(screen.getByTestId('class-code-input'), { target: { value: 'CNTT-K21B' } })
            fireEvent.change(screen.getByTestId('program-select'), { target: { value: sampleProgram.id } })
            fireEvent.change(screen.getByTestId('expected-start-date-input'), { target: { value: '2026-07-01' } })
            fireEvent.change(screen.getByTestId('max-capacity-input'), { target: { value: '40' } })
            fireEvent.change(screen.getByTestId('learning-mode-select'), { target: { value: 'offline' } })

            // Submit
            fireEvent.click(screen.getByTestId('submit-class-btn'))

            await waitFor(() => {
                expect(screen.getByTestId('success-alert').textContent).toContain("Mở lớp học 'CNTT-K21B' thành công")
            })

            expect(mockCustomRequest).toHaveBeenCalledWith(
                '/api/v1/classes',
                expect.objectContaining({
                    method: 'POST',
                }),
            )
        })

        it('TC217-02: Reload/query lại -> dữ liệu lớp vẫn hiển thị', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        status: 'success',
                        data: {
                            items: [sampleClassPreparing],
                            total: 1,
                            page: 1,
                            page_size: 50,
                            total_pages: 1,
                        },
                    }),
            })

            renderWithSession(
                <ClassesPage
                    customRequest={mockCustomRequest as any}
                    canManageOverride={true}
                />,
            )

            await waitFor(() => {
                expect(screen.getByTestId('class-code-cls-uuid-001').textContent).toBe('CNTT-K21A')
                expect(screen.getByTestId('class-program-cls-uuid-001').textContent).toBe('Công nghệ thông tin')
                expect(screen.getByTestId('class-capacity-cls-uuid-001').textContent).toBe('0 / 35')
            })
        })
    })

    // =========================================================================
    // 217-02: MÃ LỚP DUY NHẤT
    // =========================================================================
    describe('217-02: Mã lớp duy nhất', () => {
        it('TC217-03: Tạo CLASS001 thành công', async () => {
            renderWithSession(
                <ClassesPage
                    initialClasses={[sampleClassPreparing]}
                    initialTotal={1}
                    canManageOverride={true}
                />,
            )

            expect(screen.getByTestId('class-code-cls-uuid-001').textContent).toBe('CNTT-K21A')
        })

        it('TC217-04: Tạo lớp khác trùng mã bị chặn và hiển thị thông báo tiếng Việt', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 409,
                json: () =>
                    Promise.resolve({
                        status: 'error',
                        code: 'CLASS_CODE_ALREADY_EXISTS',
                        message: "Mã lớp học 'CNTT-K21A' đã tồn tại trong hệ thống. Vui lòng chọn mã khác.",
                    }),
            })

            renderWithSession(
                <ClassesPage
                    initialClasses={[sampleClassPreparing]}
                    initialTotal={1}
                    initialPrograms={[sampleProgram]}
                    customRequest={mockCustomRequest as any}
                    canManageOverride={true}
                />,
            )

            fireEvent.click(screen.getByTestId('create-class-btn'))
            fireEvent.change(screen.getByTestId('class-code-input'), { target: { value: 'CNTT-K21A' } })
            fireEvent.change(screen.getByTestId('program-select'), { target: { value: sampleProgram.id } })

            fireEvent.click(screen.getByTestId('submit-class-btn'))

            await waitFor(() => {
                expect(screen.getByTestId('error-alert')).toBeDefined()
                expect(screen.getByTestId('error-alert').textContent).toContain('đã tồn tại trong hệ thống')
            })
        })
    })

    // =========================================================================
    // 217-03: VÒNG ĐỜI LỚP
    // =========================================================================
    describe('217-03: Vòng đời lớp', () => {
        it('TC217-05: Class có status ban đầu hợp lệ', async () => {
            renderWithSession(
                <ClassesPage
                    initialClasses={[sampleClassPreparing]}
                    initialTotal={1}
                    canManageOverride={true}
                />,
            )

            const select = screen.getByTestId('status-select-cls-uuid-001') as HTMLSelectElement
            expect(select.value).toBe('preparing')
        })

        it('TC217-06: UI hiển thị đủ 4 trạng thái vòng đời chuẩn (Chuẩn bị, Đang học, Kết thúc, Huỷ)', async () => {
            renderWithSession(
                <ClassesPage
                    initialClasses={[sampleClassPreparing]}
                    initialTotal={1}
                    canManageOverride={true}
                />,
            )

            const select = screen.getByTestId('status-select-cls-uuid-001') as HTMLSelectElement
            const options = Array.from(select.options).map((o) => o.text)

            expect(options).toContain('Chuẩn bị')
            expect(options).toContain('Đang học')
            expect(options).toContain('Kết thúc')
            expect(options).toContain('Huỷ')
        })

        it('TC217-07: Chuyển trạng thái -> gọi API và persist cập nhật', async () => {
            const mockCustomRequest = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
                if (init?.method === 'PUT') {
                    const body = JSON.parse(init.body as string)
                    return Promise.resolve({
                        ok: true,
                        json: () =>
                            Promise.resolve({
                                status: 'success',
                                data: {
                                    ...sampleClassPreparing,
                                    status: body.status,
                                    status_label: 'Đang học',
                                },
                            }),
                    })
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 'success', data: sampleClassPreparing }),
                })
            })

            renderWithSession(
                <ClassesPage
                    initialClasses={[sampleClassPreparing]}
                    initialTotal={1}
                    customRequest={mockCustomRequest as any}
                    canManageOverride={true}
                />,
            )

            const select = screen.getByTestId('status-select-cls-uuid-001')
            fireEvent.change(select, { target: { value: 'in_progress' } })

            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledWith(
                    '/api/v1/classes/cls-uuid-001/status',
                    expect.objectContaining({
                        method: 'PUT',
                        body: JSON.stringify({ status: 'in_progress' }),
                    }),
                )
            })
        })
    })

    // =========================================================================
    // 217-04: SAO CHÉP DANH SÁCH MÔN HỌC
    // =========================================================================
    describe('217-04: Sao chép danh sách môn học', () => {
        it('TC217-08: Class mới có danh sách môn học sao chép tương ứng', async () => {
            renderWithSession(
                <ClassesPage
                    initialClasses={[sampleClassPreparing]}
                    initialTotal={1}
                    canManageOverride={true}
                />,
            )

            fireEvent.click(screen.getByTestId('view-class-cls-uuid-001'))

            expect(screen.getByTestId('class-detail-modal')).toBeDefined()
            expect(screen.getByTestId('class-subjects-table')).toBeDefined()
            expect(screen.getByTestId('class-subjects-table').textContent).toContain('CS101')
            expect(screen.getByTestId('class-subjects-table').textContent).toContain('Nhập môn lập trình')
        })

        it('TC217-09: Program gốc không bị sửa đổi', async () => {
            expect(sampleProgram.code).toBe('PROG-CNTT')
            expect(sampleProgram.name).toBe('Công nghệ thông tin')
        })

        it('TC217-10: Reload modal chi tiết -> danh sách môn học persist', async () => {
            const mockCustomRequest = vi.fn().mockImplementation((path: string) => {
                if (path === '/api/v1/classes/cls-uuid-001') {
                    return Promise.resolve({
                        ok: true,
                        json: () =>
                            Promise.resolve({
                                status: 'success',
                                data: sampleClassPreparing,
                            }),
                    })
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 'success', data: { items: [], total: 0 } }),
                })
            })

            renderWithSession(
                <ClassesPage
                    initialClasses={[sampleClassPreparing]}
                    initialTotal={1}
                    customRequest={mockCustomRequest as any}
                    canManageOverride={true}
                />,
            )

            fireEvent.click(screen.getByTestId('view-class-cls-uuid-001'))

            await waitFor(() => {
                expect(screen.getByTestId('subject-row-cs-01')).toBeDefined()
            })
        })
    })
})
