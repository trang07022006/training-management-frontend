import { Navigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { SYSTEM_PERMISSIONS, getRolePermissions } from '../navigation/menuConfig'
import { getRoleHomePath } from '../auth/roleRouting'

/**
 * Chuyển hướng an toàn từ đường dẫn cũ /courses:
 * - Nếu người dùng có quyền xem chương trình đào tạo (course.view): chuyển sang /training-programs với replace.
 * - Nếu không có quyền: chuyển sang trang phù hợp với vai trò hiện tại với replace.
 * - Sử dụng replace để không tạo vòng lặp trong lịch sử duyệt trình duyệt (nút Back).
 */
export function CoursesRedirect() {
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

    if (userPerms.includes(SYSTEM_PERMISSIONS.COURSE_VIEW)) {
        return <Navigate to="/training-programs" replace />
    }

    const fallbackPath = getRoleHomePath(role)
    return <Navigate to={fallbackPath} replace />
}
