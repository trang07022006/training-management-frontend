import { useLocation, Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    APP_MENU_CONFIG,
    filterMenuItems,
    type MenuItem,
} from './menuConfig'
import './Sidebar.css'

export interface SidebarProps {
    isOpen?: boolean
    onClose?: () => void
    customMenuItems?: readonly MenuItem[]
}

/**
 * Biểu tượng trực quan cho từng loại menu.
 */
function getMenuIcon(iconName?: string) {
    switch (iconName) {
        case 'dashboard':
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="9" />
                    <rect x="14" y="3" width="7" height="5" />
                    <rect x="14" y="12" width="7" height="9" />
                    <rect x="3" y="16" width="7" height="5" />
                </svg>
            )
        case 'shield':
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
            )
        case 'chalkboard-teacher':
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <path d="M12 18v4" />
                    <path d="M8 22h8" />
                </svg>
            )
        case 'user-graduate':
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                </svg>
            )
        case 'book':
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
            )
        case 'key':
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 2l-2 2m-1.5 1.5L14 9l-3-3L3.5 13.5a5 5 0 1 0 7 7L18 13l2-2" />
                    <circle cx="7.5" cy="16.5" r="1.5" />
                </svg>
            )
        default:
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                </svg>
            )
    }
}

/**
 * Thành phần Sidebar điều hướng hiển thị theo quyền người dùng (SCRUM-23).
 */
export function Sidebar({ isOpen = false, onClose, customMenuItems }: SidebarProps) {
    const { hasSession, role } = useSession()
    const location = useLocation()

    // Lọc menu theo quyền người dùng thực tế
    const menuSource = customMenuItems ?? APP_MENU_CONFIG
    const visibleMenuItems = filterMenuItems(menuSource, {
        hasSession,
        role,
    })

    return (
        <>
            {/* Lớp phủ mờ (backdrop) khi mở sidebar trên màn hình nhỏ */}
            {isOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={onClose}
                    aria-hidden="true"
                    data-testid="sidebar-backdrop"
                />
            )}

            <aside
                className={`app-sidebar ${isOpen ? 'is-open' : ''}`}
                aria-label="Thanh điều hướng chính"
                data-testid="app-sidebar"
            >
                <div className="sidebar-brand">
                    <div className="sidebar-logo-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                            <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                        </svg>
                    </div>
                    <span className="sidebar-brand-title">Đào Tạo & RBAC</span>

                    {/* Nút đóng sidebar trên màn hình di động */}
                    {onClose && (
                        <button
                            type="button"
                            className="sidebar-close-btn"
                            onClick={onClose}
                            aria-label="Đóng thanh điều hướng"
                            data-testid="sidebar-close-button"
                        >
                            &times;
                        </button>
                    )}
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-section-title">DANH MỤC HỆ THỐNG</div>
                    <ul className="sidebar-menu-list" role="list">
                        {visibleMenuItems.map((item) => {
                            const isActive = location.pathname === item.path

                            return (
                                <li key={item.key} className="sidebar-menu-item">
                                    <Link
                                        to={item.path}
                                        className={`sidebar-nav-link ${isActive ? 'is-active' : ''}`}
                                        aria-current={isActive ? 'page' : undefined}
                                        onClick={onClose}
                                        data-testid={`menu-item-${item.key}`}
                                    >
                                        {getMenuIcon(item.icon)}
                                        <span className="menu-label">{item.label}</span>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </nav>
            </aside>
        </>
    )
}
