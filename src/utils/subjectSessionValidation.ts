/**
 * Helper validation functions for Subject Sessions (SCRUM-129).
 */

/**
 * Validate session number according to SCRUM-129 rules:
 * - Empty: "Vui lòng nhập số thứ tự buổi học."
 * - Invalid integer: "Vui lòng nhập số thứ tự buổi học hợp lệ."
 * - num < 1: "Số thứ tự buổi học phải lớn hơn hoặc bằng 1."
 * - num > total_sessions: "Số thứ tự buổi học không được vượt quá {total_sessions}."
 */
export function validateSessionNumber(value: string, totalSessions?: number | null): string | null {
    const trimmed = value.trim()
    if (!trimmed) {
        return 'Vui lòng nhập số thứ tự buổi học.'
    }

    if (!/^-?\d+$/.test(trimmed)) {
        return 'Vui lòng nhập số thứ tự buổi học hợp lệ.'
    }

    const num = Number.parseInt(trimmed, 10)
    if (Number.isNaN(num)) {
        return 'Vui lòng nhập số thứ tự buổi học hợp lệ.'
    }

    if (num < 1) {
        return 'Số thứ tự buổi học phải lớn hơn hoặc bằng 1.'
    }

    if (totalSessions !== null && totalSessions !== undefined && num > totalSessions) {
        return `Số thứ tự buổi học không được vượt quá ${totalSessions}.`
    }

    return null
}
