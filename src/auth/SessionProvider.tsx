/* eslint-disable */
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import type { ReactNode } from 'react'

import { createSessionClient, SessionApiError } from './sessionClient'
import {
    loadStoredSession,
    saveStoredSession,
    clearStoredSession,
    updateStoredTokens,
} from './sessionStorage'

type SessionTokens = {
    accessToken: string
    refreshToken: string
}

type SessionContextValue = {
    hasSession: boolean
    isLoading: boolean
    isRestoring?: boolean
    endReason: string | null
    userId: string | null
    role: string | null
    startSession: (
        tokens: SessionTokens,
        initialRole?: string | null,
        initialUserId?: string | null,
        remember?: boolean,
    ) => void
    clearSession: () => void
    logout: () => Promise<void>
    verifySessionUser: () => Promise<string>
    request: (
        path: string,
        init?: RequestInit,
    ) => Promise<Response>
    apiOrigin: string
}

const SessionContext = createContext<SessionContextValue | null>(null)

type SessionProviderProps = {
    apiOrigin: string
    autoRestore?: boolean
    children: ReactNode
}

export function SessionProvider({
    apiOrigin,
    autoRestore = true,
    children,
}: SessionProviderProps) {
    const initialStored = useMemo(() => {
        if (!autoRestore || typeof window === 'undefined') return null
        return loadStoredSession()
    }, [autoRestore])

    const [hasSession, setHasSession] = useState<boolean>(() => initialStored !== null)
    const [isLoading, setIsLoading] = useState<boolean>(() => initialStored !== null)
    const [role, setRole] = useState<string | null>(() => initialStored?.role ?? null)
    const [userId, setUserId] = useState<string | null>(() => initialStored?.userId ?? null)
    const [endReason, setEndReason] = useState<string | null>(null)

    // Thay đổi khi bắt đầu hoặc kết thúc một phiên ở frontend.
    const sessionVersion = useRef(0)

    const onSessionEndedCallback = useRef<(code: string) => void>(() => {})
    onSessionEndedCallback.current = (code: string) => {
        sessionVersion.current += 1
        setHasSession(false)
        setIsLoading(false)
        setUserId(null)
        setEndReason(code)
        setRole(null)
        clearStoredSession()
    }

    const clientRef = useRef<ReturnType<typeof createSessionClient> | null>(null)
    if (!clientRef.current) {
        clientRef.current = createSessionClient({
            apiOrigin,
            onSessionEnded: (code) => onSessionEndedCallback.current(code),
            onTokensUpdated: (tokens) => updateStoredTokens(tokens),
        })

        if (initialStored) {
            clientRef.current.setSession(initialStored.tokens)
        }
    }
    const client = clientRef.current

    // Bootstrap verification sau khi nạp phiên từ storage lúc reload
    useEffect(() => {
        if (!autoRestore || !initialStored) {
            setIsLoading(false)
            return
        }

        let isMounted = true

        client
            .request('/api/auth/session')
            .then(async (response) => {
                const body: unknown = await response.json().catch(() => null)
                if (isMounted) {
                    if (
                        typeof body === 'object' &&
                        body !== null &&
                        'user_id' in body &&
                        typeof body.user_id === 'string'
                    ) {
                        setUserId(body.user_id)
                    }
                    setHasSession(true)
                    setIsLoading(false)
                }
            })
            .catch((_error: unknown) => {
                if (isMounted) {
                    // Nếu phiên kết thúc (SESSION_EXPIRED, SESSION_REVOKED),
                    // onSessionEndedCallback đã cập nhật hasSession=false và endReason.
                    // Nếu chỉ là lỗi kết nối mạng (503/network), không xóa phiên ngay mà cho phép tiếp tục.
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [autoRestore, client, initialStored])

    const startSession = useCallback(
        (
            tokens: SessionTokens,
            initialRole?: string | null,
            initialUserId?: string | null,
            remember = false,
        ) => {
            client.setSession(tokens)

            sessionVersion.current += 1
            setHasSession(true)
            setIsLoading(false)
            setUserId(initialUserId ?? null)
            setEndReason(null)
            setRole(initialRole ?? null)

            saveStoredSession(
                {
                    tokens,
                    role: initialRole ?? null,
                    userId: initialUserId ?? null,
                },
                remember,
            )
        },
        [client],
    )

    const logout = useCallback(async () => {
        sessionVersion.current += 1
        setHasSession(false)
        setIsLoading(false)
        setUserId(null)
        setEndReason(null)
        setRole(null)
        clearStoredSession()
        await client.logout()
    }, [client])

    const clearSession = useCallback(() => {
        void logout()
    }, [logout])

    const verifySessionUser = useCallback(async (): Promise<string> => {
        const expectedVersion = sessionVersion.current

        const response = await client.request('/api/auth/session')
        const body: unknown = await response.json()

        // Người dùng có thể đổi tài khoản trong lúc chờ đọc phản hồi.
        if (expectedVersion !== sessionVersion.current) {
            throw new SessionApiError('SESSION_CHANGED')
        }

        if (
            typeof body !== 'object' ||
            body === null ||
            !('user_id' in body) ||
            typeof body.user_id !== 'string' ||
            !body.user_id.trim()
        ) {
            throw new SessionApiError(
                'INVALID_SESSION_RESPONSE',
                response.status,
            )
        }

        setUserId(body.user_id)
        return body.user_id
    }, [client])

    const value = useMemo(
        () => ({
            hasSession,
            isLoading,
            isRestoring: isLoading,
            endReason,
            userId,
            role,
            startSession,
            clearSession,
            logout,
            verifySessionUser,
            request: client.request,
            apiOrigin,
        }),
        [
            hasSession,
            isLoading,
            endReason,
            userId,
            role,
            startSession,
            clearSession,
            logout,
            verifySessionUser,
            client,
            apiOrigin,
        ],
    )

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    )
}

// oxlint-disable-next-line react/only-export-components
export function useSession() {
    const context = useContext(SessionContext)

    if (context === null) {
        throw new Error('useSession phải nằm trong SessionProvider.')
    }

    return context
}