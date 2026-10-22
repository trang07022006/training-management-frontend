// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { type ReactNode, useEffect } from 'react'
import { StudentAttendanceHistoryPage } from './StudentAttendanceHistoryPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import * as historyApi from '../api/attendanceHistoryApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

function RoleSessionWrapper({
    role = 'trainee',
    children,
}: {
    role?: string
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()

    useEffect(() => {
        if (!hasSession) {
            startSession({ accessToken: 'mock-student-token', refreshToken: 'mock-refresh' }, role)
        }
    }, [hasSession, startSession, role])

    if (!hasSession) {
        return <div>Initializing session...</div>
    }

    return <>{children}</>
}

describe('SCRUM-258 AC1: Student Personal Attendance History and Attendance Rate', () => {
    it('renders attendance history list, status badges, and class-wide attendance rate', async () => {
        const mockData: historyApi.StudentAttendanceHistoryData = {
            student: {
                id: 'student-1',
                student_code: 'HV001',
                full_name: 'Nguyễn Văn A',
                email: 'nva@ictu.edu.vn',
                program_name: 'Công nghệ thông tin',
            },
            enrolled_classes: [
                {
                    class_id: 'class-01',
                    class_code: 'CNTT-K25',
                    program_name: 'Công nghệ thông tin',
                },
                {
                    class_id: 'class-02',
                    class_code: 'CNTT-K26',
                    program_name: 'Công nghệ thông tin',
                },
            ],
            selected_class_id: 'class-01',
            class_info: {
                id: 'class-01',
                class_code: 'CNTT-K25',
                program_name: 'Công nghệ thông tin',
                threshold: 20,
            },
            summary: {
                scope: 'class_wide',
                present_count: 3,
                late_count: 1,
                excused_count: 1,
                unexcused_count: 1,
                unrecorded_ended_count: 0,
                future_count: 2,
                cancelled_count: 0,
                valid_sessions_count: 6,
                attendance_rate: 66.67,
                attendance_rate_formatted: '66.67%',
            },
            absence_warning: {
                total_sessions_N: 8,
                absent_sessions_A: 2,
                threshold_T: 20,
                max_allowed_absences_K: 1,
                remaining_absences_R: 0,
                warning_status: 'exceeded',
                warning_level: 'danger',
                warning_message: 'Bạn đã vắng 2/8 buổi, tương đương 25.0%, vượt ngưỡng 20%.',
                is_flagged: true,
                insufficient_data: false,
            },
            sessions: [
                {
                    schedule_id: 'sched-1',
                    class_id: 'class-01',
                    session_number: 1,
                    topic: 'Nhập môn',
                    learning_date: '2026-10-10',
                    shift: 'Ca 1',
                    start_time: '07:30:00',
                    end_time: '11:30:00',
                    subject_code: 'WEB101',
                    subject_name: 'Lập trình Web',
                    room_name: 'P.301',
                    instructor_name: 'Thầy Tuấn',
                    status: 'present',
                    status_label: 'Có mặt',
                    symbol: 'P',
                    color_token: 'green',
                    notes: 'Đúng giờ',
                    has_ended: true,
                },
                {
                    schedule_id: 'sched-2',
                    class_id: 'class-01',
                    session_number: 2,
                    topic: 'CSS Flexbox',
                    learning_date: '2026-10-10',
                    shift: 'Ca 2',
                    start_time: '13:30:00',
                    end_time: '17:30:00',
                    subject_code: 'WEB101',
                    subject_name: 'Lập trình Web',
                    room_name: 'P.301',
                    instructor_name: 'Thầy Tuấn',
                    status: 'late',
                    status_label: 'Đi muộn',
                    symbol: 'L',
                    color_token: 'yellow',
                    notes: 'Muộn 10p',
                    has_ended: true,
                },
                {
                    schedule_id: 'sched-3',
                    class_id: 'class-01',
                    session_number: 3,
                    topic: 'JavaScript Async',
                    learning_date: '2026-10-11',
                    shift: 'Ca 1',
                    start_time: '07:30:00',
                    end_time: '11:30:00',
                    subject_code: 'WEB101',
                    subject_name: 'Lập trình Web',
                    room_name: 'P.301',
                    instructor_name: 'Thầy Tuấn',
                    status: 'excused',
                    status_label: 'Vắng có phép',
                    symbol: 'E',
                    color_token: 'blue',
                    notes: 'Có đơn',
                    has_ended: true,
                },
            ],
            pagination: {
                page: 1,
                page_size: 20,
                total_items: 3,
                total_pages: 1,
            },
        }

        const getHistorySpy = vi.spyOn(historyApi, 'getMyAttendanceHistory').mockResolvedValue(mockData)

        render(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainee">
                        <StudentAttendanceHistoryPage />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('student-attendance-history-page')).toBeDefined()
        })

        // 1. Kiểm tra header và thông tin học viên
        expect(screen.getByText('Lịch sử điểm danh của tôi')).toBeDefined()
        expect(screen.getByText('Nguyễn Văn A')).toBeDefined()

        // 2. Kiểm tra tỷ lệ chuyên cần (AC1)
        expect(screen.getByTestId('attendance-rate-value').textContent).toContain('66.67%')
        expect(screen.getByText('Có mặt (P)')).toBeDefined()
        expect(screen.getByText('Đi muộn (L)')).toBeDefined()
        expect(screen.getByText('Vắng có phép (E)')).toBeDefined()
        expect(screen.getByText('Vắng không phép (U)')).toBeDefined()

        // 3. Hai buổi cùng ngày (2026-10-10) là hai dòng riêng biệt theo schedule_id
        expect(screen.getByTestId('session-row-sched-1')).toBeDefined()
        expect(screen.getByTestId('session-row-sched-2')).toBeDefined()

        // 4. Kiểm tra trạng thái hiển thị
        expect(screen.getByTestId('status-badge-present').textContent).toContain('Có mặt')
        expect(screen.getByTestId('status-badge-late').textContent).toContain('Đi muộn')
        expect(screen.getByTestId('status-badge-excused').textContent).toContain('Vắng có phép')

        // 5. Kiểm tra dropdown chọn lớp
        const classSelect = screen.getByTestId('class-select-dropdown') as HTMLSelectElement
        expect(classSelect).toBeDefined()
        expect(classSelect.value).toBe('class-01')

        // Thao tác đổi lớp
        fireEvent.change(classSelect, { target: { value: 'class-02' } })
        expect(getHistorySpy).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ class_id: 'class-02' })
        )
    })

    it('displays "Chưa có dữ liệu" when D = 0', async () => {
        const mockEmptyData: historyApi.StudentAttendanceHistoryData = {
            student: { id: 'st-01', full_name: 'Học viên Mới' },
            enrolled_classes: [{ class_id: 'cls-1', class_code: 'NEW-01' }],
            selected_class_id: 'cls-1',
            summary: {
                scope: 'class_wide',
                present_count: 0,
                late_count: 0,
                excused_count: 0,
                unexcused_count: 0,
                unrecorded_ended_count: 0,
                future_count: 10,
                cancelled_count: 0,
                valid_sessions_count: 0,
                attendance_rate: null,
                attendance_rate_formatted: 'Chưa có dữ liệu',
            },
            absence_warning: {
                total_sessions_N: 10,
                absent_sessions_A: 0,
                threshold_T: 20,
                max_allowed_absences_K: 2,
                remaining_absences_R: 2,
                warning_status: 'normal',
                warning_level: 'success',
                warning_message: 'Bạn đã vắng 0/10 buổi. Bạn có thể vắng thêm 2 buổi mà chưa vượt ngưỡng.',
                is_flagged: false,
                insufficient_data: false,
            },
            sessions: [],
            pagination: { page: 1, page_size: 20, total_items: 0, total_pages: 1 },
        }

        vi.spyOn(historyApi, 'getMyAttendanceHistory').mockResolvedValue(mockEmptyData)

        render(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainee">
                        <StudentAttendanceHistoryPage />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('attendance-rate-value').textContent).toContain('Chưa có dữ liệu')
        })
    })
})
