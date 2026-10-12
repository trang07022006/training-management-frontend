// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { ClassesPage } from './ClassesPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { TrainingClass } from '../api/classApi'
import type { TrainingProgram } from '../api/trainingProgramApi'
import type { User } from '../api/userApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockProgramA: TrainingProgram = {
    id: 'prog-uuid-001',
    code: 'PROG-CNTT',
    name: 'Công nghệ thông tin',
    description: 'Chương trình đào tạo CNTT',
    duration_semesters: 8,
    standard_tuition_fee: 15000000,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
}

const mockProgramB: TrainingProgram = {
    id: 'prog-uuid-002',
    code: 'PROG-KTPM',
    name: 'Kỹ thuật phần mềm',
    description: 'Chương trình đào tạo KTPM',
    duration_semesters: 8,
    standard_tuition_fee: 16000000,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
}

const mockInstructor: User = {
    id: 'user-inst-001',
    email: 'giangvien@ictu.edu.vn',
    name: 'Thầy Nguyễn Văn A',
    role: 'trainer',
    status: 'active',
}

const mockClass1: TrainingClass = {
    id: 'cls-001',
    class_code: 'CNTT-K21A',
    program_id: 'prog-uuid-001',
    program_name: 'Công nghệ thông tin',
    expected_start_date: '2026-06-01',
    max_capacity: 30,
    learning_mode: 'offline',
    status: 'preparing',
    status_label: 'Chuẩn bị',
    enrolled_count: 18,
    session_progress: null,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
}

const mockClass2: TrainingClass = {
    id: 'cls-002',
    class_code: 'KTPM-K21B',
    program_id: 'prog-uuid-002',
    program_name: 'Kỹ thuật phần mềm',
    expected_start_date: '2026-07-15',
    max_capacity: 25,
    learning_mode: 'online',
    status: 'in_progress',
    status_label: 'Đang học',
    enrolled_count: 20,
    session_progress: '4 / 15 buổi',
    created_at: '2026-05-10T00:00:00Z',
    updated_at: '2026-05-10T00:00:00Z',
}

function RoleSessionWrapper({
    role = 'training_manager',
    children,
}: {
    role?: string
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        startSession(
            { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
            role,
            'user-test-id',
            false,
            'Test Manager',
            'manager@ictu.edu.vn',
            [role],
            ['course.manage', 'course.view'],
        )
    }, [role, startSession])

    if (!hasSession) return <div>Initializing session...</div>
    return <>{children}</>
}

function renderClassesPage(ui: ReactNode) {
    return render(
        <MemoryRouter>
            <SessionProvider apiOrigin="http://localhost:5000">
                <RoleSessionWrapper>{ui}</RoleSessionWrapper>
            </SessionProvider>
        </MemoryRouter>,
    )
}

describe('SCRUM-219: Danh sách lớp, bộ lọc và chỉ số nhanh', () => {
    // =========================================================================
    // 219-01: BỘ LỌC DANH SÁCH LỚP (TC219-01 -> TC219-06)
    // =========================================================================
    describe('219-01: Bộ lọc danh sách lớp', () => {
        it('TC219-01: Lọc trạng thái lớp học -> gọi API với status tương ứng', async () => {
            const mockCustomRequest = vi.fn().mockImplementation((path: string) => {
                if (path.includes('/api/v1/classes')) {
                    return Promise.resolve({
                        ok: true,
                        json: () =>
                            Promise.resolve({
                                status: 'success',
                                data: {
                                    items: [mockClass1],
                                    total: 1,
                                    page: 1,
                                    page_size: 50,
                                    total_pages: 1,
                                },
                            }),
                    })
                }
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
            })

            renderClassesPage(
                <ClassesPage
                    initialClasses={[mockClass1, mockClass2]}
                    initialPrograms={[mockProgramA, mockProgramB]}
                    initialInstructors={[mockInstructor]}
                    customRequest={mockCustomRequest as any}
                />,
            )

            // Chọn trạng thái 'Chuẩn bị' (preparing)
            const statusSelect = screen.getByTestId('filter-status')
            fireEvent.change(statusSelect, { target: { value: 'preparing' } })

            // Click nút Lọc
            fireEvent.click(screen.getByTestId('class-search-btn'))

            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledWith(
                    expect.stringContaining('status=preparing'),
                    expect.anything(),
                )
            })
        })

        it('TC219-02: Lọc theo chương trình đào tạo -> gọi API với program_id', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        status: 'success',
                        data: {
                            items: [mockClass1],
                            total: 1,
                            page: 1,
                            page_size: 50,
                            total_pages: 1,
                        },
                    }),
            })

            renderClassesPage(
                <ClassesPage
                    initialClasses={[mockClass1, mockClass2]}
                    initialPrograms={[mockProgramA, mockProgramB]}
                    initialInstructors={[mockInstructor]}
                    customRequest={mockCustomRequest as any}
                />,
            )

            const programSelect = screen.getByTestId('filter-program')
            fireEvent.change(programSelect, { target: { value: 'prog-uuid-001' } })

            fireEvent.click(screen.getByTestId('class-search-btn'))

            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledWith(
                    expect.stringContaining('program_id=prog-uuid-001'),
                    expect.anything(),
                )
            })
        })

        it('TC219-03: Lọc giảng viên -> gọi API với instructor_id', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        status: 'success',
                        data: {
                            items: [mockClass1],
                            total: 1,
                            page: 1,
                            page_size: 50,
                            total_pages: 1,
                        },
                    }),
            })

            renderClassesPage(
                <ClassesPage
                    initialClasses={[mockClass1]}
                    initialPrograms={[mockProgramA]}
                    initialInstructors={[mockInstructor]}
                    customRequest={mockCustomRequest as any}
                />,
            )

            const instructorSelect = screen.getByTestId('filter-instructor')
            fireEvent.change(instructorSelect, { target: { value: 'user-inst-001' } })

            fireEvent.click(screen.getByTestId('class-search-btn'))

            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledWith(
                    expect.stringContaining('instructor_id=user-inst-001'),
                    expect.anything(),
                )
            })
        })

        it('TC219-04: Lọc khoảng thời gian (Từ ngày - Đến ngày) -> gọi API với date_from và date_to', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        status: 'success',
                        data: {
                            items: [mockClass1],
                            total: 1,
                            page: 1,
                            page_size: 50,
                            total_pages: 1,
                        },
                    }),
            })

            renderClassesPage(
                <ClassesPage
                    initialClasses={[mockClass1]}
                    initialPrograms={[mockProgramA]}
                    initialInstructors={[mockInstructor]}
                    customRequest={mockCustomRequest as any}
                />,
            )

            fireEvent.change(screen.getByTestId('filter-date-from'), { target: { value: '2026-06-01' } })
            fireEvent.change(screen.getByTestId('filter-date-to'), { target: { value: '2026-06-30' } })

            fireEvent.click(screen.getByTestId('class-search-btn'))

            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledWith(
                    expect.stringContaining('date_from=2026-06-01'),
                    expect.anything(),
                )
                expect(mockCustomRequest).toHaveBeenCalledWith(
                    expect.stringContaining('date_to=2026-06-30'),
                    expect.anything(),
                )
            })
        })

        it('TC219-05: Kết hợp nhiều filter cùng lúc -> API nhận đủ tất cả tham số', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        status: 'success',
                        data: {
                            items: [mockClass1],
                            total: 1,
                            page: 1,
                            page_size: 50,
                            total_pages: 1,
                        },
                    }),
            })

            renderClassesPage(
                <ClassesPage
                    initialClasses={[mockClass1, mockClass2]}
                    initialPrograms={[mockProgramA, mockProgramB]}
                    initialInstructors={[mockInstructor]}
                    customRequest={mockCustomRequest as any}
                />,
            )

            fireEvent.change(screen.getByTestId('filter-status'), { target: { value: 'preparing' } })
            fireEvent.change(screen.getByTestId('filter-program'), { target: { value: 'prog-uuid-001' } })
            fireEvent.change(screen.getByTestId('filter-instructor'), { target: { value: 'user-inst-001' } })
            fireEvent.change(screen.getByTestId('filter-date-from'), { target: { value: '2026-05-01' } })
            fireEvent.change(screen.getByTestId('filter-date-to'), { target: { value: '2026-06-30' } })

            fireEvent.click(screen.getByTestId('class-search-btn'))

            await waitFor(() => {
                const classCalls = mockCustomRequest.mock.calls.filter(
                    (c: any[]) => typeof c[0] === 'string' && c[0].includes('/api/v1/classes'),
                )
                expect(classCalls.length).toBeGreaterThan(0)
                const calledUrl = classCalls[classCalls.length - 1][0] as string
                expect(calledUrl).toContain('status=preparing')
                expect(calledUrl).toContain('program_id=prog-uuid-001')
                expect(calledUrl).toContain('instructor_id=user-inst-001')
                expect(calledUrl).toContain('date_from=2026-05-01')
                expect(calledUrl).toContain('date_to=2026-06-30')
            })
        })

        it('TC219-06: Xóa filter -> reset inputs và trở về danh sách đầy đủ', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        status: 'success',
                        data: {
                            items: [mockClass1, mockClass2],
                            total: 2,
                            page: 1,
                            page_size: 50,
                            total_pages: 1,
                        },
                    }),
            })

            renderClassesPage(
                <ClassesPage
                    initialClasses={[mockClass1]}
                    initialPrograms={[mockProgramA]}
                    initialInstructors={[mockInstructor]}
                    customRequest={mockCustomRequest as any}
                />,
            )

            // Điền filter
            fireEvent.change(screen.getByTestId('filter-status'), { target: { value: 'preparing' } })
            fireEvent.change(screen.getByTestId('class-search-input'), { target: { value: 'CNTT' } })

            // Click nút Xóa bộ lọc
            fireEvent.click(screen.getByTestId('reset-filter-btn'))

            // Inputs được reset về rỗng
            expect((screen.getByTestId('filter-status') as HTMLSelectElement).value).toBe('')
            expect((screen.getByTestId('class-search-input') as HTMLInputElement).value).toBe('')

            // Đã gọi API tải lại không chứa filter
            await waitFor(() => {
                const classCalls = mockCustomRequest.mock.calls.filter(
                    (c: any[]) => typeof c[0] === 'string' && c[0].includes('/api/v1/classes'),
                )
                expect(classCalls.length).toBeGreaterThan(0)
                const calledUrl = classCalls[classCalls.length - 1][0] as string
                expect(calledUrl).not.toContain('status=')
                expect(calledUrl).not.toContain('search=')
            })
        })
    })

    // =========================================================================
    // 219-02: CHỈ SỐ NHANH TRÊN MỖI DÒNG (TC219-07 -> TC219-10)
    // =========================================================================
    describe('219-02: Chỉ số nhanh trên mỗi dòng', () => {
        it('TC219-07: Hiển thị đúng sĩ số hiện tại / tối đa (current/max capacity)', () => {
            renderClassesPage(
                <ClassesPage
                    initialClasses={[mockClass1, mockClass2]}
                    initialPrograms={[mockProgramA, mockProgramB]}
                />,
            )

            // Lớp 1 có 18 / 30
            expect(screen.getByTestId('class-capacity-cls-001').textContent).toBe('18 / 30')
            // Lớp 2 có 20 / 25
            expect(screen.getByTestId('class-capacity-cls-002').textContent).toBe('20 / 25')
        })

        it('TC219-08: Thêm enrollment -> cập nhật sĩ số đúng', () => {
            const updatedClass1 = { ...mockClass1, enrolled_count: 19 }

            const { rerender } = renderClassesPage(
                <ClassesPage
                    key="init"
                    initialClasses={[mockClass1]}
                    initialPrograms={[mockProgramA]}
                />,
            )

            expect(screen.getByTestId('class-capacity-cls-001').textContent).toBe('18 / 30')

            // Sau khi ghi danh thêm học viên, sĩ số được cập nhật đúng
            rerender(
                <MemoryRouter>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <RoleSessionWrapper>
                            <ClassesPage
                                key="updated"
                                initialClasses={[updatedClass1]}
                                initialPrograms={[mockProgramA]}
                            />
                        </RoleSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>,
            )

            expect(screen.getByTestId('class-capacity-cls-001').textContent).toBe('19 / 30')
        })

        it('TC219-09: Hiển thị tiến độ buổi học (session progress)', () => {
            renderClassesPage(
                <ClassesPage
                    initialClasses={[mockClass1, mockClass2]}
                    initialPrograms={[mockProgramA, mockProgramB]}
                />,
            )

            // Lớp 1 chưa có tiến độ -> hiển thị '-'
            expect(screen.getByTestId('class-progress-cls-001').textContent).toBe('-')

            // Lớp 2 có session_progress -> hiển thị đúng '4 / 15 buổi'
            expect(screen.getByTestId('class-progress-cls-002').textContent).toBe('4 / 15 buổi')
        })

        it('TC219-10: Reload / fetch -> metrics persist đúng dữ liệu', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        status: 'success',
                        data: {
                            items: [mockClass1, mockClass2],
                            total: 2,
                            page: 1,
                            page_size: 50,
                            total_pages: 1,
                        },
                    }),
            })

            renderClassesPage(
                <ClassesPage
                    customRequest={mockCustomRequest as any}
                />,
            )

            await waitFor(() => {
                expect(screen.getByTestId('class-capacity-cls-001').textContent).toBe('18 / 30')
                expect(screen.getByTestId('class-progress-cls-001').textContent).toBe('-')
                expect(screen.getByTestId('class-capacity-cls-002').textContent).toBe('20 / 25')
                expect(screen.getByTestId('class-progress-cls-002').textContent).toBe('4 / 15 buổi')
            })
        })
    })
})
