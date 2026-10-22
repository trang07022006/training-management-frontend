/**
 * API client cho Phân hệ Điểm danh buổi học (SCRUM-254).
 */

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'unexcused'

export interface SessionAttendanceInfo {
    schedule_id: string
    class_id: string
    class_code: string
    class_name: string
    subject_name: string
    subject_code?: string
    session_number: number
    topic: string
    learning_date: string
    shift?: string
    start_time: string
    end_time: string
    room_id?: string
    room_name: string
    instructor_id?: string
    instructor_name: string
    instructor_email?: string
    status: string
    attendance_checked: boolean
    is_today: boolean
    is_past: boolean
    is_future: boolean
    can_edit: boolean
    edit_restriction_reason?: string | null
}

export interface AttendanceStudentItem {
    student_id: string
    student_code: string
    full_name: string
    email: string
    phone?: string
    status: AttendanceStatus | null
    status_label: string
    notes?: string | null
    recorded_by?: string | null
    recorded_by_name?: string | null
    updated_at?: string | null
    is_eligible: boolean
    is_historical_record?: boolean
}

export interface AttendancePagination {
    page: number
    limit: number
    total_items: number
    total_pages: number
}

export interface AttendanceSheetStats {
    total_students: number
    present_count: number
    late_count: number
    excused_count: number
    unexcused_count: number
    unmarked_count: number
}

export interface AttendanceSheetResponse {
    session_info: SessionAttendanceInfo
    stats: AttendanceSheetStats
    pagination?: AttendancePagination
    students: AttendanceStudentItem[]
}

export interface AttendanceAuditLogItem {
    id: string
    schedule_id: string
    student_id: string
    student_name?: string
    student_code?: string
    old_status: AttendanceStatus | null
    old_status_label: string
    new_status: AttendanceStatus
    new_status_label: string
    reason?: string | null
    performed_by: string
    performer_name?: string
    performer_email?: string
    created_at: string
}

export interface SaveAttendancePayload {
    attendances?: Array<{
        student_id: string
        status: AttendanceStatus
        notes?: string
    }>
    mark_all_present?: boolean
    reason?: string
}

export type RequestFn = (url: string, init?: RequestInit) => Promise<Response>

/**
 * Mở sổ điểm danh buổi học (SCRUM-254 Lát 1 + Phân trang Backend).
 */
export async function getSessionAttendanceSheet(
    requestFn: RequestFn,
    scheduleId: string,
    options?: { page?: number; limit?: number; q?: string },
): Promise<AttendanceSheetResponse> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', String(options.page))
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.q && options.q.trim()) params.set('q', options.q.trim())
    const queryString = params.toString() ? `?${params.toString()}` : ''

    const res = await requestFn(`/api/v1/schedules/${encodeURIComponent(scheduleId)}/attendance${queryString}`, {
        method: 'GET',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        const err = new Error(body.message || 'Lỗi khi tải thông tin sổ điểm danh.')
        ;(err as unknown as { code: string }).code = body.code
        ;(err as unknown as { status: number }).status = res.status
        throw err
    }
    return body.data as AttendanceSheetResponse
}

/**
 * Lưu kết quả điểm danh buổi học (SCRUM-254 Lát 2).
 */
export async function saveSessionAttendance(
    requestFn: RequestFn,
    scheduleId: string,
    payload: SaveAttendancePayload,
): Promise<{ message: string; data: AttendanceSheetResponse }> {
    const res = await requestFn(`/api/v1/schedules/${encodeURIComponent(scheduleId)}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        const err = new Error(body.message || 'Lỗi khi lưu kết quả điểm danh.')
        ;(err as unknown as { code: string }).code = body.code
        ;(err as unknown as { status: number }).status = res.status
        throw err
    }
    return body
}

/**
 * Lấy lịch sử chỉnh sửa điểm danh của buổi học (SCRUM-254 Lát 3).
 */
export async function getSessionAttendanceHistory(
    requestFn: RequestFn,
    scheduleId: string,
): Promise<AttendanceAuditLogItem[]> {
    const res = await requestFn(`/api/v1/schedules/${encodeURIComponent(scheduleId)}/attendance/history`, {
        method: 'GET',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        const err = new Error(body.message || 'Lỗi khi tải lịch sử điểm danh.')
        ;(err as unknown as { code: string }).code = body.code
        ;(err as unknown as { status: number }).status = res.status
        throw err
    }
    return (body.data || []) as AttendanceAuditLogItem[]
}
