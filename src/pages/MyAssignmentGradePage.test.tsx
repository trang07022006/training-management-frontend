import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyAssignmentGradePage } from './MyAssignmentGradePage'

describe('MyAssignmentGradePage tests - SCRUM-268', () => {
    it('hiển thị điểm tổng kết và xếp loại học lực của học viên', () => {
        render(<MyAssignmentGradePage />)

        expect(screen.getByText('Báo Cáo Đồ Án Chuyên Ngành')).toBeInTheDocument()
        expect(screen.getByText('8.45')).toBeInTheDocument()
        expect(screen.getByText('Giỏi')).toBeInTheDocument()
    })

    it('hiển thị chi tiết từng tiêu chí và lời giải thích vì sao mất điểm', () => {
        render(<MyAssignmentGradePage />)

        expect(screen.getByText(/Chất lượng Mã Nguồn & Kiến Trúc/i)).toBeInTheDocument()
        expect(screen.getByText(/Bị trừ 1.5 điểm vì chưa viết đủ comment/i)).toBeInTheDocument()
    })
})
