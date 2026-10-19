// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { RequirePermission } from '../auth/RequirePermission'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { StudentTransferPage } from './StudentTransferPage'
import * as studentApi from '../api/studentApi'
import * as classApi from '../api/classApi'
import * as studentLifecycleApi from '../api/studentLifecycleApi'

function RoleSessionWrapper({
    role,
    children,
}: {
    role?: string | null
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        if (role !== undefined) {
            startSession({ accessToken: 'test-token', refreshToken: 'test-refresh' }, role)
        }
    }, [role, startSession])

    if (role !== undefined && !hasSession) {
        return <div>Initializing test session...</div>
    }

    return <>{children}</>
}

const mockStudent: studentApi.StudentDetail = {
    id: 'st-202',
    student_code: 'SV2026-002',
    full_name: 'Trần Thị Chuyển Lớp',
    phone: '0988776655',
    email: 'transfer@ictu.edu.vn',
    program_id: 'prog-se',
    program_name: 'Kỹ nghệ phần mềm',
    program_code: 'SE',
    user_id: 'u-2',
    lead_id: null,
    status: 'enrolled',
    entry_level: 'Khá',
    notes: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    current_class: {
        id: 'cls-src',
        class_id: 'cls-src',
        class_code: 'SE-K20A',
        name: 'Lớp SE Sáng',
        expected_start_date: '2026-09-01',
        status: 'in_progress',
        enrollment_status: 'enrolled',
    },
    current_classes: [
        {
            id: 'cls-src',
            class_id: 'cls-src',
            class_code: 'SE-K20A',
            name: 'Lớp SE Sáng',
            expected_start_date: '2026-09-01',
            status: 'in_progress',
            enrollment_status: 'enrolled',
        },
    ],
    class_history: [],
}

const mockClasses: classApi.TrainingClass[] = [
    {
        id: 'cls-src',
        class_code: 'SE-K20A',
        program_id: 'prog-se',
        expected_start_date: '2026-09-01',
        max_capacity: 30,
        enrolled_count: 20,
        learning_mode: 'offline',
        status: 'in_progress',
        status_label: 'Đang học',
        created_at: null,
        updated_at: null,
    },
    {
        id: 'cls-tgt-ok',
        class_code: 'SE-K20B',
        program_id: 'prog-se',
        expected_start_date: '2026-09-01',
        max_capacity: 30,
        enrolled_count: 15,
        learning_mode: 'offline',
        status: 'in_progress',
        status_label: 'Đang học',
        created_at: null,
        updated_at: null,
    },
    {
        id: 'cls-tgt-full',
        class_code: 'SE-K20C',
        program_id: 'prog-se',
        expected_start_date: '2026-09-01',
        max_capacity: 25,
        enrolled_count: 25,
        learning_mode: 'offline',
        status: 'in_progress',
        status_label: 'Đang học',
        created_at: null,
        updated_at: null,
    },
]

describe('StudentTransferPage (SCRUM-252.2)', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('1. Hiển thị thông tin học viên, lớp nguồn và các lớp đích với sĩ số', async () => {
        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(mockStudent)
        vi.spyOn(classApi, 'listClasses').mockResolvedValue({
            items: mockClasses,
            total: 3,
            page: 1,
            page_size: 100,
            total_pages: 1,
        })

        render(
            <MemoryRouter initialEntries={['/students/st-202/transfer']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/transfer" element={<StudentTransferPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('student-transfer-page')).toBeDefined()
        })

        expect(screen.getAllByText('Trần Thị Chuyển Lớp').length).toBeGreaterThan(0)
        expect(screen.getAllByText('SV2026-002').length).toBeGreaterThan(0)
        expect(screen.getByTestId('select-source-class')).toBeDefined()
        expect(screen.getByTestId('select-target-class')).toBeDefined()
        expect(screen.getByTestId('input-effective-date')).toBeDefined()
        expect(screen.getByTestId('input-reason')).toBeDefined()
    })

    it('2. Báo lỗi khi chưa chọn lớp đích hoặc lý do không hợp lệ', async () => {
        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(mockStudent)
        vi.spyOn(classApi, 'listClasses').mockResolvedValue({
            items: mockClasses,
            total: 3,
            page: 1,
            page_size: 100,
            total_pages: 1,
        })

        render(
            <MemoryRouter initialEntries={['/students/st-202/transfer']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/transfer" element={<StudentTransferPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-transfer')).toBeDefined()
        })

        // Không chọn lớp đích -> báo lỗi
        fireEvent.click(screen.getByTestId('btn-preview-transfer'))
        expect(screen.getByTestId('alert-error').textContent).toContain('Vui lòng chọn lớp đích')

        // Chọn lớp đích nhưng để trống lý do
        const selectTarget = screen.getByTestId('select-target-class')
        fireEvent.change(selectTarget, { target: { value: 'cls-tgt-ok' } })

        const reasonInput = screen.getByTestId('input-reason')
        fireEvent.change(reasonInput, { target: { value: '   ' } })

        fireEvent.click(screen.getByTestId('btn-preview-transfer'))
        expect(screen.getByTestId('alert-error').textContent).toContain('Lý do chuyển lớp là bắt buộc')
    })

    it('3. Mở modal xác nhận tóm tắt chuyển lớp và gọi API thành công', async () => {
        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(mockStudent)
        vi.spyOn(classApi, 'listClasses').mockResolvedValue({
            items: mockClasses,
            total: 3,
            page: 1,
            page_size: 100,
            total_pages: 1,
        })
        const transferMock = vi.spyOn(studentLifecycleApi, 'transferStudent').mockResolvedValue({
            message: 'Chuyển lớp thành công',
            data: { id: 'hist-tr-1' },
        })

        render(
            <MemoryRouter initialEntries={['/students/st-202/transfer']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/transfer" element={<StudentTransferPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-transfer')).toBeDefined()
        })

        const selectTarget = screen.getByTestId('select-target-class')
        fireEvent.change(selectTarget, { target: { value: 'cls-tgt-ok' } })

        const reasonInput = screen.getByTestId('input-reason')
        fireEvent.change(reasonInput, { target: { value: 'Chuyển lớp sang ca tối do đi làm' } })

        fireEvent.click(screen.getByTestId('btn-preview-transfer'))

        // Modal should appear
        expect(screen.getByTestId('transfer-modal')).toBeDefined()
        expect(screen.getByText('Xác nhận yêu cầu chuyển lớp học viên')).toBeDefined()

        fireEvent.click(screen.getByTestId('btn-confirm-transfer'))

        await waitFor(() => {
            expect(transferMock).toHaveBeenCalledTimes(1)
            expect(screen.getByTestId('alert-success').textContent).toContain('Chuyển lớp thành công')
        })
    })

    it('4. Route Guard: Admin thuần túy không có quyền truy cập trang chuyển lớp', async () => {
        render(
            <MemoryRouter initialEntries={['/students/st-202/transfer']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin">
                        <Routes>
                            <Route
                                element={
                                    <RequirePermission
                                        requiredPermission={SYSTEM_PERMISSIONS.STUDENT_LIFECYCLE_MANAGE}
                                        fallbackPath="/forbidden"
                                    />
                                }
                            >
                                <Route path="/students/:studentId/transfer" element={<StudentTransferPage />} />
                            </Route>
                            <Route path="/forbidden" element={<div data-testid="forbidden-page">403 Forbidden</div>} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('forbidden-page')).toBeDefined()
        })
    })

    it('5. Khối tóm tắt thu gọn, không lặp mã/tên lớp giống nhau và giữ nguyên dữ liệu khi validation lỗi', async () => {
        const studentWithDuplicateClass: studentApi.StudentDetail = {
            ...mockStudent,
            full_name: 'Trần Thị Mỹ Linh Hoàng Yến Siêu Dài Dài Dài',
            email: 'tran.thi.my.linh.hoang.yen.sieu.dai@ictu.edu.vn',
            current_classes: [
                {
                    id: 'cls-src-dup',
                    class_id: 'cls-src-dup',
                    class_code: 'TR_C5537',
                    name: 'TR_C5537', // trùng lặp mã và tên lớp nguồn
                    expected_start_date: '2026-09-01',
                    status: 'in_progress',
                },
            ],
        }
        const classesWithDuplicateName: classApi.TrainingClass[] = [
            {
                id: 'cls-src-dup',
                class_code: 'TR_C5537',
                program_id: 'prog-se',
                expected_start_date: '2026-09-01',
                max_capacity: 30,
                enrolled_count: 10,
                learning_mode: 'offline',
                status: 'in_progress',
                status_label: 'Đang học',
                created_at: null,
                updated_at: null,
            },
            {
                id: 'cls-tgt-dup',
                class_code: 'TR_C9999',
                program_id: 'prog-se',
                expected_start_date: '2026-09-01',
                max_capacity: 30,
                enrolled_count: 5,
                learning_mode: 'offline',
                status: 'in_progress',
                status_label: 'Đang học',
                created_at: null,
                updated_at: null,
            },
        ]

        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(studentWithDuplicateClass)
        vi.spyOn(classApi, 'listClasses').mockResolvedValue({
            items: classesWithDuplicateName,
            total: 2,
            page: 1,
            page_size: 100,
            total_pages: 1,
        })

        render(
            <MemoryRouter initialEntries={['/students/st-202/transfer']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/transfer" element={<StudentTransferPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('student-summary-card')).toBeDefined()
        })

        // Không lặp "TR_C5537 - TR_C5537"
        const selectSource = screen.getByTestId('select-source-class') as HTMLSelectElement
        const sourceOptions = Array.from(selectSource.options).map(o => o.text)
        expect(sourceOptions).toContain('TR_C5537')
        expect(sourceOptions).not.toContain('TR_C5537 - TR_C5537')

        // Nhập lý do và chọn lớp đích
        const selectTarget = screen.getByTestId('select-target-class') as HTMLSelectElement
        fireEvent.change(selectTarget, { target: { value: 'cls-tgt-dup' } })

        const reasonInput = screen.getByTestId('input-reason') as HTMLTextAreaElement
        fireEvent.change(reasonInput, { target: { value: 'Chuy' } }) // ngắn hơn 5 ký tự

        fireEvent.click(screen.getByTestId('btn-preview-transfer'))

        // Báo lỗi nhưng dữ liệu không bị xóa
        expect(screen.getByTestId('alert-error').textContent).toContain('ít nhất 5 ký tự')
        expect(reasonInput.value).toBe('Chuy')
        expect(selectTarget.value).toBe('cls-tgt-dup')
    })
})
