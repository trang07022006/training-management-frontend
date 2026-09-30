import { describe, expect, it } from 'vitest'
import {
    APP_ROLES,
    getRoleHomePath,
    getRoleLabel,
    ROLE_HOME_PATHS,
    ROLE_LABELS,
} from './roleRouting'

describe('roleRouting', () => {
    it('định nghĩa chính xác các vai trò thực tế của hệ thống', () => {
        expect(APP_ROLES.ADMIN).toBe('admin')
        expect(APP_ROLES.TRAINER).toBe('trainer')
        expect(APP_ROLES.TRAINEE).toBe('trainee')
        expect(APP_ROLES.USER).toBe('user')
    })

    it('trả về đúng đường dẫn trang chủ cho từng vai trò', () => {
        expect(getRoleHomePath('admin')).toBe('/admin')
        expect(getRoleHomePath('trainer')).toBe('/trainer')
        expect(getRoleHomePath('trainee')).toBe('/trainee')
        expect(getRoleHomePath('user')).toBe('/')
    })

    it('xử lý chuẩn hóa chữ hoa, khoảng trắng', () => {
        expect(getRoleHomePath('  ADMIN  ')).toBe('/admin')
        expect(getRoleHomePath('Trainer')).toBe('/trainer')
        expect(getRoleHomePath('TRAINEE')).toBe('/trainee')
    })

    it('fallback về / đối với vai trò rỗng hoặc không xác định', () => {
        expect(getRoleHomePath(null)).toBe('/')
        expect(getRoleHomePath(undefined)).toBe('/')
        expect(getRoleHomePath('')).toBe('/')
        expect(getRoleHomePath('unknown_role')).toBe('/')
        expect(getRoleHomePath('guest')).toBe('/')
    })

    it('trả về đúng nhãn hiển thị tiếng Việt cho vai trò', () => {
        expect(getRoleLabel('admin')).toBe('Quản trị viên')
        expect(getRoleLabel('trainer')).toBe('Giảng viên')
        expect(getRoleLabel('trainee')).toBe('Học viên')
        expect(getRoleLabel('user')).toBe('Người dùng')
        expect(getRoleLabel(null)).toBe('Người dùng')
        expect(getRoleLabel('custom_role')).toBe('custom_role')
    })

    it('đồng bộ giữa ROLE_HOME_PATHS và ROLE_LABELS', () => {
        for (const role of Object.values(APP_ROLES)) {
            expect(ROLE_HOME_PATHS[role]).toBeDefined()
            expect(ROLE_LABELS[role]).toBeDefined()
        }
    })
})
