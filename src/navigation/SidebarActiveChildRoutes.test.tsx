// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { SessionProvider, useSession } from '../auth/SessionProvider'
import { Sidebar } from './Sidebar'
import { APP_MENU_CONFIG, isMenuActive } from './menuConfig'

afterEach(() => {
    cleanup()
})

function SessionInitializer({ role }: { role?: string | null }) {
    const { startSession } = useSession()
    useEffect(() => {
        startSession({ accessToken: 'test-token', refreshToken: 'test-refresh' }, role)
    }, [role, startSession])
    return null
}

describe('Sidebar Active State for Training Programs and Child Routes', () => {
    const renderSidebarAtRoute = (initialPath: string) => {
        return render(
            <MemoryRouter initialEntries={[initialPath]}>
                <SessionProvider apiOrigin="http://localhost:5000">
                    <SessionInitializer role="admin" />
                    <Sidebar />
                    <Routes>
                        <Route path="/dashboard" element={<div data-testid="page-dashboard">Dashboard</div>} />
                        <Route path="/training-programs" element={<div data-testid="page-tp-list">Danh sách</div>} />
                        <Route path="/training-programs/short-term" element={<div data-testid="page-tp-short">Ngắn hạn</div>} />
                        <Route path="/program-structure" element={<div data-testid="page-structure">Cấu trúc</div>} />
                        <Route path="/training-programs/:id" element={<div data-testid="page-tp-detail">Chi tiết</div>} />
                        <Route path="/training-programs/:id/structure" element={<div data-testid="page-tp-id-struct">Cấu trúc chi tiết</div>} />
                        <Route path="/subjects" element={<div data-testid="page-subjects">Môn học</div>} />
                        <Route path="/subjects/:id/sessions" element={<div data-testid="page-sessions">Buổi học</div>} />
                        <Route path="/users" element={<div data-testid="page-users">Người dùng</div>} />
                        <Route path="/profile" element={<div data-testid="page-profile">Hồ sơ</div>} />
                    </Routes>
                </SessionProvider>
            </MemoryRouter>,
        )
    }

    describe('1. Helper isMenuActive unit tests', () => {
        const tpItem = APP_MENU_CONFIG.find((i) => i.key === 'training_programs')!
        const tpChildren = tpItem.children ?? []
        const tpListItem = tpChildren.find((c) => c.key === 'training_programs_list')!
        const tpShortItem = tpChildren.find((c) => c.key === 'training_programs_short_term')!
        const tpStructItem = tpChildren.find((c) => c.key === 'training_programs_structure')!
        const subjectsItem = APP_MENU_CONFIG.find((i) => i.key === 'subjects')!
        const usersItem = APP_MENU_CONFIG.find((i) => i.key === 'users')!

        it('khớp chính xác trang /training-programs -> parent và child list active', () => {
            expect(isMenuActive(tpItem, '/training-programs')).toBe(true)
            expect(isMenuActive(tpListItem, '/training-programs')).toBe(true)
            expect(isMenuActive(tpShortItem, '/training-programs')).toBe(false)
            expect(isMenuActive(tpStructItem, '/training-programs')).toBe(false)
        })

        it('khớp trang con ngắn hạn /training-programs/short-term -> parent và child short-term active, child list không active', () => {
            expect(isMenuActive(tpItem, '/training-programs/short-term')).toBe(true)
            expect(isMenuActive(tpShortItem, '/training-programs/short-term')).toBe(true)
            expect(isMenuActive(tpListItem, '/training-programs/short-term')).toBe(false)
            expect(isMenuActive(tpStructItem, '/training-programs/short-term')).toBe(false)
        })

        it('khớp trang con cấu trúc /program-structure và /training-programs/42/structure -> parent và child structure active', () => {
            expect(isMenuActive(tpItem, '/program-structure')).toBe(true)
            expect(isMenuActive(tpStructItem, '/program-structure')).toBe(true)
            expect(isMenuActive(tpListItem, '/program-structure')).toBe(false)

            expect(isMenuActive(tpItem, '/training-programs/42/structure')).toBe(true)
            expect(isMenuActive(tpStructItem, '/training-programs/42/structure')).toBe(true)
            expect(isMenuActive(tpListItem, '/training-programs/42/structure')).toBe(false)
        })

        it('khớp trang chi tiết /training-programs/99 -> parent active', () => {
            expect(isMenuActive(tpItem, '/training-programs/99')).toBe(true)
        })

        it('trang /subjects và /subjects/1/sessions KHÔNG làm Chương trình đào tạo active', () => {
            expect(isMenuActive(tpItem, '/subjects')).toBe(false)
            expect(isMenuActive(tpItem, '/subjects/1/sessions')).toBe(false)

            // Ngược lại, menu Môn học phải active đúng
            expect(isMenuActive(subjectsItem, '/subjects')).toBe(true)
            expect(isMenuActive(subjectsItem, '/subjects/1/sessions')).toBe(true)
        })

        it('trang /users?tab=import -> menu người dùng active, chương trình đào tạo không active', () => {
            expect(isMenuActive(usersItem, '/users?tab=import')).toBe(true)
            expect(isMenuActive(tpItem, '/users?tab=import')).toBe(false)
        })
    })

    describe('2. UI & Interaction: Giữ highlight cha và mở submenu', () => {
        it('truy cập /training-programs -> parent active, submenu tự mở, child Danh sách chương trình active', () => {
            renderSidebarAtRoute('/training-programs')

            const parentLink = screen.getByTestId('menu-item-training_programs')
            expect(parentLink.classList.contains('is-active')).toBe(true)

            // Submenu tự mở
            expect(screen.getByTestId('submenu-training_programs')).toBeDefined()

            const childListLink = screen.getByTestId('menu-item-training_programs_list')
            expect(childListLink.classList.contains('is-active')).toBe(true)

            const childShortLink = screen.getByTestId('menu-item-training_programs_short_term')
            expect(childShortLink.classList.contains('is-active')).toBe(false)
        })

        it('truy cập /training-programs/short-term (refresh giả lập) -> parent vẫn active, child ngắn hạn active', () => {
            renderSidebarAtRoute('/training-programs/short-term')

            const parentLink = screen.getByTestId('menu-item-training_programs')
            expect(parentLink.classList.contains('is-active')).toBe(true)

            // Submenu vẫn mở khi refresh/vào thẳng URL
            expect(screen.getByTestId('submenu-training_programs')).toBeDefined()

            const childShortLink = screen.getByTestId('menu-item-training_programs_short_term')
            expect(childShortLink.classList.contains('is-active')).toBe(true)

            const childListLink = screen.getByTestId('menu-item-training_programs_list')
            expect(childListLink.classList.contains('is-active')).toBe(false)
        })

        it('click chọn "Chương trình ngắn hạn" -> điều hướng và cập nhật active state đúng', () => {
            renderSidebarAtRoute('/training-programs')

            const childShortLink = screen.getByTestId('menu-item-training_programs_short_term')
            fireEvent.click(childShortLink)

            const parentLink = screen.getByTestId('menu-item-training_programs')
            expect(parentLink.classList.contains('is-active')).toBe(true)
            expect(childShortLink.classList.contains('is-active')).toBe(true)
            expect(screen.getByTestId('menu-item-training_programs_list').classList.contains('is-active')).toBe(false)
        })

        it('click chevron mở/đóng submenu hoạt động mượt mà', () => {
            renderSidebarAtRoute('/dashboard')

            // Khi ở /dashboard, submenu training_programs đang đóng
            expect(screen.queryByTestId('submenu-training_programs')).toBeNull()

            const chevron = screen.getByTestId('chevron-training_programs')
            fireEvent.click(chevron)

            // Submenu mở ra
            expect(screen.getByTestId('submenu-training_programs')).toBeDefined()

            // Click chevron lần nữa -> đóng lại
            fireEvent.click(chevron)
            expect(screen.queryByTestId('submenu-training_programs')).toBeNull()
        })

        it('ở trang /subjects/5/sessions -> menu Môn học active, Chương trình đào tạo không active', () => {
            renderSidebarAtRoute('/subjects/5/sessions')

            const subjectsLink = screen.getByTestId('menu-item-subjects')
            expect(subjectsLink.classList.contains('is-active')).toBe(true)

            const tpLink = screen.getByTestId('menu-item-training_programs')
            expect(tpLink.classList.contains('is-active')).toBe(false)
        })

        it('ở trang /profile -> footer người dùng được highlight active', () => {
            renderSidebarAtRoute('/profile')

            const userFooter = screen.getByTestId('sidebar-user-footer')
            expect(userFooter.classList.contains('is-active')).toBe(true)
        })
    })
})
