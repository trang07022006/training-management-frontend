import { describe, expect, it, vi } from 'vitest'
import { createSessionClient } from './sessionClient'

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

function error(code: string, status = 401) {
    return json({ code }, status)
}

function authorization(init?: RequestInit) {
    return new Headers(init?.headers).get('Authorization')
}

function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((done) => {
        resolve = done
    })
    return { promise, resolve }
}

function setup() {
    const fetcher = vi.fn<typeof fetch>()
    const onSessionEnded = vi.fn()

    const client = createSessionClient({
        apiOrigin: 'https://api.example.test',
        onSessionEnded,
        fetchImpl: fetcher,
    })

    client.setSession({
        accessToken: 'access-old',
        refreshToken: 'refresh-old',
    })

    return { client, fetcher, onSessionEnded }
}

describe('sessionClient', () => {
    it('gửi access token và nhận phản hồi 204', async () => {
        const { client, fetcher } = setup()
        fetcher.mockResolvedValueOnce(new Response(null, { status: 204 }))

        const response = await client.request('/api/items')

        expect(response.status).toBe(204)
        expect(fetcher).toHaveBeenCalledTimes(1)
        expect(authorization(fetcher.mock.calls[0][1]))
            .toBe('Bearer access-old')
    })

    it('refresh rồi gửi lại GET bằng access token mới', async () => {
        const { client, fetcher } = setup()
        fetcher
            .mockResolvedValueOnce(error('ACCESS_TOKEN_EXPIRED'))
            .mockResolvedValueOnce(json({ access_token: 'access-new' }))
            .mockResolvedValueOnce(json({ items: [] }))

        const response = await client.request('/api/items')

        expect(response.status).toBe(200)
        expect(fetcher).toHaveBeenCalledTimes(3)
        expect(String(fetcher.mock.calls[1][0]))
            .toBe('https://api.example.test/api/auth/refresh')
        expect(authorization(fetcher.mock.calls[1][1]))
            .toBe('Bearer refresh-old')
        expect(authorization(fetcher.mock.calls[2][1]))
            .toBe('Bearer access-new')
    })

    it('dừng nếu yêu cầu thử lại vẫn báo access token hết hạn', async () => {
        const { client, fetcher, onSessionEnded } = setup()
        fetcher
            .mockResolvedValueOnce(error('ACCESS_TOKEN_EXPIRED'))
            .mockResolvedValueOnce(json({ access_token: 'access-new' }))
            .mockResolvedValueOnce(error('ACCESS_TOKEN_EXPIRED'))

        await expect(client.request('/api/items')).rejects.toMatchObject({
            code: 'ACCESS_TOKEN_EXPIRED',
        })

        expect(fetcher).toHaveBeenCalledTimes(3)
        expect(onSessionEnded).not.toHaveBeenCalled()
    })

    it('xóa token và thông báo khi refresh báo phiên hết hạn', async () => {
        const { client, fetcher, onSessionEnded } = setup()
        fetcher
            .mockResolvedValueOnce(error('ACCESS_TOKEN_EXPIRED'))
            .mockResolvedValueOnce(error('SESSION_EXPIRED'))

        await expect(client.request('/api/items')).rejects.toMatchObject({
            code: 'SESSION_EXPIRED',
        })

        expect(onSessionEnded).toHaveBeenCalledExactlyOnceWith(
            'SESSION_EXPIRED',
        )

        await expect(client.request('/api/items')).rejects.toMatchObject({
            code: 'AUTH_REQUIRED',
        })

        expect(fetcher).toHaveBeenCalledTimes(2)
    })

    it('giữ phiên khi refresh gặp lỗi database 503', async () => {
        const { client, fetcher, onSessionEnded } = setup()
        fetcher
            .mockResolvedValueOnce(error('ACCESS_TOKEN_EXPIRED'))
            .mockResolvedValueOnce(error('SESSION_STORAGE_UNAVAILABLE', 503))
            .mockResolvedValueOnce(json({ ok: true }))

        await expect(client.request('/api/items')).rejects.toMatchObject({
            code: 'SESSION_STORAGE_UNAVAILABLE',
            status: 503,
        })

        await client.request('/api/items')

        expect(onSessionEnded).not.toHaveBeenCalled()
        expect(authorization(fetcher.mock.calls[2][1]))
            .toBe('Bearer access-old')
    })

    it('giữ phiên khi gặp lỗi mạng', async () => {
        const { client, fetcher, onSessionEnded } = setup()
        fetcher
            .mockRejectedValueOnce(new TypeError('Network unavailable'))
            .mockResolvedValueOnce(json({ ok: true }))

        await expect(client.request('/api/items'))
            .rejects.toThrow('Network unavailable')

        await client.request('/api/items')

        expect(onSessionEnded).not.toHaveBeenCalled()
        expect(authorization(fetcher.mock.calls[1][1]))
            .toBe('Bearer access-old')
    })

    it('refresh nhưng không tự gửi lại thao tác POST', async () => {
        const { client, fetcher } = setup()
        fetcher
            .mockResolvedValueOnce(error('ACCESS_TOKEN_EXPIRED'))
            .mockResolvedValueOnce(json({ access_token: 'access-new' }))
            .mockResolvedValueOnce(json({ ok: true }))

        await expect(
            client.request('/api/items', {
                method: 'POST',
                body: JSON.stringify({ name: 'Example' }),
            }),
        ).rejects.toMatchObject({
            code: 'REQUEST_RETRY_REQUIRED',
        })

        expect(fetcher).toHaveBeenCalledTimes(2)

        await client.request('/api/items')
        expect(authorization(fetcher.mock.calls[2][1]))
            .toBe('Bearer access-new')
    })

    it('không ghi đè token nếu refresh trả dữ liệu không hợp lệ', async () => {
        const { client, fetcher, onSessionEnded } = setup()
        fetcher
            .mockResolvedValueOnce(error('ACCESS_TOKEN_EXPIRED'))
            .mockResolvedValueOnce(json({ access_token: '' }))
            .mockResolvedValueOnce(json({ ok: true }))

        await expect(client.request('/api/items')).rejects.toMatchObject({
            code: 'INVALID_REFRESH_RESPONSE',
        })

        await client.request('/api/items')

        expect(onSessionEnded).not.toHaveBeenCalled()
        expect(authorization(fetcher.mock.calls[2][1]))
            .toBe('Bearer access-old')
    })

    it('không gửi token sang domain khác', async () => {
        const { client, fetcher } = setup()

        await expect(
            client.request('https://other.example.test/api/items'),
        ).rejects.toThrow()

        expect(fetcher).not.toHaveBeenCalled()
    })

    it('hai yêu cầu đồng thời chỉ tạo một lần refresh', async () => {
        const { client, fetcher } = setup()
        const refreshStarted = deferred<void>()
        const refreshResponse = deferred<Response>()

        fetcher.mockImplementation(async (input, init) => {
            if (String(input).endsWith('/api/auth/refresh')) {
                refreshStarted.resolve(undefined)
                return refreshResponse.promise
            }

            if (authorization(init) === 'Bearer access-old') {
                return error('ACCESS_TOKEN_EXPIRED')
            }

            return json({ ok: true })
        })

        const requests = Promise.all([
            client.request('/api/first'),
            client.request('/api/second'),
        ])

        await refreshStarted.promise
        refreshResponse.resolve(json({ access_token: 'access-new' }))

        const responses = await requests

        expect(responses.every((response) => response.status === 200))
            .toBe(true)

        const refreshCalls = fetcher.mock.calls.filter(
            ([input]) => String(input).endsWith('/api/auth/refresh'),
        )
        expect(refreshCalls).toHaveLength(1)
        expect(fetcher).toHaveBeenCalledTimes(5)
    })

    it('lỗi từ phiên cũ không làm kết thúc phiên đăng nhập mới', async () => {
        const { client, fetcher, onSessionEnded } = setup()
        const pending = deferred<Response>()
        fetcher.mockReturnValueOnce(pending.promise)

        const request = client.request('/api/items')
        const rejected = expect(request).rejects.toMatchObject({
            code: 'SESSION_CHANGED',
        })

        client.setSession({
            accessToken: 'another-access',
            refreshToken: 'another-refresh',
        })

        pending.resolve(error('SESSION_REVOKED'))
        await rejected

        fetcher.mockResolvedValueOnce(json({ ok: true }))
        await client.request('/api/items')

        expect(onSessionEnded).not.toHaveBeenCalled()
        expect(authorization(fetcher.mock.calls[1][1]))
            .toBe('Bearer another-access')
    })

    it('refresh cũ không ghi đè token của phiên mới', async () => {
        const { client, fetcher, onSessionEnded } = setup()
        const started = deferred<void>()
        const pending = deferred<Response>()

        fetcher
            .mockResolvedValueOnce(error('ACCESS_TOKEN_EXPIRED'))
            .mockImplementationOnce(() => {
                started.resolve(undefined)
                return pending.promise
            })

        const request = client.request('/api/items')
        const rejected = expect(request).rejects.toMatchObject({
            code: 'SESSION_CHANGED',
        })

        await started.promise

        client.setSession({
            accessToken: 'another-access',
            refreshToken: 'another-refresh',
        })

        pending.resolve(json({ access_token: 'stale-access' }))
        await rejected

        fetcher.mockResolvedValueOnce(json({ ok: true }))
        await client.request('/api/items')

        expect(onSessionEnded).not.toHaveBeenCalled()
        expect(authorization(fetcher.mock.calls[2][1]))
            .toBe('Bearer another-access')
    })

    it('refresh đang chạy không phục hồi phiên đã bị xóa', async () => {
        const { client, fetcher, onSessionEnded } = setup()
        const started = deferred<void>()
        const pending = deferred<Response>()

        fetcher
            .mockResolvedValueOnce(error('ACCESS_TOKEN_EXPIRED'))
            .mockImplementationOnce(() => {
                started.resolve(undefined)
                return pending.promise
            })

        const request = client.request('/api/items')
        const rejected = expect(request).rejects.toMatchObject({
            code: 'SESSION_CHANGED',
        })

        await started.promise
        client.clearSession()

        pending.resolve(json({ access_token: 'stale-access' }))
        await rejected

        await expect(client.request('/api/items')).rejects.toMatchObject({
            code: 'AUTH_REQUIRED',
        })

        expect(fetcher).toHaveBeenCalledTimes(2)
        expect(onSessionEnded).not.toHaveBeenCalled()
    })

    it('logout thu hồi session ở backend và xóa phiên ở client', async () => {
        const { client, fetcher } = setup()
        fetcher.mockResolvedValueOnce(new Response(null, { status: 204 }))

        await client.logout()

        expect(fetcher).toHaveBeenCalledTimes(1)
        expect(String(fetcher.mock.calls[0][0])).toBe('https://api.example.test/api/auth/logout')
        expect(fetcher.mock.calls[0][1]?.method).toBe('POST')
        expect(authorization(fetcher.mock.calls[0][1])).toBe('Bearer access-old')

        await expect(client.request('/api/items')).rejects.toMatchObject({
            code: 'AUTH_REQUIRED',
        })
    })

    it('logout không ném lỗi khi backend gặp lỗi mạng', async () => {
        const { client, fetcher } = setup()
        fetcher.mockRejectedValueOnce(new Error('Network error'))

        await expect(client.logout()).resolves.toBeUndefined()
        await expect(client.request('/api/items')).rejects.toMatchObject({
            code: 'AUTH_REQUIRED',
        })
    })
})