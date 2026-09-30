import { Link } from 'react-router'

import { useSession } from '../auth/SessionProvider'
import { LoginForm } from '../components/LoginForm'
import './LoginPage.css'

export function LoginPage() {
    const { hasSession } = useSession()

    return (
        <main className="login-page-container">
            <div className="login-card">
                <header className="login-header">
                    <div className="login-brand-logo" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="30" height="30">
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
                        <Link to="/" className="continue-session-link">
                            Tiếp tục vào hệ thống
                        </Link>
                    </div>
                )}

                <LoginForm />

                <footer className="login-footer">
                    <p>Hệ thống Quản lý Đào tạo • Phiên bản 1.0</p>
                    <p>Hỗ trợ kỹ thuật: support@daotao.edu.vn</p>
                </footer>
            </div>
        </main>
    )
}