import { useEffect, useState } from 'react'
import { useSession } from '../auth/SessionProvider'
import {
    getLeads,
    getLead,
    updateLeadStatus,
    assignLead,
    getAssignableUsers,
    getLeadStatusLabel,
    LEAD_STATUS_BADGE_CLASSES,
    type Lead,
    type LeadStatus,
    type AssignableUser,
} from '../api/leadApi'
import { Breadcrumb } from '../components/Breadcrumb'
import './LeadsPage.css'

export function LeadsPage() {
    const { request } = useSession()

    const [leads, setLeads] = useState<Lead[]>([])
    const [page, setPage] = useState<number>(1)
    const [pageSize] = useState<number>(10)
    const [total, setTotal] = useState<number>(0)
    const [totalPages, setTotalPages] = useState<number>(0)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [pageError, setPageError] = useState<string | null>(null)

    // Filter & Search states (SCRUM-128)
    const [search, setSearch] = useState<string>('')
    const [debouncedSearch, setDebouncedSearch] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [assigneeFilter, setAssigneeFilter] = useState<string>('')
    const [dateFrom, setDateFrom] = useState<string>('')
    const [dateTo, setDateTo] = useState<string>('')

    // Modal chi tiết Lead
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false)
    const [selectedStatus, setSelectedStatus] = useState<LeadStatus>('new')
    const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false)
    const [statusError, setStatusError] = useState<string | null>(null)
    const [statusSuccess, setStatusSuccess] = useState<string | null>(null)

    // Phân công Lead (SCRUM-127)
    const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])
    const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('')
    const [isAssigning, setIsAssigning] = useState<boolean>(false)
    const [assignmentError, setAssignmentError] = useState<string | null>(null)
    const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null)

    // Debounce search input (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
        }, 300)
        return () => clearTimeout(timer)
    }, [search])

    // Tải trước danh sách nhân sự phụ trách
    useEffect(() => {
        getAssignableUsers(request)
            .then(setAssignableUsers)
            .catch(() => {})
    }, [request])

    // Tải danh sách Lead với phân trang, tìm kiếm và lọc
    useEffect(() => {
        let isMounted = true

        getLeads(request, {
            page,
            page_size: pageSize,
            search: debouncedSearch.trim() || undefined,
            status: statusFilter || undefined,
            assigned_to_user_id: assigneeFilter || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        })
            .then((data) => {
                if (isMounted) {
                    setLeads(data.items)
                    setTotal(data.total)
                    setPage(data.page)
                    setTotalPages(data.total_pages)
                    setIsLoading(false)
                }
            })
            .catch((err: unknown) => {
                if (isMounted) {
                    const message =
                        err instanceof Error ? err.message : 'Lỗi khi tải danh sách tư vấn.'
                    setPageError(message)
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [
        request,
        page,
        pageSize,
        debouncedSearch,
        statusFilter,
        assigneeFilter,
        dateFrom,
        dateTo,
    ])

    const handleClearFilters = () => {
        setSearch('')
        setDebouncedSearch('')
        setStatusFilter('')
        setAssigneeFilter('')
        setDateFrom('')
        setDateTo('')
        setPage(1)
    }

    const handleOpenDetail = async (leadId: string) => {
        setStatusError(null)
        setStatusSuccess(null)
        setAssignmentError(null)
        setAssignmentSuccess(null)
        try {
            const detail = await getLead(request, leadId)
            setSelectedLead(detail)
            setSelectedStatus(detail.status)
            setSelectedAssigneeId(detail.assigned_to_user_id || '')
            setIsDetailModalOpen(true)
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Không thể tải chi tiết tư vấn.'
            setPageError(message)
        }
    }

    const handleCloseModal = () => {
        setIsDetailModalOpen(false)
        setSelectedLead(null)
        setStatusError(null)
        setStatusSuccess(null)
        setAssignmentError(null)
        setAssignmentSuccess(null)
    }

    const handleSaveStatus = async () => {
        if (!selectedLead) return
        setIsUpdatingStatus(true)
        setStatusError(null)
        setStatusSuccess(null)

        try {
            const updated = await updateLeadStatus(
                request,
                selectedLead.id,
                selectedStatus,
            )
            setSelectedLead(updated)
            setStatusSuccess('Cập nhật trạng thái thành công!')
            setLeads((prev) =>
                prev.map((item) => (item.id === updated.id ? updated : item)),
            )
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.'
            setStatusError(message)
        } finally {
            setIsUpdatingStatus(false)
        }
    }

    const handleSaveAssignment = async () => {
        if (!selectedLead) return
        setIsAssigning(true)
        setAssignmentError(null)
        setAssignmentSuccess(null)

        const targetUserId = selectedAssigneeId.trim() || null
        try {
            const updated = await assignLead(request, selectedLead.id, targetUserId)
            setSelectedLead(updated)
            setAssignmentSuccess(
                targetUserId
                    ? 'Phân công nhân sự phụ trách thành công!'
                    : 'Đã gỡ phân công nhân sự phụ trách!',
            )
            setLeads((prev) =>
                prev.map((item) => (item.id === updated.id ? updated : item)),
            )
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Không thể cập nhật phân công.'
            setAssignmentError(message)
        } finally {
            setIsAssigning(false)
        }
    }

    const formatDate = (isoString?: string | null) => {
        if (!isoString) return '-'
        try {
            const d = new Date(isoString)
            return d.toLocaleString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            })
        } catch {
            return isoString
        }
    }

    return (
        <div className="leads-page-container">
            <Breadcrumb items={[{ label: 'Tư vấn tuyển sinh' }]} />
            <header className="leads-header">
                <h1 className="leads-header-title">Quản lý Tư vấn Tuyển sinh</h1>
                <p className="leads-header-desc">
                    Theo dõi, lọc, tìm kiếm và phân công các yêu cầu đăng ký tư vấn tuyển
                    sinh từ học viên và khách hàng tiềm năng.
                </p>
            </header>

            {pageError && (
                <div className="leads-alert-error" role="alert" data-testid="page-error">
                    {pageError}
                </div>
            )}

            {/* Thanh tìm kiếm & Bộ lọc nâng cao (SCRUM-128) */}
            <div className="leads-filter-bar" data-testid="leads-filter-bar">
                <input
                    type="text"
                    className="leads-search-input"
                    placeholder="Tìm theo họ tên, số điện thoại, email..."
                    data-testid="leads-search-input"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                    }}
                />

                <select
                    className="leads-filter-select"
                    data-testid="leads-status-filter"
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value)
                        setPage(1)
                    }}
                    aria-label="Lọc theo trạng thái"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="new">Mới tiếp nhận</option>
                    <option value="contacted">Đã liên hệ</option>
                    <option value="qualified">Tiềm năng</option>
                    <option value="converted">Đã nhập học</option>
                    <option value="lost">Không thành công</option>
                    <option value="cancelled">Đã hủy</option>
                </select>

                <select
                    className="leads-filter-select"
                    data-testid="leads-assignee-filter"
                    value={assigneeFilter}
                    onChange={(e) => {
                        setAssigneeFilter(e.target.value)
                        setPage(1)
                    }}
                    aria-label="Lọc theo người phụ trách"
                >
                    <option value="">Tất cả người phụ trách</option>
                    <option value="unassigned">Chưa phân công</option>
                    {assignableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.name}
                        </option>
                    ))}
                </select>

                <div className="leads-date-group">
                    <span className="leads-date-label">Từ ngày:</span>
                    <input
                        type="date"
                        className="leads-filter-date"
                        data-testid="leads-date-from-filter"
                        value={dateFrom}
                        onChange={(e) => {
                            setDateFrom(e.target.value)
                            setPage(1)
                        }}
                        aria-label="Từ ngày"
                    />
                </div>

                <div className="leads-date-group">
                    <span className="leads-date-label">Đến ngày:</span>
                    <input
                        type="date"
                        className="leads-filter-date"
                        data-testid="leads-date-to-filter"
                        value={dateTo}
                        onChange={(e) => {
                            setDateTo(e.target.value)
                            setPage(1)
                        }}
                        aria-label="Đến ngày"
                    />
                </div>

                {(search || statusFilter || assigneeFilter || dateFrom || dateTo) && (
                    <button
                        type="button"
                        className="btn-clear-filters"
                        data-testid="clear-filters-btn"
                        onClick={handleClearFilters}
                    >
                        Xóa bộ lọc
                    </button>
                )}
            </div>

            <div className="leads-card">
                <div className="leads-table-wrapper">
                    <table className="leads-table" aria-label="Danh sách yêu cầu tư vấn">
                        <thead>
                            <tr>
                                <th>Họ và tên</th>
                                <th>Số điện thoại</th>
                                <th>Email</th>
                                <th>Chương trình quan tâm</th>
                                <th>Nguồn</th>
                                <th>Người phụ trách</th>
                                <th>Trạng thái</th>
                                <th>Thời gian gửi</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={9} className="leads-loading-state" data-testid="loading-state">
                                        Đang tải danh sách tư vấn...
                                    </td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="leads-empty-state" data-testid="empty-state">
                                        Chưa có yêu cầu tư vấn nào được ghi nhận.
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead) => {
                                    const badgeClass =
                                        LEAD_STATUS_BADGE_CLASSES[lead.status] ||
                                        'status-badge--cancelled'
                                    const programDisplay =
                                        lead.interested_program_name ||
                                        lead.interested_program_code ||
                                        '-'

                                    return (
                                        <tr key={lead.id} data-testid={`lead-row-${lead.id}`}>
                                            <td>
                                                <strong>{lead.full_name}</strong>
                                            </td>
                                            <td>{lead.phone}</td>
                                            <td>{lead.email || '-'}</td>
                                            <td>{programDisplay}</td>
                                            <td>{lead.source}</td>
                                            <td data-testid={`assignee-cell-${lead.id}`}>
                                                {lead.assigned_to_name ? (
                                                    <span className="lead-assignee-name">
                                                        {lead.assigned_to_name}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted" style={{ color: '#94a3b8' }}>
                                                        Chưa phân công
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <span
                                                    className={`lead-status-badge ${badgeClass}`}
                                                    data-testid={`status-badge-${lead.id}`}
                                                >
                                                    {getLeadStatusLabel(lead.status)}
                                                </span>
                                            </td>
                                            <td>{formatDate(lead.created_at)}</td>
                                            <td>
                                                <div className="lead-actions-cell">
                                                    <button
                                                        type="button"
                                                        className="btn-action-view"
                                                        data-testid={`view-lead-${lead.id}`}
                                                        onClick={() => void handleOpenDetail(lead.id)}
                                                    >
                                                        Xem chi tiết
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="leads-pagination" data-testid="leads-pagination">
                    <span>
                        Trang {page} / {Math.max(totalPages, 1)} ({total} yêu cầu)
                    </span>
                    <div className="pagination-controls">
                        <button
                            type="button"
                            className="btn-pagination"
                            data-testid="prev-page-btn"
                            disabled={page <= 1 || isLoading}
                            onClick={() => {
                                setIsLoading(true)
                                setPage((p) => Math.max(1, p - 1))
                            }}
                        >
                            Trang trước
                        </button>
                        <button
                            type="button"
                            className="btn-pagination"
                            data-testid="next-page-btn"
                            disabled={page >= totalPages || isLoading}
                            onClick={() => {
                                setIsLoading(true)
                                setPage((p) => p + 1)
                            }}
                        >
                            Trang sau
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal Chi tiết & Cập nhật trạng thái / Phân công */}
            {isDetailModalOpen && selectedLead && (
                <div
                    className="leads-modal-overlay"
                    data-testid="lead-detail-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    <div className="leads-modal-card">
                        <header className="leads-modal-header">
                            <div className="leads-modal-header-title-wrap">
                                <h2 id="modal-title" className="leads-modal-title">
                                    Chi tiết Yêu cầu Tư vấn
                                </h2>
                                <span
                                    className={`lead-status-badge ${LEAD_STATUS_BADGE_CLASSES[selectedLead.status]}`}
                                    data-testid={`modal-status-badge-${selectedLead.id}`}
                                >
                                    {getLeadStatusLabel(selectedLead.status)}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="leads-modal-close-btn"
                                data-testid="close-modal-top-btn"
                                onClick={handleCloseModal}
                                aria-label="Đóng"
                            >
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </header>

                        <div className="leads-modal-body">
                            {statusSuccess && (
                                <div
                                    className="leads-alert-success"
                                    data-testid="status-success-alert"
                                >
                                    {statusSuccess}
                                </div>
                            )}

                            {statusError && (
                                <div
                                    className="leads-alert-error"
                                    data-testid="status-error-alert"
                                >
                                    {statusError}
                                </div>
                            )}

                            {assignmentSuccess && (
                                <div
                                    className="leads-alert-success"
                                    data-testid="assignment-success-alert"
                                >
                                    {assignmentSuccess}
                                </div>
                            )}

                            {assignmentError && (
                                <div
                                    className="leads-alert-error"
                                    data-testid="assignment-error-alert"
                                >
                                    {assignmentError}
                                </div>
                            )}

                            <div className="detail-info-grid">
                                <div className="detail-row">
                                    <span className="detail-label">Họ và tên:</span>
                                    <span className="detail-value" data-testid="detail-fullname">
                                        {selectedLead.full_name}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Số điện thoại:</span>
                                    <span className="detail-value" data-testid="detail-phone">
                                        {selectedLead.phone}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Email:</span>
                                    <span className="detail-value" data-testid="detail-email">
                                        {selectedLead.email || 'Không cung cấp'}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Chương trình:</span>
                                    <span className="detail-value" data-testid="detail-program">
                                        {selectedLead.interested_program_name ||
                                            selectedLead.interested_program_code ||
                                            'Chưa xác định'}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Nguồn tiếp nhận:</span>
                                    <span className="detail-value" data-testid="detail-source">
                                        {selectedLead.source}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Người phụ trách:</span>
                                    <span className="detail-value" data-testid="detail-assignee">
                                        {selectedLead.assigned_to_name
                                            ? `${selectedLead.assigned_to_name} (${selectedLead.assigned_to_email || ''})`
                                            : 'Chưa phân công'}
                                    </span>
                                </div>

                                {selectedLead.assigned_at && (
                                    <div className="detail-row">
                                        <span className="detail-label">Thời gian phân công:</span>
                                        <span className="detail-value" data-testid="detail-assigned-at">
                                            {formatDate(selectedLead.assigned_at)}
                                        </span>
                                    </div>
                                )}

                                <div className="detail-row">
                                    <span className="detail-label">Thời gian gửi:</span>
                                    <span className="detail-value">
                                        {formatDate(selectedLead.created_at)}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Cập nhật gần nhất:</span>
                                    <span className="detail-value">
                                        {formatDate(selectedLead.updated_at)}
                                    </span>
                                </div>
                            </div>

                            <div className="detail-message-section">
                                <span className="detail-label">Nội dung tư vấn:</span>
                                <div className="detail-message-box" data-testid="detail-message">
                                    {selectedLead.message || 'Không có ghi chú nội dung tư vấn.'}
                                </div>
                            </div>

                            {/* Khu vực phân công nhân sự phụ trách (SCRUM-127) */}
                            <div className="leads-modal-assign-section">
                                <label
                                    htmlFor="assignee-select-input"
                                    className="section-subheading-label"
                                >
                                    Phân công nhân sự phụ trách:
                                </label>
                                <div className="assign-form-group">
                                    <select
                                        id="assignee-select-input"
                                        className="assign-select-input"
                                        data-testid="assignee-select"
                                        value={selectedAssigneeId}
                                        onChange={(e) => setSelectedAssigneeId(e.target.value)}
                                        disabled={isAssigning}
                                    >
                                        <option value="">-- Chưa phân công / Gỡ phân công --</option>
                                        {assignableUsers.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name} ({u.email}) - {u.role === 'admin' ? 'Quản trị viên' : 'Giảng viên'}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        type="button"
                                        className={`btn-save-assign ${!selectedAssigneeId && selectedLead.assigned_to_user_id ? 'btn-unassign' : ''}`}
                                        data-testid="save-assignment-btn"
                                        onClick={() => void handleSaveAssignment()}
                                        disabled={
                                            isAssigning ||
                                            selectedAssigneeId === (selectedLead.assigned_to_user_id || '')
                                        }
                                    >
                                        {isAssigning
                                            ? 'Đang lưu...'
                                            : selectedAssigneeId
                                              ? 'Lưu phân công'
                                              : 'Gỡ phân công'}
                                    </button>
                                </div>
                            </div>

                            {/* Khu vực cập nhật trạng thái */}
                            <div className="leads-modal-status-section">
                                <label
                                    htmlFor="status-select-input"
                                    className="section-subheading-label"
                                >
                                    Cập nhật trạng thái xử lý:
                                </label>
                                <div className="status-form-group">
                                    <select
                                        id="status-select-input"
                                        className="status-select-input"
                                        data-testid="status-select"
                                        value={selectedStatus}
                                        onChange={(e) =>
                                            setSelectedStatus(e.target.value as LeadStatus)
                                        }
                                        disabled={isUpdatingStatus}
                                    >
                                        <option value="new">Mới tiếp nhận</option>
                                        <option value="contacted">Đã liên hệ</option>
                                        <option value="qualified">Tiềm năng</option>
                                        <option value="converted">Đã nhập học</option>
                                        <option value="lost">Không thành công</option>
                                        <option value="cancelled">Đã hủy</option>
                                    </select>

                                    <button
                                        type="button"
                                        className="btn-save-status"
                                        data-testid="save-status-btn"
                                        onClick={() => void handleSaveStatus()}
                                        disabled={
                                            isUpdatingStatus || selectedStatus === selectedLead.status
                                        }
                                    >
                                        {isUpdatingStatus ? 'Đang lưu...' : 'Lưu trạng thái'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <footer className="leads-modal-footer">
                            <button
                                type="button"
                                className="btn-modal-close"
                                data-testid="close-modal-btn"
                                onClick={handleCloseModal}
                            >
                                Đóng
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    )
}
