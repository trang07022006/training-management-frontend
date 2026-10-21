import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AssignmentGradingPage } from './AssignmentGradingPage'

vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        request: vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: 'success', data: {} }),
        }),
    }),
}))

describe('AssignmentGradingPage tests - SCRUM-268', () => {
    it('hiển thị danh sách học viên và tiêu đề chấm điểm', () => {
        render(<AssignmentGradingPage />)

        expect(screen.getByText('Chấm Điểm Bài Tập Theo Rubric (SCRUM-268)')).toBeInTheDocument()
        expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
        expect(screen.getByText('DTC2051001')).toBeInTheDocument()
    })

    it('hiển thị các tiêu chí chấm điểm và nút lưu kết quả', () => {
        render(<AssignmentGradingPage />)

        expect(screen.getByText(/Chất lượng mã nguồn & Kiến trúc/i)).toBeInTheDocument()
        expect(screen.getByText(/Độ hoàn thiện chức năng/i)).toBeInTheDocument()
        expect(screen.getByText('Lưu Kết Quả Chấm Điểm')).toBeInTheDocument()
    })
})
