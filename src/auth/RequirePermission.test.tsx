// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { SessionProvider, useSession } from './SessionProvider'
import { RequirePermission } from './RequirePermission'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'

afterEach(() => {
    cleanup()
})

function LocationDisplay() {
    const location = useLocation()
    return <span data-testid="location-display">{location.pathname}</span>
}

function TestAppWrapper({
    role,
    children,
}: {
    role?: string | null
    children: ReactNode
}) {
    const { startSession, hasSession } = useSession()

    useEffect(() => {
        if (role !== undefined) {
            startSession({ accessToken: 'test-acc', refreshToken: 'test-ref' }, role)
        }
    }, [role, startSession])

    if (role !== undefined && !hasSession) {
        return <div>Initializing test session...</div>
    }

    return (
        <>
            <LocationDisplay />
            {children}
        </>
    )
}

describe('SCRUM-23 Phase 4: Route / Menu Consistency (RequirePermission)', () => {
    it('1. user có permission -> route render bình thường', () => {
        render(
            <MemoryRouter initialEntries={['/admin']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TestAppWrapper role="admin">
                        <Routes>
                            <Route
                                element={
                                    <RequirePermission
                                        requiredRole="admin"
                                        requiredPermission={SYSTEM_PERMISSIONS.USER_MANAGE}
                                    />
                                }
                            >
                                <Route path="/admin" element={<h1>Nội dung Quản trị viên</h1>} />
                            </Route>
                        </Routes>
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByText('Nội dung Quản trị viên')).toBeDefined()
        expect(screen.getByTestId('location-display').textContent).toBe('/admin')
    })

    it('2. user không có permission -> route không render restricted content và chuyển hướng', () => {
        render(
            <MemoryRouter initialEntries={['/admin']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    {/* User là trainee cố tình truy cập /admin */}
                    <TestAppWrapper role="trainee">
                        <Routes>
                            <Route path="/trainee" element={<h1>Trang Học viên</h1>} />
                            <Route
                                element={
                                    <RequirePermission
                                        requiredRole="admin"
                                        requiredPermission={SYSTEM_PERMISSIONS.USER_MANAGE}
                                    />
                                }
                            >
                                <Route path="/admin" element={<h1>Nội dung Quản trị viên</h1>} />
                            </Route>
                        </Routes>
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        // Không render nội dung admin
        expect(screen.queryByText('Nội dung Quản trị viên')).toBeNull()
        // Chuyển hướng về trang chủ của vai trò trainee (/trainee)
        expect(screen.getByTestId('location-display').textContent).toBe('/trainee')
        expect(screen.getByText('Trang Học viên')).toBeDefined()
    })

    it('3. direct URL không bypass frontend guard', () => {
        render(
            <MemoryRouter initialEntries={['/trainer']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TestAppWrapper role="user">
                        <Routes>
                            <Route path="/" element={<h1>Trang chủ</h1>} />
                            <Route
                                element={
                                    <RequirePermission
                                        requiredRole="trainer"
                                        requiredPermission={SYSTEM_PERMISSIONS.COURSE_MANAGE}
                                    />
                                }
                            >
                                <Route path="/trainer" element={<h1>Nội dung Giảng viên</h1>} />
                            </Route>
                        </Routes>
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.queryByText('Nội dung Giảng viên')).toBeNull()
        expect(screen.getByTestId('location-display').textContent).toBe('/')
    })

    it('4. unauthenticated -> chuyển hướng về /login', () => {
        render(
            <MemoryRouter initialEntries={['/admin']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    {/* Không truyền role -> không có session */}
                    <TestAppWrapper>
                        <Routes>
                            <Route path="/login" element={<h1>Trang đăng nhập</h1>} />
                            <Route
                                element={
                                    <RequirePermission
                                        requiredRole="admin"
                                        requiredPermission={SYSTEM_PERMISSIONS.USER_MANAGE}
                                    />
                                }
                            >
                                <Route path="/admin" element={<h1>Nội dung Quản trị viên</h1>} />
                            </Route>
                        </Routes>
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.queryByText('Nội dung Quản trị viên')).toBeNull()
        expect(screen.getByTestId('location-display').textContent).toBe('/login')
        expect(screen.getByText('Trang đăng nhập')).toBeDefined()
    })

    it('5. unknown permission -> Default Deny không cho phép render', () => {
        render(
            <MemoryRouter initialEntries={['/secret']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <TestAppWrapper role="admin">
                        <Routes>
                            <Route path="/admin" element={<h1>Admin Home</h1>} />
                            <Route
                                element={
                                    <RequirePermission
                                        requiredPermission="corrupted.unknown.perm"
                                    />
                                }
                            >
                                <Route path="/secret" element={<h1>Trang bí mật</h1>} />
                            </Route>
                        </Routes>
                    </TestAppWrapper>
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.queryByText('Trang bí mật')).toBeNull()
        expect(screen.getByTestId('location-display').textContent).toBe('/admin')
    })
})
