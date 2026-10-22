// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { CoursesRedirect } from './CoursesRedirect'
import { Sidebar } from '../navigation/Sidebar'
import { APP_MENU_CONFIG, filterMenuItems } from '../navigation/menuConfig'

afterEach(() => {
    cleanup()
})

function SessionInitializer({
    role,
    roles,
    permissions,
}: {
    role?: string
    roles?: string[]
    permissions?: string[]
}) {
    const { startSession } = useSession()
    useEffect(() => {
        startSession(
            { accessToken: 'test-tok', refreshToken: 'test-ref' },
            role,
            'uid-admin-1',
            false,
            'Quản trị viên',
            'admin@ictu.edu.vn',
            roles ?? (role ? [role] : []),
            permissions,
        )
    }, [role, roles, permissions, startSession])
    return null
}

function LocationWatcher() {
    const location = useLocation()
    return <div data-testid="current-path">{location.pathname}</div>
}

function TestApp({
    initialEntry,
    role = 'admin',
    roles = ['admin'],
    permissions = ['user.manage', 'user.view', 'course.view', 'course.manage', 'schedule.view', 'schedule.manage'],
}: {
    initialEntry: string
    role?: string
    roles?: string[]
    permissions?: string[]
}) {
    return (
        <MemoryRouter initialEntries={[initialEntry]}>
            <SessionProvider apiOrigin="http://localhost:5000">
                <SessionInitializer role={role} roles={roles} permissions={permissions} />
                <LocationWatcher />
                <Sidebar />
                <Routes>
                    <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/courses" element={<CoursesRedirect />} />
                    <Route path="/dashboard" element={<div data-testid="page-dashboard">Trang Tổng Quan</div>} />
                    <Route path="/training-programs" element={<div data-testid="page-training-programs">Chương trình đào tạo</div>} />
                    <Route path="/users" element={<div data-testid="page-users">Quản lý Người dùng</div>} />
                    <Route path="/leads" element={<div data-testid="page-leads">Tư vấn tuyển sinh</div>} />
                </Routes>
            </SessionProvider>
        </MemoryRouter>
    )
}

describe('Gỡ bỏ hai trang giao diện dư thừa (/admin và /courses)', () => {
    describe('1. Kiểm tra Sidebar loại bỏ hoàn toàn 2 mục', () => {
        it('Không còn menu "admin_dashboard" hay "courses" trong APP_MENU_CONFIG', () => {
            const keys = APP_MENU_CONFIG.map((item) => item.key)
            expect(keys).not.toContain('admin_dashboard')
            expect(keys).not.toContain('courses')

            const paths = APP_MENU_CONFIG.map((item) => item.path)
            expect(paths).not.toContain('/admin')
            expect(paths).not.toContain('/courses')
        })

        it('Sidebar hiển thị với quyền Admin không có "Bảng quản trị" và "Quản lý Khóa học"', async () => {
            render(<TestApp initialEntry="/dashboard" />)

            // Đảm bảo không tồn tại trên DOM
            expect(screen.queryByTestId('menu-item-admin_dashboard')).toBeNull()
            expect(screen.queryByTestId('menu-item-courses')).toBeNull()
            expect(screen.queryByText('Bảng quản trị')).toBeNull()
            expect(screen.queryByText('Quản lý Khóa học')).toBeNull()

            // Các chức năng thật được giữ lại
            expect(screen.getByTestId('menu-item-overview')).toBeDefined()
            expect(screen.getByTestId('menu-item-users')).toBeDefined()
            expect(screen.getByTestId('menu-item-training_programs')).toBeDefined()
            expect(screen.getByTestId('menu-item-subjects')).toBeDefined()
            expect(screen.getByTestId('menu-item-classes')).toBeDefined()
            expect(screen.getByTestId('menu-item-schedules_calendar')).toBeDefined()
        })

        it('filterMenuItems cho mọi vai trò (admin, trainer, trainee) đều không chứa 2 mục đã gỡ', () => {
            for (const r of ['admin', 'trainer', 'trainee', 'consultant', 'user']) {
                const items = filterMenuItems(APP_MENU_CONFIG, { hasSession: true, role: r })
                const keys = items.map((i) => i.key)
                expect(keys).not.toContain('admin_dashboard')
                expect(keys).not.toContain('courses')
            }
        })
    })

    describe('2. Kiểm tra chuyển hướng thay thế (replace) cho URL cũ', () => {
        it('Mở trực tiếp URL cũ /admin -> tự động chuyển hướng về /dashboard', async () => {
            render(<TestApp initialEntry="/admin" />)

            expect(await screen.findByTestId('page-dashboard')).toBeDefined()
            expect(screen.getByTestId('current-path').textContent).toBe('/dashboard')
        })

        it('Mở trực tiếp URL cũ /courses với quyền course.view -> tự động chuyển hướng về /training-programs', async () => {
            render(<TestApp initialEntry="/courses" />)

            expect(await screen.findByTestId('page-training-programs')).toBeDefined()
            expect(screen.getByTestId('current-path').textContent).toBe('/training-programs')
        })

        it('Mở trực tiếp URL cũ /courses khi không có course.view -> chuyển về trang phù hợp (leads)', async () => {
            render(
                <TestApp
                    initialEntry="/courses"
                    role="consultant"
                    roles={['consultant']}
                    permissions={['lead.delete']}
                />,
            )

            expect(await screen.findByTestId('page-leads')).toBeDefined()
            expect(screen.getByTestId('current-path').textContent).toBe('/leads')
        })
    })
})
