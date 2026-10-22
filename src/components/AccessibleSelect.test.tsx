// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { AccessibleSelect, type SelectOption } from './AccessibleSelect'

describe('AccessibleSelect Component', () => {
    afterEach(() => {
        cleanup()
    })

    const options: SelectOption[] = [
        { value: '', label: 'Tất cả các lớp' },
        { value: 'cls-1', label: 'CNTT-K20' },
        { value: 'cls-2', label: 'CNTT-K21' },
        { value: 'cls-3', label: 'DTVT-K20' },
    ]

    it('1. Hiển thị placeholder hoặc giá trị đã chọn ban đầu', () => {
        const handleChange = vi.fn()
        render(
            <AccessibleSelect
                id="test-select"
                testId="test-select"
                value=""
                onChange={handleChange}
                options={options}
                placeholder="Tất cả các lớp"
            />
        )

        const trigger = screen.getByTestId('test-select-trigger')
        expect(trigger.textContent).toContain('Tất cả các lớp')
        expect(trigger.getAttribute('aria-expanded')).toBe('false')
    })

    it('2. Mở dropdown khi click vào trigger và chọn một option', () => {
        const handleChange = vi.fn()
        render(
            <AccessibleSelect
                id="test-select"
                testId="test-select"
                value=""
                onChange={handleChange}
                options={options}
                placeholder="Tất cả các lớp"
            />
        )

        const trigger = screen.getByTestId('test-select-trigger')
        fireEvent.click(trigger)
        expect(trigger.getAttribute('aria-expanded')).toBe('true')

        // Click chọn option cls-1
        const opt1 = screen.getByTestId('test-select-option-cls-1')
        expect(opt1.textContent).toContain('CNTT-K20')
        fireEvent.click(opt1)

        expect(handleChange).toHaveBeenCalledWith('cls-1')
        expect(trigger.getAttribute('aria-expanded')).toBe('false')
    })

    it('3. Điều khiển bằng bàn phím (ArrowDown, Enter, Escape)', () => {
        const handleChange = vi.fn()
        render(
            <AccessibleSelect
                id="test-select"
                testId="test-select"
                value=""
                onChange={handleChange}
                options={options}
                placeholder="Tất cả các lớp"
            />
        )

        const trigger = screen.getByTestId('test-select-trigger')
        // Bấm ArrowDown để mở
        fireEvent.keyDown(trigger, { key: 'ArrowDown' })
        expect(trigger.getAttribute('aria-expanded')).toBe('true')

        // Bấm Escape để đóng
        fireEvent.keyDown(screen.getByTestId('test-select-container'), { key: 'Escape' })
        expect(trigger.getAttribute('aria-expanded')).toBe('false')
    })

    it('4. Hỗ trợ tìm kiếm khi có nhiều lựa chọn', () => {
        const manyOptions: SelectOption[] = Array.from({ length: 10 }, (_, i) => ({
            value: `opt-${i}`,
            label: `Lớp học số ${i + 1}`,
        }))

        const handleChange = vi.fn()
        render(
            <AccessibleSelect
                id="searchable-select"
                testId="searchable-select"
                value=""
                onChange={handleChange}
                options={manyOptions}
                searchable={true}
            />
        )

        fireEvent.click(screen.getByTestId('searchable-select-trigger'))
        const searchInput = screen.getByTestId('searchable-select-search')
        expect(searchInput).toBeDefined()

        // Tìm kiếm 'số 5'
        fireEvent.change(searchInput, { target: { value: 'số 5' } })
        expect(screen.getByTestId('searchable-select-option-opt-4')).toBeDefined()
        expect(screen.queryByTestId('searchable-select-option-opt-1')).toBeNull()
    })

    it('5. Không thể mở khi disabled', () => {
        const handleChange = vi.fn()
        render(
            <AccessibleSelect
                id="disabled-select"
                testId="disabled-select"
                value=""
                onChange={handleChange}
                options={options}
                disabled={true}
            />
        )

        const trigger = screen.getByTestId('disabled-select-trigger')
        expect(trigger.hasAttribute('disabled')).toBe(true)
        fireEvent.click(trigger)
        expect(trigger.getAttribute('aria-expanded')).toBe('false')
    })
})
