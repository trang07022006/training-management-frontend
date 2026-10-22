// @vitest-environment jsdom
import '../setupTests'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { StudentResubmitCard } from './StudentResubmitCard'
import type { SubmissionDetailItem } from '../api/submissionApi'
import * as submissionApi from '../api/submissionApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockSubmissionNeedsRework: SubmissionDetailItem = {
    id: 'sub-student-1',
    assignment_id: 'assign-ac2',
    student_id: 'stu-1',
    student_code: 'HV001',
    student_name: 'Trần Văn Học',
    assignment_title: 'Bài tập Kiến trúc Phần mềm',
    assignment_max_score: 10,
    status: 'needs_rework',
    status_label: 'Cần làm lại',
    score: 4.5,
    feedback: 'Cần sửa đổi mô hình phân lớp',
    rework_count: 1,
    created_at: '2026-10-20T08:00:00Z',
    updated_at: '2026-10-21T08:00:00Z',
    current_rework_request: {
        id: 'req-ac2-1',
        submission_id: 'sub-student-1',
        request_number: 1,
        comment: 'Yêu cầu tách Controller và Service riêng biệt.',
        new_deadline: '2026-10-30T18:00:00Z',
        requested_by: 'trainer-1',
        status: 'open',
        created_at: '2026-10-21T08:00:00Z',
    },
    rework_history: [
        {
            id: 'req-ac2-1',
            submission_id: 'sub-student-1',
            request_number: 1,
            comment: 'Yêu cầu tách Controller và Service riêng biệt.',
            new_deadline: '2026-10-30T18:00:00Z',
            requested_by: 'trainer-1',
            status: 'open',
            created_at: '2026-10-21T08:00:00Z',
        },
    ],
    versions: [
        {
            id: 'v-1',
            submission_id: 'sub-student-1',
            version_number: 1,
            submission_type: 'repo_url',
            content: 'Nộp bài lần 1',
            repo_url: 'https://github.com/student/arch-v1',
            submitted_at: '2026-10-20T08:00:00Z',
        },
    ],
}

describe('StudentResubmitCard Component Tests (AC2)', () => {
    it('renders badge Cần làm lại, instructor comment and new deadline', () => {
        render(
            <StudentResubmitCard
                submission={mockSubmissionNeedsRework}
                requestFn={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        expect(screen.getByTestId('status-badge').textContent).toBe('Cần làm lại')
        expect(screen.getByText(/Yêu cầu tách Controller và Service riêng biệt/i)).toBeTruthy()
        expect(screen.getByText(/Hạn nộp mới:/i)).toBeTruthy()
        expect(screen.getByText(/Lịch sử các lần nộp bài/i)).toBeTruthy()
        expect(screen.getByText(/Lần nộp thứ 1/i)).toBeTruthy()
    })

    it('clicking Nộp lại bài tập opens form and submits successfully', async () => {
        const spyResubmit = vi.spyOn(submissionApi, 'resubmitAssignment').mockResolvedValue({
            ...mockSubmissionNeedsRework,
            status: 'resubmitted',
            status_label: 'Đã nộp lại',
            versions: [
                ...mockSubmissionNeedsRework.versions,
                {
                    id: 'v-2',
                    submission_id: 'sub-student-1',
                    version_number: 2,
                    submission_type: 'repo_url',
                    repo_url: 'https://github.com/student/arch-v2',
                    content: 'Đã tách service',
                    submitted_at: '2026-10-22T08:00:00Z',
                },
            ],
        })

        const mockOnSuccess = vi.fn()

        render(
            <StudentResubmitCard
                submission={mockSubmissionNeedsRework}
                requestFn={vi.fn()}
                onSuccess={mockOnSuccess}
            />
        )

        const openBtn = screen.getByRole('button', { name: /Nộp lại bài tập/i })
        fireEvent.click(openBtn)

        expect(screen.getByText(/Thông tin nộp lại \(Lần nộp thứ 2\)/i)).toBeTruthy()

        const contentInput = screen.getByPlaceholderText(/Mô tả các nội dung bạn đã chỉnh sửa/i)
        const repoInput = screen.getByPlaceholderText(/https:\/\/github.com\/username\/repository/i)

        fireEvent.change(contentInput, { target: { value: 'Đã tách service' } })
        fireEvent.change(repoInput, { target: { value: 'https://github.com/student/arch-v2' } })

        const submitBtn = screen.getByRole('button', { name: /Gửi bài nộp lại/i })
        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(spyResubmit).toHaveBeenCalledWith(
                expect.any(Function),
                'sub-student-1',
                expect.objectContaining({
                    submission_type: 'repo_url',
                    content: 'Đã tách service',
                    repo_url: 'https://github.com/student/arch-v2',
                })
            )
            expect(mockOnSuccess).toHaveBeenCalledWith(expect.objectContaining({
                status: 'resubmitted',
            }))
        })
    })

    it('shows alert and disables submit button when new deadline is overdue', () => {
        const overdueSubmission: SubmissionDetailItem = {
            ...mockSubmissionNeedsRework,
            current_rework_request: {
                ...mockSubmissionNeedsRework.current_rework_request!,
                new_deadline: '2020-01-01T00:00:00Z',
            },
        }

        render(
            <StudentResubmitCard
                submission={overdueSubmission}
                requestFn={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        const alert = screen.getByRole('alert')
        expect(alert.textContent).toContain('Đã quá hạn nộp lại bài tập theo yêu cầu của giảng viên.')
        const button = screen.getByRole('button', { name: /Nộp lại bài tập/i })
        expect(button.hasAttribute('disabled')).toBe(true)
    })
})
