/**
 * API client cho tính năng Rubric & Chấm điểm bài tập nhiều tiêu chí - SCRUM-268.
 * Endpoints backend:
 *   /api/v1/rubric-templates
 *   /api/v1/classes/<class_id>/assignments
 */

export interface RubricCriteria {
    id?: string
    template_id?: string
    name: string
    description?: string | null
    max_score: number
    weight: number // % trọng số (0 < weight <= 100)
    order_index?: number
    created_at?: string
    updated_at?: string
}

export interface RubricTemplate {
    id: string
    name: string
    description?: string | null
    created_by: string
    is_deleted?: boolean
    created_at?: string
    updated_at?: string
    criteria: RubricCriteria[]
    total_weight?: number
}

export interface CreateRubricPayload {
    name: string
    description?: string
    criteria: Array<{
        name: string
        description?: string
        weight: number
        max_score: number
        order_index?: number
    }>
}

export interface Assignment {
    id: string
    class_id: string
    title: string
    description?: string | null
    rubric_template_id?: string | null
    rubric_template_name?: string | null
    max_score: number
    created_by: string
    class_code?: string
    created_at?: string
    updated_at?: string
}

export interface CreateAssignmentPayload {
    title: string
    description?: string
    rubric_template_id?: string | null
    max_score?: number
}

export interface CriteriaGrade {
    id: string
    grade_id: string
    criteria_id: string
    score: number
    comment?: string | null
    criteria_name?: string
    criteria_weight?: number
    criteria_max_score?: number
    criteria_order_index?: number
    created_at?: string
    updated_at?: string
}

export interface AssignmentGrade {
    id: string
    assignment_id: string
    student_id: string
    total_score: number | null
    graded_by?: string | null
    graded_by_name?: string | null
    graded_at?: string | null
    feedback?: string | null
    student_code?: string
    student_name?: string
    criteria_grades?: CriteriaGrade[]
    created_at?: string
    updated_at?: string
}

export interface GradeStudentPayload {
    criteria_scores: Array<{
        criteria_id: string
        score: number
        comment?: string
    }>
    feedback?: string
}

export type RequestFn = (url: string, init?: RequestInit) => Promise<Response>

// ============================================================
// Rubric Templates API
// ============================================================

export async function getRubricTemplates(
    requestFn: RequestFn,
    options?: { my?: boolean },
): Promise<RubricTemplate[]> {
    const query = options?.my ? '?my=true' : ''
    const res = await requestFn(`/api/v1/rubric-templates${query}`, { method: 'GET' })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi lấy danh sách mẫu rubric.')
    }
    return body.data as RubricTemplate[]
}

export async function getRubricTemplateDetail(
    requestFn: RequestFn,
    templateId: string,
): Promise<RubricTemplate> {
    const res = await requestFn(`/api/v1/rubric-templates/${encodeURIComponent(templateId)}`, {
        method: 'GET',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi lấy chi tiết mẫu rubric.')
    }
    return body.data as RubricTemplate
}

export async function createRubricTemplate(
    requestFn: RequestFn,
    payload: CreateRubricPayload,
): Promise<RubricTemplate> {
    const res = await requestFn('/api/v1/rubric-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi tạo mẫu rubric.')
    }
    return body.data as RubricTemplate
}

export async function updateRubricTemplate(
    requestFn: RequestFn,
    templateId: string,
    payload: Partial<CreateRubricPayload>,
): Promise<RubricTemplate> {
    const res = await requestFn(`/api/v1/rubric-templates/${encodeURIComponent(templateId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi cập nhật mẫu rubric.')
    }
    return body.data as RubricTemplate
}

export async function deleteRubricTemplate(
    requestFn: RequestFn,
    templateId: string,
): Promise<{ message: string }> {
    const res = await requestFn(`/api/v1/rubric-templates/${encodeURIComponent(templateId)}`, {
        method: 'DELETE',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi xóa mẫu rubric.')
    }
    return { message: body.message }
}

// ============================================================
// Class Assignments API
// ============================================================

export async function getClassAssignments(
    requestFn: RequestFn,
    classId: string,
): Promise<Assignment[]> {
    const res = await requestFn(`/api/v1/classes/${encodeURIComponent(classId)}/assignments`, {
        method: 'GET',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi lấy danh sách bài tập.')
    }
    return body.data as Assignment[]
}

export async function createClassAssignment(
    requestFn: RequestFn,
    classId: string,
    payload: CreateAssignmentPayload,
): Promise<Assignment> {
    const res = await requestFn(`/api/v1/classes/${encodeURIComponent(classId)}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi tạo bài tập.')
    }
    return body.data as Assignment
}

export async function getAssignmentDetail(
    requestFn: RequestFn,
    classId: string,
    assignmentId: string,
): Promise<Assignment> {
    const res = await requestFn(
        `/api/v1/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}`,
        { method: 'GET' },
    )
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi lấy chi tiết bài tập.')
    }
    return body.data as Assignment
}

// ============================================================
// Grading API
// ============================================================

export async function listAssignmentGrades(
    requestFn: RequestFn,
    classId: string,
    assignmentId: string,
): Promise<AssignmentGrade[]> {
    const res = await requestFn(
        `/api/v1/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/grades`,
        { method: 'GET' },
    )
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi lấy bảng điểm bài tập.')
    }
    return body.data as AssignmentGrade[]
}

export async function gradeStudentByRubric(
    requestFn: RequestFn,
    classId: string,
    assignmentId: string,
    studentId: string,
    payload: GradeStudentPayload,
): Promise<AssignmentGrade> {
    const res = await requestFn(
        `/api/v1/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/grades/${encodeURIComponent(studentId)}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        },
    )
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi chấm điểm học viên.')
    }
    return body.data as AssignmentGrade
}

export async function getMyAssignmentGrade(
    requestFn: RequestFn,
    classId: string,
    assignmentId: string,
    studentId: string,
): Promise<AssignmentGrade> {
    const res = await requestFn(
        `/api/v1/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/my-grade?student_id=${encodeURIComponent(studentId)}`,
        { method: 'GET' },
    )
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi lấy điểm bài tập của bạn.')
    }
    return body.data as AssignmentGrade
}
