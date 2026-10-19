import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    type AbsenceRequestItem,
    type EligibleSessionItem,
    getAbsenceRequestDetail,
    getEligibleSessions,
    getMyAbsenceRequests,
    submitAbsenceRequest,
} from '../api/absenceRequestApi'
import './StudentAbsenceRequestsPage.css'

export const StudentAbsenceRequestsPage: React.FC = () => {
    const { request } = useSession()
    const [searchParams, setSearchParams] = useSearchParams()

    // State danh sách đơn
    const [requests, setRequests] = useState<AbsenceRequestItem[]>([])
    const [totalItems, setTotalItems] = useState<number>(0)
    const [totalPages, setTotalPages] = useState<number>(1)
    const [page, setPage] = useState<number>(1)
    const [limit, setLimit] = useState<number>(10)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [searchKeyword, setSearchKeyword] = useState<string>('')
    const [debouncedKeyword, setDebouncedKeyword] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // State Modal Tạo đơn
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false)
    const [eligibleSessions, setEligibleSessions] = useState<EligibleSessionItem[]>([])
    const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false)
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('')
    const [reasonText, setReasonText] = useState<string>('')
    const [fieldErrors, setFieldErrors] = useState<{ scheduleId?: string; reason?: string }>({})
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const reasonInputRef = useRef<HTMLTextAreaElement>(null)
    const scheduleSelectRef = useRef<HTMLSelectElement>(null)

    // State Modal Chi tiết đơn
    const [selectedDetail, setSelectedDetail] = useState<AbsenceRequestItem | null>(null)
    const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false)

    // Debounce tìm kiếm
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedKeyword(searchKeyword)
            setPage(1)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchKeyword])

    // Load danh sách đơn
    const loadRequests = useCallback(async () => {
        setIsLoading(true)
        setErrorMessage(null)
        try {
            const data = await getMyAbsenceRequests(request, {
                page,
                limit,
                status: statusFilter,
                q: debouncedKeyword,
            })
            setRequests(data.items || [])
            setTotalItems(data.pagination?.total_items || 0)
            setTotalPages(data.pagination?.total_pages || 1)
        } catch (err: unknown) {
            const error = err as { message?: string }
            setErrorMessage(error.message || 'Không thể tải danh sách đơn xin phép vắng.')
            setRequests([])
        } finally {
            setIsLoading(false)
        }
    }, [request, page, limit, statusFilter, debouncedKeyword])

    useEffect(() => {
        loadRequests()
    }, [loadRequests])

    // Load danh sách buổi học hợp lệ
    const loadEligibleSessions = useCallback(async () => {
        setIsLoadingSessions(true)
        try {
            const sessions = await getEligibleSessions(request)
            setEligibleSessions(sessions)
        } catch (err: unknown) {
            const error = err as { message?: string }
            setErrorMessage(error.message || 'Không thể tải danh sách buổi học hợp lệ.')
        } finally {
            setIsLoadingSessions(false)
        }
    }, [request])

    // Tự động mở modal nếu có query param ?scheduleId=
    useEffect(() => {
        const scheduleIdParam = searchParams.get('scheduleId')
        if (scheduleIdParam) {
            setSelectedScheduleId(scheduleIdParam)
            setIsCreateModalOpen(true)
            loadEligibleSessions()
            // Xóa param sau khi mở modal để tránh lặp khi refresh
            searchParams.delete('scheduleId')
            setSearchParams(searchParams, { replace: true })
        }
    }, [searchParams, setSearchParams, loadEligibleSessions])

    // Xử lý mở modal tạo đơn thủ công
    const handleOpenCreateModal = () => {
        setIsCreateModalOpen(true)
        setSelectedScheduleId('')
        setReasonText('')
        setFieldErrors({})
        loadEligibleSessions()
    }

    // Đóng modal tạo đơn có cảnh báo
    const handleCloseCreateModal = () => {
        if (reasonText.trim().length > 0 || selectedScheduleId) {
            const confirmDiscard = window.confirm('Bạn có nội dung chưa lưu. Bạn có chắc chắn muốn đóng?')
            if (!confirmDiscard) return
        }
        setIsCreateModalOpen(false)
        setSelectedScheduleId('')
        setReasonText('')
        setFieldErrors({})
    }

    // Submit form gửi đơn
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const errors: { scheduleId?: string; reason?: string } = {}

        if (!selectedScheduleId || !selectedScheduleId.trim()) {
            errors.scheduleId = 'Vui lòng chọn buổi học cần xin phép vắng.'
        }

        const trimmedReason = reasonText.trim()
        if (!trimmedReason) {
            errors.reason = 'Vui lòng nhập lý do xin phép vắng.'
        } else if (trimmedReason.length < 5) {
            errors.reason = 'Lý do xin phép vắng phải có ít nhất 5 ký tự.'
        } else if (trimmedReason.length > 1000) {
            errors.reason = 'Lý do xin phép vắng không được vượt quá 1000 ký tự.'
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors)
            if (errors.scheduleId && scheduleSelectRef.current) {
                scheduleSelectRef.current.focus()
            } else if (errors.reason && reasonInputRef.current) {
                reasonInputRef.current.focus()
            }
            return
        }

        setIsSubmitting(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            await submitAbsenceRequest(request, {
                schedule_id: selectedScheduleId,
                reason: trimmedReason,
            })
            setSuccessMessage('Gửi đơn xin phép vắng thành công. Đơn đang chờ giảng viên xem xét.')
            setIsCreateModalOpen(false)
            setSelectedScheduleId('')
            setReasonText('')
            setFieldErrors({})
            // Load lại danh sách đơn
            setPage(1)
            loadRequests()
        } catch (err: unknown) {
            const error = err as { message?: string; code?: string }
            if (error.code === 'DUPLICATE_PENDING_REQUEST') {
                setFieldErrors({ scheduleId: 'Buổi học này đã có đơn xin phép vắng đang chờ duyệt.' })
                if (scheduleSelectRef.current) scheduleSelectRef.current.focus()
            } else if (error.code === 'REASON_TOO_SHORT') {
                setFieldErrors({ reason: 'Lý do xin phép vắng phải có ít nhất 5 ký tự.' })
                if (reasonInputRef.current) reasonInputRef.current.focus()
            } else if (error.code === 'REASON_TOO_LONG') {
                setFieldErrors({ reason: 'Lý do xin phép vắng không được vượt quá 1000 ký tự.' })
                if (reasonInputRef.current) reasonInputRef.current.focus()
            } else {
                setErrorMessage(error.message || 'Không thể gửi đơn xin phép vắng. Vui lòng thử lại.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // Mở modal xem chi tiết đơn
    const handleViewDetail = async (requestId: string) => {
        setIsLoadingDetail(true)
        try {
            const detail = await getAbsenceRequestDetail(request, requestId)
            setSelectedDetail(detail)
        } catch (err: unknown) {
            const error = err as { message?: string }
            setErrorMessage(error.message || 'Không thể xem chi tiết đơn.')
        } finally {
            setIsLoadingDetail(false)
        }
    }

    // Helper format ngày giờ
    const formatDateTime = (dateStr?: string | null) => {
        if (!dateStr) return '—'
        try {
            const d = new Date(dateStr)
            return d.toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            })
        } catch {
            return dateStr
        }
    }

    const formatDateOnly = (dateStr?: string | null) => {
        if (!dateStr) return '—'
        try {
            const [y, m, d] = dateStr.split('-')
            if (y && m && d) return `${d}/${m}/${y}`
            return dateStr
        } catch {
            return dateStr
        }
    }

    return (
        <div className="student-absence-container" data-testid="student-absence-page">
            {/* Header */}
            <div className="absence-header-section">
                <div className="absence-header-title">
                    <h1>Đơn xin phép vắng của tôi</h1>
                    <p>Theo dõi trạng thái các đơn đã gửi và nộp đơn xin nghỉ có lý do chính đáng</p>
                </div>
                <button
                    className="btn-primary-create"
                    onClick={handleOpenCreateModal}
                    data-testid="create-absence-request-btn"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Tạo đơn xin phép vắng
                </button>
            </div>

            {/* Error & Success Banners */}
            {errorMessage && (
                <div className="absence-error-banner" role="alert" data-testid="absence-error-banner">
                    <span>{errorMessage}</span>
                    <button className="modal-close-btn" onClick={() => setErrorMessage(null)} title="Đóng">✕</button>
                </div>
            )}

            {successMessage && (
                <div className="absence-error-banner" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }} role="status" data-testid="absence-success-banner">
                    <span>{successMessage}</span>
                    <button className="modal-close-btn" onClick={() => setSuccessMessage(null)} title="Đóng">✕</button>
                </div>
            )}

            {/* Filter Bar */}
            <div className="absence-filter-card">
                <div className="status-tabs" role="tablist">
                    {[
                        { key: 'all', label: 'Tất cả' },
                        { key: 'pending', label: 'Chờ duyệt' },
                        { key: 'approved', label: 'Đã duyệt' },
                        { key: 'rejected', label: 'Từ chối' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            role="tab"
                            aria-selected={statusFilter === tab.key}
                            className={`status-tab-btn ${statusFilter === tab.key ? 'active' : ''}`}
                            onClick={() => {
                                setStatusFilter(tab.key)
                                setPage(1)
                            }}
                            data-testid={`tab-${tab.key}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="filter-search-group">
                    <input
                        type="text"
                        className="filter-search-input"
                        placeholder="Tìm kiếm môn, lớp, lý do..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        data-testid="absence-search-input"
                    />
                </div>
            </div>

            {/* Content Table Card */}
            <div className="absence-table-card">
                {isLoading ? (
                    <div className="absence-state-container" data-testid="absence-loading">
                        <div className="absence-state-icon">⏳</div>
                        <p>Đang tải danh sách đơn xin phép vắng...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="absence-state-container" data-testid="absence-empty">
                        <div className="absence-state-icon">📋</div>
                        <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>Chưa có đơn xin phép vắng nào</p>
                        <p style={{ fontSize: 13, color: '#64748b' }}>
                            {debouncedKeyword || statusFilter !== 'all'
                                ? 'Không tìm thấy đơn phù hợp với bộ lọc tìm kiếm.'
                                : 'Bạn chưa gửi đơn xin phép vắng nào. Bấm nút "Tạo đơn xin phép vắng" để bắt đầu.'}
                        </p>
                    </div>
                ) : (
                    <div className="absence-table-responsive">
                        <table className="absence-data-table" data-testid="absence-data-table">
                            <thead>
                                <tr>
                                    <th>Buổi học</th>
                                    <th>Thời gian học</th>
                                    <th>Lý do xin vắng</th>
                                    <th>Trạng thái</th>
                                    <th>Thời điểm gửi</th>
                                    <th>Kết quả duyệt</th>
                                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((item) => (
                                    <tr key={item.id} data-testid={`absence-row-${item.id}`}>
                                        <td>
                                            <div className="session-info-cell">
                                                <span className="session-topic-title">
                                                    Buổi #{item.session_number}: {item.topic || 'Chủ đề buổi học'}
                                                </span>
                                                <span className="session-meta-sub">
                                                    {item.subject_name} ({item.class_code})
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="session-info-cell">
                                                <span style={{ fontWeight: 600 }}>{formatDateOnly(item.learning_date)}</span>
                                                <span className="session-meta-sub">
                                                    {item.shift ? `${item.shift} • ` : ''}
                                                    {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="reason-text-cell" title={item.reason}>
                                                {item.reason.length > 80 ? `${item.reason.slice(0, 80)}...` : item.reason}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${item.status}`} data-testid={`badge-${item.status}`}>
                                                {item.status_label || (item.status === 'pending' ? 'Chờ duyệt' : item.status === 'approved' ? 'Đã duyệt' : 'Từ chối')}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 12, color: '#64748b' }}>
                                                {formatDateTime(item.created_at)}
                                            </span>
                                        </td>
                                        <td>
                                            {item.status === 'approved' ? (
                                                <div style={{ fontSize: 12, color: '#15803d' }}>
                                                    ✓ Đã chấp thuận bởi {item.reviewer_name || 'Giảng viên'}
                                                </div>
                                            ) : item.status === 'rejected' ? (
                                                <div style={{ fontSize: 12, color: '#b91c1c' }}>
                                                    <div>✕ Từ chối: {item.rejection_reason || 'Không nêu lý do'}</div>
                                                    <div style={{ color: '#64748b', fontSize: 11 }}>bởi {item.reviewer_name || 'Giảng viên'}</div>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: 12, color: '#94a3b8' }}>Đang chờ xử lý</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                className="btn-action-view"
                                                onClick={() => handleViewDetail(item.id)}
                                                data-testid={`view-detail-btn-${item.id}`}
                                            >
                                                Chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!isLoading && requests.length > 0 && (
                    <div className="absence-pagination-bar" data-testid="absence-pagination">
                        <div>
                            Hiển thị <strong>{(page - 1) * limit + 1}</strong> – <strong>{Math.min(page * limit, totalItems)}</strong> trong <strong>{totalItems}</strong> đơn
                        </div>
                        <div className="pagination-controls">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                Hiển thị:
                                <select
                                    className="page-size-selector"
                                    value={limit}
                                    onChange={(e) => {
                                        setLimit(Number(e.target.value))
                                        setPage(1)
                                    }}
                                    data-testid="page-size-selector"
                                >
                                    <option value={10}>10 / trang</option>
                                    <option value={20}>20 / trang</option>
                                </select>
                            </label>
                            <button
                                className="pagination-btn"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                data-testid="prev-page-btn"
                            >
                                Trước
                            </button>
                            <span style={{ margin: '0 4px', fontWeight: 600, color: '#0f172a' }}>
                                Trang {page} / {totalPages}
                            </span>
                            <button
                                className="pagination-btn"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                                data-testid="next-page-btn"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Tạo đơn xin phép vắng */}
            {isCreateModalOpen && (
                <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="create-absence-modal">
                    <div className="modal-dialog-card">
                        <div className="modal-dialog-header">
                            <h2>Gửi đơn xin phép vắng</h2>
                            <button className="modal-close-btn" onClick={handleCloseCreateModal} title="Đóng">✕</button>
                        </div>
                        <form onSubmit={handleFormSubmit} noValidate>
                            <div className="modal-dialog-body">
                                {/* Chọn buổi học */}
                                <div className="form-field-group">
                                    <label htmlFor="schedule-select" className="form-field-label">
                                        Chọn buổi học xin nghỉ <span className="required-star">*</span>
                                    </label>
                                    {isLoadingSessions ? (
                                        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0' }}>Đang tải danh sách buổi học hợp lệ...</p>
                                    ) : eligibleSessions.length === 0 ? (
                                        <p style={{ fontSize: 13, color: '#b91c1c', margin: '4px 0' }}>
                                            Hiện không có buổi học nào đủ điều kiện để gửi đơn (buổi học phải nằm trong vòng 48 giờ sau khi kết thúc hoặc trong tương lai).
                                        </p>
                                    ) : (
                                        <select
                                            id="schedule-select"
                                            ref={scheduleSelectRef}
                                            className={`form-field-select ${fieldErrors.scheduleId ? 'input-error' : ''}`}
                                            value={selectedScheduleId}
                                            onChange={(e) => {
                                                setSelectedScheduleId(e.target.value)
                                                if (fieldErrors.scheduleId) {
                                                    setFieldErrors((prev) => ({ ...prev, scheduleId: undefined }))
                                                }
                                            }}
                                            data-testid="schedule-select"
                                        >
                                            <option value="">-- Chọn buổi học --</option>
                                            {eligibleSessions.map((s) => (
                                                <option
                                                    key={s.schedule_id}
                                                    value={s.schedule_id}
                                                    disabled={s.has_pending_request}
                                                >
                                                    [{s.class_code}] {s.subject_name} • Buổi #{s.session_number}: {s.topic} • {formatDateOnly(s.learning_date)} ({s.shift || 'Ca học'})
                                                    {s.has_pending_request ? ' (Đang chờ duyệt)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {fieldErrors.scheduleId && (
                                        <span className="form-field-error-msg" data-testid="schedule-error-msg">
                                            {fieldErrors.scheduleId}
                                        </span>
                                    )}
                                </div>

                                {/* Nhập lý do */}
                                <div className="form-field-group">
                                    <label htmlFor="reason-textarea" className="form-field-label">
                                        Lý do xin phép vắng <span className="required-star">*</span>
                                    </label>
                                    <textarea
                                        id="reason-textarea"
                                        ref={reasonInputRef}
                                        rows={4}
                                        className={`form-field-textarea ${fieldErrors.reason ? 'input-error' : ''}`}
                                        placeholder="Nhập lý do cụ thể và rõ ràng (tối thiểu 5 ký tự)..."
                                        value={reasonText}
                                        maxLength={1000}
                                        onChange={(e) => {
                                            setReasonText(e.target.value)
                                            if (fieldErrors.reason) {
                                                setFieldErrors((prev) => ({ ...prev, reason: undefined }))
                                            }
                                        }}
                                        data-testid="reason-textarea"
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {fieldErrors.reason ? (
                                            <span className="form-field-error-msg" data-testid="reason-error-msg">
                                                {fieldErrors.reason}
                                            </span>
                                        ) : <span />}
                                        <span className="char-counter">{reasonText.length} / 1000 ký tự</span>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-dialog-footer">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleCloseCreateModal}
                                    disabled={isSubmitting}
                                    data-testid="cancel-create-btn"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={isSubmitting || eligibleSessions.length === 0}
                                    data-testid="submit-absence-btn"
                                >
                                    {isSubmitting ? 'Đang gửi...' : 'Gửi đơn xin nghỉ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Chi tiết đơn */}
            {(selectedDetail || isLoadingDetail) && (
                <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="detail-absence-modal">
                    <div className="modal-dialog-card">
                        <div className="modal-dialog-header">
                            <h2>Chi tiết đơn xin phép vắng</h2>
                            <button className="modal-close-btn" onClick={() => setSelectedDetail(null)} title="Đóng">✕</button>
                        </div>
                        <div className="modal-dialog-body">
                            {isLoadingDetail ? (
                                <p>Đang tải thông tin chi tiết...</p>
                            ) : selectedDetail ? (
                                <div className="detail-grid">
                                    <div>
                                        <div className="detail-item-label">Môn học & Lớp</div>
                                        <div className="detail-item-value">{selectedDetail.subject_name} ({selectedDetail.class_code})</div>
                                    </div>
                                    <div>
                                        <div className="detail-item-label">Buổi học</div>
                                        <div className="detail-item-value">Buổi #{selectedDetail.session_number}: {selectedDetail.topic}</div>
                                    </div>
                                    <div>
                                        <div className="detail-item-label">Ngày & Giờ học</div>
                                        <div className="detail-item-value">
                                            {formatDateOnly(selectedDetail.learning_date)} • {selectedDetail.start_time?.slice(0, 5)} - {selectedDetail.end_time?.slice(0, 5)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="detail-item-label">Phòng học & Giảng viên</div>
                                        <div className="detail-item-value">{selectedDetail.room_name || 'Chưa xếp'} • {selectedDetail.instructor_name || 'Chưa phân công'}</div>
                                    </div>
                                    <div>
                                        <div className="detail-item-label">Trạng thái duyệt</div>
                                        <div className="detail-item-value">
                                            <span className={`status-badge ${selectedDetail.status}`}>
                                                {selectedDetail.status_label}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="detail-item-label">Thời điểm gửi đơn</div>
                                        <div className="detail-item-value">{formatDateTime(selectedDetail.created_at)}</div>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <div className="detail-item-label">Lý do xin phép vắng</div>
                                        <div className="detail-item-value" style={{ fontWeight: 400, whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                            {selectedDetail.reason}
                                        </div>
                                    </div>
                                    {selectedDetail.status !== 'pending' && (
                                        <div style={{ gridColumn: 'span 2', borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                                            <div className="detail-item-label">Thông tin xét duyệt</div>
                                            <div style={{ fontSize: 13, marginTop: 4 }}>
                                                Người xử lý: <strong>{selectedDetail.reviewer_name || 'Giảng viên'}</strong> ({selectedDetail.reviewer_email || '—'})
                                                <br />
                                                Thời điểm: {formatDateTime(selectedDetail.reviewed_at)}
                                                {selectedDetail.status === 'rejected' && (
                                                    <div style={{ marginTop: 6, color: '#b91c1c' }}>
                                                        Lý do từ chối: <strong>{selectedDetail.rejection_reason || 'Không nêu lý do'}</strong>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                        <div className="modal-dialog-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setSelectedDetail(null)}
                                data-testid="close-detail-modal-btn"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
