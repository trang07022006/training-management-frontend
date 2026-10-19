/**
 * Student Lifecycle API Client (SCRUM-252).
 * Xử lý bảo lưu, chuyển lớp, thôi học và truy vấn danh sách đủ điều kiện điểm danh, lịch sử học tập.
 */

import { getErrorMessage } from '../utils/errorMessages'
import { ApiError, type RequestFunction } from './userApi'

export { ApiError, type RequestFunction }

export interface ReserveStudentPayload {
    class_id: string
    effective_date: string
    reason: string
}

export interface TransferStudentPayload {
    source_class_id: string
    target_class_id: string
    effective_date: string
    reason: string
}

export interface DropStudentPayload {
    scope: 'single' | 'all'
    class_id?: string
    effective_date: string
    reason: string
}

export interface StudentLifecycleHistoryItem {
    id: string
    student_id: string
    enrollment_id?: string | null
    action_type: 'reserve' | 'transfer' | 'drop'
    source_class_id?: string | null
    target_class_id?: string | null
    source_class_code?: string | null
    target_class_code?: string | null
    effective_date: string
    reason: string
    status: 'applied' | 'pending'
    performed_by?: string | null
    performer_name?: string | null
    performer_email?: string | null
    student_name?: string | null
    student_code?: string | null
    created_at: string
    updated_at?: string
}

export interface EligibleAttendanceStudent {
    student_id: string
    student_code: string
    full_name: string
    email: string | null
    phone: string | null
    enrolled_at: string
    lifecycle_status: string | null
}

/**
 * Định dạng nhãn hiển thị cho lớp học, tránh lặp mã lớp và tên lớp khi chúng giống nhau (SCRUM-252).
 * Ví dụ: "TR_C5537 - TR_C5537" -> "TR_C5537"
 * "CNTT-K21A - Lập trình Web" -> "CNTT-K21A - Lập trình Web"
 */
export function formatClassOptionLabel(cls?: {
    class_code?: string | null
    name?: string | null
    class_name?: string | null
} | null): string {
    if (!cls) return '—'
    const code = (cls.class_code || '').trim()
    const name = (cls.name || cls.class_name || '').trim()
    if (!name || name.toLowerCase() === code.toLowerCase()) {
        return code || 'Chưa có mã lớp'
    }
    return `${code} - ${name}`
}

/**
 * Thực hiện bảo lưu học viên theo lớp và ngày hiệu lực (SCRUM-252.1).
 * POST /api/v1/students/<student_id>/reserve
 */
export async function reserveStudent(
    requestFn: RequestFunction,
    studentId: string,
    payload: ReserveStudentPayload,
): Promise<{ message: string; data: any }> {
    const path = `/api/v1/students/${encodeURIComponent(studentId.trim())}/reserve`

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
            'Không thể thực hiện bảo lưu học viên.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body
}

/**
 * Thực hiện chuyển lớp học viên và giữ nguyên lịch sử (SCRUM-252.2).
 * POST /api/v1/students/<student_id>/transfer
 */
export async function transferStudent(
    requestFn: RequestFunction,
    studentId: string,
    payload: TransferStudentPayload,
): Promise<{ message: string; data: any }> {
    const path = `/api/v1/students/${encodeURIComponent(studentId.trim())}/transfer`

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
            'Không thể thực hiện chuyển lớp học viên.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body
}

/**
 * Thực hiện thôi học cho học viên theo ngày hiệu lực (SCRUM-252.3).
 * POST /api/v1/students/<student_id>/drop
 */
export async function dropStudent(
    requestFn: RequestFunction,
    studentId: string,
    payload: DropStudentPayload,
): Promise<{ message: string; data: any }> {
    const path = `/api/v1/students/${encodeURIComponent(studentId.trim())}/drop`

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
            'Không thể thực hiện thôi học học viên.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body
}

/**
 * Lấy lịch sử thay đổi vòng đời học viên (bảo lưu, chuyển lớp, thôi học) (SCRUM-252.4).
 * GET /api/v1/students/<student_id>/lifecycle-history
 */
export async function getStudentLifecycleHistory(
    requestFn: RequestFunction,
    studentId: string,
): Promise<StudentLifecycleHistoryItem[]> {
    const path = `/api/v1/students/${encodeURIComponent(studentId.trim())}/lifecycle-history`

    const res = await requestFn(path, {
        method: 'GET',
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể tải lịch sử học tập của học viên.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data?.items || (Array.isArray(body.data) ? body.data : [])
}

/**
 * Lấy danh sách học viên đủ điều kiện điểm danh cho buổi học tại ngày cụ thể (SCRUM-252).
 * GET /api/v1/classes/<class_id>/eligible-students?session_date=YYYY-MM-DD
 */
export async function getEligibleAttendanceStudents(
    requestFn: RequestFunction,
    classId: string,
    sessionDate: string,
): Promise<EligibleAttendanceStudent[]> {
    const path = `/api/v1/classes/${encodeURIComponent(classId.trim())}/eligible-students?session_date=${encodeURIComponent(sessionDate.trim())}`

    const res = await requestFn(path, {
        method: 'GET',
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể tải danh sách học viên đủ điều kiện điểm danh.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data?.students || []
}

/**
 * Phân tích lỗi từ backend hoặc nghiệp vụ xem có liên quan trực tiếp đến một trường cụ thể không (SCRUM-252).
 */
export function parseBackendErrorToField(
    errorMessage: string,
    availableFields: string[],
): { field?: string; message: string } {
    const lower = (errorMessage || '').toLowerCase()
    if (availableFields.includes('reason') && (lower.includes('lý do') || lower.includes('reason'))) {
        return { field: 'reason', message: errorMessage }
    }
    if (availableFields.includes('effectiveDate') && (lower.includes('ngày') || lower.includes('date') || lower.includes('hiệu lực'))) {
        return { field: 'effectiveDate', message: errorMessage }
    }
    if (availableFields.includes('targetClassId') && (lower.includes('lớp đích') || lower.includes('target') || lower.includes('sĩ số') || lower.includes('hết chỗ') || lower.includes('đã đầy') || lower.includes('trùng'))) {
        return { field: 'targetClassId', message: errorMessage }
    }
    if (availableFields.includes('sourceClassId') && (lower.includes('lớp nguồn') || lower.includes('source'))) {
        return { field: 'sourceClassId', message: errorMessage }
    }
    if (availableFields.includes('selectedClassId') && (lower.includes('lớp') || lower.includes('class'))) {
        return { field: 'selectedClassId', message: errorMessage }
    }
    return { message: errorMessage }
}

/**
 * Cuộn và focus vào trường bị lỗi đầu tiên, đảm bảo căn giữa viewport để không bị header cố định che (SCRUM-252).
 */
export function scrollToAndFocusField(elementId: string) {
    if (typeof document === 'undefined') return
    const el = document.getElementById(elementId)
    if (el) {
        if (typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        try {
            el.focus({ preventScroll: true })
        } catch {
            el.focus()
        }
    }
}

