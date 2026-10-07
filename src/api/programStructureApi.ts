/**
 * Program Structure API Client (SCRUM-124 - Activity A6).
 * Quản lý Cấu trúc chương trình đào tạo & Môn học tiên quyết:
 * - Xem cấu trúc môn học của chương trình
 * - Thêm môn học vào chương trình
 * - Cập nhật thông tin môn học trong chương trình (học kỳ, bắt buộc/tự chọn, thứ tự)
 * - Sắp xếp lại thứ tự môn học (reorder)
 * - Gỡ môn học khỏi chương trình an toàn
 * - Tra cứu, thêm, xóa môn tiên quyết
 * Tuân thủ API Contract backend (/api/v1/training-programs/<program_id>/subjects).
 */

import { getErrorMessage } from '../utils/errorMessages'
import { ApiError, type RequestFunction } from './userApi'

export { ApiError, type RequestFunction }

export interface ProgramSubjectPrerequisiteItem {
    id: string
    prerequisite_program_subject_id: string
    code?: string
    name?: string
    credits?: number
}

export interface ProgramSubject {
    program_subject_id: string
    program_id: string
    subject_id: string
    code: string
    name: string
    credits: number
    total_sessions: number | null
    status: string
    semester: number | null
    is_mandatory: boolean
    order_index: number
    prerequisites: ProgramSubjectPrerequisiteItem[]
}

export interface ProgramStructureSummary {
    id: string
    code: string
    name: string
    description: string | null
    duration_semesters: number | null
    status: string
}

export interface ProgramStructure {
    program: ProgramStructureSummary
    total_subjects: number
    total_credits: number
    items: ProgramSubject[]
}

export interface AddProgramSubjectInput {
    subject_id: string
    semester?: number | null
    is_mandatory?: boolean
    order_index?: number
}

export interface UpdateProgramSubjectInput {
    semester?: number | null
    is_mandatory?: boolean
    order_index?: number
}

export interface ReorderInput {
    semester?: number | null
    ordered_ids?: string[]
    items?: Array<{ program_subject_id: string; order_index: number }>
}

export interface ProgramPrerequisite {
    id: string
    program_id: string
    program_subject_id: string
    prerequisite_program_subject_id: string
    created_at?: string
    prerequisite_code?: string
    prerequisite_name?: string
}

export interface ProgramStructureFilterParams {
    semester?: number | null
    is_mandatory?: boolean | null
}

/**
 * Xem cấu trúc môn học của một chương trình đào tạo.
 * GET /api/v1/training-programs/<program_id>/subjects
 * Quyền: course.view
 */
export async function getProgramStructure(
    requestFn: RequestFunction,
    programId: string,
    params?: ProgramStructureFilterParams,
): Promise<ProgramStructure> {
    const query = new URLSearchParams()
    if (params?.semester !== undefined && params?.semester !== null) {
        query.set('semester', String(params.semester))
    }
    if (params?.is_mandatory !== undefined && params?.is_mandatory !== null) {
        query.set('is_mandatory', String(params.is_mandatory))
    }

    const qs = query.toString()
    const path = `/api/v1/training-programs/${encodeURIComponent(programId.trim())}/subjects${qs ? `?${qs}` : ''}`

    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.error?.code || body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 404 ? 'PROGRAM_NOT_FOUND' :
            'API_ERROR'
        )
        const message = getErrorMessage(
            { code, message: body.error?.message || body.message },
            'Không thể tải cấu trúc chương trình đào tạo.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body
}

/**
 * Thêm môn học vào chương trình đào tạo.
 * POST /api/v1/training-programs/<program_id>/subjects
 * Quyền: course.manage
 */
export async function addSubjectToProgram(
    requestFn: RequestFunction,
    programId: string,
    input: AddProgramSubjectInput,
): Promise<ProgramSubject> {
    const path = `/api/v1/training-programs/${encodeURIComponent(programId.trim())}/subjects`

    const res = await requestFn(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.error?.code || body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 404 ? 'NOT_FOUND' :
            res.status === 409 ? 'SUBJECT_ALREADY_IN_PROGRAM' :
            'API_ERROR'
        )
        const message = getErrorMessage(
            { code, message: body.error?.message || body.message },
            'Không thể thêm môn học vào chương trình.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.item || body
}

/**
 * Cập nhật thông tin môn học trong chương trình đào tạo.
 * PATCH /api/v1/training-programs/<program_id>/subjects/<program_subject_id>
 * Quyền: course.manage
 */
export async function updateProgramSubject(
    requestFn: RequestFunction,
    programId: string,
    programSubjectId: string,
    input: UpdateProgramSubjectInput,
): Promise<ProgramSubject> {
    const path = `/api/v1/training-programs/${encodeURIComponent(programId.trim())}/subjects/${encodeURIComponent(programSubjectId.trim())}`

    const res = await requestFn(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.error?.code || body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 404 ? 'PROGRAM_SUBJECT_NOT_FOUND' :
            'API_ERROR'
        )
        const message = getErrorMessage(
            { code, message: body.error?.message || body.message },
            'Không thể cập nhật môn học trong chương trình.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.item || body
}

/**
 * Sắp xếp lại thứ tự môn học trong chương trình.
 * PATCH /api/v1/training-programs/<program_id>/subjects/reorder
 * Quyền: course.manage
 */
export async function reorderProgramSubjects(
    requestFn: RequestFunction,
    programId: string,
    input: ReorderInput,
): Promise<{ message: string; semester: number | null }> {
    const path = `/api/v1/training-programs/${encodeURIComponent(programId.trim())}/subjects/reorder`

    const res = await requestFn(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.error?.code || body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 400 ? 'INVALID_PARAMS' :
            'API_ERROR'
        )
        const message = getErrorMessage(
            { code, message: body.error?.message || body.message },
            'Không thể sắp xếp lại môn học.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body
}

/**
 * Gỡ môn học khỏi khung chương trình đào tạo.
 * DELETE /api/v1/training-programs/<program_id>/subjects/<program_subject_id>
 * Quyền: course.manage
 */
export async function removeSubjectFromProgram(
    requestFn: RequestFunction,
    programId: string,
    programSubjectId: string,
): Promise<{ message: string }> {
    const path = `/api/v1/training-programs/${encodeURIComponent(programId.trim())}/subjects/${encodeURIComponent(programSubjectId.trim())}`

    const res = await requestFn(path, { method: 'DELETE' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.error?.code || body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 404 ? 'PROGRAM_SUBJECT_NOT_FOUND' :
            res.status === 409 ? 'PROGRAM_SUBJECT_IN_USE' :
            'API_ERROR'
        )
        const message = getErrorMessage(
            { code, message: body.error?.message || body.message },
            'Không thể gỡ môn học khỏi chương trình.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body
}

/**
 * Xem danh sách môn tiên quyết của một môn học trong chương trình.
 * GET /api/v1/training-programs/<program_id>/subjects/<program_subject_id>/prerequisites
 * Quyền: course.view
 */
export async function getPrerequisites(
    requestFn: RequestFunction,
    programId: string,
    programSubjectId: string,
): Promise<ProgramPrerequisite[]> {
    const path = `/api/v1/training-programs/${encodeURIComponent(programId.trim())}/subjects/${encodeURIComponent(programSubjectId.trim())}/prerequisites`

    const res = await requestFn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.error?.code || body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 404 ? 'PROGRAM_SUBJECT_NOT_FOUND' :
            'API_ERROR'
        )
        const message = getErrorMessage(
            { code, message: body.error?.message || body.message },
            'Không thể tải danh sách môn tiên quyết.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.prerequisites ?? []
}

/**
 * Thêm môn tiên quyết cho một môn học.
 * POST /api/v1/training-programs/<program_id>/subjects/<program_subject_id>/prerequisites
 * Quyền: course.manage
 */
export async function addPrerequisite(
    requestFn: RequestFunction,
    programId: string,
    programSubjectId: string,
    prerequisiteProgramSubjectId: string,
): Promise<ProgramPrerequisite> {
    const path = `/api/v1/training-programs/${encodeURIComponent(programId.trim())}/subjects/${encodeURIComponent(programSubjectId.trim())}/prerequisites`

    const res = await requestFn(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prerequisite_program_subject_id: prerequisiteProgramSubjectId }),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.error?.code || body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 409 ? 'PREREQUISITE_CYCLE' :
            res.status === 400 ? 'INVALID_PREREQUISITE_ORDER' :
            'API_ERROR'
        )
        const message = getErrorMessage(
            { code, message: body.error?.message || body.message },
            'Không thể thêm môn học tiên quyết.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.prerequisite || body
}

/**
 * Gỡ môn tiên quyết.
 * DELETE /api/v1/training-programs/<program_id>/subjects/<program_subject_id>/prerequisites/<prerequisite_program_subject_id>
 * Quyền: course.manage
 */
export async function removePrerequisite(
    requestFn: RequestFunction,
    programId: string,
    programSubjectId: string,
    prerequisiteProgramSubjectId: string,
): Promise<{ message: string }> {
    const path = `/api/v1/training-programs/${encodeURIComponent(programId.trim())}/subjects/${encodeURIComponent(programSubjectId.trim())}/prerequisites/${encodeURIComponent(prerequisiteProgramSubjectId.trim())}`

    const res = await requestFn(path, { method: 'DELETE' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.error?.code || body.code || (
            res.status === 403 ? 'FORBIDDEN' :
            res.status === 401 ? 'UNAUTHORIZED' :
            res.status === 404 ? 'NOT_FOUND' :
            'API_ERROR'
        )
        const message = getErrorMessage(
            { code, message: body.error?.message || body.message },
            'Không thể gỡ môn học tiên quyết.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body
}
