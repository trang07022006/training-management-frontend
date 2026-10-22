import { describe, it, expect, vi } from 'vitest'
import {
    requestSubmissionRework,
    resubmitAssignment,
    getSubmissionDetail,
    getAssignmentSubmissions,
    getMySubmission,
} from './submissionApi'

describe('submissionApi client tests - SCRUM-269', () => {
    it('requestSubmissionRework sends POST with comment and new_deadline', async () => {
        const mockRequestFn = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                message: 'Yêu cầu làm lại bài tập thành công.',
                data: {
                    id: 'sub-123',
                    status: 'needs_rework',
                    rework_count: 1,
                    current_rework_request: {
                        id: 'req-1',
                        comment: 'Cần bổ sung unit test',
                        new_deadline: '2026-10-30T10:00:00Z',
                        status: 'open',
                    },
                },
            }),
        })

        const result = await requestSubmissionRework(mockRequestFn, 'sub-123', {
            comment: 'Cần bổ sung unit test',
            new_deadline: '2026-10-30T10:00:00Z',
        })

        expect(mockRequestFn).toHaveBeenCalledWith('/api/v1/submissions/sub-123/request-rework', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                comment: 'Cần bổ sung unit test',
                new_deadline: '2026-10-30T10:00:00Z',
            }),
        })
        expect(result.status).toBe('needs_rework')
        expect(result.rework_count).toBe(1)
    })

    it('requestSubmissionRework throws error when API returns failure', async () => {
        const mockRequestFn = vi.fn().mockResolvedValue({
            ok: false,
            json: async () => ({
                status: 'error',
                code: 'COMMENT_REQUIRED',
                message: 'Nhận xét yêu cầu làm lại là bắt buộc.',
            }),
        })

        await expect(
            requestSubmissionRework(mockRequestFn, 'sub-123', {
                comment: '',
                new_deadline: '2026-10-30T10:00:00Z',
            }),
        ).rejects.toThrow('Nhận xét yêu cầu làm lại là bắt buộc.')
    })

    it('resubmitAssignment sends POST with new content', async () => {
        const mockRequestFn = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                message: 'Nộp lại bài tập thành công.',
                data: {
                    id: 'sub-123',
                    status: 'resubmitted',
                    rework_count: 1,
                },
            }),
        })

        const result = await resubmitAssignment(mockRequestFn, 'sub-123', {
            submission_type: 'repo_url',
            repo_url: 'https://github.com/student/resubmitted',
        })

        expect(mockRequestFn).toHaveBeenCalledWith('/api/v1/submissions/sub-123/resubmit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                submission_type: 'repo_url',
                repo_url: 'https://github.com/student/resubmitted',
            }),
        })
        expect(result.status).toBe('resubmitted')
    })

    it('getSubmissionDetail loads full details with rework history', async () => {
        const mockRequestFn = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                data: {
                    id: 'sub-123',
                    status: 'needs_rework',
                    rework_count: 1,
                    rework_history: [
                        { id: 'req-1', request_number: 1, comment: 'Làm lại bài', status: 'open' },
                    ],
                    versions: [
                        { id: 'v-1', version_number: 1, content: 'Bài cũ' },
                    ],
                },
            }),
        })

        const result = await getSubmissionDetail(mockRequestFn, 'sub-123')
        expect(mockRequestFn).toHaveBeenCalledWith('/api/v1/submissions/sub-123', { method: 'GET' })
        expect(result.rework_history.length).toBe(1)
        expect(result.versions.length).toBe(1)
    })

    it('getAssignmentSubmissions loads submissions list for an assignment', async () => {
        const mockRequestFn = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                data: {
                    assignment_id: 'a-1',
                    assignment_title: 'Bài tập 1',
                    total: 1,
                    submissions: [],
                },
            }),
        })

        const result = await getAssignmentSubmissions(mockRequestFn, 'a-1')
        expect(mockRequestFn).toHaveBeenCalledWith('/api/v1/assignments/a-1/submissions', { method: 'GET' })
        expect(result.assignment_title).toBe('Bài tập 1')
    })

    it('getMySubmission loads student own submission', async () => {
        const mockRequestFn = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                data: {
                    id: 'sub-mine',
                    status: 'submitted',
                },
            }),
        })

        const result = await getMySubmission(mockRequestFn, 'a-1')
        expect(mockRequestFn).toHaveBeenCalledWith('/api/v1/assignments/a-1/my-submission', { method: 'GET' })
        expect(result.id).toBe('sub-mine')
    })

    it('getClassAssignments loads assignments for a class', async () => {
        const mockRequestFn = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                data: [
                    { id: 'asg-1', class_id: 'cls-1', title: 'Bài tập 1', max_score: 10 },
                ],
            }),
        })

        const { getClassAssignments } = await import('./submissionApi')
        const result = await getClassAssignments(mockRequestFn, 'cls-1')
        expect(mockRequestFn).toHaveBeenCalledWith('/api/v1/classes/cls-1/assignments', { method: 'GET' })
        expect(result.length).toBe(1)
        expect(result[0].title).toBe('Bài tập 1')
    })

    it('createAssignment sends POST to create assignment for class', async () => {
        const mockRequestFn = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                data: { id: 'asg-new', class_id: 'cls-1', title: 'Bài tập mới' },
            }),
        })

        const { createAssignment } = await import('./submissionApi')
        const result = await createAssignment(mockRequestFn, 'cls-1', {
            title: 'Bài tập mới',
            max_score: 10,
        })
        expect(mockRequestFn).toHaveBeenCalledWith('/api/v1/classes/cls-1/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Bài tập mới', max_score: 10 }),
        })
        expect(result.id).toBe('asg-new')
    })

    it('gradeSubmission sends POST to grade student submission', async () => {
        const mockRequestFn = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                data: { id: 'sub-1', score: 9.5, feedback: 'Tốt', status: 'graded' },
            }),
        })

        const { gradeSubmission } = await import('./submissionApi')
        const result = await gradeSubmission(mockRequestFn, 'sub-1', {
            score: 9.5,
            feedback: 'Tốt',
        })
        expect(mockRequestFn).toHaveBeenCalledWith('/api/v1/submissions/sub-1/grade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: 9.5, feedback: 'Tốt' }),
        })
        expect(result.score).toBe(9.5)
        expect(result.status).toBe('graded')
    })
})

