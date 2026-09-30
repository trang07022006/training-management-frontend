import { useState } from 'react'
import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'
import { AppHeader } from './AppHeader'
import './AppLayout.css'

/**
 * Layout khung giao diện chính cho các trang được bảo vệ bởi phiên đăng nhập (SCRUM-23).
 * Bao gồm Sidebar (có menu lọc theo quyền), AppHeader (hiển thị định danh/vai trò) và khu vực nội dung chính.
 */
export function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="app-layout-container" data-testid="app-layout">
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="app-main-viewport">
                <AppHeader
                    onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
                />
                <main className="app-content-body" data-testid="app-content-body">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
