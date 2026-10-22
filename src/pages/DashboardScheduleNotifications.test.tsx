// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { App } from '../App'
import * as scheduleApi from '../api/scheduleApi'
import * as trainingProgramApi from '../api/trainingProgramApi'

vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        hasSession: true,
        userId: 'student-test-user-id',
        userName: 'Học Viên Test',
        userEmail: 'student@ictu.edu.vn',
        role: 'trainee',
        permissions: ['course.view'],
        request: vi.fn(),
    }),
}))

describe('Dashboard Personal Schedule Notifications (SCRUM-226)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.spyOn(trainingProgramApi, 'getTrainingPrograms').mockResolvedValue({
            items: [],
            total: 0,
            page: 1,
            page_size: 1,
            total_pages: 0,
        })
    })

    it('gọi getMyScheduleNotifications và hiển thị đầy đủ thông báo đổi/hủy lịch của học viên', async () => {
        const mockNotifs: scheduleApi.ScheduleNotificationItem[] = [
            {
                id: 'notif-1',
                schedule_id: 'sched-1',
                class_id: 'class-1',
                recipient_type: 'student',
                recipient_id: 'student-test-user-id',
                recipient_name: 'Học Viên Test',
                recipient_email: 'student@ictu.edu.vn',
                change_type: 'rescheduled',
                title: '[ICTU] Thông báo dời lịch học #3 - Lớp L01-2026',
                message: 'Buổi học #3 đã được dời sang ngày 20/11/2026, ca 2 phòng P201.',
                created_at: '2026-10-16T10:00:00Z',
            },
            {
                id: 'notif-2',
                schedule_id: 'sched-2',
                class_id: 'class-1',
                recipient_type: 'student',
                recipient_id: 'student-test-user-id',
                recipient_name: 'Học Viên Test',
                recipient_email: 'student@ictu.edu.vn',
                change_type: 'cancelled',
                title: '[ICTU] Thông báo hủy buổi học #5 - Lớp L01-2026',
                message: 'Buổi học #5 bị hủy do giảng viên bận đột xuất.',
                created_at: '2026-10-16T11:00:00Z',
            },
        ]

        const getNotifsSpy = vi
            .spyOn(scheduleApi, 'getMyScheduleNotifications')
            .mockResolvedValue(mockNotifs)

        render(
            <MemoryRouter>
                <App />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(getNotifsSpy).toHaveBeenCalled()
        })

        expect(
            await screen.findByText('[ICTU] Thông báo dời lịch học #3 - Lớp L01-2026')
        ).toBeTruthy()
        expect(
            screen.getByText('Buổi học #3 đã được dời sang ngày 20/11/2026, ca 2 phòng P201.')
        ).toBeTruthy()
        expect(screen.getByText('Đổi lịch')).toBeTruthy()

        expect(
            screen.getByText('[ICTU] Thông báo hủy buổi học #5 - Lớp L01-2026')
        ).toBeTruthy()
        expect(
            screen.getByText('Buổi học #5 bị hủy do giảng viên bận đột xuất.')
        ).toBeTruthy()
        expect(screen.getByText('Hủy buổi')).toBeTruthy()
    })

    it('hiển thị thông báo rỗng khi người dùng chưa có thông báo thời khóa biểu nào', async () => {
        vi.spyOn(scheduleApi, 'getMyScheduleNotifications').mockResolvedValue([])

        render(
            <MemoryRouter>
                <App />
            </MemoryRouter>
        )

        expect(await screen.findByText('Chưa có thông báo')).toBeTruthy()
        expect(
            screen.getByText('Hiện tại chưa có thông báo mới nào từ hệ thống đào tạo.')
        ).toBeTruthy()
    })
})
