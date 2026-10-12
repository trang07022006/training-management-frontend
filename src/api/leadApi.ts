/**
 * Lead Management API Client (SCRUM-126 - Activity A6).
 * Quản lý khách hàng tiềm năng / yêu cầu tư vấn tuyển sinh: danh sách, chi tiết, cập nhật trạng thái.
 * Tuân thủ nghiêm ngặt API Contract Backend (/api/v1/leads).
 */

import { getErrorMessage } from '../utils/errorMessages'
import { ApiError, type RequestFunction } from './userApi'

export { ApiError, type RequestFunction }
export { convertLeadToStudent, type Student, type ConvertLeadResult } from './studentApi'

export type LeadStatus =
    | 'new'
    | 'contacted'
    | 'qualified'
    | 'won'
    | 'converted'
    | 'lost'
    | 'cancelled'

export interface Lead {
    id: string
    full_name: string
    phone: string
    email: string | null
    interested_program_id: string | null
    interested_program_code?: string | null
    interested_program_name?: string | null
    message: string | null
    source: string
    status: LeadStatus
    assigned_to_user_id?: string | null
    assigned_at?: string | null
    assigned_to_name?: string | null
    assigned_to_email?: string | null
    created_at: string | null
    updated_at: string | null
}

export interface AssignableUser {
    id: string
    name: string
    email: string
    role: string
}

export interface LeadAssignmentHistoryItem {
    id: string
    lead_id: string
    old_assigned_to_user_id: string | null
    new_assigned_to_user_id: string | null
    performed_by_user_id: string | null
    old_assigned_to_name: string | null
    new_assigned_to_name: string | null
    performed_by_name: string | null
    created_at: string
}

export interface BulkAssignResult {
    updated_count: number
    message: string
}

export interface LeadListParams {
    page?: number
    page_size?: number
    search?: string
    status?: string
    interested_program_id?: string
    assigned_to_user_id?: string
    source?: string
    date_from?: string
    date_to?: string
    sort_by?: string
    sort_order?: 'ASC' | 'DESC' | 'asc' | 'desc'
}

export interface LeadListResponseData {
    items: Lead[]
    total: number
    page: number
    page_size: number
    total_pages: number
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
    new: 'Mới tiếp nhận',
    contacted: 'Đã liên hệ',
    qualified: 'Tiềm năng',
    won: 'Chốt',
    converted: 'Đã nhập học',
    lost: 'Không thành công',
    cancelled: 'Đã hủy',
}

export const LEAD_STATUS_BADGE_CLASSES: Record<LeadStatus, string> = {
    new: 'status-badge--new',
    contacted: 'status-badge--contacted',
    qualified: 'status-badge--qualified',
    won: 'status-badge--won',
    converted: 'status-badge--converted',
    lost: 'status-badge--lost',
    cancelled: 'status-badge--cancelled',
}

export function getLeadStatusLabel(status?: string | null): string {
    if (!status) return 'Không xác định'
    const key = status.trim().toLowerCase() as LeadStatus
    return LEAD_STATUS_LABELS[key] || status
}

export interface LeadSourceOption {
    value: string
    label: string
}

export const LEAD_SOURCES: LeadSourceOption[] = [
    { value: 'direct', label: 'Trực tiếp tại văn phòng' },
    { value: 'hotline', label: 'Hotline / Điện thoại' },
    { value: 'social', label: 'Mạng xã hội (Facebook, Zalo...)' },
    { value: 'referral', label: 'Người quen giới thiệu' },
    { value: 'event', label: 'Sự kiện / Ngày hội tuyển sinh' },
    { value: 'public_form', label: 'Biểu mẫu website' },
    { value: 'other', label: 'Nguồn khác' },
]

export const LEAD_SOURCE_LABELS: Record<string, string> = {
    direct: 'Trực tiếp tại văn phòng',
    hotline: 'Hotline / Điện thoại',
    social: 'Mạng xã hội (Facebook, Zalo...)',
    referral: 'Người quen giới thiệu',
    event: 'Sự kiện / Ngày hội tuyển sinh',
    public_form: 'Biểu mẫu website',
    other: 'Nguồn khác',
}

export function getLeadSourceLabel(source?: string | null): string {
    if (!source) return 'Chưa xác định'
    const key = source.trim().toLowerCase()
    return LEAD_SOURCE_LABELS[key] || source
}

export interface CreateLeadInput {
    full_name: string
    phone: string
    email?: string | null
    source?: string
    interested_program_id?: string | null
    message?: string | null
}

export interface UpdateLeadInput {
    full_name: string
    phone: string
    email?: string | null
    source?: string
    interested_program_id?: string | null
    message?: string | null
}

export interface ExistingLeadSummary {
    id: string
    full_name: string
    phone: string
    created_at?: string | null
}

export interface LeadMutationResult {
    lead: Lead
    duplicate_warning: boolean
    existing_lead: ExistingLeadSummary | null
    message: string
}

export interface CheckPhoneResult {
    exists: boolean
    lead: ExistingLeadSummary | null
}

/**
 * Lấy danh sách Lead nội bộ có phân trang, tìm kiếm và lọc.
 * GET /api/v1/leads
 * Yêu cầu quyền: course.manage
 */
export async function getLeads(
    requestFn: RequestFunction,
    params: LeadListParams = {},
): Promise<LeadListResponseData> {
    const query = new URLSearchParams()
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.page_size !== undefined) query.set('page_size', String(params.page_size))
    if (params.search !== undefined && params.search.trim()) query.set('search', params.search.trim())
    if (params.status !== undefined && params.status.trim()) query.set('status', params.status.trim())
    if (params.interested_program_id !== undefined && params.interested_program_id.trim())
        query.set('interested_program_id', params.interested_program_id.trim())
    if (params.assigned_to_user_id !== undefined && params.assigned_to_user_id.trim())
        query.set('assigned_to_user_id', params.assigned_to_user_id.trim())
    if (params.source !== undefined && params.source.trim()) query.set('source', params.source.trim())
    if (params.date_from !== undefined && params.date_from.trim()) query.set('date_from', params.date_from.trim())
    if (params.date_to !== undefined && params.date_to.trim()) query.set('date_to', params.date_to.trim())
    if (params.sort_by !== undefined && params.sort_by.trim()) query.set('sort_by', params.sort_by.trim())
    if (params.sort_order !== undefined && params.sort_order.trim())
        query.set('sort_order', params.sort_order.trim().toUpperCase())

    const qs = query.toString()
    const path = `/api/v1/leads${qs ? `?${qs}` : ''}`

    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code =
            body.code ||
            (res.status === 403
                ? 'FORBIDDEN'
                : res.status === 401
                  ? 'UNAUTHORIZED'
                  : 'API_ERROR')
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Lỗi khi tải danh sách tư vấn.',
        )
        throw new ApiError(message, code, res.status)
    }

    return (
        body.data ?? {
            items: [],
            total: 0,
            page: 1,
            page_size: 20,
            total_pages: 0,
        }
    )
}

/**
 * Lấy chi tiết thông tin một Lead theo ID.
 * GET /api/v1/leads/<id>
 * Yêu cầu quyền: course.manage
 */
export async function getLead(
    requestFn: RequestFunction,
    id: string,
): Promise<Lead> {
    const path = `/api/v1/leads/${encodeURIComponent(id.trim())}`

    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code =
            body.code ||
            (res.status === 404
                ? 'LEAD_NOT_FOUND'
                : res.status === 403
                  ? 'FORBIDDEN'
                  : res.status === 401
                    ? 'UNAUTHORIZED'
                    : 'API_ERROR')
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể tải chi tiết thông tin tư vấn.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Cập nhật trạng thái xử lý của Lead.
 * PATCH /api/v1/leads/<id>
 * Yêu cầu quyền: course.manage
 */
export async function updateLeadStatus(
    requestFn: RequestFunction,
    id: string,
    status: LeadStatus,
): Promise<Lead> {
    const path = `/api/v1/leads/${encodeURIComponent(id.trim())}`

    const res = await requestFn(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code =
            body.code ||
            (res.status === 404
                ? 'LEAD_NOT_FOUND'
                : res.status === 400
                  ? 'INVALID_PARAMS'
                  : res.status === 403
                    ? 'FORBIDDEN'
                    : res.status === 401
                      ? 'UNAUTHORIZED'
                      : 'API_ERROR')
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể cập nhật trạng thái Lead.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Phân công hoặc gỡ phân công Lead (SCRUM-127 - Activity A6).
 * PATCH /api/v1/leads/<id>/assignment
 * Yêu cầu quyền: course.manage
 */
export async function assignLead(
    requestFn: RequestFunction,
    leadId: string,
    userId: string | null,
): Promise<Lead> {
    const path = `/api/v1/leads/${encodeURIComponent(leadId.trim())}/assignment`

    const res = await requestFn(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code =
            body.code ||
            (res.status === 404
                ? 'LEAD_NOT_FOUND'
                : res.status === 400
                  ? 'INVALID_PARAMS'
                  : res.status === 403
                    ? 'FORBIDDEN'
                    : res.status === 401
                      ? 'UNAUTHORIZED'
                      : 'API_ERROR')
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            userId ? 'Không thể phân công Lead.' : 'Không thể gỡ phân công Lead.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Lấy danh sách nhân sự có thể tiếp nhận Lead (SCRUM-127 - Activity A6).
 * GET /api/v1/leads/assignable-users
 * Yêu cầu quyền: course.manage
 */
export async function getAssignableUsers(
    requestFn: RequestFunction,
): Promise<AssignableUser[]> {
    const path = '/api/v1/leads/assignable-users'

    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code =
            body.code ||
            (res.status === 403
                ? 'FORBIDDEN'
                : res.status === 401
                  ? 'UNAUTHORIZED'
                  : 'API_ERROR')
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể tải danh sách nhân sự phụ trách.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data || []
}

/**
 * Lấy lịch sử chuyển giao / phân công của một Lead (SCRUM-127 - Activity A8).
 * GET /api/v1/leads/<id>/history
 * Yêu cầu quyền: course.manage
 */
export async function getLeadAssignmentHistory(
    requestFn: RequestFunction,
    leadId: string,
): Promise<LeadAssignmentHistoryItem[]> {
    const path = `/api/v1/leads/${encodeURIComponent(leadId.trim())}/history`

    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code =
            body.code ||
            (res.status === 404
                ? 'LEAD_NOT_FOUND'
                : res.status === 403
                  ? 'FORBIDDEN'
                  : res.status === 401
                    ? 'UNAUTHORIZED'
                    : 'API_ERROR')
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể tải lịch sử phân công Lead.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data || []
}

/**
 * Phân công hoặc gỡ phân công đồng loạt nhiều Lead (SCRUM-127 - Activity A10).
 * POST /api/v1/leads/bulk-assignment
 * Yêu cầu quyền: course.manage
 */
export async function bulkAssignLeads(
    requestFn: RequestFunction,
    leadIds: string[],
    userId: string | null,
): Promise<BulkAssignResult> {
    const path = '/api/v1/leads/bulk-assignment'

    const res = await requestFn(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            lead_ids: leadIds,
            user_id: userId,
        }),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code =
            body.code ||
            (res.status === 400
                ? 'INVALID_PARAMS'
                : res.status === 403
                  ? 'FORBIDDEN'
                  : res.status === 401
                    ? 'UNAUTHORIZED'
                    : 'API_ERROR')
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể phân công nhiều Lead.',
        )
        throw new ApiError(message, code, res.status)
    }

    return {
        updated_count: body.data?.updated_count ?? 0,
        message: body.message || 'Phân công hàng loạt thành công.',
    }
}

/**
 * Kiểm tra xem số điện thoại có trùng với lead đã có hay không (SCRUM-126).
 * GET /api/v1/leads/check-phone
 * Yêu cầu quyền: course.manage
 */
export async function checkLeadPhone(
    requestFn: RequestFunction,
    phone: string,
    excludeId?: string,
): Promise<CheckPhoneResult> {
    const query = new URLSearchParams()
    query.set('phone', phone.trim())
    if (excludeId && excludeId.trim()) {
        query.set('exclude_id', excludeId.trim())
    }

    const path = `/api/v1/leads/check-phone?${query.toString()}`
    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code =
            body.code ||
            (res.status === 403
                ? 'FORBIDDEN'
                : res.status === 401
                  ? 'UNAUTHORIZED'
                  : 'API_ERROR')
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể kiểm tra số điện thoại.',
        )
        throw new ApiError(message, code, res.status)
    }

    return (
        body.data ?? {
            exists: false,
            lead: null,
        }
    )
}

/**
 * Tạo mới khách hàng tiềm năng thủ công (SCRUM-126 - Tạo Lead).
 * POST /api/v1/leads
 * Yêu cầu quyền: course.manage
 */
export async function createLead(
    requestFn: RequestFunction,
    input: CreateLeadInput,
): Promise<LeadMutationResult> {
    const path = '/api/v1/leads'
    const res = await requestFn(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code =
            body.code ||
            (res.status === 400
                ? 'INVALID_PARAMS'
                : res.status === 403
                  ? 'FORBIDDEN'
                  : res.status === 401
                    ? 'UNAUTHORIZED'
                    : 'API_ERROR')
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể tạo khách hàng tiềm năng.',
        )
        throw new ApiError(message, code, res.status)
    }

    return {
        lead: body.data,
        duplicate_warning: Boolean(body.duplicate_warning),
        existing_lead: body.existing_lead ?? null,
        message: body.message || 'Tạo khách hàng tiềm năng thành công.',
    }
}

/**
 * Cập nhật thông tin chi tiết một Lead (SCRUM-126 - Sửa Lead).
 * PUT /api/v1/leads/<id>
 * Yêu cầu quyền: course.manage
 */
export async function updateLead(
    requestFn: RequestFunction,
    id: string,
    input: UpdateLeadInput,
): Promise<LeadMutationResult> {
    const path = `/api/v1/leads/${encodeURIComponent(id.trim())}`
    const res = await requestFn(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code =
            body.code ||
            (res.status === 404
                ? 'LEAD_NOT_FOUND'
                : res.status === 400
                  ? 'INVALID_PARAMS'
                  : res.status === 403
                    ? 'FORBIDDEN'
                    : res.status === 401
                      ? 'UNAUTHORIZED'
                      : 'API_ERROR')
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể cập nhật khách hàng tiềm năng.',
        )
        throw new ApiError(message, code, res.status)
    }

    return {
        lead: body.data,
        duplicate_warning: Boolean(body.duplicate_warning),
        existing_lead: body.existing_lead ?? null,
        message: body.message || 'Cập nhật khách hàng tiềm năng thành công.',
    }
}

/**
 * Xóa một khách hàng tiềm năng (SCRUM-126 - Chỉ Quản lý đào tạo được xóa Lead).
 * DELETE /api/v1/leads/<id>
 * Yêu cầu quyền: lead.delete
 */
export async function deleteLead(
    requestFn: RequestFunction,
    id: string,
): Promise<{ status: string; message: string }> {
    const path = `/api/v1/leads/${encodeURIComponent(id.trim())}`
    const res = await requestFn(path, {
        method: 'DELETE',
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code =
            body.code ||
            (res.status === 404
                ? 'LEAD_NOT_FOUND'
                : res.status === 403
                  ? 'FORBIDDEN'
                  : res.status === 401
                    ? 'UNAUTHORIZED'
                    : 'API_ERROR')
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể xóa khách hàng tiềm năng.',
        )
        throw new ApiError(message, code, res.status)
    }

    return {
        status: body.status || 'success',
        message: body.message || 'Xóa khách hàng tiềm năng thành công.',
    }
}

