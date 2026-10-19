// @vitest-environment jsdom
/**
 * Automated Tests cho SCRUM-255 Frontend Lát 1:
 * - Học viên xem danh sách đơn xin phép vắng của bản thân
 * - Bộ lọc trạng thái và tìm kiếm
 * - Gửi đơn xin phép vắng với validation
 * - Xem chi tiết đơn xin phép vắng
 */

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import { StudentAbsenceRequestsPage } from './StudentAbsenceRequestsPage'
import * as absenceApi from '../api/absenceRequestApi'

const mockRequest = vi.fn()

vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        hasSession: true,
        user: { id: 'u-trainee-1', role: 'trainee', name: 'Trần Văn Học Viên' },
        permissions: ['absence.request', 'schedule.personal_view'],
        request: mockRequest,
    }),
}))

describe('SCRUM-255: StudentAbsenceRequestsPage (Lát 1)', () => {
    const mockRequestsList: absenceApi.AbsenceRequestItem[] = [
        {
            id: 'req-001',
            schedule_id: 'sch-001',
            student_id: 'stu-001',
            reason: 'Em bị sốt cao cần đi khám tại bệnh viện đa khoa.',
            status: 'pending',
            status_label: 'Chờ duyệt',
            created_at: '2026-10-18T08:30:00Z',
            session_number: 1,
            topic: 'Nhập môn Lập trình Web',
            learning_date: '2026-10-20',
            shift: 'Ca 1',
            start_time: '08:00:00',
            end_time: '10:00:00',
            class_code: 'WEB_K21',
            subject_name: 'Lập trình Web cơ bản',
        },
        {
            id: 'req-002',
            schedule_id: 'sch-002',
            student_id: 'stu-001',
            reason: 'Em có việc gia đình đột xuất ở quê.',
            status: 'approved',
            status_label: 'Đã duyệt',
            created_at: '2026-10-15T09:00:00Z',
            reviewed_by: 'u-trainer-1',
            reviewer_name: 'Thầy Nguyễn Văn Giảng',
            reviewed_at: '2026-10-15T14:20:00Z',
            session_number: 2,
            topic: 'HTML và CSS nâng cao',
            learning_date: '2026-10-16',
            shift: 'Ca 2',
            start_time: '13:30:00',
            end_time: '15:30:00',
            class_code: 'WEB_K21',
            subject_name: 'Lập trình Web cơ bản',
        },
        {
            id: 'req-003',
            schedule_id: 'sch-003',
            student_id: 'stu-001',
            reason: 'Em ngủ quên không kịp đến lớp.',
            status: 'rejected',
            status_label: 'Từ chối',
            rejection_reason: 'Lý do cá nhân không chính đáng.',
            created_at: '2026-10-10T10:00:00Z',
            reviewed_by: 'u-trainer-1',
            reviewer_name: 'Thầy Nguyễn Văn Giảng',
            reviewed_at: '2026-10-10T11:00:00Z',
            session_number: 3,
            topic: 'Flexbox và Grid Layout',
            learning_date: '2026-10-10',
            shift: 'Ca 1',
            start_time: '08:00:00',
            end_time: '10:00:00',
            class_code: 'WEB_K21',
            subject_name: 'Lập trình Web cơ bản',
        },
    ]

    const mockEligibleSessions: absenceApi.EligibleSessionItem[] = [
        {
            schedule_id: 'sch-004',
            class_id: 'cls-001',
            class_code: 'WEB_K21',
            session_number: 4,
            topic: 'JavaScript ES6 cơ bản',
            subject_name: 'Lập trình Web cơ bản',
            learning_date: '2026-10-22',
            shift: 'Ca 1',
            start_time: '08:00:00',
            end_time: '10:00:00',
            has_pending_request: false,
        },
        {
            schedule_id: 'sch-001',
            class_id: 'cls-001',
            class_code: 'WEB_K21',
            session_number: 1,
            topic: 'Nhập môn Lập trình Web',
            subject_name: 'Lập trình Web cơ bản',
            learning_date: '2026-10-20',
            shift: 'Ca 1',
            start_time: '08:00:00',
            end_time: '10:00:00',
            has_pending_request: true,
        },
    ]

    beforeEach(() => {
        vi.spyOn(absenceApi, 'getMyAbsenceRequests').mockResolvedValue({
            items: mockRequestsList,
            pagination: {
                page: 1,
                limit: 10,
                total_items: 3,
                total_pages: 1,
            },
        })
        vi.spyOn(absenceApi, 'getEligibleSessions').mockResolvedValue(mockEligibleSessions)
    })

    afterEach(() => {
        cleanup()
        vi.clearAllMocks()
    })

    it('hiển thị danh sách đơn xin phép vắng và các trạng thái badge đúng chuẩn', async () => {
        render(
            <MemoryRouter>
                <StudentAbsenceRequestsPage />
            </MemoryRouter>
        )

        expect(screen.getByTestId('absence-loading')).toBeDefined()

        await waitFor(() => {
            expect(screen.getByTestId('absence-data-table')).toBeDefined()
        })

        // Kiểm tra các dòng dữ liệu
        expect(screen.getByText(/Nhập môn Lập trình Web/i)).toBeDefined()
        expect(screen.getByText('Em bị sốt cao cần đi khám tại bệnh viện đa khoa.')).toBeDefined()
        expect(screen.getByTestId('badge-pending')).toBeDefined()
        expect(screen.getByTestId('badge-approved')).toBeDefined()
        expect(screen.getByTestId('badge-rejected')).toBeDefined()
    })

    it('lọc danh sách theo trạng thái khi bấm vào các tab', async () => {
        render(
            <MemoryRouter>
                <StudentAbsenceRequestsPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('tab-pending')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('tab-pending'))

        await waitFor(() => {
            expect(absenceApi.getMyAbsenceRequests).toHaveBeenCalledWith(
                expect.any(Function),
                expect.objectContaining({ status: 'pending' })
            )
        })
    })

    it('mở modal tạo đơn, hiển thị buổi học và validate chặn gửi khi chưa chọn hoặc lý do rỗng', async () => {
        render(
            <MemoryRouter>
                <StudentAbsenceRequestsPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('create-absence-request-btn')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('create-absence-request-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('create-absence-modal')).toBeDefined()
            expect(screen.getByTestId('schedule-select')).toBeDefined()
            expect(screen.getByTestId('reason-textarea')).toBeDefined()
        })

        // Bấm gửi khi chưa nhập gì
        fireEvent.click(screen.getByTestId('submit-absence-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('schedule-error-msg').textContent).toContain(
                'Vui lòng chọn buổi học cần xin phép vắng.'
            )
        })

        // Chọn buổi học
        fireEvent.change(screen.getByTestId('schedule-select'), { target: { value: 'sch-004' } })

        // Nhập lý do chỉ gồm khoảng trắng
        fireEvent.change(screen.getByTestId('reason-textarea'), { target: { value: '     ' } })
        fireEvent.click(screen.getByTestId('submit-absence-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('reason-error-msg').textContent).toContain(
                'Vui lòng nhập lý do xin phép vắng.'
            )
        })

        // Nhập lý do quá ngắn (< 5 ký tự)
        fireEvent.change(screen.getByTestId('reason-textarea'), { target: { value: 'Ốm' } })
        fireEvent.click(screen.getByTestId('submit-absence-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('reason-error-msg').textContent).toContain(
                'Lý do xin phép vắng phải có ít nhất 5 ký tự.'
            )
        })
    })

    it('gửi đơn thành công, gọi API submitAbsenceRequest và đóng modal', async () => {
        const submitSpy = vi.spyOn(absenceApi, 'submitAbsenceRequest').mockResolvedValue({
            id: 'req-new-001',
            schedule_id: 'sch-004',
            student_id: 'stu-001',
            reason: 'Em bị sốt xuất huyết phải nằm viện điều trị.',
            status: 'pending',
            status_label: 'Chờ duyệt',
            created_at: '2026-10-20T08:00:00Z',
        })

        render(
            <MemoryRouter>
                <StudentAbsenceRequestsPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('create-absence-request-btn')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('create-absence-request-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('schedule-select')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('schedule-select'), { target: { value: 'sch-004' } })
        fireEvent.change(screen.getByTestId('reason-textarea'), {
            target: { value: 'Em bị sốt xuất huyết phải nằm viện điều trị.' },
        })

        fireEvent.click(screen.getByTestId('submit-absence-btn'))

        await waitFor(() => {
            expect(submitSpy).toHaveBeenCalledWith(expect.any(Function), {
                schedule_id: 'sch-004',
                reason: 'Em bị sốt xuất huyết phải nằm viện điều trị.',
            })
        })

        await waitFor(() => {
            expect(screen.getByTestId('absence-success-banner').textContent).toContain(
                'Gửi đơn xin phép vắng thành công'
            )
        })
    })

    it('xem chi tiết đơn khi bấm nút Chi tiết', async () => {
        const detailSpy = vi.spyOn(absenceApi, 'getAbsenceRequestDetail').mockResolvedValue(mockRequestsList[0])

        render(
            <MemoryRouter>
                <StudentAbsenceRequestsPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('view-detail-btn-req-001')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('view-detail-btn-req-001'))

        await waitFor(() => {
            expect(detailSpy).toHaveBeenCalledWith(expect.any(Function), 'req-001')
            expect(screen.getByTestId('detail-absence-modal')).toBeDefined()
            expect(screen.getByText('Chi tiết đơn xin phép vắng')).toBeDefined()
        })
    })
})
