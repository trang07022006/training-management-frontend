import { useLocation, Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    APP_MENU_CONFIG,
    filterMenuItems,
    isMenuActive,
    type MenuItem,
} from './menuConfig'
import { getUserDisplayName, getUserRoleDisplay } from './userProfileUtils'
import './Sidebar.css'

export interface SidebarProps {
    isOpen?: boolean
    isCollapsed?: boolean
    onClose?: () => void
    onToggleCollapse?: () => void
    customMenuItems?: readonly MenuItem[]
    userName?: string | null
    userEmail?: string | null
}

/**
 * Biểu tượng trực quan đồng bộ với giao diện ICTU.
 */
function getMenuIcon(iconName?: string) {
    switch (iconName) {
        case 'dashboard':
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            )
        case 'shield':
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
            )
        case 'users':
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            )
        case 'chalkboard-teacher':
        case 'chalkboard':
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <path d="M12 18v4" />
                    <path d="M8 22h8" />
                </svg>
            )
        case 'user-graduate':
        case 'graduation-cap':
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
        case 'book-open':
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
            )
        case 'calendar':
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
            )
        case 'chart-bar':
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
            )
        case 'bell':
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
            )
        case 'settings':
            return (
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
 * Thành phần Sidebar điều hướng hiển thị theo nhận diện chuẩn ICTU.
 */
export function Sidebar({
    isOpen = false,
    isCollapsed = false,
    onClose,
    onToggleCollapse,
    customMenuItems,
    userName: propUserName,
    userEmail: propUserEmail,
}: SidebarProps) {
    const {
        hasSession,
        role,
        roles,
        permissions,
        userId,
        userName: contextUserName,
        userEmail: contextUserEmail,
        avatarBlobUrl,
    } = useSession()
    const location = useLocation()

    const finalDisplayName = getUserDisplayName({
        name: propUserName ?? contextUserName,
        email: propUserEmail ?? contextUserEmail,
        userId,
    })

    // Lọc menu theo quyền người dùng thực tế
    const menuSource = customMenuItems ?? APP_MENU_CONFIG
    const visibleMenuItems = filterMenuItems(menuSource, {
        hasSession,
        role,
        roles,
        permissions,
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
                className={`app-sidebar ${isOpen ? 'is-open' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}
                aria-label="Thanh điều hướng chính"
                data-testid="app-sidebar"
            >
                {/* Brand Header */}
                <div className="sidebar-brand">
                    <Link
                        to="/"
                        className="sidebar-brand-link"
                        title="Website công khai ICTU"
                        data-testid="sidebar-public-link"
                    >
                        <div className="sidebar-logo-icon" aria-hidden="true">
                            <img
                                src="/branding/ictu/logo.png"
                                alt="Logo ICTU"
                                className="sidebar-brand-img"
                            />
                        </div>
                        <div className="sidebar-brand-text">
                            <span className="sidebar-brand-acronym">ICTU</span>
                            <span className="sidebar-brand-title">QUẢN LÝ ĐÀO TẠO</span>
                        </div>
                    </Link>

                    {/* Nút 3 gạch thu gọn / ẩn thanh menu ở góc bên phải của sidebar */}
                    {(onToggleCollapse || onClose) && (
                        <button
                            type="button"
                            className="sidebar-close-btn"
                            onClick={onToggleCollapse || onClose}
                            aria-label="Thu gọn thanh điều hướng"
                            title="Thu gọn thanh điều hướng"
                            data-testid="sidebar-close-button"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Navigation Menu */}
                <nav className="sidebar-nav">
                    <ul className="sidebar-menu-list" role="list">
                        {visibleMenuItems.map((item) => {
                            const isActive = isMenuActive(item, location.pathname)
                            const isExpandable = item.key === 'training_programs' || item.key === 'courses'
                            const isHidden = item.key === 'change_password'

                            return (
                                <li
                                    key={item.key}
                                    className="sidebar-menu-item"
                                    style={isHidden ? { display: 'none' } : undefined}
                                >
                                    <Link
                                        to={item.path}
                                        className={`sidebar-nav-link ${isActive ? 'is-active' : ''}`}
                                        aria-current={isActive ? 'page' : undefined}
                                        onClick={onClose}
                                        data-testid={`menu-item-${item.key}`}
                                    >
                                        {getMenuIcon(item.icon)}
                                        <span className="menu-label">{item.label}</span>
                                        {isExpandable && (
                                            <span className="menu-expand-chevron" aria-hidden="true">
                                                ▾
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                {/* Slogan Banner Watermark */}
                <div className="sidebar-watermark-card" aria-hidden="true">
                    <img
                        src="/branding/ictu/building.png"
                        alt=""
                        className="sidebar-watermark-bg"
                    />
                    <div className="sidebar-watermark-overlay" />
                    <div className="sidebar-watermark-content">
                        <span className="sidebar-slogan-line1">Kết nối tri thức</span>
                        <span className="sidebar-slogan-line2">Kiến tạo tương lai</span>
                        <div className="sidebar-slogan-divider" />
                    </div>
                </div>

                {/* User Profile Bar */}
                {hasSession && (
                    <Link
                        to="/profile"
                        className="sidebar-user-footer"
                        data-testid="sidebar-user-footer"
                        onClick={onClose}
                        title="Hồ sơ cá nhân"
                    >
                        <div className="sidebar-user-avatar" aria-hidden="true">
                            {avatarBlobUrl ? (
                                <img src={avatarBlobUrl} alt={finalDisplayName} className="user-avatar-img" />
                            ) : (
                                finalDisplayName.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name" data-testid="sidebar-user-name">
                                {finalDisplayName}
                            </span>
                            <span className="sidebar-user-role" data-testid="sidebar-user-role">
                                {getUserRoleDisplay(role)}
                            </span>
                        </div>
                    </Link>
                )}
            </aside>
        </>
    )
}

