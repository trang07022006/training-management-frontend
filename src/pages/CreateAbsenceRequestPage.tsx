import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    type ClassFilterOption,
    type EligibleSessionItem,
    type SubjectFilterOption,
    getEligibleSessionsPaginated,
    submitAbsenceRequest,
} from '../api/absenceRequestApi'
import { formatSessionShiftAndTime } from '../utils/scheduleDisplayUtils'
import './CreateAbsenceRequestPage.css'

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILE_COUNT = 5

export const CreateAbsenceRequestPage: React.FC = () => {
    const { request } = useSession()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    // Query param ban đầu nếu có ?scheduleId=
    const initialScheduleId = searchParams.get('scheduleId') || ''

    // State Buổi học đã chọn (độc lập với danh sách đang xem)
    const [selectedSession, setSelectedSession] = useState<EligibleSessionItem | null>(null)

    // State Tìm kiếm & Bộ lọc
    const [searchKeyword, setSearchKeyword] = useState<string>('')
    const [debouncedKeyword, setDebouncedKeyword] = useState<string>('')
    const [selectedClassId, setSelectedClassId] = useState<string>('')
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
    const [fromDate, setFromDate] = useState<string>('')
    const [toDate, setToDate] = useState<string>('')

    // State Phân trang & Dữ liệu buổi học
    const [sessions, setSessions] = useState<EligibleSessionItem[]>([])
    const [page, setPage] = useState<number>(1)
    const [limit, setLimit] = useState<number>(10)
    const [totalItems, setTotalItems] = useState<number>(0)
    const [totalPages, setTotalPages] = useState<number>(1)
    const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true)
    const [sessionError, setSessionError] = useState<string | null>(null)
    const [filterOptions, setFilterOptions] = useState<{
        classes: ClassFilterOption[]
        subjects: SubjectFilterOption[]
    }>({ classes: [], subjects: [] })

    // Ref để chống race condition tìm kiếm
    const fetchRequestIdRef = useRef<number>(0)

    // State Form nội dung đơn
    const [reasonText, setReasonText] = useState<string>('')
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [fileError, setFileError] = useState<string | null>(null)
    const [formErrors, setFormErrors] = useState<{ session?: string; reason?: string }>({})
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null)

    // Refs để scroll to error
    const sessionSectionRef = useRef<HTMLDivElement>(null)
    const reasonSectionRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Debounce tìm kiếm 300ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedKeyword(searchKeyword)
            setPage(1)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchKeyword])

    // Load danh sách buổi học hợp lệ từ backend có phân trang & lọc
    const loadSessions = useCallback(async () => {
        const currentRequestId = ++fetchRequestIdRef.current
        setIsLoadingSessions(true)
        setSessionError(null)

        try {
            const res = await getEligibleSessionsPaginated(request, {
                page,
                limit,
                q: debouncedKeyword,
                class_id: selectedClassId || undefined,
                subject_id: selectedSubjectId || undefined,
                from_date: fromDate || undefined,
                to_date: toDate || undefined,
            })

            // Chỉ cập nhật nếu là request mới nhất
            if (currentRequestId === fetchRequestIdRef.current) {
                setSessions(res.items || [])
                setTotalItems(res.pagination?.total_items || 0)
                setTotalPages(res.pagination?.total_pages || 1)

                // Cập nhật filter options nếu có
                if (res.filter_options) {
                    setFilterOptions({
                        classes: res.filter_options.classes || [],
                        subjects: res.filter_options.subjects || [],
                    })
                }

                // Nếu có initialScheduleId và chưa chọn buổi học, tự động tìm và chọn
                if (initialScheduleId && !selectedSession) {
                    const match = res.items.find((s) => s.schedule_id === initialScheduleId)
                    if (match && !match.has_approved_request && !match.has_pending_request && match.latest_request_status !== 'approved' && match.latest_request_status !== 'pending') {
                        setSelectedSession(match)
                    }
                }
            }
        } catch (err: unknown) {
            if (currentRequestId === fetchRequestIdRef.current) {
                const error = err as { message?: string }
                setSessionError(error.message || 'Không thể tải danh sách buổi học.')
            }
        } finally {
            if (currentRequestId === fetchRequestIdRef.current) {
                setIsLoadingSessions(false)
            }
        }
    }, [request, page, limit, debouncedKeyword, selectedClassId, selectedSubjectId, fromDate, toDate, initialScheduleId, selectedSession])

    useEffect(() => {
        loadSessions()
    }, [loadSessions])

    // Reset bộ lọc
    const handleResetFilters = () => {
        setSearchKeyword('')
        setDebouncedKeyword('')
        setSelectedClassId('')
        setSelectedSubjectId('')
        setFromDate('')
        setToDate('')
        setPage(1)
    }

    // Chọn một buổi học
    const handleSelectSession = (session: EligibleSessionItem) => {
        if (session.has_approved_request || session.has_pending_request || session.latest_request_status === 'approved' || session.latest_request_status === 'pending') {
            return
        }
        setSelectedSession(session)
        if (formErrors.session) {
            setFormErrors((prev) => ({ ...prev, session: undefined }))
        }
        if (submitErrorMessage) {
            setSubmitErrorMessage(null)
        }
    }

    // Cuộn tới danh sách chọn buổi khi bấm Đổi buổi
    const handleScrollToSessionList = () => {
        sessionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    // Xử lý chọn tệp đính kèm
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        setFileError(null)

        if (selectedFiles.length + files.length > MAX_FILE_COUNT) {
            setFileError(`Chỉ được đính kèm tối đa ${MAX_FILE_COUNT} tệp minh chứng.`)
            return
        }

        const validFiles: File[] = []
        for (const file of files) {
            const ext = file.name.split('.').pop()?.toLowerCase() || ''
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                setFileError(`Tệp "${file.name}" không hợp lệ. Chỉ chấp nhận JPG, JPEG, PNG, WEBP, PDF.`)
                return
            }
            if (file.size > MAX_FILE_SIZE) {
                setFileError(`Tệp "${file.name}" vượt quá dung lượng tối đa 5MB.`)
                return
            }
            validFiles.push(file)
        }

        setSelectedFiles((prev) => [...prev, ...validFiles])
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // Xóa một tệp đã chọn
    const handleRemoveFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index))
    }

    // Format dung lượng tệp
    const formatFileSize = (bytes?: number): string => {
        if (!bytes || bytes <= 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
    }

    // Format ngày hiển thị DD/MM/YYYY
    const formatDateOnly = (dateStr?: string | null): string => {
        if (!dateStr) return '—'
        try {
            const [y, m, d] = dateStr.slice(0, 10).split('-')
            return `${d}/${m}/${y}`
        } catch {
            return dateStr
        }
    }

    // Xử lý gửi đơn
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitErrorMessage(null)

        const errors: { session?: string; reason?: string } = {}

        if (!selectedSession) {
            errors.session = 'Vui lòng chọn một buổi học cần xin phép vắng.'
        }

        const cleanReason = reasonText.trim()
        if (!cleanReason) {
            errors.reason = 'Vui lòng nhập lý do xin phép vắng.'
        } else if (cleanReason.length < 5) {
            errors.reason = 'Lý do xin phép vắng phải có ít nhất 5 ký tự.'
        } else if (cleanReason.length > 1000) {
            errors.reason = 'Lý do xin phép vắng không được vượt quá 1000 ký tự.'
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors)
            if (errors.session) {
                sessionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            } else if (errors.reason) {
                reasonSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
            return
        }

        setIsSubmitting(true)

        try {
            let payload: { schedule_id: string; reason: string } | FormData

            if (selectedFiles.length > 0) {
                const formData = new FormData()
                formData.append('schedule_id', selectedSession!.schedule_id)
                formData.append('reason', cleanReason)
                selectedFiles.forEach((file) => {
                    formData.append('files', file)
                })
                payload = formData
            } else {
                payload = {
                    schedule_id: selectedSession!.schedule_id,
                    reason: cleanReason,
                }
            }

            await submitAbsenceRequest(request, payload)
            // Chuyển hướng về trang danh sách có kèm trạng thái thành công
            navigate('/my-absence-requests?success=1')
        } catch (err: unknown) {
            const error = err as { code?: string; message?: string }
            let msg = error.message || 'Không thể gửi đơn xin phép vắng.'

            if (error.code === 'DUPLICATE_APPROVED_REQUEST') {
                msg = 'Buổi học này đã có đơn xin nghỉ được duyệt trước đó. Không thể gửi thêm đơn mới.'
            } else if (error.code === 'DUPLICATE_PENDING_REQUEST') {
                msg = 'Buổi học này đã có đơn đang chờ giảng viên duyệt. Vui lòng chờ kết quả.'
            } else if (error.code === 'REQUEST_WINDOW_EXPIRED') {
                msg = 'Đã quá thời hạn 48 giờ sau khi kết thúc buổi học. Không thể nộp đơn xin nghỉ.'
            }

            setSubmitErrorMessage(msg)
            // Scroll đến thông báo lỗi
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Hủy bỏ và quay lại danh sách
    const handleCancel = () => {
        if (selectedSession || reasonText.trim().length > 0 || selectedFiles.length > 0) {
            const confirmLeave = window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn rời khỏi trang này?')
            if (!confirmLeave) return
        }
        navigate('/my-absence-requests')
    }

    // Kiểm tra buổi đã chọn có nằm trong danh sách hiện tại không
    const isSelectedInCurrentView = selectedSession
        ? sessions.some((s) => s.schedule_id === selectedSession.schedule_id)
        : true

    return (
        <div className="create-absence-page-container" data-testid="create-absence-page">
            {/* Breadcrumb & Navigation */}
            <div className="create-absence-nav-bar">
                <button
                    type="button"
                    className="btn-back-nav"
                    onClick={handleCancel}
                    data-testid="back-to-list-btn"
                >
                    ← Quay lại danh sách đơn
                </button>
                <div className="breadcrumb-path">
                    <span>Đơn xin phép vắng</span> / <strong style={{ color: '#0f172a' }}>Tạo đơn mới</strong>
                </div>
            </div>

            {/* Page Header */}
            <div className="create-absence-header">
                <h1>Gửi đơn xin phép vắng</h1>
                <p>Chọn buổi học cần xin nghỉ và cung cấp lý do, minh chứng đính kèm để gửi giảng viên xét duyệt.</p>
            </div>

            {/* Submit Global Error */}
            {submitErrorMessage && (
                <div className="alert-box error" data-testid="submit-error-banner">
                    <span className="alert-icon">⚠️</span>
                    <div className="alert-content">
                        <strong>Không thể gửi đơn:</strong> {submitErrorMessage}
                    </div>
                </div>
            )}

            {/* Khối Tóm tắt Buổi học đã chọn */}
            <div className="selected-session-card-wrapper" data-testid="selected-session-summary">
                {selectedSession ? (
                    <div className="selected-session-card active">
                        <div className="selected-session-header">
                            <div className="selected-session-title">
                                <span className="badge-selected-tag">✓ Buổi học đã chọn</span>
                                <h3>[{selectedSession.class_code}] {selectedSession.subject_name}</h3>
                            </div>
                            <button
                                type="button"
                                className="btn-change-session"
                                onClick={handleScrollToSessionList}
                                data-testid="change-session-btn"
                            >
                                Đổi buổi khác
                            </button>
                        </div>
                        <div className="selected-session-details-grid">
                            <div className="detail-item">
                                <span className="detail-label">Buổi & Chủ đề</span>
                                <span className="detail-value">
                                    <strong>Buổi #{selectedSession.session_number}:</strong> {selectedSession.topic || 'Không có chủ đề'}
                                </span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Ngày & Giờ học</span>
                                <span className="detail-value">
                                    {formatDateOnly(selectedSession.learning_date)} • {formatSessionShiftAndTime(selectedSession.shift, selectedSession.start_time, selectedSession.end_time)}
                                </span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Phòng học / Giảng viên</span>
                                <span className="detail-value">
                                    {selectedSession.room_name || 'Chưa xếp phòng'} • {selectedSession.instructor_name || 'Chưa phân công'}
                                </span>
                            </div>
                        </div>

                        {!isSelectedInCurrentView && (
                            <div className="outside-filter-notice" data-testid="outside-filter-notice">
                                ℹ️ Buổi học đã chọn hiện nằm ngoài kết quả lọc bên dưới nhưng vẫn được lưu cho đơn này.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`selected-session-card placeholder ${formErrors.session ? 'has-error' : ''}`}>
                        <div className="placeholder-icon">📅</div>
                        <div className="placeholder-text">
                            <strong>Chưa chọn buổi học</strong>
                            <span>Vui lòng tích chọn một buổi học từ danh sách bên dưới trước khi gửi đơn.</span>
                        </div>
                    </div>
                )}
                {formErrors.session && (
                    <div className="field-error-text" style={{ marginTop: 6 }} data-testid="session-error">
                        {formErrors.session}
                    </div>
                )}
            </div>

            {/* Phần Chọn Buổi học */}
            <div className="sessions-picker-section" ref={sessionSectionRef} data-testid="sessions-picker-section">
                <div className="section-title-row">
                    <h2>1. Chọn buổi học xin phép vắng <span className="required-star">*</span></h2>
                    <span className="section-hint">Buổi học phải trong tương lai hoặc chưa quá 48 giờ sau kết thúc.</span>
                </div>

                {/* Thanh tìm kiếm và Bộ lọc */}
                <div className="filters-container-card">
                    <div className="filters-main-row">
                        {/* Keyword Search */}
                        <div className="filter-field search-keyword-field">
                            <label htmlFor="search-session-input">Tìm kiếm buổi học</label>
                            <div className="search-input-wrapper">
                                <input
                                    id="search-session-input"
                                    type="text"
                                    placeholder="Tìm theo mã/tên lớp, môn học, chủ đề..."
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    data-testid="search-sessions-input"
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

                        {/* Filter Lớp */}
                        <div className="filter-field">
                            <label htmlFor="filter-class-select">Lọc theo lớp</label>
                            <select
                                id="filter-class-select"
                                value={selectedClassId}
                                onChange={(e) => {
                                    setSelectedClassId(e.target.value)
                                    setPage(1)
                                }}
                                data-testid="filter-class-select"
                            >
                                <option value="">Tất cả các lớp</option>
                                {filterOptions.classes.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.class_code}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Filter Môn */}
                        <div className="filter-field">
                            <label htmlFor="filter-subject-select">Lọc theo môn</label>
                            <select
                                id="filter-subject-select"
                                value={selectedSubjectId}
                                onChange={(e) => {
                                    setSelectedSubjectId(e.target.value)
                                    setPage(1)
                                }}
                                data-testid="filter-subject-select"
                            >
                                <option value="">Tất cả các môn</option>
                                {filterOptions.subjects.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.label || s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="filters-secondary-row">
                        {/* Từ ngày */}
                        <div className="filter-field date-field">
                            <label htmlFor="filter-from-date">Từ ngày</label>
                            <input
                                id="filter-from-date"
                                type="date"
                                value={fromDate}
                                onChange={(e) => {
                                    setFromDate(e.target.value)
                                    setPage(1)
                                }}
                                data-testid="filter-from-date"
                            />
                        </div>

                        {/* Đến ngày */}
                        <div className="filter-field date-field">
                            <label htmlFor="filter-to-date">Đến ngày</label>
                            <input
                                id="filter-to-date"
                                type="date"
                                value={toDate}
                                onChange={(e) => {
                                    setToDate(e.target.value)
                                    setPage(1)
                                }}
                                data-testid="filter-to-date"
                            />
                        </div>

                        {/* Nút Xóa bộ lọc */}
                        {(searchKeyword || selectedClassId || selectedSubjectId || fromDate || toDate) && (
                            <button
                                type="button"
                                className="btn-reset-filters"
                                onClick={handleResetFilters}
                                data-testid="reset-filters-btn"
                            >
                                ✕ Xóa bộ lọc
                            </button>
                        )}
                    </div>
                </div>

                {/* Danh sách buổi học: Desktop Table & Mobile Cards */}
                <div className="sessions-table-wrapper">
                    {isLoadingSessions ? (
                        <div className="sessions-loading-state" data-testid="sessions-loading">
                            <div className="spinner" />
                            <p>Đang tải danh sách buổi học hợp lệ...</p>
                        </div>
                    ) : sessionError ? (
                        <div className="sessions-error-state" data-testid="sessions-error">
                            <p className="error-msg">⚠️ {sessionError}</p>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={loadSessions}
                                data-testid="retry-sessions-btn"
                            >
                                Thử lại
                            </button>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="sessions-empty-state" data-testid="sessions-empty">
                            <div className="empty-icon">🔍</div>
                            <h3>Không tìm thấy buổi học nào</h3>
                            <p>
                                {searchKeyword || selectedClassId || selectedSubjectId || fromDate || toDate
                                    ? 'Không có buổi học nào khớp với các tiêu chí tìm kiếm hoặc bộ lọc hiện tại.'
                                    : 'Hiện bạn không có buổi học nào đủ điều kiện xin nghỉ (trong vòng 48 giờ sau kết thúc hoặc sắp diễn ra).'}
                            </p>
                            {(searchKeyword || selectedClassId || selectedSubjectId || fromDate || toDate) && (
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleResetFilters}
                                >
                                    Xóa bộ lọc để xem tất cả
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <table className="sessions-desktop-table" data-testid="sessions-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 80, textAlign: 'center' }}>Lựa chọn</th>
                                        <th style={{ width: 170 }}>Ngày, giờ</th>
                                        <th style={{ width: 120 }}>Lớp</th>
                                        <th style={{ minWidth: 160 }}>Môn học</th>
                                        <th style={{ minWidth: 200 }}>Buổi, chủ đề</th>
                                        <th style={{ width: 140 }}>Trạng thái đơn</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((item) => {
                                        const isSelected = selectedSession?.schedule_id === item.schedule_id
                                        const isApproved = Boolean(item.has_approved_request || item.latest_request_status === 'approved')
                                        const isPending = Boolean(item.has_pending_request || item.latest_request_status === 'pending')
                                        const isRejected = item.latest_request_status === 'rejected'
                                        const isDisabled = isApproved || isPending

                                        return (
                                            <tr
                                                key={item.schedule_id}
                                                className={`session-row ${isSelected ? 'row-selected' : ''} ${isDisabled ? 'row-disabled' : ''}`}
                                                onClick={() => !isDisabled && handleSelectSession(item)}
                                                data-testid={`session-row-${item.schedule_id}`}
                                            >
                                                <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="radio"
                                                        name="selected_session"
                                                        checked={isSelected}
                                                        disabled={isDisabled}
                                                        onChange={() => handleSelectSession(item)}
                                                        data-testid={`radio-session-${item.schedule_id}`}
                                                    />
                                                </td>
                                                <td>
                                                    <div className="cell-date-time">
                                                        <span className="learning-date">{formatDateOnly(item.learning_date)}</span>
                                                        <span className="learning-time">
                                                            {formatSessionShiftAndTime(item.shift, item.start_time, item.end_time)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="class-code-badge">{item.class_code}</span>
                                                </td>
                                                <td>
                                                    <div className="subject-cell-content">
                                                        <span className="subject-name">{item.subject_name}</span>
                                                        {item.subject_code && (
                                                            <span className="subject-code-sub">{item.subject_code}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="topic-cell-content">
                                                        <span className="session-number-tag">Buổi #{item.session_number}</span>
                                                        <span className="session-topic-title" title={item.topic}>
                                                            {item.topic || 'Không có chủ đề'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {isApproved ? (
                                                        <span className="status-badge approved" data-testid={`status-${item.schedule_id}`}>
                                                            Đã duyệt
                                                        </span>
                                                    ) : isPending ? (
                                                        <span className="status-badge pending" data-testid={`status-${item.schedule_id}`}>
                                                            Chờ duyệt
                                                        </span>
                                                    ) : isRejected ? (
                                                        <span className="status-badge rejected" data-testid={`status-${item.schedule_id}`}>
                                                            Từ chối (gửi lại)
                                                        </span>
                                                    ) : (
                                                        <span className="status-badge ready" data-testid={`status-${item.schedule_id}`}>
                                                            Chưa gửi
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>

                            {/* Mobile Card View (360-390px) */}
                            <div className="sessions-mobile-cards" data-testid="sessions-mobile-cards">
                                {sessions.map((item) => {
                                    const isSelected = selectedSession?.schedule_id === item.schedule_id
                                    const isApproved = Boolean(item.has_approved_request || item.latest_request_status === 'approved')
                                    const isPending = Boolean(item.has_pending_request || item.latest_request_status === 'pending')
                                    const isRejected = item.latest_request_status === 'rejected'
                                    const isDisabled = isApproved || isPending

                                    return (
                                        <div
                                            key={item.schedule_id}
                                            className={`mobile-session-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                            data-testid={`mobile-card-${item.schedule_id}`}
                                        >
                                            <div className="mobile-card-header">
                                                <div className="mobile-card-class-info">
                                                    <span className="class-code-badge">{item.class_code}</span>
                                                    <span className="mobile-subject-name">{item.subject_name}</span>
                                                </div>
                                                {isApproved ? (
                                                    <span className="status-badge approved">Đã duyệt</span>
                                                ) : isPending ? (
                                                    <span className="status-badge pending">Chờ duyệt</span>
                                                ) : isRejected ? (
                                                    <span className="status-badge rejected">Từ chối</span>
                                                ) : (
                                                    <span className="status-badge ready">Chưa gửi</span>
                                                )}
                                            </div>

                                            <div className="mobile-card-body">
                                                <div className="mobile-detail-row">
                                                    <span className="mobile-row-label">Buổi học:</span>
                                                    <span className="mobile-row-val">
                                                        <strong>Buổi #{item.session_number}:</strong> {item.topic || 'Không có chủ đề'}
                                                    </span>
                                                </div>
                                                <div className="mobile-detail-row">
                                                    <span className="mobile-row-label">Thời gian:</span>
                                                    <span className="mobile-row-val">
                                                        {formatDateOnly(item.learning_date)} • {formatSessionShiftAndTime(item.shift, item.start_time, item.end_time)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mobile-card-footer">
                                                <button
                                                    type="button"
                                                    className={`btn-mobile-select ${isSelected ? 'btn-selected' : 'btn-outline'}`}
                                                    disabled={isDisabled}
                                                    onClick={() => handleSelectSession(item)}
                                                    data-testid={`mobile-select-btn-${item.schedule_id}`}
                                                >
                                                    {isSelected ? '✓ Đã chọn buổi này' : isDisabled ? 'Không thể chọn' : 'Chọn buổi này'}
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Pagination Controls */}
                            <div className="sessions-pagination-bar" data-testid="sessions-pagination">
                                <div className="pagination-info">
                                    Đang xem <strong>{(page - 1) * limit + 1}</strong> – <strong>{Math.min(page * limit, totalItems)}</strong> trong tổng số <strong>{totalItems}</strong> buổi học
                                </div>
                                <div className="pagination-controls-group">
                                    <label className="page-size-label">
                                        Hiển thị:
                                        <select
                                            className="select-page-size"
                                            value={limit}
                                            onChange={(e) => {
                                                setLimit(Number(e.target.value))
                                                setPage(1)
                                            }}
                                            data-testid="page-size-select"
                                        >
                                            <option value={10}>10 / trang</option>
                                            <option value={20}>20 / trang</option>
                                        </select>
                                    </label>

                                    <button
                                        type="button"
                                        className="pagination-nav-btn"
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                        data-testid="prev-page-btn"
                                    >
                                        Trước
                                    </button>

                                    <span className="current-page-indicator">
                                        Trang {page} / {totalPages}
                                    </span>

                                    <button
                                        type="button"
                                        className="pagination-nav-btn"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                                        data-testid="next-page-btn"
                                    >
                                        Sau
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Form Lý do & Minh chứng */}
            <form onSubmit={handleSubmit} noValidate className="absence-reason-form-card" data-testid="absence-form">
                <h2>2. Thông tin xin phép vắng</h2>

                {/* Lý do xin nghỉ */}
                <div className="form-field-wrapper" ref={reasonSectionRef}>
                    <label htmlFor="reason-textarea" className="form-field-label">
                        Lý do xin phép vắng <span className="required-star">*</span>
                    </label>
                    <textarea
                        id="reason-textarea"
                        rows={4}
                        placeholder="Nhập lý do chi tiết xin phép vắng học (tối thiểu 5 ký tự, tối đa 1000 ký tự)..."
                        value={reasonText}
                        onChange={(e) => {
                            setReasonText(e.target.value)
                            if (formErrors.reason) {
                                setFormErrors((prev) => ({ ...prev, reason: undefined }))
                            }
                        }}
                        className={`form-textarea-control ${formErrors.reason ? 'input-error' : ''}`}
                        data-testid="reason-input"
                    />
                    <div className="field-footer-row">
                        {formErrors.reason ? (
                            <span className="field-error-text" data-testid="reason-error">
                                {formErrors.reason}
                            </span>
                        ) : (
                            <span className="field-hint">Tối thiểu 5 ký tự, mô tả rõ hoàn cảnh/lý do xin nghỉ.</span>
                        )}
                        <span className="char-counter" style={{ color: reasonText.length > 1000 ? '#b91c1c' : '#64748b' }}>
                            {reasonText.length} / 1000 ký tự
                        </span>
                    </div>
                </div>

                {/* Tệp minh chứng */}
                <div className="form-field-wrapper">
                    <label className="form-field-label">
                        Minh chứng đính kèm <span className="optional-tag">(tùy chọn)</span>
                    </label>
                    <p className="field-hint" style={{ marginTop: 0 }}>
                        Đính kèm đơn viết tay có chữ ký, giấy khám bệnh, xác nhận công tác hoặc lý do khác. Tối đa 5 tệp, mỗi tệp ≤ 5MB (JPG, JPEG, PNG, WEBP, PDF).
                    </p>

                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="file-upload-input"
                        data-testid="file-upload-input"
                    />

                    <button
                        type="button"
                        className="btn-upload-trigger"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={selectedFiles.length >= MAX_FILE_COUNT || isSubmitting}
                        data-testid="select-files-btn"
                    >
                        📁 Chọn tệp minh chứng ({selectedFiles.length}/{MAX_FILE_COUNT})
                    </button>

                    {fileError && (
                        <div className="field-error-text" style={{ marginTop: 6 }} data-testid="file-error">
                            {fileError}
                        </div>
                    )}

                    {selectedFiles.length > 0 && (
                        <div className="files-list-box" data-testid="selected-files-list">
                            {selectedFiles.map((f, idx) => (
                                <div key={`${f.name}-${idx}`} className="file-item-row">
                                    <span className="file-icon">{f.name.endsWith('.pdf') ? '📄' : '🖼️'}</span>
                                    <span className="file-name" title={f.name}>{f.name}</span>
                                    <span className="file-size">({formatFileSize(f.size)})</span>
                                    <button
                                        type="button"
                                        className="btn-remove-file"
                                        onClick={() => handleRemoveFile(idx)}
                                        title="Xóa tệp này"
                                        data-testid={`remove-file-${idx}`}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Form Actions */}
                <div className="form-actions-row">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        data-testid="cancel-btn"
                    >
                        Hủy bỏ
                    </button>

                    <button
                        type="submit"
                        className="btn-submit-absence"
                        disabled={isSubmitting || !selectedSession}
                        data-testid="submit-absence-btn"
                    >
                        {isSubmitting ? 'Đang gửi...' : 'Gửi đơn xin nghỉ'}
                    </button>
                </div>
            </form>
        </div>
    )
}
