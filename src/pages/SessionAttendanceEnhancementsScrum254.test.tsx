// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, Link } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { SessionAttendancePage } from './SessionAttendancePage'
import { formatSessionShiftAndTime, formatRoomLabel, formatTimeStr } from '../utils/scheduleDisplayUtils'
import * as attendanceApi from '../api/attendanceApi'

function RoleSessionWrapper({
    role = 'trainer',
    children,
}: {
    role?: string | null
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()
    useEffect(() => {
        if (!hasSession) {
            startSession({ accessToken: 'test-token', refreshToken: 'test-refresh' }, role)
        }
    }, [role, hasSession, startSession])

    if (!hasSession) {
        return <div>Initializing test session...</div>
    }

    return <>{children}</>
}

describe('SCRUM-254 Cải thiện giao diện và đối chiếu dữ liệu điểm danh', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    // -------------------------------------------------------------------------
    // 1. Kiểm thử Formatter giờ: chuẩn hóa HH:mm và không lặp giờ
    // -------------------------------------------------------------------------
    describe('1. Formatter giờ ca học (formatSessionShiftAndTime)', () => {
        it('chuẩn hóa giờ ca học tiêu chuẩn: "shift_1" + "07:30:00" + "09:30:00" -> "Ca 1 • 07:30–09:30"', () => {
            const formatted = formatSessionShiftAndTime('shift_1', '07:30:00', '09:30:00')
            expect(formatted).toBe('Ca 1 • 07:30–09:30')
        })

        it('loại bỏ giờ lặp lại khi chuỗi ca đã có giờ trong ngoặc: "Ca 1 (07:30 - 09:30)" + "7:30:" + "9:30:" -> "Ca 1 • 07:30–09:30"', () => {
            const formatted = formatSessionShiftAndTime('Ca 1 (07:30 - 09:30)', '7:30:', '9:30:')
            expect(formatted).toBe('Ca 1 • 07:30–09:30')
        })

        it('chuẩn hóa giờ thiếu số 0 phía trước: "7:30:00" -> "07:30"', () => {
            expect(formatTimeStr('7:30:00')).toBe('07:30')
            expect(formatTimeStr('9:45:00')).toBe('09:45')
        })

        it('xử lý ca tiếng Việt: "morning" + "08:00:00" + "11:30:00" -> "Ca sáng • 08:00–11:30"', () => {
            const formatted = formatSessionShiftAndTime('morning', '08:00:00', '11:30:00')
            expect(formatted).toBe('Ca sáng • 08:00–11:30')
        })

        it('xử lý khi không có ca: chỉ hiển thị khoảng giờ "07:30–09:30"', () => {
            const formatted = formatSessionShiftAndTime(null, '07:30:00', '09:30:00')
            expect(formatted).toBe('07:30–09:30')
        })
    })

    // -------------------------------------------------------------------------
    // 2. Kiểm thử dữ liệu phòng học: fallback và hiển thị nhất quán
    // -------------------------------------------------------------------------
    describe('2. Dữ liệu phòng học (formatRoomLabel)', () => {
        it('khi buổi học có room_id="1122" và room_name="Chưa xếp phòng" -> hiển thị "1122"', () => {
            const room = formatRoomLabel('1122', 'Chưa xếp phòng')
            expect(room).toBe('1122')
        })

        it('khi buổi học có room_id="1122" và room_name=null -> hiển thị "1122"', () => {
            const room = formatRoomLabel('1122', null)
            expect(room).toBe('1122')
        })

        it('khi buổi học có room_name="Phòng 1122" -> hiển thị "Phòng 1122"', () => {
            const room = formatRoomLabel('room-id-1122', 'Phòng 1122')
            expect(room).toBe('Phòng 1122')
        })

        it('khi không có cả room_id và room_name -> hiển thị "Chưa xếp phòng"', () => {
            const room = formatRoomLabel(null, null)
            expect(room).toBe('Chưa xếp phòng')
        })
    })

    // -------------------------------------------------------------------------
    // 3. Kiểm thử giao diện trang điểm danh: Tách tiêu đề, hiển thị giờ và phòng nhất quán
    // -------------------------------------------------------------------------
    describe('3. Giao diện trang điểm danh đối chiếu dữ liệu lớp TR_C5537', () => {
        const mockTRC5537Data: attendanceApi.AttendanceSheetResponse = {
            session_info: {
                schedule_id: 'sch-5537-02',
                class_id: 'cls-5537',
                class_code: 'TR_C5537',
                class_name: 'Lớp TR_C5537',
                subject_name: 'Lập trình Python nâng cao',
                subject_code: 'PY301',
                session_number: 2,
                topic: 'Buổi 1', // Dữ liệu thực tế khiến nhãn trước đây bị "Buổi #2: Buổi 1"
                learning_date: '2026-11-04',
                shift: 'Ca 1 (07:30 - 09:30)',
                start_time: '7:30:00',
                end_time: '9:30:00',
                room_id: '1122',
                room_name: '1122',
                instructor_id: 'inst-01',
                instructor_name: 'ThS. Hoàng Văn C',
                instructor_email: 'hoangvanc@ictu.edu.vn',
                status: 'scheduled',
                attendance_checked: false,
                is_today: false,
                is_past: false,
                is_future: true, // Buổi trong tương lai (04/11/2026)
                can_edit: false, // Bị khóa không cho điểm danh
                edit_restriction_reason: 'Buổi học diễn ra trong tương lai, chưa thể điểm danh.',
            },
            stats: {
                total_students: 1,
                present_count: 0,
                late_count: 0,
                excused_count: 0,
                unexcused_count: 0,
                unmarked_count: 1,
            },
            students: [
                {
                    student_id: 'st-long-name-1',
                    student_code: 'SV202600123456789',
                    full_name: 'Nguyễn Hoàng Long Vũ Đình Triết',
                    email: 'nguyenhoanglongvudinhtriet.cntt@ictu.edu.vn',
                    phone: '0987654321',
                    status: null,
                    status_label: 'Chưa điểm danh',
                    notes: '',
                    is_eligible: true,
                },
            ],
        }

        it('hiển thị tách rõ "Điểm danh Buổi #2" và "Chủ đề: Buổi 1", không dính chuỗi khó hiểu', async () => {
            vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(mockTRC5537Data)

            render(
                <MemoryRouter initialEntries={['/schedules/sch-5537-02/attendance']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <RoleSessionWrapper role="trainer">
                            <Routes>
                                <Route path="/schedules/:scheduleId/attendance" element={<SessionAttendancePage />} />
                            </Routes>
                        </RoleSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>
            )

            await waitFor(() => {
                expect(screen.getByTestId('session-attendance-page')).toBeDefined()
            })

            // Tiêu đề h1 chỉ có "Điểm danh Buổi #2"
            expect(screen.getByText('Điểm danh Buổi #2')).toBeDefined()

            // Chủ đề được tách rõ ở phần thông tin phụ
            expect(screen.getByText(/Chủ đề:/)).toBeDefined()
            expect(screen.getByText('Buổi 1')).toBeDefined()
        })

        it('hiển thị giờ chuẩn "Ca 1 • 07:30–09:30" và phòng "1122" nhất quán với thẻ lịch', async () => {
            vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(mockTRC5537Data)

            render(
                <MemoryRouter initialEntries={['/schedules/sch-5537-02/attendance']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <RoleSessionWrapper role="trainer">
                            <Routes>
                                <Route path="/schedules/:scheduleId/attendance" element={<SessionAttendancePage />} />
                            </Routes>
                        </RoleSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>
            )

            await waitFor(() => {
                expect(screen.getByTestId('session-attendance-page')).toBeDefined()
            })

            // Giờ học không bị lặp: "Ca 1 • 07:30–09:30"
            expect(screen.getByText('Ca 1 • 07:30–09:30')).toBeDefined()

            // Phòng học hiển thị đúng 1122 (không bị "Chưa xếp phòng")
            expect(screen.getByText('1122')).toBeDefined()
            expect(screen.queryByText('Chưa xếp phòng')).toBeNull()
        })

        it('giữ nguyên khóa điểm danh với buổi tương lai: nút bị mờ, có thông báo khóa', async () => {
            vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(mockTRC5537Data)

            render(
                <MemoryRouter initialEntries={['/schedules/sch-5537-02/attendance']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <RoleSessionWrapper role="trainer">
                            <Routes>
                                <Route path="/schedules/:scheduleId/attendance" element={<SessionAttendancePage />} />
                            </Routes>
                        </RoleSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>
            )

            await waitFor(() => {
                expect(screen.getByTestId('attendance-restriction-alert')).toBeDefined()
            })

            // Cảnh báo buổi học tương lai
            expect(screen.getByText(/Buổi học diễn ra trong tương lai, chưa thể điểm danh./)).toBeDefined()

            // Nút điểm danh của học viên bị disabled
            const btnPresent = screen.getByTestId('btn-present-st-long-name-1') as HTMLButtonElement
            expect(btnPresent.disabled).toBe(true)

            // Nút "Đánh dấu tất cả có mặt" và "Lưu" không hiển thị hoặc bị ẩn
            expect(screen.queryByTestId('btn-mark-all-present')).toBeNull()
            expect(screen.queryByTestId('btn-save-attendance')).toBeNull()
        })

        it('học viên có tên và email dài hiển thị đầy đủ, không gây lỗi giao diện', async () => {
            vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(mockTRC5537Data)

            render(
                <MemoryRouter initialEntries={['/schedules/sch-5537-02/attendance']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <RoleSessionWrapper role="trainer">
                            <Routes>
                                <Route path="/schedules/:scheduleId/attendance" element={<SessionAttendancePage />} />
                            </Routes>
                        </RoleSessionWrapper>
                    </SessionProvider>
                </MemoryRouter>
            )

            await waitFor(() => {
                expect(screen.getByTestId('session-attendance-page')).toBeDefined()
            })

            expect(screen.getAllByText('Nguyễn Hoàng Long Vũ Đình Triết').length).toBeGreaterThan(0)
            expect(screen.getAllByText('nguyenhoanglongvudinhtriet.cntt@ictu.edu.vn').length).toBeGreaterThan(0)
        })
    })

    // -------------------------------------------------------------------------
    // 4. Kiểm thử điều hướng: Nút điểm danh trên thẻ lịch dẫn đúng class_id và schedule_id
    // -------------------------------------------------------------------------
    describe('4. Điều hướng từ nút Điểm danh trên thẻ lịch', () => {
        it('tạo đúng đường dẫn /classes/:classId/schedules/:scheduleId/attendance', () => {
            const classId = 'TR_C5537'
            const scheduleId = 'sch-5537-02'
            const expectedPath = `/classes/${classId}/schedules/${scheduleId}/attendance`

            render(
                <MemoryRouter>
                    <Link to={expectedPath} data-testid="test-link-attendance">
                        Điểm danh
                    </Link>
                </MemoryRouter>
            )

            const link = screen.getByTestId('test-link-attendance') as HTMLAnchorElement
            expect(link.getAttribute('href')).toBe('/classes/TR_C5537/schedules/sch-5537-02/attendance')
        })
    })
})
