import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from '../auth/SessionProvider'
import {
    getMyPersonalSchedule,
    type StudentPersonalScheduleResponse,
} from '../api/scheduleApi'
import './StudentSchedulePage.css'

function formatDateISO(d: Date): string {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function getMonday(d: Date): Date {
    const date = new Date(d)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Thứ 2 là ngày đầu tuần
    return new Date(date.setDate(diff))
}

function addDays(d: Date, days: number): Date {
    const res = new Date(d)
    res.setDate(res.getDate() + days)
    return res
}

export function StudentSchedulePage() {
    const session = useSession()
    const requestFn = session.request

    // Ngày mốc của tuần đang xem (mặc định hôm nay)
    const [currentDate, setCurrentDate] = useState<Date>(new Date())

    // Dữ liệu từ API
    const [scheduleData, setScheduleData] = useState<StudentPersonalScheduleResponse | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    // Tính khoảng ngày Thứ 2 -> Chủ nhật của tuần đang chọn
    const { dateFrom, dateTo, periodTitle } = useMemo(() => {
        const monday = getMonday(currentDate)
        const sunday = addDays(monday, 6)
        const fromStr = formatDateISO(monday)
        const toStr = formatDateISO(sunday)
        const title = `Tuần từ ${monday.toLocaleDateString('vi-VN')} đến ${sunday.toLocaleDateString('vi-VN')}`
        return { dateFrom: fromStr, dateTo: toStr, periodTitle: title }
    }, [currentDate])

    // Load dữ liệu lịch cá nhân
    const loadSchedule = useCallback(async () => {
        if (!requestFn) return
        setLoading(true)
        setError(null)
        try {
            const data = await getMyPersonalSchedule(requestFn, {
                date_from: dateFrom,
                date_to: dateTo,
            })
            setScheduleData(data)
        } catch (err: any) {
            setError(err?.message || 'Không thể tải thời khóa biểu cá nhân.')
        } finally {
            setLoading(false)
        }
    }, [requestFn, dateFrom, dateTo])

    useEffect(() => {
        loadSchedule()
    }, [loadSchedule])

    // Điều hướng tuần
    const handlePrevWeek = () => {
        setCurrentDate((prev) => addDays(prev, -7))
    }

    const handleNextWeek = () => {
        setCurrentDate((prev) => addDays(prev, 7))
    }

    const handleCurrentWeek = () => {
        setCurrentDate(new Date())
    }

    const todayISO = formatDateISO(new Date())
    const nextSession = scheduleData?.next_session
    const weekSessions = scheduleData?.week_sessions || []
    const student = scheduleData?.student
    const enrolledClasses = scheduleData?.enrolled_classes || []

    return (
        <div className="student-schedule-container" data-testid="student-schedule-page">
            {/* Header */}
            <div className="schedule-header">
                <div>
                    <h1>Lịch học của tôi</h1>
                    <p>Theo dõi buổi học sắp diễn ra và lịch học trong tuần theo các lớp đã ghi danh</p>
                </div>

                {student && (
                    <div className="student-profile-pill" data-testid="student-profile-pill">
                        <div className="student-avatar">
                            {student.full_name ? student.full_name.charAt(0).toUpperCase() : 'H'}
                        </div>
                        <div className="student-info-meta">
                            <span className="student-name-text">{student.full_name}</span>
                            <span className="student-code-text">
                                {student.student_code} {student.program_name ? `• ${student.program_name}` : ''}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Error Alert */}
            {error && (
                <div className="schedule-alert-error" data-testid="schedule-error-alert">
                    <span>⚠️ {error}</span>
                </div>
            )}

            {/* Loading Indicator */}
            {loading && !scheduleData && (
                <div className="schedule-loading-bar" data-testid="schedule-loading">
                    Đang tải thời khóa biểu của bạn...
                </div>
            )}

            {/* Trường hợp chưa ghi danh lớp nào */}
            {scheduleData && enrolledClasses.length === 0 && (
                <div className="schedule-empty-state" data-testid="no-enrollments-state">
                    <span className="empty-state-icon">📚</span>
                    <h3>Chưa có lớp học nào được ghi danh</h3>
                    <p>
                        Hồ sơ của bạn hiện chưa được ghi danh vào lớp đào tạo nào.
                        Vui lòng liên hệ Quản lý đào tạo hoặc Bộ phận tuyển sinh để được xếp lớp.
                    </p>
                </div>
            )}

            {/* Nội dung chính khi đã có thông tin lớp */}
            {scheduleData && (enrolledClasses.length > 0 || weekSessions.length > 0 || nextSession) && (
                <>
                    {/* Hero Section: Buổi học kế tiếp (SCRUM-228 AC 1) */}
                    {nextSession ? (
                        <div className="next-session-hero" data-testid="next-session-hero">
                            <span className="hero-label">🚀 Buổi học kế tiếp sắp tới</span>
                            <div className="hero-body">
                                <div className="hero-main-info">
                                    <div className="hero-date-time">
                                        <span className="hero-day-tag">{nextSession.day_of_week || 'Buổi học'}</span>
                                        <span className="hero-date-str">
                                            {nextSession.learning_date} ({nextSession.start_time.substring(0, 5)} - {nextSession.end_time.substring(0, 5)})
                                        </span>
                                    </div>
                                    <h2 className="hero-topic-title" data-testid="hero-topic-title">
                                        {nextSession.topic || `Buổi số ${nextSession.session_number}`}
                                    </h2>
                                    <div className="hero-subject-desc">
                                        <strong>{nextSession.subject_name || nextSession.subject_code}</strong> • Lớp {nextSession.class_code} • Buổi #{nextSession.session_number}
                                    </div>
                                    <div className="hero-meta-row">
                                        {nextSession.instructor_name && (
                                            <div className="hero-meta-item">
                                                <span>👨‍🏫 Giảng viên:</span>
                                                <strong>{nextSession.instructor_name}</strong>
                                            </div>
                                        )}
                                        {nextSession.shift && (
                                            <div className="hero-meta-item">
                                                <span>⏰ Ca:</span>
                                                <span>{nextSession.shift}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="hero-action-box">
                                    {nextSession.is_online && nextSession.online_url ? (
                                        <a
                                            href={nextSession.online_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn-join-meeting"
                                            data-testid="btn-join-next-meeting"
                                        >
                                            <span>📹 Vào phòng học trực tuyến</span>
                                            <span>↗</span>
                                        </a>
                                    ) : (
                                        <div className="physical-room-badge" data-testid="hero-physical-room">
                                            <span>📍 Phòng học:</span>
                                            <strong>{nextSession.room_name || nextSession.room_id || 'Chưa xếp phòng'}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-next-session" data-testid="no-next-session">
                            <p>🌟 Bạn đã hoàn thành các buổi học đã xếp hoặc hiện chưa có buổi học kế tiếp nào sắp tới.</p>
                        </div>
                    )}

                    {/* Section: Các buổi học trong tuần (SCRUM-228 AC 1 & AC 2) */}
                    <div className="section-nav-bar">
                        <h2 className="section-title">
                            <span>📅 Lịch học trong tuần</span>
                            <span className="session-count-badge" data-testid="session-count-badge">
                                {weekSessions.length} buổi
                            </span>
                        </h2>

                        <div className="week-navigation-group">
                            <button
                                type="button"
                                className="btn-nav-week"
                                onClick={handlePrevWeek}
                                data-testid="btn-prev-week"
                            >
                                ← Tuần trước
                            </button>
                            <span className="nav-period-title" data-testid="period-title">
                                {periodTitle}
                            </span>
                            <button
                                type="button"
                                className="btn-nav-week"
                                onClick={handleNextWeek}
                                data-testid="btn-next-week"
                            >
                                Tuần sau →
                            </button>
                            <button
                                type="button"
                                className="btn-nav-week today-btn"
                                onClick={handleCurrentWeek}
                                data-testid="btn-current-week"
                            >
                                Tuần này
                            </button>
                        </div>
                    </div>

                    {/* Danh sách các buổi học */}
                    {weekSessions.length > 0 ? (
                        <div className="week-sessions-grid" data-testid="week-sessions-grid">
                            {weekSessions.map((sessionItem) => {
                                const isToday = sessionItem.learning_date === todayISO
                                const isCancelled = sessionItem.status === 'cancelled'

                                return (
                                    <div
                                        key={sessionItem.id}
                                        className={`student-session-card ${isToday ? 'is-today-session' : ''} ${isCancelled ? 'status-cancelled' : ''}`}
                                        data-testid={`session-card-${sessionItem.id}`}
                                    >
                                        <div>
                                            <div className="card-top-row">
                                                <span className="card-date-badge">
                                                    {sessionItem.day_of_week || 'Lịch'} • {sessionItem.learning_date}
                                                </span>
                                                <span className="card-time-text">
                                                    {sessionItem.start_time.substring(0, 5)} - {sessionItem.end_time.substring(0, 5)}
                                                </span>
                                            </div>

                                            <h3 className="card-topic-title">
                                                {sessionItem.topic || `Buổi số ${sessionItem.session_number}`}
                                            </h3>

                                            <div className="card-sub-info">
                                                <span className="card-class-tag">{sessionItem.class_code}</span>
                                                <span>{sessionItem.subject_name || sessionItem.subject_code}</span>
                                            </div>

                                            <div className="card-meta-list">
                                                {sessionItem.instructor_name && (
                                                    <div className="card-meta-item">
                                                        <span>👨‍🏫 GV:</span>
                                                        <span>{sessionItem.instructor_name}</span>
                                                    </div>
                                                )}
                                                {sessionItem.shift && (
                                                    <div className="card-meta-item">
                                                        <span>⏰ Ca:</span>
                                                        <span>{sessionItem.shift}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Phòng học hoặc liên kết học trực tuyến */}
                                        <div>
                                            <div className="card-location-row">
                                                {sessionItem.is_online && sessionItem.online_url ? (
                                                    <a
                                                        href={sessionItem.online_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="link-online-room"
                                                        data-testid={`link-online-${sessionItem.id}`}
                                                    >
                                                        <span>📹 Học trực tuyến</span>
                                                        <span>↗</span>
                                                    </a>
                                                ) : (
                                                    <span className="badge-physical-room" data-testid={`badge-room-${sessionItem.id}`}>
                                                        <span>📍 Phòng:</span>
                                                        <strong>{sessionItem.room_name || sessionItem.room_id || 'Chưa xếp'}</strong>
                                                    </span>
                                                )}

                                                {isToday && (
                                                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#0284c7' }}>
                                                        ⚡ Hôm nay
                                                    </span>
                                                )}
                                            </div>

                                            {/* Cảnh báo buổi bị hủy kèm lý do */}
                                            {isCancelled && (
                                                <div className="card-cancelled-alert" data-testid={`card-cancelled-${sessionItem.id}`}>
                                                    <strong>🚫 Đã huỷ buổi học</strong>
                                                    {sessionItem.cancellation_reason && (
                                                        <div>Lý do: {sessionItem.cancellation_reason}</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="schedule-empty-state" data-testid="empty-week-state">
                            <span className="empty-state-icon">☕</span>
                            <h3>Không có lịch học trong tuần này</h3>
                            <p>
                                Bạn không có buổi học nào được xếp trong khoảng thời gian {periodTitle}.
                                Bạn có thể điều hướng sang các tuần khác để kiểm tra.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
