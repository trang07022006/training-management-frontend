// @vitest-environment jsdom

import { StrictMode, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import {
    MemoryRouter,
    Route,
    Routes,
    useLocation,
} from 'react-router'

import { SessionProvider, useSession } from './SessionProvider'
import { SessionRedirect } from './SessionRedirect'
import { RequireSession } from './RequireSession'
import { SessionNotice } from './SessionNotice'
import { SessionApiError } from './sessionClient'
import { LoginPage } from '../pages/LoginPage'

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

// Các nút này chỉ tồn tại trong tests.
function TestControls() {
    const { hasSession, startSession, request } = useSession()
    const location = useLocation()
    const [result, setResult] = useState('')

    async function loadData() {
        try {
            const response = await request('/api/items')
            setResult(String(response.status))
        } catch (error) {
            setResult(
                error instanceof SessionApiError
                    ? error.code
                    : 'NETWORK_ERROR',
            )
        }
    }

    return (
        <>
            <button
                onClick={() =>
                    startSession({
                        accessToken: 'access-test',
                        refreshToken: 'refresh-test',
                    })
                }
            >
                Nạp phiên
            </button>

            <button onClick={loadData}>Gọi API</button>

            <span data-testid="path">{location.pathname}</span>
            <span data-testid="session">
                {hasSession ? 'active' : 'empty'}
            </span>
            <span data-testid="result">{result}</span>
        </>
    )
}

function setup(initialPath = '/login') {
    const fetcher = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetcher)

    render(
        <StrictMode>
            <MemoryRouter initialEntries={[initialPath]}>
                <SessionProvider apiOrigin="https://api.example.test">
                    <SessionRedirect />
                    <SessionNotice />
                    <TestControls />

                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route
                            path="/public"
                            element={<h1>Trang công khai</h1>}
                        />

                        <Route element={<RequireSession />}>
                            <Route
                                path="/"
                                element={<h1>Trang nghiệp vụ</h1>}
                            />
                        </Route>
                    </Routes>
                </SessionProvider>
            </MemoryRouter>
        </StrictMode>,
    )

    return fetcher
}

function loadSession() {
    fireEvent.click(screen.getByRole('button', { name: 'Nạp phiên' }))
}

function callApi() {
    fireEvent.click(screen.getByRole('button', { name: 'Gọi API' }))
}

async function enterSystem() {
    loadSession()

    fireEvent.click(
        await screen.findByRole('link', {
            name: 'Tiếp tục vào hệ thống',
        }),
    )

    await screen.findByRole('heading', { name: 'Trang nghiệp vụ' })
}

async function expectResult(value: string) {
    await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe(value)
    })
}

beforeEach(() => {
    window.sessionStorage.clear()
    window.localStorage.clear()
})

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    window.sessionStorage.clear()
    window.localStorage.clear()
})

describe('Điều hướng phiên đăng nhập', () => {
    it('chưa có phiên thì chuyển trang được bảo vệ về login', async () => {
        const fetcher = setup('/')

        await screen.findByRole('heading', { name: 'Đăng nhập' })

        expect(screen.getByTestId('path').textContent).toBe('/login')
        expect(screen.queryByRole('heading', {
            name: 'Trang nghiệp vụ',
        })).toBeNull()
        expect(fetcher).not.toHaveBeenCalled()
    })

    it('có phiên thì mở được trang nghiệp vụ bằng Link', async () => {
        setup()

        await enterSystem()

        expect(screen.getByTestId('path').textContent).toBe('/')
        expect(screen.getByTestId('session').textContent).toBe('active')
    })

    it.each([
        ['SESSION_EXPIRED', 'Phiên đăng nhập đã hết hạn.'],
        ['SESSION_REVOKED', 'Phiên đăng nhập đã được kết thúc.'],
    ])('chuyển về login và giữ thông báo khi %s', async (code, message) => {
        const fetcher = setup()
        fetcher.mockResolvedValueOnce(json({ code }, 401))

        await enterSystem()
        callApi()

        await screen.findByRole('heading', { name: 'Đăng nhập' })

        expect(screen.getByTestId('path').textContent).toBe('/login')
        expect(screen.getByTestId('session').textContent).toBe('empty')
        expect(screen.getByRole('alert').textContent).toContain(message)
        expect(screen.queryByRole('heading', {
            name: 'Trang nghiệp vụ',
        })).toBeNull()
    })

    it('SessionRedirect hoạt động cả ngoài RequireSession', async () => {
        const fetcher = setup('/public')
        fetcher.mockResolvedValueOnce(
            json({ code: 'SESSION_EXPIRED' }, 401),
        )

        loadSession()
        callApi()

        await screen.findByRole('heading', { name: 'Đăng nhập' })

        expect(screen.getByTestId('path').textContent).toBe('/login')
        expect(screen.getByRole('alert').textContent)
            .toContain('Phiên đăng nhập đã hết hạn.')
    })

    it('refresh thành công thì ở lại trang nghiệp vụ', async () => {
        const fetcher = setup()
        fetcher
            .mockResolvedValueOnce(
                json({ code: 'ACCESS_TOKEN_EXPIRED' }, 401),
            )
            .mockResolvedValueOnce(
                json({ access_token: 'access-new' }),
            )
            .mockResolvedValueOnce(json({ items: [] }))

        await enterSystem()
        callApi()
        await expectResult('200')

        expect(screen.getByTestId('path').textContent).toBe('/')
        expect(screen.getByTestId('session').textContent).toBe('active')
        expect(screen.queryByRole('alert')).toBeNull()
        expect(fetcher).toHaveBeenCalledTimes(3)
    })

    it('lỗi mạng không chuyển về login', async () => {
        const fetcher = setup()
        fetcher.mockRejectedValueOnce(new TypeError('Failed to fetch'))

        await enterSystem()
        callApi()
        await expectResult('NETWORK_ERROR')

        expect(screen.getByTestId('path').textContent).toBe('/')
        expect(screen.getByTestId('session').textContent).toBe('active')
        expect(screen.queryByRole('alert')).toBeNull()
    })

    it('refresh gặp lỗi 503 không chuyển về login', async () => {
        const fetcher = setup()
        fetcher
            .mockResolvedValueOnce(
                json({ code: 'ACCESS_TOKEN_EXPIRED' }, 401),
            )
            .mockResolvedValueOnce(
                json({ code: 'SESSION_STORAGE_UNAVAILABLE' }, 503),
            )

        await enterSystem()
        callApi()
        await expectResult('SESSION_STORAGE_UNAVAILABLE')

        expect(screen.getByTestId('path').textContent).toBe('/')
        expect(screen.getByTestId('session').textContent).toBe('active')
        expect(screen.queryByRole('alert')).toBeNull()
    })
})
