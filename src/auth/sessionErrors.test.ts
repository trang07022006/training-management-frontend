import { describe, expect, it } from 'vitest'
import { decideSessionAction, readErrorCode } from './sessionErrors'

describe('decideSessionAction', () => {
    it.each([200, 204])('tiếp tục khi HTTP %s thành công', (status) => {
        expect(decideSessionAction(status, null)).toBe('continue')
    })

    it('cho phép refresh khi access token hết hạn', () => {
        expect(
            decideSessionAction(401, 'ACCESS_TOKEN_EXPIRED'),
        ).toBe('refresh')
    })

    it('không refresh lần nữa nếu yêu cầu đã được thử lại', () => {
        expect(
            decideSessionAction(401, 'ACCESS_TOKEN_EXPIRED', {
                alreadyRetried: true,
            }),
        ).toBe('show-error')
    })

    it('không tạo vòng lặp refresh từ chính yêu cầu refresh', () => {
        expect(
            decideSessionAction(401, 'ACCESS_TOKEN_EXPIRED', {
                isRefreshRequest: true,
            }),
        ).toBe('show-error')
    })

    it.each([
        'SESSION_EXPIRED',
        'SESSION_REVOKED',
        'SESSION_INVALID',
        'REFRESH_TOKEN_INVALID',
    ])('kết thúc phiên khi nhận 401 và %s', (code) => {
        expect(decideSessionAction(401, code)).toBe('end-session')
    })

    it('kết thúc trạng thái đăng nhập khi server báo thiếu token', () => {
        expect(
            decideSessionAction(401, 'AUTH_REQUIRED'),
        ).toBe('end-session')
    })

    it('kết thúc phiên khi refresh token không hợp lệ', () => {
        expect(
            decideSessionAction(422, 'TOKEN_INVALID', {
                isRefreshRequest: true,
            }),
        ).toBe('end-session')
    })

    it('báo lỗi token không hợp lệ ở API nghiệp vụ', () => {
        expect(
            decideSessionAction(422, 'TOKEN_INVALID'),
        ).toBe('show-error')
    })

    it.each([409, 503])(
        'không kết thúc phiên chỉ vì HTTP %s',
        (status) => {
            // Mã lỗi trong body cũng không được bỏ qua HTTP status.
            expect(
                decideSessionAction(status, 'SESSION_EXPIRED'),
            ).toBe('show-error')
        },
    )

    it('không tự refresh hoặc kết thúc phiên với lỗi 401 chưa biết', () => {
        expect(decideSessionAction(401, null)).toBe('show-error')
    })
})

describe('readErrorCode', () => {
    it('đọc mã lỗi và giữ response gốc cho bên gọi', async () => {
        const body = { code: 'SESSION_EXPIRED' }
        const response = new Response(JSON.stringify(body), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        })

        expect(await readErrorCode(response)).toBe('SESSION_EXPIRED')

        // Nếu hàm đã đọc hết body gốc, dòng này sẽ thất bại.
        expect(await response.json()).toEqual(body)
    })

    it.each([
        { body: {} },
        { body: { code: 123 } },
        { body: null },
    ])('trả null khi body không có code dạng chuỗi: %j', async ({ body }) => {
        const response = new Response(JSON.stringify(body), {
            status: 401,
        })

        expect(await readErrorCode(response)).toBeNull()
    })

    it('không gây lỗi khi server trả HTML', async () => {
        const response = new Response('<html>Server error</html>', {
            status: 503,
            headers: { 'Content-Type': 'text/html' },
        })

        expect(await readErrorCode(response)).toBeNull()
    })

    it('không gây lỗi khi phản hồi 204 không có body', async () => {
        const response = new Response(null, { status: 204 })

        expect(await readErrorCode(response)).toBeNull()
    })
})
