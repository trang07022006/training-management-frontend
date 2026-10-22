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
        // Admin: có quản lý người dùng, chương trình đào tạo, tổng quan, đổi mật khẩu; KHÔNG có admin_dashboard hoặc courses
        const adminMenu = filterMenuItems(APP_MENU_CONFIG, {
            hasSession: true,
            role: 'admin',
        })
        const adminKeys = adminMenu.map((m) => m.key)
        expect(adminKeys).toContain('overview')
        expect(adminKeys).toContain('users')
        expect(adminKeys).toContain('training_programs')
        expect(adminKeys).not.toContain('admin_dashboard')
        expect(adminKeys).not.toContain('courses')
        expect(adminKeys).not.toContain('trainer_dashboard')
        expect(adminKeys).not.toContain('trainee_dashboard')
        expect(adminKeys).not.toContain('sessions')
        expect(adminKeys).toContain('schedules_calendar')

        // Training Manager: có sessions (Quản lý buổi học) và schedules_calendar (Thời khóa biểu); KHÔNG có users
        const tmMenu = filterMenuItems(APP_MENU_CONFIG, {
            hasSession: true,
            role: 'training_manager',
        })
        const tmKeys = tmMenu.map((m) => m.key)
        expect(tmKeys).toContain('sessions')
        expect(tmKeys).toContain('schedules_calendar')
        expect(tmKeys).not.toContain('users')

        // Dual-role admin + training_manager: có cả users, sessions và schedules_calendar
        const dualMenu = filterMenuItems(APP_MENU_CONFIG, {
            hasSession: true,
            role: 'admin',
            roles: ['admin', 'training_manager'],
        })
        const dualKeys = dualMenu.map((m) => m.key)
        expect(dualKeys).toContain('users')
        expect(dualKeys).toContain('sessions')
        expect(dualKeys).toContain('schedules_calendar')

        // Trainer: có lịch giảng dạy của tôi, chương trình đào tạo, tổng quan, đổi mật khẩu; KHÔNG có my_attendance_history, users, courses, admin_dashboard, trainer_dashboard
        const trainerMenu = filterMenuItems(APP_MENU_CONFIG, {
            hasSession: true,
            role: 'trainer',
        })
        const trainerKeys = trainerMenu.map((m) => m.key)
        expect(trainerKeys).toContain('overview')
        expect(trainerKeys).toContain('my_schedule')
        expect(trainerKeys).toContain('training_programs')
        expect(trainerKeys).not.toContain('my_attendance_history')
        expect(trainerKeys).not.toContain('trainer_dashboard')
        expect(trainerKeys).not.toContain('courses')
        expect(trainerKeys).not.toContain('users')
        expect(trainerKeys).not.toContain('admin_dashboard')
        expect(trainerKeys).not.toContain('trainee_dashboard')

        // Trainee: có lịch học của tôi, lịch sử điểm danh, chương trình đào tạo, tổng quan, đổi mật khẩu; KHÔNG có users, courses, admin_dashboard, trainee_dashboard, trainer_dashboard
        const traineeMenu = filterMenuItems(APP_MENU_CONFIG, {
            hasSession: true,
            role: 'trainee',
        })
        const traineeKeys = traineeMenu.map((m) => m.key)
        expect(traineeKeys).toContain('overview')
        expect(traineeKeys).toContain('my_schedule')
        expect(traineeKeys).toContain('my_attendance_history')
        expect(traineeKeys).toContain('training_programs')
        expect(traineeKeys).not.toContain('trainee_dashboard')
        expect(traineeKeys).not.toContain('courses')
        expect(traineeKeys).not.toContain('users')
        expect(traineeKeys).not.toContain('admin_dashboard')
        expect(traineeKeys).not.toContain('trainer_dashboard')
    })
})
