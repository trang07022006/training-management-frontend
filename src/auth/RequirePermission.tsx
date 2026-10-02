import { Navigate, Outlet } from 'react-router'
import { useSession } from './SessionProvider'
import { getRolePermissions, isKnownPermission } from '../navigation/menuConfig'
import { getRoleHomePath } from './roleRouting'

export interface RequirePermissionProps {
    requiredPermission?: string
    requiredRole?: string
    fallbackPath?: string
}

/**
 * Route Guard kiểm tra quyền và vai trò ở tầng định tuyến Frontend (SCRUM-23 Phase 4).
 * Ngăn chặn việc truy cập URL trực tiếp vào các trang mà người dùng không có quyền.
 * Lưu ý: Backend RBAC vẫn là lớp bảo mật cuối cùng (Source of truth).
 */
export function RequirePermission({
    requiredPermission,
    requiredRole,
    fallbackPath,
}: RequirePermissionProps) {
    const { hasSession, role, isLoading } = useSession()

    // Đang trong quá trình khôi phục phiên: không xử lý chuyển trang vội
    if (isLoading) {
        return null
    }

    // 1. Chưa đăng nhập -> Chuyển hướng về trang đăng nhập
    if (!hasSession) {
        return <Navigate to="/login" replace />
    }

    const defaultFallback = fallbackPath ?? getRoleHomePath(role)

    // 2. Kiểm tra vai trò nếu route yêu cầu vai trò cụ thể
    if (requiredRole) {
        const normalizedUserRole = role?.trim().toLowerCase()
        const normalizedRequired = requiredRole.trim().toLowerCase()

        if (!normalizedUserRole || normalizedUserRole !== normalizedRequired) {
            return <Navigate to={defaultFallback} replace />
        }
    }

    // 3. Kiểm tra mã quyền nếu route yêu cầu mã quyền cụ thể
    if (requiredPermission) {
        // Unknown permission -> Default Deny
        if (!isKnownPermission(requiredPermission)) {
            return <Navigate to={defaultFallback} replace />
        }

        const userPerms = getRolePermissions(role)
        if (!userPerms.includes(requiredPermission)) {
            return <Navigate to={defaultFallback} replace />
        }
    }

    return <Outlet />
}
