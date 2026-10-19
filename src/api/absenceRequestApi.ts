/**
 * API client cho Phân hệ Đơn xin phép vắng (SCRUM-255).
 */

export type AbsenceStatus = 'pending' | 'approved' | 'rejected'

export interface AbsenceRequestAttachment {
    id: string
    file_name: string
    file_size: number
    mime_type: string
    created_at?: string
}

export interface AbsenceRequestItem {
    id: string
    schedule_id: string
    student_id: string
    reason: string
    status: AbsenceStatus
    status_label: string
    reviewed_by?: string | null
    reviewed_at?: string | null
    rejection_reason?: string | null
    created_at: string
    updated_at?: string
    session_number?: number
    topic?: string
    learning_date?: string
    learning_date_str?: string
    shift?: string
    start_time?: string
    start_time_str?: string
    end_time?: string
    end_time_str?: string
    class_id?: string
    class_code?: string
    subject_name?: string
    subject_code?: string
    room_name?: string
    student_code?: string
    student_name?: string
    student_email?: string
    instructor_name?: string
    reviewer_name?: string
    reviewer_email?: string
    attachment_count?: number
    attachments?: AbsenceRequestAttachment[]
}

export interface EligibleSessionItem {
    schedule_id: string
    class_id: string
    class_code: string
    session_number: number
    topic: string
    subject_name: string
    subject_code?: string
    learning_date: string
    learning_date_str?: string
    shift?: string
    start_time: string
    start_time_str?: string
    end_time: string
    end_time_str?: string
    room_name?: string
    instructor_name?: string
    has_pending_request: boolean
    latest_request_status?: AbsenceStatus | null
}

export interface AbsencePagination {
    page: number
    limit: number
    total_items: number
    total_pages: number
}

export interface MyAbsenceRequestsResponse {
    items: AbsenceRequestItem[]
    pagination: AbsencePagination
}

export interface SubmitAbsenceRequestPayload {
    schedule_id: string
    reason: string
}

export type RequestFn = (url: string, init?: RequestInit) => Promise<Response>

/**
 * Lấy danh sách các buổi học hợp lệ để học viên xin phép vắng (SCRUM-255 Lát 1).
 */
export async function getEligibleSessions(requestFn: RequestFn): Promise<EligibleSessionItem[]> {
    const res = await requestFn('/api/v1/absence-requests/eligible-sessions', {
        method: 'GET',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        const err = new Error(body.message || 'Lỗi khi tải danh sách buổi học hợp lệ.')
        ;(err as unknown as { code: string }).code = body.code
        ;(err as unknown as { status: number }).status = res.status
        throw err
    }
    return (body.data || []) as EligibleSessionItem[]
}

/**
 * Gửi đơn xin phép vắng mới (SCRUM-255 Lát 1).
 */
export async function submitAbsenceRequest(
    requestFn: RequestFn,
    payload: SubmitAbsenceRequestPayload,
): Promise<AbsenceRequestItem> {
    const res = await requestFn('/api/v1/absence-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        const err = new Error(body.message || 'Lỗi khi gửi đơn xin phép vắng.')
        ;(err as unknown as { code: string }).code = body.code
        ;(err as unknown as { status: number }).status = res.status
        throw err
    }
    return body.data as AbsenceRequestItem
}

/**
 * Lấy danh sách đơn xin phép vắng của chính mình có phân trang và bộ lọc (SCRUM-255 Lát 1).
 */
export async function getMyAbsenceRequests(
    requestFn: RequestFn,
    options?: { page?: number; limit?: number; status?: string; q?: string },
): Promise<MyAbsenceRequestsResponse> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', String(options.page))
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.status && options.status !== 'all') params.set('status', options.status)
    if (options?.q && options.q.trim()) params.set('q', options.q.trim())
    const queryString = params.toString() ? `?${params.toString()}` : ''

    const res = await requestFn(`/api/v1/absence-requests/my${queryString}`, {
        method: 'GET',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        const err = new Error(body.message || 'Lỗi khi tải danh sách đơn xin phép vắng.')
        ;(err as unknown as { code: string }).code = body.code
        ;(err as unknown as { status: number }).status = res.status
        throw err
    }
    return body.data as MyAbsenceRequestsResponse
}

/**
 * Xem chi tiết đơn xin phép vắng (SCRUM-255).
 */
export async function getAbsenceRequestDetail(
    requestFn: RequestFn,
    requestId: string,
): Promise<AbsenceRequestItem> {
    const res = await requestFn(`/api/v1/absence-requests/${encodeURIComponent(requestId)}`, {
        method: 'GET',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        const err = new Error(body.message || 'Lỗi khi tải chi tiết đơn xin phép vắng.')
        ;(err as unknown as { code: string }).code = body.code
        ;(err as unknown as { status: number }).status = res.status
        throw err
    }
    return body.data as AbsenceRequestItem
}
