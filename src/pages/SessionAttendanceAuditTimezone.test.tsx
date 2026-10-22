// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { SessionAttendancePage } from './SessionAttendancePage'
import * as attendanceApi from '../api/attendanceApi'
import { formatAuditDateTime } from '../utils/dateUtils'

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

const mockSessionSheet: attendanceApi.AttendanceSheetResponse = {
    session_info: {
        schedule_id: 'sch-scrum-254',
        class_id: 'cls-101',
        class_code: 'TR_C5537',
        class_name: 'Lớp Lập trình Web',
        subject_name: 'Lập trình TypeScript nâng cao',
        session_number: 2,
        topic: 'Quản lý state và kiểm toán hệ thống',
        learning_date: '2026-10-19', // Ngày học của buổi
        shift: 'Ca 1',
        start_time: '07:30:00',
        end_time: '09:30:00',
        room_name: 'Phòng 1122',
        instructor_name: 'Giảng viên A',
        status: 'completed',
        attendance_checked: true,
        is_today: false,
        is_past: true,
        is_future: false,
        can_edit: true,
        edit_restriction_reason: null,
    },
    stats: {
        total_students: 1,
        present_count: 0,
        late_count: 0,
        excused_count: 1,
        unexcused_count: 0,
        unmarked_count: 0,
    },
    pagination: {
        page: 1,
        limit: 10,
        total_items: 1,
        total_pages: 1,
    },
    students: [
        {
            student_id: 'stu-764',
            student_code: 'STU000764',
            full_name: 'Nguyễn Văn Minh',
            email: 'stu764@student.edu.vn',
            status: 'excused',
            status_label: 'Vắng có phép',
            notes: 'Sửa sau nửa đêm',
            is_eligible: true,
        },
    ],
}

describe('SCRUM-254: Lịch sử điểm danh & múi giờ Asia/Ho_Chi_Minh', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('1. Khớp bằng chứng sự cố: 17:25:22 UTC hiển thị đúng 00:25:22 20/10/2026 giờ Việt Nam', async () => {
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(mockSessionSheet)

        const mockLogs: attendanceApi.AttendanceAuditLogItem[] = [
            {
                id: 'log-stu-764',
                schedule_id: 'sch-scrum-254',
                student_id: 'stu-764',
                student_code: 'STU000764',
                student_name: 'Nguyễn Văn Minh',
                old_status: 'late',
                old_status_label: 'Đi muộn',
                new_status: 'excused',
                new_status_label: 'Vắng có phép',
                reason: 'Phụ huynh xin phép muộn do sự cố',
                performed_by: 'usr-trainer',
                performer_name: 'Giàng A Tùng',
                created_at: '2026-10-19T17:25:22.233764Z', // UTC lưu trong DB
            },
        ]
        vi.spyOn(attendanceApi, 'getSessionAttendanceHistory').mockResolvedValue(mockLogs)

        render(
            <MemoryRouter initialEntries={['/schedules/sch-scrum-254/attendance']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainer">
                        <Routes>
                            <Route path="/schedules/:scheduleId/attendance" element={<SessionAttendancePage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-open-history')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-open-history'))

        await waitFor(() => {
            expect(screen.getByTestId('history-modal')).toBeDefined()
        })

        // Thời điểm sửa hiển thị theo Asia/Ho_Chi_Minh: 00:25:22 20/10/2026 (không lệch 7 giờ)
        const timeEl = screen.getByTestId('history-time-log-stu-764')
        expect(timeEl.textContent).toBe('00:25:22 20/10/2026')
    })

    it('2. Tách rõ ngày học của buổi (19/10/2026) khỏi thời điểm chỉnh sửa (20/10/2026)', async () => {
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(mockSessionSheet)

        const mockLogs: attendanceApi.AttendanceAuditLogItem[] = [
            {
                id: 'log-midnight-rollover',
                schedule_id: 'sch-scrum-254',
                student_id: 'stu-764',
                student_code: 'STU000764',
                student_name: 'Nguyễn Văn Minh',
                old_status: 'present',
                old_status_label: 'Có mặt',
                new_status: 'excused',
                new_status_label: 'Vắng có phép',
                performed_by: 'usr-1',
                performer_name: 'Quản trị viên',
                created_at: '2026-10-19T17:25:22.233764Z',
            },
        ]
        vi.spyOn(attendanceApi, 'getSessionAttendanceHistory').mockResolvedValue(mockLogs)

        render(
            <MemoryRouter initialEntries={['/schedules/sch-scrum-254/attendance']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainer">
                        <Routes>
                            <Route path="/schedules/:scheduleId/attendance" element={<SessionAttendancePage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-open-history')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-open-history'))

        await waitFor(() => {
            expect(screen.getByTestId('history-modal')).toBeDefined()
        })

        // Tiêu đề modal hiển thị ngày học của buổi: 19/10/2026
        const sessionInfoEl = screen.getByTestId('history-session-info')
        expect(sessionInfoEl.textContent).toContain('Ngày học: 19/10/2026')
        expect(sessionInfoEl.textContent).toContain('Buổi #2')

        // Bản ghi lịch sử hiển thị thời điểm thao tác qua nửa đêm: 00:25:22 20/10/2026
        const timeEl = screen.getByTestId('history-time-log-midnight-rollover')
        expect(timeEl.textContent).toBe('00:25:22 20/10/2026')
    })

    it('3. Thứ tự lịch sử: hiển thị giảm dần theo thời gian tạo (mới nhất lên đầu)', async () => {
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(mockSessionSheet)

        const mockLogs: attendanceApi.AttendanceAuditLogItem[] = [
            {
                id: 'log-newer',
                schedule_id: 'sch-scrum-254',
                student_id: 'stu-764',
                student_code: 'STU000764',
                old_status: 'late',
                old_status_label: 'Đi muộn',
                new_status: 'excused',
                new_status_label: 'Vắng có phép',
                performed_by: 'usr-1',
                created_at: '2026-10-19T17:25:22.233764Z', // 00:25:22 20/10
            },
            {
                id: 'log-older',
                schedule_id: 'sch-scrum-254',
                student_id: 'stu-764',
                student_code: 'STU000764',
                old_status: 'present',
                old_status_label: 'Có mặt',
                new_status: 'late',
                new_status_label: 'Đi muộn',
                performed_by: 'usr-1',
                created_at: '2026-10-19T01:30:00Z', // 08:30:00 19/10
            },
        ]
        vi.spyOn(attendanceApi, 'getSessionAttendanceHistory').mockResolvedValue(mockLogs)

        render(
            <MemoryRouter initialEntries={['/schedules/sch-scrum-254/attendance']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainer">
                        <Routes>
                            <Route path="/schedules/:scheduleId/attendance" element={<SessionAttendancePage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByTestId('btn-open-history')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('btn-open-history'))

        await waitFor(() => {
            expect(screen.getByTestId('history-modal')).toBeDefined()
        })

        const timeNewer = screen.getByTestId('history-time-log-newer')
        const timeOlder = screen.getByTestId('history-time-log-older')
        expect(timeNewer.textContent).toBe('00:25:22 20/10/2026')
        expect(timeOlder.textContent).toBe('08:30:00 19/10/2026')

        // Kiểm tra thứ tự xuất hiện trong DOM
        const items = screen.getAllByTestId(/^history-item-/)
        expect(items[0].getAttribute('data-testid')).toBe('history-item-log-newer')
        expect(items[1].getAttribute('data-testid')).toBe('history-item-log-older')
    })

    it('4. Khách truy cập từ trình duyệt có múi giờ khác vẫn thấy đúng giờ Việt Nam (Asia/Ho_Chi_Minh)', () => {
        // formatAuditDateTime sử dụng Intl với timeZone Asia/Ho_Chi_Minh
        // Kiểm tra tính độc lập khỏi múi giờ của client máy chủ/trình duyệt
        const isoBug = '2026-10-19T17:25:22.233764Z'
        const formatted = formatAuditDateTime(isoBug)
        expect(formatted).toBe('00:25:22 20/10/2026')

        // Giả lập chuỗi legacy chưa có Z (DB cũ lưu UTC naive)
        const isoLegacy = '2026-10-19 17:25:22.233764'
        const formattedLegacy = formatAuditDateTime(isoLegacy)
        expect(formattedLegacy).toBe('00:25:22 20/10/2026')
    })
})
