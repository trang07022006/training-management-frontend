// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { TrainerRedirect } from './TrainerRedirect'

afterEach(() => {
    cleanup()
})

function SessionInitializer({
    role,
    roles,
    permissions,
}: {
    role?: string
    roles?: string[]
    permissions?: string[]
}) {
    const { startSession } = useSession()
    useEffect(() => {
        startSession(
            { accessToken: 'test-tok', refreshToken: 'test-ref' },
            role,
            'uid-1',
            false,
            'Test User',
            'test@ictu.edu.vn',
            roles ?? (role ? [role] : []),
            permissions,
        )
    }, [role, roles, permissions, startSession])
    return null
}

function LocationWatcher() {
    const location = useLocation()
    return <div data-testid="current-path">{location.pathname}</div>
}

function renderAppWithTrainer(role?: string, roles?: string[], permissions?: string[], initialUrl = '/trainer') {
    return render(
        <MemoryRouter initialEntries={[initialUrl]}>
            <SessionProvider apiOrigin="http://localhost:5000">
                {role !== undefined && (
                    <SessionInitializer role={role} roles={roles} permissions={permissions} />
                )}
                <LocationWatcher />
                <Routes>
                    <Route path="/login" element={<div data-testid="page-login">Trang Đăng Nhập</div>} />
                    <Route path="/trainer" element={<TrainerRedirect />} />
                    <Route path="/my-schedule" element={<div data-testid="page-my-schedule">Lịch Giảng Dạy Của Tôi</div>} />
                    <Route path="/dashboard" element={<div data-testid="page-dashboard">Trang Tổng Quan</div>} />
                </Routes>
            </SessionProvider>
        </MemoryRouter>,
    )
}

describe('TrainerRedirect: Chuyển hướng an toàn từ /trainer', () => {
    it('1. Chưa đăng nhập -> chuyển hướng về /login với replace', async () => {
        renderAppWithTrainer(undefined)
        expect(await screen.findByTestId('page-login')).toBeDefined()
        expect(screen.getByTestId('current-path').textContent).toBe('/login')
    })

    it('2. Tài khoản có quyền schedule.personal_view (Giảng viên / Trainer) -> chuyển hướng sang /my-schedule', async () => {
        renderAppWithTrainer('trainer', ['trainer'], ['schedule.personal_view', 'course.view', 'course.manage'])
        expect(await screen.findByTestId('page-my-schedule')).toBeDefined()
        expect(screen.getByTestId('current-path').textContent).toBe('/my-schedule')
    })

    it('3. Giảng viên không truyền explicit permissions (dùng role trainer mặc định) -> chuyển hướng sang /my-schedule', async () => {
        renderAppWithTrainer('trainer', ['trainer'])
        expect(await screen.findByTestId('page-my-schedule')).toBeDefined()
        expect(screen.getByTestId('current-path').textContent).toBe('/my-schedule')
    })

    it('4. Tài khoản KHÔNG có quyền schedule.personal_view (Admin) -> chuyển về trang Tổng quan hợp lệ (/dashboard)', async () => {
        renderAppWithTrainer('admin', ['admin'], ['user.view', 'schedule.view', 'schedule.manage'])
        expect(await screen.findByTestId('page-dashboard')).toBeDefined()
        expect(screen.getByTestId('current-path').textContent).toBe('/dashboard')
    })

    it('5. Người dùng thường (user) không có quyền schedule.personal_view -> fallback về /dashboard', async () => {
        renderAppWithTrainer('user', ['user'], [])
        expect(await screen.findByTestId('page-dashboard')).toBeDefined()
        expect(screen.getByTestId('current-path').textContent).toBe('/dashboard')
    })

    it('6. Tài khoản nhiều vai trò [trainer, consultant] có schedule.personal_view -> chuyển sang /my-schedule', async () => {
        renderAppWithTrainer('consultant', ['consultant', 'trainer'])
        expect(await screen.findByTestId('page-my-schedule')).toBeDefined()
        expect(screen.getByTestId('current-path').textContent).toBe('/my-schedule')
    })

    it('7. Tài khoản nhiều vai trò [admin, consultant] KHÔNG có schedule.personal_view -> chuyển về /dashboard', async () => {
        renderAppWithTrainer('admin', ['admin', 'consultant'])
        expect(await screen.findByTestId('page-dashboard')).toBeDefined()
        expect(screen.getByTestId('current-path').textContent).toBe('/dashboard')
    })
})
