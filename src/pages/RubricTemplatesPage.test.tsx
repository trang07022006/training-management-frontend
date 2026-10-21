import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RubricTemplatesPage } from './RubricTemplatesPage'

// Mock useSession hook
vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        request: vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                status: 'success',
                data: [
                    {
                        id: 'rt-1',
                        name: 'Rubric Đồ Án Cuối Kỳ',
                        description: 'Đánh giá đồ án',
                        criteria: [
                            { id: 'c1', name: 'Mã nguồn', weight: 40, max_score: 10 },
                            { id: 'c2', name: 'Báo cáo', weight: 60, max_score: 10 },
                        ],
                    },
                ],
            }),
        }),
    }),
}))

describe('RubricTemplatesPage tests - SCRUM-268', () => {
    it('hiển thị tiêu đề và nút tạo mẫu rubric', async () => {
        render(<RubricTemplatesPage />)

        expect(screen.getByText('Quản lý Mẫu Rubric (SCRUM-268)')).toBeInTheDocument()
        expect(screen.getByText('+ Tạo mẫu Rubric mới')).toBeInTheDocument()
    })

    it('tải và hiển thị danh sách mẫu rubric từ API', async () => {
        render(<RubricTemplatesPage />)

        const rubricItem = await screen.findByText('Rubric Đồ Án Cuối Kỳ')
        expect(rubricItem).toBeInTheDocument()
        expect(screen.getByText('Mã nguồn')).toBeInTheDocument()
        expect(screen.getByText('40%')).toBeInTheDocument()
    })
})
