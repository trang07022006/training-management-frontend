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
import { getProfileAvatarApi, createSafeObjectUrl, revokeSafeObjectUrl } from '../api/userAvatarApi'
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
    userAvatar: string | null
    avatarBlobUrl: string | null
    role: string | null
    roles: string[]
    permissions: string[]
    mustChangePassword: boolean
    setMustChangePassword: (val: boolean) => void
    startSession: (
        tokens: SessionTokens,
        initialRole?: string | null,
        initialUserId?: string | null,
        remember?: boolean,
        initialUserName?: string | null,
        initialUserEmail?: string | null,
        initialRoles?: string[] | null,
        initialPermissions?: string[] | null,
        initialUserAvatar?: string | null,
        initialMustChangePassword?: boolean,
    ) => void
    updateSessionUser: (name?: string | null, avatar?: string | null) => void
    reloadAvatar: () => Promise<void>
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
    const [userAvatar, setUserAvatar] = useState<string | null>(() => initialStored?.userAvatar ?? null)
    const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null)
    const [endReason, setEndReason] = useState<string | null>(null)
    const [mustChangePassword, setMustChangePasswordState] = useState<boolean>(() => Boolean(initialStored?.mustChangePassword))

    const setMustChangePassword = useCallback((val: boolean) => {
        setMustChangePasswordState(val)
        const cur = loadStoredSession()
        if (cur) {
            saveStoredSession({ ...cur, mustChangePassword: val })
        }
    }, [])

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
        setUserAvatar(null)
        setMustChangePasswordState(false)
        if (avatarBlobUrl) {
            revokeSafeObjectUrl(avatarBlobUrl)
        }
        setAvatarBlobUrl(null)
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
                        if ('must_change_password' in body) {
                            setMustChangePasswordState(Boolean(body.must_change_password))
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
            initialUserAvatar?: string | null,
            initialMustChangePassword?: boolean,
        ) => {
            client.setSession(tokens)

            sessionVersion.current += 1
            setHasSession(true)
            setIsLoading(false)
            setUserId(initialUserId ?? null)
            setUserName(initialUserName ?? null)
            setUserEmail(initialUserEmail ?? null)
            setUserAvatar(initialUserAvatar ?? null)
            setMustChangePasswordState(Boolean(initialMustChangePassword))
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
                    userAvatar: initialUserAvatar ?? null,
                    mustChangePassword: Boolean(initialMustChangePassword),
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
        setMustChangePasswordState(false)
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

    const updateSessionUser = useCallback((name?: string | null, avatar?: string | null) => {
        if (name !== undefined) setUserName(name)
        if (avatar !== undefined) setUserAvatar(avatar)
        
        const existing = loadStoredSession()
        if (existing) {
            saveStoredSession({
                ...existing,
                userName: name !== undefined ? name : existing.userName,
                userAvatar: avatar !== undefined ? avatar : existing.userAvatar,
            })
        }
    }, [])

    const reloadAvatar = useCallback(async () => {
        try {
            const blob = await getProfileAvatarApi(client.request)
            setAvatarBlobUrl((prev) => {
                if (prev) revokeSafeObjectUrl(prev)
                return createSafeObjectUrl(blob)
            })
        } catch {
            setAvatarBlobUrl((prev) => {
                if (prev) revokeSafeObjectUrl(prev)
                return null
            })
        }
    }, [client])

    // Load avatar khi session bắt đầu hoặc restore thành công và đã có userId
    useEffect(() => {
        if (hasSession && userId) {
            void reloadAvatar()
        }
    }, [hasSession, userId, reloadAvatar])

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
            userAvatar,
            avatarBlobUrl,
            role,
            roles,
            permissions,
            mustChangePassword,
            setMustChangePassword,
            startSession,
            updateSessionUser,
            reloadAvatar,
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
            userAvatar,
            avatarBlobUrl,
            role,
            roles,
            permissions,
            mustChangePassword,
            setMustChangePassword,
            startSession,
            updateSessionUser,
            reloadAvatar,
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