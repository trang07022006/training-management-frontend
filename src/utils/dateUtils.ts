/**
 * Utility chuẩn hóa và định dạng ngày giờ theo múi giờ Việt Nam (Asia/Ho_Chi_Minh).
 *
 * Quy chuẩn:
 * 1. Dữ liệu từ API Backend lưu theo UTC (ISO 8601 có hậu tố 'Z', ví dụ: '2026-10-10T15:27:00Z').
 * 2. Trường hợp chuỗi thời gian chưa có hậu tố múi giờ (legacy ISO), tự động coi là UTC.
 * 3. Hiển thị chính xác theo giờ Việt Nam (GMT+7) với định dạng: HH:mm DD/MM/YYYY.
 *    Ví dụ: '2026-10-10T15:27:00Z' -> '22:27 10/10/2026'
 *    Trường hợp qua ngày: '2026-10-10T20:30:00Z' -> '03:30 11/10/2026'
 */

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh'

export function formatVietnamDateTime(isoString?: string | null): string {
    if (!isoString) return '-'
    const trimmed = String(isoString).trim()
    if (!trimmed) return '-'

    try {
        let normalized = trimmed
        if (normalized.includes(' ') && !normalized.includes('T')) {
            normalized = normalized.replace(' ', 'T')
        }
        // Nếu chuỗi ISO chưa có chỉ định timezone (thiếu Z hoặc offset), chuẩn hóa thành UTC (Z)
        if (!normalized.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
            normalized += 'Z'
        }

        const date = new Date(normalized)
        if (isNaN(date.getTime())) {
            return isoString
        }

        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: VIETNAM_TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hourCycle: 'h23',
        })

        const parts = Object.fromEntries(
            formatter.formatToParts(date).map((p) => [p.type, p.value]),
        )

        return `${parts.hour}:${parts.minute} ${parts.day}/${parts.month}/${parts.year}`
    } catch {
        return isoString
    }
}

/**
 * Định dạng thời điểm kiểm toán / lịch sử chỉnh sửa có giây theo múi giờ Việt Nam (Asia/Ho_Chi_Minh).
 * Định dạng: HH:mm:ss DD/MM/YYYY
 * Ví dụ: '2026-10-19T17:25:22.233764Z' -> '00:25:22 20/10/2026'
 * Tương thích ngược: Chuỗi ISO chưa có Z sẽ tự động xem là UTC (tránh bị parse local time).
 */
export function formatAuditDateTime(isoString?: string | null): string {
    if (!isoString) return '-'
    const trimmed = String(isoString).trim()
    if (!trimmed) return '-'

    try {
        let normalized = trimmed
        if (normalized.includes(' ') && !normalized.includes('T')) {
            normalized = normalized.replace(' ', 'T')
        }
        // Nếu chuỗi ISO chưa có chỉ định timezone (thiếu Z hoặc offset), chuẩn hóa thành UTC (Z)
        if (!normalized.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
            normalized += 'Z'
        }

        const date = new Date(normalized)
        if (isNaN(date.getTime())) {
            return isoString
        }

        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: VIETNAM_TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hourCycle: 'h23',
        })

        const parts = Object.fromEntries(
            formatter.formatToParts(date).map((p) => [p.type, p.value]),
        )

        return `${parts.hour}:${parts.minute}:${parts.second} ${parts.day}/${parts.month}/${parts.year}`
    } catch {
        return isoString
    }
}

/**
 * Kiểm tra xem thời điểm (chuỗi ISO) có nằm trong vòng 24 giờ qua hay không.
 * So sánh dựa trên timestamp UTC tuyệt đối, không cộng cứng múi giờ.
 */
export function isWithin24Hours(isoString?: string | null, referenceNowMs?: number): boolean {
    if (!isoString) return false
    const trimmed = String(isoString).trim()
    if (!trimmed) return false

    try {
        let normalized = trimmed
        if (normalized.includes(' ') && !normalized.includes('T')) {
            normalized = normalized.replace(' ', 'T')
        }
        if (!normalized.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
            normalized += 'Z'
        }

        const createdMs = new Date(normalized).getTime()
        if (isNaN(createdMs)) return false

        const now = typeof referenceNowMs === 'number' ? referenceNowMs : Date.now()
        const diffMs = now - createdMs

        // Cho phép dung sai 60s chênh lệch đồng hồ client-server, tối đa 24 giờ (86.400.000 ms)
        return diffMs >= -60000 && diffMs <= 24 * 60 * 60 * 1000
    } catch {
        return false
    }
}

/**
 * Định dạng ngày thuần túy (dd/MM/yyyy) tránh lệch ngày do timezone.
 * Nhận chuỗi 'YYYY-MM-DD' hoặc ISO string.
 */
export function formatVietnamDate(dateString?: string | null): string {
    if (!dateString) return '-'
    const trimmed = String(dateString).trim()
    if (!trimmed) return '-'

    // Nếu có định dạng YYYY-MM-DD (tránh lệch ngày do timezone)
    const dateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (dateMatch) {
        const [, year, month, day] = dateMatch
        return `${day}/${month}/${year}`
    }

    try {
        const d = new Date(trimmed)
        if (isNaN(d.getTime())) return dateString
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        return `${day}/${month}/${year}`
    } catch {
        return dateString
    }
}

