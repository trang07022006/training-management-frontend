import { describe, expect, it } from 'vitest'
import {
    APP_MENU_CONFIG,
    filterMenuItems,
    getRolePermissions,
    isKnownPermission,
    ROLE_PERMISSIONS_MAP,
    SYSTEM_PERMISSIONS,
    type MenuItem,
} from './menuConfig'

describe('SCRUM-23 Phase 1: Menu Permission Model', () => {
    const sampleMenu: readonly MenuItem[] = [
        {
            key: 'home',
            label: 'Trang chủ',
            path: '/',
            isPublic: true,
        },
        {
            key: 'users',
            label: 'Quản lý người dùng',
            path: '/users',
            requiredPermission: SYSTEM_PERMISSIONS.USER_MANAGE,
        },
        {
            key: 'courses',
            label: 'Khóa học',
            path: '/courses',
            requiredPermission: SYSTEM_PERMISSIONS.COURSE_VIEW,
        },
        {
            key: 'secret',
            label: 'Chức năng bí mật',
            path: '/secret',
            requiredPermission: 'unknown.superpower',
        },
        {
            key: 'unconfigured',
            label: 'Menu chưa cấu hình',
            path: '/unconfigured',
        },
    ]

    it('1. permission có -> item hiển thị đúng', () => {
        const result = filterMenuItems(sampleMenu, {
            hasSession: true,
            permissions: [SYSTEM_PERMISSIONS.COURSE_VIEW],
        })

        const keys = result.map((i) => i.key)
        expect(keys).toContain('home')
        expect(keys).toContain('courses')
        expect(keys).not.toContain('users')
    })

    it('2. permission thiếu -> item bị loại bỏ', () => {
        const result = filterMenuItems(sampleMenu, {
            hasSession: true,
            permissions: [SYSTEM_PERMISSIONS.USER_VIEW], // Không có USER_MANAGE
        })

        const keys = result.map((i) => i.key)
        expect(keys).not.toContain('users')
        expect(keys).not.toContain('courses')
        expect(keys).toContain('home')
    })

    it('3. permission undefined hoặc null -> áp dụng Default Deny', () => {
        const result = filterMenuItems(sampleMenu, {
            hasSession: true,
            permissions: undefined,
            role: undefined,
        })

        // Chỉ có public item hiển thị
        const keys = result.map((i) => i.key)
        expect(keys).toEqual(['home'])
    })

    it('4. unknown permission hoặc permission không chuẩn -> không hiển thị', () => {
        const result = filterMenuItems(sampleMenu, {
            hasSession: true,
            permissions: ['unknown.superpower'],
        })

        const keys = result.map((i) => i.key)
        expect(keys).not.toContain('secret')
        expect(keys).not.toContain('unconfigured')
        expect(isKnownPermission('unknown.superpower')).toBe(false)
    })

    it('5. menu public -> hiển thị khi đã có phiên làm việc', () => {
        const result = filterMenuItems(sampleMenu, {
            hasSession: true,
            permissions: [],
        })

        expect(result).toHaveLength(1)
        expect(result[0].key).toBe('home')
    })

    it('6. không làm biến đổi (mutate) mảng menu config ban đầu', () => {
        const originalCopy = JSON.parse(JSON.stringify(sampleMenu))
        const result = filterMenuItems(sampleMenu, {
            hasSession: true,
            permissions: [SYSTEM_PERMISSIONS.USER_MANAGE],
        })

        expect(sampleMenu).toEqual(originalCopy)
        expect(result).not.toBe(sampleMenu)
    })

    it('7. chưa đăng nhập hoặc session đang tải -> trả về mảng rỗng để chống flash menu', () => {
        // Chưa có session
        const unauthResult = filterMenuItems(sampleMenu, {
            hasSession: false,
            permissions: [SYSTEM_PERMISSIONS.USER_MANAGE],
        })
        expect(unauthResult).toEqual([])

        // Đang tải (isLoading = true)
        const loadingResult = filterMenuItems(sampleMenu, {
            hasSession: true,
            isLoading: true,
            permissions: [SYSTEM_PERMISSIONS.USER_MANAGE],
        })
        expect(loadingResult).toEqual([])
    })

    it('8. lấy đúng quyền theo từng vai trò thực tế từ backend', () => {
        expect(getRolePermissions('admin')).toEqual(ROLE_PERMISSIONS_MAP.admin)
        expect(getRolePermissions('trainer')).toEqual(ROLE_PERMISSIONS_MAP.trainer)
        expect(getRolePermissions('trainee')).toEqual(ROLE_PERMISSIONS_MAP.trainee)
        expect(getRolePermissions('user')).toEqual(ROLE_PERMISSIONS_MAP.user)
        expect(getRolePermissions('unknown_ghost_role')).toEqual([])
        expect(getRolePermissions(null)).toEqual([])
    })

    it('9. lọc menu thực tế theo vai trò hệ thống', () => {
        // Admin: có bảng quản trị, khóa học, tổng quan, đổi mật khẩu
        const adminMenu = filterMenuItems(APP_MENU_CONFIG, {
            hasSession: true,
            role: 'admin',
        })
        const adminKeys = adminMenu.map((m) => m.key)
        expect(adminKeys).toContain('overview')
        expect(adminKeys).toContain('admin_dashboard')
        expect(adminKeys).toContain('courses')
        expect(adminKeys).not.toContain('trainer_dashboard')
        expect(adminKeys).not.toContain('trainee_dashboard')

        // Trainee: có góc học viên, khóa học, tổng quan, đổi mật khẩu
        const traineeMenu = filterMenuItems(APP_MENU_CONFIG, {
            hasSession: true,
            role: 'trainee',
        })
        const traineeKeys = traineeMenu.map((m) => m.key)
        expect(traineeKeys).toContain('overview')
        expect(traineeKeys).toContain('trainee_dashboard')
        expect(traineeKeys).toContain('courses')
        expect(traineeKeys).not.toContain('admin_dashboard')
        expect(traineeKeys).not.toContain('trainer_dashboard')
    })
})
