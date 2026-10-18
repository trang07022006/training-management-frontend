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
    CONSULTANT: 'consultant',
    TRAINING_MANAGER: 'training_manager',
} as const

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES]

export const ROLE_HOME_PATHS: Record<string, string> = {
    [APP_ROLES.ADMIN]: '/dashboard',
    [APP_ROLES.TRAINER]: '/my-schedule',
    [APP_ROLES.TRAINEE]: '/my-schedule',
    [APP_ROLES.USER]: '/dashboard',
    [APP_ROLES.CONSULTANT]: '/leads',
    [APP_ROLES.TRAINING_MANAGER]: '/leads',
}

export const ROLE_LABELS: Record<string, string> = {
    [APP_ROLES.ADMIN]: 'Quản trị viên',
    [APP_ROLES.TRAINER]: 'Giảng viên',
    [APP_ROLES.TRAINEE]: 'Học viên',
    [APP_ROLES.USER]: 'Người dùng',
    [APP_ROLES.CONSULTANT]: 'Tư vấn tuyển sinh',
    [APP_ROLES.TRAINING_MANAGER]: 'Quản lý đào tạo',
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
 * Đảm bảo KHÔNG hiển thị internal code (admin, trainer, trainee, consultant, training_manager, user) trên UI.
 */
export function getRoleLabel(role?: string | null): string {
    if (!role || typeof role !== 'string') {
        return 'Người dùng'
    }

    let cleaned = role.trim()
    // Loại bỏ phần mã kỹ thuật trong ngoặc đơn nếu có, ví dụ: "Tư vấn tuyển sinh (consultant)" -> "Tư vấn tuyển sinh"
    if (cleaned.includes('(') && cleaned.includes(')')) {
        cleaned = cleaned.replace(/\s*\([^)]*\)/g, '').trim()
    }

    let normalized = cleaned.toLowerCase()
    if (normalized.startsWith('role_')) {
        normalized = normalized.slice(5)
    }

    if (ROLE_LABELS[normalized]) {
        return ROLE_LABELS[normalized]
    }

    // Các biến thể mã kỹ thuật thường gặp
    if (normalized === 'training-manager' || normalized === 'training manager') {
        return 'Quản lý đào tạo'
    }
    if (normalized === 'admissions_counselor' || normalized === 'admissions counselor') {
        return 'Tư vấn tuyển sinh'
    }

    // Nếu chuỗi truyền vào trùng khớp với một nhãn tiếng Việt
    for (const label of Object.values(ROLE_LABELS)) {
        if (normalized === label.toLowerCase()) {
            return label
        }
    }

    return cleaned || 'Người dùng'
}

/**
 * Tiện ích định dạng vai trò từ đối tượng RoleItem hoặc chuỗi code.
 * Đảm bảo chỉ trả về tên tiếng Việt thuần túy, không có mã kỹ thuật đi kèm.
 */
export function getRoleDisplayName(
    roleInput?: { name?: string; code?: string } | string | null,
): string {
    if (!roleInput) {
        return 'Người dùng'
    }

    if (typeof roleInput === 'string') {
        return getRoleLabel(roleInput)
    }

    // Ưu tiên map từ code nếu có
    if (roleInput.code) {
        const fromCode = getRoleLabel(roleInput.code)
        if (fromCode && fromCode.toLowerCase() !== roleInput.code.toLowerCase()) {
            return fromCode
        }
    }

    // Sau đó map từ name
    if (roleInput.name) {
        return getRoleLabel(roleInput.name)
    }

    return 'Người dùng'
}

