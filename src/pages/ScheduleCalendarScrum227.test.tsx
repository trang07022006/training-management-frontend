// @vitest-environment jsdom
/**
 * Automated Tests cho SCRUM-227 Frontend:
 * - AC 1: Chuyển đổi giữa chế độ tuần và tháng.
 * - AC 2: Lọc theo lớp, giảng viên hoặc phòng.
 * - AC 3: Bấm vào một buổi mở được chi tiết buổi học.
 * - AC 4: Hiển thị responsive trên thiết bị di động.
 */

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import { ScheduleCalendarPage } from './ScheduleCalendarPage'

const mockRequest = vi.fn()

function formatDateISO(d: Date): string {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const todayStr = formatDateISO(new Date())

// Mock useSession hook
vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        hasSession: true,
        user: { id: 'u-admin-1', role: 'admin', name: 'Quản trị viên' },
        permissions: ['course.view', 'course.manage'],
        request: mockRequest,
    }),
}))

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('SCRUM-227: Thời khóa biểu dạng lịch tuần và tháng', () => {
    const mockSchedules = [
        {
            id: 'cal-sch-1',
            class_id: 'cls-101',
            class_code: 'CNTT-K21A',
            session_number: 1,
            topic: 'Bài 1: Giới thiệu khóa học',
            learning_date: todayStr,
            day_of_week: 'Hôm nay',
            shift: 'Ca 1 (07:30 - 09:30)',
            start_time: '07:30:00',
            end_time: '09:30:00',
            room_id: 'P201',
            instructor_id: 'inst-1',
            instructor_name: 'TS. Nguyễn Văn A',
            instructor_email: 'nguyenvana@ictu.edu.vn',
            subject_name: 'Lập trình Web',
            subject_code: 'WEB101',
            status: 'scheduled',
            cancellation_reason: null,
            attendance_checked: false,
        },
        {
            id: 'cal-sch-2',
            class_id: 'cls-102',
            class_code: 'KTPM-K22B',
            session_number: 2,
            topic: 'Bài 2: Thiết kế giao diện React',
            learning_date: todayStr,
            day_of_week: 'Hôm nay',
            shift: 'Ca 2 (09:45 - 11:45)',
            start_time: '09:45:00',
            end_time: '11:45:00',
            room_id: 'Lab 3',
            instructor_id: 'inst-2',
            instructor_name: 'ThS. Trần Thị B',
            instructor_email: 'tranthib@ictu.edu.vn',
            subject_name: 'Công nghệ phần mềm',
            subject_code: 'SE202',
            status: 'cancelled',
            cancellation_reason: 'Giảng viên bận công tác đột xuất',
            attendance_checked: false,
        },
    ]

    const mockClasses = [
        { id: 'cls-101', class_code: 'CNTT-K21A', class_name: 'Lớp CNTT K21A' },
        { id: 'cls-102', class_code: 'KTPM-K22B', class_name: 'Lớp KTPM K22B' },
    ]

    const mockInstructors = [
        { id: 'inst-1', name: 'TS. Nguyễn Văn A', email: 'nguyenvana@ictu.edu.vn' },
        { id: 'inst-2', name: 'ThS. Trần Thị B', email: 'tranthib@ictu.edu.vn' },
    ]

    const makeMockResponse = (data: any, status = 200, ok = true) =>
        ({
            ok,
            status,
            json: async () => data,
        } as unknown as Response)

    beforeEach(() => {
        vi.clearAllMocks()
        mockRequest.mockImplementation((path: string) => {
            if (path.includes('/schedules/calendar')) {
                return Promise.resolve(
                    makeMockResponse({
                        code: 'CALENDAR_SCHEDULES_RETRIEVED',
                        data: {
                            total: mockSchedules.length,
                            view_mode: path.includes('view_mode=month') ? 'month' : 'week',
                            schedules: mockSchedules,
                        },
                    })
                )
            }
            if (path.includes('/classes')) {
                return Promise.resolve(
                    makeMockResponse({
                        data: { items: mockClasses, total: mockClasses.length },
                    })
                )
            }
            if (path.includes('/users')) {
                return Promise.resolve(
                    makeMockResponse({
                        data: { items: mockInstructors, total: mockInstructors.length },
                    })
                )
            }
            return Promise.resolve(makeMockResponse({ data: [] }))
        })
    })

    it('hiển thị mặc định chế độ xem theo tuần và chuyển đổi sang chế độ xem theo tháng (AC 1)', async () => {
        render(
            <MemoryRouter>
                <ScheduleCalendarPage />
            </MemoryRouter>
        )

        // Kiểm tra tiêu đề và chế độ tuần mặc định
        expect(screen.getByTestId('schedule-calendar-page')).toBeDefined()
        expect(screen.getByTestId('btn-view-week')).toBeDefined()
        expect(screen.getByTestId('btn-view-month')).toBeDefined()

        await waitFor(() => {
            expect(screen.getByTestId('week-calendar-view')).toBeDefined()
        })

        // Chuyển sang chế độ xem theo Tháng
        fireEvent.click(screen.getByTestId('btn-view-month'))

        await waitFor(() => {
            expect(screen.getByTestId('month-calendar-view')).toBeDefined()
        })

        // Chuyển lại chế độ Tuần
        fireEvent.click(screen.getByTestId('btn-view-week'))

        await waitFor(() => {
            expect(screen.getByTestId('week-calendar-view')).toBeDefined()
        })
    })

    it('cho phép điều hướng thời gian Trước, Sau và Hôm nay (AC 1)', async () => {
        render(
            <MemoryRouter>
                <ScheduleCalendarPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('period-title')).toBeDefined()
        })

        const initialTitle = screen.getByTestId('period-title').textContent

        // Bấm Sau →
        fireEvent.click(screen.getByTestId('btn-next-period'))
        await waitFor(() => {
            expect(screen.getByTestId('period-title').textContent).not.toEqual(initialTitle)
        })

        // Bấm Trước ←
        fireEvent.click(screen.getByTestId('btn-prev-period'))
        await waitFor(() => {
            expect(screen.getByTestId('period-title').textContent).toEqual(initialTitle)
        })

        // Bấm Hôm nay
        fireEvent.click(screen.getByTestId('btn-today'))
        expect(screen.getByTestId('period-title')).toBeDefined()
    })

    it('hỗ trợ bộ lọc theo Lớp học, Giảng viên và Phòng học kèm nút Xóa bộ lọc (AC 2)', async () => {
        render(
            <MemoryRouter>
                <ScheduleCalendarPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('filter-class-select')).toBeDefined()
        })

        const classSelect = screen.getByTestId('filter-class-select') as HTMLSelectElement
        const instSelect = screen.getByTestId('filter-instructor-select') as HTMLSelectElement
        const roomInput = screen.getByTestId('filter-room-input') as HTMLInputElement

        // Chọn lọc lớp học
        fireEvent.change(classSelect, { target: { value: 'cls-101' } })
        expect(classSelect.value).toBe('cls-101')

        // Chọn lọc giảng viên
        fireEvent.change(instSelect, { target: { value: 'inst-1' } })
        expect(instSelect.value).toBe('inst-1')

        // Nhập lọc phòng học
        fireEvent.change(roomInput, { target: { value: 'P201' } })
        expect(roomInput.value).toBe('P201')

        // Bấm Xóa bộ lọc
        fireEvent.click(screen.getByTestId('btn-reset-filters'))
        expect(classSelect.value).toBe('')
        expect(instSelect.value).toBe('')
        expect(roomInput.value).toBe('')
    })

    it('bấm vào một buổi mở được popup xem chi tiết buổi học (AC 3)', async () => {
        render(
            <MemoryRouter>
                <ScheduleCalendarPage />
            </MemoryRouter>
        )

        // Đợi thẻ buổi học xuất hiện trong tuần
        await waitFor(() => {
            expect(screen.getByTestId('session-card-cal-sch-2')).toBeDefined()
        })

        // Bấm vào buổi học #2 (buổi bị hủy)
        fireEvent.click(screen.getByTestId('session-card-cal-sch-2'))

        // Modal chi tiết buổi học hiển thị
        await waitFor(() => {
            expect(screen.getByTestId('schedule-detail-modal')).toBeDefined()
        })

        // Kiểm tra thông tin hiển thị trong modal
        expect(screen.getByTestId('detail-topic').textContent).toContain('Bài 2: Thiết kế giao diện React')
        expect(screen.getByTestId('detail-room').textContent).toContain('Lab 3')
        expect(screen.getByTestId('detail-instructor').textContent).toContain('ThS. Trần Thị B')
        expect(screen.getByTestId('detail-status').textContent).toContain('Đã huỷ')
        expect(screen.getByTestId('detail-cancelled-alert')).toBeDefined()
        expect(screen.getByText(/Giảng viên bận công tác đột xuất/)).toBeDefined()

        // Bấm nút Đóng
        fireEvent.click(screen.getByTestId('btn-close-detail-modal'))

        await waitFor(() => {
            expect(screen.queryByTestId('schedule-detail-modal')).toBeNull()
        })
    })
})
