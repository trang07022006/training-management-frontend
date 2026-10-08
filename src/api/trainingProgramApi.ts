/**
 * Training Program API Client (SCRUM-122 - Activity A6).
 * Quản lý Chương trình đào tạo: danh sách, chi tiết, tạo mới, cập nhật, xóa.
 * Tuân thủ tuyệt đối API Contract backend (/api/v1/training-programs).
 */

import { getErrorMessage } from '../utils/errorMessages'
import { ApiError, type RequestFunction } from './userApi'

export { ApiError, type RequestFunction }

export type TrainingProgramStatus = 'draft' | 'active' | 'archived'

export interface TrainingProgram {
    id: string
    code: string
    name: string
    description: string | null
    duration_semesters: number | null
    standard_tuition_fee: number | null
    status: TrainingProgramStatus
    created_at: string
    updated_at: string
}

export interface CreateTrainingProgramInput {
    code: string
    name: string
    description?: string | null
    duration_semesters?: number | null
    standard_tuition_fee?: number | null
    status?: TrainingProgramStatus
}

export interface UpdateTrainingProgramInput {
    code: string
    name: string
    description?: string | null
    duration_semesters?: number | null
    standard_tuition_fee?: number | null
    status?: TrainingProgramStatus
}

export interface PatchTrainingProgramInput {
    code?: string
    name?: string
    description?: string | null
    duration_semesters?: number | null
    standard_tuition_fee?: number | null
    status?: TrainingProgramStatus
}

export interface TrainingProgramListParams {
    page?: number
    page_size?: number
    status?: string
    search?: string
}

export interface TrainingProgramListResponseData {
    items: TrainingProgram[]
    total: number
    page: number
    page_size: number
    total_pages: number
}

export const PROGRAM_STATUS_LABELS: Record<TrainingProgramStatus, string> = {
    draft: 'Bản nháp',
    active: 'Đang hoạt động',
    archived: 'Đã lưu trữ',
}

export function getProgramStatusLabel(status?: string | null): string {
    if (!status) return 'Không xác định'
    const key = status.trim().toLowerCase() as TrainingProgramStatus
    return PROGRAM_STATUS_LABELS[key] || status
}

/**
 * Lấy danh sách chương trình đào tạo có phân trang, tìm kiếm và lọc trạng thái.
 * GET /api/v1/training-programs
 * Yêu cầu quyền: course.view
 */
export async function getTrainingPrograms(
    requestFn: RequestFunction,
    params: TrainingProgramListParams = {},
): Promise<TrainingProgramListResponseData> {
    const query = new URLSearchParams()
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.page_size !== undefined) query.set('page_size', String(params.page_size))
    if (params.status && params.status.trim()) query.set('status', params.status.trim().toLowerCase())
    if (params.search && params.search.trim()) query.set('search', params.search.trim())

    const qs = query.toString()
    const path = `/api/v1/training-programs${qs ? `?${qs}` : ''}`

    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            'API_ERROR'
        )
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi tải danh sách chương trình đào tạo.')
        throw new ApiError(message, code, res.status)
    }

    return body.data ?? { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }
}

/**
 * Lấy chi tiết một chương trình đào tạo theo ID.
 * GET /api/v1/training-programs/<id>
 * Yêu cầu quyền: course.view
 */
export async function getTrainingProgram(
    requestFn: RequestFunction,
    id: string,
): Promise<TrainingProgram> {
    const path = `/api/v1/training-programs/${encodeURIComponent(id.trim())}`

    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 404 ? 'PROGRAM_NOT_FOUND' :
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            'API_ERROR'
        )
        const message = getErrorMessage({ code, message: body.message }, 'Không tìm thấy chương trình đào tạo.')
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Tạo mới một chương trình đào tạo.
 * POST /api/v1/training-programs
 * Yêu cầu quyền: course.manage
 */
export async function createTrainingProgram(
    requestFn: RequestFunction,
    payload: CreateTrainingProgramInput,
): Promise<TrainingProgram> {
    const res = await requestFn('/api/v1/training-programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 409 ? 'DUPLICATE_CODE' :
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            'VALIDATION_ERROR'
        )
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi tạo chương trình đào tạo.')
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Cập nhật toàn bộ thông tin chương trình đào tạo (PUT).
 * PUT /api/v1/training-programs/<id>
 * Yêu cầu quyền: course.manage
 */
export async function updateTrainingProgram(
    requestFn: RequestFunction,
    id: string,
    payload: UpdateTrainingProgramInput,
): Promise<TrainingProgram> {
    const path = `/api/v1/training-programs/${encodeURIComponent(id.trim())}`

    const res = await requestFn(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 404 ? 'PROGRAM_NOT_FOUND' :
            res.status === 409 ? 'DUPLICATE_CODE' :
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            'UPDATE_ERROR'
        )
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi cập nhật chương trình đào tạo.')
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Cập nhật từng phần thông tin chương trình đào tạo (PATCH).
 * PATCH /api/v1/training-programs/<id>
 * Yêu cầu quyền: course.manage
 */
export async function patchTrainingProgram(
    requestFn: RequestFunction,
    id: string,
    payload: PatchTrainingProgramInput,
): Promise<TrainingProgram> {
    const path = `/api/v1/training-programs/${encodeURIComponent(id.trim())}`

    const res = await requestFn(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 404 ? 'PROGRAM_NOT_FOUND' :
            res.status === 409 ? 'DUPLICATE_CODE' :
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            'UPDATE_ERROR'
        )
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi cập nhật chương trình đào tạo.')
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Xóa một chương trình đào tạo an toàn.
 * DELETE /api/v1/training-programs/<id>
 * Yêu cầu quyền: course.manage
 */
export async function deleteTrainingProgram(
    requestFn: RequestFunction,
    id: string,
): Promise<{ id: string; deleted?: boolean; [key: string]: unknown }> {
    const path = `/api/v1/training-programs/${encodeURIComponent(id.trim())}`

    const res = await requestFn(path, {
        method: 'DELETE',
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 409 ? 'PROGRAM_IN_USE' :
            res.status === 404 ? 'PROGRAM_NOT_FOUND' :
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            'DELETE_ERROR'
        )
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi xóa chương trình đào tạo.')
        throw new ApiError(message, code, res.status)
    }

    return body.data ?? { id }
}

// Aliases cho tính linh hoạt và tương thích
export const fetchTrainingProgramsApi = getTrainingPrograms
export const getTrainingProgramApi = getTrainingProgram
export const createTrainingProgramApi = createTrainingProgram
export const updateTrainingProgramApi = updateTrainingProgram
export const patchTrainingProgramApi = patchTrainingProgram
export const deleteTrainingProgramApi = deleteTrainingProgram
