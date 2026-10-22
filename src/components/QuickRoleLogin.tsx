import { useState } from 'react'
import './QuickRoleLogin.css'

export interface QuickRoleAccount {
    roleCode: string
    roleName: string
    roleDesc: string
    email: string
    password: string
    badgeColor: string
    badgeBg: string
    badgeBorder: string
    btnBg: string
    icon: string
}

export const QUICK_ROLE_ACCOUNTS: QuickRoleAccount[] = [
    {
        roleCode: 'admin',
        roleName: 'Quản trị viên',
        roleDesc: 'Toàn quyền cấu hình, quản trị tài khoản & hệ thống',
        email: 'admin@ictu.edu.vn',
        password: 'Admin@123',
        badgeColor: '#4338ca',
        badgeBg: '#eef2ff',
        badgeBorder: '#c7d2fe',
        btnBg: '#4f46e5',
        icon: '🛡️',
    },
    {
        roleCode: 'training_manager',
        roleName: 'Quản lý đào tạo',
        roleDesc: 'Quản lý lớp học, môn học, phân công & thời khóa biểu',
        email: 'manager.demo@daotao.edu.vn',
        password: 'Admin@123',
        badgeColor: '#0369a1',
        badgeBg: '#f0f9ff',
        badgeBorder: '#bae6fd',
        btnBg: '#0284c7',
        icon: '📋',
    },
    {
        roleCode: 'trainer',
        roleName: 'Giảng viên',
        roleDesc: 'Điểm danh học viên, xem chuyên cần tổng hợp lớp',
        email: 'trainer.demo@daotao.edu.vn',
        password: 'Admin@123',
        badgeColor: '#047857',
        badgeBg: '#ecfdf5',
        badgeBorder: '#a7f3d0',
        btnBg: '#059669',
        icon: '🎓',
    },
    {
        roleCode: 'trainee',
        roleName: 'Học viên',
        roleDesc: 'Xem lịch học cá nhân, nộp đơn xin phép vắng',
        email: 'trainee.demo@daotao.edu.vn',
        password: 'Admin@123',
        badgeColor: '#b45309',
        badgeBg: '#fffbeb',
        badgeBorder: '#fde68a',
        btnBg: '#d97706',
        icon: '🎒',
    },
    {
        roleCode: 'consultant',
        roleName: 'Tư vấn viên',
        roleDesc: 'Tiếp nhận thông tin tư vấn tuyển sinh & khách hàng',
        email: 'consultant.demo@daotao.edu.vn',
        password: 'Admin@123',
        badgeColor: '#be185d',
        badgeBg: '#fdf2f8',
        badgeBorder: '#fbcfe8',
        btnBg: '#db2777',
        icon: '💼',
    },
]

interface Props {
    onQuickLogin: (email: string, password: string) => void
    onFillCredentials: (email: string, password: string) => void
    isLoading?: boolean
}

export function QuickRoleLogin({ onQuickLogin, onFillCredentials, isLoading = false }: Props) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [loggingInRole, setLoggingInRole] = useState<string | null>(null)

    const handleDirectLogin = (account: QuickRoleAccount) => {
        setLoggingInRole(account.roleCode)
        onQuickLogin(account.email, account.password)
    }

    const handleFill = (account: QuickRoleAccount) => {
        onFillCredentials(account.email, account.password)
    }

    return (
        <section className="quick-role-section" aria-label="Đăng nhập nhanh theo phân quyền" data-testid="quick-role-section">
            <div className="quick-role-header">
                <div className="quick-role-title-wrap">
                    <span className="quick-role-icon" aria-hidden="true">⚡</span>
                    <h3 className="quick-role-title">Đăng nhập nhanh theo vai trò</h3>
                </div>
                <button
                    type="button"
                    className="quick-role-toggle-btn"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    aria-expanded={isExpanded}
                    data-testid="btn-toggle-quick-role-detail"
                >
                    {isExpanded ? '▲ Thu gọn' : '▼ Chi tiết tài khoản'}
                </button>
            </div>

            {/* Quick Chips Row (1-click immediate fill/login) */}
            <div className="quick-role-chips" role="group" aria-label="Danh sách vai trò đăng nhập nhanh">
                {QUICK_ROLE_ACCOUNTS.map((acc) => (
                    <button
                        key={acc.roleCode}
                        type="button"
                        className={`quick-role-chip chip-role-${acc.roleCode}`}
                        onClick={() => handleDirectLogin(acc)}
                        disabled={isLoading}
                        title={`Đăng nhập ngay vai trò: ${acc.roleName} (${acc.email})`}
                        data-testid={`quick-chip-${acc.roleCode}`}
                    >
                        <span>{acc.icon}</span>
                        <span>{acc.roleName}</span>
                    </button>
                ))}
            </div>

            {/* Detailed Cards List (Expanded view) */}
            {isExpanded && (
                <div className="quick-role-grid" data-testid="quick-role-expanded-grid">
                    {QUICK_ROLE_ACCOUNTS.map((acc) => {
                        const isCurrentLoggingIn = isLoading && loggingInRole === acc.roleCode
                        return (
                            <div key={acc.roleCode} className="quick-role-card" data-testid={`quick-card-${acc.roleCode}`}>
                                <div className="quick-role-card-info">
                                    <div
                                        className="quick-role-card-icon"
                                        style={{ background: acc.badgeBg, color: acc.badgeColor, border: `1px solid ${acc.badgeBorder}` }}
                                    >
                                        {acc.icon}
                                    </div>
                                    <div className="quick-role-card-texts">
                                        <div className="quick-role-card-name-row">
                                            <span className="quick-role-card-role-name">{acc.roleName}</span>
                                            <span className="quick-role-card-email">{acc.email}</span>
                                        </div>
                                        <span className="quick-role-card-desc" title={acc.roleDesc}>
                                            {acc.roleDesc}
                                        </span>
                                    </div>
                                </div>

                                <div className="quick-role-card-actions">
                                    <button
                                        type="button"
                                        className="btn-quick-fill"
                                        onClick={() => handleFill(acc)}
                                        disabled={isLoading}
                                        title="Điền email và mật khẩu vào form đăng nhập phía trên"
                                        data-testid={`btn-fill-${acc.roleCode}`}
                                    >
                                        Điền form
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-quick-login-direct"
                                        style={{ background: acc.btnBg }}
                                        onClick={() => handleDirectLogin(acc)}
                                        disabled={isLoading}
                                        title={`Đăng nhập trực tiếp vai trò ${acc.roleName}`}
                                        data-testid={`btn-direct-login-${acc.roleCode}`}
                                    >
                                        {isCurrentLoggingIn ? 'Đang vào...' : 'Đăng nhập'}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <div className="quick-role-hint">
                <span>💡</span>
                <span>Bấm trực tiếp vào huy hiệu vai trò để đăng nhập 1-click hoặc bấm "Chi tiết" để xem email và phân quyền.</span>
            </div>
        </section>
    )
}
