// @vitest-environment jsdom

import { StrictMode, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/userAvatarApi', () => ({
    getProfileAvatarApi: vi.fn().mockRejectedValue(new Error('Avatar mock')),
    createSafeObjectUrl: vi.fn().mockReturnValue(''),
    revokeSafeObjectUrl: vi.fn(),
}))
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'

import { SessionProvider, useSession } from './SessionProvider'
import { SessionNotice } from './SessionNotice'
import { SessionApiError } from './sessionClient'

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

// Component này chỉ phục vụ kiểm thử.
function TestPage() {
    const { hasSession, startSession, request } = useSession()
    const [result, setResult] = useState('')
    const [draft, setDraft] = useState('')

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
            <p role="status">
                {hasSession ? 'Đã đăng nhập' : 'Chưa đăng nhập'}
            </p>

            <button
                onClick={() =>
                    startSession({
                        accessToken: 'access-test',
                        refreshToken: 'refresh-test',
                    })
                }
            >
                Đăng nhập thử
            </button>

            <button onClick={loadData}>Tải dữ liệu</button>

            <input
                aria-label="Nội dung đang nhập"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
            />

            <span data-testid="result">{result}</span>
        </>
    )
}

function setup() {
    const fetcher = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetcher)

    render(
        <StrictMode>
            <SessionProvider apiOrigin="https://api.example.test">
                <SessionNotice />
                <TestPage />
            </SessionProvider>
        </StrictMode>,
    )

    return fetcher
}

function login() {
    fireEvent.click(
        screen.getByRole('button', { name: 'Đăng nhập thử' }),
    )
}

function loadData() {
    fireEvent.click(
        screen.getByRole('button', { name: 'Tải dữ liệu' }),
    )
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

describe('SessionProvider và SessionNotice', () => {
    it('đăng nhập bình thường không hiện cảnh báo', () => {
        const fetcher = setup()

        expect(screen.getByRole('status').textContent)
            .toBe('Chưa đăng nhập')
        expect(screen.queryByRole('alert')).toBeNull()

        login()

        expect(screen.getByRole('status').textContent)
            .toBe('Đã đăng nhập')
        expect(screen.queryByRole('alert')).toBeNull()
        expect(fetcher).not.toHaveBeenCalled()
    })

    it('hiện thông báo khi refresh xác nhận phiên hết hạn', async () => {
        const fetcher = setup()
        fetcher
            .mockResolvedValueOnce(
                json({ code: 'ACCESS_TOKEN_EXPIRED' }, 401),
            )
            .mockResolvedValueOnce(
                json({ code: 'SESSION_EXPIRED' }, 401),
            )

        login()
        loadData()

        const notice = await screen.findByRole('alert')

        expect(notice.textContent)
            .toContain('Phiên đăng nhập đã hết hạn.')
        expect(screen.getByRole('status').textContent)
            .toBe('Chưa đăng nhập')
        expect(fetcher).toHaveBeenCalledTimes(2)
    })

    it('hiện thông báo khi phiên bị thu hồi', async () => {
        const fetcher = setup()
        fetcher.mockResolvedValueOnce(
            json({ code: 'SESSION_REVOKED' }, 401),
        )

        login()
        loadData()

        const notice = await screen.findByRole('alert')

        expect(notice.textContent)
            .toContain('Phiên đăng nhập đã được kết thúc.')
        expect(screen.getByRole('status').textContent)
            .toBe('Chưa đăng nhập')
        expect(fetcher).toHaveBeenCalledTimes(1)
    })

    it('giữ phiên và không báo hết hạn khi refresh gặp lỗi 503', async () => {
        const fetcher = setup()
        fetcher
            .mockResolvedValueOnce(
                json({ code: 'ACCESS_TOKEN_EXPIRED' }, 401),
            )
            .mockResolvedValueOnce(
                json({ code: 'SESSION_STORAGE_UNAVAILABLE' }, 503),
            )

        login()
        loadData()

        await waitFor(() => {
            expect(screen.getByTestId('result').textContent)
                .toBe('SESSION_STORAGE_UNAVAILABLE')
        })

        expect(screen.getByRole('status').textContent)
            .toBe('Đã đăng nhập')
        expect(screen.queryByRole('alert')).toBeNull()
        expect(fetcher).toHaveBeenCalledTimes(2)
    })

    it('đăng nhập lại xóa thông báo và giữ nội dung đang nhập', async () => {
        const fetcher = setup()
        fetcher.mockResolvedValueOnce(
            json({ code: 'SESSION_EXPIRED' }, 401),
        )

        login()

        fireEvent.change(
            screen.getByRole('textbox', { name: 'Nội dung đang nhập' }),
            { target: { value: 'Nội dung chưa lưu' } },
        )

        loadData()
        await screen.findByRole('alert')

        const field = screen.getByRole('textbox', {
            name: 'Nội dung đang nhập',
        }) as HTMLInputElement

        expect(field.value).toBe('Nội dung chưa lưu')

        login()

        expect(screen.queryByRole('alert')).toBeNull()
        expect(screen.getByRole('status').textContent)
            .toBe('Đã đăng nhập')
        expect(field.value).toBe('Nội dung chưa lưu')
    })

    it('refresh thành công thì tiếp tục sử dụng phiên', async () => {
        const fetcher = setup()
        fetcher
            .mockResolvedValueOnce(
                json({ code: 'ACCESS_TOKEN_EXPIRED' }, 401),
            )
            .mockResolvedValueOnce(
                json({ access_token: 'access-new' }),
            )
            .mockResolvedValueOnce(json({ items: [] }))

        login()
        loadData()

        await waitFor(() => {
            expect(screen.getByTestId('result').textContent).toBe('200')
        })

        expect(screen.getByRole('status').textContent)
            .toBe('Đã đăng nhập')
        expect(screen.queryByRole('alert')).toBeNull()
        expect(fetcher).toHaveBeenCalledTimes(3)

        const headers = new Headers(fetcher.mock.calls[2][1]?.headers)
        expect(headers.get('Authorization')).toBe('Bearer access-new')
    })
})