// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { AppLayout } from './AppLayout'

afterEach(() => {
    cleanup()
})

function SessionInitializer({ role }: { role?: string | null }) {
    const { startSession } = useSession()
    useEffect(() => {
        startSession({ accessToken: 'a', refreshToken: 'r' }, role)
    }, [role, startSession])
    return null
}

describe('SCRUM-23 Phase 4: AppLayout Integration', () => {
    it('1. render đầy đủ Sidebar, AppHeader và nội dung trang', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="admin" />
                    <Routes>
                        <Route element={<AppLayout />}>
                            <Route path="/" element={<h1>Trang Tổng Quan Hệ Thống</h1>} />
                        </Route>
                    </Routes>
                </SessionProvider>
            </MemoryRouter>,
        )

        expect(screen.getByTestId('app-layout')).toBeDefined()
        expect(screen.getByTestId('app-sidebar')).toBeDefined()
        expect(screen.getByTestId('app-header')).toBeDefined()
        expect(screen.getByText('Trang Tổng Quan Hệ Thống')).toBeDefined()
    })
})
