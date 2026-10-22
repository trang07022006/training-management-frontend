// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { SessionAttendancePage } from './SessionAttendancePage'
import * as attendanceApi from '../api/attendanceApi'

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

const mockSheetData: attendanceApi.AttendanceSheetResponse = {
    session_info: {
        schedule_id: 'sch-1',
        class_id: 'cls-1',
        class_code: 'TR_C254',
        class_name: 'Lớp Lập trình Web',
        subject_name: 'Phát triển ứng dụng Web',
        subject_code: 'WEB201',
        session_number: 1,
        topic: 'Giới thiệu tổng quan và thiết lập môi trường',
        learning_date: '2026-10-19',
        shift: 'Sáng',
        start_time: '08:00:00',
        end_time: '11:30:00',
        room_name: 'Phòng Lab 201',
        instructor_name: 'Giảng viên Test',
        instructor_email: 'gv@ictu.edu.vn',
        status: 'scheduled',
        attendance_checked: false,
        is_today: true,
        is_past: false,
        is_future: false,
        can_edit: true,
        edit_restriction_reason: null,
    },
    stats: {
        total_students: 2,
        present_count: 0,
        late_count: 0,
        excused_count: 0,
        unexcused_count: 0,
        unmarked_count: 2,
    },
    students: [
        {
            student_id: 'st-1',
            student_code: 'SV001',
            full_name: 'Nguyễn Văn An',
            email: 'an@ictu.edu.vn',
            phone: '0912345671',
            status: null,
            status_label: 'Chưa điểm danh',
            notes: '',
            is_eligible: true,
        },
        {
            student_id: 'st-2',
            student_code: 'SV002',
            full_name: 'Trần Thị Bình',
            email: 'binh@ictu.edu.vn',
            phone: '0912345672',
            status: null,
            status_label: 'Chưa điểm danh',
            notes: '',
            is_eligible: true,
        },
    ],
}

describe('SessionAttendancePage (SCRUM-254)', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('renders session summary info and unmarked students on load', async () => {
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(mockSheetData)

        render(
            <MemoryRouter initialEntries={['/schedules/sch-1/attendance']}>
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
            expect(screen.getByTestId('session-attendance-page')).toBeDefined()
        })

        // Kiểm tra thông tin buổi học
        expect(screen.getByText(/Điểm danh Buổi #1/)).toBeDefined()
        expect(screen.getAllByText(/TR_C254/).length).toBeGreaterThan(0)
        expect(screen.getByText(/Phát triển ứng dụng Web/)).toBeDefined()
        expect(screen.getByTestId('badge-today')).toBeDefined()

        // Kiểm tra thống kê ban đầu
        expect(screen.getByTestId('stat-total').textContent).toBe('2')
        expect(screen.getByTestId('stat-unmarked').textContent).toBe('2')

        // Kiểm tra danh sách học viên
        expect(screen.getAllByText('Nguyễn Văn An').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Trần Thị Bình').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Chưa chọn trạng thái').length).toBe(2)
    })

    it('marks all students present when clicking Mark All Present', async () => {
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(mockSheetData)

        render(
            <MemoryRouter initialEntries={['/schedules/sch-1/attendance']}>
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
            expect(screen.getByTestId('btn-mark-all-present')).toBeDefined()
        })

        // Bấm nút đánh dấu tất cả có mặt
        fireEvent.click(screen.getByTestId('btn-mark-all-present'))

        // Sau khi bấm, thống kê có mặt cập nhật thành 2
        await waitFor(() => {
            expect(screen.getByTestId('stat-present').textContent).toBe('2')
            expect(screen.getByTestId('stat-unmarked').textContent).toBe('0')
        })

        // Cả 2 nút "Có mặt" phải có class active
        expect(screen.getByTestId('btn-present-st-1').className).toContain('active')
        expect(screen.getByTestId('btn-present-st-2').className).toContain('active')
    })

    it('allows changing individual student status after marking all present', async () => {
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(mockSheetData)

        render(
            <MemoryRouter initialEntries={['/schedules/sch-1/attendance']}>
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
            expect(screen.getByTestId('btn-mark-all-present')).toBeDefined()
        })

        // 1. Đánh dấu tất cả có mặt
        fireEvent.click(screen.getByTestId('btn-mark-all-present'))

        // 2. Chuyển học viên st-2 sang "Đi muộn"
        fireEvent.click(screen.getByTestId('btn-late-st-2'))

        // Kiểm tra thống kê cập nhật: 1 có mặt, 1 đi muộn
        await waitFor(() => {
            expect(screen.getByTestId('stat-present').textContent).toBe('1')
            expect(screen.getByTestId('stat-late').textContent).toBe('1')
        })

        expect(screen.getByTestId('btn-present-st-1').className).toContain('active')
        expect(screen.getByTestId('btn-late-st-2').className).toContain('active')
    })

    it('filters students by search query without losing other students on mark all', async () => {
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(mockSheetData)

        render(
            <MemoryRouter initialEntries={['/schedules/sch-1/attendance']}>
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
            expect(screen.getByTestId('attendance-search-input')).toBeDefined()
        })

        // Gõ tìm kiếm "An"
        fireEvent.change(screen.getByTestId('attendance-search-input'), { target: { value: 'An' } })

        // Chỉ hiển thị Nguyễn Văn An, ẩn Trần Thị Bình
        expect(screen.getAllByText('Nguyễn Văn An').length).toBeGreaterThan(0)
        expect(screen.queryByText('Trần Thị Bình')).toBeNull()

        // Bấm "Đánh dấu tất cả có mặt"
        fireEvent.click(screen.getByTestId('btn-mark-all-present'))

        // Xóa tìm kiếm
        fireEvent.change(screen.getByTestId('attendance-search-input'), { target: { value: '' } })

        // Cả 2 học viên đều được đánh dấu có mặt (phạm vi "Tất cả" toàn bộ danh sách)
        expect(screen.getByTestId('btn-present-st-1').className).toContain('active')
        expect(screen.getByTestId('btn-present-st-2').className).toContain('active')
    })

    it('displays restriction alert and disables edit buttons when can_edit is false', async () => {
        const restrictedData: attendanceApi.AttendanceSheetResponse = {
            ...mockSheetData,
            session_info: {
                ...mockSheetData.session_info,
                is_today: false,
                is_past: true,
                can_edit: false,
                edit_restriction_reason: 'Chỉ Quản lý đào tạo mới được phép chỉnh sửa điểm danh của buổi học trong quá khứ.',
            },
        }
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(restrictedData)

        render(
            <MemoryRouter initialEntries={['/schedules/sch-1/attendance']}>
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
            expect(screen.getByTestId('attendance-restriction-alert')).toBeDefined()
        })

        expect(screen.getByText(/Chỉ Quản lý đào tạo mới được phép chỉnh sửa/)).toBeDefined()
        expect(screen.queryByTestId('btn-mark-all-present')).toBeNull()
        expect(screen.queryByTestId('btn-save-attendance')).toBeNull()

        // Các nút trạng thái bị disable
        expect((screen.getByTestId('btn-present-st-1') as HTMLButtonElement).disabled).toBe(true)
        expect((screen.getByTestId('btn-late-st-1') as HTMLButtonElement).disabled).toBe(true)
    })

    it('shows error state when API call fails', async () => {
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockRejectedValue(
            new Error('Không tìm thấy buổi học.'),
        )

        render(
            <MemoryRouter initialEntries={['/schedules/sch-invalid/attendance']}>
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
            expect(screen.getByTestId('attendance-error-state')).toBeDefined()
        })
        expect(screen.getByText(/Không tìm thấy buổi học/)).toBeDefined()
    })

    it('saves attendance successfully and shows success notification', async () => {
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(mockSheetData)
        const saveSpy = vi.spyOn(attendanceApi, 'saveSessionAttendance').mockResolvedValue({
            message: 'Lưu kết quả điểm danh thành công cho 2 học viên.',
            data: {
                ...mockSheetData,
                session_info: { ...mockSheetData.session_info, attendance_checked: true },
                stats: { ...mockSheetData.stats, present_count: 2, unmarked_count: 0 },
                students: mockSheetData.students.map((s) => ({ ...s, status: 'present', status_label: 'Có mặt' })),
            },
        })

        render(
            <MemoryRouter initialEntries={['/schedules/sch-1/attendance']}>
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
            expect(screen.getByTestId('btn-mark-all-present')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-mark-all-present'))
        fireEvent.click(screen.getByTestId('btn-save-attendance'))

        await waitFor(() => {
            expect(saveSpy).toHaveBeenCalledTimes(1)
            expect(screen.getByTestId('attendance-success-alert')).toBeDefined()
        })

        expect(screen.getByText(/Lưu kết quả điểm danh thành công/)).toBeDefined()
    })

    it('handles save error and displays error alert without wiping entered data', async () => {
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(mockSheetData)
        vi.spyOn(attendanceApi, 'saveSessionAttendance').mockRejectedValue(
            new Error('Lỗi kết nối máy chủ khi lưu điểm danh.'),
        )

        render(
            <MemoryRouter initialEntries={['/schedules/sch-1/attendance']}>
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
            expect(screen.getByTestId('btn-mark-all-present')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-mark-all-present'))
        fireEvent.click(screen.getByTestId('btn-save-attendance'))

        await waitFor(() => {
            expect(screen.getByTestId('attendance-error-alert')).toBeDefined()
        })

        expect(screen.getByTestId('attendance-error-alert').textContent).toMatch(/Không thể kết nối|Lỗi/i)
        expect(screen.getByTestId('btn-present-st-1').className).toContain('active')
        expect(screen.getByTestId('btn-present-st-2').className).toContain('active')
    })

    it('opens and closes audit history modal with log entries', async () => {
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(mockSheetData)
        const mockLogs: attendanceApi.AttendanceAuditLogItem[] = [
            {
                id: 'log-1',
                schedule_id: 'sch-1',
                student_id: 'st-1',
                student_name: 'Nguyễn Văn An',
                student_code: 'SV001',
                old_status: 'present',
                old_status_label: 'Có mặt',
                new_status: 'excused',
                new_status_label: 'Vắng có phép',
                reason: 'Xin nghỉ phép có xác nhận',
                performed_by: 'user-1',
                performer_name: 'Giảng viên A',
                created_at: '2026-10-19T08:30:00Z',
            },
        ]
        const historySpy = vi.spyOn(attendanceApi, 'getSessionAttendanceHistory').mockResolvedValue(mockLogs)

        render(
            <MemoryRouter initialEntries={['/schedules/sch-1/attendance']}>
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
            expect(historySpy).toHaveBeenCalledTimes(1)
            expect(screen.getByTestId('history-modal')).toBeDefined()
        })

        expect(screen.getByText(/Lịch sử chỉnh sửa điểm danh/)).toBeDefined()
        expect(screen.getByText(/Giảng viên A/)).toBeDefined()
        expect(screen.getByText(/Xin nghỉ phép có xác nhận/)).toBeDefined()

        fireEvent.click(screen.getByTestId('btn-close-history'))
        expect(screen.queryByTestId('history-modal')).toBeNull()
    })

    it('allows mobile card buttons interaction', async () => {
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(mockSheetData)

        render(
            <MemoryRouter initialEntries={['/schedules/sch-1/attendance']}>
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
            expect(screen.getByTestId('mobile-btn-present-st-1')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('mobile-btn-present-st-1'))
        expect(screen.getByTestId('mobile-btn-present-st-1').className).toContain('active')
        expect(screen.getByTestId('badge-status-st-1').textContent).toBe('Có mặt')
    })
})
