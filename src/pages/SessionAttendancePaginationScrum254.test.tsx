// @vitest-environment jsdom
import { useEffect, type ReactNode } from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router'
import { SessionAttendancePage } from './SessionAttendancePage'
import * as attendanceApi from '../api/attendanceApi'
import { SessionProvider, useSession } from '../auth/SessionProvider'

// Tạo mock 25 học viên
const createMockStudents = (count: number = 25): attendanceApi.AttendanceStudentItem[] => {
    return Array.from({ length: count }, (_, i) => {
        const num = i + 1
        const codeNum = num < 10 ? `0${num}` : `${num}`
        return {
            student_id: `st-${codeNum}`,
            student_code: `SV_PAG_${codeNum}`,
            full_name: `Học viên Số ${codeNum}`,
            email: `student_${codeNum}@ictu.edu.vn`,
            phone: '0987654321',
            status: null,
            status_label: 'Chưa điểm danh',
            notes: null,
            is_eligible: true,
        }
    })
}

const all25Students = createMockStudents(25)

const mockBaseSessionInfo: attendanceApi.SessionAttendanceInfo = {
    schedule_id: 'sch-pag-1',
    class_id: 'cls-pag-1',
    class_code: 'TR_PAG254',
    class_name: 'TR_PAG254',
    subject_name: 'Công nghệ phần mềm',
    session_number: 1,
    topic: 'Kiểm thử phân trang',
    learning_date: '2026-10-19',
    shift: 'Ca 1 (07:30 - 09:30)',
    start_time: '07:30:00',
    end_time: '09:30:00',
    room_id: '1122',
    room_name: 'Phòng 1122',
    instructor_name: 'Giảng viên Test',
    status: 'scheduled',
    attendance_checked: false,
    is_today: true,
    is_past: false,
    is_future: false,
    can_edit: true,
}

// Mock service hàm phân trang mô phỏng backend
function mockBackendAttendanceSheet(
    options?: { page?: number; limit?: number; q?: string },
    studentsList: attendanceApi.AttendanceStudentItem[] = all25Students,
): attendanceApi.AttendanceSheetResponse {
    const page = Math.max(Number(options?.page) || 1, 1)
    const rawLimit = Number(options?.limit) || 10
    // Backend cap tối đa 20 bản ghi mỗi lần tải
    const limit = Math.min(Math.max(rawLimit, 1), 20)
    const q = options?.q?.trim().toLowerCase() || ''

    let filtered = studentsList
    if (q) {
        filtered = studentsList.filter(
            (s) =>
                s.full_name.toLowerCase().includes(q) ||
                s.student_code.toLowerCase().includes(q) ||
                s.email.toLowerCase().includes(q),
        )
    }

    const total_items = filtered.length
    const total_pages = Math.max(1, Math.ceil(total_items / limit))
    const startIdx = (page - 1) * limit
    const pagedStudents = filtered.slice(startIdx, startIdx + limit)

    const present_count = studentsList.filter((s) => s.status === 'present').length
    const late_count = studentsList.filter((s) => s.status === 'late').length
    const excused_count = studentsList.filter((s) => s.status === 'excused').length
    const unexcused_count = studentsList.filter((s) => s.status === 'unexcused').length
    const unmarked_count = studentsList.filter((s) => s.status === null).length

    return {
        session_info: mockBaseSessionInfo,
        stats: {
            total_students: studentsList.length,
            present_count,
            late_count,
            excused_count,
            unexcused_count,
            unmarked_count,
        },
        pagination: {
            page,
            limit,
            total_items,
            total_pages,
        },
        students: pagedStudents,
    }
}

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

describe('SessionAttendancePage Pagination (SCRUM-254)', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    const renderPage = () => {
        return render(
            <MemoryRouter initialEntries={['/schedules/sch-pag-1/attendance']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainer">
                        <Routes>
                            <Route path="/schedules/:scheduleId/attendance" element={<SessionAttendancePage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )
    }

    it('1. 25 học viên chia 10/10/5 khi limit=10; chọn 20 chia 20/5', async () => {
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockImplementation(
            async (_rf, _id, options) => {
                return mockBackendAttendanceSheet(options)
            },
        )

        renderPage()

        // Mặc định trang 1 limit 10: Hiển thị 1–10 / 25 học viên
        await waitFor(() => {
            expect(screen.getByTestId('pagination-info').textContent).toContain('1–10 / 25 học viên')
            expect(screen.getByTestId('pagination-page-indicator').textContent).toContain('Trang 1 / 3')
            expect(screen.getByTestId('row-student-st-01')).toBeDefined()
            expect(screen.getByTestId('row-student-st-10')).toBeDefined()
            expect(screen.queryByTestId('row-student-st-11')).toBeNull()
        })

        // Chuyển sang trang 2: Hiển thị 11–20 / 25 học viên
        fireEvent.click(screen.getByTestId('pagination-next-btn'))
        await waitFor(() => {
            expect(screen.getByTestId('pagination-info').textContent).toContain('11–20 / 25 học viên')
            expect(screen.getByTestId('pagination-page-indicator').textContent).toContain('Trang 2 / 3')
            expect(screen.getByTestId('row-student-st-11')).toBeDefined()
            expect(screen.getByTestId('row-student-st-20')).toBeDefined()
            expect(screen.queryByTestId('row-student-st-01')).toBeNull()
        })

        // Chuyển sang trang 3: Hiển thị 21–25 / 25 học viên (5 học viên)
        fireEvent.click(screen.getByTestId('pagination-next-btn'))
        await waitFor(() => {
            expect(screen.getByTestId('pagination-info').textContent).toContain('21–25 / 25 học viên')
            expect(screen.getByTestId('pagination-page-indicator').textContent).toContain('Trang 3 / 3')
            expect(screen.getByTestId('row-student-st-21')).toBeDefined()
            expect(screen.getByTestId('row-student-st-25')).toBeDefined()
            expect((screen.getByTestId('pagination-next-btn') as HTMLButtonElement).disabled).toBe(true)
        })

        // Đổi sang 20 học viên / trang: đưa về trang 1 chia 20/5
        fireEvent.change(screen.getByTestId('pagination-limit-select'), { target: { value: '20' } })
        await waitFor(() => {
            expect(screen.getByTestId('pagination-info').textContent).toContain('1–20 / 25 học viên')
            expect(screen.getByTestId('pagination-page-indicator').textContent).toContain('Trang 1 / 2')
            expect(screen.getByTestId('row-student-st-01')).toBeDefined()
            expect(screen.getByTestId('row-student-st-20')).toBeDefined()
            expect(screen.queryByTestId('row-student-st-21')).toBeNull()
        })

        // Trang 2 của limit 20: 5 học viên còn lại
        fireEvent.click(screen.getByTestId('pagination-next-btn'))
        await waitFor(() => {
            expect(screen.getByTestId('pagination-info').textContent).toContain('21–25 / 25 học viên')
            expect(screen.getByTestId('pagination-page-indicator').textContent).toContain('Trang 2 / 2')
            expect(screen.getByTestId('row-student-st-25')).toBeDefined()
        })
    })

    it('2. Sửa trạng thái và ghi chú ở trang 1, chuyển trang 2 rồi quay lại vẫn giữ; lưu cả hai trang đúng', async () => {
        let currentBackendStore = [...all25Students]

        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockImplementation(
            async (_rf, _id, options) => {
                return mockBackendAttendanceSheet(options, currentBackendStore)
            },
        )

        const saveSpy = vi.spyOn(attendanceApi, 'saveSessionAttendance').mockImplementation(
            async (_rf, _id, payload) => {
                // Giả lập lưu backend
                if (payload.attendances) {
                    for (const att of payload.attendances) {
                        const idx = currentBackendStore.findIndex((s) => s.student_id === att.student_id)
                        if (idx !== -1) {
                            currentBackendStore[idx] = {
                                ...currentBackendStore[idx],
                                status: att.status,
                                notes: att.notes || null,
                            }
                        }
                    }
                }
                return {
                    message: 'Lưu điểm danh thành công',
                    data: mockBackendAttendanceSheet({ page: 1, limit: 10 }, currentBackendStore),
                }
            },
        )

        renderPage()

        await waitFor(() => {
            expect(screen.getByTestId('row-student-st-01')).toBeDefined()
        })

        // Ở trang 1: Chọn SV 01 "Có mặt", ghi chú "Học chăm"
        fireEvent.click(screen.getByTestId('btn-present-st-01'))
        fireEvent.change(screen.getByTestId('input-note-st-01'), { target: { value: 'Học chăm' } })

        expect(screen.getByTestId('btn-present-st-01').className).toContain('active')
        expect((screen.getByTestId('input-note-st-01') as HTMLInputElement).value).toBe('Học chăm')
        expect(screen.getByTestId('draft-indicator-banner')).toBeDefined()

        // Chuyển sang trang 2: Sửa SV 12 "Đi muộn", ghi chú "Tắc đường"
        fireEvent.click(screen.getByTestId('pagination-next-btn'))
        await waitFor(() => {
            expect(screen.getByTestId('row-student-st-12')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-late-st-12'))
        fireEvent.change(screen.getByTestId('input-note-st-12'), { target: { value: 'Tắc đường' } })

        expect(screen.getByTestId('btn-late-st-12').className).toContain('active')
        expect((screen.getByTestId('input-note-st-12') as HTMLInputElement).value).toBe('Tắc đường')

        // Quay lại trang 1: Xác nhận SV 01 VẪN GIỮ "Có mặt" và "Học chăm"
        fireEvent.click(screen.getByTestId('pagination-prev-btn'))
        await waitFor(() => {
            expect(screen.getByTestId('row-student-st-01')).toBeDefined()
            expect(screen.getByTestId('btn-present-st-01').className).toContain('active')
            expect((screen.getByTestId('input-note-st-01') as HTMLInputElement).value).toBe('Học chăm')
        })

        // Bấm Lưu: Payload phải chứa cả SV 01 và SV 12
        fireEvent.click(screen.getByTestId('btn-save-attendance'))
        await waitFor(() => {
            expect(saveSpy).toHaveBeenCalledTimes(1)
            const payload = saveSpy.mock.calls[0][2]
            const studentIdsInPayload = payload.attendances?.map((a) => a.student_id)
            expect(studentIdsInPayload).toContain('st-01')
            expect(studentIdsInPayload).toContain('st-12')
            expect(screen.getByTestId('attendance-success-alert')).toBeDefined()
        })
    })

    it('3. Tìm học viên nằm ở trang cuối, đổi/xóa từ khóa không mất thay đổi', async () => {
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockImplementation(
            async (_rf, _id, options) => {
                return mockBackendAttendanceSheet(options)
            },
        )

        renderPage()

        await waitFor(() => {
            expect(screen.getByTestId('row-student-st-01')).toBeDefined()
        })

        // Chỉnh sửa SV 01 trước khi tìm kiếm
        fireEvent.click(screen.getByTestId('btn-present-st-01'))
        fireEvent.change(screen.getByTestId('input-note-st-01'), { target: { value: 'Ghi chú ban đầu' } })

        // Tìm học viên nằm ở trang cuối: "Số 25"
        fireEvent.change(screen.getByTestId('attendance-search-input'), { target: { value: 'Số 25' } })

        await waitFor(() => {
            expect(screen.getByTestId('row-student-st-25')).toBeDefined()
            expect(screen.queryByTestId('row-student-st-01')).toBeNull()
        })

        // Sửa SV 25 trong lúc đang lọc tìm kiếm: "Vắng có phép"
        fireEvent.click(screen.getByTestId('btn-excused-st-25'))
        expect(screen.getByTestId('btn-excused-st-25').className).toContain('active')

        // Xóa từ khóa tìm kiếm: Quay lại danh sách đầy đủ
        fireEvent.change(screen.getByTestId('attendance-search-input'), { target: { value: '' } })

        await waitFor(() => {
            expect(screen.getByTestId('row-student-st-01')).toBeDefined()
            // Xác nhận SV 01 vẫn giữ trạng thái và ghi chú
            expect(screen.getByTestId('btn-present-st-01').className).toContain('active')
            expect((screen.getByTestId('input-note-st-01') as HTMLInputElement).value).toBe('Ghi chú ban đầu')
        })

        // Chuyển sang trang 3 để kiểm tra SV 25: Vẫn giữ "Vắng có phép"
        fireEvent.click(screen.getByTestId('pagination-next-btn')) // trang 2
        await waitFor(() => screen.getByTestId('row-student-st-11'))
        fireEvent.click(screen.getByTestId('pagination-next-btn')) // trang 3
        await waitFor(() => {
            expect(screen.getByTestId('row-student-st-25')).toBeDefined()
            expect(screen.getByTestId('btn-excused-st-25').className).toContain('active')
        })
    })

    it('4. Đánh dấu tất cả khi đang tìm kiếm vẫn áp dụng đủ toàn buổi; sửa riêng một người rồi lưu', async () => {
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockImplementation(
            async (_rf, _id, options) => {
                return mockBackendAttendanceSheet(options)
            },
        )

        const saveSpy = vi.spyOn(attendanceApi, 'saveSessionAttendance').mockResolvedValue({
            message: 'Lưu thành công',
            data: mockBackendAttendanceSheet(),
        })

        renderPage()

        await waitFor(() => screen.getByTestId('row-student-st-01'))

        // Lọc tìm kiếm "Số 05" (chỉ thấy 1 học viên)
        fireEvent.change(screen.getByTestId('attendance-search-input'), { target: { value: 'Số 05' } })
        await waitFor(() => {
            expect(screen.getByTestId('row-student-st-05')).toBeDefined()
            expect(screen.queryByTestId('row-student-st-01')).toBeNull()
        })

        // Bấm "Đánh dấu tất cả có mặt"
        fireEvent.click(screen.getByTestId('btn-mark-all-present'))
        expect(screen.getByTestId('btn-present-st-05').className).toContain('active')

        // Sửa riêng SV 05 thành "Đi muộn"
        fireEvent.click(screen.getByTestId('btn-late-st-05'))
        expect(screen.getByTestId('btn-late-st-05').className).toContain('active')

        // Xóa tìm kiếm và chuyển sang trang 2
        fireEvent.change(screen.getByTestId('attendance-search-input'), { target: { value: '' } })
        await waitFor(() => screen.getByTestId('row-student-st-01'))
        expect(screen.getByTestId('btn-present-st-01').className).toContain('active')

        fireEvent.click(screen.getByTestId('pagination-next-btn'))
        await waitFor(() => screen.getByTestId('row-student-st-15'))
        // Học viên trang 2 chưa tải trước đó cũng tự động nhận "Có mặt" do chế độ mark all present
        expect(screen.getByTestId('btn-present-st-15').className).toContain('active')

        // Bấm Lưu: Backend nhận mark_all_present = true và override SV 05 là 'late'
        fireEvent.click(screen.getByTestId('btn-save-attendance'))
        await waitFor(() => {
            expect(saveSpy).toHaveBeenCalledTimes(1)
            const payload = saveSpy.mock.calls[0][2]
            expect(payload.mark_all_present).toBe(true)
            const overrideSt05 = payload.attendances?.find((a) => a.student_id === 'st-05')
            expect(overrideSt05?.status).toBe('late')
        })
    })

    it('5. Request phân trang lỗi không xóa bản nháp hoặc báo danh sách rỗng', async () => {
        let failNextRequest = false
        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockImplementation(
            async (_rf, _id, options) => {
                if (failNextRequest) {
                    throw new Error('Mất kết nối mạng khi tải trang')
                }
                return mockBackendAttendanceSheet(options)
            },
        )

        renderPage()

        await waitFor(() => screen.getByTestId('row-student-st-01'))

        // Nhập bản nháp ở trang 1
        fireEvent.click(screen.getByTestId('btn-present-st-01'))
        fireEvent.change(screen.getByTestId('input-note-st-01'), { target: { value: 'Bản nháp quý giá' } })

        // Giả lập lỗi khi chuyển sang trang 2
        failNextRequest = true
        fireEvent.click(screen.getByTestId('pagination-next-btn'))

        await waitFor(() => {
            // Hiển thị thông báo lỗi
            expect(screen.getByTestId('attendance-error-alert')).toBeDefined()
            // Không xóa danh sách hoặc biến thành rỗng
            expect(screen.getByTestId('row-student-st-01')).toBeDefined()
            // Không làm mất bản nháp đã nhập
            expect(screen.getByTestId('btn-present-st-01').className).toContain('active')
            expect((screen.getByTestId('input-note-st-01') as HTMLInputElement).value).toBe('Bản nháp quý giá')
        })
    })

    it('6. Buổi chỉ đọc vẫn phân trang được nhưng không được lưu', async () => {
        const readonlyData = {
            ...mockBackendAttendanceSheet(),
            session_info: {
                ...mockBaseSessionInfo,
                is_today: false,
                is_future: true,
                can_edit: false,
                edit_restriction_reason: 'Buổi học diễn ra trong tương lai, chưa thể điểm danh.',
            },
        }

        vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockResolvedValue(readonlyData)

        renderPage()

        await waitFor(() => {
            expect(screen.getByTestId('attendance-restriction-alert')).toBeDefined()
            // Nút Lưu và nút Đánh dấu tất cả không hiển thị hoặc bị ẩn khi can_edit = false
            expect(screen.queryByTestId('btn-save-attendance')).toBeNull()
            expect(screen.queryByTestId('btn-mark-all-present')).toBeNull()
            // Các nút điểm danh bị disabled
            expect((screen.getByTestId('btn-present-st-01') as HTMLButtonElement).disabled).toBe(true)
            // Thanh phân trang vẫn hiển thị và hoạt động
            expect(screen.getByTestId('attendance-pagination')).toBeDefined()
        })
    })

    it('7. Kiểm tra Network xác nhận mỗi lần đọc danh sách tối đa 20 bản ghi', async () => {
        const getSpy = vi.spyOn(attendanceApi, 'getSessionAttendanceSheet').mockImplementation(
            async (_rf, _id, options) => {
                return mockBackendAttendanceSheet(options)
            },
        )

        renderPage()

        await waitFor(() => screen.getByTestId('row-student-st-01'))
        // Mặc định gọi limit=10 <= 20
        expect(getSpy.mock.calls[0][2]?.limit).toBe(10)

        // Khi chọn 20
        fireEvent.change(screen.getByTestId('pagination-limit-select'), { target: { value: '20' } })
        await waitFor(() => {
            const lastCall = getSpy.mock.calls[getSpy.mock.calls.length - 1]
            expect(lastCall[2]?.limit).toBe(20)
            expect(lastCall[2]?.limit).toBeLessThanOrEqual(20)
        })
    })
})
