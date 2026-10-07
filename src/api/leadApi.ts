/**
 * Lead Management API Client (SCRUM-126 - Activity A6).
 * Quản lý khách hàng tiềm năng / yêu cầu tư vấn tuyển sinh: danh sách, chi tiết, cập nhật trạng thái.
 * Tuân thủ nghiêm ngặt API Contract Backend (/api/v1/leads).
 */

import { getErrorMessage } from '../utils/errorMessages'
import { ApiError, type RequestFunction } from './userApi'

export { ApiError, type RequestFunction }

export type LeadStatus =
    | 'new'
    | 'contacted'
    | 'qualified'
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


export interface LeadListParams {
    page?: number
    page_size?: number
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
    converted: 'Đã nhập học',
    lost: 'Không thành công',
    cancelled: 'Đã hủy',
}

export const LEAD_STATUS_BADGE_CLASSES: Record<LeadStatus, string> = {
    new: 'status-badge--new',
    contacted: 'status-badge--contacted',
    qualified: 'status-badge--qualified',
    converted: 'status-badge--converted',
    lost: 'status-badge--lost',
    cancelled: 'status-badge--cancelled',
}

export function getLeadStatusLabel(status?: string | null): string {
    if (!status) return 'Không xác định'
    const key = status.trim().toLowerCase() as LeadStatus
    return LEAD_STATUS_LABELS[key] || status
}

/**
 * Lấy danh sách Lead nội bộ có phân trang.
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
            { code, message: body.message },
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
            { code, message: body.message },
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
            { code, message: body.message },
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
            { code, message: body.message },
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
            { code, message: body.message },
            'Không thể tải danh sách nhân sự phụ trách.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data || []
}

