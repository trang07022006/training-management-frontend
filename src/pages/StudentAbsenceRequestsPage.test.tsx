// @vitest-environment jsdom
/**
 * Automated Tests cho SCRUM-255 Frontend Lát 1 & Lát 2:
 * - Học viên xem danh sách đơn xin phép vắng của bản thân
 * - Bộ lọc trạng thái và tìm kiếm
 * - Gửi đơn xin phép vắng có/không có minh chứng (Lát 1 & Lát 2)
 * - Xóa tệp đính kèm trước khi gửi
 * - Chặn tệp quá 5MB hoặc sai định dạng ở client
 * - Xem chi tiết đơn và tải tệp minh chứng
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

describe('SCRUM-255: StudentAbsenceRequestsPage (Lát 1 & Lát 2)', () => {
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
            attachment_count: 2,
            attachments: [
                {
                    id: 'att-001',
                    file_name: 'don_thuoc.png',
                    file_size: 154000,
                    mime_type: 'image/png',
                },
                {
                    id: 'att-002',
                    file_name: 'giay_xac_nhan.pdf',
                    file_size: 320000,
                    mime_type: 'application/pdf',
                },
            ],
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
            attachment_count: 0,
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
            attachment_count: 0,
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

    it('hiển thị danh sách đơn xin phép vắng, các trạng thái badge và số lượng minh chứng', async () => {
        render(
            <MemoryRouter>
                <StudentAbsenceRequestsPage />
            </MemoryRouter>
        )

        expect(screen.getByTestId('loading-state')).toBeDefined()

        await waitFor(() => {
            expect(screen.getByTestId('absence-requests-table')).toBeDefined()
        })

        // Kiểm tra các dòng dữ liệu
        expect(screen.getByText(/Nhập môn Lập trình Web/i)).toBeDefined()
        expect(screen.getByText('Em bị sốt cao cần đi khám tại bệnh viện đa khoa.')).toBeDefined()
        expect(screen.getByTestId('badge-pending')).toBeDefined()
        expect(screen.getByTestId('badge-approved')).toBeDefined()
        expect(screen.getByTestId('badge-rejected')).toBeDefined()

        // Kiểm tra badge minh chứng Lát 2
        expect(screen.getByTestId('attachment-count-req-001')).toBeDefined()
        expect(screen.getByText(/2 minh chứng/i)).toBeDefined()
    })

    it('lọc danh sách theo trạng thái khi bấm vào các tab', async () => {
        render(
            <MemoryRouter>
                <StudentAbsenceRequestsPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('filter-tab-pending')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('filter-tab-pending'))

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
            expect(screen.getByTestId('create-absence-btn')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('create-absence-btn'))

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

    it('chọn đính kèm minh chứng hợp lệ, cho phép xóa tệp và gửi FormData thành công (Lát 2)', async () => {
        const submitSpy = vi.spyOn(absenceApi, 'submitAbsenceRequest').mockResolvedValue({
            id: 'req-new-001',
            schedule_id: 'sch-004',
            student_id: 'stu-001',
            reason: 'Em bị sốt xuất huyết có giấy nhập viện.',
            status: 'pending',
            status_label: 'Chờ duyệt',
            created_at: '2026-10-20T08:00:00Z',
            attachment_count: 1,
        })

        render(
            <MemoryRouter>
                <StudentAbsenceRequestsPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('create-absence-btn')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('create-absence-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('schedule-select')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('schedule-select'), { target: { value: 'sch-004' } })
        fireEvent.change(screen.getByTestId('reason-textarea'), {
            target: { value: 'Em bị sốt xuất huyết có giấy nhập viện.' },
        })

        // Giả lập chọn 2 tệp: don_thuoc.png và file_nham.pdf
        const file1 = new File(['fake-png-content'], 'don_thuoc.png', { type: 'image/png' })
        const file2 = new File(['fake-pdf-content'], 'file_nham.pdf', { type: 'application/pdf' })
        const input = screen.getByTestId('file-attachment-input')

        fireEvent.change(input, { target: { files: [file1, file2] } })

        await waitFor(() => {
            expect(screen.getByTestId('selected-files-list')).toBeDefined()
            expect(screen.getByText('don_thuoc.png')).toBeDefined()
            expect(screen.getByText('file_nham.pdf')).toBeDefined()
        })

        // Xóa file2 trước khi gửi
        fireEvent.click(screen.getByTestId('remove-file-btn-1'))

        await waitFor(() => {
            expect(screen.queryByText('file_nham.pdf')).toBeNull()
            expect(screen.getByText('don_thuoc.png')).toBeDefined()
        })

        // Bấm gửi đơn
        fireEvent.click(screen.getByTestId('submit-absence-btn'))

        await waitFor(() => {
            expect(submitSpy).toHaveBeenCalled()
            const callArg = submitSpy.mock.calls[0][1]
            expect(callArg instanceof FormData).toBe(true)
            const formData = callArg as FormData
            expect(formData.get('schedule_id')).toBe('sch-004')
            expect(formData.get('reason')).toBe('Em bị sốt xuất huyết có giấy nhập viện.')
            expect(formData.get('attachments')).toBeDefined()
        })

        await waitFor(() => {
            expect(screen.getByTestId('success-banner').textContent).toContain(
                'Gửi đơn xin phép vắng thành công'
            )
        })
    })

    it('chặn tệp đính kèm quá 5MB hoặc sai định dạng ở client', async () => {
        render(
            <MemoryRouter>
                <StudentAbsenceRequestsPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('create-absence-btn')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('create-absence-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('file-attachment-input')).toBeDefined()
        })

        const input = screen.getByTestId('file-attachment-input')

        // 1. Tệp đuôi .exe
        const invalidFile = new File(['content'], 'trojan.exe', { type: 'application/x-msdownload' })
        fireEvent.change(input, { target: { files: [invalidFile] } })

        await waitFor(() => {
            expect(screen.getByTestId('file-error-msg').textContent).toContain('không hợp lệ')
        })

        // 2. Tệp dung lượng > 5MB
        const hugeFile = new File(['0'.repeat(5 * 1024 * 1024 + 10)], 'huge.pdf', { type: 'application/pdf' })
        Object.defineProperty(hugeFile, 'size', { value: 6 * 1024 * 1024 })
        fireEvent.change(input, { target: { files: [hugeFile] } })

        await waitFor(() => {
            expect(screen.getByTestId('file-error-msg').textContent).toContain('vượt quá dung lượng tối đa 5MB')
        })
    })

    it('xem chi tiết đơn, hiển thị tệp đính kèm và gọi downloadAbsenceAttachment khi bấm Tải xuống (Lát 2)', async () => {
        const detailSpy = vi.spyOn(absenceApi, 'getAbsenceRequestDetail').mockResolvedValue(mockRequestsList[0])
        const downloadSpy = vi.spyOn(absenceApi, 'downloadAbsenceAttachment').mockResolvedValue(undefined)

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
            // Hiển thị section tệp minh chứng
            expect(screen.getByTestId('detail-attachments-section')).toBeDefined()
            expect(screen.getByText('don_thuoc.png')).toBeDefined()
            expect(screen.getByText('giay_xac_nhan.pdf')).toBeDefined()
        })

        // Bấm Tải xuống tệp đầu tiên
        fireEvent.click(screen.getByTestId('download-att-btn-att-001'))

        await waitFor(() => {
            expect(downloadSpy).toHaveBeenCalledWith(expect.any(Function), 'req-001', 'att-001', 'don_thuoc.png')
        })
    })

    it('xem chi tiết đơn đang chờ duyệt hiển thị thông báo chờ xét duyệt rõ ràng (Lát 4)', async () => {
        vi.spyOn(absenceApi, 'getAbsenceRequestDetail').mockResolvedValue(mockRequestsList[0]) // req-001: pending

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
            expect(screen.getByTestId('detail-absence-modal')).toBeDefined()
            // Hiển thị notice đang chờ duyệt, không hiển thị nhầm như đã duyệt
            expect(screen.getByTestId('pending-review-notice')).toBeDefined()
            expect(screen.getByText(/Đơn xin phép vắng đang chờ giảng viên hoặc quản lý đào tạo xem xét/i)).toBeDefined()
        })
    })

    it('xem chi tiết đơn bị từ chối hiển thị người xử lý và lý do từ chối (Lát 4)', async () => {
        vi.spyOn(absenceApi, 'getAbsenceRequestDetail').mockResolvedValue(mockRequestsList[2]) // req-003: rejected

        render(
            <MemoryRouter>
                <StudentAbsenceRequestsPage />
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('view-detail-btn-req-003')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('view-detail-btn-req-003'))

        await waitFor(() => {
            expect(screen.getByTestId('detail-absence-modal')).toBeDefined()
            expect(screen.getByText('Thầy Nguyễn Văn Giảng')).toBeDefined()
            expect(screen.getByText('Lý do cá nhân không chính đáng.')).toBeDefined()
        })
    })
})

