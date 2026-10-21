import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpeedGradingPage } from './SpeedGradingPage'

vi.mock('../auth/SessionProvider', () => ({
    useSession: () => ({
        request: vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ status: 'success', data: {} }),
        }),
    }),
}))

describe('SpeedGradingPage tests - SCRUM-267', () => {
    it('hiển thị thanh công cụ chấm điểm tốc độ cao và nút công bố', () => {
        render(<SpeedGradingPage />)

        expect(screen.getByText('Chấm Điểm Bài Nộp Tốc Độ Cao (SCRUM-267)')).toBeInTheDocument()
        expect(screen.getByText('📢 Công Bố Điểm Cả Lớp')).toBeInTheDocument()
    })

    it('hiển thị nút chuyển nhanh sang bài kế tiếp', () => {
        render(<SpeedGradingPage />)

        expect(screen.getByText(/Lưu & Sang Bài Kế Tiếp/i)).toBeInTheDocument()
        expect(screen.getByText(/Bài 2 \/ 25/i)).toBeInTheDocument()
    })

    it('hiển thị nút mở liên kết repository GitHub', () => {
        render(<SpeedGradingPage />)

        expect(screen.getByText(/↗ Mở Repo GitHub/i)).toBeInTheDocument()
    })
})
