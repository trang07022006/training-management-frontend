// @vitest-environment jsdom
/**
 * Automated Tests cho SCRUM-255 Frontend Lát 4:
 * - Học viên nhận thông báo kết quả duyệt/từ chối đơn trên Dashboard
 * - Thông báo có link dẫn đúng tới trang đơn xin phép vắng
 * - Nhãn và màu sắc nhận diện rõ ràng (Đơn được duyệt / Đơn bị từ chối)
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
        user: { id: 'u-trainee-1', role: 'trainee', name: 'Trần Văn Học Viên' },
        permissions: ['schedule.personal_view', 'absence.request'],
        request: mockRequest,
    }),
}))

describe('SCRUM-255 Frontend Lát 4: Dashboard Absence Notifications', () => {
    const mockNotifications: scheduleApi.ScheduleNotificationItem[] = [
        {
            id: 'notif-001',
            schedule_id: 'sch-001',
            class_id: 'cls-001',
            recipient_type: 'student',
            recipient_id: 'u-trainee-1',
            recipient_name: 'Trần Văn Học Viên',
            change_type: 'absence_approved',
            title: 'Đơn xin phép vắng đã được duyệt',
            message: 'Đơn xin phép vắng buổi #1 (Lập trình Web) ngày 20/10/2026 của bạn đã được Thầy Giảng viên chấp thuận. Điểm danh buổi học đã cập nhật thành Vắng có phép.',
            created_at: '2026-10-20T03:30:00Z',
        },
        {
            id: 'notif-002',
            schedule_id: 'sch-002',
            class_id: 'cls-001',
            recipient_type: 'student',
            recipient_id: 'u-trainee-1',
            recipient_name: 'Trần Văn Học Viên',
            change_type: 'absence_rejected',
            title: 'Đơn xin phép vắng đã bị từ chối',
            message: 'Đơn xin phép vắng buổi #2 (Lập trình Web) ngày 22/10/2026 của bạn đã bị từ chối bởi Thầy Giảng viên. Lý do: Giấy khám bệnh không có dấu đỏ.',
            created_at: '2026-10-20T03:35:00Z',
        },
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        vi.spyOn(programApi, 'getTrainingPrograms').mockResolvedValue({
            data: [],
            pagination: { page: 1, limit: 10, total_items: 0, total_pages: 0 },
        } as any)
        vi.spyOn(scheduleApi, 'getMyScheduleNotifications').mockResolvedValue(mockNotifications)
    })

    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('hiển thị thông báo duyệt và từ chối đơn xin phép vắng với nhãn và liên kết điều hướng', async () => {
        render(
            <MemoryRouter>
                <App />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('dashboard-notification-list')).toBeDefined()
        })

        // Thông báo duyệt
        expect(screen.getByText('Đơn xin phép vắng đã được duyệt')).toBeDefined()
        expect(screen.getByText('Đơn được duyệt')).toBeDefined()
        expect(screen.getByTestId('link-to-absence-notif-001')).toBeDefined()

        // Thông báo từ chối
        expect(screen.getByText('Đơn xin phép vắng đã bị từ chối')).toBeDefined()
        expect(screen.getByText('Đơn bị từ chối')).toBeDefined()
        expect(screen.getByText(/Giấy khám bệnh không có dấu đỏ/i)).toBeDefined()
        expect(screen.getByTestId('link-to-absence-notif-002')).toBeDefined()
    })
})
