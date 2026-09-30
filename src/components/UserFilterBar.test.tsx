// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { UserFilterBar } from './UserFilterBar'

afterEach(() => {
    cleanup()
})

describe('SCRUM-91: User Filter Bar Component', () => {
    it('1. render đầy đủ các trường tìm kiếm và lọc', () => {
        const handleFilterChange = vi.fn()
        render(<UserFilterBar onFilterChange={handleFilterChange} />)

        expect(screen.getByTestId('user-filter-bar')).toBeDefined()
        expect(screen.getByPlaceholderText(/Tìm theo tên, email, số điện thoại/)).toBeDefined()
        expect(screen.getByRole('combobox', { name: 'Lọc theo vai trò' })).toBeDefined()
        expect(screen.getByRole('combobox', { name: 'Lọc theo trạng thái' })).toBeDefined()
        expect(screen.getByRole('button', { name: /Tìm kiếm/ })).toBeDefined()
        expect(screen.getByRole('button', { name: /Đặt lại/ })).toBeDefined()
    })

    it('2. hiển thị giá trị ban đầu nếu truyền initialFilters', () => {
        const handleFilterChange = vi.fn()
        render(
            <UserFilterBar
                initialFilters={{ search: 'admin', role: 'admin', status: 'active' }}
                onFilterChange={handleFilterChange}
            />
        )

        const searchInput = screen.getByTestId('filter-input-search') as HTMLInputElement
        const roleSelect = screen.getByTestId('filter-select-role') as HTMLSelectElement
        const statusSelect = screen.getByTestId('filter-select-status') as HTMLSelectElement

        expect(searchInput.value).toBe('admin')
        expect(roleSelect.value).toBe('admin')
        expect(statusSelect.value).toBe('active')
        // Có nút clear search khi input có giá trị
        expect(screen.getByTestId('btn-clear-search')).toBeDefined()
    })

    it('3. submit form tìm kiếm gọi onFilterChange với từ khóa đã nhập', () => {
        const handleFilterChange = vi.fn()
        render(<UserFilterBar onFilterChange={handleFilterChange} />)

        const searchInput = screen.getByTestId('filter-input-search')
        fireEvent.change(searchInput, { target: { value: '  nguyễn văn a  ' } })

        const submitBtn = screen.getByTestId('btn-filter-submit')
        fireEvent.click(submitBtn)

        expect(handleFilterChange).toHaveBeenCalledTimes(1)
        expect(handleFilterChange).toHaveBeenCalledWith({
            search: 'nguyễn văn a',
            role: '',
            status: '',
        })
    })

    it('4. thay đổi select role kích hoạt ngay lập tức onFilterChange', () => {
        const handleFilterChange = vi.fn()
        render(<UserFilterBar onFilterChange={handleFilterChange} />)

        const roleSelect = screen.getByTestId('filter-select-role')
        fireEvent.change(roleSelect, { target: { value: 'trainer' } })

        expect(handleFilterChange).toHaveBeenCalledTimes(1)
        expect(handleFilterChange).toHaveBeenCalledWith({
            search: '',
            role: 'trainer',
            status: '',
        })
    })

    it('5. thay đổi select status kích hoạt ngay lập tức onFilterChange', () => {
        const handleFilterChange = vi.fn()
        render(<UserFilterBar onFilterChange={handleFilterChange} />)

        const statusSelect = screen.getByTestId('filter-select-status')
        fireEvent.change(statusSelect, { target: { value: 'locked' } })

        expect(handleFilterChange).toHaveBeenCalledTimes(1)
        expect(handleFilterChange).toHaveBeenCalledWith({
            search: '',
            role: '',
            status: 'locked',
        })
    })

    it('6. click nút clear search làm trống ô tìm kiếm và gọi onFilterChange', () => {
        const handleFilterChange = vi.fn()
        render(
            <UserFilterBar
                initialFilters={{ search: 'keyword', role: 'admin', status: 'active' }}
                onFilterChange={handleFilterChange}
            />
        )

        const clearBtn = screen.getByTestId('btn-clear-search')
        fireEvent.click(clearBtn)

        const searchInput = screen.getByTestId('filter-input-search') as HTMLInputElement
        expect(searchInput.value).toBe('')
        expect(handleFilterChange).toHaveBeenCalledWith({
            search: '',
            role: 'admin',
            status: 'active',
        })
    })

    it('7. click nút Đặt lại xóa toàn bộ bộ lọc về mặc định', () => {
        const handleFilterChange = vi.fn()
        render(
            <UserFilterBar
                initialFilters={{ search: 'keyword', role: 'trainer', status: 'locked' }}
                onFilterChange={handleFilterChange}
            />
        )

        const resetBtn = screen.getByTestId('btn-filter-reset')
        fireEvent.click(resetBtn)

        const searchInput = screen.getByTestId('filter-input-search') as HTMLInputElement
        const roleSelect = screen.getByTestId('filter-select-role') as HTMLSelectElement
        const statusSelect = screen.getByTestId('filter-select-status') as HTMLSelectElement

        expect(searchInput.value).toBe('')
        expect(roleSelect.value).toBe('')
        expect(statusSelect.value).toBe('')

        expect(handleFilterChange).toHaveBeenCalledWith({
            search: '',
            role: '',
            status: '',
        })
    })

    it('8. vô hiệu hóa toàn bộ điều khiển khi isLoading = true', () => {
        const handleFilterChange = vi.fn()
        render(<UserFilterBar onFilterChange={handleFilterChange} isLoading={true} />)

        const searchInput = screen.getByTestId('filter-input-search') as HTMLInputElement
        const roleSelect = screen.getByTestId('filter-select-role') as HTMLSelectElement
        const statusSelect = screen.getByTestId('filter-select-status') as HTMLSelectElement
        const submitBtn = screen.getByTestId('btn-filter-submit') as HTMLButtonElement
        const resetBtn = screen.getByTestId('btn-filter-reset') as HTMLButtonElement

        expect(searchInput.disabled).toBe(true)
        expect(roleSelect.disabled).toBe(true)
        expect(statusSelect.disabled).toBe(true)
        expect(submitBtn.disabled).toBe(true)
        expect(resetBtn.disabled).toBe(true)
    })
})
