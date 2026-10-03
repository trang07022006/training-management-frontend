// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { UserPagination } from './UserPagination'

afterEach(() => {
    cleanup()
})

describe('SCRUM-25: User Pagination Component (10 users / page)', () => {
    it('1. 10 user -> 1 trang, hiển thị 1 - 10 trên 10, nút Trước và Sau đều disabled', () => {
        const handlePageChange = vi.fn()
        render(
            <UserPagination
                page={1}
                pageSize={10}
                total={10}
                onPageChange={handlePageChange}
            />
        )

        const info = screen.getByTestId('pagination-info')
        expect(info.textContent).toBe('Hiển thị 1 - 10 trên tổng số 10 người dùng')

        const prevBtn = screen.getByTestId('btn-pagination-prev') as HTMLButtonElement
        const nextBtn = screen.getByTestId('btn-pagination-next') as HTMLButtonElement

        expect(prevBtn.disabled).toBe(true)
        expect(nextBtn.disabled).toBe(true)
        expect(screen.getByTestId('btn-page-1')).toBeDefined()
        expect(screen.queryByTestId('btn-page-2')).toBeNull()
    })

    it('2. 11 user -> 2 trang: Trang 1 hiển thị 1 - 10 trên 11, Trước disabled, Sau enabled', () => {
        const handlePageChange = vi.fn()
        render(
            <UserPagination
                page={1}
                pageSize={10}
                total={11}
                onPageChange={handlePageChange}
            />
        )

        const info = screen.getByTestId('pagination-info')
        expect(info.textContent).toBe('Hiển thị 1 - 10 trên tổng số 11 người dùng')

        const prevBtn = screen.getByTestId('btn-pagination-prev') as HTMLButtonElement
        const nextBtn = screen.getByTestId('btn-pagination-next') as HTMLButtonElement

        expect(prevBtn.disabled).toBe(true)
        expect(nextBtn.disabled).toBe(false)

        expect(screen.getByTestId('btn-page-1')).toBeDefined()
        expect(screen.getByTestId('btn-page-2')).toBeDefined()

        // Bấm nút Sau chuyển sang trang 2
        fireEvent.click(nextBtn)
        expect(handlePageChange).toHaveBeenCalledWith(2)
    })

    it('3. 11 user -> 2 trang: Trang 2 hiển thị 11 - 11 trên 11, Trước enabled, Sau disabled', () => {
        const handlePageChange = vi.fn()
        render(
            <UserPagination
                page={2}
                pageSize={10}
                total={11}
                onPageChange={handlePageChange}
            />
        )

        const info = screen.getByTestId('pagination-info')
        expect(info.textContent).toBe('Hiển thị 11 - 11 trên tổng số 11 người dùng')

        const prevBtn = screen.getByTestId('btn-pagination-prev') as HTMLButtonElement
        const nextBtn = screen.getByTestId('btn-pagination-next') as HTMLButtonElement

        expect(prevBtn.disabled).toBe(false)
        expect(nextBtn.disabled).toBe(true)

        // Bấm nút Trước chuyển về trang 1
        fireEvent.click(prevBtn)
        expect(handlePageChange).toHaveBeenCalledWith(1)
    })

    it('4. 21 user -> 3 trang, hiển thị đúng các nút số trang', () => {
        const handlePageChange = vi.fn()
        render(
            <UserPagination
                page={2}
                pageSize={10}
                total={21}
                onPageChange={handlePageChange}
            />
        )

        const info = screen.getByTestId('pagination-info')
        expect(info.textContent).toBe('Hiển thị 11 - 20 trên tổng số 21 người dùng')

        expect(screen.getByTestId('btn-page-1')).toBeDefined()
        expect(screen.getByTestId('btn-page-2')).toBeDefined()
        expect(screen.getByTestId('btn-page-3')).toBeDefined()

        const prevBtn = screen.getByTestId('btn-pagination-prev') as HTMLButtonElement
        const nextBtn = screen.getByTestId('btn-pagination-next') as HTMLButtonElement
        expect(prevBtn.disabled).toBe(false)
        expect(nextBtn.disabled).toBe(false)

        // Click trang 3
        fireEvent.click(screen.getByTestId('btn-page-3'))
        expect(handlePageChange).toHaveBeenCalledWith(3)
    })

    it('5. total = 0 không render component phân trang', () => {
        const handlePageChange = vi.fn()
        const { container } = render(
            <UserPagination
                page={1}
                pageSize={10}
                total={0}
                onPageChange={handlePageChange}
            />
        )

        expect(container.firstChild).toBeNull()
    })
})
