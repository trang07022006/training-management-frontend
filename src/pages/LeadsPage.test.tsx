// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react'
import { LeadsPage } from './LeadsPage'
import {
    getLeads,
    getLead,
    updateLeadStatus,
    assignLead,
    getAssignableUsers,
    getLeadAssignmentHistory,
    bulkAssignLeads,
    createLead,
    updateLead,
    deleteLead,
    checkLeadPhone,
    ApiError,
} from '../api/leadApi'
import { getTrainingPrograms } from '../api/trainingProgramApi'

import type {
    Lead,
    LeadListResponseData,
    AssignableUser,
    LeadAssignmentHistoryItem,
} from '../api/leadApi'

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

// Mock leadApi functions
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
    }
})

// Mock trainingProgramApi
vi.mock('../api/trainingProgramApi', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/trainingProgramApi')>()
    return {
        ...actual,
        getTrainingPrograms: vi.fn().mockResolvedValue({
            items: [
                {
                    id: 'prog-1',
                    code: 'CNTT',
                    name: 'Công nghệ thông tin',
                    status: 'active',
                },
                {
                    id: 'prog-2',
                    code: 'QA-S122-03',
                    name: 'Kiểm thử SCRUM-122',
                    status: 'active',
                },
            ],
            total: 2,
        }),
    }
})

describe('LeadsPage - UI Test Suite (SCRUM-126/127/128)', () => {
    const mockLeads: Lead[] = [
        {
            id: 'lead-uuid-1',
            full_name: 'Nguyễn Văn A',
            phone: '0912345678',
            email: 'nguyenvana@example.com',
            interested_program_id: 'prog-1',
            interested_program_code: 'CNTT',
            interested_program_name: 'Công nghệ thông tin',
            message: 'Tôi muốn tư vấn học phí và lộ trình.',
            source: 'public_form',
            status: 'new',
            assigned_to_user_id: 'user-advisor-1',
            assigned_to_name: 'Trần Văn Tư Vấn',
            assigned_to_email: 'tuvan@ictu.edu.vn',
            assigned_at: '2026-03-01T11:00:00Z',
            created_at: '2026-03-01T10:00:00Z',
            updated_at: '2026-03-01T10:00:00Z',
        },
        {
            id: 'lead-uuid-2',
            full_name: 'Trần Thị B',
            phone: '0987654321',
            email: null,
            interested_program_id: null,
            message: null,
            source: 'public_form',
            status: 'contacted',
            assigned_to_user_id: null,
            assigned_to_name: null,
            assigned_to_email: null,
            assigned_at: null,
            created_at: '2026-03-02T14:30:00Z',
            updated_at: '2026-03-02T15:00:00Z',
        },
    ]

    const mockAssignableUsers: AssignableUser[] = [
        { id: 'user-advisor-1', name: 'Trần Văn Tư Vấn', email: 'tuvan@ictu.edu.vn', role: 'consultant' },
        { id: 'user-advisor-2', name: 'Lê Quản Trị', email: 'quantri@ictu.edu.vn', role: 'consultant' },
    ]

    const mockListResponse: LeadListResponseData = {
        items: mockLeads,
        total: 2,
        page: 1,
        page_size: 10,
        total_pages: 1,
    }

    beforeEach(() => {
        vi.clearAllMocks()
        mockCurrentRole = 'admin'
        mockCurrentRoles = ['admin']
        mockCurrentPermissions = ['course.manage', 'lead.delete']
        vi.mocked(getAssignableUsers).mockResolvedValue(mockAssignableUsers)
        vi.mocked(getLeadAssignmentHistory).mockResolvedValue([])
        vi.mocked(bulkAssignLeads).mockResolvedValue({ updated_count: 2, message: 'Phân công thành công' })
    })

    afterEach(() => {
        cleanup()
    })

    it('1. Hiển thị tiêu đề trang, mô tả và cấu trúc thanh tìm kiếm / bộ lọc', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)

        render(<LeadsPage />)

        expect(
            screen.getByRole('heading', { name: /Quản lý Tư vấn Tuyển sinh/i }),
        ).toBeDefined()
        expect(
            screen.getByTestId('leads-search-input'),
        ).toBeDefined()
        expect(
            screen.getByTestId('leads-status-filter'),
        ).toBeDefined()
        expect(
            screen.getByTestId('leads-assignee-filter'),
        ).toBeDefined()

        await waitFor(() => {
            expect(screen.getByTestId('lead-row-lead-uuid-1')).toBeDefined()
        })
    })

    it('2. Hiển thị danh sách Lead với đầy đủ thông tin, badge trạng thái và người phụ trách', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByText('Nguyễn Văn A')).toBeDefined()
            expect(screen.getByText('0912345678')).toBeDefined()
            expect(screen.getByText('nguyenvana@example.com')).toBeDefined()
            expect(screen.getByText('Công nghệ thông tin')).toBeDefined()
            expect(screen.getByTestId('assignee-cell-lead-uuid-1').textContent).toContain(
                'Trần Văn Tư Vấn',
            )
            expect(screen.getByTestId('status-badge-lead-uuid-1').textContent).toContain(
                'Mới tiếp nhận',
            )

            expect(screen.getByText('Trần Thị B')).toBeDefined()
            expect(screen.getByText('0987654321')).toBeDefined()
            expect(screen.getByTestId('assignee-cell-lead-uuid-2').textContent).toContain(
                'Chưa phân công',
            )
            expect(screen.getByTestId('status-badge-lead-uuid-2').textContent).toContain(
                'Đã liên hệ',
            )
        })
    })

    it('3. Tìm kiếm với debounce 300ms và reset page về 1 (SCRUM-128)', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)

        render(<LeadsPage />)

        await act(async () => {
            vi.advanceTimersByTime(350)
        })

        const searchInput = screen.getByTestId('leads-search-input')

        // Nhập từ khóa tìm kiếm
        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'Nguyễn' } })
            vi.advanceTimersByTime(350)
        })

        await waitFor(() => {
            expect(getLeads).toHaveBeenCalledWith(
                mockRequest,
                expect.objectContaining({
                    search: 'Nguyễn',
                    page: 1,
                }),
            )
        })

        vi.useRealTimers()
    })

    it('4. Lọc theo trạng thái và người phụ trách thành công (SCRUM-128)', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('leads-status-filter')).toBeDefined()
        })

        // Lọc trạng thái 'qualified'
        fireEvent.change(screen.getByTestId('leads-status-filter'), {
            target: { value: 'qualified' },
        })

        await waitFor(() => {
            expect(getLeads).toHaveBeenCalledWith(
                mockRequest,
                expect.objectContaining({
                    status: 'qualified',
                    page: 1,
                }),
            )
        })

        // Lọc người phụ trách 'user-advisor-1'
        fireEvent.change(screen.getByTestId('leads-assignee-filter'), {
            target: { value: 'user-advisor-1' },
        })

        await waitFor(() => {
            expect(getLeads).toHaveBeenCalledWith(
                mockRequest,
                expect.objectContaining({
                    status: 'qualified',
                    assigned_to_user_id: 'user-advisor-1',
                    page: 1,
                }),
            )
        })
    })

    it('5. Lọc theo khoảng ngày và xóa bộ lọc (SCRUM-128)', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('leads-date-from-filter')).toBeDefined()
        })

        // Chọn khoảng ngày
        fireEvent.change(screen.getByTestId('leads-date-from-filter'), {
            target: { value: '2026-03-01' },
        })
        fireEvent.change(screen.getByTestId('leads-date-to-filter'), {
            target: { value: '2026-03-31' },
        })

        await waitFor(() => {
            expect(getLeads).toHaveBeenCalledWith(
                mockRequest,
                expect.objectContaining({
                    date_from: '2026-03-01',
                    date_to: '2026-03-31',
                    page: 1,
                }),
            )
        })

        // Nút Xóa bộ lọc xuất hiện
        const clearBtn = screen.getByTestId('clear-filters-btn')
        expect(clearBtn).toBeDefined()

        fireEvent.click(clearBtn)

        await waitFor(() => {
            expect(
                (screen.getByTestId('leads-date-from-filter') as HTMLInputElement).value,
            ).toBe('')
            expect(
                (screen.getByTestId('leads-date-to-filter') as HTMLInputElement).value,
            ).toBe('')
        })
    })

    it('6. Mở modal chi tiết khi click "Xem chi tiết"', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[0])

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('view-lead-lead-uuid-1')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('view-lead-lead-uuid-1'))

        await waitFor(() => {
            expect(screen.getByTestId('lead-detail-modal')).toBeDefined()
            expect(screen.getByTestId('detail-fullname').textContent).toContain('Nguyễn Văn A')
            expect(screen.getByTestId('detail-phone').textContent).toContain('0912345678')
            expect(screen.getByTestId('detail-email').textContent).toContain('nguyenvana@example.com')
            expect(screen.getByTestId('detail-assignee').textContent).toContain('Trần Văn Tư Vấn')
        })
    })

    it('7. Phân công nhân sự phụ trách thành công (SCRUM-127)', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[1])
        const assignedLead: Lead = {
            ...mockLeads[1],
            assigned_to_user_id: 'user-advisor-2',
            assigned_to_name: 'Lê Quản Trị',
            assigned_to_email: 'quantri@ictu.edu.vn',
            assigned_at: '2026-03-02T16:00:00Z',
        }
        vi.mocked(assignLead).mockResolvedValue(assignedLead)

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('view-lead-lead-uuid-2')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('view-lead-lead-uuid-2'))

        await waitFor(() => {
            expect(screen.getByTestId('assignee-select')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('assignee-select'), {
            target: { value: 'user-advisor-2' },
        })

        await waitFor(() => {
            expect(assignLead).toHaveBeenCalledWith(
                mockRequest,
                'lead-uuid-2',
                'user-advisor-2',
            )
            expect(screen.getByTestId('assignment-success-alert').textContent).toMatch(
                /Đã phân công Lead cho Lê Quản Trị|Đã cập nhật người phụ trách/,
            )
        })
    })

    it('8. Gỡ phân công nhân sự phụ trách thành công (SCRUM-127)', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[0])
        const unassignedLead: Lead = {
            ...mockLeads[0],
            assigned_to_user_id: null,
            assigned_to_name: null,
            assigned_to_email: null,
            assigned_at: null,
        }
        vi.mocked(assignLead).mockResolvedValue(unassignedLead)

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('view-lead-lead-uuid-1')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('view-lead-lead-uuid-1'))

        await waitFor(() => {
            expect(screen.getByTestId('assignee-select')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('assignee-select'), {
            target: { value: '' },
        })

        await waitFor(() => {
            expect(assignLead).toHaveBeenCalledWith(mockRequest, 'lead-uuid-1', null)
            expect(screen.getByTestId('assignment-success-alert').textContent).toMatch(
                /Đã gỡ phân công Lead|Đã cập nhật người phụ trách/,
            )
        })
    })

    it('9. Hiển thị thông báo khi danh sách trống', async () => {
        vi.mocked(getLeads).mockResolvedValue({
            items: [],
            total: 0,
            page: 1,
            page_size: 10,
            total_pages: 0,
        })

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('empty-state').textContent).toContain(
                'Chưa có yêu cầu tư vấn nào được ghi nhận.',
            )
        })
    })

    it('10. Hiển thị lỗi khi API thất bại', async () => {
        vi.mocked(getLeads).mockRejectedValue(
            new Error('Không thể kết nối đến máy chủ.'),
        )

        render(<LeadsPage />)

        await waitFor(() => {
            const errBanner = screen.getByTestId('page-error').textContent || ''
            expect(errBanner).toContain('Không thể kết nối')
            expect(errBanner).toContain('máy chủ')
        })
    })

    it('10b. Map lỗi UNAUTHORIZED hoặc 401 sang tiếng Việt và không hiển thị raw code', async () => {
        vi.mocked(getLeads).mockRejectedValue(
            new ApiError('UNAUTHORIZED', 'UNAUTHORIZED', 401),
        )

        render(<LeadsPage />)

        await waitFor(() => {
            const errorText = screen.getByTestId('page-error').textContent || ''
            expect(errorText).toBe('Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.')
            expect(errorText).not.toContain('UNAUTHORIZED')
            expect(errorText).not.toContain('401')
        })
    })

    it('10c. Map lỗi FORBIDDEN hoặc 403 khi truy cập /leads sang tiếng Việt', async () => {
        vi.mocked(getLeads).mockRejectedValue(
            new ApiError('FORBIDDEN', 'FORBIDDEN', 403),
        )

        render(<LeadsPage />)

        await waitFor(() => {
            const errorText = screen.getByTestId('page-error').textContent || ''
            expect(errorText).toBe('Bạn không có quyền truy cập chức năng Tư vấn tuyển sinh.')
            expect(errorText).not.toContain('FORBIDDEN')
            expect(errorText).not.toContain('403')
        })
    })

    it('10d. Map lỗi SessionApiError UNAUTHORIZED sang tiếng Việt thân thiện', async () => {
        const sessionErr = new Error('UNAUTHORIZED')
        ;(sessionErr as unknown as { status: number; code: string }).status = 401
        ;(sessionErr as unknown as { status: number; code: string }).code = 'UNAUTHORIZED'
        vi.mocked(getLeads).mockRejectedValue(sessionErr)

        render(<LeadsPage />)

        await waitFor(() => {
            const errorText = screen.getByTestId('page-error').textContent || ''
            expect(errorText).toBe('Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.')
            expect(errorText).not.toContain('UNAUTHORIZED')
        })
    })

    it('11. Điều khiển phân trang chuyển trang đúng', async () => {
        vi.mocked(getLeads).mockResolvedValue({
            items: mockLeads,
            total: 25,
            page: 1,
            page_size: 10,
            total_pages: 3,
        })

        render(<LeadsPage />)

        await waitFor(() => {
            const prevBtn = screen.getByTestId('prev-page-btn') as HTMLButtonElement
            const nextBtn = screen.getByTestId('next-page-btn') as HTMLButtonElement
            expect(prevBtn.disabled).toBe(true)
            expect(nextBtn.disabled).toBe(false)
        })

        fireEvent.click(screen.getByTestId('next-page-btn'))

        await waitFor(() => {
            expect(getLeads).toHaveBeenCalledWith(
                mockRequest,
                expect.objectContaining({
                    page: 2,
                    page_size: 10,
                }),
            )
        })
    })

    it('12. Loại trừ tài khoản demo khỏi danh sách người phụ trách (SCRUM-127)', async () => {
        vi.mocked(getAssignableUsers).mockResolvedValue([
            { id: 'real-user-1', name: 'Tư vấn Thật', email: 'real@ictu.edu.vn', role: 'consultant' },
            { id: 'demo-user-trainer', name: 'Tư vấn Demo', email: 'demo@ictu.edu.vn', role: 'consultant' },
        ])
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.queryByText('Tư vấn Demo')).toBeNull()
            expect(screen.getByText('Tư vấn Thật')).toBeDefined()
        })
    })

    it('13. Tự động refetch và giữ nguyên filter sau khi cập nhật trạng thái (SCRUM-128 A5)', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[0])
        const updatedLead: Lead = { ...mockLeads[0], status: 'contacted' }
        vi.mocked(updateLeadStatus).mockResolvedValue(updatedLead)

        render(<LeadsPage />)

        // Thiết lập bộ lọc trạng thái 'new'
        fireEvent.change(screen.getByTestId('leads-status-filter'), {
            target: { value: 'new' },
        })

        await waitFor(() => {
            expect(getLeads).toHaveBeenCalledWith(
                mockRequest,
                expect.objectContaining({ status: 'new' }),
            )
            expect(screen.getByTestId('view-lead-lead-uuid-1')).toBeDefined()
        })

        // Mở chi tiết và đổi trạng thái
        fireEvent.click(screen.getByTestId('view-lead-lead-uuid-1'))
        await waitFor(() => {
            expect(screen.getByTestId('status-select')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('status-select'), {
            target: { value: 'contacted' },
        })

        await waitFor(() => {
            expect(updateLeadStatus).toHaveBeenCalledWith(mockRequest, 'lead-uuid-1', 'contacted')
            expect(screen.getByTestId('status-success-alert').textContent).toContain(
                'Đã cập nhật trạng thái.',
            )
            // getLeads phải được gọi lại để đồng bộ kết quả với bộ lọc hiện tại
            expect(getLeads).toHaveBeenLastCalledWith(
                mockRequest,
                expect.objectContaining({ status: 'new' }),
            )
        })
    })

    it('14. Tự động refetch và giữ nguyên filter sau khi phân công nhân sự (SCRUM-128 A5)', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[1])
        const assignedLead: Lead = { ...mockLeads[1], assigned_to_user_id: 'user-advisor-1' }
        vi.mocked(assignLead).mockResolvedValue(assignedLead)

        render(<LeadsPage />)

        // Thiết lập bộ lọc người phụ trách 'unassigned'
        fireEvent.change(screen.getByTestId('leads-assignee-filter'), {
            target: { value: 'unassigned' },
        })

        await waitFor(() => {
            expect(getLeads).toHaveBeenCalledWith(
                mockRequest,
                expect.objectContaining({ assigned_to_user_id: 'unassigned' }),
            )
            expect(screen.getByTestId('view-lead-lead-uuid-2')).toBeDefined()
        })

        // Mở chi tiết và phân công
        fireEvent.click(screen.getByTestId('view-lead-lead-uuid-2'))
        await waitFor(() => {
            expect(screen.getByTestId('assignee-select')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('assignee-select'), {
            target: { value: 'user-advisor-1' },
        })

        await waitFor(() => {
            expect(assignLead).toHaveBeenCalledWith(mockRequest, 'lead-uuid-2', 'user-advisor-1')
            expect(screen.getByTestId('assignment-success-alert').textContent).toMatch(
                /Đã phân công Lead cho Trần Văn Tư Vấn|Đã cập nhật người phụ trách/,
            )
            // getLeads phải được gọi lại để đồng bộ danh sách đã lọc
            expect(getLeads).toHaveBeenLastCalledWith(
                mockRequest,
                expect.objectContaining({ assigned_to_user_id: 'unassigned' }),
            )
        })
    })

    it('15. Hiển thị thông báo lỗi khi khoảng ngày không hợp lệ (SCRUM-128 A6)', async () => {
        vi.mocked(getLeads).mockRejectedValue(
            new Error("Ngày bắt đầu 'date_from' không được lớn hơn ngày kết thúc 'date_to'."),
        )

        render(<LeadsPage />)

        fireEvent.change(screen.getByTestId('leads-date-from-filter'), {
            target: { value: '2026-03-20' },
        })
        fireEvent.change(screen.getByTestId('leads-date-to-filter'), {
            target: { value: '2026-03-10' },
        })

        await waitFor(() => {
            expect(screen.getByTestId('page-error').textContent).toContain(
                "Ngày bắt đầu 'date_from' không được lớn hơn ngày kết thúc 'date_to'.",
            )
        })
    })

    it('16. Hiển thị đúng giờ Việt Nam (Asia/Ho_Chi_Minh GMT+7) trong danh sách Lead', async () => {
        const timezoneLeads: Lead[] = [
            {
                ...mockLeads[0],
                id: 'lead-tz-test',
                created_at: '2026-10-10T15:27:00Z',
            },
        ]
        vi.mocked(getLeads).mockResolvedValue({
            items: timezoneLeads,
            total: 1,
            page: 1,
            page_size: 10,
            total_pages: 1,
        })

        render(<LeadsPage />)

        await waitFor(() => {
            // API UTC: 2026-10-10T15:27:00Z -> Expected UI: 22:27 10/10/2026
            expect(screen.getByTestId('created-at-lead-tz-test').textContent).toBe(
                '22:27 10/10/2026',
            )
        })
    })

    it('17. Hiển thị chính xác trường hợp qua ngày (rollover midnight) sang múi giờ Việt Nam', async () => {
        const rolloverLeads: Lead[] = [
            {
                ...mockLeads[0],
                id: 'lead-tz-rollover',
                created_at: '2026-10-10T20:30:00Z',
            },
        ]
        vi.mocked(getLeads).mockResolvedValue({
            items: rolloverLeads,
            total: 1,
            page: 1,
            page_size: 10,
            total_pages: 1,
        })

        render(<LeadsPage />)

        await waitFor(() => {
            // API UTC: 2026-10-10T20:30:00Z -> Expected UI: 03:30 11/10/2026
            expect(screen.getByTestId('created-at-lead-tz-rollover').textContent).toBe(
                '03:30 11/10/2026',
            )
        })
    })

    it('18. Hiển thị giờ Việt Nam trong modal chi tiết cho thời gian gửi, cập nhật và phân công', async () => {
        const detailLead: Lead = {
            ...mockLeads[0],
            id: 'lead-detail-tz',
            created_at: '2026-10-10T15:27:00Z',
            updated_at: '2026-10-10T15:27:00Z',
            assigned_at: '2026-10-10T15:30:00Z',
        }
        vi.mocked(getLeads).mockResolvedValue({
            items: [detailLead],
            total: 1,
            page: 1,
            page_size: 10,
            total_pages: 1,
        })
        vi.mocked(getLead).mockResolvedValue(detailLead)

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('view-lead-lead-detail-tz')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('view-lead-lead-detail-tz'))

        await waitFor(() => {
            expect(screen.getByTestId('detail-created-at').textContent).toBe(
                '22:27 10/10/2026',
            )
            expect(screen.getByTestId('detail-updated-at').textContent).toBe(
                '22:27 10/10/2026',
            )
            expect(screen.getByTestId('detail-assigned-at').textContent).toBe(
                '22:30 10/10/2026',
            )
        })
    })

    it('19. Lead chưa xem trong 24h có highlight nền xanh nhạt và badge Chưa xem; khi xem chi tiết thì bỏ highlight, giữ nguyên status Mới tiếp nhận', async () => {
        // Lead tạo cách đây 1 giờ (trong 24h)
        const recentIso = new Date(Date.now() - 3600 * 1000).toISOString()
        const unreadRecentLead: Lead = {
            ...mockLeads[0],
            id: 'lead-unread-recent',
            status: 'new',
            created_at: recentIso,
        }

        vi.mocked(getLeads).mockResolvedValue({
            items: [unreadRecentLead],
            total: 1,
            page: 1,
            page_size: 10,
            total_pages: 1,
        })
        vi.mocked(getLead).mockResolvedValue(unreadRecentLead)

        render(<LeadsPage />)

        // Ban đầu: row có class unread-recent và hiển thị badge "Chưa xem"
        await waitFor(() => {
            const row = screen.getByTestId('lead-row-lead-unread-recent')
            expect(row.className).toContain('lead-row--unread-recent')
            expect(screen.getByTestId('unread-badge-lead-unread-recent')).toBeDefined()
            expect(screen.getByTestId('unread-badge-lead-unread-recent').textContent).toContain('Chưa xem')
            // Trạng thái nghiệp vụ là "Mới tiếp nhận"
            expect(screen.getByTestId('status-badge-lead-unread-recent').textContent).toContain('Mới tiếp nhận')
        })

        // Mở xem chi tiết
        fireEvent.click(screen.getByTestId('view-lead-lead-unread-recent'))

        await waitFor(() => {
            const row = screen.getByTestId('lead-row-lead-unread-recent')
            // Row chuyển sang read, mất class highlight unread-recent
            expect(row.className).toContain('lead-row--read')
            expect(row.className).not.toContain('lead-row--unread-recent')
            // Badge "Chưa xem" biến mất
            expect(screen.queryByTestId('unread-badge-lead-unread-recent')).toBeNull()
            // KHÔNG làm thay đổi trạng thái nghiệp vụ "Mới tiếp nhận"
            expect(screen.getByTestId('status-badge-lead-unread-recent').textContent).toContain('Mới tiếp nhận')
        })
    })

    it('20. Lead chưa xem quá 24h không highlight mạnh nền xanh nhưng vẫn hiển thị badge Chưa xem', async () => {
        // Lead tạo cách đây 48 giờ (quá 24h)
        const olderIso = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
        const unreadOlderLead: Lead = {
            ...mockLeads[0],
            id: 'lead-unread-older',
            status: 'new',
            created_at: olderIso,
        }

        vi.mocked(getLeads).mockResolvedValue({
            items: [unreadOlderLead],
            total: 1,
            page: 1,
            page_size: 10,
            total_pages: 1,
        })

        render(<LeadsPage />)

        await waitFor(() => {
            const row = screen.getByTestId('lead-row-lead-unread-older')
            // Row có class unread-older (không highlight mạnh nền xanh recent)
            expect(row.className).toContain('lead-row--unread-older')
            expect(row.className).not.toContain('lead-row--unread-recent')
            // Vẫn có badge "Chưa xem"
            const badge = screen.getByTestId('unread-badge-lead-unread-older')
            expect(badge).toBeDefined()
            expect(badge.className).toContain('lead-unread-badge--older')
            expect(badge.textContent).toContain('Chưa xem')
        })
    })

    it('21. Rollback dropdown trạng thái và hiển thị lỗi khi API updateLeadStatus thất bại', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[0]) // mockLeads[0].status = 'new'
        vi.mocked(updateLeadStatus).mockRejectedValue(new Error('Internal Server Error'))

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('view-lead-lead-uuid-1')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('view-lead-lead-uuid-1'))

        await waitFor(() => {
            expect(screen.getByTestId('status-select')).toBeDefined()
        })

        const statusSelect = screen.getByTestId('status-select') as HTMLSelectElement
        expect(statusSelect.value).toBe('new')

        fireEvent.change(statusSelect, { target: { value: 'qualified' } })

        await waitFor(() => {
            expect(updateLeadStatus).toHaveBeenCalledWith(mockRequest, 'lead-uuid-1', 'qualified')
            expect(screen.getByTestId('status-error-alert').textContent).toContain(
                'Không thể cập nhật. Vui lòng thử lại.',
            )
            // Rollback về trạng thái ban đầu 'new'
            expect(statusSelect.value).toBe('new')
        })
    })

    it('22. Rollback dropdown người phụ trách và hiển thị lỗi khi API assignLead thất bại', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[0]) // mockLeads[0].assigned_to_user_id = 'user-advisor-1'
        vi.mocked(assignLead).mockRejectedValue(new Error('Internal Server Error'))

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('view-lead-lead-uuid-1')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('view-lead-lead-uuid-1'))

        await waitFor(() => {
            expect(screen.getByTestId('assignee-select')).toBeDefined()
        })

        const assigneeSelect = screen.getByTestId('assignee-select') as HTMLSelectElement
        expect(assigneeSelect.value).toBe('user-advisor-1')

        // Thử đổi sang user khác
        fireEvent.change(assigneeSelect, { target: { value: 'user-advisor-2' } })

        await waitFor(() => {
            expect(assignLead).toHaveBeenCalledWith(mockRequest, 'lead-uuid-1', 'user-advisor-2')
            expect(screen.getByTestId('assignment-error-alert').textContent).toContain(
                'Không thể cập nhật. Vui lòng thử lại.',
            )
            // Rollback về người phụ trách ban đầu 'user-advisor-1'
            expect(assigneeSelect.value).toBe('user-advisor-1')
        })
    })

    it('23. Tránh gửi request lặp khi chọn lại cùng một trạng thái hoặc cùng người phụ trách', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[0]) // status='new', assigned_to_user_id='user-advisor-1'

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('view-lead-lead-uuid-1')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('view-lead-lead-uuid-1'))

        await waitFor(() => {
            expect(screen.getByTestId('status-select')).toBeDefined()
            expect(screen.getByTestId('assignee-select')).toBeDefined()
        })

        const statusSelect = screen.getByTestId('status-select') as HTMLSelectElement
        const assigneeSelect = screen.getByTestId('assignee-select') as HTMLSelectElement

        // Chọn lại cùng giá trị đang có
        fireEvent.change(statusSelect, { target: { value: 'new' } })
        fireEvent.change(assigneeSelect, { target: { value: 'user-advisor-1' } })

        expect(updateLeadStatus).not.toHaveBeenCalled()
        expect(assignLead).not.toHaveBeenCalled()
    })

    // =========================================================================
    // SCRUM-126: Thêm và Sửa Lead thủ công
    // =========================================================================

    it('24. Xóa nút Sao chép liên kết, hiển thị nút + Thêm Lead là primary và giữ Mở form đăng ký (SCRUM-126)', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)

        render(<LeadsPage />)

        // Không còn nút "Sao chép liên kết"
        expect(screen.queryByTestId('btn-copy-link')).toBeNull()
        expect(screen.queryByText('Sao chép liên kết')).toBeNull()

        // Giữ nút "Mở form đăng ký"
        const openFormBtn = screen.getByTestId('btn-open-form')
        expect(openFormBtn).toBeDefined()
        expect(openFormBtn.getAttribute('href')).toBe('/consultation')

        // Nút "+ Thêm Lead" là primary action
        const addLeadBtn = screen.getByTestId('add-lead-btn')
        expect(addLeadBtn).toBeDefined()
        expect(addLeadBtn.textContent).toContain('+ Thêm Lead')
        expect(addLeadBtn.className).toContain('leads-btn-action-primary')
    })

    it('25. Click + Thêm Lead mở modal Thêm khách hàng tiềm năng với đầy đủ 5 field chuẩn Jira (SCRUM-126)', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)

        render(<LeadsPage />)

        fireEvent.click(screen.getByTestId('add-lead-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('lead-form-modal')).toBeDefined()
            expect(screen.getByTestId('lead-form-title').textContent).toBe(
                'Thêm khách hàng tiềm năng',
            )
            // 5 fields
            expect(screen.getByTestId('lead-form-name')).toBeDefined()
            expect(screen.getByTestId('lead-form-phone')).toBeDefined()
            expect(screen.getByTestId('lead-form-email')).toBeDefined()
            expect(screen.getByTestId('lead-form-source')).toBeDefined()
            expect(screen.getByTestId('lead-form-program')).toBeDefined()
            expect(getTrainingPrograms).toHaveBeenCalled()
        })

        // Nguồn mặc định là 'direct' (không được tự gán 'public_form')
        const sourceSelect = screen.getByTestId('lead-form-source') as HTMLSelectElement
        expect(sourceSelect.value).toBe('direct')

        // Nút Hủy và Tạo Lead
        expect(screen.getByTestId('cancel-lead-form-btn')).toBeDefined()
        expect(screen.getByTestId('submit-lead-form-btn').textContent).toContain('Tạo Lead')
    })

    it('26. Validation bắt buộc Họ tên, Số điện thoại và format Email (SCRUM-126)', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)

        render(<LeadsPage />)

        fireEvent.click(screen.getByTestId('add-lead-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('lead-form-modal')).toBeDefined()
        })

        // Bấm Tạo Lead khi form đang trống
        fireEvent.click(screen.getByTestId('submit-lead-form-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('lead-name-error').textContent).toBe(
                'Vui lòng nhập họ và tên.',
            )
            expect(screen.getByTestId('lead-phone-error').textContent).toBe(
                'Vui lòng nhập số điện thoại.',
            )
        })
        expect(createLead).not.toHaveBeenCalled()

        // Nhập email sai định dạng
        fireEvent.change(screen.getByTestId('lead-form-name'), {
            target: { value: 'Nguyễn Văn Test' },
        })
        fireEvent.change(screen.getByTestId('lead-form-phone'), {
            target: { value: '0912345678' },
        })
        fireEvent.change(screen.getByTestId('lead-form-email'), {
            target: { value: 'sai-email-dinh-dang' },
        })

        fireEvent.click(screen.getByTestId('submit-lead-form-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('lead-email-error').textContent).toBe(
                'Email không đúng định dạng.',
            )
        })
        expect(createLead).not.toHaveBeenCalled()
    })

    it('27. Cảnh báo khi số điện thoại trùng với lead đã có trong hệ thống (SCRUM-126)', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(checkLeadPhone).mockResolvedValue({
            exists: true,
            lead: {
                id: 'lead-old',
                full_name: 'Nguyễn Văn Cũ',
                phone: '0912345678',
            },
        })

        render(<LeadsPage />)

        fireEvent.click(screen.getByTestId('add-lead-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('lead-form-modal')).toBeDefined()
        })

        const phoneInput = screen.getByTestId('lead-form-phone')
        fireEvent.change(phoneInput, { target: { value: '0912345678' } })

        act(() => {
            vi.advanceTimersByTime(400)
        })

        await waitFor(() => {
            expect(checkLeadPhone).toHaveBeenCalledWith(mockRequest, '0912345678', undefined)
            const warningEl = screen.getByTestId('duplicate-phone-warning')
            expect(warningEl).toBeDefined()
            expect(warningEl.textContent).toContain(
                'Số điện thoại này đã tồn tại trong danh sách khách hàng tiềm năng.',
            )
            expect(warningEl.textContent).toContain('Nguyễn Văn Cũ')
        })

        vi.useRealTimers()
    })

    it('28. Tạo khách hàng tiềm năng thành công với bộ dữ liệu kiểm thử QA SCRUM 126', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        const newLeadMock: Lead = {
            id: 'lead-scrum-126',
            full_name: 'QA SCRUM 126',
            phone: '0912612626',
            email: 'qa.s126@example.com',
            source: 'direct',
            interested_program_id: 'prog-2',
            interested_program_code: 'QA-S122-03',
            interested_program_name: 'Kiểm thử SCRUM-122',
            status: 'new',
            message: null,
            created_at: '2026-10-11T00:00:00Z',
            updated_at: '2026-10-11T00:00:00Z',
        }
        vi.mocked(createLead).mockResolvedValue({
            lead: newLeadMock,
            duplicate_warning: false,
            existing_lead: null,
            message: 'Tạo khách hàng tiềm năng thành công.',
        })

        render(<LeadsPage />)

        fireEvent.click(screen.getByTestId('add-lead-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('lead-form-modal')).toBeDefined()
        })

        // Điền thông tin đúng Test Data
        fireEvent.change(screen.getByTestId('lead-form-name'), {
            target: { value: 'QA SCRUM 126' },
        })
        fireEvent.change(screen.getByTestId('lead-form-phone'), {
            target: { value: '0912612626' },
        })
        fireEvent.change(screen.getByTestId('lead-form-email'), {
            target: { value: 'qa.s126@example.com' },
        })
        fireEvent.change(screen.getByTestId('lead-form-source'), {
            target: { value: 'direct' },
        })
        fireEvent.change(screen.getByTestId('lead-form-program'), {
            target: { value: 'prog-2' },
        })

        fireEvent.click(screen.getByTestId('submit-lead-form-btn'))

        await waitFor(() => {
            expect(createLead).toHaveBeenCalledWith(mockRequest, {
                full_name: 'QA SCRUM 126',
                phone: '0912612626',
                email: 'qa.s126@example.com',
                source: 'direct',
                interested_program_id: 'prog-2',
            })
            // Modal đóng
            expect(screen.queryByTestId('lead-form-modal')).toBeNull()
            // Alert thành công xuất hiện
            expect(screen.getByTestId('page-success').textContent).toContain(
                'Tạo khách hàng tiềm năng thành công.',
            )
        })
    })

    it('29. Sửa thông tin khách hàng tiềm năng thành công từ modal Chi tiết (SCRUM-126)', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[0])

        const updatedLeadMock: Lead = {
            ...mockLeads[0],
            full_name: 'Nguyễn Văn A - Cập nhật',
            phone: '0919999999',
            email: 'nguyenvana.updated@example.com',
            source: 'hotline',
        }
        vi.mocked(updateLead).mockResolvedValue({
            lead: updatedLeadMock,
            duplicate_warning: false,
            existing_lead: null,
            message: 'Cập nhật khách hàng tiềm năng thành công.',
        })

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('view-lead-lead-uuid-1')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('view-lead-lead-uuid-1'))

        await waitFor(() => {
            expect(screen.getByTestId('lead-detail-modal')).toBeDefined()
            expect(screen.getByTestId('edit-lead-btn')).toBeDefined()
        })

        // Bấm nút Sửa trong Detail Modal
        fireEvent.click(screen.getByTestId('edit-lead-btn'))

        await waitFor(() => {
            expect(screen.getByTestId('lead-form-modal')).toBeDefined()
            expect(screen.getByTestId('lead-form-title').textContent).toBe(
                'Chỉnh sửa khách hàng tiềm năng',
            )
            expect(
                (screen.getByTestId('lead-form-name') as HTMLInputElement).value,
            ).toBe('Nguyễn Văn A')
        })

        // Thay đổi tên và số điện thoại
        fireEvent.change(screen.getByTestId('lead-form-name'), {
            target: { value: 'Nguyễn Văn A - Cập nhật' },
        })
        fireEvent.change(screen.getByTestId('lead-form-phone'), {
            target: { value: '0919999999' },
        })
        fireEvent.change(screen.getByTestId('lead-form-email'), {
            target: { value: 'nguyenvana.updated@example.com' },
        })
        fireEvent.change(screen.getByTestId('lead-form-source'), {
            target: { value: 'hotline' },
        })

        fireEvent.click(screen.getByTestId('submit-lead-form-btn'))

        await waitFor(() => {
            expect(updateLead).toHaveBeenCalledWith(mockRequest, 'lead-uuid-1', {
                full_name: 'Nguyễn Văn A - Cập nhật',
                phone: '0919999999',
                email: 'nguyenvana.updated@example.com',
                source: 'hotline',
                interested_program_id: 'prog-1',
            })
            expect(screen.queryByTestId('lead-form-modal')).toBeNull()
            expect(screen.getByTestId('page-success').textContent).toContain(
                'Cập nhật khách hàng tiềm năng thành công.',
            )
        })
    })

    it('30. Sửa thông tin khách hàng tiềm năng thành công từ nút Sửa trên dòng danh sách', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('edit-lead-lead-uuid-1')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('edit-lead-lead-uuid-1'))

        await waitFor(() => {
            expect(screen.getByTestId('lead-form-modal')).toBeDefined()
            expect(screen.getByTestId('lead-form-title').textContent).toBe(
                'Chỉnh sửa khách hàng tiềm năng',
            )
            expect(
                (screen.getByTestId('lead-form-name') as HTMLInputElement).value,
            ).toBe('Nguyễn Văn A')
        })

        // Bấm Hủy
        fireEvent.click(screen.getByTestId('cancel-lead-form-btn'))

        await waitFor(() => {
            expect(screen.queryByTestId('lead-form-modal')).toBeNull()
        })
    })

    it('31. Tư vấn tuyển sinh (consultant) KHÔNG có quyền xóa lead (không hiển thị nút Xóa)', async () => {
        mockCurrentRole = 'consultant'
        mockCurrentRoles = ['consultant']
        mockCurrentPermissions = ['course.view', 'course.manage', 'session.view']

        vi.mocked(getLeads).mockResolvedValue(mockListResponse)

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('lead-row-lead-uuid-1')).toBeDefined()
            expect(screen.getByTestId('view-lead-lead-uuid-1')).toBeDefined()
            expect(screen.getByTestId('edit-lead-lead-uuid-1')).toBeDefined()
        })

        // Nút Xóa KHÔNG được hiển thị đối với vai trò Tư vấn tuyển sinh
        expect(screen.queryByTestId('delete-lead-lead-uuid-1')).toBeNull()
        expect(screen.queryByTestId('delete-lead-lead-uuid-2')).toBeNull()
    })

    it('32. Quản lý đào tạo (training_manager) ĐƯỢC PHÉP xóa lead (mở custom modal xác nhận ở giữa màn hình và gọi API xóa)', async () => {
        mockCurrentRole = 'training_manager'
        mockCurrentRoles = ['training_manager']
        mockCurrentPermissions = ['course.view', 'course.manage', 'session.view', 'lead.delete']

        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(deleteLead).mockResolvedValue({
            status: 'success',
            message: 'Xóa khách hàng tiềm năng thành công.',
        })

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('delete-lead-lead-uuid-1')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('delete-lead-lead-uuid-1'))

        // Custom modal xác nhận hiển thị
        await waitFor(() => {
            expect(screen.getByTestId('delete-lead-modal')).toBeDefined()
            expect(screen.getByTestId('delete-lead-modal-overlay')).toBeDefined()
        })

        // Kiểm tra nội dung modal xác nhận xóa
        expect(screen.getByText('Xác nhận xóa')).toBeDefined()
        expect(screen.getByText('Thao tác này không thể hoàn tác.')).toBeDefined()
        expect(screen.getByTestId('btn-cancel-delete')).toBeDefined()
        expect(screen.getByTestId('btn-confirm-delete')).toBeDefined()

        // Bấm nút "Xóa" trên modal
        fireEvent.click(screen.getByTestId('btn-confirm-delete'))

        await waitFor(() => {
            expect(deleteLead).toHaveBeenCalledWith(mockRequest, 'lead-uuid-1')
            expect(screen.getByTestId('page-success').textContent).toContain(
                'Xóa khách hàng tiềm năng thành công.',
            )
            // Lead đã xóa không còn trong danh sách và modal đóng
            expect(screen.queryByTestId('delete-lead-modal')).toBeNull()
            expect(screen.queryByTestId('lead-row-lead-uuid-1')).toBeNull()
        })
    })

    it('33. Đóng modal xác nhận xóa khi bấm Hủy hoặc nút Đóng (x) mà không gọi API xóa', async () => {
        mockCurrentRole = 'training_manager'
        mockCurrentRoles = ['training_manager']
        mockCurrentPermissions = ['course.view', 'course.manage', 'session.view', 'lead.delete']

        vi.mocked(getLeads).mockResolvedValue(mockListResponse)

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('delete-lead-lead-uuid-1')).toBeDefined()
        })

        // Mở modal xác nhận
        fireEvent.click(screen.getByTestId('delete-lead-lead-uuid-1'))
        await waitFor(() => {
            expect(screen.getByTestId('delete-lead-modal')).toBeDefined()
        })

        // Bấm nút Hủy
        fireEvent.click(screen.getByTestId('btn-cancel-delete'))
        await waitFor(() => {
            expect(screen.queryByTestId('delete-lead-modal')).toBeNull()
        })
        expect(deleteLead).not.toHaveBeenCalled()

        // Mở lại và bấm nút đóng 'x'
        fireEvent.click(screen.getByTestId('delete-lead-lead-uuid-1'))
        await waitFor(() => {
            expect(screen.getByTestId('delete-lead-modal')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('btn-close-delete-modal'))
        await waitFor(() => {
            expect(screen.queryByTestId('delete-lead-modal')).toBeNull()
        })
        expect(deleteLead).not.toHaveBeenCalled()
    })

    // =========================================================================
    // SCRUM-127: Phân công Lead cho Tư vấn viên & Lịch sử chuyển giao
    // =========================================================================

    it('37. (TC127-01 & TC127-02) Dropdown assignee CHỈ hiển thị Tư vấn tuyển sinh, không để lộ mã kỹ thuật (SCRUM-127)', async () => {
        vi.mocked(getAssignableUsers).mockResolvedValue([
            { id: 'cons-1', name: 'test', email: 'test@ictu.edu.vn', role: 'consultant' },
            { id: 'cons-2', name: 'QA Consultant 02', email: 'qa02@ictu.edu.vn', role: 'consultant' },
            { id: 'trainer-1', name: 'Nguyễn Văn Giảng Viên', email: 'gv@ictu.edu.vn', role: 'trainer' },
            { id: 'admin-1', name: 'Trần Quản Trị', email: 'admin@ictu.edu.vn', role: 'admin' },
        ])
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[0])

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('view-lead-lead-uuid-1')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('view-lead-lead-uuid-1'))

        await waitFor(() => {
            expect(screen.getByTestId('assignee-select')).toBeDefined()
        })

        const select = screen.getByTestId('assignee-select') as HTMLSelectElement
        const optionTexts = Array.from(select.options).map((opt) => opt.text)

        // Phải có option mặc định và các consultant
        expect(optionTexts).toContain('-- Chưa phân công / Gỡ phân công --')
        expect(optionTexts).toContain('test – Tư vấn tuyển sinh')
        expect(optionTexts).toContain('QA Consultant 02 – Tư vấn tuyển sinh')

        // Tuyệt đối không có trainer hoặc admin
        expect(optionTexts.some((t) => t.includes('Nguyễn Văn Giảng Viên'))).toBe(false)
        expect(optionTexts.some((t) => t.includes('Trần Quản Trị'))).toBe(false)

        // Không lộ mã kỹ thuật nội bộ ra UI
        expect(optionTexts.some((t) => t.includes('consultant'))).toBe(false)
        expect(optionTexts.some((t) => t.includes('trainer'))).toBe(false)
        expect(optionTexts.some((t) => t.includes('training_manager'))).toBe(false)
    })

    it('38. (TC127-01) Phân công 1 Lead thành công với autosave và thông báo đúng tên người nhận (SCRUM-127)', async () => {
        const consultants: AssignableUser[] = [
            { id: 'cons-test-id', name: 'test', email: 'test@ictu.edu.vn', role: 'consultant' },
        ]
        vi.mocked(getAssignableUsers).mockResolvedValue(consultants)
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[1])
        const assignedLead: Lead = {
            ...mockLeads[1],
            assigned_to_user_id: 'cons-test-id',
            assigned_to_name: 'test',
            assigned_at: '2026-10-11T03:30:00Z',
        }
        vi.mocked(assignLead).mockResolvedValue(assignedLead)

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('view-lead-lead-uuid-2')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('view-lead-lead-uuid-2'))

        await waitFor(() => {
            expect(screen.getByTestId('assignee-select')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('assignee-select'), {
            target: { value: 'cons-test-id' },
        })

        await waitFor(() => {
            expect(assignLead).toHaveBeenCalledWith(mockRequest, 'lead-uuid-2', 'cons-test-id')
            expect(screen.getByTestId('assignment-success-alert').textContent).toContain(
                'Đã phân công Lead cho test.',
            )
        })
    })

    it('39. (TC127-03) Phân công nhiều Lead cùng lúc (Bulk assign) (SCRUM-127)', async () => {
        const consultants: AssignableUser[] = [
            { id: 'cons-test-id', name: 'test', email: 'test@ictu.edu.vn', role: 'consultant' },
        ]
        vi.mocked(getAssignableUsers).mockResolvedValue(consultants)
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(bulkAssignLeads).mockResolvedValue({
            updated_count: 2,
            message: 'Phân công 2 lead thành công.',
        })

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('select-all-leads-checkbox')).toBeDefined()
        })

        // Chưa chọn lead nào -> không hiển thị thanh bulk action
        expect(screen.queryByTestId('bulk-actions-bar')).toBeNull()

        // Chọn tất cả lead trên trang
        fireEvent.click(screen.getByTestId('select-all-leads-checkbox'))

        await waitFor(() => {
            expect(screen.getByTestId('bulk-actions-bar')).toBeDefined()
            expect(screen.getByText(/Đã chọn/i).textContent).toContain('2')
        })

        // Chọn consultant trong dropdown bulk
        const bulkSelect = screen.getByTestId('bulk-assignee-select')
        fireEvent.change(bulkSelect, { target: { value: 'cons-test-id' } })

        // Bấm phân công
        const bulkBtn = screen.getByTestId('bulk-assign-btn')
        fireEvent.click(bulkBtn)

        await waitFor(() => {
            expect(bulkAssignLeads).toHaveBeenCalledWith(
                mockRequest,
                expect.arrayContaining(['lead-uuid-1', 'lead-uuid-2']),
                'cons-test-id',
            )
            expect(screen.getByTestId('page-success').textContent).toContain(
                'Đã phân công 2 Lead cho test.',
            )
        })
    })

    it('40. (TC127-05 & TC127-06) Hiển thị lịch sử chuyển giao trong modal chi tiết Lead (SCRUM-127)', async () => {
        const historyData: LeadAssignmentHistoryItem[] = [
            {
                id: 'hist-2',
                lead_id: 'lead-uuid-1',
                old_assigned_to_user_id: 'user-1',
                new_assigned_to_user_id: 'cons-2',
                performed_by_user_id: 'tm-1',
                old_assigned_to_name: 'test',
                new_assigned_to_name: 'QA Consultant 02',
                performed_by_name: 'trang test',
                created_at: '2026-10-11T03:30:00Z',
            },
            {
                id: 'hist-1',
                lead_id: 'lead-uuid-1',
                old_assigned_to_user_id: null,
                new_assigned_to_user_id: 'user-1',
                performed_by_user_id: 'tm-1',
                old_assigned_to_name: null,
                new_assigned_to_name: 'test',
                performed_by_name: 'trang test',
                created_at: '2026-10-11T02:15:00Z',
            },
        ]

        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[0])
        vi.mocked(getLeadAssignmentHistory).mockResolvedValue(historyData)

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('view-lead-lead-uuid-1')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('view-lead-lead-uuid-1'))

        await waitFor(() => {
            expect(screen.getByTestId('assignment-history-section')).toBeDefined()
            expect(getLeadAssignmentHistory).toHaveBeenCalledWith(mockRequest, 'lead-uuid-1')
        })

        // Kiểm tra hiển thị đúng các bản ghi lịch sử
        expect(screen.getByTestId('history-transfer-hist-2').textContent).toContain('test')
        expect(screen.getByTestId('history-transfer-hist-2').textContent).toContain('QA Consultant 02')
        expect(screen.getByTestId('history-actor-hist-2').textContent).toContain('trang test')

        expect(screen.getByTestId('history-transfer-hist-1').textContent).toContain('Chưa phân công')
        expect(screen.getByTestId('history-transfer-hist-1').textContent).toContain('test')
        expect(screen.getByTestId('history-actor-hist-1').textContent).toContain('trang test')
    })

    it('41. (TC127-08) Hiển thị thông báo khi Lead chưa có lịch sử phân công (SCRUM-127)', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[1])
        vi.mocked(getLeadAssignmentHistory).mockResolvedValue([])

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('view-lead-lead-uuid-2')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('view-lead-lead-uuid-2'))

        await waitFor(() => {
            expect(screen.getByTestId('history-empty').textContent).toBe(
                'Chưa có lịch sử phân công.',
            )
        })
    })

    it('42. (TC127-Backend Validation) Hiển thị tiếng Việt khi API từ chối user không phải Tư vấn tuyển sinh (SCRUM-127)', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[0])
        vi.mocked(assignLead).mockRejectedValue(
            new ApiError(
                'Chỉ có thể phân công Lead cho nhân viên Tư vấn tuyển sinh.',
                'INVALID_ASSIGNEE',
                400,
            ),
        )

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('view-lead-lead-uuid-1')).toBeDefined()
        })
        fireEvent.click(screen.getByTestId('view-lead-lead-uuid-1'))

        await waitFor(() => {
            expect(screen.getByTestId('assignee-select')).toBeDefined()
        })

        fireEvent.change(screen.getByTestId('assignee-select'), {
            target: { value: 'user-advisor-2' },
        })

        await waitFor(() => {
            expect(screen.getByTestId('assignment-error-alert').textContent).toContain(
                'Chỉ có thể phân công Lead cho nhân viên Tư vấn tuyển sinh.',
            )
        })
    })
})




