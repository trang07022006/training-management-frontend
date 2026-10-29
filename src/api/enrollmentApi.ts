/**
 * Enrollment API Client (SCRUM-218).
 * Quản lý ghi danh học viên vào lớp (đơn lẻ và hàng loạt), chặn lớp đầy và ghi danh trùng.
 */

import { getErrorMessage } from '../utils/errorMessages'
import { ApiError, type RequestFunction } from './userApi'

export { ApiError, type RequestFunction }

export interface EnrollmentItem {
    id?: string
    class_id?: string
    student_id?: string
    status?: string
    enrolled_at?: string
    enrolled_by?: string
    student_code?: string | null
    full_name?: string | null
    email?: string | null
    phone?: string | null
    student_status?: string | null
    enrolled_by_name?: string | null
    enrolled_by_email?: string | null
    class_code?: string | null
    order_index?: number
}

export interface EnrollResult {
    class_id: string
    class_code: string
    enrolled_count: number
    total_enrolled: number
    max_capacity: number
    items: EnrollmentItem[]
}

export interface ClassRosterResponse {
    class: {
        id: string
        class_code: string
        program_id: string
        program_name?: string | null
        max_capacity: number
        status: string
        status_label?: string
        enrolled_count?: number
        expected_start_date?: string | null
    }
    items: EnrollmentItem[]
    total: number
}

/**
 * Ghi danh học viên vào lớp (đơn lẻ hoặc hàng loạt) - SCRUM-218 (218-01, 218-02, 218-03).
 * POST /api/v1/classes/<id>/enrollments
 */
export async function enrollStudents(
    requestFn: RequestFunction,
    classId: string,
    studentIds: string[],
): Promise<EnrollResult> {
    const path = `/api/v1/classes/${encodeURIComponent(classId.trim())}/enrollments`
    const res = await requestFn(path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ student_ids: studentIds }),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            body.message || 'Không thể ghi danh học viên vào lớp.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Lấy danh sách học viên đã ghi danh trong lớp (Class Roster) - SCRUM-218 (218-01, 218-03).
 * GET /api/v1/classes/<id>/enrollments
 */
export async function getClassRoster(
    requestFn: RequestFunction,
    classId: string,
): Promise<ClassRosterResponse> {
    const path = `/api/v1/classes/${encodeURIComponent(classId.trim())}/enrollments`
    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể tải danh sách học viên của lớp.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}
