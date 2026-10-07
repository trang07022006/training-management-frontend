// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
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

describe('LeadsPage - UI Test Suite (SCRUM-126/127)', () => {
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

    it('1. Hiển thị tiêu đề trang, mô tả và cấu trúc chính', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)

        render(<LeadsPage />)

        expect(
            screen.getByRole('heading', { name: /Quản lý Tư vấn Tuyển sinh/i }),
        ).toBeDefined()
        expect(
            screen.getByText(/Theo dõi và xử lý các yêu cầu đăng ký tư vấn/i),
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

    it('3. Mở modal chi tiết khi click "Xem chi tiết"', async () => {
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
            expect(screen.getByTestId('detail-message').textContent).toContain(
                'Tôi muốn tư vấn học phí và lộ trình.',
            )
        })
    })

    it('4. Cập nhật trạng thái thành công trong modal chi tiết', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[0])
        const updatedLead: Lead = { ...mockLeads[0], status: 'qualified' }
        vi.mocked(updateLeadStatus).mockResolvedValue(updatedLead)

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByTestId('view-lead-lead-uuid-1')).toBeDefined()
        })

        fireEvent.click(screen.getByTestId('view-lead-lead-uuid-1'))

        await waitFor(() => {
            expect(screen.getByTestId('status-select')).toBeDefined()
        })

        // Thay đổi sang "qualified"
        fireEvent.change(screen.getByTestId('status-select'), {
            target: { value: 'qualified' },
        })

        // Click Lưu trạng thái
        fireEvent.click(screen.getByTestId('save-status-btn'))

        await waitFor(() => {
            expect(updateLeadStatus).toHaveBeenCalledWith(
                mockRequest,
                'lead-uuid-1',
                'qualified',
            )
            expect(screen.getByTestId('status-success-alert').textContent).toContain(
                'Cập nhật trạng thái thành công!',
            )
        })

        // Đóng modal
        fireEvent.click(screen.getByTestId('close-modal-btn'))

        await waitFor(() => {
            expect(screen.queryByTestId('lead-detail-modal')).toBeNull()
            expect(screen.getByTestId('status-badge-lead-uuid-1').textContent).toContain(
                'Tiềm năng',
            )
        })
    })

    it('5. Phân công nhân sự phụ trách thành công (SCRUM-127)', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[1]) // lead 2 chưa phân công
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

        // Chọn nhân sự 'user-advisor-2'
        fireEvent.change(screen.getByTestId('assignee-select'), {
            target: { value: 'user-advisor-2' },
        })

        // Click Lưu phân công
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
            expect(screen.getByTestId('detail-assignee').textContent).toContain('Lê Quản Trị')
        })
    })

    it('6. Gỡ phân công nhân sự phụ trách thành công (SCRUM-127)', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)
        vi.mocked(getLead).mockResolvedValue(mockLeads[0]) // lead 1 đã phân công
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

        // Chọn rỗng (gỡ phân công)
        fireEvent.change(screen.getByTestId('assignee-select'), {
            target: { value: '' },
        })

        // Click Gỡ phân công
        fireEvent.click(screen.getByTestId('save-assignment-btn'))

        await waitFor(() => {
            expect(assignLead).toHaveBeenCalledWith(mockRequest, 'lead-uuid-1', null)
            expect(screen.getByTestId('assignment-success-alert').textContent).toContain(
                'Đã gỡ phân công nhân sự phụ trách!',
            )
            expect(screen.getByTestId('detail-assignee').textContent).toContain('Chưa phân công')
        })
    })

    it('7. Hiển thị thông báo khi danh sách trống', async () => {
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

    it('8. Hiển thị lỗi khi API thất bại', async () => {
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

    it('9. Điều khiển phân trang chuyển trang đúng', async () => {
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
            expect(getLeads).toHaveBeenCalledWith(mockRequest, {
                page: 2,
                page_size: 10,
            })
        })
    })
})
