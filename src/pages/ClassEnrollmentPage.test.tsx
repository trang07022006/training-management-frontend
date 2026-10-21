// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { useEffect, type ReactNode } from 'react'
import { ClassEnrollmentPage } from './ClassEnrollmentPage'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import * as classApi from '../api/classApi'
import * as enrollmentApi from '../api/enrollmentApi'
import * as studentApi from '../api/studentApi'
import * as scheduleApi from '../api/scheduleApi'
import * as attendanceApi from '../api/attendanceApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

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

describe('ClassEnrollmentPage - Attendance Selection in Status Column', () => {
    const mockClass = {
        id: 'cls-123',
        class_code: 'CNTT-K21A',
        program_id: 'prog-01',
        program_name: 'CNTT',
        max_capacity: 30,
        enrolled_count: 5,
        status: 'in_progress' as const,
        status_label: 'Đang diễn ra',
        learning_mode: 'offline' as const,
        expected_start_date: '2026-06-01',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
    }

    const mockStudents = [
        {
            id: 'st-01',
            student_code: 'STU000001',
            full_name: 'dat',
            email: 'dat@gmail.com',
            phone: '0988776654',
            status: 'enrolled',
            program_id: 'prog-01',
            user_id: 'u-01',
            lead_id: 'l-01',
            created_at: '2026-05-01T00:00:00Z',
            updated_at: '2026-05-01T00:00:00Z',
        },
    ]

    const mockSchedules = [
        {
            id: 'sch-01',
            class_id: 'cls-123',
            session_number: 1,
            learning_date: '2026-10-25',
            shift: 'morning',
            start_time: '08:00',
            end_time: '11:30',
            topic: 'Bài 1',
        },
    ]

    function renderPage() {
        vi.spyOn(classApi, 'getClassDetail').mockResolvedValue(mockClass as any)
        vi.spyOn(enrollmentApi, 'getClassRoster').mockResolvedValue({ items: [], total: 0 } as any)
        vi.spyOn(studentApi, 'listStudents').mockResolvedValue({ items: mockStudents, total: 1, page: 1, page_size: 50 } as any)
        vi.spyOn(scheduleApi, 'getClassSchedules').mockResolvedValue({ class_id: 'cls-123', class_code: 'CNTT-K21A', total: 1, schedules: mockSchedules } as any)

        return render(
            <MemoryRouter initialEntries={['/classes/cls-123/enrollments/new']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <RoleSessionWrapper role="admin">
                        <Routes>
                            <Route path="/classes/:classId/enrollments/new" element={<ClassEnrollmentPage />} />
                        </Routes>
                    </RoleSessionWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )
    }

    it('renders the status column with attendance badge options P, L, E, U', async () => {
        renderPage()

        await waitFor(() => {
            expect(screen.getByText('STU000001')).toBeDefined()
            expect(screen.getByText('dat')).toBeDefined()
        })

        // Check header
        expect(screen.getByText('Trạng thái điểm danh')).toBeDefined()

        // Check attendance buttons exist for the student
        expect(screen.getByTitle('Có mặt (P)')).toBeDefined()
        expect(screen.getByTitle('Đi muộn (L)')).toBeDefined()
        expect(screen.getByTitle('Vắng có phép (E)')).toBeDefined()
        expect(screen.getByTitle('Vắng không phép (U)')).toBeDefined()
        // Chưa điểm danh button must NOT exist
        expect(screen.queryByTitle('Chưa điểm danh (?)')).toBeNull()
    })

    it('selecting attendance option marks button active and auto checks student', async () => {
        const saveAttendanceSpy = vi.spyOn(attendanceApi, 'saveSessionAttendance').mockResolvedValue({
            message: 'Thành công',
            data: {} as any,
        })
        vi.spyOn(enrollmentApi, 'enrollStudents').mockResolvedValue({
            class_id: 'cls-123',
            class_code: 'CNTT-K21A',
            enrolled_count: 1,
            total_enrolled: 6,
            max_capacity: 30,
            items: [],
        })

        renderPage()

        await waitFor(() => {
            expect(screen.getByText('dat')).toBeDefined()
        })

        const presentBtn = screen.getByTitle('Có mặt (P)')
        fireEvent.click(presentBtn)

        // Present button is now active
        expect(presentBtn.getAttribute('aria-checked')).toBe('true')
        expect(presentBtn.className).toContain('active')

        // Checkbox is auto-selected
        const checkbox = screen.getByLabelText('Chọn học viên dat') as HTMLInputElement
        expect(checkbox.checked).toBe(true)

        // Save attendance button appears
        const saveAttendanceBtn = screen.getByText(/💾 Lưu điểm danh/)
        expect(saveAttendanceBtn).toBeDefined()
        fireEvent.click(saveAttendanceBtn)

        await waitFor(() => {
            expect(saveAttendanceSpy).toHaveBeenCalledWith(
                expect.any(Function),
                'sch-01',
                expect.objectContaining({
                    attendances: expect.arrayContaining([
                        expect.objectContaining({ student_id: 'st-01', status: 'present' }),
                    ]),
                }),
            )
        })
    })

    it('clicking an already selected attendance status toggles it off', async () => {
        renderPage()

        await waitFor(() => {
            expect(screen.getByText('dat')).toBeDefined()
        })

        const lateBtn = screen.getByTitle('Đi muộn (L)')
        // First click -> active
        fireEvent.click(lateBtn)
        expect(lateBtn.getAttribute('aria-checked')).toBe('true')

        // Second click -> toggle off
        fireEvent.click(lateBtn)
        expect(lateBtn.getAttribute('aria-checked')).toBe('false')
    })
})
