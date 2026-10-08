/**
 * Quản lý định tuyến và vai trò người dùng trong Hệ thống Quản lý Đào tạo.
 * Các vai trò thực tế được định nghĩa trong hệ thống:
 * - admin: Quản trị viên hệ thống
 * - trainer: Giảng viên / Đào tạo viên
 * - trainee: Học viên
 * - user: Người dùng mặc định
 */

export const APP_ROLES = {
    ADMIN: 'admin',
    TRAINER: 'trainer',
    TRAINEE: 'trainee',
    USER: 'user',
} as const

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES]

export const ROLE_HOME_PATHS: Record<string, string> = {
    [APP_ROLES.ADMIN]: '/admin',
    [APP_ROLES.TRAINER]: '/trainer',
    [APP_ROLES.TRAINEE]: '/trainee',
    [APP_ROLES.USER]: '/dashboard',
}

export const ROLE_LABELS: Record<string, string> = {
    [APP_ROLES.ADMIN]: 'Quản trị viên',
    [APP_ROLES.TRAINER]: 'Giảng viên',
    [APP_ROLES.TRAINEE]: 'Học viên',
    [APP_ROLES.USER]: 'Người dùng',
}

/**
 * Trả về đường dẫn trang chủ phù hợp theo vai trò (role).
 * Nếu không có vai trò hoặc vai trò không xác định, sử dụng route mặc định/fallback là '/dashboard'.
 */
export function getRoleHomePath(role?: string | null): string {
    if (!role || typeof role !== 'string') {
        return '/dashboard'
    }

    const normalized = role.trim().toLowerCase()
    return ROLE_HOME_PATHS[normalized] ?? '/dashboard'
}

/**
 * Trả về tên hiển thị tiếng Việt của vai trò.
 */
export function getRoleLabel(role?: string | null): string {
    if (!role || typeof role !== 'string') {
        return 'Người dùng'
    }

    const normalized = role.trim().toLowerCase()
    return ROLE_LABELS[normalized] ?? role
}
