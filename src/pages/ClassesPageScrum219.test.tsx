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
    // =========================================================================
    // 219-01: BỘ LỌC DANH SÁCH LỚP TỰ ĐỘNG (TC1 -> TC7)
    // =========================================================================
    describe('219-01: Tự động áp dụng bộ lọc danh sách lớp & debounce tìm kiếm', () => {
        it('Xóa hoàn toàn nút "Lọc danh sách" khỏi giao diện', () => {
            renderClassesPage(
                <ClassesPage
                    initialClasses={[mockClass1, mockClass2]}
                    initialPrograms={[mockProgramA, mockProgramB]}
                />,
            )

            // Nút "Lọc danh sách" không còn tồn tại
            expect(screen.queryByTestId('class-search-btn')).toBeNull()
            expect(screen.queryByText('Lọc danh sách')).toBeNull()
            // Nút "Xóa bộ lọc" vẫn được giữ lại
            expect(screen.getByTestId('reset-filter-btn')).toBeDefined()
        })

        it('TC1: Chọn Huỷ -> danh sách tự động lọc ngay mà không cần bấm nút', async () => {
            const mockCustomRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        status: 'success',
                        data: {
                            items: [mockClass2],
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

            // Chọn trạng thái 'Huỷ' (cancelled)
            const statusSelect = screen.getByTestId('filter-status')
            fireEvent.change(statusSelect, { target: { value: 'cancelled' } })

            // Danh sách tự động gọi API lọc ngay mà không bấm thêm nút nào
            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledWith(
                    expect.stringContaining('status=cancelled'),
                    expect.anything(),
                )
            })
        })

        it('TC2: Chọn Chuẩn bị -> danh sách đổi ngay; Chọn lại Tất cả trạng thái -> danh sách tự cập nhật ngay', async () => {
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

            const statusSelect = screen.getByTestId('filter-status')

            // Chọn 'Chuẩn bị'
            fireEvent.change(statusSelect, { target: { value: 'preparing' } })
            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledWith(
                    expect.stringContaining('status=preparing'),
                    expect.anything(),
                )
            })

            // Chọn lại 'Tất cả trạng thái' (rỗng) -> tự động gọi lại API không có status
            fireEvent.change(statusSelect, { target: { value: '' } })
            await waitFor(() => {
                const classCalls = mockCustomRequest.mock.calls.filter(
                    (c: any[]) => typeof c[0] === 'string' && c[0].includes('/api/v1/classes'),
                )
                const lastCallUrl = classCalls[classCalls.length - 1][0] as string
                expect(lastCallUrl).not.toContain('status=')
            })
        })

        it('TC3: Chọn chương trình -> lọc ngay; Chọn lại Tất cả chương trình -> tự cập nhật ngay', async () => {
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

            // Chọn chương trình
            fireEvent.change(programSelect, { target: { value: 'prog-uuid-001' } })
            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledWith(
                    expect.stringContaining('program_id=prog-uuid-001'),
                    expect.anything(),
                )
            })

            // Chọn lại 'Tất cả chương trình'
            fireEvent.change(programSelect, { target: { value: '' } })
            await waitFor(() => {
                const classCalls = mockCustomRequest.mock.calls.filter(
                    (c: any[]) => typeof c[0] === 'string' && c[0].includes('/api/v1/classes'),
                )
                const lastCallUrl = classCalls[classCalls.length - 1][0] as string
                expect(lastCallUrl).not.toContain('program_id=')
            })
        })

        it('TC4: Chọn giảng viên -> lọc ngay; Chọn lại Tất cả giảng viên -> tự cập nhật ngay', async () => {
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

            // Chọn giảng viên
            fireEvent.change(instructorSelect, { target: { value: 'user-inst-001' } })
            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledWith(
                    expect.stringContaining('instructor_id=user-inst-001'),
                    expect.anything(),
                )
            })

            // Chọn lại 'Tất cả giảng viên'
            fireEvent.change(instructorSelect, { target: { value: '' } })
            await waitFor(() => {
                const classCalls = mockCustomRequest.mock.calls.filter(
                    (c: any[]) => typeof c[0] === 'string' && c[0].includes('/api/v1/classes'),
                )
                const lastCallUrl = classCalls[classCalls.length - 1][0] as string
                expect(lastCallUrl).not.toContain('instructor_id=')
            })
        })

        it('TC5: Chọn ngày -> lọc ngay', async () => {
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
            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledWith(
                    expect.stringContaining('date_from=2026-06-01'),
                    expect.anything(),
                )
            })

            fireEvent.change(screen.getByTestId('filter-date-to'), { target: { value: '2026-06-30' } })
            await waitFor(() => {
                expect(mockCustomRequest).toHaveBeenCalledWith(
                    expect.stringContaining('date_to=2026-06-30'),
                    expect.anything(),
                )
            })
        })

        it('TC6: Nhập tìm kiếm -> sau debounce 350ms danh sách tự động lọc', async () => {
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

            // Nhập từ khóa tìm kiếm mà không bấm Enter, không bấm nút
            fireEvent.change(screen.getByTestId('class-search-input'), { target: { value: 'CNTT-K21' } })

            // Sau debounce, API được gọi tự động với search=CNTT-K21
            await waitFor(
                () => {
                    expect(mockCustomRequest).toHaveBeenCalledWith(
                        expect.stringContaining('search=CNTT-K21'),
                        expect.anything(),
                    )
                },
                { timeout: 1500 },
            )
        })

        it('TC7: Bấm Xóa bộ lọc -> mọi input trở về mặc định và toàn bộ lớp xuất hiện ngay', async () => {
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

            // Bấm nút Xóa bộ lọc
            fireEvent.click(screen.getByTestId('reset-filter-btn'))

            // Mọi inputs được reset về rỗng
            expect((screen.getByTestId('filter-status') as HTMLSelectElement).value).toBe('')
            expect((screen.getByTestId('class-search-input') as HTMLInputElement).value).toBe('')
            expect((screen.getByTestId('filter-program') as HTMLSelectElement).value).toBe('')
            expect((screen.getByTestId('filter-instructor') as HTMLSelectElement).value).toBe('')
            expect((screen.getByTestId('filter-date-from') as HTMLInputElement).value).toBe('')
            expect((screen.getByTestId('filter-date-to') as HTMLInputElement).value).toBe('')

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
