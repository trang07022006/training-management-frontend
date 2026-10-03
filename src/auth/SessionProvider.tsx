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
import { getRolePermissions } from '../navigation/menuConfig'

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
    userName: string | null
    userEmail: string | null
    role: string | null
    roles: string[]
    permissions: string[]
    startSession: (
        tokens: SessionTokens,
        initialRole?: string | null,
        initialUserId?: string | null,
        remember?: boolean,
        initialUserName?: string | null,
        initialUserEmail?: string | null,
        initialRoles?: string[] | null,
        initialPermissions?: string[] | null,
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
    const [roles, setRoles] = useState<string[]>(() => {
        if (initialStored?.roles && Array.isArray(initialStored.roles)) {
            return initialStored.roles
        }
        return initialStored?.role ? [initialStored.role] : []
    })
    const [permissions, setPermissions] = useState<string[]>(() => {
        if (initialStored?.permissions && Array.isArray(initialStored.permissions)) {
            return initialStored.permissions
        }
        return initialStored?.role ? [...getRolePermissions(initialStored.role)] : []
    })
    const [userId, setUserId] = useState<string | null>(() => initialStored?.userId ?? null)
    const [userName, setUserName] = useState<string | null>(() => initialStored?.userName ?? null)
    const [userEmail, setUserEmail] = useState<string | null>(() => initialStored?.userEmail ?? null)
    const [endReason, setEndReason] = useState<string | null>(null)

    // Thay đổi khi bắt đầu hoặc kết thúc một phiên ở frontend.
    const sessionVersion = useRef(0)

    const onSessionEndedCallback = useRef<(code: string) => void>(() => {})
    onSessionEndedCallback.current = (code: string) => {
        sessionVersion.current += 1
        setHasSession(false)
        setIsLoading(false)
        setUserId(null)
        setUserName(null)
        setUserEmail(null)
        setEndReason(code)
        setRole(null)
        setRoles([])
        setPermissions([])
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
                    if (typeof body === 'object' && body !== null) {
                        if ('user_id' in body && typeof body.user_id === 'string') {
                            setUserId(body.user_id)
                        }
                        if ('role' in body && typeof body.role === 'string') {
                            setRole(body.role)
                        }
                        if ('roles' in body && Array.isArray(body.roles)) {
                            const validRoles = body.roles.filter((r): r is string => typeof r === 'string')
                            setRoles(validRoles)
                        }
                        if ('permissions' in body && Array.isArray(body.permissions)) {
                            const validPerms = body.permissions.filter((p): p is string => typeof p === 'string')
                            setPermissions(validPerms)
                        }
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
            initialUserName?: string | null,
            initialUserEmail?: string | null,
            initialRoles?: string[] | null,
            initialPermissions?: string[] | null,
        ) => {
            client.setSession(tokens)

            sessionVersion.current += 1
            setHasSession(true)
            setIsLoading(false)
            setUserId(initialUserId ?? null)
            setUserName(initialUserName ?? null)
            setUserEmail(initialUserEmail ?? null)
            setEndReason(null)
            setRole(initialRole ?? null)

            const resolvedRoles: string[] =
                initialRoles && Array.isArray(initialRoles) && initialRoles.length > 0
                    ? initialRoles
                    : (initialRole ? [initialRole] : [])
            setRoles(resolvedRoles)

            const resolvedPermissions: string[] =
                initialPermissions && Array.isArray(initialPermissions) && initialPermissions.length > 0
                    ? initialPermissions
                    : [...getRolePermissions(resolvedRoles)]
            setPermissions(resolvedPermissions)

            saveStoredSession(
                {
                    tokens,
                    role: initialRole ?? null,
                    roles: resolvedRoles,
                    permissions: resolvedPermissions,
                    userId: initialUserId ?? null,
                    userName: initialUserName ?? null,
                    userEmail: initialUserEmail ?? null,
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
        setUserName(null)
        setUserEmail(null)
        setEndReason(null)
        setRole(null)
        setRoles([])
        setPermissions([])
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
            userName,
            userEmail,
            role,
            roles,
            permissions,
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
            userName,
            userEmail,
            role,
            roles,
            permissions,
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