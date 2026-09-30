export type SessionAction =
    | 'continue'
    | 'refresh'
    | 'end-session'
    | 'show-error'

type SessionErrorOptions = {
    isRefreshRequest?: boolean
    alreadyRetried?: boolean
}

const endedSessionCodes = new Set([
    'SESSION_EXPIRED',
    'SESSION_REVOKED',
    'SESSION_INVALID',
    'REFRESH_TOKEN_INVALID',
])

export async function readErrorCode(
    response: Response,
): Promise<string | null> {
    try {
        // Đọc bản sao để bên gọi vẫn đọc được response gốc.
        const body: unknown = await response.clone().json()

        if (
            typeof body === 'object' &&
            body !== null &&
            'code' in body &&
            typeof body.code === 'string'
        ) {
            return body.code
        }

        return null
    } catch {
        // Ví dụ: server trả HTML hoặc phản hồi không có JSON.
        return null
    }
}

export function decideSessionAction(
    status: number,
    code: string | null,
    options: SessionErrorOptions = {},
): SessionAction {
    if (status >= 200 && status < 300) {
        return 'continue'
    }

    if (status === 401 && endedSessionCodes.has(code ?? '')) {
        return 'end-session'
    }

    if (status === 401 && code === 'AUTH_REQUIRED') {
        return 'end-session'
    }

    // Refresh token không hợp lệ thì không thể phục hồi phiên.
    if (
        options.isRefreshRequest &&
        status === 422 &&
        code === 'TOKEN_INVALID'
    ) {
        return 'end-session'
    }

    if (status === 401 && code === 'ACCESS_TOKEN_EXPIRED') {
        if (options.isRefreshRequest || options.alreadyRetried) {
            return 'show-error'
        }

        return 'refresh'
    }

    // Bao gồm lỗi mạng phía server, lỗi 503 hoặc xung đột 409.
    // Những lỗi này không tự động chứng minh phiên đã kết thúc.
    return 'show-error'
}