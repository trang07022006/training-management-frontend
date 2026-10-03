export type StoredSessionTokens = {
    accessToken: string
    refreshToken: string
}

export type StoredSessionData = {
    tokens: StoredSessionTokens
    role: string | null
    roles?: string[] | null
    permissions?: string[] | null
    userId: string | null
    userName?: string | null
    userEmail?: string | null
}

export const SESSION_STORAGE_KEY = 'tms_session_data'

function isStorageAvailable(storage: Storage | undefined): boolean {
    if (!storage) return false
    try {
        const testKey = '__storage_test__'
        storage.setItem(testKey, testKey)
        storage.removeItem(testKey)
        return true
    } catch {
        return false
    }
}

/**
 * Lưu dữ liệu phiên làm việc.
 * Mặc định lưu vào sessionStorage (tồn tại qua các lần reload/F5 trong tab hiện tại).
 * Nếu người dùng chọn "Ghi nhớ đăng nhập" (remember = true), lưu thêm vào localStorage.
 */
export function saveStoredSession(data: StoredSessionData, remember = false): boolean {
    try {
        if (typeof window === 'undefined') return false
        const serialized = JSON.stringify(data)

        if (isStorageAvailable(window.sessionStorage)) {
            window.sessionStorage.setItem(SESSION_STORAGE_KEY, serialized)
        }

        if (remember && isStorageAvailable(window.localStorage)) {
            window.localStorage.setItem(SESSION_STORAGE_KEY, serialized)
        }

        return true
    } catch {
        return false
    }
}

/**
 * Đọc dữ liệu phiên đã lưu để khôi phục phiên sau khi tải lại trang (F5).
 * Ưu tiên sessionStorage của tab hiện tại, sau đó đến localStorage nếu có ghi nhớ.
 */
export function loadStoredSession(): StoredSessionData | null {
    try {
        if (typeof window === 'undefined') return null

        let raw: string | null = null
        if (isStorageAvailable(window.sessionStorage)) {
            raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
        }

        if (!raw && isStorageAvailable(window.localStorage)) {
            raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
        }

        if (!raw) return null

        const parsed: unknown = JSON.parse(raw)
        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            'tokens' in parsed &&
            typeof parsed.tokens === 'object' &&
            parsed.tokens !== null &&
            'accessToken' in parsed.tokens &&
            'refreshToken' in parsed.tokens &&
            typeof (parsed.tokens as StoredSessionTokens).accessToken === 'string' &&
            typeof (parsed.tokens as StoredSessionTokens).refreshToken === 'string' &&
            (parsed.tokens as StoredSessionTokens).accessToken.trim().length > 0 &&
            (parsed.tokens as StoredSessionTokens).refreshToken.trim().length > 0
        ) {
            const role = 'role' in parsed && typeof parsed.role === 'string' ? parsed.role : null
            const roles = 'roles' in parsed && Array.isArray(parsed.roles)
                ? parsed.roles.filter((r): r is string => typeof r === 'string')
                : null
            const permissions = 'permissions' in parsed && Array.isArray(parsed.permissions)
                ? parsed.permissions.filter((p): p is string => typeof p === 'string')
                : null
            const userId = 'userId' in parsed && (typeof parsed.userId === 'string' || typeof parsed.userId === 'number')
                ? String(parsed.userId)
                : null
            const userName = 'userName' in parsed && typeof parsed.userName === 'string' ? parsed.userName : null
            const userEmail = 'userEmail' in parsed && typeof parsed.userEmail === 'string' ? parsed.userEmail : null

            return {
                tokens: {
                    accessToken: (parsed.tokens as StoredSessionTokens).accessToken,
                    refreshToken: (parsed.tokens as StoredSessionTokens).refreshToken,
                },
                role,
                roles,
                permissions,
                userId,
                userName,
                userEmail,
            }
        }

        return null
    } catch {
        return null
    }
}

/**
 * Xóa sạch dữ liệu phiên đã lưu khi đăng xuất hoặc khi phiên hết hạn/bị thu hồi.
 */
export function clearStoredSession(): void {
    try {
        if (typeof window === 'undefined') return

        if (isStorageAvailable(window.sessionStorage)) {
            window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
        }

        if (isStorageAvailable(window.localStorage)) {
            window.localStorage.removeItem(SESSION_STORAGE_KEY)
        }
    } catch {
        // Nuốt lỗi khi xóa storage
    }
}

/**
 * Cập nhật access token mới vào storage sau khi refresh token thành công.
 */
export function updateStoredTokens(tokens: StoredSessionTokens): void {
    const existing = loadStoredSession()
    if (existing) {
        saveStoredSession({
            ...existing,
            tokens,
        })
    }
}
