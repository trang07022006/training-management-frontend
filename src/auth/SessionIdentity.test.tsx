// @vitest-environment jsdom

import { StrictMode, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'

import { SessionProvider, useSession } from './SessionProvider'
import { SessionApiError } from './sessionClient'

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

// Cho phép test chủ động quyết định lúc phản hồi hoàn tất.
function deferredBody() {
    let resolve!: (value: unknown) => void

    const promise = new Promise<unknown>((done) => {
        resolve = done
    })

    return { promise, resolve }
}

function TestControls() {
    const {
        userId,
        hasSession,
        startSession,
        clearSession,
        verifySessionUser,
    } = useSession()

    const [result, setResult] = useState('')

    async function verify() {
        setResult('pending')

        try {
            const id = await verifySessionUser()
            setResult(`verified:${id}`)
        } catch (error) {
            setResult(
                error instanceof SessionApiError ? error.code : 'ERROR',
            )
        }
    }

    return (
        <>
            <button
                onClick={() =>
                    startSession({
                        accessToken: 'access-a',
                        refreshToken: 'refresh-a',
                    })
                }
            >
                Nạp A
            </button>

            <button
                onClick={() =>
                    startSession({
                        accessToken: 'access-b',
                        refreshToken: 'refresh-b',
                    })
                }
            >
                Nạp B
            </button>

            <button onClick={verify}>Xác minh</button>
            <button onClick={clearSession}>Xóa phiên</button>

            <span data-testid="identity">{userId ?? 'none'}</span>
            <span data-testid="session">
                {hasSession ? 'active' : 'empty'}
            </span>
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
                <TestControls />
            </SessionProvider>
        </StrictMode>,
    )

    return fetcher
}

function click(name: string) {
    fireEvent.click(screen.getByRole('button', { name }))
}

async function expectResult(value: string) {
    await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe(value)
    })
}

async function verifyA() {
    click('Nạp A')
    click('Xác minh')
    await expectResult('verified:user-a')
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

describe('Xác minh tài khoản để khôi phục bản nháp', () => {
    it('chỉ nhận userId sau khi backend xác nhận', async () => {
        const fetcher = setup()
        fetcher.mockResolvedValueOnce(json({ user_id: 'user-a' }))

        click('Nạp A')

        expect(screen.getByTestId('identity').textContent).toBe('none')
        expect(fetcher).not.toHaveBeenCalled()

        click('Xác minh')
        await expectResult('verified:user-a')

        expect(screen.getByTestId('identity').textContent).toBe('user-a')
        expect(fetcher.mock.calls[0][0])
            .toBe('https://api.example.test/api/auth/session')

        const headers = new Headers(fetcher.mock.calls[0][1]?.headers)
        expect(headers.get('Authorization')).toBe('Bearer access-a')
    })

    it('đổi phiên thì bỏ userId cũ, chờ xác minh tài khoản mới', async () => {
        const fetcher = setup()
        fetcher
            .mockResolvedValueOnce(json({ user_id: 'user-a' }))
            .mockResolvedValueOnce(json({ user_id: 'user-b' }))

        await verifyA()

        click('Nạp B')
        expect(screen.getByTestId('identity').textContent).toBe('none')

        click('Xác minh')
        await expectResult('verified:user-b')

        expect(screen.getByTestId('identity').textContent).toBe('user-b')
    })

    it('xóa phiên thì xóa cả userId', async () => {
        const fetcher = setup()
        fetcher.mockResolvedValueOnce(json({ user_id: 'user-a' }))

        await verifyA()
        click('Xóa phiên')

        expect(screen.getByTestId('identity').textContent).toBe('none')
        expect(screen.getByTestId('session').textContent).toBe('empty')
    })

    it('phiên hết hạn thì không giữ userId đã xác minh trước đó', async () => {
        const fetcher = setup()
        fetcher
            .mockResolvedValueOnce(json({ user_id: 'user-a' }))
            .mockResolvedValueOnce(json({ code: 'SESSION_EXPIRED' }, 401))

        await verifyA()

        click('Xác minh')
        await expectResult('SESSION_EXPIRED')

        expect(screen.getByTestId('identity').textContent).toBe('none')
        expect(screen.getByTestId('session').textContent).toBe('empty')
    })

    it.each([
        ['thiếu user_id', {}],
        ['user_id rỗng', { user_id: ' ' }],
        ['user_id sai kiểu', { user_id: 123 }],
    ])('không nhận danh tính khi %s', async (_name, body) => {
        const fetcher = setup()
        fetcher.mockResolvedValueOnce(json(body))

        click('Nạp A')
        click('Xác minh')
        await expectResult('INVALID_SESSION_RESPONSE')

        expect(screen.getByTestId('identity').textContent).toBe('none')
    })

    it('phản hồi chậm của A không ghi đè danh tính B', async () => {
        const fetcher = setup()
        const delayed = deferredBody()
        const responseA = json({})
        const readBodyA = vi
            .spyOn(responseA, 'json')
            .mockReturnValue(delayed.promise)

        fetcher
            .mockResolvedValueOnce(responseA)
            .mockResolvedValueOnce(json({ user_id: 'user-b' }))

        click('Nạp A')
        click('Xác minh')

        await waitFor(() => {
            expect(readBodyA).toHaveBeenCalled()
        })

        click('Nạp B')
        click('Xác minh')
        await expectResult('verified:user-b')

        await act(async () => {
            delayed.resolve({ user_id: 'user-a' })
        })

        await expectResult('SESSION_CHANGED')
        expect(screen.getByTestId('identity').textContent).toBe('user-b')
        expect(screen.getByTestId('session').textContent).toBe('active')
    })

    it('phản hồi chậm không khôi phục userId sau khi xóa phiên', async () => {
        const fetcher = setup()
        const delayed = deferredBody()
        const response = json({})
        const readBody = vi
            .spyOn(response, 'json')
            .mockReturnValue(delayed.promise)

        fetcher.mockResolvedValueOnce(response)

        click('Nạp A')
        click('Xác minh')

        await waitFor(() => {
            expect(readBody).toHaveBeenCalled()
        })

        click('Xóa phiên')

        await act(async () => {
            delayed.resolve({ user_id: 'user-a' })
        })

        await expectResult('SESSION_CHANGED')
        expect(screen.getByTestId('identity').textContent).toBe('none')
        expect(screen.getByTestId('session').textContent).toBe('empty')
    })
})