import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getStudentDetail, type StudentDetail, ApiError } from '../api/studentApi'
import { getStudentLifecycleHistory, type StudentLifecycleHistoryItem } from '../api/studentLifecycleApi'
import { PageHeader } from '../components/PageHeader'
import { getErrorMessage } from '../utils/errorMessages'
import { formatVietnamDate } from '../utils/dateUtils'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './StudentsPage.css'

// Huy hiệu loại thao tác vòng đời học viên (SCRUM-252 AC 4)
export function getLifecycleActionBadge(actionType?: string | null): { label: string; bg: string; color: string; border: string; icon: string } {
    switch (actionType) {
        case 'reserve':
            return { label: 'Bảo lưu', bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: '⏸️' }
        case 'transfer':
            return { label: 'Chuyển lớp', bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe', icon: '🔄' }
        case 'drop':
            return { label: 'Thôi học', bg: '#fee2e2', color: '#991b1b', border: '#fecaca', icon: '🛑' }
        default:
            return { label: actionType || 'Khác', bg: '#f1f5f9', color: '#334155', border: '#cbd5e1', icon: 'ℹ️' }
    }
}

// Huy hiệu trạng thái hiệu lực vòng đời học viên (SCRUM-252 AC 4)
export function getLifecycleStatusBadge(status?: string | null): { label: string; bg: string; color: string; border: string } {
    switch (status) {
        case 'applied':
            return { label: 'Đã hiệu lực', bg: '#dcfce7', color: '#166534', border: '#bbf7d0' }
        case 'pending':
            return { label: 'Chờ hiệu lực', bg: '#fef9c3', color: '#854d0e', border: '#fef08a' }
        default:
            return { label: status || '—', bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' }
    }
}

// Trạng thái hồ sơ học viên (SCRUM-215 / SCRUM-216)
export function getStudentStatusBadge(status?: string | null): { label: string; className: string } {
    switch (status) {
        case 'enrolled':
            return { label: 'Đã nhập học', className: 'status-enrolled' }
        case 'studying':
            return { label: 'Đang học', className: 'status-studying' }
        case 'active':
            return { label: 'Hoạt động', className: 'status-active' }
        case 'completed':
            return { label: 'Hoàn thành', className: 'status-completed' }
        case 'graduated':
            return { label: 'Đã tốt nghiệp', className: 'status-graduated' }
        case 'suspended':
            return { label: 'Bảo lưu', className: 'status-suspended' }
        case 'dropped_out':
        case 'dropped':
            return { label: 'Đã nghỉ học', className: 'status-dropped_out' }
        case 'inactive':
            return { label: 'Không hoạt động', className: 'status-inactive' }
        default:
            return { label: status || 'Đã nhập học', className: `status-${status || 'enrolled'}` }
    }
}

// Trạng thái lớp học (preparing, in_progress, completed, cancelled)
export function getClassStatusBadge(status?: string | null): { label: string; className: string } {
    switch (status) {
        case 'in_progress':
        case 'ongoing':
            return { label: 'Đang diễn ra', className: 'in_progress' }
        case 'preparing':
            return { label: 'Chuẩn bị mở', className: 'preparing' }
        case 'completed':
            return { label: 'Đã kết thúc', className: 'completed' }
        case 'cancelled':
            return { label: 'Đã hủy', className: 'cancelled' }
        default:
            return { label: status || 'Đã kết thúc', className: status || 'completed' }
    }
}

// Trạng thái ghi danh lớp (enrolled, completed, dropped)
export function getEnrollmentStatusBadge(status?: string | null): { label: string; className: string } {
    switch (status) {
        case 'enrolled':
            return { label: 'Đã ghi danh', className: 'enrolled' }
        case 'completed':
            return { label: 'Hoàn thành', className: 'completed' }
        case 'dropped':
            return { label: 'Đã rút', className: 'dropped' }
        default:
            return { label: status || 'Đã ghi danh', className: status || 'enrolled' }
    }
}

export function StudentDetailPage() {
    const { studentId } = useParams<{ studentId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role, roles } = useSession()

    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const normalizedRoles = effectiveRoles.map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
    const canManage =
        permissions?.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) ||
        normalizedRoles.includes('admin') ||
        normalizedRoles.includes('training_manager')
    const canLifecycleManage =
        permissions?.includes(SYSTEM_PERMISSIONS.STUDENT_LIFECYCLE_MANAGE) ||
        normalizedRoles.includes('training_manager')

    const [student, setStudent] = useState<StudentDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [lifecycleHistory, setLifecycleHistory] = useState<StudentLifecycleHistoryItem[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    useEffect(() => {
        let isMounted = true
        if (!studentId) {
            setErrorMessage('Mã học viên không hợp lệ.')
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setErrorMessage(null)

        getStudentDetail(requestFn, studentId)
            .then((data) => {
                if (isMounted) {
                    setStudent(data)
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    if (err instanceof ApiError && err.status === 404) {
                        setErrorMessage('Không tìm thấy học viên yêu cầu. Học viên có thể đã bị xóa hoặc không tồn tại.')
                    } else {
                        setErrorMessage(getErrorMessage(err, 'Lỗi khi tải thông tin hồ sơ học viên.'))
                    }
                    setIsLoading(false)
                }
            })

        if (canLifecycleManage) {
            setLoadingHistory(true)
            getStudentLifecycleHistory(requestFn, studentId)
                .then((history) => {
                    if (isMounted) {
                        setLifecycleHistory(history)
                        setLoadingHistory(false)
                    }
                })
                .catch(() => {
                    if (isMounted) {
                        setLoadingHistory(false)
                    }
                })
        }

        return () => {
            isMounted = false
        }
    }, [studentId, requestFn, canLifecycleManage])

    if (isLoading) {
        return (
            <div className="students-container student-detail-container">
                <div className="students-loading">
                    <div className="spinner" />
                    <span>Đang tải hồ sơ học viên...</span>
                </div>
            </div>
        )
    }

    if (errorMessage || !student) {
        return (
            <div className="students-container student-detail-container">
                <PageHeader
                    title="Hồ sơ học viên"
                    breadcrumbs={[
                        { label: 'Học viên', path: '/students' },
                        { label: 'Chi tiết hồ sơ' },
                    ]}
                />
                <div className="students-alert error" role="alert">
                    <span>{errorMessage || 'Không tìm thấy hồ sơ học viên.'}</span>
                </div>
                <div style={{ marginTop: '16px' }}>
                    <button type="button" className="btn-secondary" onClick={() => navigate('/students')}>
                        Quay lại danh sách học viên
                    </button>
                </div>
            </div>
        )
    }

    const studentStatus = getStudentStatusBadge(student.status)
    const currentClasses = (student.current_classes && student.current_classes.length > 0)
        ? student.current_classes
        : (student.current_class ? [student.current_class] : [])

    return (
        <div className="students-container student-detail-container" data-testid="student-detail-page">
            <PageHeader
                title={student.full_name}
                subtitle={`Mã học viên: ${student.student_code} • SĐT: ${student.phone || 'Chưa cập nhật'}`}
                breadcrumbs={[
                    { label: 'Học viên', path: '/students' },
                    { label: student.full_name },
                ]}
                badge={
                    <span className={`status-badge ${studentStatus.className}`} data-testid="student-status-badge">
                        {studentStatus.label}
                    </span>
                }
                actions={
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => navigate('/students')}
                        >
                            Quay lại danh sách
                        </button>
                        {canLifecycleManage && (
                            <>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ borderColor: '#f59e0b', color: '#b45309' }}
                                    onClick={() => navigate(`/students/${student.id}/reserve`)}
                                >
                                    ⏸️ Bảo lưu học viên
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ borderColor: '#3b82f6', color: '#1d4ed8' }}
                                    onClick={() => navigate(`/students/${student.id}/transfer`)}
                                >
                                    🔄 Chuyển lớp
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ borderColor: '#ef4444', color: '#b91c1c' }}
                                    onClick={() => navigate(`/students/${student.id}/drop`)}
                                >
                                    🛑 Thôi học
                                </button>
                            </>
                        )}
                        {canManage && (
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={() => navigate(`/students/${student.id}/edit`)}
                            >
                                Chỉnh sửa hồ sơ
                            </button>
                        )}
                    </div>
                }
            />

            {/* PHẦN 1: THÔNG TIN HỌC VIÊN & ĐÀO TẠO */}
            <div className="student-detail-card" data-testid="student-info-card">
                <div className="student-detail-card-header">
                    <h3 className="student-detail-card-title">
                        <span>👤</span> Thông tin cá nhân & Đào tạo
                    </h3>
                </div>
                <div className="student-info-grid">
                    <div className="student-detail-item">
                        <span className="student-detail-label">Mã học viên</span>
                        <div className="student-detail-value">
                            <span className="student-code-badge">{student.student_code}</span>
                        </div>
                    </div>
                    <div className="student-detail-item">
                        <span className="student-detail-label">Họ và tên</span>
                        <div className="student-detail-value">{student.full_name}</div>
                    </div>
                    <div className="student-detail-item">
                        <span className="student-detail-label">Số điện thoại</span>
                        <div className={`student-detail-value ${!student.phone ? 'empty' : ''}`}>
                            {student.phone || 'Chưa cập nhật'}
                        </div>
                    </div>
                    <div className="student-detail-item">
                        <span className="student-detail-label">Email</span>
                        <div className={`student-detail-value ${!student.email ? 'empty' : ''}`}>
                            {student.email || 'Chưa cập nhật'}
                        </div>
                    </div>
                    <div className="student-detail-item">
                        <span className="student-detail-label">Trình độ đầu vào</span>
                        <div className={`student-detail-value ${!student.entry_level ? 'empty' : ''}`}>
                            {student.entry_level ? (
                                <span className="student-entry-level-badge">{student.entry_level}</span>
                            ) : (
                                'Chưa cập nhật'
                            )}
                        </div>
                    </div>
                    <div className="student-detail-item">
                        <span className="student-detail-label">Chương trình đăng ký</span>
                        <div className={`student-detail-value ${!student.program_name && !student.program_code ? 'empty' : ''}`}>
                            {student.program_name || student.program_code || 'Chưa phân bổ'}
                        </div>
                    </div>
                </div>

                {student.notes && (
                    <div className="student-notes-section">
                        <h4 className="student-notes-title">Ghi chú học viên</h4>
                        <p className="student-notes-content">
                            {student.notes}
                        </p>
                    </div>
                )}
            </div>

            {/* PHẦN 2: CÁC LỚP ĐANG HỌC */}
            <div className="student-detail-card" data-testid="current-class-card">
                <div className="student-detail-card-header">
                    <h3 className="student-detail-card-title">
                        <span>📚</span> Các lớp đang theo học ({currentClasses.length})
                    </h3>
                </div>

                {currentClasses.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {currentClasses.map((cls, idx) => {
                            const cid = cls.class_id || cls.id || String(idx)
                            const cStartDate = cls.expected_start_date || cls.start_date
                            const cStatus = getClassStatusBadge(cls.class_status || cls.status)
                            const eStatus = getEnrollmentStatusBadge(cls.enrollment_status)
                            return (
                                <div key={cid} className="student-current-class-card">
                                    <div className="student-current-class-info">
                                        <div className="student-current-class-title-row">
                                            <span className="student-current-class-code">
                                                Lớp {cls.class_code}
                                            </span>
                                            {(cls.name || cls.class_name) && (
                                                <span className="student-current-class-name">
                                                    • {cls.name || cls.class_name}
                                                </span>
                                            )}
                                            {cStatus && (
                                                <span className={`class-status-badge ${cStatus.className}`}>
                                                    {cStatus.label}
                                                </span>
                                            )}
                                            {eStatus && (
                                                <span className={`enrollment-status-badge ${eStatus.className}`}>
                                                    {eStatus.label}
                                                </span>
                                            )}
                                        </div>
                                        <div className="student-current-class-meta">
                                            <span>
                                                <strong>Ngày khai giảng:</strong> {cStartDate ? formatVietnamDate(cStartDate) : '—'}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                <strong>Ngày ghi danh:</strong> {cls.enrolled_at ? formatVietnamDate(cls.enrolled_at) : '—'}
                                            </span>
                                            {cls.program_name && (
                                                <>
                                                    <span>•</span>
                                                    <span>
                                                        <strong>Chương trình:</strong> {cls.program_name}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {cid && (
                                        <div className="student-current-class-action" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {canLifecycleManage && (
                                                <>
                                                    <Link
                                                        to={`/students/${student.id}/reserve?classId=${cid}`}
                                                        className="btn-secondary"
                                                        style={{ padding: '8px 14px', fontSize: '13px', display: 'inline-block', textDecoration: 'none', borderColor: '#f59e0b', color: '#b45309' }}
                                                    >
                                                        Bảo lưu
                                                    </Link>
                                                    <Link
                                                        to={`/students/${student.id}/transfer?classId=${cid}`}
                                                        className="btn-secondary"
                                                        style={{ padding: '8px 14px', fontSize: '13px', display: 'inline-block', textDecoration: 'none', borderColor: '#3b82f6', color: '#1d4ed8' }}
                                                    >
                                                        Chuyển lớp
                                                    </Link>
                                                    <Link
                                                        to={`/students/${student.id}/drop?classId=${cid}`}
                                                        className="btn-secondary"
                                                        style={{ padding: '8px 14px', fontSize: '13px', display: 'inline-block', textDecoration: 'none', borderColor: '#ef4444', color: '#b91c1c' }}
                                                    >
                                                        Thôi học
                                                    </Link>
                                                </>
                                            )}
                                            <Link
                                                to={`/classes/${cid}`}
                                                className="btn-primary"
                                                style={{ padding: '8px 18px', fontSize: '13px', display: 'inline-block', textDecoration: 'none' }}
                                            >
                                                Xem chi tiết lớp học →
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                        Học viên hiện chưa được ghi danh vào lớp học nào.
                    </p>
                )}
            </div>

            {/* PHẦN 3: LỊCH SỬ CÁC LỚP ĐÃ HỌC */}
            <div className="student-detail-card" data-testid="class-history-card">
                <div className="student-detail-card-header">
                    <h3 className="student-detail-card-title">
                        <span>🕒</span> Lịch sử các lớp đã học ({student.class_history?.length || 0})
                    </h3>
                </div>

                {!student.class_history || student.class_history.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                        Chưa có lịch sử lớp học nào trước đây.
                    </p>
                ) : (
                    <div className="student-table-responsive">
                        <table className="student-history-table">
                            <thead>
                                <tr>
                                    <th>Mã lớp</th>
                                    <th>Tên lớp</th>
                                    <th>Chương trình</th>
                                    <th>Ngày khai giảng</th>
                                    <th>Trạng thái lớp</th>
                                    <th>Trạng thái ghi danh</th>
                                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {student.class_history.map((cls, idx) => {
                                    const cid = cls.class_id || cls.id || String(idx)
                                    const cStartDate = cls.expected_start_date || cls.start_date
                                    const cStatus = getClassStatusBadge(cls.class_status || cls.status)
                                    const eStatus = getEnrollmentStatusBadge(cls.enrollment_status)
                                    return (
                                        <tr key={cid}>
                                            <td>
                                                <strong className="student-code-badge">{cls.class_code}</strong>
                                            </td>
                                            <td>{cls.name || cls.class_name || '—'}</td>
                                            <td>{cls.program_name || cls.program_code || '—'}</td>
                                            <td>{cStartDate ? formatVietnamDate(cStartDate) : '—'}</td>
                                            <td>
                                                <span className={`class-status-badge ${cStatus.className}`}>
                                                    {cStatus.label}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`enrollment-status-badge ${eStatus.className}`}>
                                                    {eStatus.label}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                {cid ? (
                                                    <Link to={`/classes/${cid}`} className="btn-action-view">
                                                        Chi tiết
                                                    </Link>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* PHẦN 4: LỊCH SỬ BIẾN ĐỘNG HỌC TẬP (SCRUM-252 AC 4) */}
            {canLifecycleManage && (
                <div className="student-detail-card" data-testid="lifecycle-history-card">
                    <div className="student-detail-card-header">
                        <h3 className="student-detail-card-title">
                            <span>📋</span> Lịch sử biến động học tập ({lifecycleHistory.length})
                        </h3>
                    </div>

                    {loadingHistory ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 0', color: '#64748b' }}>
                            <div className="spinner" style={{ width: '18px', height: '18px' }} />
                            <span>Đang tải lịch sử biến động học tập...</span>
                        </div>
                    ) : lifecycleHistory.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                            Học viên chưa có lịch sử biến động nào (chưa từng bảo lưu, chuyển lớp hoặc thôi học).
                        </p>
                    ) : (
                        <div className="student-table-responsive">
                            <table className="student-history-table" data-testid="lifecycle-history-table">
                                <thead>
                                    <tr>
                                        <th>Loại thao tác</th>
                                        <th>Lớp học liên quan</th>
                                        <th>Lý do</th>
                                        <th>Ngày hiệu lực</th>
                                        <th>Trạng thái</th>
                                        <th>Người thực hiện</th>
                                        <th>Thời điểm ghi nhận</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lifecycleHistory.map((item) => {
                                        const actionBadge = getLifecycleActionBadge(item.action_type)
                                        const statusBadge = getLifecycleStatusBadge(item.status)

                                        let classInfo = '—'
                                        if (item.action_type === 'transfer') {
                                            classInfo = `${item.source_class_code || 'Lớp cũ'} ➔ ${item.target_class_code || 'Lớp mới'}`
                                        } else if (item.action_type === 'reserve') {
                                            classInfo = item.source_class_code ? `Lớp ${item.source_class_code}` : '—'
                                        } else if (item.action_type === 'drop') {
                                            classInfo = item.source_class_code ? `Lớp ${item.source_class_code}` : 'Toàn bộ khóa học'
                                        }

                                        return (
                                            <tr key={item.id} data-testid={`lifecycle-history-item-${item.id}`}>
                                                <td>
                                                    <span
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            backgroundColor: actionBadge.bg,
                                                            color: actionBadge.color,
                                                            border: `1px solid ${actionBadge.border}`,
                                                        }}
                                                    >
                                                        <span>{actionBadge.icon}</span>
                                                        <span>{actionBadge.label}</span>
                                                    </span>
                                                </td>
                                                <td>
                                                    <strong style={{ color: '#0f172a' }}>{classInfo}</strong>
                                                </td>
                                                <td style={{ maxWidth: '280px', wordBreak: 'break-word', color: '#334155' }}>
                                                    {item.reason}
                                                </td>
                                                <td>
                                                    <span style={{ fontWeight: 500 }}>
                                                        {item.effective_date ? formatVietnamDate(item.effective_date) : '—'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: 500,
                                                            backgroundColor: statusBadge.bg,
                                                            color: statusBadge.color,
                                                            border: `1px solid ${statusBadge.border}`,
                                                        }}
                                                    >
                                                        {statusBadge.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: '13px', color: '#475569' }}>
                                                        {item.performer_name || item.performer_email || 'Hệ thống'}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '13px', color: '#64748b' }}>
                                                    {item.created_at ? formatVietnamDate(item.created_at) : '—'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

