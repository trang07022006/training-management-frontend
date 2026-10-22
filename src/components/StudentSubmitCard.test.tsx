// @vitest-environment jsdom
import '../setupTests'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { StudentSubmitCard } from './StudentSubmitCard'
import type { SubmissionDetailItem } from '../api/submissionApi'
import * as submissionApi from '../api/submissionApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockCreatedSubmission: SubmissionDetailItem = {
    id: 'sub-new-1',
    assignment_id: 'asg-test-1',
    student_id: 'stu-1',
    student_code: 'HV001',
    student_name: 'Lê Thu Trang',
    assignment_title: 'Bài tập Lập trình Web',
    assignment_max_score: 10,
    status: 'submitted',
    status_label: 'Đã nộp bài',
    score: null,
    rework_count: 0,
    created_at: '2026-10-22T08:00:00Z',
    updated_at: '2026-10-22T08:00:00Z',
    rework_history: [],
    versions: [
        {
            id: 'v-1',
            submission_id: 'sub-new-1',
            version_number: 1,
            submission_type: 'repo_url',
            repo_url: 'https://github.com/trang/web-api',
            submitted_at: '2026-10-22T08:00:00Z',
        },
    ],
}

describe('StudentSubmitCard Component Tests', () => {
    const mockRequestFn = vi.fn()

    it('renders submit card with title and default repo_url input', () => {
        render(
            <StudentSubmitCard
                assignmentId="asg-test-1"
                assignmentTitle="Bài tập Lập trình Web"
                maxScore={10}
                requestFn={mockRequestFn}
                onSuccess={vi.fn()}
            />
        )

        expect(screen.getByText('📤 Nộp Bài Tập Cho Lớp')).toBeTruthy()
        expect(screen.getByText(/Bài tập Lập trình Web/)).toBeTruthy()
        expect(screen.getByPlaceholderText('https://github.com/username/project-repository')).toBeTruthy()
        expect(screen.getByRole('button', { name: /Nộp bài tập/i })).toBeTruthy()
    })

    it('shows error if submitted without repository URL', async () => {
        render(
            <StudentSubmitCard
                assignmentId="asg-test-1"
                assignmentTitle="Bài tập Lập trình Web"
                requestFn={mockRequestFn}
                onSuccess={vi.fn()}
            />
        )

        const submitBtn = screen.getByRole('button', { name: /Nộp bài tập/i })
        fireEvent.click(submitBtn)

        expect(
            await screen.findByText('Vui lòng nhập liên kết kho mã nguồn (GitHub / GitLab).')
        ).toBeTruthy()
    })

    it('submits successfully when repository url is filled', async () => {
        const handleSuccess = vi.fn()
        vi.spyOn(submissionApi, 'submitAssignment').mockResolvedValue(mockCreatedSubmission)

        render(
            <StudentSubmitCard
                assignmentId="asg-test-1"
                assignmentTitle="Bài tập Lập trình Web"
                requestFn={mockRequestFn}
                onSuccess={handleSuccess}
            />
        )

        const inputRepo = screen.getByPlaceholderText('https://github.com/username/project-repository')
        fireEvent.change(inputRepo, { target: { value: 'https://github.com/trang/web-api' } })

        const submitBtn = screen.getByRole('button', { name: /Nộp bài tập/i })
        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(submissionApi.submitAssignment).toHaveBeenCalledWith(
                mockRequestFn,
                'asg-test-1',
                expect.objectContaining({
                    submission_type: 'repo_url',
                    repo_url: 'https://github.com/trang/web-api',
                })
            )
            expect(handleSuccess).toHaveBeenCalledWith(mockCreatedSubmission)
        })
    })

    it('switches to text content mode and validates text content', async () => {
        render(
            <StudentSubmitCard
                assignmentId="asg-test-1"
                assignmentTitle="Bài tập Lập trình Web"
                requestFn={mockRequestFn}
                onSuccess={vi.fn()}
            />
        )

        const textModeBtn = screen.getByRole('button', { name: /Nội dung văn bản/i })
        fireEvent.click(textModeBtn)

        const submitBtn = screen.getByRole('button', { name: /Nộp bài tập/i })
        fireEvent.click(submitBtn)

        expect(
            await screen.findByText('Vui lòng nhập nội dung bài làm của bạn.')
        ).toBeTruthy()
    })
})
