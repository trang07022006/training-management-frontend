/**
 * API client cho tính năng Yêu cầu học viên làm lại bài tập - SCRUM-269.
 */

export interface SubmissionVersionItem {
    id: string
    submission_id: string
    version_number: number
    submission_type: string
    content?: string | null
    file_url?: string | null
    file_name?: string | null
    file_size?: number | null
    repo_url?: string | null
    submitted_at: string
    rework_request_id?: string | null
}

export interface SubmissionReworkRequestItem {
    id: string
    submission_id: string
    submission_version_id?: string | null
    request_number: number
    comment: string
    new_deadline: string
    requested_by: string
    requested_by_name?: string | null
    status: 'open' | 'fulfilled' | 'cancelled'
    created_at: string
    fulfilled_at?: string | null
    fulfilled_version_id?: string | null
    fulfilled_version_number?: number | null
}

export interface SubmissionDetailItem {
    id: string
    assignment_id: string
    student_id: string
    student_code: string
    student_name: string
    student_email?: string | null
    assignment_title: string
    assignment_max_score: number
    status: 'submitted' | 'graded' | 'needs_rework' | 'resubmitted'
    status_label: string
    score: number | null
    feedback?: string | null
    graded_by?: string | null
    graded_at?: string | null
    rework_count: number
    created_at: string
    updated_at: string
    submitted_at?: string | null
    current_rework_request?: SubmissionReworkRequestItem | null
    rework_history: SubmissionReworkRequestItem[]
    versions: SubmissionVersionItem[]
}

export interface ReworkPayload {
    comment: string
    new_deadline: string
}

export interface ResubmitPayload {
    submission_type?: string
    content?: string
    file_url?: string
    file_name?: string
    file_size?: number
    repo_url?: string
}

export type RequestFn = (url: string, init?: RequestInit) => Promise<Response>

/**
 * AC1: Giảng viên yêu cầu học viên làm lại bài tập.
 */
export async function requestSubmissionRework(
    requestFn: RequestFn,
    submissionId: string,
    payload: ReworkPayload,
): Promise<SubmissionDetailItem> {
    const res = await requestFn(`/api/v1/submissions/${encodeURIComponent(submissionId)}/request-rework`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi gửi yêu cầu làm lại bài tập.')
    }
    return body.data as SubmissionDetailItem
}

/**
 * AC2: Học viên nộp lại bài tập theo hạn mới.
 */
export async function resubmitAssignment(
    requestFn: RequestFn,
    submissionId: string,
    payload: ResubmitPayload,
): Promise<SubmissionDetailItem> {
    const res = await requestFn(`/api/v1/submissions/${encodeURIComponent(submissionId)}/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi nộp lại bài tập.')
    }
    return body.data as SubmissionDetailItem
}

/**
 * AC3: Lấy chi tiết bài nộp kèm số lần làm lại và lịch sử.
 */
export async function getSubmissionDetail(
    requestFn: RequestFn,
    submissionId: string,
): Promise<SubmissionDetailItem> {
    const res = await requestFn(`/api/v1/submissions/${encodeURIComponent(submissionId)}`, {
        method: 'GET',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi tải chi tiết bài nộp.')
    }
    return body.data as SubmissionDetailItem
}

/**
 * Lấy danh sách bài nộp của bài tập (phục vụ Giảng viên).
 */
export async function getAssignmentSubmissions(
    requestFn: RequestFn,
    assignmentId: string,
): Promise<{ assignment_id: string; assignment_title: string; total: number; submissions: SubmissionDetailItem[] }> {
    const res = await requestFn(`/api/v1/assignments/${encodeURIComponent(assignmentId)}/submissions`, {
        method: 'GET',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi tải danh sách bài nộp.')
    }
    return body.data
}

/**
 * Lấy bài nộp của chính học viên.
 */
export async function getMySubmission(
    requestFn: RequestFn,
    assignmentId: string,
): Promise<SubmissionDetailItem> {
    const res = await requestFn(`/api/v1/assignments/${encodeURIComponent(assignmentId)}/my-submission`, {
        method: 'GET',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi tải bài nộp của bạn.')
    }
    return body.data as SubmissionDetailItem
}

export interface AssignmentItem {
    id: string
    class_id: string
    title: string
    description?: string | null
    due_date?: string | null
    max_score: number
    status: string
    created_by: string
    created_at: string
    updated_at: string
    class_code?: string | null
    creator_name?: string | null
}

export interface CreateAssignmentPayload {
    title: string
    description?: string
    due_date?: string
    max_score?: number
}

export interface GradePayload {
    score: number
    feedback?: string
}

/**
 * Lấy danh sách bài tập của lớp học.
 */
export async function getClassAssignments(
    requestFn: RequestFn,
    classId: string,
): Promise<AssignmentItem[]> {
    const res = await requestFn(`/api/v1/classes/${encodeURIComponent(classId)}/assignments`, {
        method: 'GET',
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi tải danh sách bài tập của lớp.')
    }
    return body.data as AssignmentItem[]
}

/**
 * Giảng viên giao bài tập mới cho lớp học.
 */
export async function createAssignment(
    requestFn: RequestFn,
    classId: string,
    payload: CreateAssignmentPayload,
): Promise<AssignmentItem> {
    const res = await requestFn(`/api/v1/classes/${encodeURIComponent(classId)}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi giao bài tập mới.')
    }
    return body.data as AssignmentItem
}

/**
 * Giảng viên đánh giá, chấm điểm và xác nhận bài nộp của học viên.
 */
export async function gradeSubmission(
    requestFn: RequestFn,
    submissionId: string,
    payload: GradePayload,
): Promise<SubmissionDetailItem> {
    const res = await requestFn(`/api/v1/submissions/${encodeURIComponent(submissionId)}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi đánh giá bài nộp.')
    }
    return body.data as SubmissionDetailItem
}

export interface SubmitAssignmentPayload {
    submission_type?: string
    content?: string
    file_url?: string
    file_name?: string
    file_size?: number
    repo_url?: string
}

/**
 * Học viên nộp bài tập lần đầu.
 */
export async function submitAssignment(
    requestFn: RequestFn,
    assignmentId: string,
    payload: SubmitAssignmentPayload,
): Promise<SubmissionDetailItem> {
    const res = await requestFn(`/api/v1/assignments/${encodeURIComponent(assignmentId)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok || body.status !== 'success') {
        throw new Error(body.message || 'Lỗi khi nộp bài tập.')
    }
    return body.data as SubmissionDetailItem
}


