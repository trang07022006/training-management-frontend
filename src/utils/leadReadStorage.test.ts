// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    clearReadLeads,
    countUnreadLeads,
    emitUnreadCount,
    EVENT_LEAD_READ_CHANGED,
    EVENT_UNREAD_COUNT_CHANGED,
    getReadLeadIds,
    isLeadRead,
    markLeadAsRead,
} from './leadReadStorage'

describe('leadReadStorage - Quản lý trạng thái Đã xem / Chưa xem của Lead', () => {
    beforeEach(() => {
        localStorage.clear()
        clearReadLeads()
    })

    it('1. Khởi tạo rỗng khi chưa có dữ liệu trong localStorage', () => {
        expect(getReadLeadIds().size).toBe(0)
        expect(isLeadRead('lead-1')).toBe(false)
    })

    it('2. Đánh dấu lead đã đọc, lưu vào localStorage và bắn custom event', () => {
        const eventListener = vi.fn()
        window.addEventListener(EVENT_LEAD_READ_CHANGED, eventListener)

        markLeadAsRead('lead-abc')

        expect(isLeadRead('lead-abc')).toBe(true)
        expect(getReadLeadIds().has('lead-abc')).toBe(true)
        expect(eventListener).toHaveBeenCalledTimes(1)

        // Gọi lại lần 2 không lặp lại event
        markLeadAsRead('lead-abc')
        expect(eventListener).toHaveBeenCalledTimes(1)

        window.removeEventListener(EVENT_LEAD_READ_CHANGED, eventListener)
    })

    it('3. Đếm đúng số lượng lead chưa xem trong danh sách', () => {
        const mockLeads = [
            { id: 'lead-1' },
            { id: 'lead-2' },
            { id: 'lead-3' },
        ]

        expect(countUnreadLeads(mockLeads)).toBe(3)

        markLeadAsRead('lead-1')
        expect(countUnreadLeads(mockLeads)).toBe(2)

        markLeadAsRead('lead-2')
        expect(countUnreadLeads(mockLeads)).toBe(1)

        markLeadAsRead('lead-3')
        expect(countUnreadLeads(mockLeads)).toBe(0)
    })

    it('4. Bắn sự kiện cập nhật tổng số lượng unread', () => {
        const listener = vi.fn()
        window.addEventListener(EVENT_UNREAD_COUNT_CHANGED, listener)

        emitUnreadCount(5)
        expect(listener).toHaveBeenCalledWith(
            expect.objectContaining({
                detail: { unreadCount: 5 },
            }),
        )

        window.removeEventListener(EVENT_UNREAD_COUNT_CHANGED, listener)
    })
})
