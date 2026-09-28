// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFormDraftStorage } from './formDraftStorage'

const fields = ['title', 'description'] as const

const draft = {
    title: 'Khóa học Python',
    description: 'Nội dung đang nhập, chưa gửi lên server.',
}

function createStore(formId = 'course:create') {
    return createFormDraftStorage(formId, fields)
}

beforeEach(() => {
    window.sessionStorage.clear()
})

afterEach(() => {
    vi.restoreAllMocks()
    window.sessionStorage.clear()
})

describe('Lưu bản nháp form', () => {
    it('đọc lại được bản nháp khi tạo instance mới', () => {
        const firstStore = createStore()

        expect(firstStore.save('user-a', draft)).toBe(true)

        // Instance mới không dùng lại biến của instance trước.
        const secondStore = createStore()

        expect(secondStore.load('user-a')).toEqual(draft)
    })

    it('hai tài khoản có bản nháp riêng', () => {
        const store = createStore()
        const otherDraft = {
            title: 'Khóa học Java',
            description: 'Bản nháp của người B.',
        }

        store.save('user-a', draft)

        expect(store.load('user-b')).toBeNull()

        store.save('user-b', otherDraft)

        expect(store.load('user-a')).toEqual(draft)
        expect(store.load('user-b')).toEqual(otherDraft)
    })

    it('hai form hoặc bản ghi khác nhau không ghi đè nhau', () => {
        const firstStore = createStore('course:edit:101')
        const secondStore = createStore('course:edit:202')
        const otherDraft = {
            title: 'Khóa học khác',
            description: 'Bản ghi 202.',
        }

        firstStore.save('user-a', draft)
        secondStore.save('user-a', otherDraft)

        expect(firstStore.load('user-a')).toEqual(draft)
        expect(secondStore.load('user-a')).toEqual(otherDraft)
    })

    it('chỉ lưu các trường có trong danh sách cho phép', () => {
        const store = createStore()

        store.save('user-a', {
            ...draft,
            password: 'do-not-store-password',
            access_token: 'do-not-store-token',
        })

        expect(store.load('user-a')).toEqual(draft)

        const key = window.sessionStorage.key(0)
        expect(key).not.toBeNull()

        const raw = window.sessionStorage.getItem(key!)!
        const stored = JSON.parse(raw)

        expect(stored.values).toEqual(draft)
        expect(raw).not.toContain('do-not-store-password')
        expect(raw).not.toContain('do-not-store-token')
    })

    it('trả null khi chưa có bản nháp hoặc mã tài khoản rỗng', () => {
        const store = createStore()

        expect(store.load('user-a')).toBeNull()
        expect(store.save(' ', draft)).toBe(false)
        expect(store.load(' ')).toBeNull()
        expect(window.sessionStorage.length).toBe(0)
    })

    it.each([
        ['JSON bị hỏng', '{invalid-json'],
        [
            'phiên bản không hỗ trợ',
            JSON.stringify({ version: 2, values: draft }),
        ],
        [
            'trường dữ liệu sai kiểu',
            JSON.stringify({
                version: 1,
                values: { title: 123, description: 'Nội dung' },
            }),
        ],
    ])('không khôi phục dữ liệu khi %s', (_name, raw) => {
        vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(raw)

        expect(createStore().load('user-a')).toBeNull()
    })

    it('dữ liệu thiếu trường không ghi đè bản nháp hợp lệ', () => {
        const store = createStore()
        store.save('user-a', draft)

        expect(
            store.save('user-a', { title: 'Thiếu description' }),
        ).toBe(false)

        expect(store.load('user-a')).toEqual(draft)
    })

    it('báo lưu thất bại khi bộ nhớ đầy và giữ bản nháp cũ', () => {
        const store = createStore()
        store.save('user-a', draft)

        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('Storage is full', 'QuotaExceededError')
        })

        expect(
            store.save('user-a', {
                title: 'Nội dung mới',
                description: 'Chưa lưu được.',
            }),
        ).toBe(false)

        expect(store.load('user-a')).toEqual(draft)
    })

    it('không làm ứng dụng lỗi khi trình duyệt chặn đọc bộ nhớ', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('Storage is blocked', 'SecurityError')
        })

        expect(createStore().load('user-a')).toBeNull()
    })

    it('chỉ xóa bản nháp của đúng tài khoản và form', () => {
        const firstStore = createStore('course:create')
        const secondStore = createStore('course:edit:101')

        firstStore.save('user-a', draft)
        firstStore.save('user-b', draft)
        secondStore.save('user-a', draft)

        expect(firstStore.remove('user-a')).toBe(true)

        expect(firstStore.load('user-a')).toBeNull()
        expect(firstStore.load('user-b')).toEqual(draft)
        expect(secondStore.load('user-a')).toEqual(draft)
    })
})