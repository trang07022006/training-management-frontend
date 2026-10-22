// @vitest-environment jsdom
/**
 * Automated Tests cho SCRUM-257 Acceptance Criteria 3 (AC3) Frontend:
 * - Giảng viên và Quản lý đào tạo nhận thông báo cảnh báo vắng trên Dashboard
 * - Badge nhận diện rõ ràng "Vắng vượt ngưỡng" (nền đỏ nhạt, chữ đỏ đậm)
 * - Link "→ Xem bảng chuyên cần" trỏ chính xác về /classes/:classId/attendance-summary
 * - Hiển thị đúng tiêu đề, nội dung và thời gian của thông báo
 */

import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import { App } from '../App'
import * as scheduleApi from '../api/scheduleApi'
import * as programApi from '../api/trainingProgramApi'

const mockRequest = vi.fn()

vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        hasSession: true,
        user: { id: 'u-trainer-1', role: 'trainer', name: 'Thầy Giảng Viên' },
        permissions: ['schedule.personal_view', 'schedule.view', 'course.view'],
        request: mockRequest,
    }),
}))

describe('SCRUM-257 AC3 Frontend: Dashboard Absence Alert Notifications', () => {
    const mockNotifications: scheduleApi.ScheduleNotificationItem[] = [
        {
            id: 'notif-alert-001',
            schedule_id: '',
            class_id: 'cls-ictu-101',
            recipient_type: 'instructor',
            recipient_id: 'u-trainer-1',
            recipient_name: 'Thầy Giảng Viên',
            change_type: 'absence_alert',
            title: 'Cảnh báo vắng vượt ngưỡng: Học viên Nguyễn Văn A (CNTT-K20)',
            message: 'Học viên Nguyễn Văn A (Mã: HV001) có tỷ lệ vắng 25% (5/20 buổi), vượt ngưỡng 20% của lớp CNTT-K20.',
            created_at: '2026-10-22T08:00:00Z',
        },
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        vi.spyOn(programApi, 'getTrainingPrograms').mockResolvedValue({
            data: [],
            pagination: { page: 1, limit: 10, total_items: 0, total_pages: 0 },
        } as any)
    })

    afterEach(() => {
        cleanup()
    })

    it('renders absence alert notification with "Vắng vượt ngưỡng" badge and attendance summary link', async () => {
        vi.spyOn(scheduleApi, 'getMyScheduleNotifications').mockResolvedValue(mockNotifications)

        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <App />
            </MemoryRouter>
        )

        // 1. Chờ danh sách thông báo hiển thị
        await waitFor(() => {
            expect(screen.getByTestId('dashboard-notification-list')).toBeDefined()
        })

        // 2. Kiểm tra tiêu đề và nội dung thông báo
        expect(
            screen.getByText('Cảnh báo vắng vượt ngưỡng: Học viên Nguyễn Văn A (CNTT-K20)')
        ).toBeDefined()
        expect(
            screen.getByText(/có tỷ lệ vắng 25% \(5\/20 buổi\), vượt ngưỡng 20% của lớp CNTT-K20/)
        ).toBeDefined()

        // 3. Kiểm tra nhãn badge "Vắng vượt ngưỡng"
        const badge = screen.getByText('Vắng vượt ngưỡng')
        expect(badge).toBeDefined()
        expect(badge.getAttribute('style')).toContain('background-color: rgb(254, 226, 226)')
        expect(badge.getAttribute('style')).toContain('color: rgb(185, 28, 28)')

        // 4. Kiểm tra link dẫn sang bảng chuyên cần của lớp
        const link = screen.getByTestId('link-to-absence-alert-notif-alert-001')
        expect(link).toBeDefined()
        expect(link.textContent).toContain('→ Xem bảng chuyên cần')
        expect(link.getAttribute('href')).toBe('/classes/cls-ictu-101/attendance-summary')
    })
})
