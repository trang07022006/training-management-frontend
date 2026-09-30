import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useSession } from '../auth/SessionProvider'
import { getRolePermissions, SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { fetchUsersApi, type User, type UserListParams } from '../api/userApi'
import './UserManagementPage.css'

export interface UserManagementPageProps {
    initialUsers?: User[]
    initialTotal?: number
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>
    searchFilterSlot?: ReactNode
    tableSlot?: ReactNode
    paginationSlot?: ReactNode
    createModalSlot?: ReactNode
    editModalSlot?: ReactNode
    onOpenCreateModal?: () => void
}

/**
 * Trang Quản lý Người dùng (User Management Page - SCRUM-89).
 * Được bảo vệ bởi RequireSession và RequirePermission (quyền user.view).
 * Nút "Thêm người dùng" chỉ hiển thị khi có quyền user.manage.
 */
export function UserManagementPage({
    initialUsers,
    initialTotal,
    customRequest,
    searchFilterSlot,
    tableSlot,
    paginationSlot,
    createModalSlot,
    editModalSlot,
    onOpenCreateModal,
}: UserManagementPageProps) {
    const { request: sessionRequest, role } = useSession()
    const requestFn = customRequest ?? sessionRequest

    const userPerms = getRolePermissions(role)
    const canManageUsers = userPerms.includes(SYSTEM_PERMISSIONS.USER_MANAGE)

    const [users, setUsers] = useState<User[]>(initialUsers ?? [])
    const [total, setTotal] = useState<number>(initialTotal ?? initialUsers?.length ?? 0)
    const [isLoading, setIsLoading] = useState<boolean>(initialUsers === undefined)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const loadUsers = useCallback(async (params: UserListParams = {}) => {
        setIsLoading(true)
        setErrorMessage(null)
        try {
            const data = await fetchUsersApi(requestFn, params)
            setUsers(data.items || data.users || [])
            setTotal(data.total || 0)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Không thể tải danh sách người dùng.'
            setErrorMessage(msg)
        } finally {
            setIsLoading(false)
        }
    }, [requestFn])

    useEffect(() => {
        let isMounted = true
        if (initialUsers === undefined) {
            fetchUsersApi(requestFn)
                .then((data) => {
                    if (isMounted) {
                        setUsers(data.items || data.users || [])
                        setTotal(data.total || 0)
                        setIsLoading(false)
                    }
                })
                .catch((err: unknown) => {
                    if (isMounted) {
                        setErrorMessage(err instanceof Error ? err.message : 'Không thể tải danh sách người dùng.')
                        setIsLoading(false)
                    }
                })
        }
        return () => {
            isMounted = false
        }
    }, [initialUsers, requestFn])

    return (
        <div className="user-management-page" data-testid="user-management-page">
            {/* Header section */}
            <header className="user-page-header">
                <div className="user-page-header-text">
                    <h1 className="user-page-title">
                        Quản lý người dùng
                        {total > 0 && <span className="user-total-badge" data-testid="user-total-badge"> ({total})</span>}
                    </h1>
                    <p className="user-page-description">
                        Xem danh sách, tìm kiếm, tạo mới và cập nhật tài khoản người dùng trong hệ thống đào tạo.
                    </p>
                </div>

                {canManageUsers && (
                    <div className="user-page-header-actions">
                        <button
                            type="button"
                            className="btn-primary-action"
                            data-testid="btn-create-user"
                            onClick={onOpenCreateModal}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            <span>Thêm người dùng</span>
                        </button>
                    </div>
                )}
            </header>

            {/* Error Banner */}
            {errorMessage && (
                <div className="user-error-banner" data-testid="user-error-state" role="alert">
                    <p className="user-error-message">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{errorMessage}</span>
                    </p>
                    <button
                        type="button"
                        className="user-retry-btn"
                        data-testid="btn-retry-users"
                        onClick={() => void loadUsers()}
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Search & Filter Slot / Container */}
            <div data-testid="user-search-filter-section">
                {searchFilterSlot}
            </div>

            {/* Main Content Area */}
            {isLoading ? (
                <div className="user-state-card" data-testid="user-loading-state">
                    <div className="user-loading-spinner" aria-hidden="true" />
                    <p className="user-loading-text">Đang tải danh sách người dùng...</p>
                </div>
            ) : !errorMessage && users.length === 0 ? (
                <div className="user-state-card" data-testid="user-empty-state">
                    <svg className="user-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="17" y1="8" x2="23" y2="14" />
                        <line x1="23" y1="8" x2="17" y2="14" />
                    </svg>
                    <h2 className="user-empty-title">Không tìm thấy người dùng</h2>
                    <p className="user-empty-desc">
                        Hiện tại chưa có người dùng nào hoặc không có kết quả phù hợp với tiêu chí tìm kiếm.
                    </p>
                </div>
            ) : (
                <div data-testid="user-table-section">
                    {tableSlot}
                </div>
            )}

            {/* Pagination Slot */}
            <div data-testid="user-pagination-section">
                {paginationSlot}
            </div>

            {/* Modals Slot */}
            {createModalSlot}
            {editModalSlot}
        </div>
    )
}
