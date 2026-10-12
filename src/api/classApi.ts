/**
 * Class API Client (SCRUM-217).
 * Quản lý mở lớp học từ chương trình đào tạo, vòng đời lớp và danh sách môn học đã sao chép.
 */

import { getErrorMessage } from '../utils/errorMessages'
import { ApiError, type RequestFunction } from './userApi'

export { ApiError, type RequestFunction }

export type ClassStatus = 'preparing' | 'in_progress' | 'completed' | 'cancelled'

export const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
    preparing: 'Chuẩn bị',
    in_progress: 'Đang học',
    completed: 'Kết thúc',
    cancelled: 'Huỷ',
}

export interface ClassSubjectItem {
    id: string
    class_id: string
    subject_id: string
    subject_code?: string | null
    subject_name?: string | null
    credits?: number | null
    semester?: number | null
    is_mandatory: boolean
    order_index: number
    created_at: string | null
    updated_at: string | null
}

export interface TrainingClass {
    id: string
    class_code: string
    program_id: string
    program_code?: string | null
    program_name?: string | null
    expected_start_date: string | null
    max_capacity: number
    learning_mode: string
    status: ClassStatus
    status_label: string
    enrolled_count: number
    subjects?: ClassSubjectItem[]
    copied_subjects_count?: number
    created_at: string | null
    updated_at: string | null
}

export interface CreateClassInput {
    class_code: string
    program_id: string
    expected_start_date?: string | null
    max_capacity?: number
    learning_mode?: string
    status?: string
}

export interface ListClassesParams {
    program_id?: string
    status?: string
    search?: string
    page?: number
    page_size?: number
}

export interface ListClassesResponse {
    items: TrainingClass[]
    total: number
    page: number
    page_size: number
    total_pages: number
}

/**
 * Khai báo và mở lớp mới từ chương trình đào tạo (SCRUM-217 - 217-01 -> 217-04).
 * POST /api/v1/classes
 */
export async function createClass(
    requestFn: RequestFunction,
    payload: CreateClassInput,
): Promise<TrainingClass> {
    const res = await requestFn('/api/v1/classes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        let message = ''
        if (
            code === 'CLASS_CODE_ALREADY_EXISTS' ||
            code === 'CLASS_CODE_EXISTS' ||
            code === 'DUPLICATE_CLASS_CODE'
        ) {
            message = 'Mã lớp đã tồn tại. Vui lòng chọn mã lớp khác.'
        } else {
            message = getErrorMessage(
                { code, message: body.message, status: res.status },
                body.message || 'Không thể tạo lớp học mới.',
            )
        }
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Lấy danh sách lớp học (SCRUM-217).
 * GET /api/v1/classes
 */
export async function listClasses(
    requestFn: RequestFunction,
    params: ListClassesParams = {},
): Promise<ListClassesResponse> {
    const query = new URLSearchParams()
    if (params.program_id?.trim()) query.set('program_id', params.program_id.trim())
    if (params.status?.trim()) query.set('status', params.status.trim())
    if (params.search?.trim()) query.set('search', params.search.trim())
    if (params.page) query.set('page', String(params.page))
    if (params.page_size) query.set('page_size', String(params.page_size))

    const qs = query.toString()
    const path = `/api/v1/classes${qs ? `?${qs}` : ''}`

    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể tải danh sách lớp học.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Lấy chi tiết lớp học kèm danh sách môn học đã sao chép (SCRUM-217 - 217-04).
 * GET /api/v1/classes/<id>
 */
export async function getClassDetail(
    requestFn: RequestFunction,
    classId: string,
): Promise<TrainingClass> {
    const path = `/api/v1/classes/${encodeURIComponent(classId.trim())}`
    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể tải chi tiết lớp học.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Cập nhật trạng thái vòng đời của lớp học (SCRUM-217 - 217-03).
 * PUT /api/v1/classes/<id>/status
 */
export async function updateClassStatus(
    requestFn: RequestFunction,
    classId: string,
    status: ClassStatus | string,
): Promise<TrainingClass> {
    const path = `/api/v1/classes/${encodeURIComponent(classId.trim())}/status`
    const res = await requestFn(path, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            body.message || 'Không thể cập nhật trạng thái lớp học.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Lấy danh sách môn học sao chép của lớp (SCRUM-217 - 217-04).
 * GET /api/v1/classes/<id>/subjects
 */
export async function getClassSubjects(
    requestFn: RequestFunction,
    classId: string,
): Promise<ClassSubjectItem[]> {
    const path = `/api/v1/classes/${encodeURIComponent(classId.trim())}/subjects`
    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể tải danh sách môn học của lớp.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}
