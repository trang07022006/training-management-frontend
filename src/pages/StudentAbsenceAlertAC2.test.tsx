// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { type ReactNode, useEffect } from 'react'
import { ClassAttendanceSummaryView } from './ClassAttendanceSummaryView'
import { StudentDetailPage } from './StudentDetailPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import type { AttendanceSummaryData } from '../api/attendanceSummaryApi'
import type { StudentDetail, StudentAbsenceAlertItem } from '../api/studentApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

function RoleSessionWrapper({
    role = 'training_manager',
    children,
}: {
    role?: string
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()

    useEffect(() => {
        if (!hasSession) {
            startSession({ accessToken: 'mock-token', refreshToken: 'mock-refresh' }, role)
        }
    }, [hasSession, startSession, role])

    if (!hasSession) {
        return <div>Initializing session...</div>
    }

    return <>{children}</>
}

describe('SCRUM-257 AC2: Absence Alert Flags on Class Summary and Student Profile', () => {
    it('renders absence alert flag and banner on ClassAttendanceSummaryView for flagged student', async () => {
        const mockSummaryData = {
            class_info: {
                id: 'class-it01',
                class_code: 'IT01-K25',
                class_name: 'Lớp Lập trình Web IT01',
                program_name: 'Công nghệ thông tin',
                academic_year: '2025-2026',
                semester: '1',
            },
            sessions: [
                { schedule_id: 'sch-1', session_number: 1, topic: 'Python', learning_date: '2026-03-01', status: 'completed', attendance_checked: true, has_ended: true, is_future: false, is_cancelled: false },
                { schedule_id: 'sch-2', session_number: 2, topic: 'Python', learning_date: '2026-03-02', status: 'completed', attendance_checked: true, has_ended: true, is_future: false, is_cancelled: false },
                { schedule_id: 'sch-3', session_number: 3, topic: 'Python', learning_date: '2026-03-03', status: 'completed', attendance_checked: true, has_ended: true, is_future: false, is_cancelled: false },
                { schedule_id: 'sch-4', session_number: 4, topic: 'Python', learning_date: '2026-03-04', status: 'completed', attendance_checked: true, has_ended: true, is_future: false, is_cancelled: false },
                { schedule_id: 'sch-5', session_number: 5, topic: 'Python', learning_date: '2026-03-05', status: 'completed', attendance_checked: true, has_ended: true, is_future: false, is_cancelled: false },
            ],
            students: [
                {
                    student_id: 'st-01',
                    student_code: 'SV001',
                    full_name: 'Nguyễn Văn Vượt Ngưỡng',
                    session_statuses: {},
                    summary: {
                        present_count: 1,
                        late_count: 0,
                        excused_count: 0,
                        unexcused_count: 4,
                        attended_count: 1,
                        valid_sessions_count: 5,
                        total_absent: 4,
                        attendance_rate: 20.0,
                        attendance_rate_formatted: '20.0%',
                        unrecorded_ended_count: 0,
                    },
                    absence_alert: {
                        is_flagged: true,
                        status: 'active',
                        absent_sessions: 4,
                        total_sessions: 5,
                        absence_rate: 80.0,
                        threshold: 20.0,
                        tooltip: 'Vắng 4/5 buổi — 80%, vượt ngưỡng 20%',
                    },
                },
                {
                    student_id: 'st-02',
                    student_code: 'SV002',
                    full_name: 'Trần Thị Chăm Chỉ',
                    session_statuses: {},
                    summary: {
                        present_count: 5,
                        late_count: 0,
                        excused_count: 0,
                        unexcused_count: 0,
                        attended_count: 5,
                        valid_sessions_count: 5,
                        total_absent: 0,
                        attendance_rate: 100.0,
                        attendance_rate_formatted: '100.0%',
                        unrecorded_ended_count: 0,
                    },
                    absence_alert: {
                        is_flagged: false,
                        status: 'none',
                        absent_sessions: 0,
                        total_sessions: 5,
                        absence_rate: 0.0,
                        threshold: 20.0,
                        tooltip: 'Vắng 0/5 buổi — 0% (ngưỡng 20%)',
                    },
                },
            ],
            pagination: { page: 1, page_size: 20, total: 2, total_pages: 1 },
            sort: {
                sort_by: 'student_code',
                sort_order: 'asc',
            },
            calculation_rules: {
                formula: 'Tỷ lệ chuyên cần = ((Có mặt + Đi muộn) / D) * 100%',
                note: 'Công thức tính chuyên cần',
            },
            absence_alert_summary: {
                flagged_count: 1,
                threshold: 20.0,
                threshold_formatted: '20.0%',
            },
        } as unknown as AttendanceSummaryData

        const globalFetch = vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
            const urlStr = String(input)
            if (urlStr.includes('/attendance-summary')) {
                return Promise.resolve(new Response(JSON.stringify({ code: 'SUCCESS', data: mockSummaryData }), { status: 200 }))
            }
            return Promise.resolve(new Response(JSON.stringify({ code: 'NOT_FOUND' }), { status: 404 }))
        })

        render(
            <MemoryRouter initialEntries={['/classes/class-it01/attendance-summary']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/classes/:classId/attendance-summary" element={<ClassAttendanceSummaryView classId="class-it01" />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('class-attendance-summary-view')).toBeDefined()
            expect(screen.getByTestId('attendance-summary-matrix-table')).toBeDefined()
        })

        // Verify absence alert summary banner
        expect(screen.getByTestId('absence-alert-summary-banner')).toBeDefined()

        // Verify flag badge exists on student SV001 and not on SV002
        expect(screen.getByTestId('absence-alert-flag-SV001')).toBeDefined()
        expect(screen.queryByTestId('absence-alert-flag-SV002')).toBeNull()

        globalFetch.mockRestore()
    })

    it('renders absence alert section on StudentDetailPage for student with active alerts', async () => {
        const mockStudent = {
            id: 'st-01',
            student_code: 'SV001',
            full_name: 'Nguyễn Văn Vượt Ngưỡng',
            phone: '0987654321',
            email: 'sv001@ictu.edu.vn',
            status: 'studying',
            program_name: 'Công nghệ thông tin',
            current_classes: [
                {
                    class_id: 'class-it01',
                    class_code: 'IT01-K25',
                    name: 'Lớp Lập trình Web IT01',
                    enrollment_status: 'enrolled',
                },
            ],
        } as unknown as StudentDetail

        const mockAlerts: StudentAbsenceAlertItem[] = [
            {
                alert_id: 'alert-01',
                class_id: 'class-it01',
                class_code: 'IT01-K25',
                program_id: 'prog-01',
                program_name: 'Công nghệ thông tin',
                absent_sessions: 5,
                total_sessions: 20,
                absence_rate: 25.0,
                absence_rate_formatted: '25.0%',
                threshold: 20.0,
                threshold_formatted: '20.0%',
                is_flagged: true,
                tooltip: 'Vắng 5/20 buổi — 25.0%, vượt ngưỡng 20.0%',
                first_triggered_at: '2026-03-10T09:00:00Z',
            },
        ]

        const globalFetch = vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
            const urlStr = String(input)
            if (urlStr.includes('/absence-alerts')) {
                return Promise.resolve(new Response(JSON.stringify({ code: 'SUCCESS', data: mockAlerts }), { status: 200 }))
            }
            if (urlStr.includes('/students/st-01')) {
                return Promise.resolve(new Response(JSON.stringify({ code: 'SUCCESS', data: mockStudent }), { status: 200 }))
            }
            return Promise.resolve(new Response(JSON.stringify({ code: 'NOT_FOUND' }), { status: 404 }))
        })

        render(
            <MemoryRouter initialEntries={['/students/st-01']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="training_manager">
                        <Routes>
                            <Route path="/students/:studentId" element={<StudentDetailPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('student-detail-page')).toBeDefined()
        })

        // Check absence alert card
        expect(screen.getByTestId('student-absence-alerts-card')).toBeDefined()
        expect(screen.getByTestId('student-absence-alert-item-IT01-K25')).toBeDefined()

        globalFetch.mockRestore()
    })
})
