// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

afterEach(() => {
    cleanup()
})

describe('Standardized Button Component', () => {
    it('renders with default blue variant and md size', () => {
        render(<Button>Lưu dữ liệu</Button>)
        const btn = screen.getByRole('button', { name: 'Lưu dữ liệu' })
        expect(btn).toBeDefined()
        expect(btn.className).toContain('ictu-btn')
        expect(btn.className).toContain('ictu-btn-blue')
    })

    it('renders green variant for approval actions', () => {
        render(<Button variant="green">Phê duyệt</Button>)
        const btn = screen.getByRole('button', { name: 'Phê duyệt' })
        expect(btn.className).toContain('ictu-btn-green')
    })

    it('renders red variant for delete and cancel actions', () => {
        render(<Button variant="red">Hủy bỏ</Button>)
        const btn = screen.getByRole('button', { name: 'Hủy bỏ' })
        expect(btn.className).toContain('ictu-btn-red')
    })

    it('renders orange variant for reserve actions', () => {
        render(<Button variant="orange">Bảo lưu</Button>)
        const btn = screen.getByRole('button', { name: 'Bảo lưu' })
        expect(btn.className).toContain('ictu-btn-orange')
    })

    it('renders teal variant for view and detail actions', () => {
        render(<Button variant="teal">Xem chi tiết</Button>)
        const btn = screen.getByRole('button', { name: 'Xem chi tiết' })
        expect(btn.className).toContain('ictu-btn-teal')
    })

    it('renders purple variant for sessions and structure actions', () => {
        render(<Button variant="purple">Buổi học</Button>)
        const btn = screen.getByRole('button', { name: 'Buổi học' })
        expect(btn.className).toContain('ictu-btn-purple')
    })

    it('renders gray variant for back and close actions', () => {
        render(<Button variant="gray">Quay lại</Button>)
        const btn = screen.getByRole('button', { name: 'Quay lại' })
        expect(btn.className).toContain('ictu-btn-gray')
    })

    it('renders small size for table actions', () => {
        render(<Button size="sm">Sửa</Button>)
        const btn = screen.getByRole('button', { name: 'Sửa' })
        expect(btn.className).toContain('ictu-btn-sm')
    })

    it('handles loading state with spinner and prevents click', async () => {
        const handleClick = vi.fn()
        render(
            <Button isLoading loadingText="Đang lưu..." onClick={handleClick}>
                Lưu
            </Button>
        )
        const btn = screen.getByRole('button', { name: 'Đang lưu...' })
        expect(btn).toBeDefined()
        expect((btn as HTMLButtonElement).disabled).toBe(true)
        expect(btn.getAttribute('aria-busy')).toBe('true')

        fireEvent.click(btn)
        expect(handleClick).not.toHaveBeenCalled()
    })

    it('renders left and right icons properly', () => {
        render(
            <Button icon={<span data-testid="test-icon">+</span>} iconPosition="left">
                Tạo mới
            </Button>
        )
        expect(screen.getByTestId('test-icon')).toBeDefined()
        expect(screen.getByText('Tạo mới')).toBeDefined()
    })
})
