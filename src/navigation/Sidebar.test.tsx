// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
    cleanup()
})
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { Sidebar } from './Sidebar'
import type { MenuItem } from './menuConfig'

function SessionInitializer({ role }: { role?: string | null }) {
    const { startSession } = useSession()
    useEffect(() => {
        startSession({ accessToken: 'test-acc', refreshToken: 'test-ref' }, role)
    }, [role, startSession])
    return null
}

describe('SCRUM-23 Phase 2: Sidebar theo Permission', () => {
    it('1. role Admin thấy đúng menu của Admin (Tổng quan, Quản lý Người dùng, Chương trình đào tạo, Đổi mật khẩu) và không thấy Trainer/Trainee hay Bảng quản trị/Khóa học cũ', () => {
        render(
            <MemoryRouter initialEntries={['/users']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="admin" />
                    <Sidebar />
                </SessionProvider>
            </MemoryRouter>,
        )

        // Admin thấy: Tổng quan, Quản lý Người dùng, Chương trình đào tạo, Môn học, Thời khóa biểu, Đổi mật khẩu
        expect(screen.getByTestId('menu-item-overview')).toBeDefined()
        expect(screen.getByTestId('menu-item-users')).toBeDefined()
        expect(screen.getByTestId('menu-item-training_programs')).toBeDefined()
        expect(screen.getByTestId('menu-item-schedules_calendar')).toBeDefined()
        expect(screen.getByTestId('menu-item-change_password')).toBeDefined()

        // Admin không thấy: Bảng quản trị cũ, Khóa học mẫu cũ, Không gian Giảng viên, Góc Học viên, Lịch học của tôi
        expect(screen.queryByTestId('menu-item-admin_dashboard')).toBeNull()
        expect(screen.queryByTestId('menu-item-courses')).toBeNull()
        expect(screen.queryByTestId('menu-item-trainer_dashboard')).toBeNull()
        expect(screen.queryByTestId('menu-item-trainee_dashboard')).toBeNull()
        expect(screen.queryByTestId('menu-item-my_schedule')).toBeNull()
    })

    it('2. role Trainer thấy Không gian Giảng viên, Chương trình đào tạo, Thời khóa biểu và Lịch giảng dạy của tôi', () => {
        render(
            <MemoryRouter initialEntries={['/trainer']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="trainer" />
                    <Sidebar />
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('menu-item-overview')).toBeDefined()
        expect(screen.getByTestId('menu-item-trainer_dashboard')).toBeDefined()
        expect(screen.getByTestId('menu-item-training_programs')).toBeDefined()
        expect(screen.getByTestId('menu-item-schedules_calendar')).toBeDefined()
        expect(screen.getByTestId('menu-item-my_schedule')).toBeDefined()
        expect(screen.getByTestId('menu-item-my_schedule').textContent).toContain('Lịch giảng dạy của tôi')
        expect(screen.getByTestId('menu-item-change_password')).toBeDefined()

        expect(screen.queryByTestId('menu-item-courses')).toBeNull()
        expect(screen.queryByTestId('menu-item-admin_dashboard')).toBeNull()
        expect(screen.queryByTestId('menu-item-users')).toBeNull()
        expect(screen.queryByTestId('menu-item-trainee_dashboard')).toBeNull()
    })

    it('3. role Trainee thấy Góc Học viên, Chương trình đào tạo, Lịch học của tôi và không thấy menu Admin/Trainer, Thời khóa biểu quản lý', () => {
        render(
            <MemoryRouter initialEntries={['/trainee']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="trainee" />
                    <Sidebar />
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('menu-item-overview')).toBeDefined()
        expect(screen.getByTestId('menu-item-trainee_dashboard')).toBeDefined()
        expect(screen.getByTestId('menu-item-training_programs')).toBeDefined()
        expect(screen.getByTestId('menu-item-my_schedule')).toBeDefined()
        expect(screen.getByTestId('menu-item-my_schedule').textContent).toContain('Lịch học của tôi')

        expect(screen.queryByTestId('menu-item-schedules_calendar')).toBeNull()
        expect(screen.queryByTestId('menu-item-courses')).toBeNull()
        expect(screen.queryByTestId('menu-item-admin_dashboard')).toBeNull()
        expect(screen.queryByTestId('menu-item-users')).toBeNull()
        expect(screen.queryByTestId('menu-item-trainer_dashboard')).toBeNull()
    })

    it('4. user thông thường không có quyền restricted thì không thấy các menu quản trị', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="user" />
                    <Sidebar />
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('menu-item-overview')).toBeDefined()
        expect(screen.getByTestId('menu-item-change_password')).toBeDefined()

        // User thông thường không có quyền xem khóa học hay dashboard chuyên biệt hoặc quản lý người dùng
        expect(screen.queryByTestId('menu-item-admin_dashboard')).toBeNull()
        expect(screen.queryByTestId('menu-item-users')).toBeNull()
        expect(screen.queryByTestId('menu-item-trainer_dashboard')).toBeNull()
        expect(screen.queryByTestId('menu-item-trainee_dashboard')).toBeNull()
        expect(screen.queryByTestId('menu-item-courses')).toBeNull()
    })

    it('5. active item được đánh dấu đúng class và thuộc tính aria-current', () => {
        render(
            <MemoryRouter initialEntries={['/users']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="admin" />
                    <Sidebar />
                </SessionProvider>
            </MemoryRouter>,
        )

        const activeLink = screen.getByTestId('menu-item-users')
        expect(activeLink.classList.contains('is-active')).toBe(true)
        expect(activeLink.getAttribute('aria-current')).toBe('page')

        const inactiveLink = screen.getByTestId('menu-item-overview')
        expect(inactiveLink.classList.contains('is-active')).toBe(false)
        expect(inactiveLink.getAttribute('aria-current')).toBeNull()
    })

    it('6. chưa có session -> không flash bất kỳ menu nào', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    {/* Không gọi SessionInitializer */}
                    <Sidebar />
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.queryByTestId('menu-item-overview')).toBeNull()
        expect(screen.queryByTestId('menu-item-admin_dashboard')).toBeNull()
        expect(screen.queryByTestId('menu-item-courses')).toBeNull()
    })

    it('7. tương tác đóng mở sidebar trên thiết bị di động', () => {
        const handleClose = vi.fn()

        render(
            <MemoryRouter initialEntries={['/']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="admin" />
                    <Sidebar isOpen={true} onClose={handleClose} />
                </SessionProvider>
            </MemoryRouter>,
        )

        const closeBtn = screen.getByTestId('sidebar-close-button')
        expect(closeBtn).toBeDefined()
        fireEvent.click(closeBtn)
        expect(handleClose).toHaveBeenCalledTimes(1)

        const backdrop = screen.getByTestId('sidebar-backdrop')
        expect(backdrop).toBeDefined()
        fireEvent.click(backdrop)
        expect(handleClose).toHaveBeenCalledTimes(2)
    })

    it('8. unknown permission không làm crash component', () => {
        const corruptedItems: readonly MenuItem[] = [
            { key: 'unknown', label: 'Lỗi', path: '/err', requiredPermission: 'nonexistent.perm' },
        ]

        expect(() => {
            render(
                <MemoryRouter initialEntries={['/']}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <SessionInitializer role="admin" />
                        <Sidebar customMenuItems={corruptedItems} />
                    </SessionProvider>
                </MemoryRouter>,
            )
        }).not.toThrow()

        expect(screen.queryByTestId('menu-item-unknown')).toBeNull()
    })

    it('9. SCRUM-217: Quản lý đào tạo (training_manager) và Admin thấy menu Lớp học (/classes)', () => {
        render(
            <MemoryRouter initialEntries={['/classes']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="training_manager" />
                    <Sidebar />
                </SessionProvider>
            </MemoryRouter>,
        )

        const classMenu = screen.getByTestId('menu-item-classes')
        expect(classMenu).toBeDefined()
        expect(classMenu.textContent).toContain('Lớp học')
        expect(classMenu.getAttribute('href')).toBe('/classes')
        expect(classMenu.classList.contains('is-active')).toBe(true)

        // Các menu khác vẫn tồn tại đầy đủ, menu cũ courses không tồn tại
        expect(screen.queryByTestId('menu-item-courses')).toBeNull()
        expect(screen.getByTestId('menu-item-training_programs')).toBeDefined()
        expect(screen.getByTestId('menu-item-subjects')).toBeDefined()
        expect(screen.getByTestId('menu-item-students')).toBeDefined()
        expect(screen.getByTestId('menu-item-leads')).toBeDefined()
    })
})
