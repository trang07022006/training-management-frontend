// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { SessionRedirect } from '../auth/SessionRedirect'
import { UnauthorizedPage } from './UnauthorizedPage'
import { useEffect } from 'react'

function TriggerSessionEnded({ code }: { code: string }) {
    const { startSession, request } = useSession()
    useEffect(() => {
        startSession({ accessToken: 'fake-acc', refreshToken: 'fake-ref' })
        request('/api/protected').catch(() => {})
    }, [code, startSession, request])
    return null
}

describe('UnauthorizedPage (SCRUM-77)', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it('1. hiển thị yêu cầu đăng nhập khi chưa có phiên (unauthenticated)', () => {
        render(
            <MemoryRouter initialEntries={['/unauthorized']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <UnauthorizedPage />
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('error-status-code').textContent).toBe('401')
        expect(screen.getByTestId('error-title').textContent).toBe('Yêu cầu đăng nhập')
        expect(screen.getByTestId('error-description').textContent).toContain('Bạn cần đăng nhập')
        const loginBtn = screen.getByTestId('error-primary-action')
        expect(loginBtn.getAttribute('href')).toBe('/login')
        expect(loginBtn.textContent).toBe('Đăng nhập')
    })

    it('2. hiển thị thông báo phiên hết hạn khi reason qua query param là SESSION_EXPIRED', () => {
        render(
            <MemoryRouter initialEntries={['/unauthorized?reason=SESSION_EXPIRED']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <UnauthorizedPage />
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('error-title').textContent).toBe('Phiên đăng nhập đã hết hạn')
        expect(screen.getByTestId('error-description').textContent).toContain('hết thời gian hiệu lực')
        const loginBtn = screen.getByTestId('error-primary-action')
        expect(loginBtn.textContent).toBe('Đăng nhập lại')
        expect(loginBtn.getAttribute('href')).toBe('/login')
    })

    it('3. hiển thị thông báo phiên kết thúc khi reason qua prop là SESSION_REVOKED', () => {
        render(
            <MemoryRouter initialEntries={['/unauthorized']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <UnauthorizedPage reason="SESSION_REVOKED" />
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('error-title').textContent).toBe('Phiên đăng nhập đã kết thúc')
        expect(screen.getByTestId('error-description').textContent).toContain('thu hồi từ thiết bị khác')
        const loginBtn = screen.getByTestId('error-primary-action')
        expect(loginBtn.textContent).toBe('Đăng nhập lại')
    })

    it('4. hiển thị đúng khi kết thúc phiên do API trả 401 SESSION_EXPIRED qua context', async () => {
        const fetcher = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ code: 'SESSION_EXPIRED' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            }),
        )
        vi.stubGlobal('fetch', fetcher)

        render(
            <MemoryRouter initialEntries={['/unauthorized']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TriggerSessionEnded code="SESSION_EXPIRED" />
                    <UnauthorizedPage />
                </SessionProvider>
            </MemoryRouter>,
        )

        const title = await screen.findByTestId('error-title')
        expect(title.textContent).toBe('Phiên đăng nhập đã hết hạn')
    })

    it('5. cho phép truyền reason trực tiếp qua props (SESSION_INVALID)', () => {
        render(
            <MemoryRouter initialEntries={['/unauthorized']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <UnauthorizedPage reason="SESSION_INVALID" />
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('error-title').textContent).toBe('Phiên đăng nhập không hợp lệ')
        expect(screen.getByTestId('error-description').textContent).toContain('Thông tin xác thực không hợp lệ')
    })

    it('6. nút quay lại hoạt động an toàn và không gây lỗi', () => {
        render(
            <MemoryRouter initialEntries={['/previous', '/unauthorized']} initialIndex={1}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <UnauthorizedPage />
                </SessionProvider>
            </MemoryRouter>,
        )

        const backBtn = screen.getByTestId('error-secondary-action')
        expect(backBtn.textContent).toBe('Quay lại')
        fireEvent.click(backBtn)
    })

    it('7. không bị redirect loop khi truy cập /unauthorized với SessionRedirect hoạt động', () => {
        render(
            <MemoryRouter initialEntries={['/unauthorized?reason=SESSION_EXPIRED']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionRedirect />
                    <Routes>
                        <Route path="/unauthorized" element={<UnauthorizedPage />} />
                        <Route path="/login" element={<div>Trang đăng nhập</div>} />
                    </Routes>
                </SessionProvider>
            </MemoryRouter>,
        )

        // Không bị tự động điều hướng sang /login gây mất ngữ cảnh thông báo lỗi của UnauthorizedPage
        expect(screen.getByTestId('error-title').textContent).toBe('Phiên đăng nhập đã hết hạn')
    })

    it('8. không hiển thị token, session id, stack trace hoặc thông tin kỹ thuật nhạy cảm', () => {
        render(
            <MemoryRouter initialEntries={['/unauthorized']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <UnauthorizedPage />
                </SessionProvider>
            </MemoryRouter>,
        )

        const container = screen.getByTestId('error-page-container')
        const html = container.innerHTML.toLowerCase()

        expect(html).not.toContain('bearer')
        expect(html).not.toContain('jwt')
        expect(html).not.toContain('session_id')
        expect(html).not.toContain('stacktrace')
        expect(html).not.toContain('traceback')
        expect(html).not.toContain('sql')
    })
})
