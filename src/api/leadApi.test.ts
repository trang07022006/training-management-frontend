// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import {
    getLeads,
    getLead,
    updateLeadStatus,
    assignLead,
    getAssignableUsers,
    getLeadStatusLabel,
    getLeadSourceLabel,
    LEAD_SOURCES,
    checkLeadPhone,
    createLead,
    updateLead,
    deleteLead,
    getLeadPipeline,
    getLeadStatusHistory,
    type Lead,
    type AssignableUser,
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
            expect(getLeadStatusLabel('new')).toBe('Mới')
            expect(getLeadStatusLabel('contacted')).toBe('Đã liên hệ')
            expect(getLeadStatusLabel('consulting')).toBe('Đang tư vấn')
            expect(getLeadStatusLabel('trial_scheduled')).toBe('Hẹn học thử')
            expect(getLeadStatusLabel('won')).toBe('Chốt')
            expect(getLeadStatusLabel('rejected')).toBe('Từ chối')
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

    describe('assignLead (PATCH /api/v1/leads/<id>/assignment) - SCRUM-127', () => {
        it('gửi payload user_id khi phân công thành công', async () => {
            const assignedLead: Lead = {
                ...mockLead,
                assigned_to_user_id: 'user-uuid-1',
                assigned_to_name: 'Minh Trang',
                assigned_at: '2026-03-01T10:00:00Z',
            }
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: assignedLead,
                }),
            })

            const result = await assignLead(mockRequest, mockLead.id, 'user-uuid-1')

            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/leads/${mockLead.id}/assignment`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: 'user-uuid-1' }),
                },
            )
            expect(result.assigned_to_user_id).toBe('user-uuid-1')
            expect(result.assigned_to_name).toBe('Minh Trang')
        })

        it('gửi payload user_id: null khi gỡ phân công thành công', async () => {
            const unassignedLead: Lead = {
                ...mockLead,
                assigned_to_user_id: null,
                assigned_to_name: null,
                assigned_at: null,
            }
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: unassignedLead,
                }),
            })

            const result = await assignLead(mockRequest, mockLead.id, null)

            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/leads/${mockLead.id}/assignment`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: null }),
                },
            )
            expect(result.assigned_to_user_id).toBeNull()
        })

        it('ném ApiError khi phân công thất bại (400 INVALID_ASSIGNEE)', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                json: async () => ({
                    code: 'INVALID_ASSIGNEE',
                    message: 'Chỉ có thể phân công cho nhân sự quản lý.',
                }),
            })

            await expect(
                assignLead(mockRequest, mockLead.id, 'trainee-id'),
            ).rejects.toThrow(ApiError)
        })
    })

    describe('getAssignableUsers (GET /api/v1/leads/assignable-users) - SCRUM-127', () => {
        it('lấy danh sách nhân sự có thể tiếp nhận Lead', async () => {
            const mockUsers: AssignableUser[] = [
                { id: 'u1', name: 'Trang Lê', email: 'trang@ictu.edu.vn', role: 'admin' },
                { id: 'u2', name: 'Giảng viên A', email: 'gva@ictu.edu.vn', role: 'trainer' },
            ]
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: mockUsers,
                }),
            })

            const result = await getAssignableUsers(mockRequest)

            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/leads/assignable-users',
                { method: 'GET' },
            )
            expect(result).toHaveLength(2)
            expect(result[0].name).toBe('Trang Lê')
        })

        it('ném ApiError khi không có quyền (403 FORBIDDEN)', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 403,
                json: async () => ({
                    code: 'FORBIDDEN',
                    message: 'Không có quyền truy cập.',
                }),
            })

            await expect(getAssignableUsers(mockRequest)).rejects.toThrow(ApiError)
        })
    })

    describe('getLeadSourceLabel & LEAD_SOURCES (SCRUM-126)', () => {
        it('chứa danh sách các nguồn hợp lệ của hệ thống', () => {
            expect(LEAD_SOURCES.some((s) => s.value === 'direct')).toBe(true)
            expect(LEAD_SOURCES.some((s) => s.value === 'hotline')).toBe(true)
            expect(LEAD_SOURCES.some((s) => s.value === 'public_form')).toBe(true)
        })

        it('ánh xạ đúng nhãn tiếng Việt cho các mã nguồn', () => {
            expect(getLeadSourceLabel('direct')).toBe('Trực tiếp tại văn phòng')
            expect(getLeadSourceLabel('hotline')).toBe('Hotline / Điện thoại')
            expect(getLeadSourceLabel('social')).toBe('Mạng xã hội (Facebook, Zalo...)')
            expect(getLeadSourceLabel('public_form')).toBe('Biểu mẫu website')
            expect(getLeadSourceLabel(null)).toBe('Chưa xác định')
            expect(getLeadSourceLabel('other_custom')).toBe('other_custom')
        })
    })

    describe('checkLeadPhone (GET /api/v1/leads/check-phone) - SCRUM-126', () => {
        it('kiểm tra số điện thoại trùng thành công', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: {
                        exists: true,
                        lead: {
                            id: 'lead-1',
                            full_name: 'Nguyễn Văn A',
                            phone: '0912345678',
                        },
                    },
                }),
            })

            const result = await checkLeadPhone(mockRequest, '0912345678', 'lead-2')

            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/leads/check-phone?phone=0912345678&exclude_id=lead-2',
                { method: 'GET' },
            )
            expect(result.exists).toBe(true)
            expect(result.lead?.full_name).toBe('Nguyễn Văn A')
        })

        it('ném ApiError khi gặp lỗi hệ thống', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                json: async () => ({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Lỗi kiểm tra số điện thoại.',
                }),
            })

            await expect(checkLeadPhone(mockRequest, '0912345678')).rejects.toThrow(ApiError)
        })
    })

    describe('createLead (POST /api/v1/leads) - SCRUM-126', () => {
        it('gửi thông tin tạo lead thủ công thành công', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    message: 'Tạo khách hàng tiềm năng thành công.',
                    data: mockLead,
                    duplicate_warning: false,
                    existing_lead: null,
                }),
            })

            const input = {
                full_name: 'QA SCRUM 126',
                phone: '0912612626',
                email: 'qa.s126@example.com',
                source: 'direct',
                interested_program_id: 'prog-uuid-123',
            }

            const result = await createLead(mockRequest, input)

            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/leads',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(input),
                }),
            )
            expect(result.lead.id).toBe(mockLead.id)
            expect(result.duplicate_warning).toBe(false)
            expect(result.message).toBe('Tạo khách hàng tiềm năng thành công.')
        })

        it('nhận duplicate_warning khi số điện thoại đã tồn tại', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    message: 'Tạo khách hàng tiềm năng thành công.',
                    data: mockLead,
                    duplicate_warning: true,
                    existing_lead: {
                        id: 'old-lead',
                        full_name: 'Nguyễn Văn Cũ',
                        phone: '0912612626',
                    },
                }),
            })

            const result = await createLead(mockRequest, {
                full_name: 'QA SCRUM 126',
                phone: '0912612626',
            })

            expect(result.duplicate_warning).toBe(true)
            expect(result.existing_lead?.full_name).toBe('Nguyễn Văn Cũ')
        })

        it('ném ApiError khi validate lỗi (400)', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                json: async () => ({
                    code: 'NAME_REQUIRED',
                    message: 'Vui lòng nhập họ và tên.',
                }),
            })

            await expect(
                createLead(mockRequest, { full_name: '', phone: '0912612626' }),
            ).rejects.toThrow(ApiError)
        })
    })

    describe('updateLead (PUT /api/v1/leads/<id>) - SCRUM-126', () => {
        it('gửi thông tin cập nhật lead thành công', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    message: 'Cập nhật khách hàng tiềm năng thành công.',
                    data: { ...mockLead, full_name: 'Tên Đã Sửa' },
                    duplicate_warning: false,
                    existing_lead: null,
                }),
            })

            const input = {
                full_name: 'Tên Đã Sửa',
                phone: '0912345678',
                email: 'test@example.com',
                source: 'hotline',
            }

            const result = await updateLead(mockRequest, mockLead.id, input)

            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/leads/${mockLead.id}`,
                expect.objectContaining({
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(input),
                }),
            )
            expect(result.lead.full_name).toBe('Tên Đã Sửa')
            expect(result.message).toBe('Cập nhật khách hàng tiềm năng thành công.')
        })

        it('ném ApiError khi lead không tồn tại (404)', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({
                    code: 'LEAD_NOT_FOUND',
                    message: 'Không tìm thấy khách hàng tiềm năng.',
                }),
            })

            await expect(
                updateLead(mockRequest, 'unknown-id', {
                    full_name: 'Tên',
                    phone: '0912345678',
                }),
            ).rejects.toThrow(ApiError)
        })
    })

    describe('deleteLead (DELETE /api/v1/leads/<id>) - SCRUM-126', () => {
        it('gọi DELETE /api/v1/leads/<id> thành công (200)', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    message: 'Xóa khách hàng tiềm năng thành công.',
                }),
            })

            const res = await deleteLead(mockRequest, mockLead.id)

            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/leads/${mockLead.id}`,
                expect.objectContaining({ method: 'DELETE' }),
            )
            expect(res.status).toBe('success')
            expect(res.message).toBe('Xóa khách hàng tiềm năng thành công.')
        })

        it('bị từ chối quyền (403 FORBIDDEN) khi role không có quyền xóa', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 403,
                json: async () => ({
                    status: 'error',
                    code: 'FORBIDDEN',
                    message: 'Không có quyền thực hiện thao tác này.',
                }),
            })

            await expect(deleteLead(mockRequest, mockLead.id)).rejects.toThrow(ApiError)
        })
    })

    describe('SCRUM-213 - Lead Pipeline & Status History API', () => {
        it('updateLeadStatus gửi reason và notes khi cập nhật rejected', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: { ...mockLead, status: 'rejected', rejection_reason: 'Không còn nhu cầu' },
                }),
            })

            const res = await updateLeadStatus(
                mockRequest,
                mockLead.id,
                'rejected',
                'Không còn nhu cầu',
                'Khách hàng chuyển hướng du học',
            )

            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/leads/${mockLead.id}`,
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: 'rejected',
                        reason: 'Không còn nhu cầu',
                        notes: 'Khách hàng chuyển hướng du học',
                    }),
                }),
            )
            expect(res.status).toBe('rejected')
        })

        it('getLeadPipeline gọi GET /api/v1/leads/pipeline và trả về các cột', async () => {
            const pipelineData = {
                columns: [
                    { status: 'new', label: 'Mới', count: 1 },
                    { status: 'contacted', label: 'Đã liên hệ', count: 0 },
                ],
                leads: [mockLead],
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
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: pipelineData,
                }),
            })

            const res = await getLeadPipeline(mockRequest)

            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/leads/pipeline',
                expect.objectContaining({ method: 'GET' }),
            )
            expect(res.leads).toHaveLength(1)
            expect(res.counts.new).toBe(1)
            expect(res.total).toBe(1)
        })

        it('getLeadStatusHistory gọi GET /api/v1/leads/<id>/status-history', async () => {
            const historyItems = [
                {
                    id: 'hist-1',
                    lead_id: mockLead.id,
                    old_status: 'new',
                    new_status: 'contacted',
                    reason: null,
                    notes: null,
                    performed_by_name: 'Tư vấn A',
                    created_at: '2026-03-01T10:00:00Z',
                },
            ]
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'success',
                    data: historyItems,
                }),
            })

            const res = await getLeadStatusHistory(mockRequest, mockLead.id)

            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/leads/${mockLead.id}/status-history`,
                expect.objectContaining({ method: 'GET' }),
            )
            expect(res).toHaveLength(1)
            expect(res[0].old_status).toBe('new')
            expect(res[0].new_status).toBe('contacted')
        })
    })
})


