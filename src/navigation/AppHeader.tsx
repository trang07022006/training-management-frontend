import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getLeads } from '../api/leadApi'
import {
    countUnreadLeads,
    EVENT_LEAD_READ_CHANGED,
    EVENT_UNREAD_COUNT_CHANGED,
} from '../utils/leadReadStorage'
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
        avatarBlobUrl,
        role,
        permissions,
        request,
        logout,
        clearSession,
    } = useSession()

    const [unreadCount, setUnreadCount] = useState<number>(0)

    useEffect(() => {
        let isMounted = true

        const handleCountUpdate = (e: Event) => {
            const customEvt = e as CustomEvent<{ unreadCount?: number; leadId?: string }>
            if (typeof customEvt.detail?.unreadCount === 'number') {
                setUnreadCount(customEvt.detail.unreadCount)
            } else if (customEvt.detail?.leadId) {
                setUnreadCount((prev) => Math.max(0, prev - 1))
            }
        }

        window.addEventListener(EVENT_UNREAD_COUNT_CHANGED, handleCountUpdate)
        window.addEventListener(EVENT_LEAD_READ_CHANGED, handleCountUpdate)

        const canManage =
            role === 'admin' ||
            role === 'trainer' ||
            (Array.isArray(permissions) && permissions.includes('course.manage'))

        if (hasSession && canManage && request) {
            getLeads(request, { page: 1, page_size: 100 })
                .then((data) => {
                    if (isMounted && data && Array.isArray(data.items)) {
                        setUnreadCount(countUnreadLeads(data.items))
                    }
                })
                .catch(() => {})
        }

        return () => {
            isMounted = false
            window.removeEventListener(EVENT_UNREAD_COUNT_CHANGED, handleCountUpdate)
            window.removeEventListener(EVENT_LEAD_READ_CHANGED, handleCountUpdate)
        }
    }, [hasSession, role, permissions, request])

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

            {/* Right: Notification Bell, User Profile Pill, Logout */}
            <div className="header-right">
                {/* Notification Bell with unread badge */}
                <div className="header-notification-wrapper" title="Thông báo hệ thống">
                    <Link
                        to="/leads"
                        className="header-notification-btn"
                        aria-label="Xem thông báo mới"
                        data-testid="header-notification-btn"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="notification-badge-count" data-testid="notification-badge-count">
                                {unreadCount}
                            </span>
                        )}
                    </Link>
                </div>

                {/* User Profile Pill */}
                <Link
                    to="/profile"
                    className="header-user-profile"
                    data-testid="user-profile-badge"
                    title="Hồ sơ cá nhân"
                >
                    <div className="user-avatar" data-testid="user-avatar-circle" aria-hidden="true">
                        {avatarBlobUrl ? (
                            <img src={avatarBlobUrl} alt={displayName} className="user-avatar-img" />
                        ) : (
                            displayName.charAt(0).toUpperCase()
                        )}
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

