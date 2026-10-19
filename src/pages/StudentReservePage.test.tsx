// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { RequirePermission } from '../auth/RequirePermission'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { StudentReservePage } from './StudentReservePage'
import * as studentApi from '../api/studentApi'
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
    id: 'st-101',
    student_code: 'SV2026-001',
    full_name: 'Nguyễn Văn Test',
    phone: '0912345678',
    email: 'test@ictu.edu.vn',
    program_id: 'prog-1',
    program_name: 'Kỹ nghệ phần mềm',
    program_code: 'SE',
    user_id: 'u-1',
    lead_id: null,
    status: 'enrolled',
    entry_level: 'Khá',
    notes: 'Học viên chăm chỉ',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    current_class: {
        id: 'cls-1',
        class_id: 'cls-1',
        class_code: 'SE-K20A',
        name: 'Lớp SE K20A',
        expected_start_date: '2026-09-01',
        status: 'in_progress',
        enrollment_status: 'enrolled',
    },
    current_classes: [
        {
            id: 'cls-1',
            class_id: 'cls-1',
            class_code: 'SE-K20A',
            name: 'Lớp SE K20A',
            expected_start_date: '2026-09-01',
            status: 'in_progress',
            enrollment_status: 'enrolled',
        },
    ],
    class_history: [],
}

describe('StudentReservePage (SCRUM-252.1)', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('1. Hiển thị thông tin học viên, lớp học và form bảo lưu đầy đủ', async () => {
        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(mockStudent)

        render(
            <MemoryRouter initialEntries={['/students/st-101/reserve']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/reserve" element={<StudentReservePage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('student-reserve-page')).toBeDefined()
        })

        expect(screen.getAllByText('Nguyễn Văn Test').length).toBeGreaterThan(0)
        expect(screen.getAllByText('SV2026-001').length).toBeGreaterThan(0)
        expect(screen.getByTestId('select-class')).toBeDefined()
        expect(screen.getByTestId('input-effective-date')).toBeDefined()
        expect(screen.getByTestId('input-reason')).toBeDefined()
    })

    it('2. Báo lỗi khi lý do bảo lưu để trống hoặc chỉ có khoảng trắng', async () => {
        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(mockStudent)

        render(
            <MemoryRouter initialEntries={['/students/st-101/reserve']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/reserve" element={<StudentReservePage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-reserve')).toBeDefined()
        })

        const reasonInput = screen.getByTestId('input-reason')
        fireEvent.change(reasonInput, { target: { value: '    ' } })

        const submitBtn = screen.getByTestId('btn-preview-reserve')
        fireEvent.click(submitBtn)

        expect(screen.getByTestId('input-reason-error').textContent).toContain('Lý do bảo lưu là bắt buộc')
    })

    it('3. Mở modal xác nhận với tóm tắt đầy đủ và gửi yêu cầu thành công', async () => {
        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(mockStudent)
        const reserveMock = vi.spyOn(studentLifecycleApi, 'reserveStudent').mockResolvedValue({
            message: 'Bảo lưu thành công',
            data: { id: 'hist-1' },
        })

        render(
            <MemoryRouter initialEntries={['/students/st-101/reserve']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/reserve" element={<StudentReservePage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-reserve')).toBeDefined()
        })

        const reasonInput = screen.getByTestId('input-reason')
        fireEvent.change(reasonInput, { target: { value: 'Bảo lưu do đi làm thực tập dài hạn' } })

        const previewBtn = screen.getByTestId('btn-preview-reserve')
        fireEvent.click(previewBtn)

        // Modal should appear
        expect(screen.getByTestId('reserve-modal')).toBeDefined()
        expect(screen.getByText('Xác nhận yêu cầu bảo lưu học viên')).toBeDefined()

        const confirmBtn = screen.getByTestId('btn-confirm-reserve')
        fireEvent.click(confirmBtn)

        await waitFor(() => {
            expect(reserveMock).toHaveBeenCalledTimes(1)
            expect(screen.getByTestId('alert-success').textContent).toContain('Bảo lưu học viên thành công')
        })
    })

    it('4. Route Guard: Người dùng role admin hoặc trainee không được truy cập trang bảo lưu', async () => {
        render(
            <MemoryRouter initialEntries={['/students/st-101/reserve']}>
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
                                <Route path="/students/:studentId/reserve" element={<StudentReservePage />} />
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
            full_name: 'Nguyễn Văn Đỗ Hoàng Nam Anh Tuấn Long Siêu Dài',
            email: 'nguyen.van.do.hoang.nam.anh.tuan.long.sieu.dai@ictu.edu.vn',
            current_classes: [
                {
                    id: 'cls-dup',
                    class_id: 'cls-dup',
                    class_code: 'TR_C5537',
                    name: 'TR_C5537', // trùng lặp mã và tên
                    expected_start_date: '2026-09-01',
                    status: 'in_progress',
                    program_name: 'Khóa học React Nâng Cao',
                },
            ],
        }
        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(studentWithDuplicateClass)

        render(
            <MemoryRouter initialEntries={['/students/st-101/reserve']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/reserve" element={<StudentReservePage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('student-summary-card')).toBeDefined()
        })

        // Kiểm tra phân biệt rõ chương trình học viên
        expect(screen.getByText(/Chương trình đăng ký của học viên:/i)).toBeDefined()
        expect(screen.getByText('Kỹ nghệ phần mềm')).toBeDefined()

        // Kiểm tra không bị lặp "TR_C5537 - TR_C5537"
        const selectClass = screen.getByTestId('select-class') as HTMLSelectElement
        const options = Array.from(selectClass.options).map(o => o.text)
        expect(options).toContain('TR_C5537')
        expect(options).not.toContain('TR_C5537 - TR_C5537')

        // Nhập lý do quá ngắn (< 5 ký tự) để gây lỗi validation
        const reasonInput = screen.getByTestId('input-reason') as HTMLTextAreaElement
        fireEvent.change(reasonInput, { target: { value: 'Bảo' } })
        fireEvent.click(screen.getByTestId('btn-preview-reserve'))

        // Báo lỗi nhưng dữ liệu 'Bảo' vẫn còn nguyên trong input
        expect(screen.getByTestId('input-reason-error').textContent).toContain('ít nhất 5 ký tự')
        expect(reasonInput.value).toBe('Bảo')
    })

    it('6. Hiển thị lỗi tại trường (whitespace, ngày sai), aria attributes, focus/cuộn và backend error mapping', async () => {
        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(mockStudent)
        const scrollSpy = vi.fn()
        window.HTMLElement.prototype.scrollIntoView = scrollSpy

        render(
            <MemoryRouter initialEntries={['/students/st-101/reserve']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/reserve" element={<StudentReservePage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-reserve')).toBeDefined()
        })

        const dateInput = screen.getByTestId('input-effective-date') as HTMLInputElement
        const reasonInput = screen.getByTestId('input-reason') as HTMLTextAreaElement

        // 1. Nhập ngày rỗng và lý do toàn khoảng trắng -> submit
        fireEvent.change(dateInput, { target: { value: '' } })
        fireEvent.change(reasonInput, { target: { value: '     ' } })

        fireEvent.click(screen.getByTestId('btn-preview-reserve'))

        // Không mở modal
        expect(screen.queryByTestId('reserve-modal')).toBeNull()

        // Lỗi hiển thị ngay dưới từng trường
        const dateError = screen.getByTestId('input-effective-date-error')
        const reasonError = screen.getByTestId('input-reason-error')
        expect(dateError.textContent).toContain('Vui lòng chọn ngày hiệu lực')
        expect(reasonError.textContent).toContain('không được chỉ chứa khoảng trắng')

        // Kiểm tra viền lỗi & aria
        expect(dateInput.classList.contains('has-error')).toBe(true)
        expect(dateInput.getAttribute('aria-invalid')).toBe('true')
        expect(dateInput.getAttribute('aria-describedby')).toBe('input-effective-date-error')

        expect(reasonInput.classList.contains('has-error')).toBe(true)
        expect(reasonInput.getAttribute('aria-invalid')).toBe('true')
        expect(reasonInput.getAttribute('aria-describedby')).toBe('input-reason-error')

        // Cuộn và focus vào trường lỗi đầu tiên (ngày hiệu lực)
        expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
        expect(document.activeElement).toBe(dateInput)

        // Sửa ngày hợp lệ
        fireEvent.change(dateInput, { target: { value: '2026-11-01' } })
        expect(dateInput.classList.contains('has-error')).toBe(false)
        expect(dateInput.getAttribute('aria-invalid')).toBe('false')

        // Lý do vẫn còn lỗi và cuộn focus sang lý do khi bấm lại
        scrollSpy.mockClear()
        fireEvent.click(screen.getByTestId('btn-preview-reserve'))
        expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
        expect(document.activeElement).toBe(reasonInput)

        // Sửa lý do hợp lệ
        fireEvent.change(reasonInput, { target: { value: 'Bảo lưu do hoàn cảnh gia đình' } })
        expect(reasonInput.classList.contains('has-error')).toBe(false)

        // 2. Kiểm thử lỗi Backend: trường cụ thể (lý do)
        const reserveMock = vi.spyOn(studentLifecycleApi, 'reserveStudent')
        reserveMock.mockRejectedValueOnce(new Error('Lý do bảo lưu không được chấp nhận'))

        fireEvent.click(screen.getByTestId('btn-preview-reserve'))
        expect(screen.getByTestId('reserve-modal')).toBeDefined()
        fireEvent.click(screen.getByTestId('btn-confirm-reserve'))

        await waitFor(() => {
            expect(screen.getByTestId('input-reason-error').textContent).toContain('Lý do bảo lưu không được chấp nhận')
        })
        expect(reasonInput.getAttribute('aria-invalid')).toBe('true')

        // 3. Kiểm thử lỗi Backend: Lỗi chung / mất mạng
        reserveMock.mockRejectedValueOnce(new Error('Mất kết nối mạng tới máy chủ'))
        fireEvent.click(screen.getByTestId('btn-preview-reserve'))
        fireEvent.click(screen.getByTestId('btn-confirm-reserve'))

        await waitFor(() => {
            // Hiển thị ở action alert gần nút thao tác
            const actionAlert = document.querySelector('.lifecycle-action-alert')
            expect(actionAlert).not.toBeNull()
            expect(actionAlert?.textContent).toContain('Không thể kết nối tới máy chủ')
            // Đồng thời hiển thị Toast cố định trong viewport
            const toast = document.querySelector('.leads-toast-error')
            expect(toast).not.toBeNull()
            expect(toast?.textContent).toContain('Không thể kết nối tới máy chủ')
        })

        // 4. Sửa và gửi lại thành công
        reserveMock.mockResolvedValueOnce({
            message: 'Bảo lưu thành công',
            data: { id: 'hist-success' },
        })
        fireEvent.click(screen.getByTestId('btn-preview-reserve'))
        fireEvent.click(screen.getByTestId('btn-confirm-reserve'))

        await waitFor(() => {
            expect(screen.getByTestId('alert-success').textContent).toContain('Bảo lưu học viên thành công')
        })
    })
})
