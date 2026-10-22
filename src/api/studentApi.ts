/**
 * Student API Client (SCRUM-215 & SCRUM-216).
 * Quản lý học viên, chuyển đổi từ Lead sang hồ sơ học viên, và quản lý hồ sơ học viên.
 */

import { getErrorMessage } from '../utils/errorMessages'
import { ApiError, type RequestFunction } from './userApi'
import type { Lead } from './leadApi'

export { ApiError, type RequestFunction }

export interface Student {
    id: string
    student_code: string
    full_name: string
    phone: string
    email: string | null
    program_id: string | null
    user_id: string | null
    lead_id: string | null
    status: string
    created_at: string | null
    updated_at: string | null
    program_code?: string | null
    program_name?: string | null
    entry_level?: string | null
    notes?: string | null
}

export interface StudentClassItem {
    id?: string
    class_id?: string
    class_code: string
    name?: string
    class_name?: string
    start_date?: string | null
    expected_start_date?: string | null
    status?: string
    class_status?: string
    enrollment_status?: string
    enrolled_at?: string | null
    program_code?: string | null
    program_name?: string | null
}

export interface StudentDetail extends Student {
    entry_level: string | null
    notes: string | null
    current_class: StudentClassItem | null
    current_classes?: StudentClassItem[]
    class_history: StudentClassItem[]
}

export interface ConvertLeadResult {
    student: Student
    lead: Lead
    user_id?: string | null
    account_created?: boolean
    email_sent?: boolean
}

export interface ListStudentsParams {
    search?: string
    page?: number
    page_size?: number
}

export interface ListStudentsResponse {
    items: StudentDetail[]
    total: number
    page: number
    page_size: number
    total_pages: number
}

export interface UpdateStudentPayload {
    full_name?: string
    phone?: string
    email?: string | null
    entry_level?: string | null
    notes?: string | null
}

/**
 * Chuyển đổi một Lead đã chốt sang hồ sơ học viên.
 * POST /api/v1/leads/<id>/convert-to-student
 */
export async function convertLeadToStudent(
    requestFn: RequestFunction,
    leadId: string,
): Promise<ConvertLeadResult> {
    const path = `/api/v1/leads/${encodeURIComponent(leadId.trim())}/convert-to-student`

    const res = await requestFn(path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể chuyển đổi khách hàng thành học viên.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Lấy danh sách học viên và tìm kiếm (SCRUM-216).
 * GET /api/v1/students?search=...&page=...&page_size=...
 */
export async function listStudents(
    requestFn: RequestFunction,
    params: ListStudentsParams = {},
): Promise<ListStudentsResponse> {
    const query = new URLSearchParams()
    if (params.search?.trim()) {
        query.set('search', params.search.trim())
    }
    if (params.page) {
        query.set('page', String(params.page))
    }
    if (params.page_size) {
        query.set('page_size', String(params.page_size))
    }

    const qs = query.toString()
    const path = `/api/v1/students${qs ? `?${qs}` : ''}`

    const res = await requestFn(path, {
        method: 'GET',
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể tải danh sách học viên.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Lấy chi tiết hồ sơ học viên (SCRUM-216).
 * GET /api/v1/students/<id>
 */
export async function getStudentDetail(
    requestFn: RequestFunction,
    studentId: string,
): Promise<StudentDetail> {
    const path = `/api/v1/students/${encodeURIComponent(studentId.trim())}`

    const res = await requestFn(path, {
        method: 'GET',
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể tải thông tin hồ sơ học viên.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Cập nhật thông tin hồ sơ học viên (SCRUM-216).
 * PUT /api/v1/students/<id>
 */
export async function updateStudentProfile(
    requestFn: RequestFunction,
    studentId: string,
    payload: UpdateStudentPayload,
): Promise<StudentDetail> {
    const path = `/api/v1/students/${encodeURIComponent(studentId.trim())}`

    const res = await requestFn(path, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể cập nhật hồ sơ học viên.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

export interface StudentAbsenceAlertItem {
    alert_id: string
    class_id: string
    class_code: string
    program_id: string
    program_code?: string
    program_name?: string
    absent_sessions: number
    total_sessions: number
    absence_rate: number
    absence_rate_formatted: string
    threshold: number
    threshold_formatted: string
    first_triggered_at?: string
    last_evaluated_at?: string
    is_flagged: boolean
    tooltip: string
}

/**
 * Lấy danh sách cảnh báo vắng vượt ngưỡng đang hoạt động của học viên (SCRUM-257 - AC2).
 * GET /api/v1/students/<id>/absence-alerts
 */
export async function getStudentAbsenceAlerts(
    requestFn: RequestFunction,
    studentId: string,
): Promise<StudentAbsenceAlertItem[]> {
    const path = `/api/v1/students/${encodeURIComponent(studentId.trim())}/absence-alerts`
    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        return []
    }
    return body.data || []
}
