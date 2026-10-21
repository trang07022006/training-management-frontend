import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MySubmissionViewPage } from './MySubmissionViewPage'

describe('MySubmissionViewPage tests - SCRUM-267', () => {
    it('hiển thị thông tin bài nộp của học viên', () => {
        render(<MySubmissionViewPage />)

        expect(screen.getByText('Đồ Án Tốt Nghiệp Chuyên Ngành')).toBeInTheDocument()
        expect(screen.getByText(/BaoCao_DoAn_NguyenVanAn.pdf/i)).toBeInTheDocument()
    })

    it('hiển thị điểm số khi đã được công bố', () => {
        render(<MySubmissionViewPage />)

        expect(screen.getByText(/KẾT QUẢ ĐÃ ĐƯỢC GIẢNG VIÊN CÔNG BỐ/i)).toBeInTheDocument()
        expect(screen.getByText('9')).toBeInTheDocument()
    })
})
