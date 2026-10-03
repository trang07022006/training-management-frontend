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
    const { hasSession, role, roles, permissions, isLoading } = useSession()

    // Đang trong quá trình khôi phục phiên: không xử lý chuyển trang vội
    if (isLoading) {
        return null
    }

    // 1. Chưa đăng nhập -> Chuyển hướng về trang đăng nhập
    if (!hasSession) {
        return <Navigate to="/login" replace />
    }

    const defaultFallback = fallbackPath ?? getRoleHomePath(role)

    // Tập hợp vai trò chuẩn hóa của người dùng (SCRUM-26 multi-role)
    const userRoleList: string[] = []
    if (roles && Array.isArray(roles) && roles.length > 0) {
        for (const r of roles) {
            if (typeof r === 'string' && r.trim()) {
                userRoleList.push(r.trim().toLowerCase())
            }
        }
    } else if (role && typeof role === 'string' && role.trim()) {
        userRoleList.push(role.trim().toLowerCase())
    }

    // 2. Kiểm tra vai trò nếu route yêu cầu vai trò cụ thể: người dùng phải có vai trò đó
    if (requiredRole) {
        const normalizedRequired = requiredRole.trim().toLowerCase()
        if (!userRoleList.includes(normalizedRequired)) {
            return <Navigate to={defaultFallback} replace />
        }
    }

    // 3. Kiểm tra mã quyền nếu route yêu cầu mã quyền cụ thể
    if (requiredPermission) {
        // Unknown permission -> Default Deny
        if (!isKnownPermission(requiredPermission)) {
            return <Navigate to={defaultFallback} replace />
        }

        // Ưu tiên permissions từ session, fallback tính union quyền từ userRoleList
        let userPerms: readonly string[] = []
        if (permissions && Array.isArray(permissions) && permissions.length > 0) {
            userPerms = permissions
        } else {
            userPerms = getRolePermissions(userRoleList)
        }

        if (!userPerms.includes(requiredPermission)) {
            return <Navigate to={defaultFallback} replace />
        }
    }

    return <Outlet />
}
