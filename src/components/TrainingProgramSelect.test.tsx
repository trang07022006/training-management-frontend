// @vitest-environment jsdom

import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { TrainingProgramSelect } from './TrainingProgramSelect'
import type { TrainingProgram } from '../api/trainingProgramApi'

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const mockPrograms: TrainingProgram[] = Array.from({ length: 25 }, (_, i) => ({
    id: `prog-${i + 1}`,
    code: `CTDT${String(i + 1).padStart(3, '0')}`,
    name: `Chương trình đào tạo ${i + 1}`,
    description: `Mô tả chương trình ${i + 1}`,
    duration_semesters: 8,
    standard_tuition_fee: 10000000,
    status: 'active',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
}))

describe('TrainingProgramSelect Component', () => {
    it('1. Hiển thị placeholder mặc định khi chưa chọn chương trình', () => {
        render(
            <TrainingProgramSelect
                id="lead-program"
                value=""
                onChange={vi.fn()}
                programs={mockPrograms}
                placeholder="-- Chọn chương trình đào tạo --"
            />
        )

        expect(screen.getByTestId('lead-program-trigger').textContent).toContain(
            '-- Chọn chương trình đào tạo --'
        )
    })

    it('2. Hiển thị tên chương trình đã chọn', () => {
        render(
            <TrainingProgramSelect
                id="lead-program"
                value="prog-1"
                onChange={vi.fn()}
                programs={mockPrograms}
            />
        )

        expect(screen.getByTestId('lead-program-trigger').textContent).toContain(
            'CTDT001 - Chương trình đào tạo 1'
        )
    })

    it('3. Mở dropdown và giới hạn tối đa 10 chương trình ở trang 1 khi > 10 chương trình', () => {
        render(
            <TrainingProgramSelect
                id="lead-program"
                value=""
                onChange={vi.fn()}
                programs={mockPrograms}
            />
        )

        const trigger = screen.getByTestId('lead-program-trigger')
        fireEvent.click(trigger)

        expect(screen.getByTestId('program-select-dropdown')).toBeDefined()

        // Trang 1 phải có chương trình 1 -> 10
        expect(screen.getByTestId('program-option-prog-1')).toBeDefined()
        expect(screen.getByTestId('program-option-prog-10')).toBeDefined()

        // Chương trình 11 ở trang sau nên không xuất hiện ở trang 1 của dropdown
        expect(screen.queryByTestId('program-option-prog-11')).toBeNull()

        // Thanh phân trang phải xuất hiện vì 25 > 10
        expect(screen.getByTestId('program-select-pagination')).toBeDefined()
        expect(screen.getByText(/Trang/)).toBeDefined()
    })

    it('4. Chuyển sang trang 2 khi bấm nút Sau hoặc nút trang 2', () => {
        render(
            <TrainingProgramSelect
                id="lead-program"
                value=""
                onChange={vi.fn()}
                programs={mockPrograms}
            />
        )

        const trigger = screen.getByTestId('lead-program-trigger')
        fireEvent.click(trigger)

        // Bấm nút Sau ›
        const nextBtn = screen.getByTestId('program-page-next')
        fireEvent.click(nextBtn)

        // Trang 2 phải có chương trình 11 -> 20 trong dropdown
        expect(screen.getByTestId('program-option-prog-11')).toBeDefined()
        expect(screen.getByTestId('program-option-prog-20')).toBeDefined()
        expect(screen.queryByTestId('program-option-prog-1')).toBeNull()
    })

    it('5. Chọn chương trình và gọi hàm onChange đúng id và object', () => {
        const handleChange = vi.fn()
        render(
            <TrainingProgramSelect
                id="lead-program"
                value=""
                onChange={handleChange}
                programs={mockPrograms}
            />
        )

        const trigger = screen.getByTestId('lead-program-trigger')
        fireEvent.click(trigger)

        const option = screen.getByTestId('program-option-prog-2')
        fireEvent.click(option)

        expect(handleChange).toHaveBeenCalledWith('prog-2', mockPrograms[1])
        // Dropdown đóng lại
        expect(screen.queryByTestId('program-select-dropdown')).toBeNull()
    })

    it('6. Chọn lại placeholder để bỏ chọn chương trình', () => {
        const handleChange = vi.fn()
        render(
            <TrainingProgramSelect
                id="lead-program"
                value="prog-1"
                onChange={handleChange}
                programs={mockPrograms}
            />
        )

        const trigger = screen.getByTestId('lead-program-trigger')
        fireEvent.click(trigger)

        const defaultOption = screen.getByTestId('program-option-default')
        fireEvent.click(defaultOption)

        expect(handleChange).toHaveBeenCalledWith('', null)
    })

    it('7. Khi <= 10 chương trình thì không hiển thị thanh phân trang', () => {
        const smallList = mockPrograms.slice(0, 5)
        render(
            <TrainingProgramSelect
                id="lead-program"
                value=""
                onChange={vi.fn()}
                programs={smallList}
            />
        )

        const trigger = screen.getByTestId('lead-program-trigger')
        fireEvent.click(trigger)

        expect(screen.queryByTestId('program-select-pagination')).toBeNull()
        // 1 default option + 5 items in list
        expect(screen.getByTestId('program-option-default')).toBeDefined()
        expect(screen.getByTestId('program-option-prog-1')).toBeDefined()
    })

    it('8. Tìm kiếm chương trình theo mã hoặc tên', () => {
        render(
            <TrainingProgramSelect
                id="lead-program"
                value=""
                onChange={vi.fn()}
                programs={mockPrograms}
            />
        )

        const trigger = screen.getByTestId('lead-program-trigger')
        fireEvent.click(trigger)

        const searchInput = screen.getByTestId('program-search-input')
        fireEvent.change(searchInput, { target: { value: 'CTDT015' } })

        expect(screen.getByTestId('program-option-prog-15')).toBeDefined()
        expect(screen.queryByTestId('program-option-prog-1')).toBeNull()
    })
})
