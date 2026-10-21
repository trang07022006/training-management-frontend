import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useSession } from '../auth/SessionProvider'
import { getRoleHomePath } from '../auth/roleRouting'
import { LoginForm } from '../components/LoginForm'
import { QuickRoleLogin } from '../components/QuickRoleLogin'
import { getErrorMessage } from '../utils/errorMessages'
import './LoginPage.css'

export function LoginPage() {
    const { hasSession, startSession, apiOrigin, role } = useSession()
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [isLocked, setIsLocked] = useState(false)
    const [isInactive, setIsInactive] = useState(false)
    const [tempLockSeconds, setTempLockSeconds] = useState<number | null>(null)
    const [initialEmail, setInitialEmail] = useState<string | undefined>()
    const [initialPassword, setInitialPassword] = useState<string | undefined>()

    const handleTempLockEnd = () => {
        setTempLockSeconds(null)
        setErrorMessage(null)
    }

    const handleInputChange = () => {
        if (isLocked || isInactive) {
            setIsLocked(false)
            setIsInactive(false)
            setErrorMessage(null)
        }
    }

    async function handleLogin(email: string, password: string, remember = false) {
        setIsLoading(true)
        setErrorMessage(null)

        try {
            const origin = apiOrigin || window.location.origin
            const url = new URL('/api/auth/login', origin).href

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })

            const data: unknown = await response.json().catch(() => null)

            if (!response.ok) {
                const anyData = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
                const code = anyData && typeof anyData.code === 'string' ? anyData.code : null
                const rawMsg = anyData && typeof anyData.message === 'string' ? anyData.message : null
                const lockedUntil = anyData && typeof anyData.locked_until === 'string' ? anyData.locked_until : null
                const retryAfter = anyData && typeof anyData.retry_after_seconds === 'number' ? anyData.retry_after_seconds : null

                const isTempLock =
                    code === 'ACCOUNT_TEMP_LOCKED' ||
                    lockedUntil !== null ||
                    typeof retryAfter === 'number' ||
                    (code === 'ACCOUNT_LOCKED' && Boolean(rawMsg && (rawMsg.includes('tạm thời') || rawMsg.includes('15 phút'))))

                if (isTempLock) {
                    setIsLocked(false)
                    setIsInactive(false)
                    let seconds = retryAfter
                    if (seconds === null && lockedUntil) {
                        seconds = Math.max(1, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000))
                    }
                    if (seconds === null || isNaN(seconds)) {
                        seconds = 900
                    }
                    setTempLockSeconds(seconds)
                    setErrorMessage(rawMsg || 'Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá số lần cho phép. Vui lòng thử lại sau.')
                } else if (code === 'ACCOUNT_LOCKED') {
                    setIsLocked(true)
                    setIsInactive(false)
                    setTempLockSeconds(null)
                    setErrorMessage(rawMsg || 'Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.')
                } else if (code === 'ACCOUNT_INACTIVE' || code === 'ACCOUNT_DISABLED') {
                    setIsInactive(true)
                    setIsLocked(false)
                    setTempLockSeconds(null)
                    setErrorMessage(rawMsg || 'Tài khoản hiện không hoạt động. Vui lòng liên hệ quản trị viên.')
                } else {
                    setIsLocked(false)
                    setIsInactive(false)
                    setTempLockSeconds(null)
                    const message = getErrorMessage(
                        { code, message: rawMsg },
                        'Email hoặc mật khẩu không đúng.',
                    )
                    setErrorMessage(message)
                }
                return
            }

            if (
                typeof data !== 'object' ||
                data === null ||
                !('access_token' in data) ||
                !('refresh_token' in data) ||
                typeof data.access_token !== 'string' ||
                typeof data.refresh_token !== 'string'
            ) {
                setErrorMessage('Phản hồi đăng nhập không hợp lệ.')
                return
            }

            const userRole =
                'user' in data &&
                typeof data.user === 'object' &&
                data.user !== null &&
                'role' in data.user &&
                typeof data.user.role === 'string'
                    ? data.user.role
                    : null

            const userRoles =
                'user' in data &&
                typeof data.user === 'object' &&
                data.user !== null &&
                'roles' in data.user &&
                Array.isArray(data.user.roles)
                    ? data.user.roles.filter((r): r is string => typeof r === 'string')
                    : (userRole ? [userRole] : [])

            const userPermissions =
                'user' in data &&
                typeof data.user === 'object' &&
                data.user !== null &&
                'permissions' in data.user &&
                Array.isArray(data.user.permissions)
                    ? data.user.permissions.filter((p): p is string => typeof p === 'string')
                    : []

            const userId =
                'user' in data &&
                typeof data.user === 'object' &&
                data.user !== null &&
                'id' in data.user
                    ? String(data.user.id)
                    : null

            const userName =
                'user' in data &&
                typeof data.user === 'object' &&
                data.user !== null &&
                'name' in data.user &&
                typeof data.user.name === 'string'
                    ? data.user.name
                    : null

            const userEmail =
                'user' in data &&
                typeof data.user === 'object' &&
                data.user !== null &&
                'email' in data.user &&
                typeof data.user.email === 'string'
                    ? data.user.email
                    : email

            const mustChangePassword = Boolean(
                ('must_change_password' in data && data.must_change_password) ||
                ('user' in data &&
                    typeof data.user === 'object' &&
                    data.user !== null &&
                    'must_change_password' in data.user &&
                    data.user.must_change_password)
            )

            // Cập nhật session theo cơ chế SCRUM-19 và SCRUM-26
            startSession(
                {
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                },
                userRole,
                userId,
                remember,
                userName,
                userEmail,
                userRoles,
                userPermissions,
                undefined,
                mustChangePassword,
            )

            if (mustChangePassword) {
                navigate('/change-password', {
                    replace: true,
                    state: {
                        forced: true,
                        message: 'Bạn cần đổi mật khẩu trước khi tiếp tục sử dụng hệ thống.',
                    },
                })
            } else {
                // Điều hướng người dùng tới trang phù hợp theo role
                const targetPath = getRoleHomePath(userRole)
                navigate(targetPath, { replace: true })
            }
        } catch (err: unknown) {
            setErrorMessage(
                getErrorMessage(err, 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'),
            )
        } finally {
            setIsLoading(false)
        }
    }

    const continuePath = role ? getRoleHomePath(role) : '/dashboard'

    return (
        <main className="login-page-container">
            {/* Background ICTU Campus with frosted white overlay */}
            <div className="login-page-bg" aria-hidden="true">
                <div className="login-page-bg-img" />
                <div className="login-page-bg-overlay" />
            </div>

            <div className="login-split-card login-card">
                {/* Left Panel: ICTU Branding Hero (Desktop) */}
                <section className="login-brand-panel" aria-label="Giới thiệu ICTU">
                    <div className="login-brand-bg-image-wrapper">
                        <img
                            src="/branding/ictu/building.png"
                            alt="Tòa nhà ICTU"
                            className="login-brand-bg-img"
                        />
                        <div className="login-brand-overlay" />
                    </div>
                    <div className="login-brand-content">
                        <div className="login-brand-badge">
                            <div className="login-brand-logo-circle">
                                <img
                                    src="/branding/ictu/logo.png"
                                    alt="Logo ICTU"
                                    className="login-brand-logo-img"
                                />
                            </div>
                            <div className="login-brand-unit-names">
                                <span className="unit-parent">ĐẠI HỌC THÁI NGUYÊN</span>
                                <span className="unit-name">TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN & TRUYỀN THÔNG</span>
                            </div>
                        </div>

                        <div className="login-brand-hero-text">
                            <h2 className="login-brand-app-title">HỆ THỐNG QUẢN LÝ ĐÀO TẠO</h2>
                            <p className="login-brand-desc">
                                Nền tảng số hóa quản lý đào tạo, quản trị người dùng và hỗ trợ giảng dạy trực tuyến dành cho cán bộ, giảng viên và sinh viên ICTU.
                            </p>
                        </div>

                        <div className="login-brand-features">
                            <div className="login-feature-item">
                                <span className="feature-check-icon">✓</span>
                                <span>Bảo mật JWT an toàn & kiểm soát phiên tự động</span>
                            </div>
                            <div className="login-feature-item">
                                <span className="feature-check-icon">✓</span>
                                <span>Phân quyền RBAC chuẩn hóa cho Admin, Trainer & Trainee</span>
                            </div>
                            <div className="login-feature-item">
                                <span className="feature-check-icon">✓</span>
                                <span>Hỗ trợ quản lý chương trình, môn học và hồ sơ đào tạo</span>
                            </div>
                        </div>

                        <div className="login-brand-footer-note">
                            <span>ictu.edu.vn • Đổi mới - Sáng tạo - Hội nhập</span>
                        </div>
                    </div>
                </section>

                {/* Right Panel: Login Form */}
                <section className="login-form-panel">
                    <header className="login-header">
                        <div className="login-brand-logo" aria-hidden="true">
                            <img
                                src="/branding/ictu/logo.png"
                                alt="Logo ICTU"
                                className="login-header-logo-img"
                            />
                        </div>

                        <div className="system-title">Hệ thống Quản lý Đào tạo</div>
                        <h1 className="login-heading">Đăng nhập</h1>
                        <p className="login-subtitle">
                            Đăng nhập để tiếp tục sử dụng hệ thống.
                        </p>
                    </header>

                    {hasSession && (
                        <div className="active-session-banner" role="status">
                            <span>Bạn đang có phiên làm việc hợp lệ.</span>
                            <Link to={continuePath} className="continue-session-link">
                                Tiếp tục vào hệ thống
                            </Link>
                        </div>
                    )}

                    <LoginForm
                        onSubmit={handleLogin}
                        isLoading={isLoading}
                        errorMessage={errorMessage}
                        isLocked={isLocked}
                        isInactive={isInactive}
                        tempLockSeconds={tempLockSeconds}
                        onTempLockEnd={handleTempLockEnd}
                        onInputChange={handleInputChange}
                        initialEmail={initialEmail}
                        initialPassword={initialPassword}
                    />

                    {/* Giao diện Đăng nhập nhanh cho từng phân quyền */}
                    <QuickRoleLogin
                        onQuickLogin={(email, password) => {
                            setInitialEmail(email)
                            setInitialPassword(password)
                            handleLogin(email, password)
                        }}
                        onFillCredentials={(email, password) => {
                            setInitialEmail(email)
                            setInitialPassword(password)
                        }}
                        isLoading={isLoading}
                    />

                    <div className="login-public-links">
                        <span>Bạn cần tư vấn chương trình đào tạo? </span>
                        <Link to="/consultation" className="login-public-link">
                            Đăng ký tư vấn
                        </Link>
                    </div>

                    <footer className="login-footer">
                        <p>Hệ thống Quản lý Đào tạo • Phiên bản 1.0</p>
                        <p>Hỗ trợ kỹ thuật: support@daotao.edu.vn</p>
                    </footer>
                </section>
            </div>
        </main>
    )
}