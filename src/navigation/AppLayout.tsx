import { useState } from 'react'
import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'
import { AppHeader } from './AppHeader'
import { GlobalToastContainer } from '../components/ToastPortal'
import './AppLayout.css'

/**
 * Layout khung giao diện chính cho các trang được bảo vệ bởi phiên đăng nhập (SCRUM-23).
 * Bao gồm Sidebar (có menu lọc theo quyền), AppHeader (hiển thị định danh/vai trò) và khu vực nội dung chính.
 */
export function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

    const handleToggleSidebar = () => {
        // Toggle mobile drawer
        setSidebarOpen((prev) => !prev)
        // Toggle desktop collapse state
        setIsSidebarCollapsed((prev) => !prev)
    }

    const handleCloseSidebar = () => {
        setSidebarOpen(false)
    }

    const handleCollapseSidebar = () => {
        setSidebarOpen(false)
        setIsSidebarCollapsed(true)
    }

    return (
        <div className="app-layout-container" data-testid="app-layout">
            {/* Background ICTU Campus with frosted white overlay for authenticated area */}
            <div className="app-main-bg" aria-hidden="true">
                <div className="app-main-bg-img" />
                <div className="app-main-bg-overlay" />
            </div>

            <GlobalToastContainer />

            <Sidebar
                isOpen={sidebarOpen}
                isCollapsed={isSidebarCollapsed}
                onClose={handleCloseSidebar}
                onToggleCollapse={handleCollapseSidebar}
            />

            <div className={`app-main-viewport ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <AppHeader
                    onToggleSidebar={handleToggleSidebar}
                />
                <main className="app-content-body" data-testid="app-content-body">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
