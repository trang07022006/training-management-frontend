// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { ClassAttendanceSummaryView } from './ClassAttendanceSummaryView'
import * as attendanceSummaryApi from '../api/attendanceSummaryApi'

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

const mockSummaryData: attendanceSummaryApi.ClassAttendanceSummaryResponse = {
    class_info: {
        id: 'cls-1',
        class_code: 'CNTT-K20A',
        program_id: 'prog-1',
        program_name: 'Công nghệ thông tin',
        status: 'in_progress',
    },
    sessions: [
        {
            schedule_id: 'sch-1',
            session_number: 1,
            topic: 'Giới thiệu môi trường',
            learning_date: '2026-10-20',
            shift: 'morning',
            start_time: '08:00:00',
            end_time: '11:30:00',
            subject_id: 'sub-1',
            subject_name: 'Lập trình Python',
            subject_code: 'PYTHON101',
            room_name: 'Phòng Lab 101',
            instructor_name: 'Nguyễn Văn A',
            status: 'completed',
            attendance_checked: true,
            has_ended: true,
            is_future: false,
            is_cancelled: false,
        },
        {
            schedule_id: 'sch-2',
            session_number: 2,
            topic: 'Cú pháp cơ bản',
            learning_date: '2026-10-20',
            shift: 'afternoon',
            start_time: '13:30:00',
            end_time: '17:00:00',
            subject_id: 'sub-1',
            subject_name: 'Lập trình Python',
            subject_code: 'PYTHON101',
            room_name: 'Phòng Lab 101',
            instructor_name: 'Nguyễn Văn A',
            status: 'completed',
            attendance_checked: true,
            has_ended: true,
            is_future: false,
            is_cancelled: false,
        },
        {
            schedule_id: 'sch-3',
            session_number: 3,
            topic: 'Cấu trúc điều khiển',
            learning_date: '2026-10-25',
            shift: 'morning',
            start_time: '08:00:00',
            end_time: '11:30:00',
            subject_id: 'sub-1',
            subject_name: 'Lập trình Python',
            subject_code: 'PYTHON101',
            room_name: 'Phòng Lab 101',
            instructor_name: 'Nguyễn Văn A',
            status: 'scheduled',
            attendance_checked: false,
            has_ended: false,
            is_future: true,
            is_cancelled: false,
        },
    ],
    students: [
        {
            student_id: 'stu-1',
            student_code: 'SV001',
            full_name: 'Nguyễn Văn An',
            email: 'an.nv@ictu.edu.vn',
            phone: '0901234567',
            enrollment_status: 'enrolled',
            summary: {
                present_count: 1,
                late_count: 0,
                excused_count: 1,
                unexcused_count: 0,
                attended_count: 1,
                valid_sessions_count: 2,
                total_absent: 1,
                attendance_rate: 50.0,
                attendance_rate_formatted: '50.0%',
                unrecorded_ended_count: 0,
            },
            session_statuses: {
                'sch-1': {
                    status: 'present',
                    symbol: 'P',
                    status_label: 'Có mặt',
                    notes: null,
                    is_pre_approved: false,
                    is_eligible: true,
                },
                'sch-2': {
                    status: 'excused',
                    symbol: 'E',
                    status_label: 'Vắng có phép',
                    notes: 'Có đơn xin phép',
                    is_pre_approved: true,
                    is_eligible: true,
                },
                'sch-3': {
                    status: 'future',
                    symbol: '—',
                    status_label: 'Chưa diễn ra',
                    notes: null,
                    is_pre_approved: false,
                    is_eligible: true,
                },
            },
        },
        {
            student_id: 'stu-2',
            student_code: 'SV002',
            full_name: 'Trần Thị Bình',
            email: 'binh.tt@ictu.edu.vn',
            phone: '0912345678',
            enrollment_status: 'enrolled',
            summary: {
                present_count: 0,
                late_count: 0,
                excused_count: 0,
                unexcused_count: 2,
                attended_count: 0,
                valid_sessions_count: 2,
                total_absent: 2,
                attendance_rate: 0.0,
                attendance_rate_formatted: '0.0%',
                unrecorded_ended_count: 0,
            },
            session_statuses: {
                'sch-1': {
                    status: 'unexcused',
                    symbol: 'U',
                    status_label: 'Vắng không phép',
                    notes: null,
                    is_pre_approved: false,
                    is_eligible: true,
                },
                'sch-2': {
                    status: 'unexcused',
                    symbol: 'U',
                    status_label: 'Vắng không phép',
                    notes: null,
                    is_pre_approved: false,
                    is_eligible: true,
                },
                'sch-3': {
                    status: 'future',
                    symbol: '—',
                    status_label: 'Chưa diễn ra',
                    notes: null,
                    is_pre_approved: false,
                    is_eligible: true,
                },
            },
        },
        {
            student_id: 'stu-3',
            student_code: 'SV003',
            full_name: 'Lê Văn Cường',
            email: 'cuong.lv@ictu.edu.vn',
            phone: '0923456789',
            enrollment_status: 'enrolled',
            summary: {
                present_count: 0,
                late_count: 0,
                excused_count: 0,
                unexcused_count: 0,
                attended_count: 0,
                valid_sessions_count: 0,
                total_absent: 0,
                attendance_rate: null,
                attendance_rate_formatted: '—',
                unrecorded_ended_count: 0,
            },
            session_statuses: {
                'sch-1': {
                    status: 'not_applicable',
                    symbol: '—',
                    status_label: 'Không áp dụng',
                    notes: 'Chưa ghi danh vào ngày học',
                    is_pre_approved: false,
                    is_eligible: false,
                },
                'sch-2': {
                    status: 'not_applicable',
                    symbol: '—',
                    status_label: 'Không áp dụng',
                    notes: 'Chưa ghi danh vào ngày học',
                    is_pre_approved: false,
                    is_eligible: false,
                },
                'sch-3': {
                    status: 'future',
                    symbol: '—',
                    status_label: 'Chưa diễn ra',
                    notes: null,
                    is_pre_approved: false,
                    is_eligible: true,
                },
            },
        },
    ],
    pagination: {
        page: 1,
        page_size: 20,
        total_items: 3,
        total_pages: 1,
    },
    sort: {
        sort_by: 'student_code',
        sort_order: 'asc',
    },
    calculation_rules: {
        formula: '((P + L) / D) * 100%',
        note: 'Tỷ lệ tính trên các buổi đủ điều kiện đã có kết quả điểm danh (P: Có mặt, L: Đi muộn, E: Vắng có phép, U: Vắng không phép; D = P + L + E + U).',
    },
}

describe('SCRUM-256: ClassAttendanceSummaryView Component', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('AC1: Renders matrix with session columns, student rows, and status badges', async () => {
        const getSummarySpy = vi
            .spyOn(attendanceSummaryApi, 'getClassAttendanceSummary')
            .mockResolvedValue(mockSummaryData)

        render(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainer">
                        <ClassAttendanceSummaryView classId="cls-1" classCode="CNTT-K20A" />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>
        )

        // Wait for data render
        await waitFor(() => {
            expect(screen.getByTestId('attendance-summary-matrix-table')).toBeDefined()
        })

        expect(getSummarySpy).toHaveBeenCalledWith(
            expect.any(Function),
            'cls-1',
            expect.objectContaining({ page: 1, page_size: 20 })
        )

        // Sticky columns: STT, Mã SV, Họ và tên
        expect(screen.getByText('STT')).toBeDefined()
        expect(screen.getByText('Mã SV')).toBeDefined()
        expect(screen.getByText('Họ và tên')).toBeDefined()

        // Same-day sessions: Both sch-1 and sch-2 are on 2026-10-20
        expect(screen.getByText('Buổi #1')).toBeDefined()
        expect(screen.getByText('Buổi #2')).toBeDefined()
        expect(screen.getByText('Buổi #3')).toBeDefined()

        // Student rows
        expect(screen.getByTestId('student-row-SV001')).toBeDefined()
        expect(screen.getByText('Nguyễn Văn An')).toBeDefined()
        expect(screen.getByText('SV001')).toBeDefined()

        expect(screen.getByTestId('student-row-SV002')).toBeDefined()
        expect(screen.getByText('Trần Thị Bình')).toBeDefined()
        expect(screen.getByText('SV002')).toBeDefined()

        // Status badges verification
        const student1Row = screen.getByTestId('student-row-SV001')
        expect(student1Row.querySelector('.cell-present')).toBeDefined()
        expect(student1Row.querySelector('.cell-excused')).toBeDefined()

        const student2Row = screen.getByTestId('student-row-SV002')
        expect(student2Row.querySelectorAll('.cell-unexcused').length).toBe(2)

        const student3Row = screen.getByTestId('student-row-SV003')
        expect(student3Row.querySelector('.cell-not_applicable')).toBeDefined()

        // Legend
        expect(screen.getByLabelText('Chú giải trạng thái điểm danh')).toBeDefined()
        expect(screen.getByText('Có mặt')).toBeDefined()
        expect(screen.getByText('Đi muộn')).toBeDefined()
        expect(screen.getByText('Vắng có phép')).toBeDefined()
        expect(screen.getByText('Vắng không phép')).toBeDefined()
    })

    it('AC2: Displays total absences, attendance rate (%), and handles null rates', async () => {
        vi.spyOn(attendanceSummaryApi, 'getClassAttendanceSummary').mockResolvedValue(mockSummaryData)

        render(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainer">
                        <ClassAttendanceSummaryView classId="cls-1" classCode="CNTT-K20A" />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('attendance-summary-matrix-table')).toBeDefined()
        })

        // Column headers for totals
        expect(screen.getByText('Tổng vắng')).toBeDefined()
        expect(screen.getByText('Chuyên cần (%)')).toBeDefined()

        // Student 1: 1 absent, 50%
        const row1 = screen.getByTestId('student-row-SV001')
        expect(row1.querySelector('.col-summary-absent')?.textContent).toContain('1')
        expect(row1.querySelector('.col-summary-rate')?.textContent).toContain('50.0%')

        // Student 2: 2 absent, 0%
        const row2 = screen.getByTestId('student-row-SV002')
        expect(row2.querySelector('.col-summary-absent')?.textContent).toContain('2')
        expect(row2.querySelector('.col-summary-rate')?.textContent).toContain('0.0%')

        // Student 3: D = 0, rate is null -> displayed as "—"
        const row3 = screen.getByTestId('student-row-SV003')
        expect(row3.querySelector('.col-summary-absent')?.textContent).toContain('0')
        expect(row3.querySelector('.col-summary-rate')?.textContent).toContain('—')

        // Info formula disclaimer
        expect(
            screen.getByText(/Tổng số buổi đã kết thúc và có kết quả điểm danh hợp lệ/i)
        ).toBeDefined()
    })

    it('AC3: Sắp xếp theo tỷ lệ chuyên cần tăng dần (Chuyên cần thấp nhất trước)', async () => {
        const getSummarySpy = vi
            .spyOn(attendanceSummaryApi, 'getClassAttendanceSummary')
            .mockResolvedValue(mockSummaryData)

        render(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainer">
                        <ClassAttendanceSummaryView classId="cls-1" classCode="CNTT-K20A" />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('attendance-summary-matrix-table')).toBeDefined()
        })

        const sortBtn = screen.getByTestId('btn-sort-rate-asc')
        expect(sortBtn).toBeDefined()

        // Click sort button
        fireEvent.click(sortBtn)

        await waitFor(() => {
            expect(getSummarySpy).toHaveBeenCalledWith(
                expect.any(Function),
                'cls-1',
                expect.objectContaining({
                    page: 1,
                    page_size: 20,
                    sort_by: 'attendance_rate',
                    sort_order: 'asc',
                })
            )
        })

        // Clicking again toggles back to default (student_code, asc)
        fireEvent.click(sortBtn)
        await waitFor(() => {
            expect(getSummarySpy).toHaveBeenCalledWith(
                expect.any(Function),
                'cls-1',
                expect.objectContaining({
                    page: 1,
                    page_size: 20,
                    sort_by: 'student_code',
                    sort_order: 'asc',
                })
            )
        })
    })

    it('Handles student search by code or name', async () => {
        const getSummarySpy = vi
            .spyOn(attendanceSummaryApi, 'getClassAttendanceSummary')
            .mockResolvedValue(mockSummaryData)

        render(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainer">
                        <ClassAttendanceSummaryView classId="cls-1" classCode="CNTT-K20A" />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('attendance-summary-matrix-table')).toBeDefined()
        })

        const searchInput = screen.getByTestId('search-student-input')
        fireEvent.change(searchInput, { target: { value: 'Bình' } })

        await waitFor(
            () => {
                expect(getSummarySpy).toHaveBeenCalledWith(
                    expect.any(Function),
                    'cls-1',
                    expect.objectContaining({
                        page: 1,
                        search: 'Bình',
                    })
                )
            },
            { timeout: 1500 }
        )
    })

    it('Handles empty state and error state with retry', async () => {
        vi.spyOn(attendanceSummaryApi, 'getClassAttendanceSummary')
            .mockRejectedValueOnce(new Error('Lỗi kết nối máy chủ'))
            .mockResolvedValueOnce({
                ...mockSummaryData,
                students: [],
                pagination: { page: 1, page_size: 20, total_items: 0, total_pages: 0 },
            })

        render(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="trainer">
                        <ClassAttendanceSummaryView classId="cls-1" classCode="CNTT-K20A" />
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>
        )

        // Error message appears
        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeDefined()
        })

        // Click retry
        const retryBtn = screen.getByRole('button', { name: /Thử lại/i })
        fireEvent.click(retryBtn)

        // Wait for empty state
        await waitFor(() => {
            expect(screen.getByText(/Không tìm thấy học viên phù hợp/i)).toBeDefined()
        })
    })
})
