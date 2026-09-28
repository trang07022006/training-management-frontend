import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react'
import type { ReactNode } from 'react'

import { createSessionClient, SessionApiError } from './sessionClient'

type SessionTokens = {
    accessToken: string
    refreshToken: string
}

type SessionContextValue = {
    hasSession: boolean
    endReason: string | null
    userId: string | null
    startSession: (tokens: SessionTokens) => void
    clearSession: () => void
    verifySessionUser: () => Promise<string>
    request: (
        path: string,
        init?: RequestInit,
    ) => Promise<Response>
}

const SessionContext = createContext<SessionContextValue | null>(null)

type SessionProviderProps = {
    apiOrigin: string
    children: ReactNode
}

export function SessionProvider({
    apiOrigin,
    children,
}: SessionProviderProps) {
    const [hasSession, setHasSession] = useState(false)
    const [endReason, setEndReason] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)

    // Thay đổi khi bắt đầu hoặc kết thúc một phiên ở frontend.
    const sessionVersion = useRef(0)

    const [client] = useState(() =>
        createSessionClient({
            apiOrigin,
            onSessionEnded: (code) => {
                sessionVersion.current += 1
                setHasSession(false)
                setUserId(null)
                setEndReason(code)
            },
        }),
    )

    const startSession = useCallback(
        (tokens: SessionTokens) => {
            client.setSession(tokens)

            sessionVersion.current += 1
            setHasSession(true)
            setUserId(null)
            setEndReason(null)
        },
        [client],
    )

    const clearSession = useCallback(() => {
        client.clearSession()

        sessionVersion.current += 1
        setHasSession(false)
        setUserId(null)
        setEndReason(null)
    }, [client])

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
            endReason,
            userId,
            startSession,
            clearSession,
            verifySessionUser,
            request: client.request,
        }),
        [
            hasSession,
            endReason,
            userId,
            startSession,
            clearSession,
            verifySessionUser,
            client,
        ],
    )

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    )
}

export function useSession() {
    const context = useContext(SessionContext)

    if (context === null) {
        throw new Error('useSession phải nằm trong SessionProvider.')
    }

    return context
}