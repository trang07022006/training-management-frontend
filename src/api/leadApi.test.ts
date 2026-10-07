// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import {
    getLeads,
    getLead,
    updateLeadStatus,
    getLeadStatusLabel,
    type Lead,
    ApiError,
} from './leadApi'

describe('leadApi - API Client (SCRUM-126 Activity A6)', () => {
    const mockLead: Lead = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        full_name: 'Nguyễn Văn A',
        phone: '0912345678',
        email: 'nguyenvana@example.com',
        interested_program_id: 'prog-uuid-123',
        interested_program_code: 'CNTT-K21',
        interested_program_name: 'Công nghệ thông tin',
        message: 'Cần tư vấn thêm',
        source: 'public_form',
        status: 'new',
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
    }

    describe('getLeadStatusLabel', () => {
        it('ánh xạ đúng nhãn trạng thái tiếng Việt', () => {
            expect(getLeadStatusLabel('new')).toBe('Mới tiếp nhận')
            expect(getLeadStatusLabel('contacted')).toBe('Đã liên hệ')
            expect(getLeadStatusLabel('qualified')).toBe('Tiềm năng')
            expect(getLeadStatusLabel('converted')).toBe('Đã nhập học')
            expect(getLeadStatusLabel('lost')).toBe('Không thành công')
            expect(getLeadStatusLabel('cancelled')).toBe('Đã hủy')
            expect(getLeadStatusLabel(null)).toBe('Không xác định')
            expect(getLeadStatusLabel('unknown')).toBe('unknown')
        })
    })

    describe('getLeads (GET /api/v1/leads)', () => {
        it('gọi đúng URL với tham số phân trang page và page_size', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: [mockLead],
                        total: 1,
                        page: 2,
                        page_size: 15,
                        total_pages: 1,
                    },
                }),
            })

            const result = await getLeads(mockRequest, { page: 2, page_size: 15 })

            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/leads?page=2&page_size=15',
                { method: 'GET' },
            )
            expect(result.items).toHaveLength(1)
            expect(result.total).toBe(1)
            expect(result.page).toBe(2)
        })

        it('xử lý lỗi 403 Forbidden', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 403,
                json: async () => ({
                    code: 'FORBIDDEN',
                    message: 'Bạn không có quyền xem thông tin Lead.',
                }),
            })

            await expect(getLeads(mockRequest)).rejects.toThrow(ApiError)
        })

        it('xử lý lỗi 401 Unauthorized', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 401,
                json: async () => ({
                    code: 'UNAUTHORIZED',
                    message: 'Vui lòng đăng nhập.',
                }),
            })

            await expect(getLeads(mockRequest)).rejects.toThrow(ApiError)
        })
    })

    describe('getLead (GET /api/v1/leads/<id>)', () => {
        it('gọi đúng endpoint với ID được encode', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: mockLead,
                }),
            })

            const result = await getLead(mockRequest, mockLead.id)

            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/leads/${mockLead.id}`,
                { method: 'GET' },
            )
            expect(result.id).toBe(mockLead.id)
            expect(result.full_name).toBe('Nguyễn Văn A')
        })

        it('ném ApiError khi lead không tồn tại (404)', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({
                    code: 'LEAD_NOT_FOUND',
                    message: 'Không tìm thấy thông tin Lead.',
                }),
            })

            await expect(getLead(mockRequest, 'missing-id')).rejects.toThrow(ApiError)
        })
    })

    describe('updateLeadStatus (PATCH /api/v1/leads/<id>)', () => {
        it('gửi payload status hợp lệ và nhận kết quả cập nhật', async () => {
            const updatedLead = { ...mockLead, status: 'contacted' as const }
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: updatedLead,
                }),
            })

            const result = await updateLeadStatus(
                mockRequest,
                mockLead.id,
                'contacted',
            )

            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/leads/${mockLead.id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'contacted' }),
                },
            )
            expect(result.status).toBe('contacted')
        })

        it('ném ApiError khi trạng thái không hợp lệ (400)', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                json: async () => ({
                    code: 'INVALID_STATUS',
                    message: 'Trạng thái không hợp lệ.',
                }),
            })

            await expect(
                updateLeadStatus(mockRequest, mockLead.id, 'new'),
            ).rejects.toThrow(ApiError)
        })
    })
})
