/**
 * Subject API Client (SCRUM-123 - Activity A6).
 * Quản lý Môn học / Học phần: danh sách, chi tiết, tạo mới, cập nhật (PUT/PATCH), xóa an toàn.
 * Tuân thủ tuyệt đối API Contract backend (/api/v1/subjects).
 */

import { getErrorMessage } from '../utils/errorMessages'
import { ApiError, type RequestFunction } from './userApi'

export { ApiError, type RequestFunction }

export type SubjectStatus = 'draft' | 'active' | 'archived'

export interface Subject {
    id: string
    code: string
    name: string
    description: string | null
    credits: number
    total_sessions: number | null
    status: SubjectStatus
    created_at: string
    updated_at: string
}

export interface CreateSubjectInput {
    code: string
    name: string
    credits: number
    description?: string | null
    total_sessions?: number | null
    status?: SubjectStatus
}

export interface UpdateSubjectInput {
    code: string
    name: string
    credits: number
    description?: string | null
    total_sessions?: number | null
    status?: SubjectStatus
}

export interface PatchSubjectInput {
    code?: string
    name?: string
    credits?: number
    description?: string | null
    total_sessions?: number | null
    status?: SubjectStatus
}

export interface SubjectListParams {
    page?: number
    page_size?: number
    status?: string
    search?: string
}

export interface SubjectListResponseData {
    items: Subject[]
    total: number
    page: number
    page_size: number
    total_pages: number
}

export const SUBJECT_STATUS_LABELS: Record<SubjectStatus, string> = {
    draft: 'Bản nháp',
    active: 'Đang hoạt động',
    archived: 'Đã lưu trữ',
}

export function getSubjectStatusLabel(status?: string | null): string {
    if (!status) return 'Không xác định'
    const key = status.trim().toLowerCase() as SubjectStatus
    return SUBJECT_STATUS_LABELS[key] || status
}

/**
 * Lấy danh sách môn học có phân trang, tìm kiếm và lọc trạng thái.
 * GET /api/v1/subjects
 * Yêu cầu quyền: course.view
 */
export async function getSubjects(
    requestFn: RequestFunction,
    params: SubjectListParams = {},
): Promise<SubjectListResponseData> {
    const query = new URLSearchParams()
    if (params.page !== undefined) query.set('page', String(params.page))
    if (params.page_size !== undefined) query.set('page_size', String(params.page_size))
    if (params.status && params.status.trim()) query.set('status', params.status.trim().toLowerCase())
    if (params.search && params.search.trim()) query.set('search', params.search.trim())

    const qs = query.toString()
    const path = `/api/v1/subjects${qs ? `?${qs}` : ''}`

    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            'API_ERROR'
        )
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi tải danh sách môn học.')
        throw new ApiError(message, code, res.status)
    }

    return body.data ?? { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }
}

/**
 * Lấy chi tiết một môn học theo ID.
 * GET /api/v1/subjects/<id>
 * Yêu cầu quyền: course.view
 */
export async function getSubject(
    requestFn: RequestFunction,
    id: string,
): Promise<Subject> {
    const path = `/api/v1/subjects/${encodeURIComponent(id.trim())}`

    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 404 ? 'SUBJECT_NOT_FOUND' :
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 400 ? 'INVALID_PARAMS' :
            'API_ERROR'
        )
        const message = getErrorMessage({ code, message: body.message }, 'Không tìm thấy môn học yêu cầu.')
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Tạo mới một môn học / học phần.
 * POST /api/v1/subjects
 * Yêu cầu quyền: course.manage
 */
export async function createSubject(
    requestFn: RequestFunction,
    payload: CreateSubjectInput,
): Promise<Subject> {
    const res = await requestFn('/api/v1/subjects', {
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
            res.status === 400 ? 'INVALID_PARAMS' :
            'VALIDATION_ERROR'
        )
        const defaultFallback = code === 'DUPLICATE_CODE' ? 'Mã môn học đã tồn tại.' : 'Lỗi khi tạo môn học.'
        const message =
            code === 'DUPLICATE_CODE'
                ? (body.message && body.message.includes('môn học') ? body.message : 'Mã môn học đã tồn tại.')
                : getErrorMessage({ code, message: body.message }, defaultFallback)
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Cập nhật toàn bộ thông tin môn học (PUT).
 * PUT /api/v1/subjects/<id>
 * Yêu cầu quyền: course.manage
 */
export async function updateSubject(
    requestFn: RequestFunction,
    id: string,
    payload: UpdateSubjectInput,
): Promise<Subject> {
    const path = `/api/v1/subjects/${encodeURIComponent(id.trim())}`

    const res = await requestFn(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 404 ? 'SUBJECT_NOT_FOUND' :
            res.status === 409 ? 'DUPLICATE_CODE' :
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 400 ? 'INVALID_PARAMS' :
            'UPDATE_ERROR'
        )
        const defaultFallback = code === 'DUPLICATE_CODE' ? 'Mã môn học đã tồn tại.' : 'Lỗi khi cập nhật môn học.'
        const message =
            code === 'DUPLICATE_CODE'
                ? (body.message && body.message.includes('môn học') ? body.message : 'Mã môn học đã tồn tại.')
                : getErrorMessage({ code, message: body.message }, defaultFallback)
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Cập nhật từng phần thông tin môn học (PATCH).
 * PATCH /api/v1/subjects/<id>
 * Yêu cầu quyền: course.manage
 */
export async function patchSubject(
    requestFn: RequestFunction,
    id: string,
    payload: PatchSubjectInput,
): Promise<Subject> {
    const path = `/api/v1/subjects/${encodeURIComponent(id.trim())}`

    const res = await requestFn(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 404 ? 'SUBJECT_NOT_FOUND' :
            res.status === 409 ? 'DUPLICATE_CODE' :
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 400 ? 'INVALID_PARAMS' :
            'UPDATE_ERROR'
        )
        const defaultFallback = code === 'DUPLICATE_CODE' ? 'Mã môn học đã tồn tại.' : 'Lỗi khi cập nhật môn học.'
        const message =
            code === 'DUPLICATE_CODE'
                ? (body.message && body.message.includes('môn học') ? body.message : 'Mã môn học đã tồn tại.')
                : getErrorMessage({ code, message: body.message }, defaultFallback)
        throw new ApiError(message, code, res.status)
    }

    return body.data
}

/**
 * Xóa một môn học an toàn.
 * DELETE /api/v1/subjects/<id>
 * Yêu cầu quyền: course.manage
 */
export async function deleteSubject(
    requestFn: RequestFunction,
    id: string,
): Promise<{ id: string; [key: string]: unknown }> {
    const path = `/api/v1/subjects/${encodeURIComponent(id.trim())}`

    const res = await requestFn(path, {
        method: 'DELETE',
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 409 ? 'SUBJECT_IN_USE' :
            res.status === 404 ? 'SUBJECT_NOT_FOUND' :
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 400 ? 'INVALID_PARAMS' :
            'DELETE_ERROR'
        )
        const defaultFallback =
            code === 'SUBJECT_IN_USE'
                ? 'Không thể xóa môn học vì đang có dữ liệu liên quan. Hãy chuyển môn học sang trạng thái Đã lưu trữ nếu không còn sử dụng.'
                : 'Lỗi khi xóa môn học.'
        const message = getErrorMessage({ code, message: body.message }, defaultFallback)
        throw new ApiError(message, code, res.status)
    }

    return body.data ?? { id }
}

// Aliases cho tính linh hoạt và tương thích
export const fetchSubjectsApi = getSubjects
export const getSubjectApi = getSubject
export const createSubjectApi = createSubject
export const updateSubjectApi = updateSubject
export const patchSubjectApi = patchSubject
export const deleteSubjectApi = deleteSubject
