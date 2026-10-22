import { useEffect, useState, useCallback, useTransition } from 'react'
import { Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    getClassAttendanceSummary,
    type AttendanceSummaryData,
    type AttendanceSummaryCell,
} from '../api/attendanceSummaryApi'
import { saveSessionAttendance, type AttendanceStatus } from '../api/attendanceApi'
import { getErrorMessage } from '../utils/errorMessages'
import './ClassAttendanceSummary.css'

interface Props {
    classId: string
    classCode?: string
}

export function ClassAttendanceSummaryView({ classId, classCode }: Props) {
    const { request: requestFn } = useSession()

    // State dữ liệu
    const [summaryData, setSummaryData] = useState<AttendanceSummaryData | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // State điều khiển: Phân trang, Tìm kiếm, Sắp xếp
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [debouncedSearch, setDebouncedSearch] = useState<string>('')
    const [activeSortBy, setActiveSortBy] = useState<'student_code' | 'attendance_rate' | 'total_absent'>('student_code')
    const [activeSortOrder, setActiveSortOrder] = useState<'asc' | 'desc'>('asc')
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [pageSize, setPageSize] = useState<number>(20)

    // State điểm danh nhanh từ ô ma trận
    const [quickEditTarget, setQuickEditTarget] = useState<{
        studentId: string
        studentName: string
        studentCode: string
        scheduleId: string
        sessionNumber: number
        learningDate: string
        currentStatus?: string
    } | null>(null)
    const [isSavingQuick, setIsSavingQuick] = useState<boolean>(false)
    const [quickSuccessMsg, setQuickSuccessMsg] = useState<string | null>(null)
    const [quickErrorMsg, setQuickErrorMsg] = useState<string | null>(null)

    const [, startTransition] = useTransition()

    // Debounce tìm kiếm 350ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
            setCurrentPage(1) // Quay về trang 1 khi thay đổi từ khóa
        }, 350)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Tải dữ liệu từ backend API
    const loadSummary = useCallback(async () => {
        if (!classId) return
        try {
            setIsLoading(true)
            setErrorMessage(null)
            const data = await getClassAttendanceSummary(requestFn, classId, {
                page: currentPage,
                page_size: pageSize,
                search: debouncedSearch,
                sort_by: activeSortBy,
                sort_order: activeSortOrder,
            })
            setSummaryData(data)
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi tải bảng chuyên cần tổng hợp của lớp học.'))
        } finally {
            setIsLoading(false)
        }
    }, [classId, requestFn, currentPage, pageSize, debouncedSearch, activeSortBy, activeSortOrder])

    useEffect(() => {
        loadSummary()
    }, [loadSummary])

    // Toggle sắp xếp AC3: "Chuyên cần thấp nhất trước"
    const handleToggleRateSort = () => {
        startTransition(() => {
            if (activeSortBy === 'attendance_rate' && activeSortOrder === 'asc') {
                // Đang sort rate asc -> reset về mã học viên mặc định
                setActiveSortBy('student_code')
                setActiveSortOrder('asc')
            } else {
                // Kích hoạt sort rate asc
                setActiveSortBy('attendance_rate')
                setActiveSortOrder('asc')
            }
            setCurrentPage(1)
        })
    }

    // Kiểm tra xem trong trang có học viên nào còn buổi kết thúc chưa điểm danh không
    const hasAnyUnrecordedSession = summaryData?.students.some(
        (st) => (st.summary?.unrecorded_ended_count ?? 0) > 0
    )

    // Helper format ngày hiển thị trên header cột (DD/MM)
    const formatColDate = (dateStr?: string) => {
        if (!dateStr) return '—'
        const parts = dateStr.split('-')
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}`
        }
        return dateStr
    }

    // Helper render class badge cho cell
    const renderCellBadge = (cell?: AttendanceSummaryCell, onCellClick?: () => void) => {
        if (!cell) {
            return (
                <span
                    className="matrix-cell-badge cell-not_recorded matrix-cell-clickable"
                    title="Chưa có dữ liệu (Bấm để điểm danh)"
                    onClick={onCellClick}
                    role="button"
                    tabIndex={0}
                >
                    ?
                </span>
            )
        }

        const isActionable = cell.status !== 'cancelled' && cell.status !== 'not_applicable'
        const className = `matrix-cell-badge cell-${cell.status} ${cell.is_pre_approved ? 'pre-approved-dot' : ''} ${isActionable ? 'matrix-cell-clickable' : ''}`
        let tooltip = `${cell.status_label} (${cell.symbol})`
        if (cell.is_pre_approved) {
            tooltip += ' • Đơn xin phép vắng đã được duyệt trước'
        }
        if (cell.notes) {
            tooltip += ` • Ghi chú: ${cell.notes}`
        }
        if (isActionable) {
            tooltip += ' • Bấm để điểm danh'
        }

        return (
            <span
                className={className}
                title={tooltip}
                aria-label={tooltip}
                onClick={isActionable ? onCellClick : undefined}
                role={isActionable ? 'button' : undefined}
                tabIndex={isActionable ? 0 : undefined}
                onKeyDown={(e) => {
                    if (isActionable && onCellClick && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        onCellClick()
                    }
                }}
            >
                {cell.symbol}
            </span>
        )
    }

    // Xử lý điểm danh nhanh trực tiếp từ ô ma trận
    const handleQuickAttendanceSelect = async (newStatus: AttendanceStatus) => {
        if (!quickEditTarget) return
        setIsSavingQuick(true)
        setQuickErrorMsg(null)
        try {
            await saveSessionAttendance(requestFn, quickEditTarget.scheduleId, {
                attendances: [
                    {
                        student_id: quickEditTarget.studentId,
                        status: newStatus,
                        notes: 'Điểm danh từ bảng chuyên cần',
                    },
                ],
                reason: `Cập nhật điểm danh cho ${quickEditTarget.studentName} sang ${newStatus}`,
            })
            setQuickSuccessMsg(`Đã cập nhật trạng thái của ${quickEditTarget.studentName} thành công!`)
            setTimeout(() => {
                setQuickEditTarget(null)
                setQuickSuccessMsg(null)
            }, 800)
            loadSummary()
        } catch (err: unknown) {
            setQuickErrorMsg(getErrorMessage(err, 'Lỗi khi cập nhật điểm danh nhanh.'))
        } finally {
            setIsSavingQuick(false)
        }
    }

    // Helper render badge tỷ lệ chuyên cần AC2
    const renderRateBadge = (rate: number | null, formatted: string) => {
        if (rate === null) {
            return (
                <span className="rate-badge rate-null" title="Chưa có buổi học nào đủ điều kiện có kết quả điểm danh">
                    —
                </span>
            )
        }

        let badgeClass = 'rate-badge '
        let riskLabel = ''
        if (rate < 70) {
            badgeClass += 'rate-low'
            riskLabel = ' (Nguy cơ cấm thi / Cần liên hệ hỗ trợ)'
        } else if (rate < 80) {
            badgeClass += 'rate-medium'
            riskLabel = ' (Cần lưu ý chuyên cần)'
        } else {
            badgeClass += 'rate-high'
            riskLabel = ' (Chuyên cần tốt)'
        }

        return (
            <span
                className={badgeClass}
                title={`Tỷ lệ chuyên cần: ${formatted}${riskLabel}`}
                data-testid="attendance-rate-badge"
            >
                {formatted}
            </span>
        )
    }

    return (
        <div className="attendance-summary-container" data-testid="class-attendance-summary-view">
            {/* 1. Header & Title */}
            <div className="summary-header-row">
                <div className="summary-title-group">
                    <h3>
                        <span>📊</span> Bảng chuyên cần tổng hợp
                        {classCode && <span style={{ color: '#2563eb', fontWeight: 600 }}>— Lớp {classCode}</span>}
                    </h3>
                    <p>Theo dõi ma trận điểm danh theo buổi và tỷ lệ chuyên cần để kịp thời hỗ trợ học viên có nguy cơ bỏ học.</p>
                </div>
            </div>

            {/* 2. Rules & Formula Notice Banner */}
            <div className="summary-rules-banner" data-testid="calculation-rules-banner">
                <div className="rules-formula">
                    Công thức: Tỷ lệ chuyên cần (%) = ((Có mặt + Đi muộn) / D) × 100%
                </div>
                <div className="rules-note">
                    Trong đó D = Tổng số buổi đã kết thúc và có kết quả điểm danh hợp lệ (Có mặt + Đi muộn + Vắng có phép + Vắng không phép).
                    Buổi trong tương lai, buổi bị hủy và buổi chưa điểm danh không tham gia vào mẫu số D.
                </div>
                {hasAnyUnrecordedSession && (
                    <div className="unrecorded-alert-badge" role="alert">
                        <span>⚠️</span> Lớp học có buổi đã kết thúc nhưng chưa hoàn thành điểm danh. Vui lòng điểm danh đủ các buổi để tỷ lệ phản ánh chính xác nhất.
                    </div>
                )}
            </div>

            {/* 3. Toolbar Controls: Search, Sort (AC3), PageSize, Refresh */}
            <div className="summary-toolbar">
                <div className="toolbar-left">
                    <div className="search-input-wrap">
                        <span className="search-icon" aria-hidden="true">🔍</span>
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo mã, họ tên..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Tìm kiếm học viên"
                            data-testid="search-student-input"
                        />
                    </div>

                    {/* Nút sắp xếp chuyên cần thấp nhất trước (AC3) */}
                    <button
                        type="button"
                        className={`btn-sort-toggle ${activeSortBy === 'attendance_rate' && activeSortOrder === 'asc' ? 'active' : ''}`}
                        onClick={handleToggleRateSort}
                        title="Sắp xếp học viên có tỷ lệ chuyên cần từ thấp đến cao để nhận diện nguy cơ"
                        data-testid="btn-sort-rate-asc"
                    >
                        <span>{activeSortBy === 'attendance_rate' && activeSortOrder === 'asc' ? '✓ ' : '🔽 '}</span>
                        <span>Chuyên cần thấp nhất trước</span>
                    </button>
                </div>

                <div className="toolbar-right">
                    <label htmlFor="pageSizeSelect" style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Hiển thị:
                    </label>
                    <select
                        id="pageSizeSelect"
                        className="page-size-select"
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value))
                            setCurrentPage(1)
                        }}
                    >
                        <option value={10}>10 học viên / trang</option>
                        <option value={20}>20 học viên / trang</option>
                        <option value={50}>50 học viên / trang</option>
                    </select>

                    <button
                        type="button"
                        className="btn-refresh"
                        onClick={loadSummary}
                        title="Tải lại dữ liệu mới nhất"
                        data-testid="btn-refresh-summary"
                    >
                        <span>🔄</span> Làm mới
                    </button>
                </div>
            </div>

            {/* 4. Error Message Alert */}
            {errorMessage && (
                <div className="classes-alert error" role="alert">
                    <span>{errorMessage}</span>
                    <button
                        type="button"
                        onClick={loadSummary}
                        style={{ marginLeft: '12px', background: 'none', border: 'none', textDecoration: 'underline', color: 'inherit', cursor: 'pointer' }}
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* 5. Loading State */}
            {isLoading && !summaryData && (
                <div className="summary-loading-state">
                    <div className="summary-spinner" />
                    <span>Đang tổng hợp dữ liệu chuyên cần lớp học...</span>
                </div>
            )}

            {/* 6. Empty State */}
            {!isLoading && summaryData && summaryData.students.length === 0 && (
                <div className="summary-empty-state">
                    <span style={{ fontSize: '2rem' }}>📋</span>
                    <h4 style={{ margin: '4px 0', color: '#0f172a' }}>Không tìm thấy học viên phù hợp</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                        {debouncedSearch
                            ? `Không có học viên nào khớp với từ khóa "${debouncedSearch}".`
                            : 'Lớp học hiện tại chưa có học viên nào được ghi danh.'}
                    </p>
                </div>
            )}

            {/* 7. Matrix Data Table (AC1, AC2, AC3) */}
            {summaryData && summaryData.students.length > 0 && (
                <div className="matrix-table-card">
                    <div className="matrix-scroll-wrapper" tabIndex={0} aria-label="Bảng ma trận chuyên cần cuộn ngang">
                        <table className="attendance-matrix-table" data-testid="attendance-summary-matrix-table">
                            <thead>
                                <tr>
                                    {/* Cột nhận diện học viên cố định (Sticky Left) */}
                                    <th className="col-sticky-stt" scope="col">STT</th>
                                    <th className="col-sticky-code" scope="col">Mã SV</th>
                                    <th className="col-sticky-name" scope="col">Họ và tên</th>

                                    {/* Các cột buổi học của lớp (AC1) */}
                                    {summaryData.sessions.map((s) => (
                                        <th key={s.schedule_id} scope="col">
                                            <div className="session-th-content">
                                                <span className="session-th-num">Buổi #{s.session_number}</span>
                                                <span className="session-th-date">{formatColDate(s.learning_date)}</span>
                                                <span className="session-th-time">
                                                    {s.shift === 'morning' ? 'Sáng' : s.shift === 'afternoon' ? 'Chiều' : s.shift === 'evening' ? 'Tối' : (s.start_time?.substring(0, 5) || '')}
                                                </span>
                                                {/* Liên kết mở sổ điểm danh của buổi học */}
                                                <Link
                                                    to={`/classes/${classId}/schedules/${s.schedule_id}/attendance`}
                                                    className="session-th-link"
                                                    title={`Mở sổ điểm danh Buổi #${s.session_number} (${s.learning_date})`}
                                                >
                                                    🔗
                                                </Link>
                                            </div>
                                        </th>
                                    ))}

                                    {/* Cột Tổng kết quả chuyên cần (AC2) */}
                                    <th className="col-summary-absent" scope="col" title="Tổng số buổi vắng có phép và không phép">
                                        Tổng vắng
                                    </th>
                                    <th className="col-summary-rate" scope="col" title="Tỷ lệ chuyên cần trên các buổi đủ điều kiện đã có kết quả điểm danh">
                                        Chuyên cần (%)
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {summaryData.students.map((st, idx) => {
                                    const stt = (summaryData.pagination.page - 1) * summaryData.pagination.page_size + idx + 1
                                    const absentCount = st.summary.total_absent
                                    let absentBadgeClass = 'absent-count-badge '
                                    if (absentCount === 0) absentBadgeClass += 'absent-zero'
                                    else if (absentCount < 3) absentBadgeClass += 'absent-low'
                                    else absentBadgeClass += 'absent-high'

                                    return (
                                        <tr key={st.student_id} data-testid={`student-row-${st.student_code}`}>
                                            {/* Sticky Identification Columns */}
                                            <td className="col-sticky-stt">{stt}</td>
                                            <td className="col-sticky-code">
                                                <strong style={{ color: '#0f172a' }}>{st.student_code}</strong>
                                            </td>
                                            <td className="col-sticky-name" title={st.full_name}>
                                                {st.full_name}
                                                {st.lifecycle_status === 'reserved' && (
                                                    <span style={{ fontSize: '11px', color: '#d97706', display: 'block' }}>[Bảo lưu]</span>
                                                )}
                                                {st.lifecycle_status === 'dropped' && (
                                                    <span style={{ fontSize: '11px', color: '#dc2626', display: 'block' }}>[Thôi học]</span>
                                                )}
                                                {st.lifecycle_status === 'transferred' && (
                                                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>[Chuyển lớp]</span>
                                                )}
                                            </td>

                                            {/* Ma trận các ô buổi học (AC1) */}
                                            {summaryData.sessions.map((s) => {
                                                const cell = st.session_statuses[s.schedule_id]
                                                return (
                                                    <td key={s.schedule_id}>
                                                        {renderCellBadge(cell, () =>
                                                            setQuickEditTarget({
                                                                studentId: st.student_id,
                                                                studentName: st.full_name,
                                                                studentCode: st.student_code,
                                                                scheduleId: s.schedule_id,
                                                                sessionNumber: s.session_number,
                                                                learningDate: s.learning_date,
                                                                currentStatus: cell?.status,
                                                            }),
                                                        )}
                                                    </td>
                                                )
                                            })}

                                            {/* Cột Tổng số buổi vắng (AC2) */}
                                            <td className="col-summary-absent">
                                                <span
                                                    className={absentBadgeClass}
                                                    title={`Vắng có phép: ${st.summary.excused_count} | Vắng không phép: ${st.summary.unexcused_count}`}
                                                    data-testid="total-absent-badge"
                                                >
                                                    {absentCount}
                                                </span>
                                            </td>

                                            {/* Cột Tỷ lệ chuyên cần % (AC2) */}
                                            <td className="col-summary-rate">
                                                {renderRateBadge(st.summary.attendance_rate, st.summary.attendance_rate_formatted)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 8. Chú giải trạng thái (Status Legend) */}
            <div className="attendance-legend" aria-label="Chú giải trạng thái điểm danh">
                <span className="legend-title">Chú giải:</span>
                <span className="legend-item">
                    <span className="legend-badge cell-present">P</span> Có mặt
                </span>
                <span className="legend-item">
                    <span className="legend-badge cell-late">L</span> Đi muộn
                </span>
                <span className="legend-item">
                    <span className="legend-badge cell-excused">E</span> Vắng có phép
                </span>
                <span className="legend-item">
                    <span className="legend-badge cell-unexcused">U</span> Vắng không phép
                </span>
                <span className="legend-item">
                    <span className="legend-badge cell-not_recorded">?</span> Chưa điểm danh
                </span>
                <span className="legend-item">
                    <span className="legend-badge cell-future">—</span> Chưa diễn ra
                </span>
                <span className="legend-item">
                    <span className="legend-badge cell-not_applicable">—</span> Không áp dụng
                </span>
                <span className="legend-item">
                    <span className="legend-badge cell-cancelled">✕</span> Buổi đã hủy
                </span>
            </div>

            {/* 9. Pagination Footer */}
            {summaryData && summaryData.pagination.total_pages > 1 && (
                <div className="summary-pagination-bar" data-testid="summary-pagination">
                    <div>
                        Hiển thị <strong>{(summaryData.pagination.page - 1) * summaryData.pagination.page_size + 1}</strong> -{' '}
                        <strong>
                            {Math.min(
                                summaryData.pagination.page * summaryData.pagination.page_size,
                                summaryData.pagination.total_items
                            )}
                        </strong>{' '}
                        trên tổng số <strong>{summaryData.pagination.total_items}</strong> học viên
                    </div>

                    <div className="pagination-controls">
                        <button
                            type="button"
                            className="page-btn"
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            aria-label="Trang trước"
                        >
                            ‹ Trước
                        </button>

                        {Array.from({ length: summaryData.pagination.total_pages }).map((_, i) => {
                            const p = i + 1
                            if (
                                p === 1 ||
                                p === summaryData.pagination.total_pages ||
                                (p >= currentPage - 1 && p <= currentPage + 1)
                            ) {
                                return (
                                    <button
                                        key={p}
                                        type="button"
                                        className={`page-btn ${p === currentPage ? 'active' : ''}`}
                                        onClick={() => setCurrentPage(p)}
                                    >
                                        {p}
                                    </button>
                                )
                            }
                            if (p === currentPage - 2 || p === currentPage + 2) {
                                return <span key={p} style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>
                            }
                            return null
                        })}

                        <button
                            type="button"
                            className="page-btn"
                            disabled={currentPage >= summaryData.pagination.total_pages}
                            onClick={() => setCurrentPage((p) => Math.min(summaryData.pagination.total_pages, p + 1))}
                            aria-label="Trang sau"
                        >
                            Sau ›
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Điểm danh nhanh khi bấm ô trên ma trận */}
            {quickEditTarget && (
                <div
                    className="quick-attendance-backdrop"
                    onClick={() => !isSavingQuick && setQuickEditTarget(null)}
                    data-testid="quick-attendance-modal-backdrop"
                >
                    <div
                        className="quick-attendance-modal"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="quick-modal-title"
                    >
                        <div className="quick-attendance-header">
                            <div>
                                <h3 id="quick-modal-title" className="quick-modal-title">
                                    Điểm danh Buổi #{quickEditTarget.sessionNumber} ({formatColDate(quickEditTarget.learningDate)})
                                </h3>
                                <p className="quick-student-desc">
                                    Học viên: <strong>{quickEditTarget.studentName}</strong> ({quickEditTarget.studentCode})
                                </p>
                            </div>
                            <button
                                type="button"
                                className="quick-close-btn"
                                onClick={() => setQuickEditTarget(null)}
                                disabled={isSavingQuick}
                                aria-label="Đóng cửa sổ điểm danh nhanh"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="quick-attendance-body">
                            <p className="quick-instruction-text">
                                Chọn một trong các ô dưới đây để tích điểm danh:
                            </p>

                            {quickErrorMsg && <div className="quick-alert error">{quickErrorMsg}</div>}
                            {quickSuccessMsg && <div className="quick-alert success">{quickSuccessMsg}</div>}

                            <div className="quick-tick-group" role="radiogroup" aria-label="Tùy chọn điểm danh nhanh">
                                {/* P - Có mặt */}
                                <button
                                    type="button"
                                    className={`status-tick-btn present ${quickEditTarget.currentStatus === 'present' ? 'active' : ''}`}
                                    onClick={() => handleQuickAttendanceSelect('present')}
                                    disabled={isSavingQuick}
                                    title="Đánh dấu Có mặt (P)"
                                >
                                    <span className="status-badge-box badge-p">P</span>
                                    <span className="status-tick-label">Có mặt</span>
                                    {quickEditTarget.currentStatus === 'present' && <span className="tick-check-icon">✓</span>}
                                </button>

                                {/* L - Đi muộn */}
                                <button
                                    type="button"
                                    className={`status-tick-btn late ${quickEditTarget.currentStatus === 'late' ? 'active' : ''}`}
                                    onClick={() => handleQuickAttendanceSelect('late')}
                                    disabled={isSavingQuick}
                                    title="Đánh dấu Đi muộn (L)"
                                >
                                    <span className="status-badge-box badge-l">L</span>
                                    <span className="status-tick-label">Đi muộn</span>
                                    {quickEditTarget.currentStatus === 'late' && <span className="tick-check-icon">✓</span>}
                                </button>

                                {/* E - Vắng có phép */}
                                <button
                                    type="button"
                                    className={`status-tick-btn excused ${quickEditTarget.currentStatus === 'excused' ? 'active' : ''}`}
                                    onClick={() => handleQuickAttendanceSelect('excused')}
                                    disabled={isSavingQuick}
                                    title="Đánh dấu Vắng có phép (E)"
                                >
                                    <span className="status-badge-box badge-e">E</span>
                                    <span className="status-tick-label">Vắng có phép</span>
                                    {quickEditTarget.currentStatus === 'excused' && <span className="tick-check-icon">✓</span>}
                                </button>

                                {/* U - Vắng không phép */}
                                <button
                                    type="button"
                                    className={`status-tick-btn unexcused ${quickEditTarget.currentStatus === 'unexcused' ? 'active' : ''}`}
                                    onClick={() => handleQuickAttendanceSelect('unexcused')}
                                    disabled={isSavingQuick}
                                    title="Đánh dấu Vắng không phép (U)"
                                >
                                    <span className="status-badge-box badge-u">U</span>
                                    <span className="status-tick-label">Vắng không phép</span>
                                    {quickEditTarget.currentStatus === 'unexcused' && <span className="tick-check-icon">✓</span>}
                                </button>
                            </div>

                            <div className="quick-footer-nav">
                                <Link
                                    to={`/classes/${classId}/schedules/${quickEditTarget.scheduleId}/attendance`}
                                    className="quick-full-attendance-link"
                                >
                                    📋 Mở trang điểm danh đầy đủ buổi học này →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
