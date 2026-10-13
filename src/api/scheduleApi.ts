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
        throw new ApiError(message, code, res.status)
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
        throw new ApiError(message, code, res.status, undefined, body.data)
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

export async function listHolidays(requestFn: RequestFunction): Promise<HolidayItem[]> {
    const path = '/api/v1/holidays'
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
    return body.data
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
    room_id?: string
    instructor_id?: string
    topic?: string
    allow_conflict_override?: boolean
}

export interface UpdateScheduleResponse {
    schedule: ClassScheduleItem
    notifications_sent: number
    overridden_conflicts_count?: number
    conflicts?: ScheduleConflictItem[]
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

