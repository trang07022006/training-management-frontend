import { Navigate, Outlet } from 'react-router'

import { useSession } from './SessionProvider'

export function RequireSession() {
    const { hasSession } = useSession()

    if (!hasSession) {
        return <Navigate to="/login" replace />
    }

    return <Outlet />
}