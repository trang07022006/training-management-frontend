/**
 * API client cho Bảng chuyên cần tổng hợp theo lớp học (SCRUM-256).
 */

export type SummaryCellStatus =
    | 'present'
    | 'late'
    | 'excused'
    | 'unexcused'
    | 'not_recorded'
    | 'future'
    | 'not_applicable'
    | 'cancelled'

export interface AttendanceSummaryCell {
    status: SummaryCellStatus
    status_label: string
    symbol: string
    color_token?: string
    notes?: string | null
    is_pre_approved?: boolean
    is_eligible?: boolean
}

export interface SummarySessionColumn {
    schedule_id: string
    session_number: number
    topic: string
    learning_date: string
    shift?: string
    start_time?: string
    end_time?: string
    subject_id?: string
    subject_name?: string
    subject_code?: string
    room_name?: string
    instructor_name?: string
    status: string
    attendance_checked: boolean
    has_ended: boolean
    is_future: boolean
    is_cancelled: boolean
}

export interface StudentAttendanceSummary {
    present_count: number
    late_count: number
    excused_count: number
    unexcused_count: number
    attended_count: number
    valid_sessions_count: number
    total_absent: number
    attendance_rate: number | null
    attendance_rate_formatted: string
    unrecorded_ended_count: number
}

export interface AbsenceAlertInfo {
    is_flagged: boolean
    status: 'active' | 'inactive' | 'none'
    absent_sessions: number
    total_sessions: number
    absence_rate: number
    threshold: number
    insufficient_data?: boolean
    tooltip?: string
    first_triggered_at?: string
    last_evaluated_at?: string
}

export interface StudentSummaryRow {
    student_id: string
    student_code: string
    full_name: string
    email?: string
    phone?: string
    enrollment_status?: string
    lifecycle_status?: string | null
    summary: StudentAttendanceSummary
    session_statuses: Record<string, AttendanceSummaryCell>
    absence_alert?: AbsenceAlertInfo
}

export interface AttendanceSummaryClassInfo {
    id: string
    class_code: string
    program_id: string
    program_code?: string
    program_name?: string
    expected_start_date?: string
    learning_mode?: string
    status?: string
}

export interface AttendanceSummaryPagination {
    page: number
    page_size: number
    total_items: number
    total_pages: number
}

export interface AttendanceSummaryCalculationRules {
    formula: string
    denominator_definition?: string
    total_absent_definition?: string
    eligible_condition?: string
    unrecorded_notice?: string
    future_notice?: string
    absence_alert_rule?: string
    note?: string
}

export interface AttendanceSummaryData {
    class_info: AttendanceSummaryClassInfo
    sessions: SummarySessionColumn[]
    students: StudentSummaryRow[]
    pagination: AttendanceSummaryPagination
    sort: {
        sort_by: string
        sort_order: string
    }
    calculation_rules: AttendanceSummaryCalculationRules
    absence_alert_summary?: {
        flagged_count: number
        threshold: number
        threshold_formatted?: string
    }
}

export type ClassAttendanceSummaryResponse = AttendanceSummaryData


export interface GetAttendanceSummaryParams {
    page?: number
    page_size?: number
    search?: string
    sort_by?: 'student_code' | 'full_name' | 'attendance_rate' | 'total_absent'
    sort_order?: 'asc' | 'desc'
    subject_id?: string
}

export async function getClassAttendanceSummary(
    requestFn: (url: string, init?: RequestInit) => Promise<Response>,
    classId: string,
    params?: GetAttendanceSummaryParams,
): Promise<AttendanceSummaryData> {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.page_size) query.set('page_size', String(params.page_size))
    if (params?.search) query.set('search', params.search.trim())
    if (params?.sort_by) query.set('sort_by', params.sort_by)
    if (params?.sort_order) query.set('sort_order', params.sort_order)
    if (params?.subject_id) query.set('subject_id', params.subject_id)

    const qs = query.toString() ? `?${query.toString()}` : ''
    const res = await requestFn(`/api/v1/classes/${encodeURIComponent(classId)}/attendance-summary${qs}`)
    if (!res.ok) {
        const body = await res.json().catch(() => null)
        const msg = body?.message || `Lỗi khi tải bảng chuyên cần tổng hợp (${res.status})`
        throw new Error(msg)
    }
    const json = await res.json()
    return json.data
}
