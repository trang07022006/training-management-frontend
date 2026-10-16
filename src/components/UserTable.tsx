import { useInRouterContext, Link } from 'react-router'
import { type User, getStatusInfo } from '../api/userApi'
import { getRoleLabel } from '../auth/roleRouting'
import './UserTable.css'

export interface UserTableProps {
    users: User[]
    onEdit?: (user: User) => void
    onManageRoles?: (user: User) => void
    onLockUser?: (user: User) => void
    onUnlockUser?: (user: User) => void
    canManage?: boolean
    emptyMessage?: string
    isActionLoading?: boolean
}

const ROLE_LABELS: Record<string, string> = {
    admin: 'Quản trị viên',
    trainer: 'Giảng viên',
    trainee: 'Học viên',
    user: 'Người dùng',
    consultant: 'Tư vấn tuyển sinh',
    training_manager: 'Quản lý đào tạo',
}

export function UserTable({
    users,
    onEdit,
    onManageRoles,
    onLockUser,
    onUnlockUser,
    canManage = true,
    emptyMessage = 'Không có dữ liệu người dùng.',
    isActionLoading = false,
}: UserTableProps) {
    const inRouter = useInRouterContext()
    if (!users || users.length === 0) {
        return (
            <div className="user-table-container" data-testid="user-table-empty-container">
                <div className="user-table-empty">
                    <p>{emptyMessage}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="user-table-container" data-testid="user-table-container">
            <div className="user-table-scroll-wrapper" tabIndex={0} aria-label="Bảng dữ liệu người dùng">
                <table className="user-table" data-testid="user-table">
                    <thead>
                        <tr>
                            <th scope="col" className="col-user-name">Họ và tên</th>
                            <th scope="col" className="col-user-email">Email</th>
                            <th scope="col" className="col-user-phone">Số điện thoại</th>
                            <th scope="col" className="col-user-role">Vai trò</th>
                            <th scope="col" className="col-user-status">Trạng thái</th>
                            {canManage && <th scope="col" className="col-user-actions" style={{ textAlign: 'right' }}>Thao tác</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => {
                            const roleKey = (u.role || 'user').toLowerCase()
                            const roleText = ROLE_LABELS[roleKey] || getRoleLabel(u.role) || 'Người dùng'
                            const { key: statusKey, label: statusText } = getStatusInfo(u.status)

                            return (
                                <tr key={u.id} data-testid={`user-row-${u.id}`}>
                                    <td className="user-cell-name" title={u.name}>
                                        {inRouter ? (
                                            <Link
                                                to={`/users/${u.id}`}
                                                className="user-name-link"
                                                style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}
                                                data-testid={`user-link-${u.id}`}
                                            >
                                                {u.name}
                                            </Link>
                                        ) : (
                                            u.name
                                        )}
                                    </td>
                                    <td className="user-cell-email" title={u.email}>
                                        {u.email}
                                    </td>
                                    <td className="user-cell-phone">
                                        {u.phone && u.phone.trim() ? u.phone : '—'}
                                    </td>
                                    <td>
                                        <span className={`role-badge role-${roleKey}`}>
                                            {roleText}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge status-${statusKey}`} data-testid={`user-status-${u.id}`}>
                                            {statusText}
                                        </span>
                                    </td>
                                    {canManage && (
                                        <td className="user-cell-actions">
                                            <div className="user-actions-group">
                                                <button
                                                    type="button"
                                                    className="btn-manage-role"
                                                    data-testid={`btn-manage-role-${u.id}`}
                                                    aria-label={`Phân vai trò cho ${u.name}`}
                                                    onClick={() => onManageRoles?.(u)}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                    </svg>
                                                    <span>Vai trò</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-edit-user"
                                                    data-testid={`btn-edit-user-${u.id}`}
                                                    aria-label={`Chỉnh sửa ${u.name}`}
                                                    onClick={() => onEdit?.(u)}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                    <span>Chỉnh sửa</span>
                                                </button>
                                                {statusKey === 'locked' ? (
                                                    <button
                                                        type="button"
                                                        className="btn-unlock-user"
                                                        data-testid={`btn-unlock-user-${u.id}`}
                                                        aria-label={`Mở khóa tài khoản ${u.name}`}
                                                        onClick={() => onUnlockUser?.(u)}
                                                        disabled={isActionLoading}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                                        </svg>
                                                        <span>Mở khóa</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn-lock-user"
                                                        data-testid={`btn-lock-user-${u.id}`}
                                                        aria-label={`Khóa tài khoản ${u.name}`}
                                                        onClick={() => onLockUser?.(u)}
                                                        disabled={isActionLoading}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                        </svg>
                                                        <span>Khóa tài khoản</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
