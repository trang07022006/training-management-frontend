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
    | 'consulting'
    | 'trial_scheduled'
    | 'won'
    | 'rejected'
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
    rejection_reason?: string | null
    callback_date?: string | null
    assigned_to_user_id?: string | null
    assigned_at?: string | null
    assigned_to_name?: string | null
    assigned_to_email?: string | null
    student_code?: string | null
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
    new: 'Mới',
    contacted: 'Đã liên hệ',
    consulting: 'Đang tư vấn',
    trial_scheduled: 'Hẹn học thử',
    won: 'Chốt',
    rejected: 'Từ chối',
    qualified: 'Tiềm năng',
    converted: 'Đã nhập học',
    lost: 'Không thành công',
    cancelled: 'Đã hủy',
}

export const LEAD_STATUS_BADGE_CLASSES: Record<LeadStatus, string> = {
    new: 'status-badge--new',
    contacted: 'status-badge--contacted',
    consulting: 'status-badge--consulting',
    trial_scheduled: 'status-badge--trial',
    won: 'status-badge--won',
    rejected: 'status-badge--rejected',
    qualified: 'status-badge--qualified',
    converted: 'status-badge--converted',
    lost: 'status-badge--lost',
    cancelled: 'status-badge--cancelled',
}

export const PIPELINE_STATUS_KEYS: LeadStatus[] = [
    'new',
    'contacted',
    'consulting',
    'trial_scheduled',
    'won',
    'rejected',
]

export const REJECTION_REASONS = [
    'Không còn nhu cầu',
    'Chi phí không phù hợp',
    'Chọn đơn vị khác',
    'Không liên lạc được',
    'Khác',
] as const

export type RejectionReason = (typeof REJECTION_REASONS)[number]

export interface LeadStatusHistoryItem {
    id: string
    lead_id: string
    old_status: string
    new_status: string
    reason?: string | null
    notes?: string | null
    performed_by_user_id?: string | null
    performed_by_name?: string | null
    created_at: string
}

export interface PipelineColumn {
    status: LeadStatus
    label: string
    count: number
    leads: Lead[]
}

export interface PipelineData {
    columns: PipelineColumn[]
    leads: Lead[]
    counts: Record<string, number>
    total: number
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
    reason?: string | null,
    notes?: string | null,
): Promise<Lead> {
    const path = `/api/v1/leads/${encodeURIComponent(id.trim())}`

    const payload: { status: LeadStatus; reason?: string; notes?: string } = { status }
    if (reason && reason.trim()) payload.reason = reason.trim()
    if (notes && notes.trim()) payload.notes = notes.trim()

    const res = await requestFn(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

/**
 * Lấy dữ liệu bảng phễu Lead (Kanban) với 6 trạng thái chuẩn (SCRUM-213).
 * GET /api/v1/leads/pipeline
 * Yêu cầu quyền: course.manage
 */
export async function getLeadPipeline(
    requestFn: RequestFunction,
): Promise<PipelineData> {
    const path = '/api/v1/leads/pipeline'
    try {
        const res = await requestFn(path, { method: 'GET' })
        const body = await res.json().catch(() => ({}))

        if (res.ok && body.data) {
            return body.data
        }

        if (!res.ok && res.status !== 404) {
            const code =
                body.code ||
                (res.status === 403
                    ? 'FORBIDDEN'
                    : res.status === 401
                      ? 'UNAUTHORIZED'
                      : 'API_ERROR')
            const message = getErrorMessage(
                { code, message: body.message, status: res.status },
                'Không thể tải dữ liệu bảng phễu Lead.',
            )
            throw new ApiError(message, code, res.status)
        }
    } catch (err: unknown) {
        if (err instanceof ApiError && err.status !== 404) {
            throw err
        }
    }

    // Fallback: Tự động tải danh sách và phân nhóm theo đúng 6 cột SCRUM-213 nếu backend chưa có endpoint riêng
    const listRes = await getLeads(requestFn, { page: 1, page_size: 100 }).catch(() => null)
    const items = listRes?.items || []
    const counts: Record<string, number> = {}
    for (const k of PIPELINE_STATUS_KEYS) counts[k] = 0
    const columns = PIPELINE_STATUS_KEYS.map((k) => {
        const colLeads = items.filter((l) => l.status === k)
        counts[k] = colLeads.length
        return {
            status: k,
            label: LEAD_STATUS_LABELS[k] || k,
            count: colLeads.length,
            leads: colLeads,
        }
    })
    const pipelineLeads = items.filter((l) => PIPELINE_STATUS_KEYS.includes(l.status))

    return {
        columns,
        leads: pipelineLeads,
        counts,
        total: pipelineLeads.length,
    }
}

/**
 * Lấy lịch sử thay đổi trạng thái của một Lead (SCRUM-213).
 * GET /api/v1/leads/<id>/status-history
 * Yêu cầu quyền: course.manage
 */
export async function getLeadStatusHistory(
    requestFn: RequestFunction,
    leadId: string,
): Promise<LeadStatusHistoryItem[]> {
    const path = `/api/v1/leads/${encodeURIComponent(leadId.trim())}/status-history`
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
            'Không thể tải lịch sử trạng thái của Lead.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data ?? []
}

export type InteractionType = 'call' | 'message' | 'meeting'

export const INTERACTION_TYPES: { type: InteractionType; label: string }[] = [
    { type: 'call', label: 'Gọi' },
    { type: 'message', label: 'Nhắn' },
    { type: 'meeting', label: 'Gặp' },
]

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
    call: 'Gọi',
    message: 'Nhắn',
    meeting: 'Gặp',
}

export function getInteractionTypeLabel(type: string): string {
    return INTERACTION_TYPE_LABELS[type as InteractionType] || type
}

export interface LeadCareLog {
    id: string
    lead_id: string
    interaction_type: InteractionType
    interaction_type_label: string
    content: string
    interaction_at: string
    performed_by_user_id?: string | null
    performed_by_name?: string | null
    created_at?: string | null
}

export interface CreateLeadCareLogInput {
    interaction_type: InteractionType
    content: string
    interaction_at?: string
}

/**
 * Ghi nhận một tương tác chăm sóc Lead (SCRUM-214 - Activity A1).
 * POST /api/v1/leads/<id>/care-logs
 * Yêu cầu quyền: course.manage
 */
export async function createLeadCareLog(
    requestFn: RequestFunction,
    leadId: string,
    payload: CreateLeadCareLogInput,
): Promise<LeadCareLog> {
    const path = `/api/v1/leads/${encodeURIComponent(leadId.trim())}/care-logs`
    const res = await requestFn(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể ghi nhận nhật ký chăm sóc Lead.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Lấy danh sách nhật ký chăm sóc Lead (SCRUM-214 - Activity A1).
 * GET /api/v1/leads/<id>/care-logs
 * Yêu cầu quyền: course.manage
 */
export async function getLeadCareLogs(
    requestFn: RequestFunction,
    leadId: string,
): Promise<LeadCareLog[]> {
    const path = `/api/v1/leads/${encodeURIComponent(leadId.trim())}/care-logs`
    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể tải nhật ký chăm sóc Lead.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data ?? []
}

/**
 * Cập nhật ngày nhắc gọi lại của Lead (SCRUM-214 - Activity A2).
 * PATCH /api/v1/leads/<id>/callback-date
 * Yêu cầu quyền: course.manage
 */
export async function updateLeadCallbackDate(
    requestFn: RequestFunction,
    leadId: string,
    callbackDate: string | null,
): Promise<Lead> {
    const path = `/api/v1/leads/${encodeURIComponent(leadId.trim())}/callback-date`
    const res = await requestFn(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_date: callbackDate }),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể cập nhật ngày nhắc gọi lại.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Kiểm tra Lead có quá hạn gọi lại hay không (SCRUM-214 - Activity A3).
 * So sánh ngày callback_date với ngày hiện tại theo timezone Asia/Ho_Chi_Minh.
 */
export function isLeadCallbackOverdue(callbackDate?: string | null): boolean {
    if (!callbackDate) return false
    const dateStr = callbackDate.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false

    // Lấy ngày hiện tại theo múi giờ Asia/Ho_Chi_Minh (YYYY-MM-DD)
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    })
    const todayVn = formatter.format(now)

    return dateStr < todayVn
}

/**
 * Format ngày nhắc gọi lại theo định dạng dd/mm/yyyy.
 */
export function formatCallbackDateDisplay(callbackDate?: string | null): string {
    if (!callbackDate) return ''
    const dateStr = callbackDate.slice(0, 10)
    const parts = dateStr.split('-')
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
}


