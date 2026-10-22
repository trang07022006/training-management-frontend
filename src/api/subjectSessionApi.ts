/**
 * Subject Session API Client (SCRUM-129 - Activity A6).
 * Quản lý Buổi học của Môn học / Học phần:
 * - Xem danh sách buổi học theo môn học (SCRUM-174)
 * - Xem chi tiết một buổi học
 * - Thêm mới buổi học (SCRUM-175)
 * - Cập nhật buổi học (chủ đề, mục tiêu)
 * - Sắp xếp lại thứ tự buổi học (reorder)
 * - Xóa buổi học an toàn (chuẩn hóa thứ tự 1..N)
 * Tuân thủ API Contract backend (/api/v1/subjects/<subject_id>/sessions).
 */

import { getErrorMessage } from '../utils/errorMessages'
import { ApiError, type RequestFunction } from './userApi'

export { ApiError, type RequestFunction }

export interface SubjectSession {
    id: string
    subject_id: string
    session_number: number
    topic: string
    objective: string
    created_at?: string
    updated_at?: string
}

export interface SubjectSummary {
    id: string
    code: string
    name: string
    status?: string | null
    total_sessions: number | null
}

export interface SubjectSessionsResponse {
    subject: SubjectSummary
    items: SubjectSession[]
}

export interface CreateSubjectSessionInput {
    session_number: number
    topic: string
    objective: string
}

export interface UpdateSubjectSessionInput {
    topic?: string
    objective?: string
}

export interface ReorderSubjectSessionsInput {
    session_ids: string[]
}

/**
 * Lấy danh sách các buổi học của một môn học.
 * GET /api/v1/subjects/<subject_id>/sessions
 * Quyền yêu cầu: course.view
 */
export async function getSubjectSessions(
    requestFn: RequestFunction,
    subjectId: string,
): Promise<SubjectSessionsResponse> {
    const path = `/api/v1/subjects/${encodeURIComponent(subjectId)}/sessions`
    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 404 ? 'SUBJECT_NOT_FOUND' :
            'API_ERROR'
        )
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi tải danh sách buổi học.')
        throw new ApiError(message, code, res.status)
    }

    if (body.data) {
        return {
            subject: body.data.subject ?? body.subject ?? { id: subjectId, code: '', name: '', total_sessions: null },
            items: body.data.items ?? body.items ?? [],
        }
    }

    return {
        subject: body.subject ?? { id: subjectId, code: '', name: '', total_sessions: null },
        items: body.items ?? [],
    }
}

/**
 * Lấy chi tiết một buổi học theo ID.
 * GET /api/v1/subjects/<subject_id>/sessions/<session_id>
 * Quyền yêu cầu: course.view
 */
export async function getSubjectSession(
    requestFn: RequestFunction,
    subjectId: string,
    sessionId: string,
): Promise<SubjectSession> {
    const path = `/api/v1/subjects/${encodeURIComponent(subjectId)}/sessions/${encodeURIComponent(sessionId)}`
    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 404 ? 'SUBJECT_SESSION_NOT_FOUND' :
            'API_ERROR'
        )
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi tải chi tiết buổi học.')
        throw new ApiError(message, code, res.status)
    }

    return body.data ?? body
}

/**
 * Thêm một buổi học mới cho môn học.
 * POST /api/v1/subjects/<subject_id>/sessions
 * Quyền yêu cầu: course.manage
 */
export async function createSubjectSession(
    requestFn: RequestFunction,
    subjectId: string,
    input: CreateSubjectSessionInput,
): Promise<SubjectSession> {
    const path = `/api/v1/subjects/${encodeURIComponent(subjectId)}/sessions`
    const res = await requestFn(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 409 ? 'DUPLICATE_SESSION_NUMBER' :
            res.status === 404 ? 'SUBJECT_NOT_FOUND' :
            'API_ERROR'
        )
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi thêm buổi học mới.')
        throw new ApiError(message, code, res.status)
    }

    return body.data ?? body
}

/**
 * Cập nhật thông tin buổi học (chủ đề, mục tiêu).
 * PATCH /api/v1/subjects/<subject_id>/sessions/<session_id>
 * Quyền yêu cầu: course.manage
 */
export async function updateSubjectSession(
    requestFn: RequestFunction,
    subjectId: string,
    sessionId: string,
    input: UpdateSubjectSessionInput,
): Promise<SubjectSession> {
    const path = `/api/v1/subjects/${encodeURIComponent(subjectId)}/sessions/${encodeURIComponent(sessionId)}`
    const res = await requestFn(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 404 ? 'SUBJECT_SESSION_NOT_FOUND' :
            'API_ERROR'
        )
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi cập nhật buổi học.')
        throw new ApiError(message, code, res.status)
    }

    return body.data ?? body
}

/**
 * Sắp xếp lại thứ tự các buổi học của một môn học.
 * PATCH /api/v1/subjects/<subject_id>/sessions/reorder
 * Quyền yêu cầu: course.manage
 */
export async function reorderSubjectSessions(
    requestFn: RequestFunction,
    subjectId: string,
    sessionIds: string[],
): Promise<SubjectSession[]> {
    const path = `/api/v1/subjects/${encodeURIComponent(subjectId)}/sessions/reorder`
    const res = await requestFn(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_ids: sessionIds }),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            'REORDER_SESSIONS_FAILED'
        )
        const message = getErrorMessage(
            { code, message: body.message },
            'Không thể cập nhật thứ tự buổi học. Vui lòng thử lại.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data ?? []
}

/**
 * Xóa một buổi học của môn học (tự động chuẩn hóa lại thứ tự 1..N).
 * DELETE /api/v1/subjects/<subject_id>/sessions/<session_id>
 * Quyền yêu cầu: course.manage
 */
export async function deleteSubjectSession(
    requestFn: RequestFunction,
    subjectId: string,
    sessionId: string,
): Promise<{ message: string; id: string }> {
    const path = `/api/v1/subjects/${encodeURIComponent(subjectId)}/sessions/${encodeURIComponent(sessionId)}`
    const res = await requestFn(path, { method: 'DELETE' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 404 ? 'SUBJECT_SESSION_NOT_FOUND' :
            'API_ERROR'
        )
        const message = getErrorMessage({ code, message: body.message }, 'Lỗi khi xóa buổi học.')
        throw new ApiError(message, code, res.status)
    }

    return {
        message: body.message || 'Xóa buổi học thành công.',
        id: sessionId,
    }
}

export interface CloneSubjectSessionsResponse {
    message: string
    cloned_count: number
    total_sessions: number
    items: SubjectSession[]
}

/**
 * Nhân bản danh sách buổi học từ môn học khác (SCRUM-129).
 * POST /api/v1/subjects/<subject_id>/sessions/clone
 * Quyền yêu cầu: course.manage
 */
export async function cloneSubjectSessions(
    requestFn: RequestFunction,
    targetSubjectId: string,
    sourceSubjectId: string,
): Promise<CloneSubjectSessionsResponse> {
    const path = `/api/v1/subjects/${encodeURIComponent(targetSubjectId)}/sessions/clone`
    const res = await requestFn(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_subject_id: sourceSubjectId }),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 404 ? 'SUBJECT_NOT_FOUND' :
            res.status === 400 ? 'INVALID_PARAMS' :
            'API_ERROR'
        )
        const message = getErrorMessage(
            { code, message: body.message },
            'Không thể nhân bản danh sách buổi học. Vui lòng thử lại.',
        )
        throw new ApiError(message, code, res.status)
    }

    const data = body.data || {}
    return {
        message: body.message || `Đã nhân bản ${data.cloned_count || 0} buổi học thành công.`,
        cloned_count: data.cloned_count ?? 0,
        total_sessions: data.total_sessions ?? 0,
        items: data.items ?? [],
    }
}

