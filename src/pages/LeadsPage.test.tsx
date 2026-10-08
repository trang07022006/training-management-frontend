// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react'
import { LeadsPage } from './LeadsPage'
import { getLeads, getLead, updateLeadStatus, assignLead, getAssignableUsers } from '../api/leadApi'

import type { Lead, LeadListResponseData, AssignableUser } from '../api/leadApi'

// Mock SessionProvider
const mockRequest = vi.fn()
vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        request: mockRequest,
        role: 'admin',
        roles: ['admin'],
        permissions: ['course.manage'],
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
        { id: 'user-advisor-1', name: 'Trần Văn Tư Vấn', email: 'tuvan@ictu.edu.vn', role: 'trainer' },
        { id: 'user-advisor-2', name: 'Lê Quản Trị', email: 'quantri@ictu.edu.vn', role: 'admin' },
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
        vi.mocked(getAssignableUsers).mockResolvedValue(mockAssignableUsers)
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

        fireEvent.click(screen.getByTestId('save-assignment-btn'))

        await waitFor(() => {
            expect(assignLead).toHaveBeenCalledWith(
                mockRequest,
                'lead-uuid-2',
                'user-advisor-2',
            )
            expect(screen.getByTestId('assignment-success-alert').textContent).toContain(
                'Phân công nhân sự phụ trách thành công!',
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

        fireEvent.click(screen.getByTestId('save-assignment-btn'))

        await waitFor(() => {
            expect(assignLead).toHaveBeenCalledWith(mockRequest, 'lead-uuid-1', null)
            expect(screen.getByTestId('assignment-success-alert').textContent).toContain(
                'Đã gỡ phân công nhân sự phụ trách!',
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
            expect(screen.getByTestId('page-error').textContent).toContain(
                'Không thể kết nối đến máy chủ.',
            )
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
            { id: 'real-user-1', name: 'Giảng viên Thật', email: 'real@ictu.edu.vn', role: 'trainer' },
            { id: 'demo-user-trainer', name: 'Giảng viên Demo', email: 'demo@ictu.edu.vn', role: 'trainer' },
        ])
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.queryByText('Giảng viên Demo')).toBeNull()
            expect(screen.getByText('Giảng viên Thật')).toBeDefined()
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
        fireEvent.click(screen.getByTestId('save-status-btn'))

        await waitFor(() => {
            expect(updateLeadStatus).toHaveBeenCalledWith(mockRequest, 'lead-uuid-1', 'contacted')
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
        fireEvent.click(screen.getByTestId('save-assignment-btn'))

        await waitFor(() => {
            expect(assignLead).toHaveBeenCalledWith(mockRequest, 'lead-uuid-2', 'user-advisor-1')
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
})


