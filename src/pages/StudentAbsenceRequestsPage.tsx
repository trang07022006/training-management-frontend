import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    type AbsenceRequestItem,
    type EligibleSessionItem,
    downloadAbsenceAttachment,
    getAbsenceRequestDetail,
    getEligibleSessions,
    getMyAbsenceRequests,
    submitAbsenceRequest,
} from '../api/absenceRequestApi'
import { formatSessionShiftAndTime } from '../utils/scheduleDisplayUtils'
import { ToastPortal } from '../components/ToastPortal'
import './StudentAbsenceRequestsPage.css'

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILE_COUNT = 5

export const StudentAbsenceRequestsPage: React.FC = () => {
    const { request } = useSession()
    const navigate = useNavigate()
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

    // Bắt query param ?success=1
    useEffect(() => {
        if (searchParams.get('success') === '1') {
            setSuccessMessage('Gửi đơn xin phép vắng thành công!')
            searchParams.delete('success')
            setSearchParams(searchParams, { replace: true })
        }
    }, [searchParams, setSearchParams])

    // State Modal Tạo đơn
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false)
    const [eligibleSessions, setEligibleSessions] = useState<EligibleSessionItem[]>([])
    const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false)
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('')
    const [reasonText, setReasonText] = useState<string>('')
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [fileError, setFileError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<{ scheduleId?: string; reason?: string }>({})
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const reasonInputRef = useRef<HTMLTextAreaElement>(null)
    const scheduleSelectRef = useRef<HTMLSelectElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // State Modal Chi tiết đơn
    const [selectedDetail, setSelectedDetail] = useState<AbsenceRequestItem | null>(null)
    const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false)
    const [downloadingAttId, setDownloadingAttId] = useState<string | null>(null)

    // Helper format dung lượng tệp
    const formatFileSize = (bytes?: number): string => {
        if (!bytes || bytes <= 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
    }

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
            searchParams.delete('scheduleId')
            setSearchParams(searchParams, { replace: true })
        }
    }, [searchParams, setSearchParams, loadEligibleSessions])

    // Xử lý mở modal tạo đơn thủ công
    const handleOpenCreateModal = () => {
        setIsCreateModalOpen(true)
        setSelectedScheduleId('')
        setReasonText('')
        setSelectedFiles([])
        setFileError(null)
        setFieldErrors({})
        loadEligibleSessions()
    }

    // Đóng modal tạo đơn có cảnh báo nếu có dữ liệu chưa lưu
    const handleCloseCreateModal = () => {
        if (reasonText.trim().length > 0 || selectedScheduleId || selectedFiles.length > 0) {
            const confirmDiscard = window.confirm('Bạn có nội dung chưa lưu. Bạn có chắc chắn muốn đóng?')
            if (!confirmDiscard) return
        }
        setIsCreateModalOpen(false)
        setSelectedScheduleId('')
        setReasonText('')
        setSelectedFiles([])
        setFileError(null)
        setFieldErrors({})
    }

    // Chọn tệp đính kèm (Lát 2)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError(null)
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        if (selectedFiles.length + files.length > MAX_FILE_COUNT) {
            setFileError(`Số lượng tệp đính kèm tối đa là ${MAX_FILE_COUNT} tệp.`)
            if (fileInputRef.current) fileInputRef.current.value = ''
            return
        }

        for (const file of files) {
            const ext = file.name.split('.').pop()?.toLowerCase() || ''
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                setFileError(`Tệp "${file.name}" không hợp lệ. Chỉ chấp nhận ảnh (JPG, JPEG, PNG, WEBP) hoặc tài liệu PDF.`)
                if (fileInputRef.current) fileInputRef.current.value = ''
                return
            }
            if (file.size === 0) {
                setFileError(`Tệp "${file.name}" không được để trống (0 byte).`)
                if (fileInputRef.current) fileInputRef.current.value = ''
                return
            }
            if (file.size > MAX_FILE_SIZE) {
                setFileError(`Tệp "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá dung lượng tối đa 5MB.`)
                if (fileInputRef.current) fileInputRef.current.value = ''
                return
            }
        }

        setSelectedFiles((prev) => [...prev, ...files])
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    // Xóa một tệp khỏi danh sách chọn
    const handleRemoveFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
        setFileError(null)
    }

    // Submit form gửi đơn (Lát 1 & Lát 2)
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
            if (selectedFiles.length > 0) {
                const formData = new FormData()
                formData.append('schedule_id', selectedScheduleId)
                formData.append('reason', trimmedReason)
                selectedFiles.forEach((file) => formData.append('attachments', file))
                await submitAbsenceRequest(request, formData)
            } else {
                await submitAbsenceRequest(request, {
                    schedule_id: selectedScheduleId,
                    reason: trimmedReason,
                })
            }

            setSuccessMessage('Gửi đơn xin phép vắng thành công. Đơn đang chờ giảng viên xem xét.')
            setIsCreateModalOpen(false)
            setSelectedScheduleId('')
            setReasonText('')
            setSelectedFiles([])
            setFieldErrors({})
            setFileError(null)
            setPage(1)
            loadRequests()
        } catch (err: unknown) {
            const error = err as { message?: string; code?: string }
            if (error.code === 'DUPLICATE_PENDING_REQUEST') {
                setFieldErrors({ scheduleId: 'Buổi học này đã có đơn xin phép vắng đang chờ duyệt.' })
                if (scheduleSelectRef.current) scheduleSelectRef.current.focus()
            } else if (error.code === 'DUPLICATE_APPROVED_REQUEST') {
                setFieldErrors({ scheduleId: 'Buổi học này đã có đơn xin phép vắng được phê duyệt.' })
                if (scheduleSelectRef.current) scheduleSelectRef.current.focus()
            } else if (error.code === 'REASON_TOO_SHORT') {
                setFieldErrors({ reason: 'Lý do xin phép vắng phải có ít nhất 5 ký tự.' })
                if (reasonInputRef.current) reasonInputRef.current.focus()
            } else if (error.code === 'REASON_TOO_LONG') {
                setFieldErrors({ reason: 'Lý do xin phép vắng không được vượt quá 1000 ký tự.' })
                if (reasonInputRef.current) reasonInputRef.current.focus()
            } else if (error.code === 'ATTACHMENT_TOO_LARGE' || error.code === 'INVALID_ATTACHMENT_TYPE' || error.code === 'INVALID_ATTACHMENT_CONTENT' || error.code === 'TOO_MANY_ATTACHMENTS') {
                setFileError(error.message || 'Tệp minh chứng không hợp lệ.')
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

    // Tải xuống minh chứng có xác thực (Lát 2)
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
            const [y, m, d] = dateStr.slice(0, 10).split('-')
            return `${d}/${m}/${y}`
        } catch {
            return dateStr
        }
    }

    return (
        <div className="student-absence-container" data-testid="student-absence-page">
            {/* Header Section */}
            <div className="absence-header-section">
                <div className="absence-header-title">
                    <h1>Đơn xin phép vắng của tôi</h1>
                    <p>Theo dõi tình trạng xét duyệt các đơn xin nghỉ phép buổi học và nộp đơn mới.</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="btn-primary-create"
                        onClick={() => navigate('/my-absence-requests/new')}
                        data-testid="create-absence-page-btn"
                    >
                        <span style={{ fontSize: 16 }}>＋</span> Gửi đơn xin phép vắng
                    </button>
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleOpenCreateModal}
                        data-testid="create-absence-btn"
                        style={{ fontSize: 13, padding: '8px 12px' }}
                        title="Mở nhanh dạng hộp thoại"
                    >
                        ⚡ Mở nhanh
                    </button>
                </div>
            </div>

            {/* Notification Toast */}
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
                            data-testid={`filter-tab-${tab.key}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="absence-search-box">
                    <input
                        type="text"
                        placeholder="Tìm theo môn, lớp hoặc lý do..."
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

            {/* Table Content */}
            <div className="absence-table-card">
                {isLoading ? (
                    <div className="loading-state-box" data-testid="loading-state">
                        <div className="spinner" />
                        <p>Đang tải danh sách đơn xin phép vắng...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="empty-state-box" data-testid="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <h3>Chưa có đơn xin phép vắng nào</h3>
                        <p>
                            {searchKeyword || statusFilter !== 'all'
                                ? 'Không tìm thấy đơn nào phù hợp với bộ lọc hiện tại.'
                                : 'Bạn chưa gửi đơn xin phép vắng nào. Nhấn nút "Xin phép vắng" để tạo đơn mới.'}
                        </p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="absence-table" data-testid="absence-requests-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 60 }}>STT</th>
                                    <th>Môn học & Lớp</th>
                                    <th>Buổi học</th>
                                    <th>Lý do xin phép vắng</th>
                                    <th style={{ width: 130 }}>Trạng thái</th>
                                    <th style={{ width: 140 }}>Thời điểm gửi</th>
                                    <th>Kết quả duyệt</th>
                                    <th style={{ width: 90, textAlign: 'center' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((item, idx) => (
                                    <tr key={item.id} data-testid={`request-row-${item.id}`}>
                                        <td style={{ color: '#64748b', fontSize: 13 }}>
                                            {(page - 1) * limit + idx + 1}
                                        </td>
                                        <td>
                                            <div className="session-info-cell">
                                                <span className="session-title">
                                                    Buổi #{item.session_number}: {item.topic}
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
                                                    {formatSessionShiftAndTime(item.shift, item.start_time, item.end_time)}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="reason-text-cell" title={item.reason}>
                                                {item.reason.length > 80 ? `${item.reason.slice(0, 80)}...` : item.reason}
                                            </div>
                                            {item.attachment_count && item.attachment_count > 0 ? (
                                                <div className="attachment-count-badge" data-testid={`attachment-count-${item.id}`}>
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
                                                    disabled={Boolean(s.has_pending_request || s.has_approved_request || s.latest_request_status === 'pending' || s.latest_request_status === 'approved')}
                                                >
                                                    [{s.class_code}] {s.subject_name} • Buổi #{s.session_number}: {s.topic} • {formatDateOnly(s.learning_date)} ({s.shift || 'Ca học'})
                                                    {s.has_approved_request || s.latest_request_status === 'approved' ? ' (Đã duyệt)' : (s.has_pending_request || s.latest_request_status === 'pending' ? ' (Đang chờ duyệt)' : '')}
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

                                {/* Minh chứng đính kèm (Lát 2) */}
                                <div className="form-field-group">
                                    <label className="form-field-label">
                                        Minh chứng đính kèm <span style={{ fontWeight: 400, color: '#64748b', fontSize: 12 }}>(Tối đa 5 tệp, dung lượng &le; 5MB/tệp: JPG, PNG, WEBP, PDF)</span>
                                    </label>
                                    <div className="file-upload-wrapper">
                                        <input
                                            id="file-attachment-input"
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                                            style={{ display: 'none' }}
                                            onChange={handleFileChange}
                                            data-testid="file-attachment-input"
                                        />
                                        <button
                                            type="button"
                                            className="file-input-trigger"
                                            onClick={() => fileInputRef.current?.click()}
                                            data-testid="choose-files-btn"
                                        >
                                            📎 Chọn tệp đính kèm ({selectedFiles.length}/{MAX_FILE_COUNT})
                                        </button>

                                        {fileError && (
                                            <div className="form-field-error-msg" style={{ marginTop: 6 }} data-testid="file-error-msg">
                                                {fileError}
                                            </div>
                                        )}

                                        {selectedFiles.length > 0 && (
                                            <div className="file-selected-list" data-testid="selected-files-list">
                                                {selectedFiles.map((f, idx) => (
                                                    <div key={`${f.name}-${idx}`} className="file-selected-item">
                                                        <div className="file-info-col">
                                                            <span>{f.name.endsWith('.pdf') ? '📄' : '🖼️'}</span>
                                                            <span className="file-name-text" title={f.name}>{f.name}</span>
                                                            <span className="file-size-text">({formatFileSize(f.size)})</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="btn-remove-selected-file"
                                                            onClick={() => handleRemoveFile(idx)}
                                                            title="Xóa tệp này"
                                                            data-testid={`remove-file-btn-${idx}`}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-dialog-footer">
                                <button
                                    type="button"
                                    className="btn-cancel"
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
                                        <div className="detail-item-value">
                                            <strong>Buổi #{selectedDetail.session_number}:</strong> {selectedDetail.topic || 'Không có chủ đề'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="detail-item-label">Ngày & Giờ học</div>
                                        <div className="detail-item-value">
                                            {formatDateOnly(selectedDetail.learning_date)} • {formatSessionShiftAndTime(selectedDetail.shift, selectedDetail.start_time, selectedDetail.end_time)}
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

                                    {/* Minh chứng đính kèm (Lát 2) */}
                                    {selectedDetail.attachments && selectedDetail.attachments.length > 0 && (
                                        <div className="detail-attachments-box" data-testid="detail-attachments-section">
                                            <div className="detail-item-label">Tệp minh chứng đính kèm ({selectedDetail.attachments.length})</div>
                                            <div className="attachment-cards-grid">
                                                {selectedDetail.attachments.map((att) => (
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
                                                            onClick={() => handleDownloadAttachment(selectedDetail.id, att.id, att.file_name)}
                                                            data-testid={`download-att-btn-${att.id}`}
                                                        >
                                                            {downloadingAttId === att.id ? 'Đang tải...' : 'Tải xuống'}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

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

                                    {selectedDetail.status === 'pending' && (
                                        <div style={{ gridColumn: 'span 2', borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    color: '#92400e',
                                                    background: '#fef3c7',
                                                    padding: '10px 14px',
                                                    borderRadius: 8,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                }}
                                                data-testid="pending-review-notice"
                                            >
                                                <span>⏳</span>
                                                <span>Đơn xin phép vắng đang chờ giảng viên hoặc quản lý đào tạo xem xét. Kết quả sẽ được cập nhật tại đây và gửi thông báo tới bạn.</span>
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
