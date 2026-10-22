import { Navigate, Outlet, useLocation } from 'react-router'

import { useSession } from './SessionProvider'

export function RequireSession() {
    const { hasSession, isLoading, mustChangePassword } = useSession()
    const location = useLocation()

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

    // SCRUM-215: Nếu tài khoản bắt buộc đổi mật khẩu lần đầu, chặn mọi route khác
    if (mustChangePassword && location.pathname !== '/change-password') {
        return (
            <Navigate
                to="/change-password"
                replace
                state={{
                    forced: true,
                    message: 'Bạn cần đổi mật khẩu trước khi tiếp tục sử dụng hệ thống.',
                }}
            />
        )
    }

    return <Outlet />
}