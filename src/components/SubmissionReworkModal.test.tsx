// @vitest-environment jsdom
import '../setupTests'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { SubmissionReworkModal } from './SubmissionReworkModal'
import type { SubmissionDetailItem } from '../api/submissionApi'
import * as submissionApi from '../api/submissionApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockSubmission: SubmissionDetailItem = {
    id: 'sub-test-1',
    assignment_id: 'assign-1',
    student_id: 'stu-1',
    student_code: 'HV001',
    student_name: 'Nguyễn Văn Test',
    assignment_title: 'Bài tập React TypeScript',
    assignment_max_score: 10,
    status: 'submitted',
    status_label: 'Đã nộp',
    score: null,
    rework_count: 0,
    created_at: '2026-10-20T08:00:00Z',
    updated_at: '2026-10-20T08:00:00Z',
    rework_history: [],
    versions: [
        {
            id: 'v-1',
            submission_id: 'sub-test-1',
            version_number: 1,
            submission_type: 'text',
            content: 'Nội dung nộp',
            submitted_at: '2026-10-20T08:00:00Z',
        },
    ],
}

describe('SubmissionReworkModal Component Tests (AC1)', () => {
    it('does not render when isOpen is false', () => {
        const { container } = render(
            <SubmissionReworkModal
                isOpen={false}
                onClose={vi.fn()}
                submission={mockSubmission}
                requestFn={vi.fn()}
                onSuccess={vi.fn()}
            />
        )
        expect(container.firstChild).toBeNull()
    })

    it('renders modal with read-only student and assignment info', () => {
        render(
            <SubmissionReworkModal
                isOpen={true}
                onClose={vi.fn()}
                submission={mockSubmission}
                requestFn={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        expect(screen.getByText(/Yêu cầu làm lại bài tập/i)).toBeTruthy()
        expect(screen.getByText(/Nguyễn Văn Test/i)).toBeTruthy()
        expect(screen.getByText(/HV001/i)).toBeTruthy()
        expect(screen.getByText(/Bài tập React TypeScript/i)).toBeTruthy()
        expect(screen.getByText(/Lần nộp thứ 1/i)).toBeTruthy()
    })

    it('shows validation error when comment is empty or spaces', async () => {
        render(
            <SubmissionReworkModal
                isOpen={true}
                onClose={vi.fn()}
                submission={mockSubmission}
                requestFn={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        const submitBtn = screen.getByRole('button', { name: /Xác nhận yêu cầu làm lại/i })
        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(screen.getByText('Nhận xét yêu cầu làm lại là bắt buộc.')).toBeTruthy()
            expect(screen.getByText('Vui lòng chọn hạn nộp mới.')).toBeTruthy()
        })
    })

    it('submits successfully when comment and future deadline are valid', async () => {
        const spyRequest = vi.spyOn(submissionApi, 'requestSubmissionRework').mockResolvedValue({
            ...mockSubmission,
            status: 'needs_rework',
            rework_count: 1,
        })

        const mockOnSuccess = vi.fn()
        const mockOnClose = vi.fn()

        render(
            <SubmissionReworkModal
                isOpen={true}
                onClose={mockOnClose}
                submission={mockSubmission}
                requestFn={vi.fn()}
                onSuccess={mockOnSuccess}
            />
        )

        const commentInput = screen.getByPlaceholderText(/Nhập chi tiết các lỗi cần sửa/i)
        const deadlineInput = screen.getByLabelText(/Hạn nộp lại mới/i)

        fireEvent.change(commentInput, { target: { value: 'Bổ sung thêm component test cho modal' } })
        fireEvent.change(deadlineInput, { target: { value: '2026-10-30T18:00' } })

        const submitBtn = screen.getByRole('button', { name: /Xác nhận yêu cầu làm lại/i })
        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(spyRequest).toHaveBeenCalled()
            expect(mockOnSuccess).toHaveBeenCalledWith(expect.objectContaining({
                status: 'needs_rework',
                rework_count: 1,
            }))
            expect(mockOnClose).toHaveBeenCalled()
        })
    })

    it('shows API error message when request fails', async () => {
        vi.spyOn(submissionApi, 'requestSubmissionRework').mockRejectedValue(
            new Error('Bài nộp đang có một yêu cầu làm lại chưa hoàn thành.')
        )

        render(
            <SubmissionReworkModal
                isOpen={true}
                onClose={vi.fn()}
                submission={mockSubmission}
                requestFn={vi.fn()}
                onSuccess={vi.fn()}
            />
        )

        const commentInput = screen.getByPlaceholderText(/Nhập chi tiết các lỗi cần sửa/i)
        const deadlineInput = screen.getByLabelText(/Hạn nộp lại mới/i)

        fireEvent.change(commentInput, { target: { value: 'Yêu cầu trùng lặp' } })
        fireEvent.change(deadlineInput, { target: { value: '2026-10-30T18:00' } })

        const submitBtn = screen.getByRole('button', { name: /Xác nhận yêu cầu làm lại/i })
        fireEvent.click(submitBtn)

        await waitFor(() => {
            const alert = screen.getByRole('alert')
            expect(alert.textContent).toContain('Bài nộp đang có một yêu cầu làm lại chưa hoàn thành.')
        })
    })
})
