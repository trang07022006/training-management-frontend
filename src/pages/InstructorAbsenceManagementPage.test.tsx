// @vitest-environment jsdom
/**
 * Automated Tests cho SCRUM-255 Frontend Lát 3:
 * - Giảng viên xem danh sách đơn xin phép vắng thuộc phạm vi phụ trách
 * - Bộ lọc trạng thái (Chờ duyệt, Đã duyệt, Từ chối, Tất cả) và tìm kiếm học viên
 * - Xem chi tiết đơn, lý do và tải tệp minh chứng
 * - Duyệt đơn (Approve) cập nhật thành công và hiển thị thông báo
 * - Từ chối đơn (Reject) bắt buộc nhập lý do hợp lệ
 * - Xử lý lỗi xung đột điểm danh (ATTENDANCE_CONFLICT khi học viên đã có mặt/muộn)
 */

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import { InstructorAbsenceManagementPage } from './InstructorAbsenceManagementPage'
import * as absenceApi from '../api/absenceRequestApi'

const mockRequest = vi.fn()

vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        hasSession: true,
        user: { id: 'u-trainer-1', role: 'trainer', name: 'Thầy Nguyễn Văn Giảng' },
        permissions: ['absence.review', 'attendance.take'],
        request: mockRequest,
    }),
}))

describe('SCRUM-255: InstructorAbsenceManagementPage (Lát 3 - Duyệt đơn)', () => {
    const mockReviewerRequests: absenceApi.AbsenceRequestItem[] = [
        {
            id: 'req-001',
            schedule_id: 'sch-001',
            student_id: 'stu-001',
            student_code: 'HV001',
            student_name: 'Trần Văn An',
            student_email: 'an.tran@example.com',
            reason: 'Em bị sốt xuất huyết phải nhập viện điều trị 3 ngày.',
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
            attachment_count: 1,
            attachments: [
                {
                    id: 'att-001',
                    file_name: 'giay_ra_vien.pdf',
                    file_size: 250000,
                    mime_type: 'application/pdf',
                },
            ],
        },
        {
            id: 'req-002',
            schedule_id: 'sch-002',
            student_id: 'stu-002',
            student_code: 'HV002',
            student_name: 'Lê Thị Bình',
            student_email: 'binh.le@example.com',
            reason: 'Em đi công tác đột xuất của cơ quan.',
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
            attachment_count: 0,
        },
        {
            id: 'req-003',
            schedule_id: 'sch-003',
            student_id: 'stu-003',
            student_code: 'HV003',
            student_name: 'Phạm Quốc Cường',
            student_email: 'cuong.pham@example.com',
            reason: 'Em ngủ quên không kịp đến lớp.',
            status: 'rejected',
            status_label: 'Từ chối',
            rejection_reason: 'Lý do ngủ quên không thuộc diện vắng có phép.',
            created_at: '2026-10-10T10:00:00Z',
            reviewed_by: 'u-trainer-1',
            reviewer_name: 'Thầy Nguyễn Văn Giảng',
            reviewed_at: '2026-10-10T11:00:00Z',
            session_number: 3,
            topic: 'JavaScript căn bản',
            learning_date: '2026-10-10',
            shift: 'Ca 1',
            start_time: '08:00:00',
            end_time: '10:00:00',
            class_code: 'WEB_K21',
            subject_name: 'Lập trình Web cơ bản',
            attachment_count: 0,
        },
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        vi.spyOn(absenceApi, 'getAbsenceRequestsForReviewer').mockResolvedValue({
            items: mockReviewerRequests,
            pagination: {
                page: 1,
                limit: 10,
                total_items: 3,
                total_pages: 1,
            },
            status_counts: {
                all: 3,
                pending: 1,
                approved: 1,
                rejected: 1,
            },
        })
        vi.spyOn(absenceApi, 'getAbsenceRequestDetail').mockImplementation(async (_req, id) => {
            const found = mockReviewerRequests.find((r) => r.id === id)
            if (found) return found
            throw new Error('Not found')
        })
        vi.spyOn(absenceApi, 'downloadAbsenceAttachment').mockResolvedValue()
        vi.spyOn(window, 'confirm').mockReturnValue(true)
    })

    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('hiển thị danh sách đơn chờ duyệt và số liệu thống kê', async () => {
        render(
            <MemoryRouter>
                <InstructorAbsenceManagementPage />
            </MemoryRouter>
        )

        expect(screen.getByTestId('loading-state')).toBeDefined()

        await waitFor(() => {
            expect(screen.getByText('Xét duyệt đơn xin phép vắng')).toBeDefined()
        })

        // Kiểm tra danh sách học viên hiển thị
        expect(screen.getByText('Trần Văn An')).toBeDefined()
        expect(screen.getByText('HV001')).toBeDefined()
        expect(screen.getByText('Em bị sốt xuất huyết phải nhập viện điều trị 3 ngày.')).toBeDefined()

        // Tab lọc
        expect(screen.getByTestId('filter-tab-pending')).toBeDefined()
        expect(screen.getByTestId('filter-tab-approved')).toBeDefined()
        expect(screen.getByTestId('filter-tab-rejected')).toBeDefined()
    })

    it('cho phép xem chi tiết đơn và thông tin đính kèm', async () => {
        render(
            <MemoryRouter>
                <InstructorAbsenceManagementPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('review-btn-req-001')).toBeDefined()
        })

        // Bấm nút Xem & Duyệt
        fireEvent.click(screen.getByTestId('review-btn-req-001'))

        // Modal chi tiết mở ra
        await waitFor(() => {
            expect(screen.getByTestId('review-absence-modal')).toBeDefined()
            expect(screen.getByText('giay_ra_vien.pdf')).toBeDefined()
        })

        // Bấm nút tải file minh chứng
        const downloadBtn = screen.getByTestId('download-att-btn-att-001')
        fireEvent.click(downloadBtn)

        expect(absenceApi.downloadAbsenceAttachment).toHaveBeenCalledWith(
            expect.any(Function),
            'req-001',
            'att-001',
            'giay_ra_vien.pdf'
        )
    })

    it('duyệt đơn (Approve) thành công và cập nhật danh sách', async () => {
        const reviewSpy = vi.spyOn(absenceApi, 'reviewAbsenceRequest').mockResolvedValue({
            ...mockReviewerRequests[0],
            status: 'approved',
            status_label: 'Đã duyệt',
            student_name: 'Trần Văn An',
            reviewed_by: 'u-trainer-1',
            reviewer_name: 'Thầy Nguyễn Văn Giảng',
            reviewed_at: '2026-10-20T03:00:00Z',
            rejection_reason: null,
            attendance_updated: true,
            attendance_status: 'excused',
        })

        render(
            <MemoryRouter>
                <InstructorAbsenceManagementPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('review-btn-req-001')).toBeDefined()
        })

        // Bấm nút Xem & Duyệt
        fireEvent.click(screen.getByTestId('review-btn-req-001'))

        await waitFor(() => {
            expect(screen.getByTestId('approve-absence-btn')).toBeDefined()
        })

        // Bấm Phê duyệt đơn
        fireEvent.click(screen.getByTestId('approve-absence-btn'))

        await waitFor(() => {
            expect(reviewSpy).toHaveBeenCalledWith(
                expect.any(Function),
                'req-001',
                { action: 'approve' }
            )
            expect(screen.getByTestId('success-banner')).toBeDefined()
        })
    })

    it('từ chối đơn (Reject) yêu cầu bắt buộc nhập lý do từ chối', async () => {
        const reviewSpy = vi.spyOn(absenceApi, 'reviewAbsenceRequest').mockResolvedValue({
            ...mockReviewerRequests[0],
            status: 'rejected',
            status_label: 'Từ chối',
            student_name: 'Trần Văn An',
            reviewed_by: 'u-trainer-1',
            reviewer_name: 'Thầy Nguyễn Văn Giảng',
            reviewed_at: '2026-10-20T03:00:00Z',
            rejection_reason: 'Minh chứng không hợp lệ.',
            attendance_updated: false,
            attendance_status: null,
        })

        render(
            <MemoryRouter>
                <InstructorAbsenceManagementPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('review-btn-req-001')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('review-btn-req-001'))

        await waitFor(() => {
            expect(screen.getByTestId('reject-absence-btn')).toBeDefined()
        })

        // Bấm Từ chối đơn
        fireEvent.click(screen.getByTestId('reject-absence-btn'))

        // Form nhập lý do từ chối hiển thị
        await waitFor(() => {
            expect(screen.getByTestId('rejection-form')).toBeDefined()
        })

        // Để trống lý do và bấm xác nhận -> chặn với lỗi
        fireEvent.click(screen.getByTestId('confirm-reject-btn'))
        expect(screen.getByTestId('rejection-error-msg')).toBeDefined()
        expect(reviewSpy).not.toHaveBeenCalled()

        // Nhập lý do hợp lệ
        const textarea = screen.getByTestId('rejection-reason-textarea')
        fireEvent.change(textarea, { target: { value: 'Minh chứng không hợp lệ.' } })

        fireEvent.click(screen.getByTestId('confirm-reject-btn'))

        await waitFor(() => {
            expect(reviewSpy).toHaveBeenCalledWith(
                expect.any(Function),
                'req-001',
                { action: 'reject', rejection_reason: 'Minh chứng không hợp lệ.' }
            )
            expect(screen.getByTestId('success-banner')).toBeDefined()
        })
    })

    it('xử lý lỗi ATTENDANCE_CONFLICT khi học viên đã điểm danh Có mặt/Đi muộn', async () => {
        vi.spyOn(absenceApi, 'reviewAbsenceRequest').mockRejectedValue({
            code: 'ATTENDANCE_CONFLICT',
            message: 'Học viên đã có mặt hoặc đi muộn tại buổi học này. Không thể duyệt đơn vắng có phép.',
        })

        render(
            <MemoryRouter>
                <InstructorAbsenceManagementPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('review-btn-req-001')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('review-btn-req-001'))

        await waitFor(() => {
            expect(screen.getByTestId('approve-absence-btn')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('approve-absence-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('error-banner')).toBeDefined()
            expect(screen.getByText(/Không thể duyệt đơn vắng có phép/i)).toBeDefined()
        })
    })
})
