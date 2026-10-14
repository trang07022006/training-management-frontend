// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes, Link } from 'react-router'
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
    const tpItem = APP_MENU_CONFIG.find((i) => i.key === 'training_programs')!
    const subjectsItem = APP_MENU_CONFIG.find((i) => i.key === 'subjects')!
    const usersItem = APP_MENU_CONFIG.find((i) => i.key === 'users')!

    describe('1. Helper isMenuActive unit tests', () => {
        it('khớp chính xác trang danh sách /training-programs -> active', () => {
            expect(isMenuActive(tpItem, '/training-programs')).toBe(true)
            expect(isMenuActive(tpItem, '/training-programs/')).toBe(true)
        })

        it('khớp trang cấu trúc /training-programs/:programId/structure -> Chương trình đào tạo vẫn active', () => {
            expect(isMenuActive(tpItem, '/training-programs/10/structure')).toBe(true)
            expect(isMenuActive(tpItem, '/training-programs/it-k20/structure')).toBe(true)
        })

        it('khớp các route con thực tế khác của /training-programs -> vẫn active', () => {
            expect(isMenuActive(tpItem, '/training-programs/42')).toBe(true)
        })

        it('không active sai khi đang ở /subjects hoặc route con của subjects', () => {
            expect(isMenuActive(tpItem, '/subjects')).toBe(false)
            expect(isMenuActive(tpItem, '/subjects/5/sessions')).toBe(false)
            expect(isMenuActive(subjectsItem, '/subjects')).toBe(true)
            expect(isMenuActive(subjectsItem, '/subjects/5/sessions')).toBe(true)
        })

        it('không active sai khi đang ở /users hoặc /courses', () => {
            expect(isMenuActive(tpItem, '/users')).toBe(false)
            expect(isMenuActive(tpItem, '/courses')).toBe(false)
            expect(isMenuActive(usersItem, '/users')).toBe(true)
        })
    })

    describe('2. Sidebar UI Integration Tests', () => {
        function TestApp({ initialEntry }: { initialEntry: string }) {
            return (
                <MemoryRouter initialEntries={[initialEntry]}>
                    <SessionProvider apiOrigin="http://localhost:5000">
                        <SessionInitializer role="admin" />
                        <Sidebar />
                        <Routes>
                            <Route
                                path="/training-programs"
                                element={
                                    <div data-testid="page-training-programs">
                                        <h1>Quản lý Chương trình đào tạo</h1>
                                        {/* Nút Cấu trúc tương tự bảng danh sách thực tế */}
                                        <Link
                                            to="/training-programs/42/structure"
                                            data-testid="btn-structure-42"
                                        >
                                            Cấu trúc
                                        </Link>
                                    </div>
                                }
                            />
                            <Route
                                path="/training-programs/:programId/structure"
                                element={
                                    <div data-testid="page-program-structure">
                                        <h1>Cấu trúc chương trình đào tạo</h1>
                                        <Link
                                            to="/training-programs"
                                            data-testid="btn-back-to-list"
                                        >
                                            Quay lại danh sách
                                        </Link>
                                    </div>
                                }
                            />
                            <Route
                                path="/subjects"
                                element={<div data-testid="page-subjects">Môn học</div>}
                            />
                        </Routes>
                    </SessionProvider>
                </MemoryRouter>
            )
        }

        it('Test 1: /training-programs -> "Chương trình đào tạo" active, KHÔNG có submenu', () => {
            render(<TestApp initialEntry="/training-programs" />)

            const tpLink = screen.getByTestId('menu-item-training_programs')
            expect(tpLink.classList.contains('is-active')).toBe(true)
            expect(tpLink.getAttribute('aria-current')).toBe('page')

            // Đảm bảo không render submenu phụ
            expect(screen.queryByTestId('submenu-training_programs')).toBeNull()
            expect(screen.queryByText('Danh sách chương trình')).toBeNull()
            expect(screen.queryByText('Chương trình ngắn hạn')).toBeNull()
            expect(screen.queryByText('Cấu trúc chương trình')).toBeNull()
        })

        it('Test 2: Click nút "Cấu trúc" của một chương trình -> chuyển trang cấu trúc -> "Chương trình đào tạo" VẪN active', () => {
            render(<TestApp initialEntry="/training-programs" />)

            const tpLink = screen.getByTestId('menu-item-training_programs')
            expect(tpLink.classList.contains('is-active')).toBe(true)

            // Click nút Cấu trúc trên bảng
            const structureBtn = screen.getByTestId('btn-structure-42')
            fireEvent.click(structureBtn)

            // Trang cấu trúc được mở
            expect(screen.getByTestId('page-program-structure')).toBeDefined()

            // Mục Chương trình đào tạo trên sidebar VẪN active
            expect(tpLink.classList.contains('is-active')).toBe(true)
            expect(tpLink.getAttribute('aria-current')).toBe('page')

            // KHÔNG xuất hiện submenu bên dưới
            expect(screen.queryByTestId('submenu-training_programs')).toBeNull()
        })

        it('Test 3: Refresh tại trang cấu trúc (/training-programs/42/structure) -> VẪN active', () => {
            render(<TestApp initialEntry="/training-programs/42/structure" />)

            expect(screen.getByTestId('page-program-structure')).toBeDefined()

            const tpLink = screen.getByTestId('menu-item-training_programs')
            expect(tpLink.classList.contains('is-active')).toBe(true)
            expect(tpLink.getAttribute('aria-current')).toBe('page')

            // KHÔNG xuất hiện submenu
            expect(screen.queryByTestId('submenu-training_programs')).toBeNull()
        })

        it('Test 4: Back về danh sách (/training-programs) -> vẫn active đúng', () => {
            render(<TestApp initialEntry="/training-programs/42/structure" />)

            const backBtn = screen.getByTestId('btn-back-to-list')
            fireEvent.click(backBtn)

            expect(screen.getByTestId('page-training-programs')).toBeDefined()

            const tpLink = screen.getByTestId('menu-item-training_programs')
            expect(tpLink.classList.contains('is-active')).toBe(true)
            expect(tpLink.getAttribute('aria-current')).toBe('page')
        })

        it('Test 5: Đi sang /subjects -> "Chương trình đào tạo" KHÔNG active, "Môn học" active', () => {
            render(<TestApp initialEntry="/subjects" />)

            const tpLink = screen.getByTestId('menu-item-training_programs')
            expect(tpLink.classList.contains('is-active')).toBe(false)
            expect(tpLink.getAttribute('aria-current')).toBeNull()

            const subjectsLink = screen.getByTestId('menu-item-subjects')
            expect(subjectsLink.classList.contains('is-active')).toBe(true)
            expect(subjectsLink.getAttribute('aria-current')).toBe('page')
        })

        it('Verify: cấu trúc sidebar nguyên bản được bảo toàn (NEW MENU ITEMS ADDED = 0)', () => {
            render(<TestApp initialEntry="/training-programs" />)

            // Không có submenu lists hoặc children bổ sung
            const submenuLists = document.querySelectorAll('.sidebar-submenu-list')
            expect(submenuLists.length).toBe(0)

            // Kiểm tra số lượng menu ban đầu cho role admin:
            // overview, admin_dashboard, users, courses, training_programs, subjects, leads, change_password
            expect(screen.getByTestId('menu-item-overview')).toBeDefined()
            expect(screen.getByTestId('menu-item-admin_dashboard')).toBeDefined()
            expect(screen.getByTestId('menu-item-users')).toBeDefined()
            expect(screen.getByTestId('menu-item-courses')).toBeDefined()
            expect(screen.getByTestId('menu-item-training_programs')).toBeDefined()
            expect(screen.getByTestId('menu-item-subjects')).toBeDefined()
            expect(screen.getByTestId('menu-item-leads')).toBeDefined()
        })
    })
})
