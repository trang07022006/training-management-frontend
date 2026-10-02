import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useSession } from '../auth/SessionProvider'
import { getRolePermissions, SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { fetchUsersApi, type User, type UserListParams, type RoleItem } from '../api/userApi'
import { getErrorMessage } from '../utils/errorMessages'
import { UserFilterBar, type UserFilters } from '../components/UserFilterBar'
import { UserTable } from '../components/UserTable'
import { UserPagination } from '../components/UserPagination'
import { CreateUserModal } from '../components/CreateUserModal'
import { EditUserModal } from '../components/EditUserModal'
import { UserRoleModal } from '../components/UserRoleModal'
import { AccountLockModal } from '../components/AccountLockModal'
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
    roleModalSlot?: ReactNode
    lockModalSlot?: ReactNode
    onOpenCreateModal?: () => void
}

/**
 * Trang Quản lý Người dùng (User Management Page - SCRUM-89 -> SCRUM-94 -> SCRUM-101).
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
    roleModalSlot,
    lockModalSlot,
    onOpenCreateModal,
}: UserManagementPageProps) {
    const { request: sessionRequest, role } = useSession()
    const requestFn = customRequest ?? sessionRequest

    const userPerms = getRolePermissions(role)
    const canManageUsers = userPerms.includes(SYSTEM_PERMISSIONS.USER_MANAGE)

    // Data State
    const [users, setUsers] = useState<User[]>(initialUsers ?? [])
    const [total, setTotal] = useState<number>(initialTotal ?? initialUsers?.length ?? 0)
    const [isLoading, setIsLoading] = useState<boolean>(initialUsers === undefined)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Pagination & Filter State (SCRUM-94)
    const [page, setPage] = useState<number>(1)
    const pageSize = 20
    const [filters, setFilters] = useState<UserFilters>({
        search: '',
        role: '',
        status: '',
    })

    // Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [roleManagingUser, setRoleManagingUser] = useState<User | null>(null)
    const [lockModalUser, setLockModalUser] = useState<User | null>(null)
    const [lockModalAction, setLockModalAction] = useState<'lock' | 'unlock'>('lock')
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const loadUsers = useCallback(async (params: UserListParams = {}) => {
        setIsLoading(true)
        setErrorMessage(null)
        try {
            const queryParams: UserListParams = {
                page: params.page ?? page,
                page_size: params.page_size ?? pageSize,
                search: params.search !== undefined ? params.search : filters.search,
                role: params.role !== undefined ? params.role : filters.role,
                status: params.status !== undefined ? params.status : filters.status,
            }
            const data = await fetchUsersApi(requestFn, queryParams)
            setUsers(data.items || data.users || [])
            setTotal(data.total || 0)
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Không thể tải danh sách người dùng.'))
        } finally {
            setIsLoading(false)
        }
    }, [requestFn, page, pageSize, filters])

    useEffect(() => {
        let isMounted = true
        if (initialUsers === undefined) {
            fetchUsersApi(requestFn, { page: 1, page_size: pageSize })
                .then((data) => {
                    if (isMounted) {
                        setUsers(data.items || data.users || [])
                        setTotal(data.total || 0)
                        setIsLoading(false)
                    }
                })
                .catch((err: unknown) => {
                    if (isMounted) {
                        setErrorMessage(getErrorMessage(err, 'Không thể tải danh sách người dùng.'))
                        setIsLoading(false)
                    }
                })
        }
        return () => {
            isMounted = false
        }
    }, [initialUsers, requestFn, pageSize])

    const handleFilterChange = (newFilters: UserFilters) => {
        setFilters(newFilters)
        setPage(1)
        void loadUsers({
            page: 1,
            search: newFilters.search,
            role: newFilters.role,
            status: newFilters.status,
        })
    }

    const handlePageChange = (newPage: number) => {
        setPage(newPage)
        void loadUsers({ page: newPage })
    }

    const handleCreateSuccess = (_newUser: User) => {
        // Tải lại trang 1 để đưa người dùng mới lên đầu danh sách
        setPage(1)
        void loadUsers({ page: 1 })
    }

    const handleEditSuccess = (updatedUser: User) => {
        setUsers((prev) =>
            prev.map((u) => (String(u.id) === String(updatedUser.id) ? updatedUser : u))
        )
        setEditingUser(null)
    }

    const handleUserRoleUpdated = (targetUser: User, updatedRoles: RoleItem[]) => {
        const primaryRole = updatedRoles.length > 0 ? updatedRoles[0].code : 'user'
        setUsers((prev) =>
            prev.map((u) => (String(u.id) === String(targetUser.id) ? { ...u, role: primaryRole } : u))
        )
    }

    const handleOpenLock = (targetUser: User) => {
        setLockModalUser(targetUser)
        setLockModalAction('lock')
    }

    const handleOpenUnlock = (targetUser: User) => {
        setLockModalUser(targetUser)
        setLockModalAction('unlock')
    }

    const handleLockSuccess = (updatedUser: User, msg: string) => {
        setUsers((prev) =>
            prev.map((u) => (String(u.id) === String(updatedUser.id) ? updatedUser : u))
        )
        setSuccessMessage(msg)
    }

    const handleOpenCreate = () => {
        if (onOpenCreateModal) {
            onOpenCreateModal()
        } else {
            setIsCreateOpen(true)
        }
    }

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
                            onClick={handleOpenCreate}
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

            {/* Success Banner */}
            {successMessage && (
                <div className="user-success-banner" data-testid="user-success-state" role="status">
                    <p className="user-success-message">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span data-testid="user-success-text">{successMessage}</span>
                    </p>
                    <button
                        type="button"
                        className="user-close-banner-btn"
                        data-testid="btn-close-success-banner"
                        onClick={() => setSuccessMessage(null)}
                        aria-label="Đóng thông báo"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Search & Filter Section */}
            <div data-testid="user-search-filter-section">
                {searchFilterSlot !== undefined ? (
                    searchFilterSlot
                ) : (
                    <UserFilterBar
                        onFilterChange={handleFilterChange}
                        isLoading={isLoading}
                    />
                )}
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
                    {tableSlot !== undefined ? (
                        tableSlot
                    ) : (
                        <UserTable
                            users={users}
                            onEdit={(u) => setEditingUser(u)}
                            onManageRoles={(u) => setRoleManagingUser(u)}
                            onLockUser={handleOpenLock}
                            onUnlockUser={handleOpenUnlock}
                            canManage={canManageUsers}
                        />
                    )}
                </div>
            )}

            {/* Pagination Section */}
            <div data-testid="user-pagination-section">
                {paginationSlot !== undefined ? (
                    paginationSlot
                ) : (
                    <UserPagination
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={handlePageChange}
                        isLoading={isLoading}
                    />
                )}
            </div>

            {/* Create & Edit Modals */}
            {createModalSlot !== undefined ? (
                createModalSlot
            ) : (
                <CreateUserModal
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    onSuccess={handleCreateSuccess}
                    customRequest={customRequest}
                />
            )}

            {editModalSlot !== undefined ? (
                editModalSlot
            ) : (
                <EditUserModal
                    isOpen={!!editingUser}
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSuccess={handleEditSuccess}
                    customRequest={customRequest}
                />
            )}

            {roleModalSlot !== undefined ? (
                roleModalSlot
            ) : (
                <UserRoleModal
                    isOpen={!!roleManagingUser}
                    user={roleManagingUser}
                    onClose={() => setRoleManagingUser(null)}
                    onRoleUpdated={handleUserRoleUpdated}
                    customRequest={customRequest}
                />
            )}

            {lockModalSlot !== undefined ? (
                lockModalSlot
            ) : (
                <AccountLockModal
                    isOpen={!!lockModalUser}
                    user={lockModalUser}
                    action={lockModalAction}
                    onClose={() => setLockModalUser(null)}
                    onSuccess={handleLockSuccess}
                    customRequest={customRequest}
                />
            )}
        </div>
    )
}
