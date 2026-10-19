import { Navigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { SYSTEM_PERMISSIONS, getRolePermissions } from '../navigation/menuConfig'

/**
 * Chuyển hướng an toàn từ đường dẫn cũ /trainee:
 * - URL cũ /trainee chuyển hướng bằng replace về “Lịch học của tôi” (/my-schedule) khi tài khoản có quyền (schedule.personal_view); nếu không, về trang Tổng quan phù hợp (/dashboard).
 * - Sử dụng replace để không tạo vòng lặp trong lịch sử duyệt trình duyệt (nút Back).
 */
export function TraineeRedirect() {
    const { hasSession, role, roles, permissions, isLoading } = useSession()

    if (isLoading) {
        return null
    }

    if (!hasSession) {
        return <Navigate to="/login" replace />
    }

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

    let userPerms: readonly string[] = []
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
        userPerms = permissions
    } else {
        userPerms = getRolePermissions(userRoleList)
    }

    if (userPerms.includes(SYSTEM_PERMISSIONS.SCHEDULE_PERSONAL_VIEW)) {
        return <Navigate to="/my-schedule" replace />
    }

    return <Navigate to="/dashboard" replace />
}
