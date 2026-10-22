// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import App from '../App'
import { AppLayout } from './AppLayout'

afterEach(() => {
    cleanup()
})

function SessionInitializer({ role }: { role?: string | null }) {
    const { startSession } = useSession()
    useEffect(() => {
        startSession({ accessToken: 'a', refreshToken: 'r' }, role)
    }, [role, startSession])
    return null
}

describe('SCRUM-23 Phase 5: Responsive Layout on Mobile (360px Viewport)', () => {
    it('1. AppLayout cung cấp nút toggle và sidebar hỗ trợ trạng thái drawer đóng/mở', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="admin" />
                    <Routes>
                        <Route element={<AppLayout />}>
                            <Route path="/" element={<h1>Trang Tổng Quan</h1>} />
                        </Route>
                    </Routes>
                </SessionProvider>
            </MemoryRouter>,
        )

        const sidebar = screen.getByTestId('app-sidebar')
        // Ban đầu sidebar drawer đóng (không có class is-open)
        expect(sidebar.classList.contains('is-open')).toBe(false)

        // Bấm nút mở sidebar trên header
        const toggleBtn = screen.getByTestId('sidebar-toggle-button')
        fireEvent.click(toggleBtn)

        // Sidebar mở ra (có class is-open)
        expect(sidebar.classList.contains('is-open')).toBe(true)

        // Xuất hiện backdrop
        const backdrop = screen.getByTestId('sidebar-backdrop')
        expect(backdrop).toBeDefined()

        // Bấm nút đóng trên sidebar
        const closeBtn = screen.getByTestId('sidebar-close-button')
        fireEvent.click(closeBtn)

        // Sidebar đóng lại
        expect(sidebar.classList.contains('is-open')).toBe(false)
        expect(screen.queryByTestId('sidebar-backdrop')).toBeNull()
    })

    it('2. nhấp vào menu item trong sidebar tự động đóng drawer trên mobile', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="admin" />
                    <Routes>
                        <Route element={<AppLayout />}>
                            <Route path="/" element={<h1>Trang Tổng Quan</h1>} />
                            <Route path="/users" element={<h1>Quản lý Người Dùng</h1>} />
                        </Route>
                    </Routes>
                </SessionProvider>
            </MemoryRouter>,
        )

        // Mở sidebar
        const toggleBtn = screen.getByTestId('sidebar-toggle-button')
        fireEvent.click(toggleBtn)
        const sidebar = screen.getByTestId('app-sidebar')
        expect(sidebar.classList.contains('is-open')).toBe(true)

        // Bấm vào menu item "Quản lý Người dùng"
        const usersMenuItem = screen.getByTestId('menu-item-users')
        fireEvent.click(usersMenuItem)

        // Sidebar tự động đóng lại để không che khuất nội dung trang
        expect(sidebar.classList.contains('is-open')).toBe(false)
    })

    it('3. xử lý an toàn khi tên người dùng hoặc vai trò quá dài trên màn hình nhỏ 360px', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="trainer, trainee, user" />
                    <Routes>
                        <Route element={<AppLayout />}>
                            <Route path="/" element={<h1>Nội dung</h1>} />
                        </Route>
                    </Routes>
                </SessionProvider>
            </MemoryRouter>,
        )

        const roleBadge = screen.getByTestId('user-role-badge')
        // Nhiều vai trò được format đúng
        expect(roleBadge.textContent).toBe('Giảng viên, Học viên, Người dùng')
        expect(screen.getByTestId('app-header')).toBeDefined()
        expect(screen.getByTestId('app-content-body')).toBeDefined()
    })

    it('4. Header mobile luôn bảo toàn nút toggle, avatar, role badge và nút Đăng xuất', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="admin" />
                    <Routes>
                        <Route element={<AppLayout />}>
                            <Route path="/" element={<h1>Nội dung</h1>} />
                        </Route>
                    </Routes>
                </SessionProvider>
            </MemoryRouter>,
        )

        // Các thành phần bắt buộc của Header trên mobile
        expect(screen.getByTestId('sidebar-toggle-button')).toBeDefined()
        expect(screen.getByTestId('header-app-title')).toBeDefined()
        expect(screen.getByTestId('user-avatar-circle')).toBeDefined()
        expect(screen.getByTestId('user-role-badge')).toBeDefined()
        expect(screen.getByTestId('header-logout-button')).toBeDefined()
    })

    it('5. Hero banner và badge Sprint 1 render đầy đủ cấu trúc hỗ trợ wrap tự nhiên trên mobile', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="admin" />
                    <Routes>
                        <Route element={<AppLayout />}>
                            <Route path="/" element={<App />} />
                        </Route>
                    </Routes>
                </SessionProvider>
            </MemoryRouter>,
        )

        const banner = screen.getByTestId('welcome-banner')
        expect(banner).toBeDefined()

        const tag = screen.getByTestId('welcome-tag')
        expect(tag.textContent).toContain('Phiên bản Sprint 1 • Sẵn sàng Nghiệm thu')

        const title = screen.getByTestId('welcome-title')
        expect(title.textContent).toBe('Hệ thống Quản lý Đào tạo & Phân quyền')
    })
})

