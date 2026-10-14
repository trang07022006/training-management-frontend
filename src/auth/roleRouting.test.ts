import { describe, expect, it } from 'vitest'
import {
    APP_ROLES,
    getRoleHomePath,
    getRoleLabel,
    getRoleDisplayName,
    ROLE_HOME_PATHS,
    ROLE_LABELS,
} from './roleRouting'

describe('roleRouting', () => {
    it('định nghĩa chính xác các vai trò thực tế của hệ thống', () => {
        expect(APP_ROLES.ADMIN).toBe('admin')
        expect(APP_ROLES.TRAINER).toBe('trainer')
        expect(APP_ROLES.TRAINEE).toBe('trainee')
        expect(APP_ROLES.USER).toBe('user')
        expect(APP_ROLES.CONSULTANT).toBe('consultant')
        expect(APP_ROLES.TRAINING_MANAGER).toBe('training_manager')
    })

    it('trả về đúng đường dẫn trang chủ cho từng vai trò', () => {
        expect(getRoleHomePath('admin')).toBe('/admin')
        expect(getRoleHomePath('trainer')).toBe('/trainer')
        expect(getRoleHomePath('trainee')).toBe('/trainee')
        expect(getRoleHomePath('user')).toBe('/dashboard')
        expect(getRoleHomePath('consultant')).toBe('/leads')
        expect(getRoleHomePath('training_manager')).toBe('/leads')
    })

    it('xử lý chuẩn hóa chữ hoa, khoảng trắng', () => {
        expect(getRoleHomePath('  ADMIN  ')).toBe('/admin')
        expect(getRoleHomePath('Trainer')).toBe('/trainer')
        expect(getRoleHomePath('TRAINEE')).toBe('/trainee')
        expect(getRoleHomePath('  CONSULTANT ')).toBe('/leads')
        expect(getRoleHomePath('Training_Manager')).toBe('/leads')
    })

    it('fallback về /dashboard đối với vai trò rỗng hoặc không xác định', () => {
        expect(getRoleHomePath(null)).toBe('/dashboard')
        expect(getRoleHomePath(undefined)).toBe('/dashboard')
        expect(getRoleHomePath('')).toBe('/dashboard')
        expect(getRoleHomePath('unknown_role')).toBe('/dashboard')
        expect(getRoleHomePath('guest')).toBe('/dashboard')
    })

    it('trả về đúng nhãn hiển thị tiếng Việt cho vai trò', () => {
        expect(getRoleLabel('admin')).toBe('Quản trị viên')
        expect(getRoleLabel('trainer')).toBe('Giảng viên')
        expect(getRoleLabel('trainee')).toBe('Học viên')
        expect(getRoleLabel('user')).toBe('Người dùng')
        expect(getRoleLabel('consultant')).toBe('Tư vấn tuyển sinh')
        expect(getRoleLabel('training_manager')).toBe('Quản lý đào tạo')
        expect(getRoleLabel('Tư vấn tuyển sinh (consultant)')).toBe('Tư vấn tuyển sinh')
        expect(getRoleLabel('Giảng viên (trainer)')).toBe('Giảng viên')
        expect(getRoleLabel(null)).toBe('Người dùng')
    })

    it('getRoleDisplayName định dạng đúng từ đối tượng RoleItem hoặc code', () => {
        expect(getRoleDisplayName({ code: 'consultant', name: 'Tư vấn tuyển sinh' })).toBe('Tư vấn tuyển sinh')
        expect(getRoleDisplayName({ code: 'consultant', name: 'consultant' })).toBe('Tư vấn tuyển sinh')
        expect(getRoleDisplayName({ code: 'training_manager', name: 'Quản lý đào tạo' })).toBe('Quản lý đào tạo')
        expect(getRoleDisplayName({ code: 'trainer', name: 'Giảng viên' })).toBe('Giảng viên')
        expect(getRoleDisplayName('trainer')).toBe('Giảng viên')
        expect(getRoleDisplayName(null)).toBe('Người dùng')
    })

    it('đồng bộ giữa ROLE_HOME_PATHS và ROLE_LABELS', () => {
        for (const role of Object.values(APP_ROLES)) {
            expect(ROLE_HOME_PATHS[role]).toBeDefined()
            expect(ROLE_LABELS[role]).toBeDefined()
        }
    })
})
