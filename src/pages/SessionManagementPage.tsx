import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getRolePermissions, SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { getCalendarSchedules, type CalendarScheduleItem } from '../api/scheduleApi'
import { PageHeader } from '../components/PageHeader'
import { formatVietnamDate } from '../utils/dateUtils'
import { formatInstructorLabel, formatRoomLabel, formatScheduleStatus, formatTimeStr } from '../utils/scheduleDisplayUtils'
import './SessionManagementPage.css'

function dateISO(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function SessionManagementPage() {
    const { hasSession, isLoading, role, roles, permissions } = useSession()
    if (isLoading) return null
    if (!hasSession) return <Navigate to="/login" replace />
    const effective = permissions?.length ? permissions : getRolePermissions(roles?.length ? roles : role)
    if (!effective.includes(SYSTEM_PERMISSIONS.SCHEDULE_MANAGE)) return <Navigate to="/forbidden" replace />
    return <SessionList />
}

function SessionList() {
    const { request } = useSession()
    const [dateFrom, setDateFrom] = useState(() => { const now = new Date(); return dateISO(new Date(now.getFullYear(), now.getMonth(), 1)) })
    const [dateTo, setDateTo] = useState(() => { const now = new Date(); return dateISO(new Date(now.getFullYear(), now.getMonth() + 1, 0)) })
    const [query, setQuery] = useState('')
    const [status, setStatus] = useState('')
    const [sessions, setSessions] = useState<CalendarScheduleItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [revision, setRevision] = useState(0)
    const invalidRange = !dateFrom || !dateTo || dateFrom > dateTo

    useEffect(() => {
        let active = true
        setSessions([])
        setError('')
        if (invalidRange) { setLoading(false); return }
        setLoading(true)
        getCalendarSchedules(request, { date_from: dateFrom, date_to: dateTo, view_mode: 'month' })
            .then(data => {
                if (!Array.isArray(data?.schedules)) throw new Error('Phản hồi lịch học không hợp lệ. Vui lòng thử lại.')
                if (active) setSessions(data.schedules)
            })
            .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Không thể tải danh sách buổi học.') })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [request, dateFrom, dateTo, invalidRange, revision])

    const visible = useMemo(() => sessions.filter(s => {
        const search = `${s.topic} ${s.class_code} ${s.subject_name ?? ''} ${s.instructor_name ?? ''}`.toLocaleLowerCase('vi-VN')
        return search.includes(query.trim().toLocaleLowerCase('vi-VN')) && (!status || s.status === status)
    }).sort((a, b) => `${a.learning_date} ${a.start_time}`.localeCompare(`${b.learning_date} ${b.start_time}`)), [sessions, query, status])

    return (
        <div className="session-management" data-testid="session-management-page">
            <PageHeader title="Quản lý buổi học" subtitle="Tra cứu lịch theo lớp, theo dõi trạng thái và điều chỉnh từng buổi học."
                breadcrumbs={[{ label: 'Trang chủ', path: '/dashboard' }, { label: 'Quản lý buổi học' }]}
                actions={<div className="session-management-actions"><Link to="/classes">Danh sách lớp</Link><Link to="/schedules" className="primary">Xem thời khóa biểu</Link></div>} />
            <section className="session-management-filters" aria-label="Bộ lọc buổi học">
                <label className="session-management-search">Tìm buổi học<input type="search" placeholder="Tên buổi, lớp, môn hoặc giảng viên" value={query} onChange={e => setQuery(e.target.value)} /></label>
                <label>Từ ngày<input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></label>
                <label>Đến ngày<input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></label>
                <label>Trạng thái<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option>{['scheduled', 'rescheduled', 'updated', 'in_progress', 'completed', 'cancelled'].map(value => <option key={value} value={value}>{formatScheduleStatus(value).label}</option>)}</select></label>
                <button type="button" onClick={() => setRevision(r => r + 1)} disabled={loading || invalidRange}>Tải lại</button>
            </section>
            {invalidRange && <p className="session-management-error" role="alert">Chọn khoảng ngày hợp lệ: ngày kết thúc phải bằng hoặc sau ngày bắt đầu.</p>}
            {error && <div className="session-management-error" role="alert">{error} <button type="button" onClick={() => setRevision(r => r + 1)}>Thử lại</button></div>}
            <section className="session-management-panel" aria-labelledby="session-list-title" aria-busy={loading}>
                <div className="session-management-panel-heading"><div><h2 id="session-list-title">Danh sách buổi học</h2><p>Dữ liệu trong khoảng ngày đã chọn. Mở chi tiết để xem phòng học, sửa lịch hoặc hủy buổi.</p></div>{!loading && !error && !invalidRange && <span>{visible.length} buổi học</span>}</div>
                {loading ? <p className="session-management-empty" role="status">Đang tải lịch học…</p> : !error && !invalidRange && (visible.length ? (
                    <div className="session-management-table-wrap" tabIndex={0} role="region" aria-label="Bảng buổi học, cuộn ngang để xem đầy đủ">
                        <table><thead><tr><th scope="col">Buổi học / Lớp</th><th scope="col">Ngày và giờ</th><th scope="col">Giảng viên / Phòng</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead><tbody>
                            {visible.map(s => {
                                const detail = `/classes/${encodeURIComponent(s.class_id)}/schedules/${encodeURIComponent(s.id)}`
                                const state = formatScheduleStatus(s.status)
                                const locked = s.attendance_checked || s.status === 'cancelled' || s.status === 'completed'
                                return <tr key={s.id}>
                                    <td><strong>{s.topic || `Buổi ${s.session_number}`}</strong><span className="session-management-subline">{s.class_code}{s.subject_name ? ` · ${s.subject_name}` : ''}</span></td>
                                    <td><span className="session-management-date">{formatVietnamDate(s.learning_date)}</span><span className="session-management-subline">{formatTimeStr(s.start_time)} – {formatTimeStr(s.end_time)}</span></td>
                                    <td>{formatInstructorLabel(s.instructor_name, s.instructor_id)}<span className="session-management-subline">{formatRoomLabel(s.room_id, s.room_name, s.is_online, s.online_link)}</span></td>
                                    <td><span className={`session-management-badge ${state.className}`}>{state.label}</span>{s.attendance_checked && <span className="session-management-subline">Đã điểm danh</span>}</td>
                                    <td><div className="session-management-row-actions"><Link to={detail}>Chi tiết</Link>{!locked && <Link to={`${detail}/edit`}>Sửa / Dời lịch</Link>}</div></td>
                                </tr>
                            })}
                        </tbody></table>
                    </div>
                ) : <div className="session-management-empty"><strong>Không có buổi học phù hợp</strong><p>Thử đổi khoảng ngày hoặc bộ lọc. Nếu lớp chưa có lịch, hãy tạo lịch tại trang lớp học.</p><Link to="/classes">Đến danh sách lớp</Link></div>)}
            </section>
        </div>
    )
}
