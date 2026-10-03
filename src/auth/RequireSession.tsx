import { Navigate, Outlet } from 'react-router'

import { useSession } from './SessionProvider'

export function RequireSession() {
    const { hasSession, isLoading } = useSession()

    // Trong thời gian frontend đang khôi phục phiên (F5/Reload):
    // KHÔNG redirect /login ngay. Hiển thị loading spinner cho đến khi
    // backend xác nhận phiên hợp lệ hoặc không hợp lệ (SCRUM-19).
    if (isLoading) {
        return (
            <div
                className="session-loading-screen"
                data-testid="session-loading-spinner"
                role="status"
                aria-live="polite"
            >
                <div className="session-loading-spinner" />
                <span className="sr-only">Đang xác thực phiên làm việc...</span>
            </div>
        )
    }

    if (!hasSession) {
        return <Navigate to="/login" replace />
    }

    return <Outlet />
}