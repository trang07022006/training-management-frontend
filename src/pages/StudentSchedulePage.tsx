import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    getMyPersonalSchedule,
    type StudentPersonalScheduleResponse,
} from '../api/scheduleApi'
import { formatVietnamDate } from '../utils/dateUtils'
import { PageHeader } from '../components/PageHeader'
import { SYSTEM_PERMISSIONS, getRolePermissions } from '../navigation/menuConfig'
import { getRoleHomePath } from '../auth/roleRouting'
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
    const { role, roles } = session

    // Chuẩn hóa danh sách roles của người dùng (multi-role aware)
    const userRoles = useMemo(() => {
        const list: string[] = []
        if (roles && Array.isArray(roles) && roles.length > 0) {
            for (const r of roles) {
                if (typeof r === 'string' && r.trim()) list.push(r.trim().toLowerCase())
            }
        } else if (role && typeof role === 'string' && role.trim()) {
            list.push(role.trim().toLowerCase())
        }
        return list
    }, [role, roles])

    // Ngày mốc của tuần đang xem (mặc định hôm nay)
    const [currentDate, setCurrentDate] = useState<Date>(new Date())

    // Ngữ cảnh vai trò đang xem: 'learning' (học viên) hoặc 'teaching' (giảng viên)
    const [selectedContext, setSelectedContext] = useState<'learning' | 'teaching'>(
        userRoles.includes('trainer') && !userRoles.includes('trainee') ? 'teaching' : 'learning'
    )

    // Dữ liệu từ API
    const [scheduleData, setScheduleData] = useState<StudentPersonalScheduleResponse | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [isForbidden, setIsForbidden] = useState<boolean>(false)

    // Tính khoảng ngày Thứ 2 -> Chủ nhật của tuần đang chọn
    const { dateFrom, dateTo, periodTitle } = useMemo(() => {
        const monday = getMonday(currentDate)
        const sunday = addDays(monday, 6)
        const fromStr = formatDateISO(monday)
        const toStr = formatDateISO(sunday)
        const title = `Tuần từ ${monday.toLocaleDateString('vi-VN')} đến ${sunday.toLocaleDateString('vi-VN')}`
        return { dateFrom: fromStr, dateTo: toStr, periodTitle: title }
    }, [currentDate])

    // Reset dữ liệu khi đổi tài khoản đăng nhập hoặc đổi ngữ cảnh (SCRUM-254)
    useEffect(() => {
        setScheduleData(null)
        setError(null)
        setIsForbidden(false)
    }, [session.userId, selectedContext])

    // Kiểm tra quyền xem thời khóa biểu chung để hiển thị nút gợi ý phù hợp (SCRUM-254 & SCRUM-228)
    const canViewGeneralSchedule = useMemo(() => {
        let perms = session.permissions
        if (!perms || perms.length === 0) {
            perms = [...getRolePermissions(userRoles)]
        }
        if (perms.includes(SYSTEM_PERMISSIONS.SCHEDULE_VIEW)) {
            return true
        }
        if (userRoles.includes('admin') || userRoles.includes('training_manager')) {
            return true
        }
        if (error && (error.toLowerCase().includes('thời khóa biểu') || error.toLowerCase().includes('quản trị'))) {
            return true
        }
        return false
    }, [session.permissions, userRoles, error])

    const homePath = useMemo(() => {
        return getRoleHomePath(role)
    }, [role])

    const homeLabel = useMemo(() => {
        return homePath === '/dashboard' ? 'Về Tổng quan' : 'Về Trang chủ'
    }, [homePath])

    // Load dữ liệu lịch cá nhân
    const loadSchedule = useCallback(async () => {
        if (!requestFn) return
        setLoading(true)
        setError(null)
        setIsForbidden(false)
        try {
            const data = await getMyPersonalSchedule(requestFn, {
                date_from: dateFrom,
                date_to: dateTo,
                context: selectedContext,
            })
            setScheduleData(data)
        } catch (err: any) {
            const status = err?.status || err?.statusCode
            const msg = (err?.message || '').toLowerCase()
            const code = err?.code || ''
            if (status === 403 || code === 'FORBIDDEN' || msg.includes('không có quyền') || msg.includes('forbidden')) {
                setIsForbidden(true)
            }
            setError(err?.message || 'Không thể tải thời khóa biểu cá nhân.')
        } finally {
            setLoading(false)
        }
    }, [requestFn, dateFrom, dateTo, selectedContext])

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
    const activeContext = scheduleData?.active_context || selectedContext
    const isTrainer = activeContext === 'teaching' || scheduleData?.user_type === 'trainer'
    const availableContexts = scheduleData?.available_contexts || (userRoles.includes('trainer') && userRoles.includes('trainee') ? ['learning', 'teaching'] : [])
    const nextSession = scheduleData?.next_session
    const weekSessions = scheduleData?.week_sessions || []
    const student = scheduleData?.student
    const instructor = scheduleData?.instructor
    const enrolledClasses = scheduleData?.enrolled_classes || scheduleData?.assigned_classes || []

    return (
        <div className="student-schedule-container" data-testid="student-schedule-page">
            {/* Header */}
            <div className="schedule-header">
                <PageHeader title={isTrainer ? 'Lịch giảng dạy của tôi' : 'Lịch học của tôi'} subtitle={isTrainer ? 'Theo dõi lịch giảng dạy và các buổi học được phân công theo tuần' : 'Theo dõi buổi học sắp diễn ra và lịch học trong tuần theo các lớp đã ghi danh'} />

                {/* Chuyển đổi ngữ cảnh khi tài khoản có nhiều vai trò (Trainer + Trainee) */}
                {availableContexts.length > 1 && (
                    <div className="schedule-context-switcher" data-testid="schedule-context-switcher" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            type="button"
                            className={`context-switch-btn ${activeContext === 'learning' ? 'btn-primary' : 'btn-secondary'}`}
                            data-testid="switch-context-learning"
                            onClick={() => setSelectedContext('learning')}
                            style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                        >
                            🎓 Lịch học của tôi
                        </button>
                        <button
                            type="button"
                            className={`context-switch-btn ${activeContext === 'teaching' ? 'btn-primary' : 'btn-secondary'}`}
                            data-testid="switch-context-teaching"
                            onClick={() => setSelectedContext('teaching')}
                            style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                        >
                            👨‍🏫 Lịch giảng dạy của tôi
                        </button>
                    </div>
                )}

                {student && !isTrainer && (
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

                {isTrainer && instructor && (
                    <div className="student-profile-pill" data-testid="trainer-profile-pill">
                        <div className="student-avatar" style={{ backgroundColor: '#2563eb' }}>
                            {instructor.full_name ? instructor.full_name.charAt(0).toUpperCase() : 'G'}
                        </div>
                        <div className="student-info-meta">
                            <span className="student-name-text">{instructor.full_name}</span>
                            <span className="student-code-text">
                                Giảng viên • {instructor.email}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Trạng thái 1: Không có quyền truy cập (403 Forbidden) (SCRUM-228 Requirement 5 & SCRUM-254) */}
            {isForbidden && (
                <div className="schedule-empty-state schedule-forbidden-state" data-testid="schedule-forbidden-state">
                    <span className="empty-state-icon">🚫</span>
                    <h3>Không có quyền truy cập lịch học cá nhân</h3>
                    <p>
                        Trang lịch cá nhân chỉ dành riêng cho tài khoản có vai trò học viên hoặc giảng viên.
                        Tài khoản Quản trị viên và Quản lý đào tạo vui lòng sử dụng phân hệ Thời khóa biểu toàn trường.
                    </p>
                    <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        {canViewGeneralSchedule && (
                            <Link to="/schedules" className="btn-primary" style={{ padding: '8px 16px', textDecoration: 'none', borderRadius: '6px' }} data-testid="btn-forbidden-schedules">
                                Đến Thời khóa biểu
                            </Link>
                        )}
                        <Link to={homePath} className="btn-secondary" style={{ padding: '8px 16px', textDecoration: 'none', borderRadius: '6px' }} data-testid="btn-forbidden-home">
                            {homeLabel}
                        </Link>
                    </div>
                </div>
            )}

            {/* Error Alert khi không phải 403 */}
            {!isForbidden && error && (
                <div className="schedule-alert-error" data-testid="schedule-error-alert">
                    <span>⚠️ {error}</span>
                </div>
            )}

            {/* Loading Indicator */}
            {loading && !scheduleData && !isForbidden && (
                <div className="schedule-loading-bar" data-testid="schedule-loading">
                    Đang tải thời khóa biểu...
                </div>
            )}

            {/* Trạng thái 2: Tài khoản chưa được liên kết với hồ sơ học viên (SCRUM-228 Requirement 5) */}
            {!isForbidden && scheduleData && !isTrainer && (scheduleData.profile_linked === false || !student) && (
                <div className="schedule-empty-state" data-testid="unlinked-profile-state">
                    <span className="empty-state-icon">👤</span>
                    <h3>Tài khoản chưa được liên kết hồ sơ học viên</h3>
                    <p>
                        Tài khoản của bạn chưa được liên kết với hồ sơ học viên nào trong hệ thống.
                        Vui lòng liên hệ Quản trị viên hoặc Phòng đào tạo để hoàn tất liên kết thông tin.
                    </p>
                </div>
            )}

            {/* Trạng thái 3: Học viên đã có hồ sơ nhưng chưa ghi danh lớp nào (SCRUM-228 Requirement 5) */}
            {!isForbidden && scheduleData && !isTrainer && student && enrolledClasses.length === 0 && (
                <div className="schedule-empty-state" data-testid="no-enrollments-state">
                    <span className="empty-state-icon">📚</span>
                    <h3>Chưa có lớp học nào được ghi danh</h3>
                    <p>
                        Hồ sơ của bạn hiện chưa được ghi danh vào lớp đào tạo nào.
                        Vui lòng liên hệ Quản lý đào tạo hoặc Bộ phận tuyển sinh để được xếp lớp.
                    </p>
                </div>
            )}

            {/* Trạng thái 4a: Giảng viên chưa có phân công lớp nào */}
            {!isForbidden && scheduleData && isTrainer && enrolledClasses.length === 0 && weekSessions.length === 0 && !nextSession && (
                <div className="schedule-empty-state" data-testid="no-assigned-classes-state">
                    <span className="empty-state-icon">📋</span>
                    <h3>Chưa có lịch phân công giảng dạy</h3>
                    <p>
                        Bạn hiện chưa được phân công lớp học hoặc buổi giảng dạy nào trong hệ thống.
                        Vui lòng liên hệ Quản lý đào tạo để được xếp lịch giảng dạy.
                    </p>
                </div>
            )}

            {/* Trạng thái 4b: Giảng viên đã được phân công lớp nhưng tuần này chưa có lịch dạy */}
            {!isForbidden && scheduleData && isTrainer && enrolledClasses.length > 0 && weekSessions.length === 0 && !nextSession && (
                <div className="schedule-empty-state" data-testid="assigned-no-sessions-state">
                    <span className="empty-state-icon">📅</span>
                    <h3>Chưa có buổi dạy nào trong tuần này</h3>
                    <p>
                        Bạn đã được phân công phụ trách {enrolledClasses.length} lớp học: {enrolledClasses.map(c => c.class_code).join(', ')}, nhưng hiện không có buổi dạy nào diễn ra trong tuần được chọn.
                    </p>
                </div>
            )}

            {/* Nội dung chính khi đã có thông tin lớp hoặc buổi học */}
            {!isForbidden && scheduleData && (
                (student && enrolledClasses.length > 0) ||
                (isTrainer && (enrolledClasses.length > 0 || weekSessions.length > 0 || nextSession))
            ) && (
                <>
                    {/* Hero Section: Buổi học kế tiếp (SCRUM-228 AC 1) */}
                    {nextSession ? (
                        <div className="next-session-hero" data-testid="next-session-hero">
                            <span className="hero-label">🚀 Buổi học kế tiếp sắp tới</span>
                            <div className="hero-body">
                                <div className="hero-main-info">
                                    <div className="hero-date-time">
                                        <span className="hero-day-tag">{nextSession.day_of_week || 'Buổi học'}</span>
                                        {nextSession.teaching_role_label && (
                                            <span
                                                className="hero-day-tag"
                                                data-testid="hero-teaching-role-badge"
                                                style={{
                                                    backgroundColor: nextSession.teaching_role === 'assistant' ? '#f59e0b' : '#0284c7',
                                                    color: '#ffffff',
                                                }}
                                            >
                                                {nextSession.teaching_role_label}
                                            </span>
                                        )}
                                        <span className="hero-date-str">
                                            {formatVietnamDate(nextSession.learning_date)} ({nextSession.start_time.substring(0, 5)} - {nextSession.end_time.substring(0, 5)})
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

                                    {isTrainer && nextSession.class_id && (
                                        <Link
                                            to={`/classes/${nextSession.class_id}/schedules/${nextSession.id}/attendance`}
                                            className="btn-secondary"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                marginTop: '8px',
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                borderColor: '#0284c7',
                                                color: '#0284c7',
                                                textDecoration: 'none',
                                                fontWeight: 600,
                                            }}
                                            data-testid="hero-btn-attendance"
                                        >
                                            <span>📋 Điểm danh buổi học này</span>
                                            {nextSession.attendance_checked && (
                                                <span style={{ color: '#16a34a', fontSize: '11px' }}>✓ Đã điểm danh</span>
                                            )}
                                        </Link>
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
                                                    {sessionItem.day_of_week || 'Lịch'} • {formatVietnamDate(sessionItem.learning_date)}
                                                </span>
                                                <span className="card-time-text">
                                                    {sessionItem.start_time.substring(0, 5)} - {sessionItem.end_time.substring(0, 5)}
                                                </span>
                                            </div>

                                            {sessionItem.teaching_role_label && (
                                                <div style={{ marginBottom: '6px' }}>
                                                    <span
                                                        className="card-role-tag"
                                                        data-testid={`session-role-${sessionItem.id}`}
                                                        style={{
                                                            fontSize: '11px',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            backgroundColor: sessionItem.teaching_role === 'assistant' ? '#fef3c7' : '#e0f2fe',
                                                            color: sessionItem.teaching_role === 'assistant' ? '#92400e' : '#0369a1',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {sessionItem.teaching_role_label}
                                                    </span>
                                                </div>
                                            )}

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

                                            {/* Hành động điểm danh dành cho Giảng viên (SCRUM-254) */}
                                            {isTrainer && !isCancelled && sessionItem.class_id && (
                                                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Link
                                                        to={`/classes/${sessionItem.class_id}/schedules/${sessionItem.id}/attendance`}
                                                        className="btn-attendance-link"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '4px 10px',
                                                            fontSize: '12px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #0284c7',
                                                            color: '#0284c7',
                                                            textDecoration: 'none',
                                                            fontWeight: 600,
                                                            backgroundColor: '#f0f9ff',
                                                        }}
                                                        data-testid={`btn-attendance-${sessionItem.id}`}
                                                    >
                                                        <span>📋 Điểm danh</span>
                                                    </Link>
                                                    {sessionItem.attendance_checked ? (
                                                        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }} data-testid={`badge-checked-${sessionItem.id}`}>
                                                            ✓ Đã điểm danh
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                            Chưa điểm danh
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Cảnh báo buổi bị hủy kèm lý do */}
                                            {isCancelled && (
                                                <div className="card-cancelled-alert" data-testid={`card-cancelled-${sessionItem.id}`}>
                                                    <strong>🚫 Đã hủy buổi học</strong>
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
