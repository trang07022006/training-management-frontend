import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    getSessionAttendanceSheet,
    saveSessionAttendance,
    getSessionAttendanceHistory,
    type AttendanceSheetResponse,
    type AttendanceStudentItem,
    type AttendanceStatus,
    type AttendanceAuditLogItem,
} from '../api/attendanceApi'
import { getErrorMessage } from '../utils/errorMessages'
import { formatVietnamDate } from '../utils/dateUtils'
import './SessionAttendance.css'

export function SessionAttendancePage() {
    const { scheduleId } = useParams<{ scheduleId: string }>()
    const navigate = useNavigate()
    const { request: requestFn } = useSession()

    // Dữ liệu chính từ API
    const [sheetData, setSheetData] = useState<AttendanceSheetResponse | null>(null)
    const [studentsState, setStudentsState] = useState<AttendanceStudentItem[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Trạng thái tìm kiếm
    const [searchQuery, setSearchQuery] = useState<string>('')

    // Trạng thái lưu dữ liệu
    const [isSaving, setIsSaving] = useState<boolean>(false)
    const [isDirty, setIsDirty] = useState<boolean>(false)

    // Modal lịch sử chỉnh sửa
    const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false)
    const [historyLogs, setHistoryLogs] = useState<AttendanceAuditLogItem[]>([])
    const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)

    // Tải dữ liệu sổ điểm danh
    const loadSheetData = useCallback(async () => {
        if (!scheduleId) return
        setIsLoading(true)
        setErrorMessage(null)
        try {
            const data = await getSessionAttendanceSheet(requestFn, scheduleId)
            setSheetData(data)
            setStudentsState(data.students || [])
            setIsDirty(false)
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi tải thông tin sổ điểm danh.'))
        } finally {
            setIsLoading(false)
        }
    }, [scheduleId, requestFn])

    useEffect(() => {
        loadSheetData()
    }, [loadSheetData])

    // Cảnh báo khi rời khỏi trang nếu có thay đổi chưa lưu
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isDirty])

    // Danh sách học viên sau khi áp dụng bộ lọc tìm kiếm
    const filteredStudents = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return studentsState
        return studentsState.filter(
            (s) =>
                s.full_name.toLowerCase().includes(q) ||
                s.student_code.toLowerCase().includes(q) ||
                (s.email && s.email.toLowerCase().includes(q)),
        )
    }, [studentsState, searchQuery])

    // Tính toán lại thống kê dựa trên trạng thái hiện tại trên form
    const currentStats = useMemo(() => {
        const total = studentsState.length
        const present = studentsState.filter((s) => s.status === 'present').length
        const late = studentsState.filter((s) => s.status === 'late').length
        const excused = studentsState.filter((s) => s.status === 'excused').length
        const unexcused = studentsState.filter((s) => s.status === 'unexcused').length
        const unmarked = studentsState.filter((s) => s.status === null).length
        return {
            total,
            present,
            late,
            excused,
            unexcused,
            unmarked,
        }
    }, [studentsState])

    // Cập nhật trạng thái cho một học viên
    const handleStatusChange = (studentId: string, newStatus: AttendanceStatus) => {
        if (!sheetData?.session_info.can_edit) return
        setStudentsState((prev) =>
            prev.map((s) => (s.student_id === studentId ? { ...s, status: newStatus } : s)),
        )
        setIsDirty(true)
        setSuccessMessage(null)
    }

    // Cập nhật ghi chú cho học viên
    const handleNoteChange = (studentId: string, notes: string) => {
        if (!sheetData?.session_info.can_edit) return
        setStudentsState((prev) =>
            prev.map((s) => (s.student_id === studentId ? { ...s, notes } : s)),
        )
        setIsDirty(true)
    }

    // Đánh dấu tất cả học viên có mặt
    const handleMarkAllPresent = () => {
        if (!sheetData?.session_info.can_edit) return
        setStudentsState((prev) =>
            prev.map((s) => ({ ...s, status: 'present' })),
        )
        setIsDirty(true)
        setSuccessMessage(null)
    }

    // Lưu kết quả điểm danh
    const handleSaveAttendance = async () => {
        if (!scheduleId || !sheetData?.session_info.can_edit || isSaving) return

        // Thu thập các học viên đã chọn trạng thái
        const toSave = studentsState
            .filter((s) => s.status !== null)
            .map((s) => ({
                student_id: s.student_id,
                status: s.status as AttendanceStatus,
                notes: s.notes?.trim() || undefined,
            }))

        if (toSave.length === 0) {
            setErrorMessage('Vui lòng chọn trạng thái điểm danh cho ít nhất một học viên trước khi lưu.')
            return
        }

        setIsSaving(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            const res = await saveSessionAttendance(requestFn, scheduleId, {
                attendances: toSave,
            })
            setSuccessMessage(res.message || 'Lưu kết quả điểm danh thành công!')
            setIsDirty(false)
            if (res.data) {
                setSheetData(res.data)
                setStudentsState(res.data.students || [])
            }
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi lưu kết quả điểm danh.'))
        } finally {
            setIsSaving(false)
        }
    }

    // Mở lịch sử chỉnh sửa điểm danh
    const handleOpenHistory = async () => {
        if (!scheduleId) return
        setShowHistoryModal(true)
        setIsLoadingHistory(true)
        try {
            const logs = await getSessionAttendanceHistory(requestFn, scheduleId)
            setHistoryLogs(logs)
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Không thể tải lịch sử chỉnh sửa điểm danh.'))
        } finally {
            setIsLoadingHistory(false)
        }
    }

    if (isLoading) {
        return (
            <div className="attendance-page-container" data-testid="attendance-loading">
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                    <p style={{ fontSize: '16px' }}>⏳ Đang tải thông tin sổ điểm danh...</p>
                </div>
            </div>
        )
    }

    if (errorMessage && !sheetData) {
        return (
            <div className="attendance-page-container" data-testid="attendance-error-state">
                <div className="attendance-restriction-alert" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#b91c1c' }}>
                    <span>⚠️ {errorMessage}</span>
                </div>
                <button
                    type="button"
                    className="btn-history-view"
                    onClick={() => navigate(-1)}
                    style={{ marginTop: '12px' }}
                >
                    ← Quay lại
                </button>
            </div>
        )
    }

    const sessionInfo = sheetData?.session_info

    return (
        <div className="attendance-page-container" data-testid="session-attendance-page">
            {/* Breadcrumb Navigation */}
            <nav className="attendance-breadcrumb" aria-label="Breadcrumb">
                <Link to="/schedules">Thời khóa biểu</Link>
                <span className="separator">/</span>
                {sessionInfo && (
                    <>
                        <Link to={`/classes/${sessionInfo.class_id}`}>
                            Lớp {sessionInfo.class_code}
                        </Link>
                        <span className="separator">/</span>
                        <Link to={`/classes/${sessionInfo.class_id}/schedules/${sessionInfo.schedule_id}`}>
                            Buổi #{sessionInfo.session_number}
                        </Link>
                        <span className="separator">/</span>
                    </>
                )}
                <span>Điểm danh học viên</span>
            </nav>

            {/* Thông báo lỗi / thành công tại vị trí thao tác */}
            {errorMessage && (
                <div
                    className="attendance-restriction-alert"
                    role="alert"
                    style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#b91c1c', marginBottom: '16px' }}
                    data-testid="attendance-error-alert"
                >
                    <span>⚠️ {errorMessage}</span>
                </div>
            )}
            {successMessage && (
                <div
                    className="attendance-restriction-alert"
                    role="alert"
                    style={{ background: '#f0fdf4', borderColor: '#86efac', color: '#15803d', marginBottom: '16px' }}
                    data-testid="attendance-success-alert"
                >
                    <span>✓ {successMessage}</span>
                </div>
            )}

            {/* Session Info Summary Card */}
            {sessionInfo && (
                <div className="attendance-session-card" data-testid="session-summary-card">
                    <div className="attendance-session-header">
                        <div>
                            <h1 className="attendance-session-title">
                                Điểm danh Buổi #{sessionInfo.session_number}: {sessionInfo.topic || sessionInfo.subject_name}
                            </h1>
                            <p className="attendance-session-subtitle">
                                Môn học: <strong>{sessionInfo.subject_name}</strong> • Lớp:{' '}
                                <strong>{sessionInfo.class_code}</strong>
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {sessionInfo.is_today && (
                                <span className="attendance-session-badge today" data-testid="badge-today">
                                    ⚡ Buổi học hôm nay
                                </span>
                            )}
                            {sessionInfo.is_past && (
                                <span className="attendance-session-badge past" data-testid="badge-past">
                                    🕒 Buổi học quá khứ
                                </span>
                            )}
                            {sessionInfo.attendance_checked && (
                                <span className="attendance-session-badge checked" data-testid="badge-checked">
                                    ✓ Đã điểm danh
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="attendance-session-meta-grid">
                        <div className="attendance-meta-item">
                            <span className="attendance-meta-label">Ngày học</span>
                            <span className="attendance-meta-value">
                                {formatVietnamDate(sessionInfo.learning_date)}
                            </span>
                        </div>
                        <div className="attendance-meta-item">
                            <span className="attendance-meta-label">Ca & Thời gian</span>
                            <span className="attendance-meta-value">
                                {sessionInfo.shift ? `${sessionInfo.shift} • ` : ''}
                                {sessionInfo.start_time?.substring(0, 5)} - {sessionInfo.end_time?.substring(0, 5)}
                            </span>
                        </div>
                        <div className="attendance-meta-item">
                            <span className="attendance-meta-label">Phòng học</span>
                            <span className="attendance-meta-value">{sessionInfo.room_name}</span>
                        </div>
                        <div className="attendance-meta-item">
                            <span className="attendance-meta-label">Giảng viên phụ trách</span>
                            <span className="attendance-meta-value">{sessionInfo.instructor_name}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Cảnh báo giới hạn quyền nếu không thể sửa */}
            {sessionInfo && !sessionInfo.can_edit && sessionInfo.edit_restriction_reason && (
                <div
                    className="attendance-restriction-alert"
                    role="alert"
                    data-testid="attendance-restriction-alert"
                >
                    <span>🔒 {sessionInfo.edit_restriction_reason}</span>
                </div>
            )}

            {/* Quick Stats Ribbon */}
            <div className="attendance-stats-ribbon" data-testid="attendance-stats-ribbon">
                <div className="attendance-stat-box">
                    <span className="stat-box-num" data-testid="stat-total">{currentStats.total}</span>
                    <span className="stat-box-label">Sĩ số</span>
                </div>
                <div className="attendance-stat-box present">
                    <span className="stat-box-num" style={{ color: '#16a34a' }} data-testid="stat-present">
                        {currentStats.present}
                    </span>
                    <span className="stat-box-label">Có mặt</span>
                </div>
                <div className="attendance-stat-box late">
                    <span className="stat-box-num" style={{ color: '#d97706' }} data-testid="stat-late">
                        {currentStats.late}
                    </span>
                    <span className="stat-box-label">Đi muộn</span>
                </div>
                <div className="attendance-stat-box excused">
                    <span className="stat-box-num" style={{ color: '#0284c7' }} data-testid="stat-excused">
                        {currentStats.excused}
                    </span>
                    <span className="stat-box-label">Vắng có phép</span>
                </div>
                <div className="attendance-stat-box unexcused">
                    <span className="stat-box-num" style={{ color: '#dc2626' }} data-testid="stat-unexcused">
                        {currentStats.unexcused}
                    </span>
                    <span className="stat-box-label">Vắng không phép</span>
                </div>
                <div className="attendance-stat-box unmarked">
                    <span className="stat-box-num" style={{ color: '#64748b' }} data-testid="stat-unmarked">
                        {currentStats.unmarked}
                    </span>
                    <span className="stat-box-label">Chưa điểm danh</span>
                </div>
            </div>

            {/* Action Toolbar */}
            <div className="attendance-toolbar">
                <div className="attendance-search-box">
                    <span className="attendance-search-icon">🔍</span>
                    <input
                        type="text"
                        className="attendance-search-input"
                        placeholder="Tìm kiếm theo mã, họ tên học viên..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        data-testid="attendance-search-input"
                    />
                </div>

                <div className="attendance-actions-group">
                    {sessionInfo?.can_edit && (
                        <button
                            type="button"
                            className="btn-mark-all-present"
                            onClick={handleMarkAllPresent}
                            data-testid="btn-mark-all-present"
                        >
                            <span>✓</span>
                            <span>Đánh dấu tất cả có mặt</span>
                        </button>
                    )}

                    <button
                        type="button"
                        className="btn-history-view"
                        onClick={handleOpenHistory}
                        data-testid="btn-open-history"
                    >
                        <span>📜</span>
                        <span>Xem lịch sử chỉnh sửa</span>
                    </button>

                    {sessionInfo?.can_edit && (
                        <button
                            type="button"
                            className="btn-save-attendance"
                            onClick={handleSaveAttendance}
                            disabled={isSaving}
                            data-testid="btn-save-attendance"
                        >
                            {isSaving ? 'Đang lưu...' : 'Lưu kết quả điểm danh'}
                        </button>
                    )}
                </div>
            </div>

            {/* Danh sách học viên - Bảng Desktop */}
            <div className="attendance-table-container">
                <table className="attendance-table" data-testid="attendance-desktop-table">
                    <thead>
                        <tr>
                            <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                            <th style={{ width: '130px' }}>Mã học viên</th>
                            <th>Họ và tên</th>
                            <th style={{ width: '380px', textAlign: 'center' }}>Trạng thái điểm danh</th>
                            <th style={{ width: '220px' }}>Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((st, index) => {
                                const canEdit = Boolean(sessionInfo?.can_edit)
                                return (
                                    <tr key={st.student_id} data-testid={`row-student-${st.student_id}`}>
                                        <td style={{ textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                                        <td>
                                            <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                                {st.student_code}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{st.full_name}</div>
                                            {st.email && (
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>{st.email}</div>
                                            )}
                                            {st.is_historical_record && (
                                                <span style={{ fontSize: '11px', color: '#d97706', display: 'block', marginTop: '2px' }}>
                                                    (Bản ghi lịch sử)
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className="status-btn-group" role="group" aria-label={`Trạng thái của ${st.full_name}`}>
                                                <button
                                                    type="button"
                                                    className={`status-btn present ${st.status === 'present' ? 'active' : ''}`}
                                                    onClick={() => handleStatusChange(st.student_id, 'present')}
                                                    disabled={!canEdit}
                                                    data-testid={`btn-present-${st.student_id}`}
                                                >
                                                    Có mặt
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`status-btn late ${st.status === 'late' ? 'active' : ''}`}
                                                    onClick={() => handleStatusChange(st.student_id, 'late')}
                                                    disabled={!canEdit}
                                                    data-testid={`btn-late-${st.student_id}`}
                                                >
                                                    Đi muộn
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`status-btn excused ${st.status === 'excused' ? 'active' : ''}`}
                                                    onClick={() => handleStatusChange(st.student_id, 'excused')}
                                                    disabled={!canEdit}
                                                    data-testid={`btn-excused-${st.student_id}`}
                                                >
                                                    Có phép
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`status-btn unexcused ${st.status === 'unexcused' ? 'active' : ''}`}
                                                    onClick={() => handleStatusChange(st.student_id, 'unexcused')}
                                                    disabled={!canEdit}
                                                    data-testid={`btn-unexcused-${st.student_id}`}
                                                >
                                                    Không phép
                                                </button>
                                            </div>
                                            {st.status === null && (
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                                    Chưa chọn trạng thái
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                className="attendance-note-input"
                                                placeholder="Lý do / ghi chú..."
                                                value={st.notes || ''}
                                                onChange={(e) => handleNoteChange(st.student_id, e.target.value)}
                                                disabled={!canEdit}
                                                data-testid={`input-note-${st.student_id}`}
                                            />
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                                    Không tìm thấy học viên nào phù hợp với bộ lọc tìm kiếm.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Danh sách học viên - Thẻ Mobile (<= 640px) */}
            <div className="attendance-cards-mobile" data-testid="attendance-mobile-cards">
                {filteredStudents.length > 0 ? (
                    filteredStudents.map((st) => {
                        const canEdit = Boolean(sessionInfo?.can_edit)
                        return (
                            <div className="attendance-student-card" key={st.student_id} data-testid={`card-student-${st.student_id}`}>
                                <div className="attendance-card-header">
                                    <div>
                                        <div className="card-student-name">{st.full_name}</div>
                                        <div className="card-student-code">{st.student_code}</div>
                                    </div>
                                    <span
                                        className={`card-status-badge ${st.status || 'unmarked'}`}
                                        data-testid={`badge-status-${st.student_id}`}
                                    >
                                        {st.status ? st.status_label : 'Chưa điểm danh'}
                                    </span>
                                </div>

                                <div className="attendance-card-btn-grid">
                                    <button
                                        type="button"
                                        className={`mobile-status-btn ${st.status === 'present' ? 'active present' : ''}`}
                                        onClick={() => handleStatusChange(st.student_id, 'present')}
                                        disabled={!canEdit}
                                        data-testid={`mobile-btn-present-${st.student_id}`}
                                    >
                                        Có mặt
                                    </button>
                                    <button
                                        type="button"
                                        className={`mobile-status-btn ${st.status === 'late' ? 'active late' : ''}`}
                                        onClick={() => handleStatusChange(st.student_id, 'late')}
                                        disabled={!canEdit}
                                        data-testid={`mobile-btn-late-${st.student_id}`}
                                    >
                                        Đi muộn
                                    </button>
                                    <button
                                        type="button"
                                        className={`mobile-status-btn ${st.status === 'excused' ? 'active excused' : ''}`}
                                        onClick={() => handleStatusChange(st.student_id, 'excused')}
                                        disabled={!canEdit}
                                        data-testid={`mobile-btn-excused-${st.student_id}`}
                                    >
                                        Có phép
                                    </button>
                                    <button
                                        type="button"
                                        className={`mobile-status-btn ${st.status === 'unexcused' ? 'active unexcused' : ''}`}
                                        onClick={() => handleStatusChange(st.student_id, 'unexcused')}
                                        disabled={!canEdit}
                                        data-testid={`mobile-btn-unexcused-${st.student_id}`}
                                    >
                                        Không phép
                                    </button>
                                </div>

                                <div>
                                    <input
                                        type="text"
                                        className="attendance-note-input"
                                        placeholder="Ghi chú thêm..."
                                        value={st.notes || ''}
                                        onChange={(e) => handleNoteChange(st.student_id, e.target.value)}
                                        disabled={!canEdit}
                                        data-testid={`mobile-input-note-${st.student_id}`}
                                    />
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        Không tìm thấy học viên nào phù hợp.
                    </div>
                )}
            </div>

            {/* Modal Lịch sử chỉnh sửa điểm danh */}
            {showHistoryModal && (
                <div className="attendance-modal-backdrop" data-testid="history-modal">
                    <div className="attendance-modal-container">
                        <div className="attendance-modal-header">
                            <h3 className="attendance-modal-title">📜 Lịch sử chỉnh sửa điểm danh</h3>
                            <button
                                type="button"
                                className="attendance-modal-close"
                                onClick={() => setShowHistoryModal(false)}
                                data-testid="btn-close-history"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="attendance-modal-body">
                            {isLoadingHistory ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                                    Đang tải lịch sử...
                                </div>
                            ) : historyLogs.length > 0 ? (
                                <div className="history-timeline">
                                    {historyLogs.map((log) => (
                                        <div className="history-item" key={log.id} data-testid={`history-item-${log.id}`}>
                                            <div className="history-item-content">
                                                <div className="history-item-header">
                                                    <span className="history-performer">
                                                        {log.performer_name || 'Người dùng'}
                                                    </span>
                                                    <span className="history-time">
                                                        {log.created_at ? new Date(log.created_at).toLocaleString('vi-VN') : ''}
                                                    </span>
                                                </div>
                                                <div className="history-change-line">
                                                    Học viên: <strong>{log.student_name || log.student_code}</strong> ({log.student_code})
                                                    {' • Thay đổi từ '}
                                                    <span style={{ color: '#64748b' }}>{log.old_status_label}</span>
                                                    {' ➔ '}
                                                    <span style={{ fontWeight: 600, color: '#0284c7' }}>{log.new_status_label}</span>
                                                </div>
                                                {log.reason && (
                                                    <div className="history-reason">
                                                        Lý do: {log.reason}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                                    Chưa có bản ghi lịch sử chỉnh sửa nào cho buổi học này.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
