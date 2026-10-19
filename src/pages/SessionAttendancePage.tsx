import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
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
    type SaveAttendancePayload,
} from '../api/attendanceApi'
import { getErrorMessage } from '../utils/errorMessages'
import { formatVietnamDate } from '../utils/dateUtils'
import { formatSessionShiftAndTime, formatRoomLabel } from '../utils/scheduleDisplayUtils'
import './SessionAttendance.css'

const STATUS_LABELS: Record<AttendanceStatus, string> = {
    present: 'Có mặt',
    late: 'Đi muộn',
    excused: 'Vắng có phép',
    unexcused: 'Vắng không phép',
}

interface StudentDraftEdit {
    status: AttendanceStatus
    notes?: string
}

export function SessionAttendancePage() {
    const { scheduleId } = useParams<{ scheduleId: string }>()
    const navigate = useNavigate()
    const { request: requestFn } = useSession()

    // Phân trang & Tìm kiếm
    const [page, setPage] = useState<number>(1)
    const [limit, setLimit] = useState<number>(10)
    const [searchQuery, setSearchQuery] = useState<string>('')

    // Dữ liệu sổ điểm danh từ API
    const [sheetData, setSheetData] = useState<AttendanceSheetResponse | null>(null)
    const [pageStudents, setPageStudents] = useState<AttendanceStudentItem[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Quản lý bản nháp (Draft State) theo student_id — giữ nguyên khi chuyển trang và tìm kiếm
    const [draftEdits, setDraftEdits] = useState<Record<string, StudentDraftEdit>>({})
    const [markAllPresentDraft, setMarkAllPresentDraft] = useState<boolean>(false)
    const [isDirty, setIsDirty] = useState<boolean>(false)
    const [isSaving, setIsSaving] = useState<boolean>(false)

    // Refs để tránh stale closures khi load dữ liệu trang mới
    const draftEditsRef = useRef<Record<string, StudentDraftEdit>>(draftEdits)
    draftEditsRef.current = draftEdits
    const markAllPresentDraftRef = useRef<boolean>(markAllPresentDraft)
    markAllPresentDraftRef.current = markAllPresentDraft

    // Modal lịch sử chỉnh sửa
    const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false)
    const [historyLogs, setHistoryLogs] = useState<AttendanceAuditLogItem[]>([])
    const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)

    // Hàm áp dụng bản nháp vào danh sách học viên tải về từ Backend
    const mergeWithDraft = useCallback(
        (students: AttendanceStudentItem[], currentDrafts: Record<string, StudentDraftEdit>, allPresentMode: boolean) => {
            return students.map((st) => {
                const draft = currentDrafts[st.student_id]
                if (draft) {
                    return {
                        ...st,
                        status: draft.status,
                        status_label: STATUS_LABELS[draft.status],
                        notes: draft.notes !== undefined ? draft.notes : st.notes,
                    }
                }
                if (allPresentMode) {
                    return {
                        ...st,
                        status: 'present' as AttendanceStatus,
                        status_label: STATUS_LABELS.present,
                    }
                }
                return st
            })
        },
        [],
    )

    // Tải dữ liệu sổ điểm danh phân trang từ Backend
    const loadSheetData = useCallback(
        async (
            targetPage: number = page,
            targetLimit: number = limit,
            targetQ: string = searchQuery,
            isSilent: boolean = false,
        ) => {
            if (!scheduleId) return
            if (!isSilent) setIsLoading(true)
            setErrorMessage(null)
            try {
                const data = await getSessionAttendanceSheet(requestFn, scheduleId, {
                    page: targetPage,
                    limit: targetLimit,
                    q: targetQ,
                })
                setSheetData(data)
                const merged = mergeWithDraft(
                    data.students || [],
                    draftEditsRef.current,
                    markAllPresentDraftRef.current,
                )
                setPageStudents(merged)
            } catch (err: unknown) {
                // Request phân trang lỗi không xóa bản nháp hoặc báo danh sách rỗng
                setErrorMessage(getErrorMessage(err, 'Lỗi khi tải thông tin sổ điểm danh.'))
            } finally {
                if (!isSilent) setIsLoading(false)
            }
        },
        [scheduleId, requestFn, page, limit, searchQuery, mergeWithDraft],
    )

    // Tải lần đầu hoặc khi scheduleId thay đổi
    useEffect(() => {
        loadSheetData(1, limit, searchQuery)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scheduleId])

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

    // Điều hướng chuyển trang
    const handlePageChange = (newPage: number) => {
        if (newPage < 1) return
        if (sheetData?.pagination && newPage > sheetData.pagination.total_pages) return
        setPage(newPage)
        loadSheetData(newPage, limit, searchQuery)
    }

    // Đổi cỡ trang (10 hoặc 20 học viên/trang)
    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit)
        setPage(1)
        loadSheetData(1, newLimit, searchQuery)
    }

    // Tìm kiếm: Đổi từ khóa đưa về trang 1, không làm mất thay đổi chưa lưu
    const handleSearchChange = (q: string) => {
        setSearchQuery(q)
        setPage(1)
        loadSheetData(1, limit, q)
    }

    // Cập nhật trạng thái điểm danh cho một học viên
    const handleStatusChange = (studentId: string, newStatus: AttendanceStatus) => {
        if (!sheetData?.session_info.can_edit) return
        setDraftEdits((prev) => {
            const currentNotes =
                prev[studentId]?.notes !== undefined
                    ? prev[studentId].notes
                    : (pageStudents.find((s) => s.student_id === studentId)?.notes ?? '')
            return {
                ...prev,
                [studentId]: {
                    status: newStatus,
                    notes: currentNotes,
                },
            }
        })

        setPageStudents((prev) =>
            prev.map((s) =>
                s.student_id === studentId
                    ? { ...s, status: newStatus, status_label: STATUS_LABELS[newStatus] }
                    : s,
            ),
        )
        setIsDirty(true)
        setSuccessMessage(null)
    }

    // Cập nhật ghi chú cho học viên
    const handleNoteChange = (studentId: string, notes: string) => {
        if (!sheetData?.session_info.can_edit) return
        setDraftEdits((prev) => {
            const currentStatus =
                prev[studentId]?.status !== undefined
                    ? prev[studentId].status
                    : (pageStudents.find((s) => s.student_id === studentId)?.status ?? (markAllPresentDraft ? 'present' : null))
            return {
                ...prev,
                [studentId]: {
                    status: (currentStatus || 'present') as AttendanceStatus,
                    notes,
                },
            }
        })

        setPageStudents((prev) =>
            prev.map((s) => (s.student_id === studentId ? { ...s, notes } : s)),
        )
        setIsDirty(true)
    }

    // “Đánh dấu tất cả có mặt” áp dụng toàn bộ học viên đủ điều kiện của buổi
    // Bấm nút chỉ cập nhật bản nháp; chưa ghi DB trước khi bấm Lưu.
    const handleMarkAllPresent = () => {
        if (!sheetData?.session_info.can_edit) return
        setMarkAllPresentDraft(true)
        setIsDirty(true)
        setSuccessMessage(null)

        // Cập nhật các học viên trên trang hiện tại thành có mặt
        setPageStudents((prev) =>
            prev.map((s) => ({
                ...s,
                status: 'present',
                status_label: STATUS_LABELS.present,
            })),
        )
    }

    // Thống kê sĩ số/trạng thái phản ánh toàn buổi, không chỉ trang hiện tại
    // Phân biệt rõ số liệu đã lưu và thay đổi đang nhập
    const savedStats = sheetData?.stats || {
        total_students: 0,
        present_count: 0,
        late_count: 0,
        excused_count: 0,
        unexcused_count: 0,
        unmarked_count: 0,
    }

    const currentStats = useMemo(() => {
        const total = savedStats.total_students

        if (!isDirty) {
            return {
                total,
                present: savedStats.present_count,
                late: savedStats.late_count,
                excused: savedStats.excused_count,
                unexcused: savedStats.unexcused_count,
                unmarked: savedStats.unmarked_count,
                isDraft: false,
            }
        }

        if (markAllPresentDraft) {
            // Khi đánh dấu tất cả có mặt:
            // Mọi học viên mặc định là present, trừ các học viên bị override trong draftEdits
            const edits = Object.values(draftEdits)
            const lateCount = edits.filter((e) => e.status === 'late').length
            const excusedCount = edits.filter((e) => e.status === 'excused').length
            const unexcusedCount = edits.filter((e) => e.status === 'unexcused').length
            const nonPresentCount = lateCount + excusedCount + unexcusedCount
            const presentCount = Math.max(0, total - nonPresentCount)

            return {
                total,
                present: presentCount,
                late: lateCount,
                excused: excusedCount,
                unexcused: unexcusedCount,
                unmarked: 0,
                isDraft: true,
            }
        }

        // Trường hợp chỉnh sửa thủ công riêng lẻ
        return {
            total,
            present: savedStats.present_count,
            late: savedStats.late_count,
            excused: savedStats.excused_count,
            unexcused: savedStats.unexcused_count,
            unmarked: savedStats.unmarked_count,
            isDraft: true,
        }
    }, [savedStats, isDirty, markAllPresentDraft, draftEdits])

    // Danh sách học viên hiển thị trên trang hiện tại theo bộ lọc tìm kiếm
    const displayStudents = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return pageStudents
        return pageStudents.filter(
            (s) =>
                s.full_name.toLowerCase().includes(q) ||
                s.student_code.toLowerCase().includes(q) ||
                (s.email && s.email.toLowerCase().includes(q)),
        )
    }, [pageStudents, searchQuery])

    // Lưu toàn bộ thay đổi chưa lưu ở các trang
    const handleSaveAttendance = async () => {
        if (!scheduleId || !sheetData?.session_info.can_edit || isSaving) return

        if (!markAllPresentDraft && Object.keys(draftEdits).length === 0) {
            setErrorMessage('Vui lòng chọn trạng thái điểm danh cho ít nhất một học viên trước khi lưu.')
            return
        }

        setIsSaving(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            const payload: SaveAttendancePayload = {}

            if (markAllPresentDraft) {
                payload.mark_all_present = true
                payload.reason = 'Đánh dấu tất cả có mặt cho toàn bộ buổi học'
                if (Object.keys(draftEdits).length > 0) {
                    payload.attendances = Object.entries(draftEdits).map(([sId, edit]) => ({
                        student_id: sId,
                        status: edit.status,
                        notes: edit.notes?.trim() || undefined,
                    }))
                    payload.reason = 'Đánh dấu tất cả có mặt và cập nhật các học viên ngoại lệ'
                }
            } else {
                payload.attendances = Object.entries(draftEdits).map(([sId, edit]) => ({
                    student_id: sId,
                    status: edit.status,
                    notes: edit.notes?.trim() || undefined,
                }))
                payload.reason = `Cập nhật điểm danh cho ${Object.keys(draftEdits).length} học viên`
            }

            const res = await saveSessionAttendance(requestFn, scheduleId, payload)
            setSuccessMessage(res.message || 'Lưu kết quả điểm danh thành công!')
            setDraftEdits({})
            setMarkAllPresentDraft(false)
            setIsDirty(false)

            // Tải lại đúng trang hiện tại với dữ liệu mới nhất
            await loadSheetData(page, limit, searchQuery, true)
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

    if (isLoading && !sheetData) {
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
                <div
                    className="attendance-restriction-alert"
                    style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#b91c1c' }}
                >
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
    const pagination = sheetData?.pagination || {
        page,
        limit,
        total_items: pageStudents.length,
        total_pages: 1,
    }

    const fromItem = pagination.total_items === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
    const toItem = Math.min(pagination.page * pagination.limit, pagination.total_items)

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

            {/* Thông báo lỗi / thành công */}
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
                                Điểm danh Buổi #{sessionInfo.session_number}
                            </h1>
                            <p className="attendance-session-subtitle">
                                Môn học: <strong>{sessionInfo.subject_name}</strong> • Lớp:{' '}
                                <strong>{sessionInfo.class_code}</strong>
                                {sessionInfo.topic && sessionInfo.topic.trim() && (
                                    <>
                                        {' '}• Chủ đề: <strong>{sessionInfo.topic}</strong>
                                    </>
                                )}
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
                                {formatSessionShiftAndTime(sessionInfo.shift, sessionInfo.start_time, sessionInfo.end_time)}
                            </span>
                        </div>
                        <div className="attendance-meta-item">
                            <span className="attendance-meta-label">Phòng học</span>
                            <span className="attendance-meta-value">
                                {formatRoomLabel(sessionInfo.room_id, sessionInfo.room_name)}
                            </span>
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

            {/* Thanh cảnh báo có bản nháp chưa lưu */}
            {isDirty && (
                <div className="draft-indicator-banner" data-testid="draft-indicator-banner">
                    <span>
                        📝 <strong>Bản nháp đang chỉnh sửa:</strong> Bạn có thay đổi chưa lưu
                        {markAllPresentDraft && ' (Đã chọn Đánh dấu tất cả có mặt)'}
                        {Object.keys(draftEdits).length > 0 &&
                            ` (${Object.keys(draftEdits).length} học viên có chỉnh sửa riêng)`}.
                        Dữ liệu sẽ được giữ nguyên khi chuyển trang hoặc tìm kiếm.
                    </span>
                    <span style={{ fontSize: '11px', color: '#b45309' }}>
                        Chưa lưu vào cơ sở dữ liệu
                    </span>
                </div>
            )}

            {/* Quick Stats Ribbon — Phản ánh toàn buổi, phân biệt đã lưu và bản nháp */}
            <div className="attendance-stats-ribbon" data-testid="attendance-stats-ribbon">
                <div className="attendance-stat-box">
                    <span className="stat-box-num" data-testid="stat-total">{currentStats.total}</span>
                    <span className="stat-box-label">Sĩ số toàn buổi</span>
                </div>
                <div className="attendance-stat-box present">
                    <span className="stat-box-num" style={{ color: '#16a34a' }} data-testid="stat-present">
                        {currentStats.present}
                    </span>
                    <span className="stat-box-label">
                        Có mặt
                        {isDirty && savedStats.present_count !== currentStats.present && (
                            <span style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 'normal' }}>
                                (Đã lưu: {savedStats.present_count})
                            </span>
                        )}
                    </span>
                </div>
                <div className="attendance-stat-box late">
                    <span className="stat-box-num" style={{ color: '#d97706' }} data-testid="stat-late">
                        {currentStats.late}
                    </span>
                    <span className="stat-box-label">
                        Đi muộn
                        {isDirty && savedStats.late_count !== currentStats.late && (
                            <span style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 'normal' }}>
                                (Đã lưu: {savedStats.late_count})
                            </span>
                        )}
                    </span>
                </div>
                <div className="attendance-stat-box excused">
                    <span className="stat-box-num" style={{ color: '#0284c7' }} data-testid="stat-excused">
                        {currentStats.excused}
                    </span>
                    <span className="stat-box-label">
                        Vắng có phép
                        {isDirty && savedStats.excused_count !== currentStats.excused && (
                            <span style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 'normal' }}>
                                (Đã lưu: {savedStats.excused_count})
                            </span>
                        )}
                    </span>
                </div>
                <div className="attendance-stat-box unexcused">
                    <span className="stat-box-num" style={{ color: '#dc2626' }} data-testid="stat-unexcused">
                        {currentStats.unexcused}
                    </span>
                    <span className="stat-box-label">
                        Vắng không phép
                        {isDirty && savedStats.unexcused_count !== currentStats.unexcused && (
                            <span style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 'normal' }}>
                                (Đã lưu: {savedStats.unexcused_count})
                            </span>
                        )}
                    </span>
                </div>
                <div className="attendance-stat-box unmarked">
                    <span className="stat-box-num" style={{ color: '#64748b' }} data-testid="stat-unmarked">
                        {currentStats.unmarked}
                    </span>
                    <span className="stat-box-label">
                        Chưa điểm danh
                        {isDirty && savedStats.unmarked_count !== currentStats.unmarked && (
                            <span style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 'normal' }}>
                                (Đã lưu: {savedStats.unmarked_count})
                            </span>
                        )}
                    </span>
                </div>
            </div>

            {/* Action Toolbar */}
            <div className="attendance-toolbar">
                <div className="attendance-search-box">
                    <span className="attendance-search-icon">🔍</span>
                    <input
                        type="text"
                        className="attendance-search-input"
                        placeholder="Tìm kiếm theo mã, họ tên hoặc email học viên..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
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
                            title={`Đánh dấu tất cả ${savedStats.total_students} học viên của buổi có mặt`}
                        >
                            <span>✓</span>
                            <span>Đánh dấu tất cả có mặt (toàn bộ {savedStats.total_students} học viên)</span>
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
                        {displayStudents.length > 0 ? (
                            displayStudents.map((st, index) => {
                                const canEdit = Boolean(sessionInfo?.can_edit)
                                const rowNumber = (pagination.page - 1) * pagination.limit + index + 1
                                return (
                                    <tr key={st.student_id} data-testid={`row-student-${st.student_id}`}>
                                        <td style={{ textAlign: 'center', color: '#64748b' }}>{rowNumber}</td>
                                        <td>
                                            <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                                {st.student_code}
                                            </span>
                                        </td>
                                        <td style={{ minWidth: '180px', maxWidth: '300px' }}>
                                            <div style={{ fontWeight: 600, color: '#0f172a', wordBreak: 'break-word' }}>
                                                {st.full_name}
                                            </div>
                                            {st.email && (
                                                <div style={{ fontSize: '12px', color: '#64748b', wordBreak: 'break-all', marginTop: '2px' }}>
                                                    {st.email}
                                                </div>
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
                {displayStudents.length > 0 ? (
                    displayStudents.map((st) => {
                        const canEdit = Boolean(sessionInfo?.can_edit)
                        return (
                            <div className="attendance-student-card" key={st.student_id} data-testid={`card-student-${st.student_id}`}>
                                <div className="attendance-card-header">
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="card-student-name">{st.full_name}</div>
                                        <div className="card-student-code">{st.student_code}</div>
                                        {st.email && (
                                            <div style={{ fontSize: '12px', color: '#64748b', wordBreak: 'break-all', marginTop: '2px' }}>
                                                {st.email}
                                            </div>
                                        )}
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

            {/* Thanh phân trang Backend (10 hoặc 20 học viên/trang) */}
            <div className="attendance-pagination-bar" data-testid="attendance-pagination">
                <div className="pagination-info" data-testid="pagination-info">
                    {fromItem}–{toItem} / {pagination.total_items} học viên
                </div>

                <div className="pagination-controls">
                    <label className="pagination-limit-label">
                        <span>Hiển thị:</span>
                        <select
                            className="pagination-select"
                            value={limit}
                            onChange={(e) => handleLimitChange(Number(e.target.value))}
                            data-testid="pagination-limit-select"
                        >
                            <option value={10}>10 học viên / trang</option>
                            <option value={20}>20 học viên / trang</option>
                        </select>
                    </label>

                    <button
                        type="button"
                        className="pagination-btn"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1}
                        data-testid="pagination-prev-btn"
                    >
                        ← Trước
                    </button>

                    <span className="pagination-page-indicator" data-testid="pagination-page-indicator">
                        Trang {page} / {pagination.total_pages}
                    </span>

                    <button
                        type="button"
                        className="pagination-btn"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= pagination.total_pages}
                        data-testid="pagination-next-btn"
                    >
                        Sau →
                    </button>
                </div>
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
