import { useSession } from '../auth/SessionProvider'
import { getUserDisplayName, getUserRoleDisplay } from './userProfileUtils'
import './AppHeader.css'

export interface AppHeaderProps {
    onToggleSidebar?: () => void
    userName?: string | null
    userEmail?: string | null
}

/**
 * Thành phần Header hệ thống hiển thị định danh và vai trò người dùng (SCRUM-23 Phase 3).
 */
export function AppHeader({
    onToggleSidebar,
    userName,
    userEmail,
}: AppHeaderProps) {
    const { hasSession, userId, role, logout, clearSession } = useSession()

    if (!hasSession) {
        return null
    }

    const displayName = getUserDisplayName({
        name: userName,
        email: userEmail,
        userId,
    })

    const roleLabel = getUserRoleDisplay(role)

    return (
        <header className="app-header" data-testid="app-header">
            <div className="header-left">
                {onToggleSidebar && (
                    <button
                        type="button"
                        className="sidebar-toggle-btn"
                        onClick={onToggleSidebar}
                        aria-label="Mở menu điều hướng"
                        data-testid="sidebar-toggle-button"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                )}
                <div className="header-title-container">
                    <span className="header-app-title">Hệ thống Quản lý Đào tạo</span>
                </div>
            </div>

            <div className="header-right">
                <div className="header-user-profile" data-testid="user-profile-badge">
                    <div className="user-avatar" aria-hidden="true">
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
                </div>
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
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Đăng xuất</span>
                </button>
            </div>
        </header>
    )
}
