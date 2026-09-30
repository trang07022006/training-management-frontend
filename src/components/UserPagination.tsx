import './UserPagination.css'

export interface UserPaginationProps {
    page: number
    pageSize: number
    total: number
    onPageChange: (newPage: number) => void
    isLoading?: boolean
}

export function UserPagination({
    page,
    pageSize,
    total,
    onPageChange,
    isLoading = false,
}: UserPaginationProps) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(total, page * pageSize)

    // Tạo mảng số trang hiển thị
    const getPageNumbers = () => {
        const pages: (number | string)[] = []
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            if (page <= 4) {
                pages.push(1, 2, 3, 4, 5, '...', totalPages)
            } else if (page >= totalPages - 3) {
                pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
            } else {
                pages.push(1, '...', page - 1, page, page + 1, '...', totalPages)
            }
        }
        return pages
    }

    if (total <= 0) {
        return null
    }

    return (
        <nav
            className="user-pagination-container"
            data-testid="user-pagination"
            aria-label="Điều hướng phân trang người dùng"
        >
            <div className="pagination-info" data-testid="pagination-info">
                Hiển thị <strong>{from}</strong> - <strong>{to}</strong> trên tổng số <strong>{total}</strong> người dùng
            </div>

            <div className="pagination-controls">
                <button
                    type="button"
                    className="btn-pagination-nav"
                    data-testid="btn-pagination-prev"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1 || isLoading}
                    aria-label="Trang trước"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span>Trước</span>
                </button>

                <div className="pagination-pages">
                    {getPageNumbers().map((item, index) => {
                        if (item === '...') {
                            return (
                                <span key={`ellipsis-${index}`} className="pagination-ellipsis" aria-hidden="true">
                                    &hellip;
                                </span>
                            )
                        }

                        const pageNum = Number(item)
                        const isActive = pageNum === page

                        return (
                            <button
                                key={`page-${pageNum}`}
                                type="button"
                                className={`btn-page-number ${isActive ? 'active' : ''}`}
                                data-testid={`btn-page-${pageNum}`}
                                onClick={() => !isActive && onPageChange(pageNum)}
                                disabled={isLoading || isActive}
                                aria-current={isActive ? 'page' : undefined}
                                aria-label={`Trang ${pageNum}`}
                            >
                                {pageNum}
                            </button>
                        )
                    })}
                </div>

                <button
                    type="button"
                    className="btn-pagination-nav"
                    data-testid="btn-pagination-next"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages || isLoading}
                    aria-label="Trang tiếp"
                >
                    <span>Sau</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </div>
        </nav>
    )
}
