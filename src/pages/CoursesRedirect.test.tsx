// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { CoursesRedirect } from './CoursesRedirect'

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
            'uid-1',
            false,
            'Test User',
            'test@ictu.edu.vn',
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

function renderAppWithCourses(role?: string, roles?: string[], permissions?: string[], initialUrl = '/courses') {
    return render(
        <MemoryRouter initialEntries={[initialUrl]}>
            <SessionProvider apiOrigin="http://localhost:5000">
                {role !== undefined && (
                    <SessionInitializer role={role} roles={roles} permissions={permissions} />
                )}
                <LocationWatcher />
                <Routes>
                    <Route path="/login" element={<div data-testid="page-login">Login Page</div>} />
                    <Route path="/courses" element={<CoursesRedirect />} />
                    <Route path="/training-programs" element={<div data-testid="page-training-programs">Training Programs</div>} />
                    <Route path="/dashboard" element={<div data-testid="page-dashboard">Dashboard</div>} />
                    <Route path="/leads" element={<div data-testid="page-leads">Leads</div>} />
                    <Route path="/trainer" element={<div data-testid="page-trainer">Trainer Home</div>} />
                    <Route path="/my-schedule" element={<div data-testid="page-trainee">Trainee Home</div>} />
                </Routes>
            </SessionProvider>
        </MemoryRouter>,
    )
}

describe('CoursesRedirect: Chuyển hướng an toàn từ /courses', () => {
    it('1. Chưa đăng nhập -> chuyển hướng về /login', async () => {
        renderAppWithCourses(undefined)
        expect(await screen.findByTestId('page-login')).toBeDefined()
        expect(screen.getByTestId('current-path').textContent).toBe('/login')
    })

    it('2. Người dùng có quyền course.view (Admin) -> chuyển hướng sang /training-programs với replace', async () => {
        renderAppWithCourses('admin', ['admin'], ['course.view', 'course.manage', 'user.view'])
        expect(await screen.findByTestId('page-training-programs')).toBeDefined()
        expect(screen.getByTestId('current-path').textContent).toBe('/training-programs')
    })

    it('3. Người dùng có quyền course.view (Giảng viên / Trainer) -> chuyển hướng sang /training-programs', async () => {
        renderAppWithCourses('trainer', ['trainer'], ['course.view'])
        expect(await screen.findByTestId('page-training-programs')).toBeDefined()
        expect(screen.getByTestId('current-path').textContent).toBe('/training-programs')
    })

    it('4. Người dùng có quyền course.view (Học viên / Trainee) -> chuyển hướng sang /training-programs', async () => {
        renderAppWithCourses('trainee', ['trainee'], ['course.view'])
        expect(await screen.findByTestId('page-training-programs')).toBeDefined()
        expect(screen.getByTestId('current-path').textContent).toBe('/training-programs')
    })

    it('5. Người dùng KHÔNG có quyền course.view (ví dụ consultant) -> chuyển về trang phù hợp với quyền (leads)', async () => {
        renderAppWithCourses('consultant', ['consultant'], ['lead.delete'])
        expect(await screen.findByTestId('page-leads')).toBeDefined()
        expect(screen.getByTestId('current-path').textContent).toBe('/leads')
    })

    it('6. Người dùng thường (user) không có course.view -> fallback về /dashboard', async () => {
        renderAppWithCourses('user', ['user'], [])
        expect(await screen.findByTestId('page-dashboard')).toBeDefined()
        expect(screen.getByTestId('current-path').textContent).toBe('/dashboard')
    })
})
