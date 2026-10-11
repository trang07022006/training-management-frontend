import { Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getRoleLabel } from '../auth/roleRouting'
import './RoleDashboard.css'

interface RoleDashboardProps {
    role?: string
}

export function RoleDashboard({ role: roleProp }: RoleDashboardProps) {
    const { role: sessionRole, userId } = useSession()
    const activeRole = roleProp ?? sessionRole ?? 'user'
    const roleLabel = getRoleLabel(activeRole)

    return (
        <main className="role-dashboard-container">
            <div className="role-dashboard-card">
                <header className="role-dashboard-header">
                    <div className="role-brand-logo" aria-hidden="true">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            width="32"
                            height="32"
                        >
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                            <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                        </svg>
                    </div>
                    <div className="role-system-title">Hệ thống Quản lý Đào tạo</div>
                    <h1 className="role-heading">Bảng điều khiển {roleLabel}</h1>
                    <p className="role-subtitle">
                        Không gian làm việc dành cho {roleLabel}.
                    </p>
                </header>

                <div className="role-badge-container">
                    <span className="role-badge">
                        <span className="role-badge-dot" aria-hidden="true" />
                        <span>Vai trò: {roleLabel}</span>
                    </span>
                </div>

                <section className="role-info-card" aria-label="Thông tin phân hệ">
                    <h2>Trạng thái phân hệ</h2>
                    <p>
                        Bạn đã đăng nhập thành công vào Hệ thống Quản lý Đào tạo với vai trò{' '}
                        <strong>{roleLabel}</strong>.
                    </p>
                    {userId && (
                        <p>
                            Mã tài khoản: <code>{userId}</code>
                        </p>
                    )}
                    <p>
                        Phân hệ chức năng chuyên sâu đang trong lộ trình tích hợp tiếp theo.
                    </p>
                </section>

                <div className="role-actions">
                    {activeRole === 'admin' && (
                        <Link to="/users" className="role-action-link role-action-primary">
                            Quản lý Người dùng
                        </Link>
                    )}
                    {(activeRole === 'trainer' || activeRole === 'trainee') && (
                        <Link to="/courses" className="role-action-link role-action-primary">
                            Quản lý Khóa học
                        </Link>
                    )}
                    <Link to="/change-password" className="role-action-link">
                        Đổi mật khẩu
                    </Link>
                    <Link to="/dashboard" className="role-action-link">
                        Về trang tổng quan
                    </Link>
                </div>

                <footer className="role-dashboard-footer">
                    <p>Hệ thống Quản lý Đào tạo • Phiên bản 1.0</p>
                </footer>
            </div>
        </main>
    )
}
