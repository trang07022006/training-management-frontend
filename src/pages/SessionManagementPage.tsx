import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getRolePermissions, SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './SessionManagementPage.css'

type ClassSession = {
    id: string
    title: string
    course: string
    date: string
    startTime: string
    endTime: string
    trainer: string
    room: string
    status: 'Sắp diễn ra' | 'Đã dời lịch'
}
type SessionAction = 'details' | 'edit' | 'reschedule' | 'cancel'

const SAMPLE_SESSIONS: ClassSession[] = [
    { id: 'demo-1', title: 'React cơ bản: component và props', course: 'WEB-301 · Lập trình Web Fullstack', date: '2026-10-16', startTime: '09:00', endTime: '11:00', trainer: 'Lê Minh Trang', room: 'Phòng A.203', status: 'Sắp diễn ra' },
    { id: 'demo-2', title: 'Thiết kế cơ sở dữ liệu quan hệ', course: 'DB-202 · Quản trị cơ sở dữ liệu', date: '2026-10-16', startTime: '13:30', endTime: '15:30', trainer: 'Nguyễn Văn Hoàng', room: 'Phòng B.105', status: 'Đã dời lịch' },
    { id: 'demo-3', title: 'Xác thực và phân quyền ứng dụng', course: 'SEC-401 · An toàn ứng dụng', date: '2026-10-19', startTime: '10:00', endTime: '12:00', trainer: 'Trần Đình Nam', room: 'Trực tuyến', status: 'Sắp diễn ra' },
]

const ACTION_LABELS: Record<SessionAction, string> = {
    details: 'Chi tiết buổi học', edit: 'Sửa thông tin buổi học',
    reschedule: 'Dời lịch buổi học', cancel: 'Xác nhận hủy buổi học',
}

export function SessionManagementPage() {
    const { role, roles, permissions: sessionPermissions } = useSession()
    const permissions = sessionPermissions.length > 0 ? sessionPermissions : getRolePermissions(roles.length > 0 ? roles : role)
    const canManage = permissions.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE)
    const [sessions, setSessions] = useState(SAMPLE_SESSIONS)
    const [query, setQuery] = useState('')
    const [dateFilter, setDateFilter] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [action, setAction] = useState<SessionAction | null>(null)
    const [error, setError] = useState('')
    const selected = sessions.find((session) => session.id === selectedId) ?? null

    const visibleSessions = useMemo(() => sessions.filter((session) => {
        const searchable = `${session.title} ${session.course} ${session.trainer}`.toLowerCase()
        return searchable.includes(query.trim().toLowerCase()) && (!dateFilter || session.date === dateFilter)
    }), [dateFilter, query, sessions])

    function openAction(nextAction: SessionAction, sessionId: string) {
        setSelectedId(sessionId)
        setAction(nextAction)
        setError('')
    }

    function closeAction() {
        setAction(null)
        setError('')
    }

    function saveSession(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!selected || !action) return
        const form = new FormData(event.currentTarget)
        const date = String(form.get('date') ?? '')
        const startTime = String(form.get('startTime') ?? '')
        const endTime = String(form.get('endTime') ?? '')
        const title = String(form.get('title') ?? '').trim()
        const room = String(form.get('room') ?? '').trim()

        if (!title || !date || !startTime || !endTime || !room) {
            setError('Vui lòng nhập đầy đủ tên buổi học, ngày, giờ bắt đầu, giờ kết thúc và phòng học.')
            return
        }
        if (startTime >= endTime) {
            setError('Giờ kết thúc phải sau giờ bắt đầu.')
            return
        }
        const overlaps = sessions.some((other) => other.id !== selected.id && other.date === date && other.room.toLowerCase() === room.toLowerCase() && startTime < other.endTime && endTime > other.startTime)
        if (overlaps) {
            setError('Phòng học đã có buổi học khác trong khung giờ này. Vui lòng chọn lịch khác.')
            return
        }
        setSessions((current) => current.map((item) => item.id === selected.id ? {
            ...item, title, date, startTime, endTime, room,
            status: action === 'reschedule' ? 'Đã dời lịch' : item.status,
        } : item))
        closeAction()
    }

    function cancelSession() {
        if (!selected) return
        setSessions((current) => current.filter((item) => item.id !== selected.id))
        closeAction()
    }

    return (
        <main className="schedule-page">
            <header className="schedule-header">
                <div>
                    <span className="schedule-eyebrow">Phân hệ đào tạo</span>
                    <h1>Quản lý lịch học</h1>
                    <p>Theo dõi buổi học, cập nhật thông tin và điều chỉnh lịch đào tạo.</p>
                </div>
                <Link className="schedule-back-link" to="/courses">← Danh sách khóa học</Link>
            </header>

            <section className="schedule-notice" aria-label="Trạng thái dữ liệu mẫu">
                <span aria-hidden="true">ⓘ</span>
                <div>
                    <strong>Dữ liệu mẫu SCRUM-226</strong>
                    <p>Đây là dữ liệu minh họa lưu tạm trong giao diện. API lịch học chưa có trong repository; các thay đổi sẽ mất khi tải lại trang và chưa được lưu lên backend.</p>
                </div>
            </section>

            <section className="schedule-panel" aria-labelledby="schedule-list-title">
                <div className="schedule-panel-heading">
                    <div><h2 id="schedule-list-title">Danh sách buổi học</h2><p>Xem thông tin, sửa nội dung, dời lịch hoặc hủy buổi học.</p></div>
                    <span className="schedule-count">{visibleSessions.length} buổi học</span>
                </div>

                <div className="schedule-filters">
                    <label htmlFor="session-search">Tìm buổi học</label>
                    <input id="session-search" type="search" placeholder="Tên buổi học, khóa học hoặc giảng viên" value={query} onChange={(event) => setQuery(event.target.value)} />
                    <label htmlFor="session-date">Ngày học</label>
                    <input id="session-date" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
                </div>

                <div className="schedule-table-wrap">
                    <table className="schedule-table">
                        <thead><tr><th scope="col">Buổi học</th><th scope="col">Khóa học</th><th scope="col">Ngày & giờ</th><th scope="col">Giảng viên</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead>
                        <tbody>
                            {visibleSessions.map((session) => (
                                <tr key={session.id} className={selectedId === session.id ? 'schedule-row-selected' : ''}>
                                    <td><strong>{session.title}</strong><span className="schedule-subline">{session.id.toUpperCase()}</span></td>
                                    <td>{session.course}</td>
                                    <td>{session.date}<span className="schedule-subline">{session.startTime}–{session.endTime}</span></td>
                                    <td>{session.trainer}</td>
                                    <td><span className={`schedule-status ${session.status === 'Đã dời lịch' ? 'schedule-status-moved' : ''}`}>{session.status}</span></td>
                                    <td><div className="schedule-row-actions">
                                        <button type="button" onClick={() => openAction('details', session.id)}>Chi tiết</button>
                                        {canManage && <button type="button" onClick={() => openAction('edit', session.id)}>Sửa</button>}
                                        {canManage && <button type="button" onClick={() => openAction('reschedule', session.id)}>Dời lịch</button>}
                                        {canManage && <button type="button" className="schedule-delete-link" onClick={() => openAction('cancel', session.id)}>Hủy</button>}
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {visibleSessions.length === 0 && <div className="schedule-empty" role="status"><span className="schedule-empty-icon" aria-hidden="true">▦</span><h3>Không tìm thấy buổi học</h3><p>Thử thay đổi từ khóa hoặc ngày tìm kiếm.</p></div>}
                </div>
            </section>

            {action && selected && (
                <div className="schedule-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAction() }}>
                    <section className="schedule-modal" role="dialog" aria-modal="true" aria-labelledby="session-modal-title">
                        <header><div><span className="schedule-eyebrow">{selected.id.toUpperCase()}</span><h2 id="session-modal-title">{ACTION_LABELS[action]}</h2></div><button type="button" aria-label="Đóng" onClick={closeAction}>×</button></header>
                        {action === 'details' && <dl className="schedule-details"><dt>Tên buổi học</dt><dd>{selected.title}</dd><dt>Khóa học</dt><dd>{selected.course}</dd><dt>Ngày & giờ</dt><dd>{selected.date}, {selected.startTime}–{selected.endTime}</dd><dt>Giảng viên</dt><dd>{selected.trainer}</dd><dt>Phòng học</dt><dd>{selected.room}</dd><dt>Trạng thái</dt><dd>{selected.status}</dd></dl>}
                        {action === 'cancel' && <><p className="schedule-confirm-copy">Bạn có chắc muốn hủy <strong>{selected.title}</strong> vào ngày {selected.date}? Buổi học sẽ bị xóa khỏi danh sách mẫu hiện tại.</p><div className="schedule-modal-actions"><button type="button" className="schedule-secondary-button" onClick={closeAction}>Giữ buổi học</button><button type="button" className="schedule-danger-button" onClick={cancelSession}>Xác nhận hủy</button></div></>}
                        {(action === 'edit' || action === 'reschedule') && <form onSubmit={saveSession} noValidate>
                            <label>Tên buổi học<input name="title" defaultValue={selected.title} /></label>
                            <div className="schedule-form-row"><label>Ngày<input name="date" type="date" defaultValue={selected.date} /></label><label>Phòng học<input name="room" defaultValue={selected.room} /></label></div>
                            <div className="schedule-form-row"><label>Bắt đầu<input name="startTime" type="time" defaultValue={selected.startTime} /></label><label>Kết thúc<input name="endTime" type="time" defaultValue={selected.endTime} /></label></div>
                            {error && <p className="schedule-form-error" role="alert">{error}</p>}
                            <div className="schedule-modal-actions"><button type="button" className="schedule-secondary-button" onClick={closeAction}>Đóng</button><button type="submit" className="schedule-primary-button">{action === 'reschedule' ? 'Lưu lịch mới' : 'Lưu thay đổi'}</button></div>
                        </form>}
                    </section>
                </div>
            )}
        </main>
    )
}
