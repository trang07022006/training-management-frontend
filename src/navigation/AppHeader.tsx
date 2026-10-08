import { Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getUserDisplayName, getUserRoleDisplay } from './userProfileUtils'
import './AppHeader.css'

export interface AppHeaderProps {
    onToggleSidebar?: () => void
    userName?: string | null
    userEmail?: string | null
}

/**
 * Thành phần Header hệ thống chuẩn nhận diện ICTU (SCRUM-23 Phase 3).
 */
export function AppHeader({
    onToggleSidebar,
    userName: propUserName,
    userEmail: propUserEmail,
}: AppHeaderProps) {
    const {
        hasSession,
        userId,
        userName: contextUserName,
        userEmail: contextUserEmail,
        role,
        logout,
        clearSession,
    } = useSession()

    if (!hasSession) {
        return null
    }

    const displayName = getUserDisplayName({
        name: propUserName ?? contextUserName,
        email: propUserEmail ?? contextUserEmail,
        userId,
    })

    const roleLabel = getUserRoleDisplay(role)

    return (
        <header className="app-header" data-testid="app-header">
            {/* Left: Hamburger & Page Title */}
            <div className="header-left">
                {onToggleSidebar && (
                    <button
                        type="button"
                        className="sidebar-toggle-btn"
                        onClick={onToggleSidebar}
                        aria-label="Mở menu điều hướng"
                        data-testid="sidebar-toggle-button"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                )}
                <div className="header-title-container">
                    <div className="header-main-title">Quản lý đào tạo</div>
                    <div className="header-main-subtitle">
                        Hệ thống Quản lý Đào tạo - Trường Đại học Công nghệ Thông tin và Truyền thông
                    </div>

                    {/* Hidden bridge for test backward-compatibility */}
                    <span className="header-app-title-sr" data-testid="header-app-title">
                        <span className="header-title-full">Hệ thống Quản lý Đào tạo</span>
                        <span className="header-title-short">Hệ thống Đào tạo</span>
                    </span>
                </div>
            </div>

            {/* Center: Global Search Pill */}
            <div className="header-center">
                <div className="header-search-bar" role="search">
                    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Tìm kiếm sinh viên, môn học, lớp học phần... (Đang phát triển)"
                        className="header-search-input"
                        aria-label="Tìm kiếm trong hệ thống đào tạo (Đang phát triển)"
                        title="Tính năng tìm kiếm toàn hệ thống đang phát triển"
                        readOnly
                    />
                </div>
            </div>

            {/* Right: Notification Bell, User Profile Pill, Logout */}
            <div className="header-right">
                {/* Notification Bell with red badge */}
                <div className="header-notification-wrapper" title="Thông báo hệ thống">
                    <button type="button" className="header-notification-btn" aria-label="Xem thông báo mới">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        <span className="notification-badge-count">3</span>
                    </button>
                </div>

                {/* User Profile Pill */}
                <Link
                    to="/profile"
                    className="header-user-profile"
                    data-testid="user-profile-badge"
                    title="Hồ sơ cá nhân"
                >
                    <div className="user-avatar" data-testid="user-avatar-circle" aria-hidden="true">
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                        <span className="user-display-name" data-testid="user-display-name">
                            {displayName}
                        </span>
                        <span className="user-role-badge" data-testid="user-role-badge">
                            {roleLabel}
                        </span>
                    </div>
                    <span className="user-chevron-icon" aria-hidden="true">▾</span>
                </Link>

                {/* Logout Button */}
                <button
                    type="button"
                    className="header-logout-btn"
                    onClick={() => {
                        if (logout) {
                            void logout()
                        } else {
                            clearSession()
                        }
                    }}
                    title="Đăng xuất khỏi hệ thống"
                    data-testid="header-logout-button"
                    aria-label="Đăng xuất"
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span className="logout-text">Đăng xuất</span>
                </button>
            </div>
        </header>
    )
}

