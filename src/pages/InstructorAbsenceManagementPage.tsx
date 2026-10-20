import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '../auth/SessionProvider'
import {
    type AbsenceRequestItem,
    downloadAbsenceAttachment,
    getAbsenceRequestDetail,
    getAbsenceRequestsForReviewer,
    reviewAbsenceRequest,
} from '../api/absenceRequestApi'
import { formatSessionShiftAndTime } from '../utils/scheduleDisplayUtils'
import { ToastPortal } from '../components/ToastPortal'
import './InstructorAbsenceManagementPage.css'

export const InstructorAbsenceManagementPage: React.FC = () => {
    const { request } = useSession()

    // State danh sách đơn
    const [requests, setRequests] = useState<AbsenceRequestItem[]>([])
    const [totalItems, setTotalItems] = useState<number>(0)
    const [totalPages, setTotalPages] = useState<number>(1)
    const [page, setPage] = useState<number>(1)
    const [limit, setLimit] = useState<number>(10)
    const [statusFilter, setStatusFilter] = useState<string>('pending')
    const [searchKeyword, setSearchKeyword] = useState<string>('')
    const [debouncedKeyword, setDebouncedKeyword] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // State Modal Xem & Duyệt đơn
    const [selectedRequest, setSelectedRequest] = useState<AbsenceRequestItem | null>(null)
    const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false)
    const [isReviewing, setIsReviewing] = useState<boolean>(false)
    const [showRejectForm, setShowRejectForm] = useState<boolean>(false)
    const [rejectionReason, setRejectionReason] = useState<string>('')
    const [rejectionError, setRejectionError] = useState<string | null>(null)
    const [downloadingAttId, setDownloadingAttId] = useState<string | null>(null)
    const rejectionInputRef = useRef<HTMLTextAreaElement>(null)

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
            const data = await getAbsenceRequestsForReviewer(request, {
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
            setErrorMessage(error.message || 'Không thể tải danh sách đơn cần xét duyệt.')
            setRequests([])
        } finally {
            setIsLoading(false)
        }
    }, [request, page, limit, statusFilter, debouncedKeyword])

    useEffect(() => {
        loadRequests()
    }, [loadRequests])

    // Mở modal xem chi tiết đơn
    const handleOpenReviewModal = async (requestId: string) => {
        setIsLoadingDetail(true)
        setShowRejectForm(false)
        setRejectionReason('')
        setRejectionError(null)
        setErrorMessage(null)
        try {
            const detail = await getAbsenceRequestDetail(request, requestId)
            setSelectedRequest(detail)
        } catch (err: unknown) {
            const error = err as { message?: string }
            setErrorMessage(error.message || 'Không thể tải chi tiết đơn.')
        } finally {
            setIsLoadingDetail(false)
        }
    }

    // Đóng modal có xác nhận nếu đang nhập dở lý do từ chối
    const handleCloseReviewModal = () => {
        if (showRejectForm && rejectionReason.trim().length > 0) {
            const confirmDiscard = window.confirm('Bạn đang nhập lý do từ chối chưa lưu. Bạn có chắc chắn muốn đóng?')
            if (!confirmDiscard) return
        }
        setSelectedRequest(null)
        setShowRejectForm(false)
        setRejectionReason('')
        setRejectionError(null)
    }

    // Phê duyệt đơn (approve)
    const handleApproveRequest = async () => {
        if (!selectedRequest) return
        const confirmApprove = window.confirm('Bạn có chắc chắn muốn phê duyệt đơn xin phép vắng này? Điểm danh của học viên sẽ được cập nhật thành Vắng có phép.')
        if (!confirmApprove) return

        setIsReviewing(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            const updated = await reviewAbsenceRequest(request, selectedRequest.id, {
                action: 'approve',
            })
            setSuccessMessage(`Đã phê duyệt đơn xin phép vắng của học viên ${updated.student_name || ''}. Điểm danh buổi học đã được cập nhật thành Vắng có phép.`)
            setSelectedRequest(updated)
            loadRequests()
        } catch (err: unknown) {
            const error = err as { message?: string; code?: string }
            if (error.code === 'ATTENDANCE_CONFLICT') {
                setErrorMessage('Học viên đã có mặt hoặc đi muộn tại buổi học này. Không thể duyệt đơn vắng có phép.')
            } else if (error.code === 'REQUEST_ALREADY_REVIEWED') {
                setErrorMessage('Đơn xin phép vắng này đã được xử lý trước đó.')
                loadRequests()
            } else {
                setErrorMessage(error.message || 'Không thể phê duyệt đơn. Vui lòng thử lại.')
            }
        } finally {
            setIsReviewing(false)
        }
    }

    // Xác nhận từ chối đơn (reject)
    const handleConfirmReject = async () => {
        if (!selectedRequest) return
        const trimmed = rejectionReason.trim()
        if (!trimmed) {
            setRejectionError('Vui lòng nhập lý do từ chối đơn xin phép vắng.')
            rejectionInputRef.current?.focus()
            return
        }
        if (trimmed.length < 3) {
            setRejectionError('Lý do từ chối phải có ít nhất 3 ký tự.')
            rejectionInputRef.current?.focus()
            return
        }
        if (trimmed.length > 1000) {
            setRejectionError('Lý do từ chối không được vượt quá 1000 ký tự.')
            rejectionInputRef.current?.focus()
            return
        }

        setIsReviewing(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            const updated = await reviewAbsenceRequest(request, selectedRequest.id, {
                action: 'reject',
                rejection_reason: trimmed,
            })
            setSuccessMessage(`Đã từ chối đơn xin phép vắng của học viên ${updated.student_name || ''}.`)
            setSelectedRequest(updated)
            setShowRejectForm(false)
            setRejectionReason('')
            loadRequests()
        } catch (err: unknown) {
            const error = err as { message?: string; code?: string }
            if (error.code === 'REQUEST_ALREADY_REVIEWED') {
                setErrorMessage('Đơn xin phép vắng này đã được xử lý trước đó.')
                loadRequests()
            } else {
                setErrorMessage(error.message || 'Không thể từ chối đơn. Vui lòng thử lại.')
            }
        } finally {
            setIsReviewing(false)
        }
    }

    // Tải xuống minh chứng có xác thực
    const handleDownloadAttachment = async (requestId: string, attachmentId: string, fileName: string) => {
        setDownloadingAttId(attachmentId)
        try {
            await downloadAbsenceAttachment(request, requestId, attachmentId, fileName)
        } catch (err: unknown) {
            const error = err as { message?: string }
            setErrorMessage(error.message || 'Không thể tải xuống tệp minh chứng.')
        } finally {
            setDownloadingAttId(null)
        }
    }

    // Format ngày giờ
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
            const [y, m, d] = dateStr.slice(0, 10).split('-')
            return `${d}/${m}/${y}`
        } catch {
            return dateStr
        }
    }

    const formatFileSize = (bytes?: number): string => {
        if (!bytes || bytes <= 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
    }

    return (
        <div className="instructor-absence-container" data-testid="instructor-absence-page">
            {/* Header Section */}
            <div className="absence-header-section">
                <div className="absence-header-title">
                    <h1>Xét duyệt đơn xin phép vắng</h1>
                    <p>Xem xét, phê duyệt hoặc từ chối các đơn xin nghỉ phép buổi học của học viên trong phạm vi được phân công.</p>
                </div>
            </div>

            {/* Thông báo Toast */}
            <ToastPortal
                error={errorMessage}
                success={successMessage}
                onCloseError={() => setErrorMessage(null)}
                onCloseSuccess={() => setSuccessMessage(null)}
                errorTestId="error-banner"
                successTestId="success-banner"
            />

            {/* Filter Card */}
            <div className="absence-filter-card">
                <div className="status-tabs" role="tablist">
                    {[
                        { key: 'pending', label: 'Chờ duyệt' },
                        { key: 'approved', label: 'Đã duyệt' },
                        { key: 'rejected', label: 'Từ chối' },
                        { key: 'all', label: 'Tất cả' },
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
                            data-testid={`filter-tab-${tab.key}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="absence-search-box">
                    <input
                        type="text"
                        placeholder="Tìm học viên, lớp, môn, lý do..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        data-testid="search-input"
                    />
                    {searchKeyword && (
                        <button
                            type="button"
                            className="search-clear-btn"
                            onClick={() => setSearchKeyword('')}
                            title="Xóa tìm kiếm"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Table Card */}
            <div className="absence-table-card">
                {isLoading ? (
                    <div className="loading-state-box" data-testid="loading-state">
                        <div className="spinner" />
                        <p>Đang tải danh sách đơn cần xét duyệt...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="empty-state-box" data-testid="empty-state">
                        <div className="empty-state-icon">📝</div>
                        <h3>Không có đơn xin phép vắng nào</h3>
                        <p>
                            {searchKeyword || statusFilter !== 'all'
                                ? 'Không tìm thấy đơn nào phù hợp với bộ lọc hiện tại.'
                                : 'Hiện tại chưa có đơn xin phép vắng nào cần xử lý.'}
                        </p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="absence-table" data-testid="absence-reviewer-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 50 }}>STT</th>
                                    <th>Học viên</th>
                                    <th>Môn học & Lớp</th>
                                    <th>Buổi học</th>
                                    <th>Lý do xin phép</th>
                                    <th style={{ width: 120 }}>Trạng thái</th>
                                    <th style={{ width: 130 }}>Thời điểm gửi</th>
                                    <th style={{ width: 110, textAlign: 'center' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((item, idx) => (
                                    <tr key={item.id} data-testid={`request-row-${item.id}`}>
                                        <td style={{ color: '#64748b', fontSize: 13 }}>
                                            {(page - 1) * limit + idx + 1}
                                        </td>
                                        <td>
                                            <div className="student-info-cell">
                                                <span className="student-name-text">{item.student_name}</span>
                                                <span className="student-code-text">{item.student_code}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="session-info-cell">
                                                <span className="session-title">
                                                    {item.subject_name}
                                                </span>
                                                <span className="session-meta-sub">
                                                    Lớp: {item.class_code}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="session-info-cell">
                                                <span style={{ fontWeight: 600 }}>
                                                    Buổi #{item.session_number}: {formatDateOnly(item.learning_date)}
                                                </span>
                                                <span className="session-meta-sub">
                                                    {formatSessionShiftAndTime(item.shift, item.start_time, item.end_time)}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="reason-text-cell" title={item.reason}>
                                                {item.reason.length > 70 ? `${item.reason.slice(0, 70)}...` : item.reason}
                                            </div>
                                            {item.attachment_count && item.attachment_count > 0 ? (
                                                <div className="attachment-count-badge" data-testid={`att-badge-${item.id}`}>
                                                    📎 {item.attachment_count} minh chứng
                                                </div>
                                            ) : null}
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
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                className="btn-action-review"
                                                onClick={() => handleOpenReviewModal(item.id)}
                                                data-testid={`review-btn-${item.id}`}
                                            >
                                                {item.status === 'pending' ? 'Xem & Duyệt' : 'Xem chi tiết'}
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

            {/* Modal Chi tiết và Xét duyệt đơn */}
            {(selectedRequest || isLoadingDetail) && (
                <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="review-absence-modal">
                    <div className="modal-dialog-card">
                        <div className="modal-dialog-header">
                            <h2>
                                {selectedRequest?.status === 'pending' ? 'Xét duyệt đơn xin phép vắng' : 'Chi tiết đơn xin phép vắng'}
                            </h2>
                            <button className="modal-close-btn" onClick={handleCloseReviewModal} title="Đóng">✕</button>
                        </div>
                        <div className="modal-dialog-body">
                            {isLoadingDetail ? (
                                <p>Đang tải thông tin chi tiết đơn...</p>
                            ) : selectedRequest ? (
                                <div className="detail-grid">
                                    <div>
                                        <div className="detail-item-label">Học viên</div>
                                        <div className="detail-item-value">
                                            {selectedRequest.student_name} ({selectedRequest.student_code})
                                        </div>
                                    </div>
                                    <div>
                                        <div className="detail-item-label">Môn học & Lớp</div>
                                        <div className="detail-item-value">
                                            {selectedRequest.subject_name} ({selectedRequest.class_code})
                                        </div>
                                    </div>
                                    <div>
                                        <div className="detail-item-label">Buổi học</div>
                                        <div className="detail-item-value">
                                            <strong>Buổi #{selectedRequest.session_number}:</strong> {selectedRequest.topic || 'Không có chủ đề'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="detail-item-label">Thời gian & Phòng học</div>
                                        <div className="detail-item-value">
                                            {formatDateOnly(selectedRequest.learning_date)} • {formatSessionShiftAndTime(selectedRequest.shift, selectedRequest.start_time, selectedRequest.end_time)} ({selectedRequest.room_name || 'Chưa xếp phòng'})
                                        </div>
                                    </div>
                                    <div>
                                        <div className="detail-item-label">Trạng thái hiện tại</div>
                                        <div className="detail-item-value">
                                            <span className={`status-badge ${selectedRequest.status}`}>
                                                {selectedRequest.status_label}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="detail-item-label">Thời điểm gửi đơn</div>
                                        <div className="detail-item-value">
                                            {formatDateTime(selectedRequest.created_at)}
                                        </div>
                                    </div>

                                    {/* Lý do xin phép vắng */}
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <div className="detail-item-label">Lý do xin phép vắng</div>
                                        <div
                                            className="detail-item-value"
                                            style={{
                                                fontWeight: 400,
                                                whiteSpace: 'pre-wrap',
                                                background: '#f8fafc',
                                                padding: '10px 14px',
                                                borderRadius: 8,
                                                border: '1px solid #e2e8f0',
                                            }}
                                            data-testid="request-reason-text"
                                        >
                                            {selectedRequest.reason}
                                        </div>
                                    </div>

                                    {/* Tệp minh chứng đính kèm */}
                                    {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                                        <div className="detail-attachments-box" data-testid="detail-attachments-section">
                                            <div className="detail-item-label">
                                                Tệp minh chứng đính kèm ({selectedRequest.attachments.length})
                                            </div>
                                            <div className="attachment-cards-grid">
                                                {selectedRequest.attachments.map((att) => (
                                                    <div key={att.id} className="attachment-download-card" data-testid={`attachment-card-${att.id}`}>
                                                        <div className="file-info-col">
                                                            <span style={{ fontSize: 16 }}>{att.mime_type?.includes('pdf') ? '📄' : '🖼️'}</span>
                                                            <div>
                                                                <div className="file-name-text" title={att.file_name}>{att.file_name}</div>
                                                                <div className="file-size-text">{formatFileSize(att.file_size)}</div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="btn-download-file"
                                                            disabled={downloadingAttId === att.id}
                                                            onClick={() => handleDownloadAttachment(selectedRequest.id, att.id, att.file_name)}
                                                            data-testid={`download-att-btn-${att.id}`}
                                                        >
                                                            {downloadingAttId === att.id ? 'Đang tải...' : 'Tải / Xem'}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Kết quả xét duyệt trước đó (nếu đã xử lý) */}
                                    {selectedRequest.status !== 'pending' && (
                                        <div style={{ gridColumn: 'span 2', borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                                            <div className="detail-item-label">Thông tin xét duyệt</div>
                                            <div style={{ fontSize: 13, marginTop: 4 }}>
                                                Người xử lý: <strong>{selectedRequest.reviewer_name || 'Giảng viên'}</strong> ({selectedRequest.reviewer_email || '—'})
                                                <br />
                                                Thời điểm: {formatDateTime(selectedRequest.reviewed_at)}
                                                {selectedRequest.status === 'rejected' && (
                                                    <div style={{ marginTop: 6, color: '#b91c1c' }}>
                                                        Lý do từ chối: <strong>{selectedRequest.rejection_reason || 'Không nêu lý do'}</strong>
                                                    </div>
                                                )}
                                                {selectedRequest.status === 'approved' && (
                                                    <div style={{ marginTop: 6, color: '#15803d' }}>
                                                        ✓ Đã cập nhật trạng thái điểm danh buổi học thành <strong>Vắng có phép</strong>.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Khu vực thao tác Duyệt / Từ chối (Khi đang Pending) */}
                                    {selectedRequest.status === 'pending' && (
                                        <div className="review-actions-box" data-testid="review-actions-section">
                                            <div className="detail-item-label" style={{ fontWeight: 600, color: '#0f172a' }}>
                                                Hành động xét duyệt:
                                            </div>

                                            {!showRejectForm ? (
                                                <div className="review-btn-row">
                                                    <button
                                                        type="button"
                                                        className="btn-approve-action"
                                                        disabled={isReviewing}
                                                        onClick={handleApproveRequest}
                                                        data-testid="approve-absence-btn"
                                                    >
                                                        ✓ Phê duyệt đơn
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-reject-action"
                                                        disabled={isReviewing}
                                                        onClick={() => {
                                                            setShowRejectForm(true)
                                                            setRejectionError(null)
                                                        }}
                                                        data-testid="reject-absence-btn"
                                                    >
                                                        ✕ Từ chối đơn
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="rejection-input-group" data-testid="rejection-form">
                                                    <label htmlFor="rejection-reason" style={{ fontSize: 13, fontWeight: 600, color: '#991b1b' }}>
                                                        Lý do từ chối đơn <span style={{ color: '#dc2626' }}>*</span>
                                                    </label>
                                                    <textarea
                                                        id="rejection-reason"
                                                        ref={rejectionInputRef}
                                                        rows={3}
                                                        className="rejection-textarea"
                                                        placeholder="Nhập lý do từ chối cụ thể để thông báo cho học viên (tối thiểu 3 ký tự)..."
                                                        value={rejectionReason}
                                                        maxLength={1000}
                                                        onChange={(e) => {
                                                            setRejectionReason(e.target.value)
                                                            if (rejectionError) setRejectionError(null)
                                                        }}
                                                        data-testid="rejection-reason-textarea"
                                                    />
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        {rejectionError ? (
                                                            <span className="rejection-error-msg" data-testid="rejection-error-msg">
                                                                {rejectionError}
                                                            </span>
                                                        ) : <span />}
                                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                                            {rejectionReason.length} / 1000 ký tự
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                                        <button
                                                            type="button"
                                                            className="btn-reject-action"
                                                            disabled={isReviewing}
                                                            onClick={handleConfirmReject}
                                                            data-testid="confirm-reject-btn"
                                                        >
                                                            {isReviewing ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-cancel"
                                                            disabled={isReviewing}
                                                            onClick={() => {
                                                                setShowRejectForm(false)
                                                                setRejectionReason('')
                                                                setRejectionError(null)
                                                            }}
                                                            data-testid="cancel-reject-btn"
                                                        >
                                                            Hủy
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                        <div className="modal-dialog-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={handleCloseReviewModal}
                                disabled={isReviewing}
                                data-testid="close-review-modal-btn"
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
