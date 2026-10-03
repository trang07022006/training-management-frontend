import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useSession } from '../auth/SessionProvider'
import { getRoleHomePath } from '../auth/roleRouting'
import { LoginForm } from '../components/LoginForm'
import { getErrorMessage } from '../utils/errorMessages'
import './LoginPage.css'

export function LoginPage() {
    const { hasSession, startSession, apiOrigin, role } = useSession()
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
                const code =
                    data &&
                    typeof data === 'object' &&
                    'code' in data &&
                    typeof data.code === 'string'
                        ? data.code
                        : null
                const rawMsg =
                    data &&
                    typeof data === 'object' &&
                    'message' in data &&
                    typeof data.message === 'string'
                        ? data.message
                        : null
                const message = getErrorMessage(
                    { code, message: rawMsg },
                    'Email hoặc mật khẩu không đúng.',
                )
                setErrorMessage(message)
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
            )

            // Điều hướng người dùng tới trang phù hợp theo role
            const targetPath = getRoleHomePath(userRole)
            navigate(targetPath, { replace: true })
        } catch (err: unknown) {
            setErrorMessage(
                getErrorMessage(err, 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'),
            )
        } finally {
            setIsLoading(false)
        }
    }

    const continuePath = role ? getRoleHomePath(role) : '/'

    return (
        <main className="login-page-container">
            <div className="login-card">
                <header className="login-header">
                    <div className="login-brand-logo" aria-hidden="true">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            width="30"
                            height="30"
                        >
                            {/* Graduation cap / Education Icon */}
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                            <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                        </svg>
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
                />

                <footer className="login-footer">
                    <p>Hệ thống Quản lý Đào tạo • Phiên bản 1.0</p>
                    <p>Hỗ trợ kỹ thuật: support@daotao.edu.vn</p>
                </footer>
            </div>
        </main>
    )
}