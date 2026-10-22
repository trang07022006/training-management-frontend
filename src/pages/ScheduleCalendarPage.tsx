import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    getCalendarSchedules,
    type CalendarScheduleItem,
} from '../api/scheduleApi'
import { listClasses, type TrainingClass } from '../api/classApi'
import { fetchUsersApi, type User } from '../api/userApi'
import {
    formatShiftLabel,
    formatRoomLabel,
    formatInstructorLabel,
    formatScheduleStatus,
} from '../utils/scheduleDisplayUtils'
import { PageHeader } from '../components/PageHeader'
import './ScheduleCalendarPage.css'

function formatDateISO(d: Date): string {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function getMonday(d: Date): Date {
    const date = new Date(d)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    return new Date(date.setDate(diff))
}

function addDays(d: Date, days: number): Date {
    const res = new Date(d)
    res.setDate(res.getDate() + days)
    return res
}

const WEEKDAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']

export function ScheduleCalendarPage() {
    const navigate = useNavigate()
    const session = useSession()
    const requestFn = session.request

    // Chế độ xem: Tuần hoặc Tháng (SCRUM-227 AC 1)
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
    // Ngày mốc đang xem (mặc định là hôm nay)
    const [currentDate, setCurrentDate] = useState<Date>(new Date())

    // Bộ lọc (SCRUM-227 AC 2)
    const [filterClassId, setFilterClassId] = useState<string>('')
    const [filterInstructorId, setFilterInstructorId] = useState<string>('')
    const [filterRoomId, setFilterRoomId] = useState<string>('')

    // Dữ liệu thời khóa biểu
    const [schedules, setSchedules] = useState<CalendarScheduleItem[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    // Dữ liệu cho bộ lọc dropdown
    const [classesList, setClassesList] = useState<TrainingClass[]>([])
    const [instructorsList, setInstructorsList] = useState<User[]>([])

    // Modal chi tiết buổi học (SCRUM-227 AC 3)
    const [selectedSchedule, setSelectedSchedule] = useState<CalendarScheduleItem | null>(null)

    // Tính toán khoảng ngày theo tuần hoặc tháng
    const { dateFrom, dateTo, periodTitle } = useMemo(() => {
        if (viewMode === 'week') {
            const monday = getMonday(currentDate)
            const sunday = addDays(monday, 6)
            const fromStr = formatDateISO(monday)
            const toStr = formatDateISO(sunday)
            const title = `Tuần từ ${monday.toLocaleDateString('vi-VN')} đến ${sunday.toLocaleDateString('vi-VN')}`
            return { dateFrom: fromStr, dateTo: toStr, periodTitle: title }
        } else {
            const year = currentDate.getFullYear()
            const month = currentDate.getMonth()
            const firstDay = new Date(year, month, 1)
            const lastDay = new Date(year, month + 1, 0)
            const fromStr = formatDateISO(firstDay)
            const toStr = formatDateISO(lastDay)
            const title = `Tháng ${month + 1}/${year}`
            return { dateFrom: fromStr, dateTo: toStr, periodTitle: title }
        }
    }, [viewMode, currentDate])

    // Load danh sách lớp và giảng viên phục vụ bộ lọc
    useEffect(() => {
        if (!requestFn) return
        listClasses(requestFn, { page: 1, page_size: 100 })
            .then((res) => {
                const list = res.items || (res as any).classes || []
                setClassesList(list)
            })
            .catch(() => {})

        fetchUsersApi(requestFn, { page: 1, page_size: 100, role: 'trainer' })
            .then((res) => {
                const list = (res as any).items || (res as any).users || []
                setInstructorsList(list)
            })
            .catch(() => {})
    }, [requestFn])

    // Load dữ liệu lịch theo khoảng ngày và bộ lọc
    const loadSchedules = useCallback(async () => {
        if (!requestFn) return
        setLoading(true)
        setError(null)
        try {
            const res = await getCalendarSchedules(requestFn, {
                date_from: dateFrom,
                date_to: dateTo,
                class_id: filterClassId || undefined,
                instructor_id: filterInstructorId || undefined,
                room_id: filterRoomId.trim() || undefined,
                view_mode: viewMode,
            })
            setSchedules(res.schedules || [])
        } catch (err: any) {
            setError(err?.message || 'Lỗi khi tải lịch thời khóa biểu.')
        } finally {
            setLoading(false)
        }
    }, [requestFn, dateFrom, dateTo, filterClassId, filterInstructorId, filterRoomId, viewMode])

    useEffect(() => {
        loadSchedules()
    }, [loadSchedules])

    // Điều hướng thời gian
    const handlePrev = () => {
        if (viewMode === 'week') {
            setCurrentDate((prev) => addDays(prev, -7))
        } else {
            setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
        }
    }

    const handleNext = () => {
        if (viewMode === 'week') {
            setCurrentDate((prev) => addDays(prev, 7))
        } else {
            setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
        }
    }

    const handleToday = () => {
        setCurrentDate(new Date())
    }

    const handleResetFilters = () => {
        setFilterClassId('')
        setFilterInstructorId('')
        setFilterRoomId('')
    }

    // Nhóm buổi học theo ngày (YYYY-MM-DD)
    const schedulesByDate = useMemo(() => {
        const map = new Map<string, CalendarScheduleItem[]>()
        for (const item of schedules) {
            const ld = item.learning_date
            if (!map.has(ld)) {
                map.set(ld, [])
            }
            map.get(ld)!.push(item)
        }
        return map
    }, [schedules])

    // Danh sách 7 ngày trong tuần cho Week View
    const weekDays = useMemo(() => {
        const monday = getMonday(currentDate)
        return Array.from({ length: 7 }, (_, i) => {
            const d = addDays(monday, i)
            const dateStr = formatDateISO(d)
            const isToday = formatDateISO(new Date()) === dateStr
            return {
                date: d,
                dateStr,
                dayName: WEEKDAY_NAMES[i],
                displayDate: `${d.getDate()}/${d.getMonth() + 1}`,
                isToday,
            }
        })
    }, [currentDate])

    // Danh sách ngày cho Month View (lưới lịch 35 hoặc 42 ô)
    const monthCalendarGrid = useMemo(() => {
        if (viewMode !== 'month') return []
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const firstDayOfMonth = new Date(year, month, 1)
        const lastDayOfMonth = new Date(year, month + 1, 0)

        // Tìm thứ Hai đầu tiên của lưới
        const firstGridDay = getMonday(firstDayOfMonth)
        const days = []
        let curr = new Date(firstGridDay)
        const todayStr = formatDateISO(new Date())

        while (curr <= lastDayOfMonth || days.length % 7 !== 0) {
            const dateStr = formatDateISO(curr)
            const isCurrentMonth = curr.getMonth() === month
            const isToday = dateStr === todayStr
            days.push({
                date: new Date(curr),
                dateStr,
                dayNum: curr.getDate(),
                isCurrentMonth,
                isToday,
            })
            curr = addDays(curr, 1)
        }
        return days
    }, [viewMode, currentDate])

    return (
        <div className="schedule-calendar-container" data-testid="schedule-calendar-page">
            {/* Header trang */}
            <div className="calendar-header-section">
                <PageHeader title="Thời khóa biểu" subtitle="Xem lịch tuần, tháng và tra cứu buổi học theo lớp, giảng viên, phòng học." />

                {/* Nút chuyển đổi Tuần / Tháng (AC 1) */}
                <div className="view-mode-toggle" role="group" aria-label="Chế độ xem">
                    <button
                        type="button"
                        className={`btn-toggle ${viewMode === 'week' ? 'active' : ''}`}
                        onClick={() => setViewMode('week')}
                        data-testid="btn-view-week"
                    >
                        📅 Xem theo Tuần
                    </button>
                    <button
                        type="button"
                        className={`btn-toggle ${viewMode === 'month' ? 'active' : ''}`}
                        onClick={() => setViewMode('month')}
                        data-testid="btn-view-month"
                    >
                        🗓️ Xem theo Tháng
                    </button>
                </div>
            </div>

            {/* Thanh điều hướng thời gian */}
            <div className="calendar-controls-bar">
                <div className="navigation-group">
                    <button
                        type="button"
                        className="btn-nav"
                        onClick={handlePrev}
                        data-testid="btn-prev-period"
                        aria-label="Khoảng thời gian trước"
                    >
                        ← Trước
                    </button>
                    <button
                        type="button"
                        className="btn-nav btn-today"
                        onClick={handleToday}
                        data-testid="btn-today"
                    >
                        Hôm nay
                    </button>
                    <button
                        type="button"
                        className="btn-nav"
                        onClick={handleNext}
                        data-testid="btn-next-period"
                        aria-label="Khoảng thời gian sau"
                    >
                        Sau →
                    </button>
                    <h2 className="current-period-title" data-testid="period-title">
                        {periodTitle}
                    </h2>
                </div>

                <div className="summary-counter">
                    <span className="count-badge">Tổng số: {schedules.length} buổi học</span>
                </div>
            </div>

            {/* Bộ lọc (AC 2) */}
            <div className="calendar-filter-card" data-testid="calendar-filters">
                <div className="filter-grid">
                    <div className="filter-item">
                        <label htmlFor="filter-class-select">Lọc theo lớp học:</label>
                        <select
                            id="filter-class-select"
                            className="form-control"
                            value={filterClassId}
                            onChange={(e) => setFilterClassId(e.target.value)}
                            data-testid="filter-class-select"
                        >
                            <option value="">-- Tất cả lớp học --</option>
                            {classesList.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.class_code} {c.program_name ? `(${c.program_name})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-item">
                        <label htmlFor="filter-instructor-select">Lọc theo giảng viên:</label>
                        <select
                            id="filter-instructor-select"
                            className="form-control"
                            value={filterInstructorId}
                            onChange={(e) => setFilterInstructorId(e.target.value)}
                            data-testid="filter-instructor-select"
                        >
                            <option value="">-- Tất cả giảng viên --</option>
                            {instructorsList.map((inst) => (
                                <option key={inst.id} value={inst.id}>
                                    {inst.name} ({inst.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-item">
                        <label htmlFor="filter-room-input">Lọc theo phòng học:</label>
                        <input
                            id="filter-room-input"
                            type="text"
                            className="form-control"
                            placeholder="Ví dụ: P201, Lab 3, UAT-P20..."
                            value={filterRoomId}
                            onChange={(e) => setFilterRoomId(e.target.value)}
                            data-testid="filter-room-input"
                        />
                    </div>

                    <div className="filter-actions">
                        <button
                            type="button"
                            className="btn-reset"
                            onClick={handleResetFilters}
                            data-testid="btn-reset-filters"
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                </div>
            </div>

            {/* Thông báo lỗi */}
            {error && (
                <div className="calendar-alert error" data-testid="calendar-error-alert">
                    <span>⚠️ {error}</span>
                </div>
            )}

            {/* Nội dung lịch */}
            {loading ? (
                <div className="calendar-loading-state" data-testid="calendar-loading">
                    <p>Đang tải dữ liệu thời khóa biểu...</p>
                </div>
            ) : viewMode === 'week' ? (
                /* CHẾ ĐỘ XEM THEO TUẦN (AC 1, AC 4) */
                <div className="week-calendar-view" data-testid="week-calendar-view">
                    <div className="week-grid">
                        {weekDays.map((col) => {
                            const daySchedules = schedulesByDate.get(col.dateStr) || []
                            return (
                                <div
                                    key={col.dateStr}
                                    className={`week-day-column ${col.isToday ? 'today-col' : ''}`}
                                    data-testid={`week-col-${col.dateStr}`}
                                >
                                    <div className="week-col-header">
                                        <span className="col-day-name">{col.dayName}</span>
                                        <span className="col-date-text">{col.displayDate}</span>
                                    </div>

                                    <div className="week-col-body">
                                        {daySchedules.length === 0 ? (
                                            <div className="empty-day-slot">Trống</div>
                                        ) : (
                                            daySchedules.map((sess) => (
                                                <div
                                                    key={sess.id}
                                                    className={`session-card status-${sess.status || 'scheduled'}`}
                                                    onClick={() => setSelectedSchedule(sess)}
                                                    data-testid={`session-card-${sess.id}`}
                                                    role="button"
                                                    tabIndex={0}
                                                >
                                                    <div className="card-top-row">
                                                        <span className="card-time">
                                                            {sess.start_time.slice(0, 5)} - {sess.end_time.slice(0, 5)}
                                                        </span>
                                                        <span className="card-class-badge">{sess.class_code}</span>
                                                    </div>

                                                    <div className="card-topic" title={sess.topic}>
                                                        #{sess.session_number}: {sess.topic}
                                                    </div>

                                                    <div className="card-meta">
                                                        {sess.room_id && (
                                                            <span className="card-room">🏫 {sess.room_id}</span>
                                                        )}
                                                        {sess.instructor_name && (
                                                            <span className="card-inst">👨‍🏫 {sess.instructor_name}</span>
                                                        )}
                                                    </div>

                                                    {sess.status === 'cancelled' && (
                                                        <div className="card-cancelled-tag">Đã huỷ</div>
                                                    )}
                                                    {sess.status === 'rescheduled' && (
                                                        <div className="card-rescheduled-tag">Đã dời</div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                /* CHẾ ĐỘ XEM THEO THÁNG (AC 1, AC 4) */
                <div className="month-calendar-view" data-testid="month-calendar-view">
                    <div className="month-weekday-header">
                        {WEEKDAY_NAMES.map((w) => (
                            <div key={w} className="month-weekday-cell">
                                {w}
                            </div>
                        ))}
                    </div>

                    <div className="month-grid">
                        {monthCalendarGrid.map((cell) => {
                            const daySchedules = schedulesByDate.get(cell.dateStr) || []
                            return (
                                <div
                                    key={cell.dateStr}
                                    className={`month-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${
                                        cell.isToday ? 'today-cell' : ''
                                    }`}
                                    data-testid={`month-cell-${cell.dateStr}`}
                                >
                                    <div className="month-cell-header">
                                        <span className="month-day-num">{cell.dayNum}</span>
                                        {daySchedules.length > 0 && (
                                            <span className="month-day-count">{daySchedules.length} buổi</span>
                                        )}
                                    </div>

                                    <div className="month-cell-events">
                                        {daySchedules.slice(0, 3).map((sess) => (
                                            <div
                                                key={sess.id}
                                                className={`mini-event-pill status-${sess.status || 'scheduled'}`}
                                                onClick={() => setSelectedSchedule(sess)}
                                                data-testid={`mini-event-${sess.id}`}
                                                title={`${sess.class_code} - ${sess.topic}`}
                                                role="button"
                                                tabIndex={0}
                                            >
                                                <span className="pill-time">{sess.start_time.slice(0, 5)}</span>
                                                <span className="pill-title">{sess.class_code}</span>
                                            </div>
                                        ))}
                                        {daySchedules.length > 3 && (
                                            <div className="more-events-tag">
                                                +{daySchedules.length - 3} buổi khác
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* MODAL CHI TIẾT BUỔI HỌC (SCRUM-227 AC 3) */}
            {selectedSchedule && (
                <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="schedule-detail-modal">
                    <div className="detail-modal-card">
                        <div className="modal-header">
                            <div className="detail-header-title">
                                <h3>
                                    Buổi #{selectedSchedule.session_number} • Lớp {selectedSchedule.class_code}
                                </h3>
                                <span className="detail-date-badge">
                                    {selectedSchedule.day_of_week}, ngày {selectedSchedule.learning_date}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setSelectedSchedule(null)}
                                data-testid="btn-close-detail-modal"
                                aria-label="Đóng"
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body detail-modal-body">
                            {selectedSchedule.status === 'cancelled' && (
                                <div className="detail-alert-cancelled" data-testid="detail-cancelled-alert">
                                    <strong>⚠️ Buổi học này đã bị hủy</strong>
                                    {selectedSchedule.cancellation_reason && (
                                        <p>Lý do: {selectedSchedule.cancellation_reason}</p>
                                    )}
                                </div>
                            )}

                            <div className="detail-info-grid">
                                <div className="detail-row full-width">
                                    <span className="detail-label">Nội dung bài học:</span>
                                    <span className="detail-value topic-highlight" data-testid="detail-topic">
                                        {selectedSchedule.topic}
                                    </span>
                                </div>

                                {selectedSchedule.subject_name && (
                                    <div className="detail-row full-width">
                                        <span className="detail-label">Môn học:</span>
                                        <span className="detail-value" data-testid="detail-subject">
                                            {selectedSchedule.subject_name} ({selectedSchedule.subject_code})
                                        </span>
                                    </div>
                                )}

                                <div className="detail-row">
                                    <span className="detail-label">Khung giờ học:</span>
                                    <span className="detail-value" data-testid="detail-time">
                                        {formatShiftLabel(selectedSchedule.shift, selectedSchedule.start_time, selectedSchedule.end_time)}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Phòng học:</span>
                                    <span className="detail-value" data-testid="detail-room">
                                        {formatRoomLabel(selectedSchedule.room_id, selectedSchedule.room_name, Boolean(selectedSchedule.online_link), selectedSchedule.online_link)}
                                        {selectedSchedule.online_link && (
                                            <a
                                                href={selectedSchedule.online_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ marginLeft: 8, color: '#2563eb', textDecoration: 'underline' }}
                                            >
                                                🔗 Học trực tuyến
                                            </a>
                                        )}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Giảng viên:</span>
                                    <span className="detail-value" data-testid="detail-instructor">
                                        {formatInstructorLabel(selectedSchedule.instructor_name, selectedSchedule.instructor_id)}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Trạng thái buổi học:</span>
                                    <span className="detail-value" data-testid="detail-status">
                                        {(() => {
                                            const st = formatScheduleStatus(selectedSchedule.status)
                                            return (
                                                <span className={`status-tag status-${st.className}`}>
                                                    {st.label}
                                                </span>
                                            )
                                        })()}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Tình trạng điểm danh:</span>
                                    <span className="detail-value" data-testid="detail-attendance">
                                        {selectedSchedule.attendance_checked ? (
                                            <span className="badge-locked">🔒 Đã điểm danh</span>
                                        ) : (
                                            <span className="badge-unlocked">Chưa điểm danh</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setSelectedSchedule(null)}
                            >
                                Đóng
                            </button>
                            {selectedSchedule.class_id && (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    data-testid="btn-view-schedule-detail"
                                    onClick={() => {
                                        navigate(`/classes/${selectedSchedule.class_id}/schedules/${selectedSchedule.id}`)
                                    }}
                                >
                                    Xem chi tiết buổi học
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
