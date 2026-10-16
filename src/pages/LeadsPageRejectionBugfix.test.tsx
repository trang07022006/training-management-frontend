// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react'
import { LeadsPage } from './LeadsPage'
import { LeadDetailPage } from './LeadDetailPage'
import {
    getLeads,
    getLead,
    updateLeadStatus,
    getAssignableUsers,
    getLeadAssignmentHistory,
    getLeadPipeline,
    getLeadStatusHistory,
    getLeadCareLogs,
    ApiError,
    type Lead,
    type LeadListResponseData,
    type PipelineData,
} from '../api/leadApi'
import { MemoryRouter, Route, Routes } from 'react-router'

// Mock SessionProvider
const mockRequest = vi.fn()
let mockCurrentRole = 'admin'
let mockCurrentRoles = ['admin']
let mockCurrentPermissions = ['course.manage', 'lead.delete']

vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        request: mockRequest,
        role: mockCurrentRole,
        roles: mockCurrentRoles,
        permissions: mockCurrentPermissions,
    }),
}))

// Mock leadApi
vi.mock('../api/leadApi', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/leadApi')>()
    return {
        ...actual,
        getLeads: vi.fn(),
        getLead: vi.fn(),
        updateLeadStatus: vi.fn(),
        assignLead: vi.fn(),
        getAssignableUsers: vi.fn(),
        getLeadAssignmentHistory: vi.fn(),
        bulkAssignLeads: vi.fn(),
        createLead: vi.fn(),
        updateLead: vi.fn(),
        deleteLead: vi.fn(),
        checkLeadPhone: vi.fn(),
        getLeadPipeline: vi.fn(),
        getLeadStatusHistory: vi.fn(),
        getLeadCareLogs: vi.fn(),
        convertLeadToStudent: vi.fn(),
        getLeadStudent: vi.fn(),
    }
})

// Mock trainingProgramApi
vi.mock('../api/trainingProgramApi', () => ({
    getTrainingPrograms: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}))

describe('SCRUM-213 Lead Rejection Flow & Toast Verification', () => {
    const sampleLead: Lead = {
        id: 'lead-test-01',
        full_name: 'Nguyễn Văn Test',
        phone: '0988112233',
        email: 'test@example.com',
        interested_program_id: 'prog-1',
        interested_program_name: 'Lập trình Web',
        message: 'Cần tư vấn khóa học',
        source: 'direct',
        status: 'new',
        assigned_to_user_id: 'user-01',
        assigned_to_name: 'Tư Vấn Viên A',
        created_at: '2026-03-10T10:00:00Z',
        updated_at: '2026-03-10T10:00:00Z',
    }

    const mockPipeline: PipelineData = {
        columns: [
            { status: 'new', label: 'Mới', count: 1, leads: [sampleLead] },
            { status: 'contacted', label: 'Đã liên hệ', count: 0, leads: [] },
            { status: 'consulting', label: 'Đang tư vấn', count: 0, leads: [] },
            { status: 'trial_scheduled', label: 'Hẹn học thử', count: 0, leads: [] },
            { status: 'won', label: 'Chốt', count: 0, leads: [] },
            { status: 'rejected', label: 'Từ chối', count: 0, leads: [] },
        ],
        leads: [sampleLead],
        counts: {
            new: 1,
            contacted: 0,
            consulting: 0,
            trial_scheduled: 0,
            won: 0,
            rejected: 0,
        },
        total: 1,
    }

    const mockListResponse: LeadListResponseData = {
        items: [sampleLead],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
    }

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLeadPipeline).mockResolvedValue(mockPipeline)
        vi.mocked(getAssignableUsers).mockResolvedValue([])
        vi.mocked(getLeadAssignmentHistory).mockResolvedValue([])
        vi.mocked(getLeadStatusHistory).mockResolvedValue([])
        vi.mocked(getLeadCareLogs).mockResolvedValue([])
        vi.mocked(getLead).mockResolvedValue(sampleLead)
    })

    afterEach(() => {
        cleanup()
    })

    it('1. Bảng phễu: Kéo vào Từ chối, xác nhận thành công hiển thị đúng một toast, cập nhật cột và số lượng', async () => {
        const updatedPipeline: PipelineData = {
            columns: [
                { status: 'new', label: 'Mới', count: 0, leads: [] },
                { status: 'contacted', label: 'Đã liên hệ', count: 0, leads: [] },
                { status: 'consulting', label: 'Đang tư vấn', count: 0, leads: [] },
                { status: 'trial_scheduled', label: 'Hẹn học thử', count: 0, leads: [] },
                { status: 'won', label: 'Chốt', count: 0, leads: [] },
                { status: 'rejected', label: 'Từ chối', count: 1, leads: [{ ...sampleLead, status: 'rejected', rejection_reason: 'Không còn nhu cầu' }] },
            ],
            leads: [{ ...sampleLead, status: 'rejected', rejection_reason: 'Không còn nhu cầu' }],
            counts: {
                new: 0,
                contacted: 0,
                consulting: 0,
                trial_scheduled: 0,
                won: 0,
                rejected: 1,
            },
            total: 1,
        }
        vi.mocked(getLeadPipeline).mockResolvedValueOnce(mockPipeline).mockResolvedValue(updatedPipeline)

        vi.mocked(updateLeadStatus).mockResolvedValue({
            ...sampleLead,
            status: 'rejected',
            rejection_reason: 'Không còn nhu cầu',
        })

        render(<LeadsPage />)

        fireEvent.click(screen.getByTestId('view-mode-pipeline-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('lead-card-lead-test-01')).toBeDefined()
        })

        // Drag to rejected column
        const card = screen.getByTestId('lead-card-lead-test-01')
        const rejectedCol = screen.getByTestId('pipeline-column-rejected')
        const mockDataTransfer = {
            setData: vi.fn(),
            getData: vi.fn().mockReturnValue('lead-test-01'),
        }

        fireEvent.dragStart(card, { dataTransfer: mockDataTransfer })
        fireEvent.drop(rejectedCol, { dataTransfer: mockDataTransfer })

        // Modal xuất hiện
        await waitFor(() => {
            expect(screen.getByTestId('rejection-modal')).toBeDefined()
        })

        // Chọn lý do và bấm xác nhận
        fireEvent.change(screen.getByTestId('rejection-reason-select'), {
            target: { value: 'Không còn nhu cầu' },
        })

        const confirmBtn = screen.getByTestId('rejection-confirm-btn')
        fireEvent.click(confirmBtn)

        // API được gọi đúng tham số
        await waitFor(() => {
            expect(updateLeadStatus).toHaveBeenCalledWith(
                mockRequest,
                'lead-test-01',
                'rejected',
                'Không còn nhu cầu',
                undefined,
            )
        })

        // Modal đóng và toast thành công xuất hiện
        await waitFor(() => {
            expect(screen.queryByTestId('rejection-modal')).toBeNull()
            const toasts = screen.getAllByTestId('page-success')
            expect(toasts.length).toBe(1)
            expect(toasts[0].textContent).toContain('Đã chuyển khách hàng tiềm năng sang trạng thái Từ chối.')
        })

        // Cột Mới giảm còn 0, cột Từ chối tăng lên 1
        await waitFor(() => {
            expect(screen.getByTestId('pipeline-column-title-new').textContent).toBe('Mới (0)')
            expect(screen.getByTestId('pipeline-column-title-rejected').textContent).toBe('Từ chối (1)')
        })
    })

    it('2. Validation: Lý do rỗng hoặc toàn khoảng trắng không gửi API và hiển thị lỗi ngay cạnh trường nhập', async () => {
        render(<LeadsPage />)

        fireEvent.click(screen.getByTestId('view-mode-pipeline-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('lead-card-lead-test-01')).toBeDefined()
        })

        const card = screen.getByTestId('lead-card-lead-test-01')
        const rejectedCol = screen.getByTestId('pipeline-column-rejected')
        const mockDataTransfer = {
            setData: vi.fn(),
            getData: vi.fn().mockReturnValue('lead-test-01'),
        }

        fireEvent.dragStart(card, { dataTransfer: mockDataTransfer })
        fireEvent.drop(rejectedCol, { dataTransfer: mockDataTransfer })

        await waitFor(() => {
            expect(screen.getByTestId('rejection-modal')).toBeDefined()
        })

        // Chọn lý do rỗng
        fireEvent.change(screen.getByTestId('rejection-reason-select'), {
            target: { value: '' },
        })

        fireEvent.click(screen.getByTestId('rejection-confirm-btn'))

        // Hiển thị lỗi ngay cạnh trường nhập và không gọi API
        await waitFor(() => {
            expect(screen.getByTestId('rejection-reason-error').textContent).toBe('Vui lòng chọn lý do từ chối.')
        })
        expect(updateLeadStatus).not.toHaveBeenCalled()

        // Chọn "Khác" nhưng ghi chú toàn khoảng trắng
        fireEvent.change(screen.getByTestId('rejection-reason-select'), {
            target: { value: 'Khác' },
        })
        fireEvent.change(screen.getByTestId('rejection-notes-input'), {
            target: { value: '   ' },
        })

        fireEvent.click(screen.getByTestId('rejection-confirm-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('rejection-notes-error').textContent).toBe('Vui lòng nhập lý do cụ thể khi chọn "Khác".')
        })
        expect(updateLeadStatus).not.toHaveBeenCalled()
    })

    it('3. Khi đang gửi yêu cầu: hiển thị "Đang xử lý...", vô hiệu hóa nút xác nhận để tránh gửi lặp', async () => {
        let resolveApi: (value: Lead) => void = () => {}
        const apiPromise = new Promise<Lead>((resolve) => {
            resolveApi = resolve
        })
        vi.mocked(updateLeadStatus).mockReturnValue(apiPromise)

        render(<LeadsPage />)

        fireEvent.click(screen.getByTestId('view-mode-pipeline-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('lead-card-lead-test-01')).toBeDefined()
        })

        const card = screen.getByTestId('lead-card-lead-test-01')
        const rejectedCol = screen.getByTestId('pipeline-column-rejected')
        const mockDataTransfer = {
            setData: vi.fn(),
            getData: vi.fn().mockReturnValue('lead-test-01'),
        }

        fireEvent.dragStart(card, { dataTransfer: mockDataTransfer })
        fireEvent.drop(rejectedCol, { dataTransfer: mockDataTransfer })

        await waitFor(() => {
            expect(screen.getByTestId('rejection-modal')).toBeDefined()
        })

        const confirmBtn = screen.getByTestId('rejection-confirm-btn')
        fireEvent.click(confirmBtn)

        // Nút chuyển sang "Đang xử lý..." và bị disabled
        await waitFor(() => {
            expect(confirmBtn.textContent).toContain('Đang xử lý...')
            expect((confirmBtn as HTMLButtonElement).disabled).toBe(true)
        })

        // Click liên tục khi đang xử lý không gọi API lần 2
        fireEvent.click(confirmBtn)
        fireEvent.click(confirmBtn)
        expect(updateLeadStatus).toHaveBeenCalledTimes(1)

        // Sau khi API hoàn thành
        await act(async () => {
            resolveApi({
                ...sampleLead,
                status: 'rejected',
                rejection_reason: 'Không còn nhu cầu',
            })
        })

        await waitFor(() => {
            expect(screen.queryByTestId('rejection-modal')).toBeNull()
        })
    })

    it('4. API lỗi hoặc mất mạng: hiển thị thông báo, giữ nguyên nội dung nhập để người dùng thử lại', async () => {
        vi.mocked(updateLeadStatus).mockRejectedValue(new ApiError('Máy chủ bận, vui lòng thử lại.', 'SERVER_BUSY', 500))

        render(<LeadsPage />)

        fireEvent.click(screen.getByTestId('view-mode-pipeline-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('lead-card-lead-test-01')).toBeDefined()
        })

        const card = screen.getByTestId('lead-card-lead-test-01')
        const rejectedCol = screen.getByTestId('pipeline-column-rejected')
        const mockDataTransfer = {
            setData: vi.fn(),
            getData: vi.fn().mockReturnValue('lead-test-01'),
        }

        fireEvent.dragStart(card, { dataTransfer: mockDataTransfer })
        fireEvent.drop(rejectedCol, { dataTransfer: mockDataTransfer })

        await waitFor(() => {
            expect(screen.getByTestId('rejection-modal')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('rejection-reason-select'), {
            target: { value: 'Khác' },
        })
        fireEvent.change(screen.getByTestId('rejection-notes-input'), {
            target: { value: 'Học viên muốn học ở chi nhánh khác' },
        })

        fireEvent.click(screen.getByTestId('rejection-confirm-btn'))

        // Modal vẫn mở, hiển thị thông báo lỗi
        await waitFor(() => {
            expect(screen.getByTestId('rejection-modal')).toBeDefined()
            expect(screen.getByTestId('rejection-error').textContent).toContain('Máy chủ bận, vui lòng thử lại.')
        })

        // Lý do và ghi chú đã nhập được giữ nguyên
        expect((screen.getByTestId('rejection-reason-select') as HTMLSelectElement).value).toBe('Khác')
        expect((screen.getByTestId('rejection-notes-input') as HTMLTextAreaElement).value).toBe('Học viên muốn học ở chi nhánh khác')

        // Không hiển thị toast thành công
        expect(screen.queryByTestId('toast-success')).toBeNull()
    })

    it('5. Đóng form hoặc modal không làm mất toast thành công', async () => {
        vi.mocked(updateLeadStatus).mockResolvedValue({
            ...sampleLead,
            status: 'rejected',
            rejection_reason: 'Không còn nhu cầu',
        })

        render(<LeadsPage />)

        // Mở chi tiết lead dạng modal trong LeadsPage
        await waitFor(() => {
            expect(screen.getByTestId('view-lead-lead-test-01')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('view-lead-lead-test-01'))

        await waitFor(() => {
            expect(screen.getByTestId('lead-detail-modal')).toBeDefined()
        })

        // Chọn Từ chối từ status select trong modal chi tiết
        fireEvent.change(screen.getByTestId('status-select'), {
            target: { value: 'rejected' },
        })

        // Rejection modal mở
        await waitFor(() => {
            expect(screen.getByTestId('rejection-modal')).toBeDefined()
        })

        // Xác nhận từ chối
        fireEvent.click(screen.getByTestId('rejection-confirm-btn'))

        // Rejection modal đóng, toast thành công xuất hiện
        await waitFor(() => {
            expect(screen.queryByTestId('rejection-modal')).toBeNull()
            expect(screen.getByTestId('toast-success').textContent).toContain(
                'Đã chuyển khách hàng tiềm năng sang trạng thái Từ chối.',
            )
        })

        // Đóng tiếp Modal Chi tiết Lead
        fireEvent.click(screen.getByTestId('close-modal-btn'))

        await waitFor(() => {
            expect(screen.queryByTestId('lead-detail-modal')).toBeNull()
        })

        // Toast thành công vẫn còn hiển thị ở cấp trang, không bị unmount!
        expect(screen.getByTestId('toast-success')).toBeDefined()
        expect(screen.getByTestId('toast-success').textContent).toContain(
            'Đã chuyển khách hàng tiềm năng sang trạng thái Từ chối.',
        )
    })

    it('6. Thao tác từ chối trực tiếp từ Danh sách (List view)', async () => {
        vi.mocked(updateLeadStatus).mockResolvedValue({
            ...sampleLead,
            status: 'rejected',
            rejection_reason: 'Chi phí không phù hợp',
        })

        render(<LeadsPage />)

        // Nút Từ chối xuất hiện trực tiếp trên từng hàng trong bảng danh sách
        await waitFor(() => {
            expect(screen.getByTestId('reject-lead-lead-test-01')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('reject-lead-lead-test-01'))

        // Mở modal xác nhận từ chối
        await waitFor(() => {
            expect(screen.getByTestId('rejection-modal')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('rejection-reason-select'), {
            target: { value: 'Chi phí không phù hợp' },
        })

        fireEvent.click(screen.getByTestId('rejection-confirm-btn'))

        // Thành công: hiển thị toast và cập nhật badge
        await waitFor(() => {
            expect(screen.queryByTestId('rejection-modal')).toBeNull()
            expect(screen.getByTestId('toast-success').textContent).toContain(
                'Đã chuyển khách hàng tiềm năng sang trạng thái Từ chối.',
            )
            expect(screen.getByTestId('status-badge-lead-test-01').textContent).toContain('Từ chối')
        })
    })

    it('7. Thao tác từ chối trên trang Chi tiết độc lập (LeadDetailPage)', async () => {
        vi.mocked(updateLeadStatus).mockResolvedValue({
            ...sampleLead,
            status: 'rejected',
            rejection_reason: 'Không còn nhu cầu',
        })

        render(
            <MemoryRouter initialEntries={['/leads/lead-test-01']}>
                <Routes>
                    <Route path="/leads/:leadId" element={<LeadDetailPage />} />
                </Routes>
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 1, name: 'Nguyễn Văn Test' })).toBeDefined()
        })

        // Chọn "Không thành công" trong status select
        const statusSelects = screen.getAllByRole('combobox')
        fireEvent.change(statusSelects[0], { target: { value: 'rejected' } })
        fireEvent.click(screen.getByRole('button', { name: 'Lưu trạng thái' }))

        // Form từ chối xuất hiện
        await waitFor(() => {
            expect(screen.getByTestId('detail-rejection-form')).toBeDefined()
        })

        // Validation: thử chọn rỗng
        fireEvent.change(screen.getByTestId('detail-rejection-reason-select'), {
            target: { value: '' },
        })
        fireEvent.click(screen.getByTestId('detail-rejection-confirm-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('detail-rejection-reason-error').textContent).toBe(
                'Vui lòng chọn lý do từ chối.',
            )
        })
        expect(updateLeadStatus).not.toHaveBeenCalled()

        // Chọn lý do hợp lệ và gửi
        fireEvent.change(screen.getByTestId('detail-rejection-reason-select'), {
            target: { value: 'Không còn nhu cầu' },
        })
        fireEvent.click(screen.getByTestId('detail-rejection-confirm-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('toast-success').textContent).toContain(
                'Đã chuyển khách hàng tiềm năng sang trạng thái Từ chối.',
            )
        })
    })

    it('8. React Portal: ToastContainer được render trực tiếp vào document.body, nằm ngoài container trang', async () => {
        vi.mocked(updateLeadStatus).mockResolvedValue({
            ...sampleLead,
            status: 'rejected',
            rejection_reason: 'Không còn nhu cầu',
        })

        const { container } = render(<LeadsPage />)

        // Ban đầu chưa có toast
        expect(document.body.querySelector('.leads-toast-container')).toBeNull()

        // Bấm từ chối trực tiếp từ danh sách
        await waitFor(() => {
            expect(screen.getByTestId('reject-lead-lead-test-01')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('reject-lead-lead-test-01'))

        await waitFor(() => {
            expect(screen.getByTestId('rejection-modal')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('rejection-confirm-btn'))

        await waitFor(() => {
            expect(screen.queryByTestId('rejection-modal')).toBeNull()
        })

        // Toast container phải được portal gắn trực tiếp vào document.body
        const toastContainer = document.body.querySelector('.leads-toast-container')
        expect(toastContainer).not.toBeNull()
        // Phải nằm TRỰC TIẾP dưới document.body
        expect(toastContainer?.parentElement).toBe(document.body)
        // KHÔNG nằm bên trong container cục bộ của LeadsPage
        expect(container.querySelector('.leads-toast-container')).toBeNull()
    })

    it('9. Áp dụng thống nhất cho toast thành công, lỗi và cảnh báo với đóng thủ công và aria role', async () => {
        vi.mocked(getLeads).mockRejectedValue(new Error('Lỗi máy chủ thử nghiệm'))

        render(<LeadsPage />)

        // Toast lỗi xuất hiện trong portal với data-testid="page-error"
        await waitFor(() => {
            const errorToast = screen.getByTestId('page-error')
            expect(errorToast.textContent).toContain('Lỗi máy chủ thử nghiệm')
            expect(errorToast.closest('.leads-toast-error')).not.toBeNull()
        })

        // Nút đóng lỗi hoạt động
        const closeBtn = screen.getByTestId('close-error-toast-btn')
        fireEvent.click(closeBtn)

        await waitFor(() => {
            expect(screen.queryByTestId('page-error')).toBeNull()
        })
    })
})

