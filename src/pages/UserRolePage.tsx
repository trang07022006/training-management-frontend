import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    fetchUserByIdApi,
    fetchUserRolesApi,
    fetchAvailableRolesApi,
    assignUserRoleApi,
    revokeUserRoleApi,
    type User,
    type RoleItem,
} from '../api/userApi'
import { PageHeader } from '../components/PageHeader'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { getRoleLabel } from '../auth/roleRouting'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import '../components/UserRoleModal.css'

export function UserRolePage() {
    const { userId } = useParams<{ userId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role, roles } = useSession()

    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const canManage =
        permissions?.includes(SYSTEM_PERMISSIONS.USER_MANAGE) ||
        effectiveRoles.includes('admin')

    const [user, setUser] = useState<User | null>(null)
    const [userRoles, setUserRoles] = useState<RoleItem[]>([])
    const [availableRoles, setAvailableRoles] = useState<RoleItem[]>([])
    const [selectedRoleId, setSelectedRoleId] = useState<string>('')

    const [isLoading, setIsLoading] = useState(true)
    const [isActionLoading, setIsActionLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        if (!userId) return
        setIsLoading(true)
        setErrorMessage(null)
        try {
            const [u, rRes, aRoles] = await Promise.all([
                fetchUserByIdApi(requestFn, userId),
                fetchUserRolesApi(requestFn, userId),
                fetchAvailableRolesApi(requestFn),
            ])
            setUser(u)
            setUserRoles(rRes.roles || [])
            setAvailableRoles(aRoles || [])
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi tải dữ liệu vai trò người dùng.'))
        } finally {
            setIsLoading(false)
        }
    }, [userId, requestFn])

    useEffect(() => {
        loadData()
    }, [loadData])

    const unassignedRoles = availableRoles.filter(
        (ar) => !userRoles.some((ur) => String(ur.id) === String(ar.id) || ur.code === ar.code),
    )

    const handleAssignRole = async () => {
        if (!userId || !selectedRoleId || isActionLoading) return
        setIsActionLoading(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            await assignUserRoleApi(requestFn, userId, selectedRoleId)
            setSuccessMessage(getSuccessMessage('ASSIGN_ROLE_SUCCESS', 'Phân vai trò cho người dùng thành công!'))
            setSelectedRoleId('')
            await loadData()
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi gán vai trò.'))
        } finally {
            setIsActionLoading(false)
        }
    }

    const handleRevokeRole = async (roleId: string | number, roleName: string) => {
        if (!userId || isActionLoading) return
        const confirmed = window.confirm(`Bạn có chắc muốn gỡ vai trò "${roleName}" khỏi người dùng này?`)
        if (!confirmed) return

        setIsActionLoading(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            await revokeUserRoleApi(requestFn, userId, roleId)
            setSuccessMessage(getSuccessMessage('REVOKE_ROLE_SUCCESS', `Đã gỡ vai trò "${roleName}" thành công!`))
            await loadData()
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi gỡ vai trò.'))
        } finally {
            setIsActionLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="users-page-container" style={{ padding: '24px 32px' }}>
                <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <span>Đang tải thông tin vai trò...</span>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="users-page-container" style={{ padding: '0 0 24px 0' }}>
                <PageHeader
                    title="Phân vai trò người dùng"
                    breadcrumbs={[
                        { label: 'Người dùng', path: '/users' },
                        { label: 'Phân vai trò' },
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

    if (!canManage) {
        return (
            <div className="users-page-container" style={{ padding: '24px 32px' }}>
                <PageHeader
                    title="Không có quyền truy cập"
                    breadcrumbs={[
                        { label: 'Người dùng', path: '/users' },
                        { label: user.name, path: `/users/${user.id}` },
                        { label: 'Phân vai trò' },
                    ]}
                />
                <div className="modal-banner banner-error" role="alert">
                    <span>Bạn không có quyền phân vai trò người dùng.</span>
                </div>
            </div>
        )
    }

    return (
        <div className="users-page-container" data-testid="user-role-page" style={{ padding: '0 0 24px 0' }}>
            <PageHeader
                title={`Phân vai trò: ${user.name}`}
                subtitle={`Email: ${user.email} • Vai trò chính: ${getRoleLabel(user.role)}`}
                breadcrumbs={[
                    { label: 'Người dùng', path: '/users' },
                    { label: user.name, path: `/users/${user.id}` },
                    { label: 'Phân vai trò' },
                ]}
                actions={
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => navigate(`/users/${user.id}`)}
                    >
                        Quay lại chi tiết
                    </button>
                }
            />

            {errorMessage && (
                <div className="modal-banner banner-error" role="alert" style={{ margin: '0 0 16px 0' }}>
                    <span>{errorMessage}</span>
                </div>
            )}
            {successMessage && (
                <div className="modal-banner banner-success" role="alert" style={{ margin: '0 0 16px 0' }}>
                    <span>{successMessage}</span>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px', alignItems: 'start' }}>
                {/* DANH SÁCH VAI TRÒ HIỆN TẠI */}
                <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                        Vai trò hiện đang được gán ({userRoles.length})
                    </h3>

                    {userRoles.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '14px' }}>
                            Người dùng này chưa có vai trò bổ sung nào. Tài khoản chỉ sử dụng quyền cơ bản.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {userRoles.map((r, idx) => (
                                <div
                                    key={r.id || r.code || r.name || idx}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px 16px',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                    }}
                                >
                                    <div>
                                        <strong style={{ fontSize: '15px', color: '#0f172a' }}>{r.name || r.code}</strong>
                                        <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>({r.code})</span>
                                        {r.description && (
                                            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>{r.description}</p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-action-delete"
                                        onClick={() => handleRevokeRole(r.id, r.name || r.code)}
                                        disabled={isActionLoading}
                                        style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                                    >
                                        Gỡ vai trò
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FORM GÁN THÊM VAI TRÒ MỚI */}
                <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                        Gán thêm vai trò mới
                    </h3>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label" htmlFor="select-role-to-assign">
                            Chọn vai trò cần gán
                        </label>
                        <select
                            id="select-role-to-assign"
                            className="form-select"
                            value={selectedRoleId}
                            onChange={(e) => setSelectedRoleId(e.target.value)}
                            disabled={isActionLoading || unassignedRoles.length === 0}
                        >
                            <option value="">-- Chọn vai trò --</option>
                            {unassignedRoles.map((ar, idx) => (
                                <option key={ar.id || ar.code || ar.name || idx} value={ar.id || ar.code}>
                                    {ar.name || ar.code}
                                </option>
                            ))}
                        </select>
                    </div>

                    {unassignedRoles.length === 0 ? (
                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                            Người dùng này đã được gán tất cả các vai trò khả dụng trong hệ thống.
                        </p>
                    ) : null}

                    <button
                        type="button"
                        className="btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={handleAssignRole}
                        disabled={isActionLoading || !selectedRoleId}
                    >
                        {isActionLoading ? 'Đang phân vai trò...' : '+ Xác nhận gán vai trò'}
                    </button>
                </div>
            </div>
        </div>
    )
}
