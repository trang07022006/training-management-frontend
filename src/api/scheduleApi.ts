/**
 * Schedule & Holiday API Client - SCRUM-224.
 * Tích hợp API Sinh thời khóa biểu tự động và Quản lý ngày nghỉ lễ.
 */

import { getErrorMessage } from '../utils/errorMessages'
import { ApiError, type RequestFunction } from './userApi'

export { ApiError, type RequestFunction }

export interface ClassScheduleItem {
    id?: string
    class_id: string
    class_subject_id?: string | null
    subject_id?: string | null
    subject_session_id?: string | null
    session_number: number
    topic: string
    learning_date: string
    day_of_week?: string
    shift?: string | null
    start_time: string
    end_time: string
    room_id?: string | null
    classroom_id?: string | null
    room_code?: string | null
    room_name?: string | null
    room_type?: string | null
    online_link?: string | null
    is_online?: boolean
    is_legacy_room?: boolean
    legacy_room_raw?: string | null
    instructor_id?: string | null
    instructor_name?: string | null
    status?: string
    cancellation_reason?: string | null
    attendance_checked?: boolean
}

export interface SkippedHolidayItem {
    date: string
    holiday_name: string
    day_of_week?: string
    reason?: string
}

export interface ScheduleConflictItem {
    conflict_type: 'instructor' | 'room'
    session_number: number
    learning_date: string
    start_time: string
    end_time: string
    instructor_id?: string | null
    instructor_name?: string | null
    room_id?: string | null
    conflicting_schedule_id?: string
    conflicting_class_id?: string
    conflicting_class_code?: string
    conflicting_session_number?: number
    conflicting_start_time?: string
    conflicting_end_time?: string
    message: string
}

export interface SchedulePreviewResponse {
    class_id: string
    class_code: string
    total_requested: number
    total_generated: number
    start_date: string | null
    end_date: string | null
    schedules: ClassScheduleItem[]
    skipped_holidays: SkippedHolidayItem[]
    conflicts?: ScheduleConflictItem[]
    has_conflicts?: boolean
}

export interface ScheduleGenerateResponse {
    class_id: string
    class_code: string
    total_saved: number
    start_date: string | null
    end_date: string | null
    schedules: ClassScheduleItem[]
    skipped_holidays: SkippedHolidayItem[]
    conflicts?: ScheduleConflictItem[]
    overridden_conflicts_count?: number
}

export interface ScheduleGeneratePayload {
    days_of_week: number[] | string[]
    shift?: string
    start_time?: string
    end_time?: string
    start_date: string
    total_sessions: number
    subject_id?: string
    class_subject_id?: string
    room_id?: string
    instructor_id?: string
    overwrite?: boolean
    allow_conflict_override?: boolean
}

export interface HolidayItem {
    id: string
    holiday_date: string
    name: string
    description?: string | null
    created_at?: string
    updated_at?: string
}

export interface CreateHolidayPayload {
    holiday_date: string
    name: string
    description?: string
}

export async function previewClassSchedule(
    requestFn: RequestFunction,
    classId: string,
    payload: ScheduleGeneratePayload
): Promise<SchedulePreviewResponse> {
    const path = `/api/v1/classes/${encodeURIComponent(classId.trim())}/schedules/preview`
    const res = await requestFn(path, {
        method: 'POST',
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
            body.message || 'Không thể xem trước thời khóa biểu.'
        )
        const details = {
            ...(typeof body.data === 'object' && body.data !== null ? body.data : {}),
            field: body.field,
            error_ref: body.error_ref,
        }
        throw new ApiError(message, code, res.status, undefined, details)
    }
    return body.data
}

export async function generateClassSchedule(
    requestFn: RequestFunction,
    classId: string,
    payload: ScheduleGeneratePayload
): Promise<ScheduleGenerateResponse> {
    const path = `/api/v1/classes/${encodeURIComponent(classId.trim())}/schedules/generate`
    const res = await requestFn(path, {
        method: 'POST',
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
            body.message || 'Không thể lưu thời khóa biểu lớp học.'
        )
        const details = {
            ...(typeof body.data === 'object' && body.data !== null ? body.data : {}),
            field: body.field,
            error_ref: body.error_ref,
            conflicts: body.data?.conflicts,
        }
        throw new ApiError(message, code, res.status, undefined, details)
    }
    return body.data
}

export async function getClassSchedules(
    requestFn: RequestFunction,
    classId: string
): Promise<{ class_id: string; class_code: string; total: number; schedules: ClassScheduleItem[] }> {
    const path = `/api/v1/classes/${encodeURIComponent(classId.trim())}/schedules`
    const res = await requestFn(path, {
        method: 'GET',
    })

    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            body.message || 'Không thể tải danh sách thời khóa biểu.'
        )
        throw new ApiError(message, code, res.status)
    }
    return body.data
}

export async function deleteClassSchedules(
    requestFn: RequestFunction,
    classId: string
): Promise<{ class_id: string; deleted_count: number }> {
    const path = `/api/v1/classes/${encodeURIComponent(classId.trim())}/schedules`
    const res = await requestFn(path, {
        method: 'DELETE',
    })

    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            body.message || 'Không thể xóa thời khóa biểu.'
        )
        throw new ApiError(message, code, res.status)
    }
    return body.data
}

export async function listHolidays(
    requestFn: RequestFunction,
    params?: { from_date?: string; to_date?: string; year?: number }
): Promise<HolidayItem[]> {
    let path = '/api/v1/holidays'
    if (params) {
        const q = new URLSearchParams()
        if (params.from_date) q.set('from_date', params.from_date)
        if (params.to_date) q.set('to_date', params.to_date)
        if (params.year) q.set('year', String(params.year))
        const qs = q.toString()
        if (qs) path += `?${qs}`
    }
    const res = await requestFn(path, {
        method: 'GET',
    })

    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            body.message || 'Không thể tải danh sách ngày nghỉ lễ.'
        )
        throw new ApiError(message, code, res.status)
    }

    if (body.data && Array.isArray(body.data.items)) {
        return body.data.items
    }
    if (Array.isArray(body.data)) {
        return body.data
    }
    return []
}

export async function createHoliday(
    requestFn: RequestFunction,
    payload: CreateHolidayPayload
): Promise<HolidayItem> {
    const path = '/api/v1/holidays'
    const res = await requestFn(path, {
        method: 'POST',
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
            body.message || 'Không thể khai báo ngày nghỉ lễ.'
        )
        throw new ApiError(message, code, res.status)
    }
    return body.data
}

export async function deleteHoliday(
    requestFn: RequestFunction,
    holidayId: string
): Promise<{ deleted: boolean }> {
    const path = `/api/v1/holidays/${encodeURIComponent(holidayId.trim())}`
    const res = await requestFn(path, {
        method: 'DELETE',
    })

    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            body.message || 'Không thể xóa ngày nghỉ lễ.'
        )
        throw new ApiError(message, code, res.status)
    }
    return body.data
}

export interface UpdateSchedulePayload {
    learning_date?: string
    start_time?: string
    end_time?: string
    shift?: string
    room_id?: string | null
    instructor_id?: string | null
    topic?: string
    allow_conflict_override?: boolean
}

export interface UpdateScheduleResponse {
    schedule: ClassScheduleItem
    notifications_sent: number
    overridden_conflicts_count?: number
    conflicts?: ScheduleConflictItem[]
    capacity_warning?: string | null
}

export interface CancelSchedulePayload {
    reason: string
}

export interface CancelScheduleResponse {
    schedule: ClassScheduleItem
    notifications_sent: number
    cancellation_reason: string
}

/**
 * Sửa hoặc dời một buổi học đơn lẻ (SCRUM-226 AC 1, AC 3, AC 4).
 */
export async function updateClassScheduleItem(
    requestFn: RequestFunction,
    classId: string,
    scheduleId: string,
    payload: UpdateSchedulePayload
): Promise<UpdateScheduleResponse> {
    const path = `/api/v1/classes/${encodeURIComponent(classId.trim())}/schedules/${encodeURIComponent(scheduleId.trim())}`
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
            body.message || 'Không thể cập nhật buổi học.'
        )
        throw new ApiError(message, code, res.status, undefined, body.data)
    }
    return body.data
}

/**
 * Hủy một buổi học đơn lẻ với lý do bắt buộc (SCRUM-226 AC 2, AC 3, AC 4).
 */
export async function cancelClassScheduleItem(
    requestFn: RequestFunction,
    classId: string,
    scheduleId: string,
    payload: CancelSchedulePayload
): Promise<CancelScheduleResponse> {
    const path = `/api/v1/classes/${encodeURIComponent(classId.trim())}/schedules/${encodeURIComponent(scheduleId.trim())}/cancel`
    const res = await requestFn(path, {
        method: 'POST',
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
            body.message || 'Không thể hủy buổi học.'
        )
        throw new ApiError(message, code, res.status, undefined, body.data)
    }
    return body.data
}

// SCRUM-227: Lịch tuần / tháng (Calendar View)

export interface CalendarScheduleItem {
    id: string
    class_id: string
    class_code: string
    class_subject_id?: string | null
    subject_id?: string | null
    subject_name?: string
    subject_code?: string
    subject_session_id?: string | null
    session_number: number
    topic: string
    learning_date: string
    day_of_week?: string
    shift?: string | null
    start_time: string
    end_time: string
    room_id?: string | null
    room_name?: string | null
    room_type?: string | null
    online_link?: string | null
    is_online?: boolean
    instructor_id?: string | null
    instructor_name?: string | null
    instructor_email?: string | null
    status: string
    cancellation_reason?: string | null
    attendance_checked: boolean
}

export interface CalendarScheduleParams {
    date_from?: string
    date_to?: string
    class_id?: string
    instructor_id?: string
    room_id?: string
    view_mode?: 'week' | 'month'
}

export interface CalendarScheduleResponse {
    total: number
    date_from?: string | null
    date_to?: string | null
    view_mode: 'week' | 'month'
    filters: {
        class_id?: string | null
        instructor_id?: string | null
        room_id?: string | null
    }
    schedules: CalendarScheduleItem[]
}

/**
 * Lấy danh sách thời khóa biểu dạng lịch tuần/tháng kèm bộ lọc (SCRUM-227 AC 1, 2, 4).
 */
export async function getCalendarSchedules(
    requestFn: RequestFunction,
    params: CalendarScheduleParams = {}
): Promise<CalendarScheduleResponse> {
    const query = new URLSearchParams()
    if (params.date_from) query.set('date_from', params.date_from)
    if (params.date_to) query.set('date_to', params.date_to)
    if (params.class_id) query.set('class_id', params.class_id)
    if (params.instructor_id) query.set('instructor_id', params.instructor_id)
    if (params.room_id) query.set('room_id', params.room_id)
    if (params.view_mode) query.set('view_mode', params.view_mode)

    const path = `/api/v1/schedules/calendar?${query.toString()}`
    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            body.message || 'Không thể tải lịch thời khóa biểu.'
        )
        throw new ApiError(message, code, res.status)
    }
    return body.data
}

/**
 * Lấy chi tiết một buổi học theo ID khi bấm vào buổi trên lịch (SCRUM-227 AC 3).
 */
export async function getScheduleDetail(
    requestFn: RequestFunction,
    scheduleId: string
): Promise<CalendarScheduleItem> {
    const path = `/api/v1/schedules/${encodeURIComponent(scheduleId.trim())}`
    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            body.message || 'Không thể tải chi tiết buổi học.'
        )
        throw new ApiError(message, code, res.status)
    }
    return body.data
}

// SCRUM-228: Lịch học cá nhân của học viên (Student Personal Schedule)

export interface StudentSessionItem {
    id: string
    class_id: string
    class_code: string
    class_subject_id?: string | null
    subject_id?: string | null
    subject_name?: string
    subject_code?: string
    subject_session_id?: string | null
    session_number: number
    topic: string
    learning_date: string
    day_of_week?: string
    shift?: string | null
    start_time: string
    end_time: string
    room_id?: string | null
    is_online: boolean
    online_url?: string | null
    room_name?: string | null
    instructor_id?: string | null
    instructor_name?: string | null
    instructor_email?: string | null
    status: string
    cancellation_reason?: string | null
    attendance_checked: boolean
    teaching_role?: string
    teaching_role_label?: string
}

export interface StudentPersonalScheduleResponse {
    user_type?: 'trainee' | 'trainer'
    active_context?: 'learning' | 'teaching'
    available_contexts?: string[]
    assignment_status?: 'not_assigned' | 'assigned_no_schedule' | 'has_schedule'
    profile_linked?: boolean
    student: {
        id: string
        student_code: string
        full_name: string
        email: string
        phone?: string | null
        program_name?: string | null
    } | null
    instructor?: {
        id: string
        full_name: string
        email: string
    } | null
    assigned_classes?: Array<{
        class_id: string
        class_code: string
        learning_mode?: string
        class_status?: string
        program_name?: string
    }>
    enrolled_classes: Array<{
        class_id: string
        class_code: string
        enrollment_status?: string
        learning_mode?: string
        program_name?: string
    }>
    next_session: StudentSessionItem | null
    week_sessions: StudentSessionItem[]
    total_week_sessions: number
    date_from: string
    date_to: string
    period_title: string
}

/**
 * Lấy lịch học cá nhân của học viên hoặc lịch giảng dạy của giảng viên (SCRUM-228).
 * Hỗ trợ tài khoản nhiều vai trò (trainer + trainee) thông qua param context ('learning' | 'teaching').
 */
export async function getMyPersonalSchedule(
    requestFn: RequestFunction,
    params: { date_from?: string; date_to?: string; context?: 'learning' | 'teaching' } = {}
): Promise<StudentPersonalScheduleResponse> {
    const query = new URLSearchParams()
    if (params.date_from) query.set('date_from', params.date_from)
    if (params.date_to) query.set('date_to', params.date_to)
    if (params.context) query.set('context', params.context)
    const qs = query.toString()
    const path = `/api/v1/students/my-schedule${qs ? `?${qs}` : ''}`
    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            body.message || 'Không thể tải lịch cá nhân.'
        )
        throw new ApiError(message, code, res.status)
    }
    return body.data
}

export interface ScheduleNotificationItem {
    id: string
    schedule_id: string
    class_id: string
    recipient_type: 'student' | 'instructor'
    recipient_id: string
    recipient_name: string
    recipient_email?: string | null
    change_type: 'rescheduled' | 'cancelled' | 'updated'
    title: string
    message: string
    created_at: string
}

/**
 * Lấy danh sách thông báo thay đổi thời khóa biểu của người dùng hiện tại (SCRUM-226).
 */
export async function getMyScheduleNotifications(
    requestFn: RequestFunction
): Promise<ScheduleNotificationItem[]> {
    const path = '/api/v1/schedules/notifications/my'
    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            body.message || 'Không thể tải thông báo thời khóa biểu.'
        )
        throw new ApiError(message, code, res.status)
    }
    return body.data || []
}
