// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SessionProvider } from '../auth/SessionProvider'
import { AppLayout } from '../navigation/AppLayout'
import { UserProfilePage } from './UserProfilePage'

vi.mock('../api/userAvatarApi', () => ({
    getProfileAvatarApi: vi.fn().mockRejectedValue(new Error('Mock avatar')),
    createSafeObjectUrl: vi.fn().mockReturnValue(''),
    revokeSafeObjectUrl: vi.fn(),
    ALLOWED_AVATAR_MIME_TYPES: ['image/jpeg', 'image/png'],
}))

const mockFetch = vi.fn()

vi.stubGlobal('fetch', mockFetch)

function TestApp() {
    return (
        <Routes>
            <Route element={<AppLayout />}>
                <Route path="/profile" element={<UserProfilePage />} />
            </Route>
        </Routes>
    )
}

describe('Header and Sidebar Sync Test', () => {
    beforeEach(() => {
        sessionStorage.clear()
        localStorage.clear()
        mockFetch.mockReset()
        
        mockFetch.mockImplementation(async (url, init) => {
            const path = typeof url === 'string' ? url : url.toString()
            if (path.includes('/api/auth/session')) {
                return new Response(JSON.stringify({ user_id: 'user-1', role: 'admin', roles: ['admin'], permissions: [] }))
            }
            if (path.includes('/api/v1/users/profile') && (!init || init.method === 'GET')) {
                return new Response(JSON.stringify({
                    status: 'success',
                    data: {
                        name: 'Quản trị viên Demo',
                        email: 'admin@demo.com',
                        role: 'admin'
                    }
                }))
            }
            if (path.includes('/api/v1/users/profile') && init?.method === 'PUT') {
                const body = JSON.parse(String(init.body))
                return new Response(JSON.stringify({
                    status: 'success',
                    data: {
                        name: body.name,
                        email: 'admin@demo.com',
                        role: 'admin'
                    }
                }))
            }
            throw new Error(`Unexpected request: ${path}`)
        })

        // Prepare session
        sessionStorage.setItem('tms_session_data', JSON.stringify({
            tokens: { accessToken: 'a', refreshToken: 'r' },
            role: 'admin',
            roles: ['admin'],
            permissions: [],
            userId: 'user-1',
            userName: 'Quản trị viên Demo',
            userEmail: 'admin@demo.com'
        }))
    })

    afterEach(() => {
        cleanup()
    })

    it('syncs name to header and sidebar after updating profile', async () => {
        render(
            <MemoryRouter initialEntries={['/profile']}>
                <SessionProvider apiOrigin="http://localhost">
                    <TestApp />
                </SessionProvider>
            </MemoryRouter>
        )

        await waitFor(() => {
            const input = screen.getByTestId('input-profile-name') as HTMLInputElement
            expect(input.value).toBe('Quản trị viên Demo')
        })

        const headerName = screen.getByTestId('user-display-name')
        const sidebarName = screen.getByTestId('sidebar-user-name')
        expect(headerName.textContent).toBe('Quản trị viên Demo')
        expect(sidebarName.textContent).toBe('Quản trị viên Demo')

        // Update profile
        fireEvent.change(screen.getByTestId('input-profile-name'), { target: { value: 'Thùy Linh' } })
        fireEvent.click(screen.getByTestId('btn-save-profile'))

        await waitFor(() => {
            expect(screen.getByText('Cập nhật hồ sơ thành công.')).toBeTruthy()
        })

        const updatedHeaderName = screen.getByTestId('user-display-name')
        const updatedSidebarName = screen.getByTestId('sidebar-user-name')
        expect(updatedHeaderName.textContent).toBe('Thùy Linh')
        expect(updatedSidebarName.textContent).toBe('Thùy Linh')
    })
})
