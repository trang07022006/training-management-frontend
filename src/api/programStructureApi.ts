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
 * Chuẩn hóa đối tượng ProgramSubject từ backend payload (hỗ trợ cả subject_code/subject_name và code/name).
 */
export function normalizeProgramSubject(item: any, defaultProgramId?: string): ProgramSubject {
    if (!item) {
        return {
            program_subject_id: '',
            program_id: defaultProgramId || '',
            subject_id: '',
            code: '',
            name: '',
            credits: 0,
            total_sessions: null,
            status: 'draft',
            semester: null,
            is_mandatory: true,
            order_index: 1,
            prerequisites: [],
        }
    }

    const rawPrereqs = Array.isArray(item.prerequisites) ? item.prerequisites : []
    const mappedPrereqs: ProgramSubjectPrerequisiteItem[] = rawPrereqs.map((p: any) => ({
        id: String(p.id || ''),
        prerequisite_program_subject_id: String(p.prerequisite_program_subject_id || ''),
        code: p.code || p.prerequisite_subject_code || p.prerequisite_code || '',
        name: p.name || p.prerequisite_subject_name || p.prerequisite_name || '',
        credits: typeof p.credits === 'number' ? p.credits : undefined,
    }))

    return {
        program_subject_id: String(item.program_subject_id || item.id || ''),
        program_id: String(item.program_id || defaultProgramId || ''),
        subject_id: String(item.subject_id || ''),
        code: String(item.code || item.subject_code || ''),
        name: String(item.name || item.subject_name || ''),
        credits:
            typeof item.credits === 'number'
                ? item.credits
                : typeof item.subject_credits === 'number'
                  ? item.subject_credits
                  : 0,
        total_sessions:
            item.total_sessions !== undefined && item.total_sessions !== null
                ? Number(item.total_sessions)
                : item.subject_total_sessions !== undefined && item.subject_total_sessions !== null
                  ? Number(item.subject_total_sessions)
                  : null,
        status: String(item.status || item.subject_status || 'draft'),
        semester: item.semester !== undefined && item.semester !== null ? Number(item.semester) : null,
        is_mandatory: typeof item.is_mandatory === 'boolean' ? item.is_mandatory : Boolean(item.is_mandatory),
        order_index: typeof item.order_index === 'number' ? item.order_index : Number(item.order_index || 1),
        prerequisites: mappedPrereqs,
    }
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

    const rawItems = Array.isArray(body.items) ? body.items : []
    const mappedItems = rawItems.map((it: any) => normalizeProgramSubject(it, programId))

    return {
        program: body.program || {
            id: programId,
            code: '',
            name: '',
            description: null,
            duration_semesters: null,
            status: 'active',
        },
        total_subjects: typeof body.total_subjects === 'number' ? body.total_subjects : mappedItems.length,
        total_credits:
            typeof body.total_credits === 'number'
                ? body.total_credits
                : mappedItems.reduce((acc, curr) => acc + (curr.credits || 0), 0),
        items: mappedItems,
    }
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

    const raw = body.item || body
    return normalizeProgramSubject(raw, programId)
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

    const raw = body.item || body
    return normalizeProgramSubject(raw, programId)
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

    const rawList = Array.isArray(body)
        ? body
        : Array.isArray(body.prerequisites)
          ? body.prerequisites
          : Array.isArray(body.data)
            ? body.data
            : []

    return rawList.map((p: any) => ({
        id: String(p.id || ''),
        program_id: String(p.program_id || programId),
        program_subject_id: String(p.program_subject_id || programSubjectId),
        prerequisite_program_subject_id: String(p.prerequisite_program_subject_id || ''),
        created_at: p.created_at,
        prerequisite_code: p.prerequisite_code || p.prerequisite_subject_code || p.code || '',
        prerequisite_name: p.prerequisite_name || p.prerequisite_subject_name || p.name || '',
    }))
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

    const raw = body.prerequisite || body
    return {
        id: String(raw.id || ''),
        program_id: String(raw.program_id || programId),
        program_subject_id: String(raw.program_subject_id || programSubjectId),
        prerequisite_program_subject_id: String(raw.prerequisite_program_subject_id || prerequisiteProgramSubjectId),
        created_at: raw.created_at,
        prerequisite_code: raw.prerequisite_code || raw.prerequisite_subject_code || raw.code || '',
        prerequisite_name: raw.prerequisite_name || raw.prerequisite_subject_name || raw.name || '',
    }
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
