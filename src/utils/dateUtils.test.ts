import { describe, expect, it } from 'vitest'
import { formatVietnamDateTime, formatAuditDateTime, isWithin24Hours } from './dateUtils'

describe('dateUtils - formatVietnamDateTime (SCRUM-125..128 Timezone Fix)', () => {
    it('1. Chuyển đổi đúng giờ UTC có Z sang múi giờ Việt Nam (+7 giờ)', () => {
        // Ví dụ trong yêu cầu: API UTC 2026-10-10T15:27:00Z -> UI expected 22:27 10/10/2026
        const result = formatVietnamDateTime('2026-10-10T15:27:00Z')
        expect(result).toBe('22:27 10/10/2026')
    })

    it('2. Chuyển đổi chính xác trường hợp qua ngày (rollover midnight)', () => {
        // Ví dụ trong yêu cầu: UTC 2026-10-10T20:30:00Z -> Việt Nam hiển thị 03:30 11/10/2026
        const result = formatVietnamDateTime('2026-10-10T20:30:00Z')
        expect(result).toBe('03:30 11/10/2026')
    })

    it('3. Tương thích ngược với chuỗi ISO chưa có Z (naive UTC)', () => {
        const result = formatVietnamDateTime('2026-10-10T15:27:00')
        expect(result).toBe('22:27 10/10/2026')
    })

    it('4. Hỗ trợ chuỗi datetime có dấu cách thay vì T', () => {
        const result = formatVietnamDateTime('2026-10-10 15:27:00')
        expect(result).toBe('22:27 10/10/2026')
    })

    it('5. Hỗ trợ chuỗi thời gian có microseconds', () => {
        const result = formatVietnamDateTime('2026-10-10T15:27:11.987654Z')
        expect(result).toBe('22:27 10/10/2026')
    })

    it('6. Hỗ trợ chuỗi có offset +00:00', () => {
        const result = formatVietnamDateTime('2026-10-10T15:27:00+00:00')
        expect(result).toBe('22:27 10/10/2026')
    })

    it('7. Trả về dấu gạch ngang (-) khi truyền null, undefined hoặc chuỗi rỗng', () => {
        expect(formatVietnamDateTime(null)).toBe('-')
        expect(formatVietnamDateTime(undefined)).toBe('-')
        expect(formatVietnamDateTime('')).toBe('-')
        expect(formatVietnamDateTime('   ')).toBe('-')
    })

    it('8. Trả về chuỗi ban đầu khi định dạng không thể parse thành Date', () => {
        expect(formatVietnamDateTime('not-a-date')).toBe('not-a-date')
    })
})

describe('dateUtils - isWithin24Hours (UX Highlight Calculation)', () => {
    const fixedNow = new Date('2026-10-10T16:00:00Z').getTime()

    it('1. Trả về true nếu thời điểm tạo nằm trong 24 giờ', () => {
        // Tạo 2 giờ trước
        expect(isWithin24Hours('2026-10-10T14:00:00Z', fixedNow)).toBe(true)
        // Tạo 23 giờ 59 phút trước
        expect(isWithin24Hours('2026-10-09T16:01:00Z', fixedNow)).toBe(true)
    })

    it('2. Trả về false nếu thời điểm tạo đã quá 24 giờ', () => {
        // Tạo 25 giờ trước
        expect(isWithin24Hours('2026-10-09T14:59:00Z', fixedNow)).toBe(false)
        // Tạo 2 ngày trước
        expect(isWithin24Hours('2026-10-08T10:00:00Z', fixedNow)).toBe(false)
    })

    it('3. Trả về false khi dữ liệu rỗng hoặc sai format', () => {
        expect(isWithin24Hours(null)).toBe(false)
        expect(isWithin24Hours(undefined)).toBe(false)
        expect(isWithin24Hours('')).toBe(false)
        expect(isWithin24Hours('invalid-date')).toBe(false)
    })
})

describe('dateUtils - formatAuditDateTime (SCRUM-254 Attendance History Timezone)', () => {
    it('1. Định dạng chính xác timestamp sự cố SCRUM-254 (17:25:22 UTC -> 00:25:22 ngày hôm sau GMT+7)', () => {
        // Sự cố: Sửa lúc 00:25:22 ngày 20/10/2026 giờ VN, DB lưu UTC 2026-10-19T17:25:22.233764Z
        const result = formatAuditDateTime('2026-10-19T17:25:22.233764Z')
        expect(result).toBe('00:25:22 20/10/2026')
    })

    it('2. Xử lý chính xác chuyển ngày qua nửa đêm (rollover midnight)', () => {
        // UTC 23:30 ngày 19/10 -> Việt Nam (+7h) là 06:30 ngày 20/10
        expect(formatAuditDateTime('2026-10-19T23:30:15Z')).toBe('06:30:15 20/10/2026')
        // UTC 16:59 ngày 19/10 -> Việt Nam (+7h) là 23:59 ngày 19/10 (chưa qua nửa đêm)
        expect(formatAuditDateTime('2026-10-19T16:59:59Z')).toBe('23:59:59 19/10/2026')
        // UTC 17:00:01 ngày 19/10 -> Việt Nam (+7h) là 00:00:01 ngày 20/10 (vừa qua nửa đêm)
        expect(formatAuditDateTime('2026-10-19T17:00:01Z')).toBe('00:00:01 20/10/2026')
    })

    it('3. Tương thích ngược với chuỗi timestamp naive không có đuôi Z (bảo toàn lịch sử cũ)', () => {
        expect(formatAuditDateTime('2026-10-19T17:25:22.233764')).toBe('00:25:22 20/10/2026')
        expect(formatAuditDateTime('2026-10-19 17:25:22')).toBe('00:25:22 20/10/2026')
    })

    it('4. Hỗ trợ chuỗi có timezone offset tường minh (+00:00)', () => {
        expect(formatAuditDateTime('2026-10-19T17:25:22+00:00')).toBe('00:25:22 20/10/2026')
    })

    it('5. Trả về dấu gạch ngang (-) cho dữ liệu rỗng hoặc null/undefined', () => {
        expect(formatAuditDateTime(null)).toBe('-')
        expect(formatAuditDateTime(undefined)).toBe('-')
        expect(formatAuditDateTime('')).toBe('-')
        expect(formatAuditDateTime('   ')).toBe('-')
    })

    it('6. Trả về chuỗi nguyên gốc nếu không thể parse', () => {
        expect(formatAuditDateTime('invalid-timestamp')).toBe('invalid-timestamp')
    })
})
