// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { QuickRoleLogin, QUICK_ROLE_ACCOUNTS } from './QuickRoleLogin'

describe('QuickRoleLogin Component', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('hiển thị đầy đủ 5 phân quyền hệ thống trong thanh đăng nhập nhanh', () => {
        expect(QUICK_ROLE_ACCOUNTS).toHaveLength(5)
        render(<QuickRoleLogin onQuickLogin={vi.fn()} onFillCredentials={vi.fn()} />)

        expect(screen.getByTestId('quick-role-section')).toBeDefined()

        // 5 role chips
        expect(screen.getByTestId('quick-chip-admin')).toBeDefined()
        expect(screen.getByTestId('quick-chip-training_manager')).toBeDefined()
        expect(screen.getByTestId('quick-chip-trainer')).toBeDefined()
        expect(screen.getByTestId('quick-chip-trainee')).toBeDefined()
        expect(screen.getByTestId('quick-chip-consultant')).toBeDefined()

        expect(screen.getByText('Quản trị viên')).toBeDefined()
        expect(screen.getByText('Quản lý đào tạo')).toBeDefined()
        expect(screen.getByText('Giảng viên')).toBeDefined()
        expect(screen.getByText('Học viên')).toBeDefined()
        expect(screen.getByText('Tư vấn viên')).toBeDefined()
    })

    it('bấm vào chip Giảng viên kích hoạt đăng nhập nhanh với đúng email và mật khẩu', () => {
        const handleLogin = vi.fn()
        render(<QuickRoleLogin onQuickLogin={handleLogin} onFillCredentials={vi.fn()} />)

        const trainerChip = screen.getByTestId('quick-chip-trainer')
        fireEvent.click(trainerChip)

        expect(handleLogin).toHaveBeenCalledTimes(1)
        expect(handleLogin).toHaveBeenCalledWith('trainer.demo@daotao.edu.vn', 'Admin@123')
    })

    it('hỗ trợ mở rộng xem chi tiết và điền form hoặc đăng nhập trực tiếp', () => {
        const handleLogin = vi.fn()
        const handleFill = vi.fn()

        render(<QuickRoleLogin onQuickLogin={handleLogin} onFillCredentials={handleFill} />)

        // Ban đầu chưa mở rộng
        expect(screen.queryByTestId('quick-role-expanded-grid')).toBeNull()

        // Bấm nút mở rộng chi tiết
        const toggleBtn = screen.getByTestId('btn-toggle-quick-role-detail')
        fireEvent.click(toggleBtn)

        expect(screen.getByTestId('quick-role-expanded-grid')).toBeDefined()
        expect(screen.getByTestId('quick-card-admin')).toBeDefined()
        expect(screen.getByText('admin@ictu.edu.vn')).toBeDefined()

        // Bấm nút "Điền form" cho Quản lý đào tạo
        const fillManagerBtn = screen.getByTestId('btn-fill-training_manager')
        fireEvent.click(fillManagerBtn)

        expect(handleFill).toHaveBeenCalledWith('manager.demo@daotao.edu.vn', 'Admin@123')

        // Bấm nút "Đăng nhập" trực tiếp cho Quản trị viên
        const directAdminBtn = screen.getByTestId('btn-direct-login-admin')
        fireEvent.click(directAdminBtn)

        expect(handleLogin).toHaveBeenCalledWith('admin@ictu.edu.vn', 'Admin@123')
    })

    it('khóa tương tác khi đang trong trạng thái loading', () => {
        const handleLogin = vi.fn()
        render(<QuickRoleLogin onQuickLogin={handleLogin} onFillCredentials={vi.fn()} isLoading={true} />)

        const adminChip = screen.getByTestId('quick-chip-admin')
        expect(adminChip.hasAttribute('disabled')).toBe(true)

        fireEvent.click(adminChip)
        expect(handleLogin).not.toHaveBeenCalled()
    })
})
