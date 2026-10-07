// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { LeadsPage } from './LeadsPage'
import { getLeads, getLead, updateLeadStatus } from '../api/leadApi'
import type { Lead, LeadListResponseData } from '../api/leadApi'

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
    }
})

describe('LeadsPage - UI Test Suite (SCRUM-126 Activity A6)', () => {
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
            created_at: '2026-03-02T14:30:00Z',
            updated_at: '2026-03-02T15:00:00Z',
        },
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

    it('2. Hiển thị danh sách Lead với đầy đủ thông tin và badge trạng thái', async () => {
        vi.mocked(getLeads).mockResolvedValue(mockListResponse)

        render(<LeadsPage />)

        await waitFor(() => {
            expect(screen.getByText('Nguyễn Văn A')).toBeDefined()
            expect(screen.getByText('0912345678')).toBeDefined()
            expect(screen.getByText('nguyenvana@example.com')).toBeDefined()
            expect(screen.getByText('Công nghệ thông tin')).toBeDefined()
            expect(screen.getByTestId('status-badge-lead-uuid-1').textContent).toContain(
                'Mới tiếp nhận',
            )

            expect(screen.getByText('Trần Thị B')).toBeDefined()
            expect(screen.getByText('0987654321')).toBeDefined()
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
            // Bảng cập nhật badge mới
            expect(screen.getByTestId('status-badge-lead-uuid-1').textContent).toContain(
                'Tiềm năng',
            )
        })
    })

    it('5. Hiển thị thông báo khi danh sách trống', async () => {
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

    it('6. Hiển thị lỗi khi API thất bại', async () => {
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

    it('7. Điều khiển phân trang chuyển trang đúng', async () => {
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
