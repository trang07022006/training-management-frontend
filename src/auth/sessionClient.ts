import { decideSessionAction, readErrorCode } from './sessionErrors'

type SessionTokens = {
    accessToken: string
    refreshToken: string
}

type ClientOptions = {
    apiOrigin: string
    onSessionEnded: (code: string) => void
    fetchImpl?: typeof fetch
}

export class SessionApiError extends Error {
    readonly code: string
    readonly status: number

    constructor(code: string, status = 0) {
        super(code)
        this.name = 'SessionApiError'
        this.code = code
        this.status = status
    }
}

export function createSessionClient(options: ClientOptions) {
    const base = new URL(options.apiOrigin)

    if (!['http:', 'https:'].includes(base.protocol)) {
        throw new Error('Backend phải sử dụng HTTP hoặc HTTPS.')
    }

    const origin = base.origin
    const fetcher = options.fetchImpl ?? globalThis.fetch.bind(globalThis)

    let tokens: SessionTokens | null = null
    let version = 0

    let refreshJob: {
        version: number
        promise: Promise<void>
    } | null = null

    function clearSession() {
        tokens = null
        version += 1
        refreshJob = null
    }

    function setSession(value: SessionTokens) {
        if (!value.accessToken.trim() || !value.refreshToken.trim()) {
            throw new Error('Cần đủ access token và refresh token.')
        }

        tokens = { ...value }
        version += 1
        refreshJob = null
    }

    function requireSession(expectedVersion: number): SessionTokens {
        if (expectedVersion !== version) {
            throw new SessionApiError('SESSION_CHANGED')
        }

        if (tokens === null) {
            throw new SessionApiError('AUTH_REQUIRED', 401)
        }

        return tokens
    }

    function endSession(expectedVersion: number, code: string) {
        requireSession(expectedVersion)
        clearSession()
        options.onSessionEnded(code)
    }

    function buildApiUrl(path: string) {
        const url = new URL(path, origin)

        if (url.origin !== origin || !url.pathname.startsWith('/api/')) {
            throw new Error('Đường dẫn phải thuộc /api/ của backend đã cấu hình.')
        }

        return url.href
    }

    async function performRefresh(expectedVersion: number) {
        const current = requireSession(expectedVersion)

        const response = await fetcher(
            buildApiUrl('/api/auth/refresh'),
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${current.refreshToken}`,
                },
                credentials: 'omit',
                redirect: 'error',
                cache: 'no-store',
            },
        )

        requireSession(expectedVersion)

        if (!response.ok) {
            const code = await readErrorCode(response)
            requireSession(expectedVersion)

            const action = decideSessionAction(response.status, code, {
                isRefreshRequest: true,
            })

            if (action === 'end-session') {
                endSession(expectedVersion, code ?? 'SESSION_INVALID')
            }

            throw new SessionApiError(
                code ?? 'REFRESH_FAILED',
                response.status,
            )
        }

        const body: unknown = await response.json()
        const latest = requireSession(expectedVersion)

        if (
            typeof body !== 'object' ||
            body === null ||
            !('access_token' in body) ||
            typeof body.access_token !== 'string' ||
            !body.access_token.trim()
        ) {
            throw new SessionApiError(
                'INVALID_REFRESH_RESPONSE',
                response.status,
            )
        }

        tokens = {
            ...latest,
            accessToken: body.access_token,
        }
    }

    async function refreshAccess(
        expectedVersion: number,
        usedAccessToken: string,
    ) {
        const current = requireSession(expectedVersion)

        // Một yêu cầu khác đã refresh xong trong lúc mình chờ phản hồi.
        if (current.accessToken !== usedAccessToken) {
            return
        }

        if (refreshJob?.version === expectedVersion) {
            await refreshJob.promise
            return
        }

        const promise = performRefresh(expectedVersion)
        refreshJob = { version: expectedVersion, promise }

        try {
            await promise
        } finally {
            if (refreshJob?.promise === promise) {
                refreshJob = null
            }
        }
    }

    async function request(
        path: string,
        init: RequestInit = {},
    ): Promise<Response> {
        const url = buildApiUrl(path)
        const expectedVersion = version
        const method = (init.method ?? 'GET').toUpperCase()

        for (let attempt = 0; attempt < 2; attempt += 1) {
            init.signal?.throwIfAborted()

            const current = requireSession(expectedVersion)
            const usedAccessToken = current.accessToken
            const headers = new Headers(init.headers)
            headers.set('Authorization', `Bearer ${usedAccessToken}`)

            const response = await fetcher(url, {
                ...init,
                headers,
                credentials: 'omit',
                redirect: 'error',
                cache: 'no-store',
            })

            requireSession(expectedVersion)

            if (response.ok) {
                return response
            }

            const code = await readErrorCode(response)
            requireSession(expectedVersion)

            const action = decideSessionAction(response.status, code, {
                alreadyRetried: attempt > 0,
            })

            if (action === 'end-session') {
                endSession(expectedVersion, code ?? 'SESSION_INVALID')
            }

            if (action !== 'refresh') {
                throw new SessionApiError(
                    code ?? 'REQUEST_FAILED',
                    response.status,
                )
            }

            await refreshAccess(expectedVersion, usedAccessToken)
            requireSession(expectedVersion)
            init.signal?.throwIfAborted()

            // Chỉ tự gửi lại yêu cầu đọc dữ liệu.
            // Thao tác ghi cần bên gọi quyết định gửi lại.
            if (method !== 'GET' && method !== 'HEAD') {
                throw new SessionApiError('REQUEST_RETRY_REQUIRED', 401)
            }
        }

        throw new SessionApiError('RETRY_LIMIT_REACHED')
    }

    async function logout() {
        const currentAccessToken = tokens?.accessToken
        clearSession()
        if (currentAccessToken) {
            try {
                await fetcher(buildApiUrl('/api/auth/logout'), {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${currentAccessToken}`,
                    },
                    credentials: 'omit',
                    redirect: 'error',
                    cache: 'no-store',
                })
            } catch {
                // Nuốt lỗi mạng khi logout để phiên làm việc phía client luôn được xóa an toàn
            }
        }
    }

    return {
        setSession,
        clearSession,
        logout,
        request,
    }
}