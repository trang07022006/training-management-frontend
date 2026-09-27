import { Navigate, useMatch } from 'react-router'

import { useSession } from './SessionProvider'

export function SessionRedirect() {
    const { hasSession, endReason } = useSession()
    const isLoginPage = useMatch('/login') !== null

    if (hasSession || endReason === null || isLoginPage) {
        return null
    }

    return <Navigate to="/login" replace />
}