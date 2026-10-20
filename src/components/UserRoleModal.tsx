import { useState, useEffect } from 'react'
import { useSession } from '../auth/SessionProvider'
import {
    fetchUserRolesApi,
    fetchAvailableRolesApi,
    assignUserRoleApi,
    revokeUserRoleApi,
    type User,
    type RoleItem,
} from '../api/userApi'
import { getErrorMessage } from '../utils/errorMessages'
import { getRoleDisplayName } from '../auth/roleRouting'
import './UserModal.css'
import './UserRoleModal.css'

export interface UserRoleModalProps {
    isOpen: boolean
    user: User | null
    onClose: () => void
    onRoleUpdated?: (user: User, updatedRoles: RoleItem[]) => void
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>
}

interface UserRoleModalContentProps {
    user: User
    onClose: () => void
    onRoleUpdated?: (user: User, updatedRoles: RoleItem[]) => void
    requestFn: (path: string, init?: RequestInit) => Promise<Response>
}

function UserRoleModalContent({
    user,
    onClose,
    onRoleUpdated,
    requestFn,
}: UserRoleModalContentProps) {
    const [userRoles, setUserRoles] = useState<RoleItem[]>([])
    const [availableRoles, setAvailableRoles] = useState<RoleItem[]>([])
    const [selectedRoleId, setSelectedRoleId] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [isActionLoading, setIsActionLoading] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Tải dữ liệu vai trò ban đầu
    useEffect(() => {
        let isMounted = true

        Promise.all([
            fetchUserRolesApi(requestFn, user.id),
            fetchAvailableRolesApi(requestFn),
        ])
            .then(([userRolesRes, availableRes]) => {
                if (isMounted) {
                    setUserRoles(userRolesRes.roles || [])
                    setAvailableRoles(availableRes || [])
                    setIsLoading(false)
                }
            })
            .catch((err: unknown) => {
                if (isMounted) {
                    setErrorMessage(getErrorMessage(err, 'Không thể tải thông tin vai trò.'))
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [user.id, requestFn])

    // Phân vai trò cho người dùng (tự động gán ngay khi chọn vai trò)
    const handleRoleSelect = async (roleId: string) => {
        if (!roleId || isActionLoading) return

        // Không gửi request nếu người dùng đã có vai trò này
        if (userRoles.some((r) => String(r.id) === String(roleId))) {
            setSelectedRoleId('')
            return
        }

        setSelectedRoleId(roleId)
        setIsActionLoading(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            const result = await assignUserRoleApi(requestFn, user.id, roleId)
            const newlyAssignedRole = result.role
            const nextRoles = [
                ...userRoles.filter((r) => String(r.id) !== String(newlyAssignedRole.id)),
                newlyAssignedRole,
            ]
            setUserRoles(nextRoles)
            setSelectedRoleId('')
            setSuccessMessage(`Đã gán vai trò ${getRoleDisplayName(newlyAssignedRole)}.`)
            onRoleUpdated?.(user, nextRoles)
        } catch (err: unknown) {
            setSelectedRoleId('')
            const msg = getErrorMessage(err, 'Không thể gán vai trò. Vui lòng thử lại.')
            setErrorMessage(
                msg.includes('thất bại') || msg.includes('Đã xảy ra lỗi')
                    ? 'Không thể gán vai trò. Vui lòng thử lại.'
                    : msg,
            )
        } finally {
            setIsActionLoading(false)
        }
    }

    // Gỡ vai trò khỏi người dùng
    const handleRevoke = async (role: RoleItem) => {
        if (isActionLoading) return

        setIsActionLoading(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            await revokeUserRoleApi(requestFn, user.id, role.id)
            const nextRoles = userRoles.filter((r) => r.id !== role.id)
            setUserRoles(nextRoles)
            setSuccessMessage(`Đã gỡ vai trò "${getRoleDisplayName(role)}" khỏi người dùng.`)
            onRoleUpdated?.(user, nextRoles)
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Gỡ vai trò thất bại.'))
        } finally {
            setIsActionLoading(false)
        }
    }

    // Danh sách vai trò chưa được gán
    const assignedRoleIds = new Set(userRoles.map((r) => r.id))
    const unassignedRoles = availableRoles.filter((r) => !assignedRoleIds.has(r.id))

    const userInitial = (user.name || user.email || 'U').charAt(0).toUpperCase()

    return (
        <div
            className="role-modal-container"
            data-testid="user-role-modal"
            role="dialog"
            aria-labelledby="role-modal-title"
            aria-modal="true"
        >
            {/* Header */}
            <div className="modal-header">
                <h2 id="role-modal-title" className="modal-title">
                    Quản lý vai trò người dùng
                </h2>
                <button
                    type="button"
                    className="modal-close-btn"
                    data-testid="btn-close-role-modal"
                    aria-label="Đóng cửa sổ"
                    onClick={onClose}
                    disabled={isActionLoading}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
                {/* User Info Banner */}
                <div className="user-info-banner" data-testid="role-user-info">
                    <div className="user-avatar-placeholder" aria-hidden="true">
                        {userInitial}
                    </div>
                    <div className="user-info-text">
                        <p className="user-info-name" title={user.name}>{user.name}</p>
                        <p className="user-info-email" title={user.email}>{user.email}</p>
                    </div>
                </div>

                {/* Notifications */}
                {errorMessage && (
                    <div className="modal-banner-error" data-testid="role-error-banner" role="alert">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{errorMessage}</span>
                    </div>
                )}

                {successMessage && (
                    <div className="modal-banner-success" data-testid="role-success-banner" role="status">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Loading State */}
                {isLoading ? (
                    <div className="user-state-card" data-testid="role-loading-state">
                        <div className="user-loading-spinner" aria-hidden="true" />
                        <p className="user-loading-text">Đang tải danh sách vai trò...</p>
                    </div>
                ) : (
                    <>
                        {/* Section: Vai trò hiện tại */}
                        <div>
                            <h3 className="role-section-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                                <span>Vai trò hiện tại ({userRoles.length})</span>
                            </h3>

                            {userRoles.length === 0 ? (
                                <div className="no-roles-notice" data-testid="no-roles-notice">
                                    Người dùng này hiện chưa được gán vai trò nào.
                                </div>
                            ) : (
                                <div className="current-roles-list" data-testid="current-roles-list">
                                    {userRoles.map((role) => (
                                        <div key={role.id} className="current-role-item" data-testid={`role-item-${role.id}`}>
                                            <div className="role-item-info">
                                                <div className="role-item-header">
                                                    <span className="role-item-name">{getRoleDisplayName(role)}</span>
                                                </div>
                                                {role.description && (
                                                    <p className="role-item-desc">{role.description}</p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-revoke-role"
                                                data-testid={`btn-revoke-role-${role.id}`}
                                                onClick={() => void handleRevoke(role)}
                                                disabled={isActionLoading}
                                                aria-label={`Gỡ vai trò ${getRoleDisplayName(role)}`}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                                <span>Gỡ vai trò</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Section: Gán vai trò mới */}
                        <div>
                            <h3 className="role-section-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                <span>Phân vai trò mới</span>
                            </h3>

                            <div className="assign-role-group">
                                <select
                                    className="form-select"
                                    data-testid="select-assign-role"
                                    value={selectedRoleId}
                                    onChange={(e) => void handleRoleSelect(e.target.value)}
                                    disabled={isActionLoading || unassignedRoles.length === 0}
                                    aria-label="Chọn vai trò để phân quyền"
                                >
                                    <option value="">
                                        {unassignedRoles.length === 0
                                            ? 'Người dùng đã có tất cả các vai trò'
                                            : '-- Chọn vai trò để phân quyền --'}
                                    </option>
                                    {unassignedRoles.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {getRoleDisplayName(r)}
                                        </option>
                                    ))}
                                </select>
                                {isActionLoading && (
                                    <span
                                        className="role-inline-loading"
                                        data-testid="assign-role-loading"
                                    >
                                        <span className="btn-spinner" aria-hidden="true" />
                                        <span>Đang gán...</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
                <button
                    type="button"
                    className="btn-success"
                    data-testid="btn-done-role-modal"
                    onClick={onClose}
                    disabled={isActionLoading}
                >
                    Hoàn tất
                </button>
            </div>
        </div>
    )
}

export function UserRoleModal({
    isOpen,
    user,
    onClose,
    onRoleUpdated,
    customRequest,
}: UserRoleModalProps) {
    const { request: sessionRequest } = useSession()
    const requestFn = customRequest ?? sessionRequest

    if (!isOpen || !user) return null

    return (
        <div
            className="modal-backdrop"
            data-testid="user-role-modal-backdrop"
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <UserRoleModalContent
                key={String(user.id)}
                user={user}
                onClose={onClose}
                onRoleUpdated={onRoleUpdated}
                requestFn={requestFn}
            />
        </div>
    )
}
