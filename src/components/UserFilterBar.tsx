import { useState, type FormEvent } from 'react'
import './UserFilterBar.css'

export interface UserFilters {
    search: string
    role: string
    status: string
}

export interface UserFilterBarProps {
    initialFilters?: Partial<UserFilters>
    onFilterChange: (filters: UserFilters) => void
    isLoading?: boolean
}

export function UserFilterBar({
    initialFilters,
    onFilterChange,
    isLoading = false,
}: UserFilterBarProps) {
    const [search, setSearch] = useState<string>(initialFilters?.search ?? '')
    const [role, setRole] = useState<string>(initialFilters?.role ?? '')
    const [status, setStatus] = useState<string>(initialFilters?.status ?? '')

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
        onFilterChange({
            search: search.trim(),
            role,
            status,
        })
    }

    const handleRoleChange = (newRole: string) => {
        setRole(newRole)
        onFilterChange({
            search: search.trim(),
            role: newRole,
            status,
        })
    }

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus)
        onFilterChange({
            search: search.trim(),
            role,
            status: newStatus,
        })
    }

    const handleClearSearch = () => {
        setSearch('')
        onFilterChange({
            search: '',
            role,
            status,
        })
    }

    const handleReset = () => {
        setSearch('')
        setRole('')
        setStatus('')
        onFilterChange({
            search: '',
            role: '',
            status: '',
        })
    }

    return (
        <div className="user-filter-bar" data-testid="user-filter-bar">
            <form className="user-filter-form" onSubmit={handleSubmit} role="search">
                {/* Search Input */}
                <div className="search-input-wrapper">
                    <svg
                        className="search-icon"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        className="filter-input-search"
                        data-testid="filter-input-search"
                        placeholder="Tìm theo tên, email, số điện thoại..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Tìm kiếm người dùng"
                        disabled={isLoading}
                    />
                    {search.length > 0 && (
                        <button
                            type="button"
                            className="search-clear-btn"
                            data-testid="btn-clear-search"
                            aria-label="Xóa từ khóa tìm kiếm"
                            onClick={handleClearSearch}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Role Select */}
                <div className="filter-select-wrapper">
                    <select
                        className="filter-select"
                        data-testid="filter-select-role"
                        value={role}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        aria-label="Lọc theo vai trò"
                        disabled={isLoading}
                    >
                        <option value="">Tất cả vai trò</option>
                        <option value="admin">Quản trị viên</option>
                        <option value="trainer">Giảng viên</option>
                        <option value="trainee">Học viên</option>
                        <option value="user">Người dùng</option>
                    </select>
                </div>

                {/* Status Select */}
                <div className="filter-select-wrapper">
                    <select
                        className="filter-select"
                        data-testid="filter-select-status"
                        value={status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        aria-label="Lọc theo trạng thái"
                        disabled={isLoading}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Hoạt động</option>
                        <option value="locked">Bị khóa</option>
                        <option value="inactive">Không hoạt động</option>
                    </select>
                </div>

                {/* Filter Action Buttons */}
                <div className="filter-actions">
                    <button
                        type="submit"
                        className="btn-filter-submit"
                        data-testid="btn-filter-submit"
                        disabled={isLoading}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <span>Tìm kiếm</span>
                    </button>

                    <button
                        type="button"
                        className="btn-filter-reset"
                        data-testid="btn-filter-reset"
                        onClick={handleReset}
                        disabled={isLoading}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                        <span>Đặt lại</span>
                    </button>
                </div>
            </form>
        </div>
    )
}
