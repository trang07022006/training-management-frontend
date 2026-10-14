/**
 * Quản lý trạng thái Đã xem / Chưa xem (Read / Unread) của Lead trên giao diện.
 *
 * Lưu ý quan trọng:
 * - Trạng thái đã xem/chưa xem (Read/Unread) là trạng thái hiển thị giao diện UX.
 * - KHÔNG làm thay đổi trạng thái nghiệp vụ (status: 'new' / 'Mới tiếp nhận').
 * - Lưu trữ trong localStorage để bảo lưu trạng thái xem của người dùng.
 * - Phát sự kiện đồng bộ để Notification Bell và LeadsPage lập tức cập nhật số lượng unread.
 */

export const STORAGE_KEY_READ_LEADS = 'training_management_read_leads'
export const EVENT_LEAD_READ_CHANGED = 'lead-read-state-changed'
export const EVENT_UNREAD_COUNT_CHANGED = 'lead-unread-count-updated'

/**
 * Lấy danh sách ID các lead đã được xem từ localStorage.
 */
export function getReadLeadIds(): Set<string> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_READ_LEADS)
        if (!raw) return new Set<string>()
        const parsed = JSON.parse(raw)
        return new Set<string>(Array.isArray(parsed) ? parsed : [])
    } catch {
        return new Set<string>()
    }
}

/**
 * Kiểm tra xem một Lead đã được xem hay chưa.
 */
export function isLeadRead(leadId?: string | null): boolean {
    if (!leadId) return true
    return getReadLeadIds().has(leadId)
}

/**
 * Đánh dấu một Lead đã được xem.
 * Lưu vào localStorage và bắn custom event để các component đồng bộ.
 */
export function markLeadAsRead(leadId: string): void {
    if (!leadId) return
    try {
        const set = getReadLeadIds()
        if (!set.has(leadId)) {
            set.add(leadId)
            localStorage.setItem(STORAGE_KEY_READ_LEADS, JSON.stringify(Array.from(set)))
            window.dispatchEvent(
                new CustomEvent(EVENT_LEAD_READ_CHANGED, {
                    detail: { leadId, readIds: Array.from(set) },
                }),
            )
        }
    } catch {
        // Dự phòng lỗi quota hoặc môi trường test
    }
}

/**
 * Xóa danh sách đã đọc (phục vụ testing hoặc reset).
 */
export function clearReadLeads(): void {
    try {
        localStorage.removeItem(STORAGE_KEY_READ_LEADS)
        window.dispatchEvent(
            new CustomEvent(EVENT_LEAD_READ_CHANGED, {
                detail: { leadId: null, readIds: [] },
            }),
        )
    } catch {
        // ignore
    }
}

/**
 * Tính số lượng lead chưa đọc từ danh sách lead được truyền vào.
 */
export function countUnreadLeads(leads: Array<{ id: string }>): number {
    const readSet = getReadLeadIds()
    return leads.filter((l) => l && l.id && !readSet.has(l.id)).length
}

/**
 * Phát sự kiện thông báo tổng số lượng lead chưa đọc cho Notification Bell.
 */
export function emitUnreadCount(count: number): void {
    window.dispatchEvent(
        new CustomEvent(EVENT_UNREAD_COUNT_CHANGED, {
            detail: { unreadCount: Math.max(0, count) },
        }),
    )
}
