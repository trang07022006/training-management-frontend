// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { RequirePermission } from '../auth/RequirePermission'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { StudentDropPage } from './StudentDropPage'
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
    id: 'st-303',
    student_code: 'SV2026-003',
    full_name: 'Hoàng Văn Thôi Học',
    phone: '0977889900',
    email: 'drop@ictu.edu.vn',
    program_id: 'prog-drop',
    program_name: 'An ninh mạng',
    program_code: 'CYBER',
    user_id: 'u-3',
    lead_id: null,
    status: 'enrolled',
    entry_level: 'Khá',
    notes: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    current_class: {
        id: 'cls-drop-1',
        class_id: 'cls-drop-1',
        class_code: 'CYB-K20A',
        name: 'Lớp An ninh mạng',
        expected_start_date: '2026-09-01',
        status: 'in_progress',
        enrollment_status: 'enrolled',
    },
    current_classes: [
        {
            id: 'cls-drop-1',
            class_id: 'cls-drop-1',
            class_code: 'CYB-K20A',
            name: 'Lớp An ninh mạng',
            expected_start_date: '2026-09-01',
            status: 'in_progress',
            enrollment_status: 'enrolled',
        },
    ],
    class_history: [],
}

describe('StudentDropPage (SCRUM-252.3)', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('1. Hiển thị thông tin học viên, lựa chọn phạm vi thôi học (1 lớp hoặc toàn bộ)', async () => {
        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(mockStudent)

        render(
            <MemoryRouter initialEntries={['/students/st-303/drop']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/drop" element={<StudentDropPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('student-drop-page')).toBeDefined()
        })

        expect(screen.getAllByText('Hoàng Văn Thôi Học').length).toBeGreaterThan(0)
        expect(screen.getAllByText('SV2026-003').length).toBeGreaterThan(0)
        expect(screen.getByTestId('radio-scope-single')).toBeDefined()
        expect(screen.getByTestId('radio-scope-all')).toBeDefined()
        expect(screen.getByTestId('input-effective-date')).toBeDefined()
        expect(screen.getByTestId('input-reason')).toBeDefined()
    })

    it('2. Báo lỗi khi lý do thôi học để trống hoặc chỉ có khoảng trắng', async () => {
        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(mockStudent)

        render(
            <MemoryRouter initialEntries={['/students/st-303/drop']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/drop" element={<StudentDropPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-drop')).toBeDefined()
        })

        const reasonInput = screen.getByTestId('input-reason')
        fireEvent.change(reasonInput, { target: { value: '    ' } })

        fireEvent.click(screen.getByTestId('btn-preview-drop'))
        expect(screen.getByTestId('input-reason-error').textContent).toContain('Lý do thôi học là bắt buộc')
    })

    it('3. Thôi học toàn bộ khóa học: mở modal và gửi yêu cầu thành công', async () => {
        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(mockStudent)
        const dropMock = vi.spyOn(studentLifecycleApi, 'dropStudent').mockResolvedValue({
            message: 'Thôi học thành công',
            data: { scope: 'all' },
        })

        render(
            <MemoryRouter initialEntries={['/students/st-303/drop']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/drop" element={<StudentDropPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-drop')).toBeDefined()
        })

        // Chọn phạm vi toàn bộ khóa học
        fireEvent.click(screen.getByTestId('radio-scope-all'))

        const reasonInput = screen.getByTestId('input-reason')
        fireEvent.change(reasonInput, { target: { value: 'Thôi học vì lý do cá nhân xuất cảnh' } })

        fireEvent.click(screen.getByTestId('btn-preview-drop'))

        // Modal should appear
        expect(screen.getByTestId('drop-modal')).toBeDefined()
        expect(screen.getByText('Xác nhận yêu cầu thôi học')).toBeDefined()

        fireEvent.click(screen.getByTestId('btn-confirm-drop'))

        await waitFor(() => {
            expect(dropMock).toHaveBeenCalledWith(
                expect.any(Function),
                'st-303',
                expect.objectContaining({
                    scope: 'all',
                    reason: 'Thôi học vì lý do cá nhân xuất cảnh',
                }),
            )
            expect(screen.getByTestId('alert-success').textContent).toContain('Xử lý thôi học')
        })
    })

    it('4. Route Guard: Admin thuần túy không có quyền truy cập trang thôi học', async () => {
        render(
            <MemoryRouter initialEntries={['/students/st-303/drop']}>
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
                                <Route path="/students/:studentId/drop" element={<StudentDropPage />} />
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
            full_name: 'Hoàng Văn Thôi Học Rất Dài Dài Dài Dài Dài Dài',
            email: 'hoang.van.thoi.hoc.rat.dai@ictu.edu.vn',
            current_classes: [
                {
                    id: 'cls-drop-dup',
                    class_id: 'cls-drop-dup',
                    class_code: 'TR_C5537',
                    name: 'TR_C5537', // trùng lặp mã và tên lớp
                    expected_start_date: '2026-09-01',
                    status: 'in_progress',
                },
            ],
        }

        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(studentWithDuplicateClass)

        render(
            <MemoryRouter initialEntries={['/students/st-303/drop']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/drop" element={<StudentDropPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('student-summary-card')).toBeDefined()
        })

        // Không lặp "TR_C5537 - TR_C5537"
        const selectClass = screen.getByTestId('select-class') as HTMLSelectElement
        const options = Array.from(selectClass.options).map(o => o.text)
        expect(options).toContain('TR_C5537')
        expect(options).not.toContain('TR_C5537 - TR_C5537')

        // Nhập lý do ngắn để gây validation error
        const reasonInput = screen.getByTestId('input-reason') as HTMLTextAreaElement
        fireEvent.change(reasonInput, { target: { value: 'Thôi' } }) // < 5 ký tự

        fireEvent.click(screen.getByTestId('btn-preview-drop'))

        // Báo lỗi nhưng dữ liệu lý do không bị mất
        expect(screen.getByTestId('input-reason-error').textContent).toContain('ít nhất 5 ký tự')
        expect(reasonInput.value).toBe('Thôi')
    })

    it('6. Hiển thị lỗi tại trường (chọn lớp, whitespace, ngày sai), aria attributes, focus/cuộn và backend error mapping', async () => {
        vi.spyOn(studentApi, 'getStudentDetail').mockResolvedValue(mockStudent)
        const scrollSpy = vi.fn()
        window.HTMLElement.prototype.scrollIntoView = scrollSpy

        render(
            <MemoryRouter initialEntries={['/students/st-303/drop']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId/drop" element={<StudentDropPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-preview-drop')).toBeDefined()
        })

        const selectClass = screen.getByTestId('select-class') as HTMLSelectElement
        const dateInput = screen.getByTestId('input-effective-date') as HTMLInputElement
        const reasonInput = screen.getByTestId('input-reason') as HTMLTextAreaElement

        // 1. Để trống lớp, ngày rỗng và lý do toàn khoảng trắng
        fireEvent.change(selectClass, { target: { value: '' } })
        fireEvent.change(dateInput, { target: { value: '' } })
        fireEvent.change(reasonInput, { target: { value: '    ' } })

        fireEvent.click(screen.getByTestId('btn-preview-drop'))

        // Không mở modal
        expect(screen.queryByTestId('drop-modal')).toBeNull()

        // Lỗi hiển thị đúng từng trường
        const classError = screen.getByTestId('select-class-error')
        const dateError = screen.getByTestId('input-effective-date-error')
        const reasonError = screen.getByTestId('input-reason-error')
        expect(classError.textContent).toContain('Vui lòng chọn lớp học')
        expect(dateError.textContent).toContain('Vui lòng chọn ngày hiệu lực')
        expect(reasonError.textContent).toContain('không được chỉ chứa khoảng trắng')

        // Kiểm tra aria & viền has-error
        expect(selectClass.classList.contains('has-error')).toBe(true)
        expect(selectClass.getAttribute('aria-invalid')).toBe('true')
        expect(selectClass.getAttribute('aria-describedby')).toBe('select-class-error')

        expect(dateInput.classList.contains('has-error')).toBe(true)
        expect(dateInput.getAttribute('aria-invalid')).toBe('true')
        expect(dateInput.getAttribute('aria-describedby')).toBe('input-effective-date-error')

        expect(reasonInput.classList.contains('has-error')).toBe(true)
        expect(reasonInput.getAttribute('aria-invalid')).toBe('true')
        expect(reasonInput.getAttribute('aria-describedby')).toBe('input-reason-error')

        // Cuộn và focus vào trường lỗi đầu tiên (lớp học)
        expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
        expect(document.activeElement).toBe(selectClass)

        // Sửa chọn lớp hợp lệ
        fireEvent.change(selectClass, { target: { value: 'cls-drop-1' } })
        expect(selectClass.classList.contains('has-error')).toBe(false)
        expect(selectClass.getAttribute('aria-invalid')).toBe('false')

        // Sửa ngày hợp lệ
        fireEvent.change(dateInput, { target: { value: '2026-12-01' } })
        expect(dateInput.classList.contains('has-error')).toBe(false)

        // Sửa lý do hợp lệ
        fireEvent.change(reasonInput, { target: { value: 'Thôi học do chuyển nơi sinh sống' } })
        expect(reasonInput.classList.contains('has-error')).toBe(false)

        // 2. Kiểm thử lỗi Backend: map vào trường (lý do)
        const dropMock = vi.spyOn(studentLifecycleApi, 'dropStudent')
        dropMock.mockRejectedValueOnce(new Error('Lý do thôi học không hợp lệ'))

        fireEvent.click(screen.getByTestId('btn-preview-drop'))
        expect(screen.getByTestId('drop-modal')).toBeDefined()
        fireEvent.click(screen.getByTestId('btn-confirm-drop'))

        await waitFor(() => {
            expect(screen.getByTestId('input-reason-error').textContent).toContain('Lý do thôi học không hợp lệ')
        })

        // 3. Kiểm thử lỗi Backend: lỗi mạng / chung -> action alert + toast
        dropMock.mockRejectedValueOnce(new Error('Mất kết nối mạng tới máy chủ'))
        fireEvent.click(screen.getByTestId('btn-preview-drop'))
        fireEvent.click(screen.getByTestId('btn-confirm-drop'))

        await waitFor(() => {
            const actionAlert = document.querySelector('.lifecycle-action-alert')
            expect(actionAlert).not.toBeNull()
            expect(actionAlert?.textContent).toContain('Không thể kết nối tới máy chủ')

            const toast = document.querySelector('.leads-toast-error')
            expect(toast).not.toBeNull()
            expect(toast?.textContent).toContain('Không thể kết nối tới máy chủ')
        })

        // 4. Sửa và gửi lại thành công
        dropMock.mockResolvedValueOnce({
            message: 'Thôi học thành công',
            data: { scope: 'single' },
        })
        fireEvent.click(screen.getByTestId('btn-preview-drop'))
        fireEvent.click(screen.getByTestId('btn-confirm-drop'))

        await waitFor(() => {
            expect(screen.getByTestId('alert-success').textContent).toContain('Xử lý thôi học')
        })
    })
})
