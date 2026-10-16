// @vitest-environment jsdom

import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/userAvatarApi', () => ({
    getProfileAvatarApi: vi.fn().mockRejectedValue(new Error('Avatar mock')),
    createSafeObjectUrl: vi.fn().mockReturnValue(''),
    revokeSafeObjectUrl: vi.fn(),
}))
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'

import { SessionProvider, useSession } from './SessionProvider'
import { RequireSession } from './RequireSession'
import { RequirePermission } from './RequirePermission'
import { SessionRedirect } from './SessionRedirect'
import { SessionNotice } from './SessionNotice'
import { LoginPage } from '../pages/LoginPage'
import { RoleDashboard } from '../pages/RoleDashboard'
import {
    saveStoredSession,
    loadStoredSession,
    type StoredSessionTokens,
} from './sessionStorage'

const sampleTokens: StoredSessionTokens = {
    accessToken: 'test-access-token-123',
    refreshToken: 'test-refresh-token-456',
}

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

function LocationWatcher() {
    const location = useLocation()
    const { hasSession, role, userId, isLoading } = useSession()

    return (
        <aside style={{ display: 'none' }}>
            <span data-testid="current-path">{location.pathname}</span>
            <span data-testid="current-session">{hasSession ? 'active' : 'empty'}</span>
            <span data-testid="current-role">{role ?? 'none'}</span>
            <span data-testid="current-user-id">{userId ?? 'none'}</span>
            <span data-testid="current-loading">{isLoading ? 'loading' : 'idle'}</span>
        </aside>
    )
}

function renderReloadApp(
    initialPath: string,
    customFetch?: () => Promise<Response>,
) {
    const fetcher = vi.fn<typeof fetch>()
    if (customFetch) {
        fetcher.mockImplementation(customFetch)
    } else {
        fetcher.mockImplementation(() =>
            Promise.resolve(
                jsonResponse({
                    user_id: 'sample-user',
                    idle_expires_at: '2026-10-02T15:00:00Z',
                    absolute_expires_at: '2026-10-02T22:00:00Z',
                }),
            ),
        )
    }
    vi.stubGlobal('fetch', fetcher)

    render(
        <StrictMode>
            <MemoryRouter initialEntries={[initialPath]}>
                <SessionProvider apiOrigin="https://api.daotao.test">
                    <LocationWatcher />
                    <SessionRedirect />
                    <SessionNotice />

                    <Routes>
                        <Route path="/login" element={<LoginPage />} />

                        <Route element={<RequireSession />}>
                            <Route path="/" element={<h1>Trang chủ hệ thống</h1>} />

                            <Route
                                element={
                                    <RequirePermission
                                        requiredRole="admin"
                                        fallbackPath="/forbidden"
                                    />
                                }
                            >
                                <Route path="/admin" element={<RoleDashboard role="admin" />} />
                            </Route>

                            <Route
                                element={
                                    <RequirePermission
                                        requiredRole="trainer"
                                        fallbackPath="/forbidden"
                                    />
                                }
                            >
                                <Route path="/trainer" element={<RoleDashboard role="trainer" />} />
                            </Route>

                            <Route
                                element={
                                    <RequirePermission
                                        requiredRole="trainee"
                                        fallbackPath="/forbidden"
                                    />
                                }
                            >
                                <Route path="/trainee" element={<RoleDashboard role="trainee" />} />
                            </Route>
                        </Route>

                        <Route path="/forbidden" element={<h1>Không có quyền truy cập</h1>} />
                    </Routes>
                </SessionProvider>
            </MemoryRouter>
        </StrictMode>,
    )

    return fetcher
}

beforeEach(() => {
    window.sessionStorage.clear()
    window.localStorage.clear()
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    window.sessionStorage.clear()
    window.localStorage.clear()
})

describe('SCRUM-19: Khôi phục phiên làm việc sau khi tải lại trang (Session Reload / F5)', () => {
    // 1. valid session survives page reload
    it('1. valid session survives page reload: phiên hợp lệ được bảo toàn sau khi tải lại trang', async () => {
        saveStoredSession({
            tokens: sampleTokens,
            role: 'trainer',
            userId: 'user-001',
        })

        const fetcher = renderReloadApp('/')
        fetcher.mockResolvedValueOnce(
            jsonResponse({
                user_id: 'user-001',
                idle_expires_at: '2026-10-02T15:00:00Z',
                absolute_expires_at: '2026-10-02T22:00:00Z',
            }),
        )

        await waitFor(() => {
            expect(screen.getByTestId('current-loading').textContent).toBe('idle')
        })

        expect(screen.getByTestId('current-path').textContent).toBe('/')
        expect(screen.getByTestId('current-session').textContent).toBe('active')
        expect(screen.getByRole('heading', { name: 'Trang chủ hệ thống' })).toBeDefined()
    })

    // 2. trainer reload stays /trainer
    it('2. trainer reload stays /trainer: giảng viên F5 vẫn ở lại route /trainer', async () => {
        saveStoredSession({
            tokens: sampleTokens,
            role: 'trainer',
            userId: 'trainer-123',
        })

        const fetcher = renderReloadApp('/trainer')
        fetcher.mockResolvedValueOnce(
            jsonResponse({
                user_id: 'trainer-123',
                idle_expires_at: '2026-10-02T15:00:00Z',
                absolute_expires_at: '2026-10-02T22:00:00Z',
            }),
        )

        await waitFor(() => {
            expect(screen.getByTestId('current-loading').textContent).toBe('idle')
        })

        expect(screen.getByTestId('current-path').textContent).toBe('/trainer')
        expect(screen.getByTestId('current-session').textContent).toBe('active')
        expect(screen.getByTestId('current-role').textContent).toBe('trainer')
        expect(screen.getByRole('heading', { name: 'Bảng điều khiển Giảng viên' })).toBeDefined()
    })

    // 3. trainee reload stays /trainee
    it('3. trainee reload stays /trainee: học viên F5 vẫn ở lại route /trainee', async () => {
        saveStoredSession({
            tokens: sampleTokens,
            role: 'trainee',
            userId: 'trainee-456',
        })

        const fetcher = renderReloadApp('/trainee')
        fetcher.mockResolvedValueOnce(
            jsonResponse({
                user_id: 'trainee-456',
                idle_expires_at: '2026-10-02T15:00:00Z',
                absolute_expires_at: '2026-10-02T22:00:00Z',
            }),
        )

        await waitFor(() => {
            expect(screen.getByTestId('current-loading').textContent).toBe('idle')
        })

        expect(screen.getByTestId('current-path').textContent).toBe('/trainee')
        expect(screen.getByTestId('current-session').textContent).toBe('active')
        expect(screen.getByTestId('current-role').textContent).toBe('trainee')
        expect(screen.getByRole('heading', { name: 'Bảng điều khiển Học viên' })).toBeDefined()
    })

    // 4. admin reload stays /admin
    it('4. admin reload stays /admin: quản trị viên F5 vẫn ở lại route /admin', async () => {
        saveStoredSession({
            tokens: sampleTokens,
            role: 'admin',
            userId: 'admin-789',
        })

        const fetcher = renderReloadApp('/admin')
        fetcher.mockResolvedValueOnce(
            jsonResponse({
                user_id: 'admin-789',
                idle_expires_at: '2026-10-02T15:00:00Z',
                absolute_expires_at: '2026-10-02T22:00:00Z',
            }),
        )

        await waitFor(() => {
            expect(screen.getByTestId('current-loading').textContent).toBe('idle')
        })

        expect(screen.getByTestId('current-path').textContent).toBe('/admin')
        expect(screen.getByTestId('current-session').textContent).toBe('active')
        expect(screen.getByTestId('current-role').textContent).toBe('admin')
        expect(screen.getByRole('heading', { name: 'Bảng điều khiển Quản trị viên' })).toBeDefined()
    })

    // 5. expired session reload -> /login + "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục."
    it('5. expired session reload -> /login: phiên hết hạn khi F5 chuyển về /login kèm thông báo tiếng Việt', async () => {
        saveStoredSession({
            tokens: sampleTokens,
            role: 'trainer',
            userId: 'trainer-expired',
        })

        // Backend trả 401 SESSION_EXPIRED
        renderReloadApp('/trainer', () =>
            Promise.resolve(
                jsonResponse({ code: 'SESSION_EXPIRED', message: 'Phiên đăng nhập đã hết hạn.' }, 401),
            ),
        )

        await waitFor(() => {
            expect(screen.getByTestId('current-path').textContent).toBe('/login')
        })

        expect(screen.getByTestId('current-session').textContent).toBe('empty')
        const notice = await screen.findByRole('alert')
        expect(notice.textContent).toContain('Phiên đăng nhập đã hết hạn.')
        expect(notice.textContent).toContain('Vui lòng đăng nhập lại để tiếp tục.')
        expect(loadStoredSession()).toBeNull()
    })

    // 6. revoked session reload -> /login + thông báo phiên đã kết thúc
    it('6. revoked session reload -> /login: phiên bị thu hồi khi F5 chuyển về /login kèm thông báo', async () => {
        saveStoredSession({
            tokens: sampleTokens,
            role: 'trainee',
            userId: 'trainee-revoked',
        })

        // Backend trả 401 SESSION_REVOKED
        renderReloadApp('/trainee', () =>
            Promise.resolve(
                jsonResponse({ code: 'SESSION_REVOKED', message: 'Phiên làm việc đã bị thu hồi.' }, 401),
            ),
        )

        await waitFor(() => {
            expect(screen.getByTestId('current-path').textContent).toBe('/login')
        })

        expect(screen.getByTestId('current-session').textContent).toBe('empty')
        const notice = await screen.findByRole('alert')
        expect(notice.textContent).toContain('Phiên đăng nhập đã được kết thúc.')
        expect(notice.textContent).toContain('Vui lòng đăng nhập lại để tiếp tục.')
        expect(loadStoredSession()).toBeNull()
    })

    // 7. không redirect trong lúc session đang restore
    it('7. không redirect trong lúc session đang restore: hiển thị trạng thái loading mà không redirect sớm về /login', async () => {
        saveStoredSession({
            tokens: sampleTokens,
            role: 'trainer',
            userId: 'trainer-wait',
        })

        let resolveBackendResponse!: (value: Response) => void
        const deferredPromise = new Promise<Response>((resolve) => {
            resolveBackendResponse = resolve
        })

        renderReloadApp('/trainer', () => deferredPromise)

        // Ngay khi mount, phiên đang được phục hồi:
        // Đảm bảo có loading spinner, path vẫn là /trainer, CHƯA bị chuyển sang /login
        expect(screen.getByTestId('session-loading-spinner')).toBeDefined()
        expect(screen.getByTestId('current-path').textContent).toBe('/trainer')
        expect(screen.queryByRole('heading', { name: 'Đăng nhập' })).toBeNull()

        // Sau khi backend phản hồi thành công:
        resolveBackendResponse(
            jsonResponse({
                user_id: 'trainer-wait',
                idle_expires_at: '2026-10-02T15:00:00Z',
                absolute_expires_at: '2026-10-02T22:00:00Z',
            }),
        )

        await waitFor(() => {
            expect(screen.getByTestId('current-loading').textContent).toBe('idle')
        })

        expect(screen.queryByTestId('session-loading-spinner')).toBeNull()
        expect(screen.getByTestId('current-path').textContent).toBe('/trainer')
        expect(screen.getByRole('heading', { name: 'Bảng điều khiển Giảng viên' })).toBeDefined()
    })

    // 8. role/user identity được restore đúng
    it('8. role/user identity được restore đúng: khôi phục chính xác role và userId', async () => {
        saveStoredSession({
            tokens: sampleTokens,
            role: 'trainer',
            userId: 'trainer-special-id',
        })

        renderReloadApp('/trainer', () =>
            Promise.resolve(
                jsonResponse({
                    user_id: 'trainer-special-id',
                    idle_expires_at: '2026-10-02T15:00:00Z',
                    absolute_expires_at: '2026-10-02T22:00:00Z',
                }),
            ),
        )

        await waitFor(() => {
            expect(screen.getByTestId('current-loading').textContent).toBe('idle')
        })

        expect(screen.getByTestId('current-role').textContent).toBe('trainer')
        expect(screen.getByTestId('current-user-id').textContent).toBe('trainer-special-id')
        expect(screen.getByText(/Mã tài khoản:/i)).toBeDefined()
        expect(screen.getAllByText('trainer-special-id').length).toBeGreaterThan(0)
    })
})
