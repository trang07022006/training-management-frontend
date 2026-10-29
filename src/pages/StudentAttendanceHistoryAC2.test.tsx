// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
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

describe('SCRUM-258 AC2: Student Absence Warning Banner and Remaining Sessions', () => {
    it('renders normal status with remaining sessions', async () => {
        const mockData: historyApi.StudentAttendanceHistoryData = {
            student: { id: 'st-1', full_name: 'Học viên A' },
            enrolled_classes: [{ class_id: 'cls-1', class_code: 'CNTT-01' }],
            selected_class_id: 'cls-1',
            absence_warning: {
                total_sessions_N: 20,
                absent_sessions_A: 2,
                threshold_T: 20,
                max_allowed_absences_K: 4,
                remaining_absences_R: 2,
                warning_status: 'normal',
                warning_level: 'success',
                warning_message: 'Bạn đã vắng 2/20 buổi. Theo ngưỡng 20% và lịch hiện tại, bạn có thể vắng thêm 2 buổi mà chưa vượt ngưỡng.',
                is_flagged: false,
                insufficient_data: false,
            },
            sessions: [],
            pagination: { page: 1, page_size: 20, total_items: 0, total_pages: 1 },
        }

        vi.spyOn(historyApi, 'getMyAttendanceHistory').mockResolvedValue(mockData)

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
            expect(screen.getByTestId('absence-warning-banner')).toBeDefined()
        })

        expect(screen.getByText('Bình thường')).toBeDefined()
        expect(screen.getByTestId('absence-warning-message').textContent).toContain('bạn có thể vắng thêm 2 buổi mà chưa vượt ngưỡng')
    })

    it('renders approaching threshold status (R = 1)', async () => {
        const mockData: historyApi.StudentAttendanceHistoryData = {
            student: { id: 'st-1', full_name: 'Học viên B' },
            enrolled_classes: [{ class_id: 'cls-1', class_code: 'CNTT-01' }],
            selected_class_id: 'cls-1',
            absence_warning: {
                total_sessions_N: 20,
                absent_sessions_A: 3,
                threshold_T: 20,
                max_allowed_absences_K: 4,
                remaining_absences_R: 1,
                warning_status: 'approaching',
                warning_level: 'warning',
                warning_message: 'Bạn đang gần ngưỡng vắng. Hiện đã vắng 3/20 buổi; còn 1 buổi vắng trước khi chạm mức tối đa chưa vượt ngưỡng.',
                is_flagged: false,
                insufficient_data: false,
            },
            sessions: [],
            pagination: { page: 1, page_size: 20, total_items: 0, total_pages: 1 },
        }

        vi.spyOn(historyApi, 'getMyAttendanceHistory').mockResolvedValue(mockData)

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
            expect(screen.getByTestId('absence-warning-banner')).toBeDefined()
        })

        expect(screen.getByText('Gần ngưỡng')).toBeDefined()
        expect(screen.getByTestId('absence-warning-message').textContent).toContain('Bạn đang gần ngưỡng vắng')
    })

    it('renders at_limit status (A == K, next absence will exceed)', async () => {
        const mockData: historyApi.StudentAttendanceHistoryData = {
            student: { id: 'st-1', full_name: 'Học viên C' },
            enrolled_classes: [{ class_id: 'cls-1', class_code: 'CNTT-01' }],
            selected_class_id: 'cls-1',
            absence_warning: {
                total_sessions_N: 20,
                absent_sessions_A: 4,
                threshold_T: 20,
                max_allowed_absences_K: 4,
                remaining_absences_R: 0,
                warning_status: 'at_limit',
                warning_level: 'warning',
                warning_message: 'Bạn đã vắng 4/20 buổi, bằng ngưỡng 20%. Vắng thêm 1 buổi sẽ vượt ngưỡng.',
                is_flagged: false,
                insufficient_data: false,
            },
            sessions: [],
            pagination: { page: 1, page_size: 20, total_items: 0, total_pages: 1 },
        }

        vi.spyOn(historyApi, 'getMyAttendanceHistory').mockResolvedValue(mockData)

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
            expect(screen.getByTestId('absence-warning-banner')).toBeDefined()
        })

        expect(screen.getByText('Chạm mức tối đa')).toBeDefined()
        expect(screen.getByTestId('absence-warning-message').textContent).toContain('bằng ngưỡng 20%. Vắng thêm 1 buổi sẽ vượt ngưỡng')
    })

    it('renders exceeded threshold status', async () => {
        const mockData: historyApi.StudentAttendanceHistoryData = {
            student: { id: 'st-1', full_name: 'Học viên D' },
            enrolled_classes: [{ class_id: 'cls-1', class_code: 'CNTT-01' }],
            selected_class_id: 'cls-1',
            absence_warning: {
                total_sessions_N: 20,
                absent_sessions_A: 5,
                threshold_T: 20,
                max_allowed_absences_K: 4,
                remaining_absences_R: 0,
                warning_status: 'exceeded',
                warning_level: 'danger',
                warning_message: 'Bạn đã vắng 5/20 buổi, tương đương 25%, vượt ngưỡng 20%. Vui lòng liên hệ giảng viên hoặc Quản lý đào tạo.',
                is_flagged: true,
                insufficient_data: false,
            },
            sessions: [],
            pagination: { page: 1, page_size: 20, total_items: 0, total_pages: 1 },
        }

        vi.spyOn(historyApi, 'getMyAttendanceHistory').mockResolvedValue(mockData)

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
            expect(screen.getByTestId('absence-warning-banner')).toBeDefined()
        })

        expect(screen.getByText('Đã vượt ngưỡng')).toBeDefined()
        expect(screen.getByTestId('absence-warning-message').textContent).toContain('vượt ngưỡng 20%. Vui lòng liên hệ giảng viên hoặc Quản lý đào tạo.')
    })
})
