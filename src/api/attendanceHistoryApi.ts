/**
 * Attendance History API Client - SCRUM-258
 * Học viên xem lịch sử điểm danh cá nhân và cảnh báo ngưỡng vắng.
 */

import { getErrorMessage } from '../utils/errorMessages'
import { ApiError, type RequestFunction } from './userApi'

export { ApiError, type RequestFunction }

export interface EnrolledClassOption {
    class_id: string
    class_code: string
    learning_mode?: string
    class_status?: string
    enrollment_status?: string
    program_id?: string
    program_name?: string
    program_code?: string
    absence_alert_threshold?: number
}

export interface StudentAttendanceSessionItem {
    schedule_id: string
    class_id: string
    session_number: number
    topic?: string | null
    learning_date: string
    shift?: string | null
    start_time?: string | null
    end_time?: string | null
    subject_id?: string | null
    subject_name?: string | null
    subject_code?: string | null
    room_name?: string | null
    instructor_name?: string | null
    status: 'present' | 'late' | 'excused' | 'unexcused' | 'not_recorded' | 'future' | 'cancelled' | 'not_applicable'
    status_label: string
    symbol: string
    color_token: string
    notes?: string | null
    is_pre_approved?: boolean
    is_eligible?: boolean
    is_cancelled?: boolean
    has_ended?: boolean
    is_future?: boolean
}

export interface AttendanceHistorySummary {
    scope: 'class_wide'
    present_count: number
    late_count: number
    excused_count: number
    unexcused_count: number
    unrecorded_ended_count: number
    future_count: number
    cancelled_count: number
    valid_sessions_count: number
    attendance_rate: number | null
    attendance_rate_formatted: string
}

export interface AbsenceWarningInfo {
    total_sessions_N: number
    absent_sessions_A: number
    threshold_T: number
    max_allowed_absences_K: number | null
    remaining_absences_R: number | null
    warning_status: 'normal' | 'approaching' | 'at_limit' | 'exceeded' | 'insufficient_data'
    warning_level: 'success' | 'warning' | 'danger' | 'info'
    warning_message: string
    is_flagged: boolean
    insufficient_data: boolean
}

export interface StudentAttendanceHistoryData {
    student: {
        id: string
        student_code?: string
        full_name?: string
        email?: string
        program_name?: string
    }
    enrolled_classes: EnrolledClassOption[]
    selected_class_id?: string | null
    class_info?: {
        id: string
        class_code?: string
        program_id?: string
        program_name?: string
        program_code?: string
        status?: string
        threshold?: number
    } | null
    summary?: AttendanceHistorySummary | null
    absence_warning?: AbsenceWarningInfo | null
    sessions: StudentAttendanceSessionItem[]
    pagination: {
        page: number
        page_size: number
        total_items: number
        total_pages: number
    }
    message?: string
}

export interface GetAttendanceHistoryParams {
    class_id?: string
    status?: string
    date_from?: string
    date_to?: string
    page?: number
    page_size?: number
    sort_order?: 'asc' | 'desc'
}

export async function getMyAttendanceHistory(
    requestFn: RequestFunction,
    params: GetAttendanceHistoryParams = {}
): Promise<StudentAttendanceHistoryData> {
    const searchParams = new URLSearchParams()
    if (params.class_id) searchParams.set('class_id', params.class_id)
    if (params.status && params.status !== 'all') searchParams.set('status', params.status)
    if (params.date_from) searchParams.set('date_from', params.date_from)
    if (params.date_to) searchParams.set('date_to', params.date_to)
    if (params.page) searchParams.set('page', String(params.page))
    if (params.page_size) searchParams.set('page_size', String(params.page_size))
    if (params.sort_order) searchParams.set('sort_order', params.sort_order)

    const qs = searchParams.toString()
    const url = `/api/v1/me/attendance-history${qs ? `?${qs}` : ''}`
    const res = await requestFn(url, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            body.message || 'Không thể tải lịch sử điểm danh.'
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}
