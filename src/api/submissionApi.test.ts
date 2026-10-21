import { describe, expect, it, vi } from 'vitest'
import {
    getAssignmentSubmissions,
    getSubmissionDetail,
    gradeSubmission,
    publishAssignmentGrades,
    getSubmissionAuditLogs,
    type GradePayload,
} from './submissionApi'

describe('submissionApi tests - SCRUM-267', () => {
    describe('getAssignmentSubmissions', () => {
        it('gọi GET danh sách bài nộp và tiến độ chấm', async () => {
            const mockData = {
                assignment_id: 'asgn-1',
                total: 25,
                graded_count: 10,
                pending_count: 15,
                submissions: [],
            }
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', data: mockData }),
            })

            const res = await getAssignmentSubmissions(mockRequest, 'asgn-1')
            expect(mockRequest).toHaveBeenCalledWith('/api/v1/assignments/asgn-1/submissions', {
                method: 'GET',
            })
            expect(res.total).toBe(25)
            expect(res.graded_count).toBe(10)
        })
    })

    describe('gradeSubmission', () => {
        it('gửi POST chấm điểm bài nộp kèm lý do sửa điểm', async () => {
            const payload: GradePayload = {
                score: 8.5,
                feedback: 'Bài làm tốt',
                change_reason: 'Chấm phúc khảo',
            }
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', data: { id: 'sub-1', score: 8.5 } }),
            })

            const res = await gradeSubmission(mockRequest, 'sub-1', payload)
            expect(mockRequest).toHaveBeenCalledWith('/api/v1/submissions/sub-1/grade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            expect(res.score).toBe(8.5)
        })
    })

    describe('publishAssignmentGrades', () => {
        it('gọi POST công bố điểm bài tập cho cả lớp', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', data: { message: 'Công bố thành công', is_published: true } }),
            })

            const res = await publishAssignmentGrades(mockRequest, 'asgn-1')
            expect(mockRequest).toHaveBeenCalledWith('/api/v1/assignments/asgn-1/publish-grades', {
                method: 'POST',
            })
            expect(res.is_published).toBe(true)
        })
    })
})
