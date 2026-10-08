/**
 * Tiện ích định dạng thông tin định danh và vai trò người dùng (SCRUM-23 Phase 3).
 * Không hard-code, không dùng demo data, lấy nguồn từ dữ liệu phiên thực tế.
 */

import { getRoleLabel } from '../auth/roleRouting'

export interface UserIdentityInput {
    userId?: string | null
    email?: string | null
    name?: string | null
}

/**
 * Trả về tên hiển thị của người dùng dựa theo dữ liệu có sẵn.
 * Thứ tự ưu tiên: name -> email -> userId -> fallback 'Người dùng'.
 */
export function getUserDisplayName(input?: UserIdentityInput | null): string {
    if (!input) {
        return 'Người dùng'
    }

    if (typeof input.name === 'string' && input.name.trim()) {
        return input.name.trim()
    }

    if (typeof input.email === 'string' && input.email.trim()) {
        return input.email.trim()
    }

    if (typeof input.userId === 'string' && input.userId.trim()) {
        return input.userId.trim()
    }

    return 'Người dùng'
}

/**
 * Trả về chuỗi hiển thị tên tiếng Việt của vai trò.
 * Hỗ trợ cả trường hợp người dùng có 1 vai trò hoặc nhiều vai trò (multiple roles).
 */
export function getUserRoleDisplay(role?: string | string[] | null): string {
    if (!role) {
        return 'Người dùng'
    }

    if (Array.isArray(role)) {
        if (role.length === 0) {
            return 'Người dùng'
        }
        const labels = role
            .map((r) => (typeof r === 'string' ? getRoleLabel(r.trim()) : ''))
            .filter((l) => l.length > 0)
        return labels.length > 0 ? labels.join(', ') : 'Người dùng'
    }

    if (typeof role === 'string') {
        const trimmed = role.trim()
        if (trimmed.includes(',')) {
            const parts = trimmed.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
            return parts.map((p) => getRoleLabel(p)).join(', ')
        }
        return getRoleLabel(trimmed)
    }

    return 'Người dùng'
}

/**
 * Lấy chữ cái viết tắt từ họ tên (SCRUM-121 A6): chữ đầu của từ đầu tiên + từ cuối cùng.
 * "Nguyễn Văn An" -> "NA", "Lê Minh Trang" -> "LT".
 */
export function getNameInitials(name?: string | null): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    const first = parts[0].charAt(0)
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
    return (first + last).toUpperCase()
}
