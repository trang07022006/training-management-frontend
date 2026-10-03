// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { AppHeader } from './AppHeader'

afterEach(() => {
    cleanup()
})

function SessionInitializer({
    role,
    userId = 'user-test-id',
}: {
    role?: string | null
    userId?: string
}) {
    const { startSession, verifySessionUser } = useSession()
    useEffect(() => {
        startSession({ accessToken: 'a', refreshToken: 'r' }, role)
        // Mock session user
        vi.spyOn(window, 'fetch').mockImplementation(() =>
            Promise.resolve(new Response(JSON.stringify({ user_id: userId }), { status: 200 })),
        )
        verifySessionUser().catch(() => {})
    }, [role, userId, startSession, verifySessionUser])
    return null
}

describe('SCRUM-23 Phase 3: AppHeader Identity and Role', () => {
    it('1. render tên người dùng và vai trò khi có session', () => {
        render(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="admin" />
                    <AppHeader userName="Trần Văn Admin" />
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('user-display-name').textContent).toBe('Trần Văn Admin')
        expect(screen.getByTestId('user-role-badge').textContent).toBe('Quản trị viên')
    })

    it('2. hiển thị đúng các vai trò khác nhau (Trainer, Trainee, User)', () => {
        const { unmount } = render(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="trainer" />
                    <AppHeader userEmail="trainer@daotao.edu.vn" />
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('user-display-name').textContent).toBe('trainer@daotao.edu.vn')
        expect(screen.getByTestId('user-role-badge').textContent).toBe('Giảng viên')
        unmount()

        render(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="trainee" />
                    <AppHeader userName="Lê Học Viên" />
                </SessionProvider>
            </MemoryRouter>,
        )
        expect(screen.getByTestId('user-role-badge').textContent).toBe('Học viên')
    })

    it('3. chưa đăng nhập (unauthenticated) -> AppHeader không render', () => {
        render(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    {/* Không gọi SessionInitializer */}
                    <AppHeader userName="Guest" />
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.queryByTestId('app-header')).toBeNull()
    })

    it('4. fallback tên hiển thị khi thiếu name (sử dụng userId hoặc Người dùng)', async () => {
        render(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="user" userId="u-999" />
                    <AppHeader />
                </SessionProvider>
            </MemoryRouter>,
        )

        const displayName = screen.getByTestId('user-display-name')
        // Ban đầu hoặc sau khi verifySessionUser nhận u-999 hoặc Người dùng
        expect(['u-999', 'Người dùng']).toContain(displayName.textContent)
    })

    it('5. kích hoạt callback toggle sidebar khi bấm nút toggle trên header', () => {
        const handleToggle = vi.fn()

        render(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="admin" />
                    <AppHeader onToggleSidebar={handleToggle} />
                </SessionProvider>
            </MemoryRouter>,
        )

        const toggleBtn = screen.getByTestId('sidebar-toggle-button')
        expect(toggleBtn).toBeDefined()
        fireEvent.click(toggleBtn)
        expect(handleToggle).toHaveBeenCalledTimes(1)
    })

    it('6. bấm nút Đăng xuất sẽ kích hoạt clearSession', () => {
        render(
            <MemoryRouter>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="admin" />
                    <AppHeader />
                </SessionProvider>
            </MemoryRouter>,
        )

        const logoutBtn = screen.getByTestId('header-logout-button')
        expect(logoutBtn).toBeDefined()
        fireEvent.click(logoutBtn)
        // Sau khi clearSession, hasSession = false -> AppHeader không render
        expect(screen.queryByTestId('app-header')).toBeNull()
    })
})
