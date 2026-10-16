// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ScheduleGeneratePage } from './ScheduleGeneratePage'
import { ApiError } from '../api/userApi'
import * as scheduleApi from '../api/scheduleApi'
import * as classApi from '../api/classApi'

// Mock useSession
const mockSession = {
    user: { id: 'user-1', name: 'Quản lý đào tạo', email: 'ql@ictu.edu.vn' },
    permissions: ['course.manage', 'course.view'],
    role: 'training_manager',
    roles: ['training_manager'],
    request: vi.fn(),
}

vi.mock('../auth/SessionProvider', () => ({
    useSession: () => mockSession,
}))

vi.mock('../api/classApi', () => ({
    getClassDetail: vi.fn(),
    getClassSubjects: vi.fn(),
}))

vi.mock('../api/userApi', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return {
        ...actual,
        fetchUsersApi: vi.fn().mockResolvedValue({ items: [] }),
    }
})

vi.mock('../api/scheduleApi', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return {
        ...actual,
        previewClassSchedule: vi.fn(),
        generateClassSchedule: vi.fn(),
    }
})

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('ScheduleGeneratePage - Error Handling & Business Rejection Feedback', () => {
    const fakeClass = {
        id: 'cls-101',
        class_code: 'L01-2026',
        program_id: 'prog-1',
        program_name: 'Kỹ thuật Phần mềm',
        expected_start_date: '2026-11-02',
        max_capacity: 30,
        enrolled_count: 20,
    }

    const fakeSubjects = [
        { id: 'cs-1', class_id: 'cls-101', subject_id: 'sub-math', subject_code: 'MATH101', subject_name: 'Toán cao cấp', credits: 3 },
        { id: 'cs-2', class_id: 'cls-101', subject_id: 'sub-prog', subject_code: 'PROG101', subject_name: 'Lập trình C++', credits: 4 },
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(classApi.getClassDetail).mockResolvedValue(fakeClass as any)
        vi.mocked(classApi.getClassSubjects).mockResolvedValue(fakeSubjects as any)
    })

    const renderPage = () => {
        return render(
            <MemoryRouter initialEntries={['/classes/cls-101/schedules/generate']}>
                <Routes>
                    <Route path="/classes/:classId/schedules/generate" element={<ScheduleGeneratePage />} />
                </Routes>
            </MemoryRouter>
        )
    }

    it('1. Thiếu quyền: Hiển thị đúng thông báo "Bạn không có quyền tạo thời khóa biểu cho lớp này."', async () => {
        vi.mocked(scheduleApi.previewClassSchedule).mockResolvedValue({
            class_id: 'cls-101',
            class_code: 'L01-2026',
            total_requested: 2,
            total_generated: 2,
            start_date: '2026-11-02',
            end_date: '2026-11-04',
            schedules: [
                { session_number: 1, learning_date: '2026-11-02', shift: 'Ca 1', start_time: '07:30', end_time: '09:30', topic: 'Buổi 1' },
            ] as any,
            skipped_holidays: [],
        })

        // Giả lập backend từ chối lưu vì thiếu quyền 403
        vi.mocked(scheduleApi.generateClassSchedule).mockRejectedValue(
            new ApiError('Bạn không có quyền tạo thời khóa biểu cho lớp này.', 'FORBIDDEN', 403)
        )

        renderPage()
        await waitFor(() => expect(screen.getByTestId('btn-preview-schedule')).toBeDefined())

        // Preview trước
        fireEvent.click(screen.getByTestId('btn-preview-schedule'))
        await waitFor(() => expect(screen.getByTestId('btn-confirm-save-schedule')).toBeDefined())

        // Bấm lưu
        fireEvent.click(screen.getByTestId('btn-confirm-save-schedule'))

        // Xác nhận hiển thị thông báo chính xác trong cả ToastPortal và Alert
        await waitFor(() => {
            const toastEl = screen.getByTestId('toast-container')
            expect(toastEl).toBeDefined()
            expect(toastEl.textContent).toContain('Bạn không có quyền tạo thời khóa biểu cho lớp này.')
        })
    })

    it('2. Môn không thuộc lớp: Hiển thị lý do và đánh dấu trường môn học', async () => {
        vi.mocked(scheduleApi.previewClassSchedule).mockRejectedValue(
            new ApiError('Môn học đã chọn không thuộc lớp này. Vui lòng chọn lại.', 'SUBJECT_NOT_IN_CLASS', 400, undefined, { field: 'subject_id' })
        )

        renderPage()
        await waitFor(() => expect(screen.getByTestId('btn-preview-schedule')).toBeDefined())

        fireEvent.click(screen.getByTestId('btn-preview-schedule'))

        await waitFor(() => {
            const toastEl = screen.getByTestId('toast-container')
            expect(toastEl.textContent).toContain('Môn học đã chọn không thuộc lớp này. Vui lòng chọn lại.')
            const selectEl = screen.getByLabelText(/Môn học áp dụng/i)
            expect(selectEl.className).toContain('is-invalid')
        })
    })

    it('3. Trùng giảng viên: Nêu rõ giảng viên, ngày, giờ và lớp bị trùng', async () => {
        const conflictMsg = 'Trùng lịch giảng viên: Giảng viên ThS. Lê Văn B đã có lịch dạy vào ngày 2026-11-02 lúc 07:30:00 - 09:30:00 (Lớp L01-JAVA).'
        vi.mocked(scheduleApi.previewClassSchedule).mockResolvedValue({
            class_id: 'cls-101',
            class_code: 'L01-2026',
            total_requested: 1,
            total_generated: 1,
            start_date: '2026-11-02',
            end_date: '2026-11-02',
            schedules: [{ session_number: 1, learning_date: '2026-11-02', shift: 'Ca 1', start_time: '07:30', end_time: '09:30', topic: 'Buổi 1' }] as any,
            skipped_holidays: [],
        })

        vi.mocked(scheduleApi.generateClassSchedule).mockRejectedValue(
            new ApiError(conflictMsg, 'SCHEDULE_CONFLICT_DETECTED', 409, undefined, {
                conflicts: [{
                    conflict_type: 'instructor',
                    session_number: 1,
                    learning_date: '2026-11-02',
                    start_time: '07:30:00',
                    end_time: '09:30:00',
                    instructor_name: 'ThS. Lê Văn B',
                    conflicting_class_code: 'L01-JAVA',
                    message: conflictMsg,
                }],
            })
        )

        renderPage()
        await waitFor(() => expect(screen.getByTestId('btn-preview-schedule')).toBeDefined())

        fireEvent.click(screen.getByTestId('btn-preview-schedule'))
        await waitFor(() => expect(screen.getByTestId('btn-confirm-save-schedule')).toBeDefined())

        fireEvent.click(screen.getByTestId('btn-confirm-save-schedule'))

        await waitFor(() => {
            const toastEl = screen.getByTestId('toast-container')
            expect(toastEl.textContent).toContain(conflictMsg)
            expect(toastEl.textContent).not.toContain('Lỗi khi lưu thời khóa biểu.')
        })
    })

    it('4. Trùng phòng: Nêu rõ phòng, ngày, giờ và lớp bị trùng', async () => {
        const conflictMsg = 'Trùng phòng học: Phòng P.301 đã có lịch sử dụng vào ngày 2026-11-02 lúc 07:30:00 - 09:30:00 (Lớp L01-JAVA).'
        vi.mocked(scheduleApi.previewClassSchedule).mockResolvedValue({
            class_id: 'cls-101',
            class_code: 'L01-2026',
            total_requested: 1,
            total_generated: 1,
            start_date: '2026-11-02',
            end_date: '2026-11-02',
            schedules: [{ session_number: 1, learning_date: '2026-11-02', shift: 'Ca 1', start_time: '07:30', end_time: '09:30', topic: 'Buổi 1' }] as any,
            skipped_holidays: [],
        })

        vi.mocked(scheduleApi.generateClassSchedule).mockRejectedValue(
            new ApiError(conflictMsg, 'SCHEDULE_CONFLICT_DETECTED', 409, undefined, {
                conflicts: [{
                    conflict_type: 'room',
                    session_number: 1,
                    learning_date: '2026-11-02',
                    start_time: '07:30:00',
                    end_time: '09:30:00',
                    room_id: 'P.301',
                    conflicting_class_code: 'L01-JAVA',
                    message: conflictMsg,
                }],
            })
        )

        renderPage()
        await waitFor(() => expect(screen.getByTestId('btn-preview-schedule')).toBeDefined())

        fireEvent.click(screen.getByTestId('btn-preview-schedule'))
        await waitFor(() => expect(screen.getByTestId('btn-confirm-save-schedule')).toBeDefined())

        fireEvent.click(screen.getByTestId('btn-confirm-save-schedule'))

        await waitFor(() => {
            const toastEl = screen.getByTestId('toast-container')
            expect(toastEl.textContent).toContain(conflictMsg)
            expect(toastEl.textContent).not.toContain('Lỗi khi lưu thời khóa biểu.')
        })
    })

    it('5. Lịch đã tồn tại: Nêu phạm vi lịch đã có và hướng dẫn ghi đè', async () => {
        const existsMsg = "Lớp học đã có 8 buổi học trong thời khóa biểu (từ ngày 02/11/2026 đến ngày 27/11/2026). Nếu bạn có quyền quản lý và muốn thay thế toàn bộ lịch này, vui lòng bật tùy chọn 'Ghi đè lịch đã có'."
        vi.mocked(scheduleApi.previewClassSchedule).mockResolvedValue({
            class_id: 'cls-101',
            class_code: 'L01-2026',
            total_requested: 8,
            total_generated: 8,
            start_date: '2026-11-02',
            end_date: '2026-11-27',
            schedules: [{ session_number: 1, learning_date: '2026-11-02', shift: 'Ca 1', start_time: '07:30', end_time: '09:30', topic: 'Buổi 1' }] as any,
            skipped_holidays: [],
        })

        vi.mocked(scheduleApi.generateClassSchedule).mockRejectedValue(
            new ApiError(existsMsg, 'SCHEDULE_ALREADY_EXISTS', 409)
        )

        renderPage()
        await waitFor(() => expect(screen.getByTestId('btn-preview-schedule')).toBeDefined())

        fireEvent.click(screen.getByTestId('btn-preview-schedule'))
        await waitFor(() => expect(screen.getByTestId('btn-confirm-save-schedule')).toBeDefined())

        fireEvent.click(screen.getByTestId('btn-confirm-save-schedule'))

        await waitFor(() => {
            const toastEl = screen.getByTestId('toast-container')
            expect(toastEl.textContent).toContain('8 buổi học')
            expect(toastEl.textContent).toContain('02/11/2026')
            expect(toastEl.textContent).toContain('Ghi đè lịch đã có')
        })
    })

    it('6. Thiếu dữ liệu bắt buộc: Đánh dấu viền đỏ (is-invalid) ngay tại trường', async () => {
        vi.mocked(scheduleApi.previewClassSchedule).mockRejectedValue(
            new ApiError('Ngày bắt đầu không được để trống.', 'START_DATE_REQUIRED', 400, undefined, { field: 'start_date' })
        )

        const { container } = renderPage()
        await waitFor(() => expect(screen.getByTestId('btn-preview-schedule')).toBeDefined())

        fireEvent.click(screen.getByTestId('btn-preview-schedule'))

        await waitFor(() => {
            const dateInput = screen.getByLabelText(/Ngày bắt đầu/i)
            expect(dateInput.className).toContain('is-invalid')
            const fieldError = container.querySelector('.field-error-text')
            expect(fieldError).not.toBeNull()
            expect(fieldError?.textContent).toContain('Ngày bắt đầu không được để trống.')
        })
    })

    it('7. Mất kết nối mạng: Thông báo không thể kết nối máy chủ', async () => {
        vi.mocked(scheduleApi.previewClassSchedule).mockResolvedValue({
            class_id: 'cls-101',
            class_code: 'L01-2026',
            total_requested: 1,
            total_generated: 1,
            start_date: '2026-11-02',
            end_date: '2026-11-02',
            schedules: [{ session_number: 1, learning_date: '2026-11-02', shift: 'Ca 1', start_time: '07:30', end_time: '09:30', topic: 'Buổi 1' }] as any,
            skipped_holidays: [],
        })

        vi.mocked(scheduleApi.generateClassSchedule).mockRejectedValue(new TypeError('Failed to fetch'))

        renderPage()
        await waitFor(() => expect(screen.getByTestId('btn-preview-schedule')).toBeDefined())

        fireEvent.click(screen.getByTestId('btn-preview-schedule'))
        await waitFor(() => expect(screen.getByTestId('btn-confirm-save-schedule')).toBeDefined())

        fireEvent.click(screen.getByTestId('btn-confirm-save-schedule'))

        await waitFor(() => {
            const toastEl = screen.getByTestId('toast-container')
            expect(toastEl.textContent).toMatch(/Không thể kết nối/i)
        })
    })

    it('8. Lỗi máy chủ không xác định (500): Hiển thị thông báo an toàn kèm mã tra cứu error_ref', async () => {
        const errorRef = 'ERR-A8F231D9'
        const safe500Msg = `Đã xảy ra lỗi máy chủ trong quá trình lưu thời khóa biểu. Vui lòng thử lại sau. (Mã tra cứu: ${errorRef})`

        vi.mocked(scheduleApi.previewClassSchedule).mockResolvedValue({
            class_id: 'cls-101',
            class_code: 'L01-2026',
            total_requested: 1,
            total_generated: 1,
            start_date: '2026-11-02',
            end_date: '2026-11-02',
            schedules: [{ session_number: 1, learning_date: '2026-11-02', shift: 'Ca 1', start_time: '07:30', end_time: '09:30', topic: 'Buổi 1' }] as any,
            skipped_holidays: [],
        })

        vi.mocked(scheduleApi.generateClassSchedule).mockRejectedValue(
            new ApiError(safe500Msg, 'INTERNAL_SERVER_ERROR', 500, undefined, { error_ref: errorRef })
        )

        renderPage()
        await waitFor(() => expect(screen.getByTestId('btn-preview-schedule')).toBeDefined())

        fireEvent.click(screen.getByTestId('btn-preview-schedule'))
        await waitFor(() => expect(screen.getByTestId('btn-confirm-save-schedule')).toBeDefined())

        fireEvent.click(screen.getByTestId('btn-confirm-save-schedule'))

        await waitFor(() => {
            const toastEl = screen.getByTestId('toast-container')
            expect(toastEl.textContent).toContain(errorRef)
            expect(toastEl.textContent).not.toContain('SQL')
            expect(toastEl.textContent).not.toContain('Traceback')
        })
    })

    it('9. Bảo toàn 100% dữ liệu nhập và bản xem trước khi API từ chối lưu', async () => {
        const previewItem = {
            session_number: 1,
            learning_date: '2026-11-02',
            shift: 'Ca 1',
            start_time: '07:30',
            end_time: '09:30',
            topic: 'Chủ đề xem trước 1',
        }

        vi.mocked(scheduleApi.previewClassSchedule).mockResolvedValue({
            class_id: 'cls-101',
            class_code: 'L01-2026',
            total_requested: 1,
            total_generated: 1,
            start_date: '2026-11-02',
            end_date: '2026-11-02',
            schedules: [previewItem] as any,
            skipped_holidays: [],
        })

        vi.mocked(scheduleApi.generateClassSchedule).mockRejectedValue(
            new ApiError('Phát hiện xung đột lịch.', 'SCHEDULE_CONFLICT_DETECTED', 409)
        )

        renderPage()
        await waitFor(() => expect(screen.getByTestId('btn-preview-schedule')).toBeDefined())

        // Preview
        fireEvent.click(screen.getByTestId('btn-preview-schedule'))
        await waitFor(() => expect(screen.getByText('Chủ đề xem trước 1')).toBeDefined())

        // Save fails
        fireEvent.click(screen.getByTestId('btn-confirm-save-schedule'))
        await waitFor(() => expect(screen.getByTestId('toast-container')).toBeDefined())

        // Bản xem trước và dữ liệu form vẫn còn nguyên vẹn trong DOM!
        expect(screen.getByText('Chủ đề xem trước 1')).toBeDefined()
        const dateInput = screen.getByLabelText(/Ngày bắt đầu/i) as HTMLInputElement
        expect(dateInput.value).toBe('2026-11-02')
    })
})
