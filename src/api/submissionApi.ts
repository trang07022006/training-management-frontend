/**
 * API client cho tính năng Chấm điểm nhanh bài nộp và Nhật ký sửa điểm - SCRUM-267.
 */

export interface SubmissionNavigation {
    prev_id: string | null
    next_id: string | null
    index: number
    total: number
}

export interface SubmissionItem {
    id: string
    assignment_id: string
    student_id: string
    student_code: string
    student_name: string
    student_email?: string
    submission_type: 'file' | 'repo_url' | 'both'
    file_url?: string | null
    file_name?: string | null
    file_size?: number | null
    repo_url?: string | null
    note?: string | null
    submitted_at: string
    status: 'submitted' | 'graded' | 'returned'
    score: number | null
    feedback?: string | null
    is_graded: boolean
    is_published: boolean
    graded_by_name?: string | null
    graded_at?: string | null
    assignment_title: string
    assignment_max_score: number
    navigation?: SubmissionNavigation
}

export interface SubmissionsListResponse {
    assignment_id: string
    total: number
    graded_count: number
    pending_count: number
    submissions: SubmissionItem[]
}

export interface GradePayload {
    score: number
    feedback?: string
    change_reason?: string
}

export interface AuditLogItem {
    id: string
    submission_id: string
    performed_by: string
    performer_name: string
    old_score: number | null
    new_score: number
    old_feedback?: string | null
    new_feedback?: string | null
    change_reason?: string | null
    created_at: string
}

export type RequestFn = (url: string, init?: RequestInit) => Promise<Response>

export async function getAssignmentSubmissions(
    requestFn: RequestFn,
    assignmentId: string,
): Promise<SubmissionsListResponse> {
    const res = await requestFn(`/api/v1/assignments/${encodeURIComponent(assignmentId)}/submissions`, {
        method: 'GET',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi tải danh sách bài nộp.')
    }
    return body.data as SubmissionsListResponse
}

export async function getSubmissionDetail(
    requestFn: RequestFn,
    submissionId: string,
): Promise<SubmissionItem> {
    const res = await requestFn(`/api/v1/submissions/${encodeURIComponent(submissionId)}`, {
        method: 'GET',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi tải chi tiết bài nộp.')
    }
    return body.data as SubmissionItem
}

export async function gradeSubmission(
    requestFn: RequestFn,
    submissionId: string,
    payload: GradePayload,
): Promise<SubmissionItem> {
    const res = await requestFn(`/api/v1/submissions/${encodeURIComponent(submissionId)}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi chấm điểm bài nộp.')
    }
    return body.data as SubmissionItem
}

export async function publishAssignmentGrades(
    requestFn: RequestFn,
    assignmentId: string,
): Promise<{ message: string; is_published: boolean }> {
    const res = await requestFn(`/api/v1/assignments/${encodeURIComponent(assignmentId)}/publish-grades`, {
        method: 'POST',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi công bố điểm.')
    }
    return body.data
}

export async function getSubmissionAuditLogs(
    requestFn: RequestFn,
    submissionId: string,
): Promise<AuditLogItem[]> {
    const res = await requestFn(`/api/v1/submissions/${encodeURIComponent(submissionId)}/audit-logs`, {
        method: 'GET',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi tải nhật ký sửa điểm.')
    }
    return body.data as AuditLogItem[]
}

export async function getMySubmission(
    requestFn: RequestFn,
    assignmentId: string,
): Promise<SubmissionItem> {
    const res = await requestFn(`/api/v1/assignments/${encodeURIComponent(assignmentId)}/my-submission`, {
        method: 'GET',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi tải bài nộp của bạn.')
    }
    return body.data as SubmissionItem
}
