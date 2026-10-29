import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { fetchUserByIdApi, fetchUserRolesApi, getStatusInfo, type User, type RoleItem, ApiError } from '../api/userApi'
import { PageHeader } from '../components/PageHeader'
import { getErrorMessage } from '../utils/errorMessages'
import { getRoleLabel } from '../auth/roleRouting'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import '../components/UserModal.css'

export function UserDetailPage() {
    const { userId } = useParams<{ userId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role, roles } = useSession()

    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const canManage =
        permissions?.includes(SYSTEM_PERMISSIONS.USER_MANAGE) ||
        effectiveRoles.includes('admin')

    const [user, setUser] = useState<User | null>(null)
    const [userRoles, setUserRoles] = useState<RoleItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        if (!userId) {
            setErrorMessage('Mã người dùng không hợp lệ.')
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setErrorMessage(null)

        Promise.all([
            fetchUserByIdApi(requestFn, userId),
            fetchUserRolesApi(requestFn, userId).catch(() => ({ roles: [] })),
        ])
            .then(([userData, rolesData]) => {
                if (isMounted) {
                    setUser(userData)
                    setUserRoles(rolesData.roles || [])
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    if (err instanceof ApiError && err.status === 404) {
                        setErrorMessage('Không tìm thấy người dùng. Tài khoản có thể đã bị xóa hoặc không tồn tại.')
                    } else {
                        setErrorMessage(getErrorMessage(err, 'Lỗi khi tải thông tin người dùng.'))
                    }
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [userId, requestFn])

    if (isLoading) {
        return (
            <div className="users-page-container" style={{ padding: '24px 32px' }}>
                <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <span>Đang tải thông tin người dùng...</span>
                </div>
            </div>
        )
    }

    if (errorMessage || !user) {
        return (
            <div className="users-page-container" style={{ padding: '0 0 24px 0' }}>
                <PageHeader
                    title="Chi tiết người dùng"
                    breadcrumbs={[
                        { label: 'Người dùng', path: '/users' },
                        { label: 'Chi tiết' },
                    ]}
                />
                <div className="modal-banner banner-error" role="alert" style={{ marginBottom: '16px' }}>
                    <span>{errorMessage || 'Không tìm thấy người dùng.'}</span>
                </div>
                <button type="button" className="btn-secondary" onClick={() => navigate('/users')}>
                    Quay lại danh sách người dùng
                </button>
            </div>
        )
    }

    const statusInfo = getStatusInfo(user.status)

    return (
        <div className="users-page-container" data-testid="user-detail-page" style={{ padding: '0 0 24px 0' }}>
            <PageHeader
                title={user.name}
                subtitle={`Email: ${user.email} • Vai trò chính: ${getRoleLabel(user.role)}`}
                breadcrumbs={[
                    { label: 'Người dùng', path: '/users' },
                    { label: user.name },
                ]}
                badge={
                    <span className={`status-badge status-${statusInfo.key}`}>
                        {statusInfo.label}
                    </span>
                }
                actions={
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => navigate('/users')}
                        >
                            Quay lại danh sách
                        </button>
                        {canManage && (
                            <>
                                <Link to={`/users/${user.id}/edit`} className="btn-secondary">
                                    Chỉnh sửa thông tin
                                </Link>
                                <Link to={`/users/${user.id}/roles`} className="btn-primary">
                                    Phân vai trò
                                </Link>
                            </>
                        )}
                    </div>
                }
            />

            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                    Thông tin tài khoản
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Họ và tên</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{user.name}</strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Email</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{user.email}</strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Số điện thoại</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{user.phone || 'Chưa cập nhật'}</strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Vai trò chính</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{getRoleLabel(user.role)}</strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Trạng thái</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{statusInfo.label}</strong>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8' }}>
                    <span>Ngày tạo: {user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '—'}</span>
                    <span>Cập nhật gần nhất: {user.updated_at ? new Date(user.updated_at).toLocaleDateString('vi-VN') : '—'}</span>
                </div>
            </div>

            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                        Danh sách vai trò được gán ({userRoles.length})
                    </h3>
                    {canManage && (
                        <Link to={`/users/${user.id}/roles`} className="btn-secondary" style={{ fontSize: '13px', padding: '6px 14px' }}>
                            Quản lý vai trò →
                        </Link>
                    )}
                </div>

                {userRoles.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '14px' }}>Người dùng chưa có vai trò bổ sung nào ngoài vai trò mặc định.</p>
                ) : (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {userRoles.map((r, idx) => (
                            <span key={r.id || r.code || r.name || idx} className="role-chip" style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                                🛡 {r.name || r.code}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
