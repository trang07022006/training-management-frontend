import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from 'react'
import type { ReactNode } from 'react'

import { createSessionClient } from './sessionClient'

type SessionTokens = {
    accessToken: string
    refreshToken: string
}

type SessionContextValue = {
    hasSession: boolean
    endReason: string | null
    startSession: (tokens: SessionTokens) => void
    clearSession: () => void
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

    // Tạo một client dùng chung trong suốt vòng đời Provider.
    const [client] = useState(() =>
        createSessionClient({
            apiOrigin,
            onSessionEnded: (code) => {
                setHasSession(false)
                setEndReason(code)
            },
        }),
    )

    const startSession = useCallback(
        (tokens: SessionTokens) => {
            client.setSession(tokens)
            setHasSession(true)
            setEndReason(null)
        },
        [client],
    )

    const clearSession = useCallback(() => {
        client.clearSession()
        setHasSession(false)
        setEndReason(null)
    }, [client])

    const value = useMemo(
        () => ({
            hasSession,
            endReason,
            startSession,
            clearSession,
            request: client.request,
        }),
        [hasSession, endReason, startSession, clearSession, client],
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
