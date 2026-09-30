import { Navigate, useMatch } from 'react-router'

import { useSession } from './SessionProvider'

export function SessionRedirect() {
    const { hasSession, endReason } = useSession()
    const isLoginPage = useMatch('/login') !== null
    const matchUnauthorized = useMatch('/unauthorized')
    const match401 = useMatch('/401')
    const isUnauthorizedPage = matchUnauthorized !== null || match401 !== null

    if (hasSession || endReason === null || isLoginPage || isUnauthorizedPage) {
        return null
    }

    return <Navigate to="/login" replace />
}