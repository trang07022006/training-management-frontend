import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    getMyAttendanceHistory,
    type StudentAttendanceHistoryData,
} from '../api/attendanceHistoryApi'
import { getErrorMessage } from '../utils/errorMessages'
import './StudentAttendanceHistoryPage.css'

export function StudentAttendanceHistoryPage() {
    const { request } = useSession()
    const [searchParams, setSearchParams] = useSearchParams()

    const urlClassId = searchParams.get('class_id') || ''
    const [selectedClassId, setSelectedClassId] = useState<string>(urlClassId)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [dateFrom, setDateFrom] = useState<string>('')
    const [dateTo, setDateTo] = useState<string>('')
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [pageSize, setPageSize] = useState<number>(20)
    const [sortOrder] = useState<'desc' | 'asc'>('desc')

    const [data, setData] = useState<StudentAttendanceHistoryData | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Đồng bộ khi urlClassId thay đổi từ ngoài
    useEffect(() => {
        if (urlClassId && urlClassId !== selectedClassId) {
            setSelectedClassId(urlClassId)
            setCurrentPage(1)
        }
    }, [urlClassId])

    const loadHistory = useCallback(async () => {
        if (!request) return
        setIsLoading(true)
        setErrorMessage(null)

        try {
            const res = await getMyAttendanceHistory(request, {
                class_id: selectedClassId || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                page: currentPage,
                page_size: pageSize,
                sort_order: sortOrder,
            })

            setData(res)
            // Nếu ban đầu chưa chọn class_id và API trả về lớp mặc định, cập nhật state
            if (!selectedClassId && res.selected_class_id) {
                setSelectedClassId(res.selected_class_id)
            }
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Không thể tải lịch sử điểm danh. Vui lòng thử lại.'))
        } finally {
            setIsLoading(false)
        }
    }, [request, selectedClassId, statusFilter, dateFrom, dateTo, currentPage, pageSize, sortOrder])

    useEffect(() => {
        loadHistory()
    }, [loadHistory])

    const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newClassId = e.target.value
        setSelectedClassId(newClassId)
        setCurrentPage(1)
        const nextParams = new URLSearchParams(searchParams)
        if (newClassId) {
            nextParams.set('class_id', newClassId)
        } else {
            nextParams.delete('class_id')
        }
        setSearchParams(nextParams, { replace: true })
    }

    const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value)
        setCurrentPage(1)
    }

    const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateFrom(e.target.value)
        setCurrentPage(1)
    }

    const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateTo(e.target.value)
        setCurrentPage(1)
    }

    const handleResetFilter = () => {
        setStatusFilter('all')
        setDateFrom('')
        setDateTo('')
        setCurrentPage(1)
    }

    const enrolledClasses = data?.enrolled_classes || []
    const summary = data?.summary
    const absenceWarning = data?.absence_warning
    const sessions = data?.sessions || []
    const pagination = data?.pagination || { page: 1, page_size: pageSize, total_items: 0, total_pages: 1 }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—'
        try {
            const [y, m, d] = dateStr.split('-')
            return `${d}/${m}/${y}`
        } catch {
            return dateStr
        }
    }

    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return ''
        return timeStr.slice(0, 5)
    }

    return (
        <div className="student-attendance-history-page" data-testid="student-attendance-history-page">
            {/* Header Card */}
            <div className="history-header-card">
                <div className="history-header-info">
                    <h1>Lịch sử điểm danh của tôi</h1>
                    <p>
                        {data?.student?.full_name ? (
                            <>
                                Học viên: <strong>{data.student.full_name}</strong>
                                {data.student.student_code && ` (${data.student.student_code})`}
                                {data?.class_info?.program_name && ` • Chương trình: ${data.class_info.program_name}`}
                            </>
                        ) : (
                            'Theo dõi các buổi học, kết quả điểm danh, tỷ lệ chuyên cần và số buổi còn được phép vắng.'
                        )}
                    </p>
                </div>

                <div className="history-header-actions">
                    {enrolledClasses.length > 0 && (
                        <div className="class-select-group">
                            <label htmlFor="class-select" className="class-select-label">
                                Chọn lớp học:
                            </label>
                            <select
                                id="class-select"
                                className="class-select-dropdown"
                                value={selectedClassId}
                                onChange={handleClassChange}
                                data-testid="class-select-dropdown"
                            >
                                {enrolledClasses.map((cls) => (
                                    <option key={cls.class_id} value={cls.class_id}>
                                        {cls.class_code} {cls.program_name ? `(${cls.program_name})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        type="button"
                        className="refresh-button"
                        onClick={() => loadHistory()}
                        disabled={isLoading}
                        data-testid="refresh-history-btn"
                        title="Làm mới dữ liệu"
                    >
                        <span>🔄</span> Làm mới
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
                <div className="error-banner" data-testid="attendance-history-error">
                    <span>⚠️ {errorMessage}</span>
                    <button type="button" onClick={() => loadHistory()}>
                        Thử lại
                    </button>
                </div>
            )}

            {/* Absence Warning Alert Banner (AC2) */}
            {absenceWarning && (
                <div
                    className={`absence-warning-card warning-level-${absenceWarning.warning_level}`}
                    data-testid="absence-warning-banner"
                >
                    <div className="warning-icon-wrapper">
                        {absenceWarning.warning_level === 'danger' && '🚨'}
                        {absenceWarning.warning_level === 'warning' && '⚠️'}
                        {absenceWarning.warning_level === 'success' && '✅'}
                        {absenceWarning.warning_level === 'info' && 'ℹ️'}
                    </div>
                    <div className="warning-content">
                        <div className="warning-title-row">
                            <strong>Ngưỡng vắng cho phép: {absenceWarning.threshold_T}%</strong>
                            <span className={`warning-badge badge-${absenceWarning.warning_status}`}>
                                {absenceWarning.warning_status === 'normal' && 'Bình thường'}
                                {absenceWarning.warning_status === 'approaching' && 'Gần ngưỡng'}
                                {absenceWarning.warning_status === 'at_limit' && 'Chạm mức tối đa'}
                                {absenceWarning.warning_status === 'exceeded' && 'Đã vượt ngưỡng'}
                                {absenceWarning.warning_status === 'insufficient_data' && 'Chưa đủ dữ liệu'}
                            </span>
                        </div>
                        <p className="warning-text" data-testid="absence-warning-message">
                            {absenceWarning.warning_message}
                        </p>
                    </div>
                </div>
            )}

            {/* Summary Statistics Cards (AC1) */}
            {summary && (
                <div className="summary-container" data-testid="attendance-summary-cards">
                    <div className="summary-header-row">
                        <h2 className="summary-title">Tổng quan chuyên cần</h2>
                        <span className="scope-badge">Thống kê toàn lớp</span>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card stat-card-rate" data-testid="stat-rate-card">
                            <div className="stat-card-header">
                                <span className="stat-label">Tỷ lệ chuyên cần</span>
                                <span className="stat-icon">📊</span>
                            </div>
                            <div className="stat-value color-blue" data-testid="attendance-rate-value">
                                {summary.attendance_rate !== null ? `${summary.attendance_rate}%` : 'Chưa có dữ liệu'}
                            </div>
                            <div className="stat-subtext">
                                {summary.valid_sessions_count > 0
                                    ? `Dựa trên ${summary.valid_sessions_count} buổi đã có kết quả`
                                    : 'Chưa có buổi học nào kết thúc'}
                            </div>
                        </div>

                        <div className="stat-card" data-testid="stat-present-card">
                            <div className="stat-card-header">
                                <span className="stat-label">Có mặt (P)</span>
                                <span className="stat-icon color-green">✓</span>
                            </div>
                            <div className="stat-value color-green">{summary.present_count}</div>
                            <div className="stat-subtext">buổi tham gia đầy đủ</div>
                        </div>

                        <div className="stat-card" data-testid="stat-late-card">
                            <div className="stat-card-header">
                                <span className="stat-label">Đi muộn (L)</span>
                                <span className="stat-icon color-yellow">⏱</span>
                            </div>
                            <div className="stat-value color-yellow">{summary.late_count}</div>
                            <div className="stat-subtext">vẫn tính chuyên cần</div>
                        </div>

                        <div className="stat-card" data-testid="stat-excused-card">
                            <div className="stat-card-header">
                                <span className="stat-label">Vắng có phép (E)</span>
                                <span className="stat-icon color-blue">📝</span>
                            </div>
                            <div className="stat-value color-blue">{summary.excused_count}</div>
                            <div className="stat-subtext">đơn nghỉ đã duyệt</div>
                        </div>

                        <div className="stat-card" data-testid="stat-unexcused-card">
                            <div className="stat-card-header">
                                <span className="stat-label">Vắng không phép (U)</span>
                                <span className="stat-icon color-red">✗</span>
                            </div>
                            <div className="stat-value color-red">{summary.unexcused_count}</div>
                            <div className="stat-subtext">buổi vắng không phép</div>
                        </div>

                        <div className="stat-card" data-testid="stat-unrecorded-card">
                            <div className="stat-card-header">
                                <span className="stat-label">Chưa điểm danh</span>
                                <span className="stat-icon color-grey">⏳</span>
                            </div>
                            <div className="stat-value color-grey">{summary.unrecorded_ended_count}</div>
                            <div className="stat-subtext">buổi kết thúc chưa ghi nhận</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Card */}
            <div className="filter-card" data-testid="attendance-history-filter-bar">
                <div className="filter-item">
                    <label htmlFor="status-filter" className="filter-label">
                        Trạng thái:
                    </label>
                    <select
                        id="status-filter"
                        className="filter-select"
                        value={statusFilter}
                        onChange={handleStatusFilterChange}
                        data-testid="status-filter-select"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="present">Có mặt</option>
                        <option value="late">Đi muộn</option>
                        <option value="excused">Vắng có phép</option>
                        <option value="unexcused">Vắng không phép</option>
                        <option value="not_recorded">Chưa điểm danh</option>
                        <option value="future">Chưa diễn ra</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>
                </div>

                <div className="filter-item">
                    <label htmlFor="date-from-filter" className="filter-label">
                        Từ ngày:
                    </label>
                    <input
                        type="date"
                        id="date-from-filter"
                        className="filter-input"
                        value={dateFrom}
                        onChange={handleDateFromChange}
                        data-testid="date-from-input"
                    />
                </div>

                <div className="filter-item">
                    <label htmlFor="date-to-filter" className="filter-label">
                        Đến ngày:
                    </label>
                    <input
                        type="date"
                        id="date-to-filter"
                        className="filter-input"
                        value={dateTo}
                        onChange={handleDateToChange}
                        data-testid="date-to-input"
                    />
                </div>

                {(statusFilter !== 'all' || dateFrom || dateTo) && (
                    <button
                        type="button"
                        className="btn-reset-filter"
                        onClick={handleResetFilter}
                        data-testid="reset-filter-btn"
                    >
                        Đặt lại bộ lọc
                    </button>
                )}
            </div>

            {/* Sessions Table (AC1) */}
            {isLoading ? (
                <div className="loading-skeleton" data-testid="loading-state">
                    Đang tải lịch sử điểm danh...
                </div>
            ) : sessions.length === 0 ? (
                <div className="empty-state-card" data-testid="empty-history-state">
                    <div className="empty-state-icon">📅</div>
                    <div className="empty-state-title">Không tìm thấy buổi học nào</div>
                    <p className="empty-state-desc">
                        {statusFilter !== 'all' || dateFrom || dateTo
                            ? 'Không có buổi học nào khớp với bộ lọc hiện tại. Thử đặt lại bộ lọc.'
                            : 'Lớp học hiện tại chưa có buổi học nào trong lịch biểu.'}
                    </p>
                </div>
            ) : (
                <div className="sessions-table-wrapper">
                    <table className="sessions-table" data-testid="attendance-history-table">
                        <thead>
                            <tr>
                                <th>Ngày học</th>
                                <th>Giờ / Ca</th>
                                <th>Môn học</th>
                                <th>Buổi / Chủ đề</th>
                                <th>Phòng / GV</th>
                                <th>Trạng thái điểm danh</th>
                                <th>Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((item) => (
                                <tr
                                    key={item.schedule_id}
                                    data-testid={`session-row-${item.schedule_id}`}
                                >
                                    <td className="date-cell">{formatDate(item.learning_date)}</td>
                                    <td className="time-cell">
                                        {item.start_time && item.end_time ? (
                                            <>
                                                {formatTime(item.start_time)} - {formatTime(item.end_time)}
                                            </>
                                        ) : (
                                            '—'
                                        )}
                                        {item.shift && <span className="shift-tag">{item.shift}</span>}
                                    </td>
                                    <td>
                                        {item.subject_code && (
                                            <div className="subject-code-tag">{item.subject_code}</div>
                                        )}
                                        <div className="subject-name-cell">
                                            {item.subject_name || '—'}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="session-number-badge">Buổi {item.session_number}:</span>
                                        <span className="session-topic">{item.topic || '—'}</span>
                                    </td>
                                    <td>
                                        <div>{item.room_name || '—'}</div>
                                        {item.instructor_name && (
                                            <small style={{ color: '#64748b' }}>GV: {item.instructor_name}</small>
                                        )}
                                    </td>
                                    <td>
                                        <span
                                            className={`status-badge status-${item.status}`}
                                            data-testid={`status-badge-${item.status}`}
                                        >
                                            <span>{item.symbol}</span>
                                            <span>{item.status_label}</span>
                                        </span>
                                        {item.is_pre_approved && (
                                            <span className="pre-approved-tag">Đơn duyệt trước</span>
                                        )}
                                    </td>
                                    <td className="notes-cell" title={item.notes || ''}>
                                        {item.notes || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination Controls */}
            {sessions.length > 0 && (
                <div className="pagination-wrapper" data-testid="history-pagination">
                    <div className="pagination-info">
                        Hiển thị {(pagination.page - 1) * pagination.page_size + 1} -{' '}
                        {Math.min(pagination.page * pagination.page_size, pagination.total_items)} trên tổng số{' '}
                        <strong>{pagination.total_items}</strong> buổi học
                    </div>

                    <div className="pagination-controls">
                        <button
                            type="button"
                            className="pagination-btn"
                            disabled={pagination.page <= 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            data-testid="pagination-prev-btn"
                        >
                            &laquo; Trước
                        </button>

                        {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                            .filter((p) => {
                                // Hiển thị các trang lân cận trang hiện tại
                                return (
                                    p === 1 ||
                                    p === pagination.total_pages ||
                                    Math.abs(p - pagination.page) <= 1
                                )
                            })
                            .map((p, idx, arr) => (
                                <React.Fragment key={p}>
                                    {idx > 0 && arr[idx - 1] !== p - 1 && <span>...</span>}
                                    <button
                                        type="button"
                                        className={`pagination-btn ${p === pagination.page ? 'active' : ''}`}
                                        onClick={() => setCurrentPage(p)}
                                    >
                                        {p}
                                    </button>
                                </React.Fragment>
                            ))}

                        <button
                            type="button"
                            className="pagination-btn"
                            disabled={pagination.page >= pagination.total_pages}
                            onClick={() => setCurrentPage((p) => Math.min(pagination.total_pages, p + 1))}
                            data-testid="pagination-next-btn"
                        >
                            Sau &raquo;
                        </button>

                        <div className="page-size-selector">
                            <span>Số dòng:</span>
                            <select
                                className="page-size-dropdown"
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value))
                                    setCurrentPage(1)
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
