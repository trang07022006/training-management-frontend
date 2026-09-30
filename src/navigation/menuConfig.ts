/**
 * Mô hình và cấu hình Menu dựa trên quyền người dùng (RBAC) (SCRUM-23).
 * Đồng bộ với danh mục vai trò và quyền hạn chuẩn từ Backend (SCRUM-60 -> 74):
 * - Roles: admin, trainer, trainee, user
 * - Permissions: user.view, user.manage, course.view, course.manage, session.view, session.revoke
 */

export interface MenuItem {
    readonly key: string
    readonly label: string
    readonly path: string
    readonly icon?: string
    readonly requiredPermission?: string
    readonly requiredRole?: string
    readonly isPublic?: boolean
}

/**
 * Danh mục các quyền hạn chuẩn thực tế được định nghĩa từ Backend RBAC (SCRUM-61 & SCRUM-64).
 */
export const SYSTEM_PERMISSIONS = {
    USER_VIEW: 'user.view',
    USER_MANAGE: 'user.manage',
    COURSE_VIEW: 'course.view',
    COURSE_MANAGE: 'course.manage',
    SESSION_VIEW: 'session.view',
    SESSION_REVOKE: 'session.revoke',
} as const

export type SystemPermission =
    (typeof SYSTEM_PERMISSIONS)[keyof typeof SYSTEM_PERMISSIONS]

const KNOWN_PERMISSIONS = new Set<string>(Object.values(SYSTEM_PERMISSIONS))

/**
 * Ánh xạ quyền theo từng vai trò chuẩn từ Backend (SCRUM-64 INITIAL_ROLE_PERMISSIONS_MAP).
 * Source of truth là contract RBAC từ backend.
 */
export const ROLE_PERMISSIONS_MAP: Record<string, readonly string[]> = {
    admin: [
        SYSTEM_PERMISSIONS.USER_VIEW,
        SYSTEM_PERMISSIONS.USER_MANAGE,
        SYSTEM_PERMISSIONS.COURSE_VIEW,
        SYSTEM_PERMISSIONS.COURSE_MANAGE,
        SYSTEM_PERMISSIONS.SESSION_VIEW,
        SYSTEM_PERMISSIONS.SESSION_REVOKE,
    ],
    trainer: [
        SYSTEM_PERMISSIONS.USER_VIEW,
        SYSTEM_PERMISSIONS.COURSE_VIEW,
        SYSTEM_PERMISSIONS.COURSE_MANAGE,
        SYSTEM_PERMISSIONS.SESSION_VIEW,
    ],
    trainee: [
        SYSTEM_PERMISSIONS.COURSE_VIEW,
        SYSTEM_PERMISSIONS.SESSION_VIEW,
    ],
    user: [
        SYSTEM_PERMISSIONS.SESSION_VIEW,
    ],
}

/**
 * Lấy danh sách quyền hạn hợp lệ dựa theo vai trò của người dùng.
 * Áp dụng Default Deny: vai trò rỗng hoặc không xác định trả về danh sách rỗng.
 */
export function getRolePermissions(role?: string | null): readonly string[] {
    if (!role || typeof role !== 'string') {
        return []
    }
    const normalized = role.trim().toLowerCase()
    return ROLE_PERMISSIONS_MAP[normalized] ?? []
}

/**
 * Kiểm tra xem một mã quyền có thuộc danh mục quyền chuẩn của hệ thống hay không.
 */
export function isKnownPermission(permissionCode?: string | null): boolean {
    if (!permissionCode || typeof permissionCode !== 'string') {
        return false
    }
    return KNOWN_PERMISSIONS.has(permissionCode.trim())
}

/**
 * Cấu hình Menu hệ thống tập trung.
 * Sử dụng permission code thực tế từ backend, không hard-code email hay logic rải rác.
 */
export const APP_MENU_CONFIG: readonly MenuItem[] = [
    {
        key: 'overview',
        label: 'Tổng quan',
        path: '/',
        icon: 'dashboard',
        isPublic: true,
    },
    {
        key: 'admin_dashboard',
        label: 'Bảng quản trị',
        path: '/admin',
        icon: 'shield',
        requiredRole: 'admin',
        requiredPermission: SYSTEM_PERMISSIONS.USER_MANAGE,
    },
    {
        key: 'trainer_dashboard',
        label: 'Không gian Giảng viên',
        path: '/trainer',
        icon: 'chalkboard-teacher',
        requiredRole: 'trainer',
        requiredPermission: SYSTEM_PERMISSIONS.COURSE_MANAGE,
    },
    {
        key: 'trainee_dashboard',
        label: 'Góc Học viên',
        path: '/trainee',
        icon: 'user-graduate',
        requiredRole: 'trainee',
        requiredPermission: SYSTEM_PERMISSIONS.COURSE_VIEW,
    },
    {
        key: 'courses',
        label: 'Quản lý Khóa học',
        path: '/courses',
        icon: 'book',
        requiredPermission: SYSTEM_PERMISSIONS.COURSE_VIEW,
    },
    {
        key: 'change_password',
        label: 'Đổi mật khẩu',
        path: '/change-password',
        icon: 'key',
        isPublic: true,
    },
] as const

export interface FilterMenuOptions {
    hasSession: boolean
    permissions?: readonly string[] | null
    role?: string | null
    isLoading?: boolean
}

/**
 * Lọc danh sách menu theo quyền hạn và trạng thái phiên làm việc (SCRUM-23).
 * Nguyên tắc:
 * 1. Đang tải (isLoading) hoặc chưa đăng nhập (!hasSession) -> Trả về mảng rỗng để chống flash menu.
 * 2. Default Deny: Quyền thiếu hoặc undefined -> không hiển thị menu.
 * 3. Unknown permission -> luôn bị từ chối.
 * 4. Không biến đổi (mutate) mảng cấu hình menu ban đầu.
 */
export function filterMenuItems(
    menuItems: readonly MenuItem[],
    options: FilterMenuOptions,
): MenuItem[] {
    if (options.isLoading || !options.hasSession) {
        return []
    }

    // Xác định tập quyền hợp lệ
    let userPermissions: readonly string[] = []
    if (options.permissions && Array.isArray(options.permissions)) {
        userPermissions = options.permissions
    } else if (options.role) {
        userPermissions = getRolePermissions(options.role)
    }

    const permissionSet = new Set<string>(
        userPermissions.filter((p) => typeof p === 'string' && isKnownPermission(p)),
    )

    const normalizedRole = options.role?.trim().toLowerCase()

    return menuItems.filter((item) => {
        // Menu công khai cho người dùng đã xác thực phiên
        if (item.isPublic) {
            return true
        }

        // Kiểm tra ràng buộc vai trò nếu có
        if (item.requiredRole) {
            if (!normalizedRole || normalizedRole !== item.requiredRole.toLowerCase()) {
                return false
            }
        }

        // Kiểm tra quyền hạn
        if (item.requiredPermission) {
            if (!isKnownPermission(item.requiredPermission)) {
                return false
            }
            return permissionSet.has(item.requiredPermission)
        }

        // Nếu menu không phải public và không cấu hình quyền rõ ràng -> Default Deny
        return false
    })
}
