import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    getClassDetail,
    getClassSubjects,
    updateClassStatus,
    CLASS_STATUS_LABELS,
    type TrainingClass,
    type ClassSubjectItem,
    type ClassStatus,
    ApiError,
} from '../api/classApi'
import { getClassRoster, type EnrollmentItem } from '../api/enrollmentApi'
import { getClassSchedules, type ClassScheduleItem } from '../api/scheduleApi'
import { PageHeader } from '../components/PageHeader'
import { DetailNavTabs } from '../components/DetailNavTabs'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { formatShiftLabel, formatRoomLabel, formatInstructorLabel, formatScheduleStatus } from '../utils/scheduleDisplayUtils'
import { getRolePermissions, SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './ClassesPage.css'

export type ClassDetailTab = 'info' | 'subjects' | 'instructors' | 'students' | 'schedules'

export function ClassDetailPage() {
    const { classId } = useParams<{ classId: string }>()
    const location = useLocation()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role, roles } = useSession()

    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const normalizedRoles = effectiveRoles.map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
    const canManage =
        permissions?.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) ||
        normalizedRoles.includes('admin') ||
        normalizedRoles.includes('training_manager')

    const effectiveSchedulePermissions = permissions?.length ? permissions : getRolePermissions(normalizedRoles)
    const canManageSchedule = effectiveSchedulePermissions.includes(SYSTEM_PERMISSIONS.SCHEDULE_MANAGE)
    const canLifecycleManage =
        permissions?.includes(SYSTEM_PERMISSIONS.STUDENT_LIFECYCLE_MANAGE) ||
        normalizedRoles.includes('training_manager')

    // Determine active tab from URL pathname
    let activeTab: ClassDetailTab = 'info'
    if (location.pathname.endsWith('/subjects')) activeTab = 'subjects'
    else if (location.pathname.endsWith('/instructors')) activeTab = 'instructors'
    else if (location.pathname.endsWith('/students')) activeTab = 'students'
    else if (location.pathname.endsWith('/schedules')) activeTab = 'schedules'

    // Data states
    const [classData, setClassData] = useState<TrainingClass | null>(null)
    const [subjects, setSubjects] = useState<ClassSubjectItem[]>([])
    const [students, setStudents] = useState<EnrollmentItem[]>([])
    const [schedules, setSchedules] = useState<ClassScheduleItem[]>([])

    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

    // Load main class data
    const loadClass = useCallback(async () => {
        if (!classId) return
        try {
            setIsLoading(true)
            setErrorMessage(null)
            const detail = await getClassDetail(requestFn, classId)
            setClassData(detail)

            // Load subdata based on activeTab
            if (activeTab === 'subjects' || activeTab === 'instructors') {
                const subs = await getClassSubjects(requestFn, classId).catch(() => [])
                setSubjects(subs)
            } else if (activeTab === 'students') {
                const roster = await getClassRoster(requestFn, classId).catch(() => ({ items: [] }))
                setStudents(roster.items || [])
            } else if (activeTab === 'schedules') {
                const scheds = await getClassSchedules(requestFn, classId).catch(() => ({ schedules: [] }))
                setSchedules(scheds?.schedules || [])
            }
        } catch (err: unknown) {
            if (err instanceof ApiError && err.status === 404) {
                setErrorMessage('Không tìm thấy lớp học yêu cầu.')
            } else {
                setErrorMessage(getErrorMessage(err, 'Lỗi khi tải thông tin lớp học.'))
            }
        } finally {
            setIsLoading(false)
        }
    }, [classId, requestFn, activeTab])

    useEffect(() => {
        loadClass()
    }, [loadClass])

    const handleStatusChange = async (newStatus: ClassStatus) => {
        if (!classId || isUpdatingStatus) return
        setIsUpdatingStatus(true)
        setErrorMessage(null)
        setSuccessMessage(null)
        try {
            const updated = await updateClassStatus(requestFn, classId, newStatus)
            setClassData(updated)
            setSuccessMessage(getSuccessMessage('UPDATE_STATUS_SUCCESS', `Chuyển trạng thái lớp thành công: ${CLASS_STATUS_LABELS[newStatus]}`))
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi cập nhật trạng thái lớp.'))
        } finally {
            setIsUpdatingStatus(false)
        }
    }

    if (isLoading) {
        return (
            <div className="classes-container">
                <div className="classes-loading">
                    <div className="spinner" />
                    <span>Đang tải thông tin lớp học...</span>
                </div>
            </div>
        )
    }

    if (errorMessage && !classData) {
        return (
            <div className="classes-container">
                <PageHeader
                    title="Chi tiết lớp học"
                    breadcrumbs={[
                        { label: 'Lớp học', path: '/classes' },
                        { label: 'Chi tiết' },
                    ]}
                />
                <div className="classes-alert error" role="alert">
                    <span>{errorMessage}</span>
                </div>
                <div style={{ marginTop: '16px' }}>
                    <button type="button" className="btn-secondary" onClick={() => navigate('/classes')}>
                        Quay lại danh sách lớp học
                    </button>
                </div>
            </div>
        )
    }

    if (!classData) return null

    const navItems = [
        { key: 'info', label: 'Thông tin chung', path: `/classes/${classData.id}` },
        { key: 'subjects', label: `Môn học (${classData.copied_subjects_count ?? classData.subjects?.length ?? 0})`, path: `/classes/${classData.id}/subjects` },
        { key: 'instructors', label: 'Giảng viên', path: `/classes/${classData.id}/instructors` },
        { key: 'students', label: `Học viên (${classData.enrolled_count}/${classData.max_capacity})`, path: `/classes/${classData.id}/students` },
        { key: 'schedules', label: 'Thời khóa biểu', path: `/classes/${classData.id}/schedules` },
    ]

    return (
        <div className="classes-container" data-testid="class-detail-page">
            <PageHeader
                title={`Lớp ${classData.class_code}`}
                subtitle={`Chương trình: ${classData.program_name || classData.program_code || 'Chưa xác định'}`}
                breadcrumbs={[
                    { label: 'Lớp học', path: '/classes' },
                    { label: `Lớp ${classData.class_code}` },
                ]}
                badge={
                    <span className={`status-badge status-${classData.status}`}>
                        {CLASS_STATUS_LABELS[classData.status] || classData.status}
                    </span>
                }
                actions={
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => navigate('/classes')}
                        >
                            Quay lại danh sách
                        </button>
                        {canManage && (
                            <Link
                                to={`/classes/${classData.id}/enrollments/new`}
                                className="btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <span>+ Ghi danh học viên</span>
                            </Link>
                        )}
                        {canManage && (
                            <Link
                                to={`/classes/${classData.id}/schedules/generate`}
                                className="btn-secondary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff' }}
                            >
                                <span>📅 Sinh thời khóa biểu</span>
                            </Link>
                        )}
                    </div>
                }
            />

            <DetailNavTabs items={navItems} />

            {errorMessage && (
                <div className="classes-alert error" role="alert" style={{ marginBottom: '16px' }}>
                    <span>{errorMessage}</span>
                </div>
            )}
            {successMessage && (
                <div className="classes-alert success" role="alert" style={{ marginBottom: '16px' }}>
                    <span>{successMessage}</span>
                </div>
            )}

            {/* TAB 1: THÔNG TIN CHUNG */}
            {activeTab === 'info' && (
                <div className="modal-content" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        <div className="detail-item">
                            <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Mã lớp học</span>
                            <strong style={{ fontSize: '16px', color: '#0f172a' }}>{classData.class_code}</strong>
                        </div>
                        <div className="detail-item">
                            <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Chương trình đào tạo</span>
                            <strong style={{ fontSize: '16px', color: '#0f172a' }}>{classData.program_name || classData.program_code || '—'}</strong>
                        </div>
                        <div className="detail-item">
                            <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ngày dự kiến khai giảng</span>
                            <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                                {classData.expected_start_date ? new Date(classData.expected_start_date).toLocaleDateString('vi-VN') : 'Chưa thiết lập'}
                            </strong>
                        </div>
                        <div className="detail-item">
                            <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Sĩ số lớp</span>
                            <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                                {classData.enrolled_count} / {classData.max_capacity} học viên
                                {classData.enrolled_count >= classData.max_capacity && (
                                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>(Đã đủ sĩ số)</span>
                                )}
                            </strong>
                        </div>
                        <div className="detail-item">
                            <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Hình thức học</span>
                            <strong style={{ fontSize: '16px', color: '#0f172a', textTransform: 'capitalize' }}>{classData.learning_mode}</strong>
                        </div>
                        <div className="detail-item">
                            <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Trạng thái vòng đời</span>
                            <strong style={{ fontSize: '16px', color: '#0f172a' }}>{CLASS_STATUS_LABELS[classData.status] || classData.status}</strong>
                        </div>
                    </div>

                    {canManage && (
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '20px' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>Chuyển đổi trạng thái lớp:</h4>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className={`btn-secondary ${classData.status === 'preparing' ? 'active' : ''}`}
                                    onClick={() => handleStatusChange('preparing')}
                                    disabled={isUpdatingStatus || classData.status === 'preparing'}
                                >
                                    Chuẩn bị
                                </button>
                                <button
                                    type="button"
                                    className={`btn-secondary ${classData.status === 'in_progress' ? 'active' : ''}`}
                                    onClick={() => handleStatusChange('in_progress')}
                                    disabled={isUpdatingStatus || classData.status === 'in_progress'}
                                >
                                    Đang học
                                </button>
                                <button
                                    type="button"
                                    className={`btn-secondary ${classData.status === 'completed' ? 'active' : ''}`}
                                    onClick={() => handleStatusChange('completed')}
                                    disabled={isUpdatingStatus || classData.status === 'completed'}
                                >
                                    Kết thúc
                                </button>
                                <button
                                    type="button"
                                    className={`btn-secondary ${classData.status === 'cancelled' ? 'active' : ''}`}
                                    onClick={() => handleStatusChange('cancelled')}
                                    disabled={isUpdatingStatus || classData.status === 'cancelled'}
                                    style={{ color: '#ef4444' }}
                                >
                                    Hủy lớp
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: MÔN HỌC */}
            {activeTab === 'subjects' && (
                <div className="modal-content" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Danh sách môn học sao chép của lớp</h3>
                        <span style={{ fontSize: '14px', color: '#64748b' }}>Tổng: {subjects.length} môn</span>
                    </div>

                    {subjects.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '14px' }}>Chưa có môn học nào được sao chép cho lớp học này.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="classes-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>STT</th>
                                        <th>Mã môn</th>
                                        <th>Tên môn học</th>
                                        <th>Số tín chỉ</th>
                                        <th>Học kỳ</th>
                                        <th>Loại môn</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjects.map((sub, idx) => (
                                        <tr key={sub.id || idx}>
                                            <td>{sub.order_index ?? idx + 1}</td>
                                            <td><strong>{sub.subject_code}</strong></td>
                                            <td>{sub.subject_name}</td>
                                            <td>{sub.credits} tín chỉ</td>
                                            <td>{sub.semester ? `Học kỳ ${sub.semester}` : '—'}</td>
                                            <td>
                                                <span className={`badge ${sub.is_mandatory ? 'badge-primary' : 'badge-secondary'}`}>
                                                    {sub.is_mandatory ? 'Bắt buộc' : 'Tự chọn'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: GIẢNG VIÊN (SCRUM-220) */}
            {activeTab === 'instructors' && (
                <div className="modal-content" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Phân công giảng viên theo từng môn học</h3>
                        <span style={{ fontSize: '14px', color: '#64748b' }}>Tổng: {subjects.length} môn</span>
                    </div>

                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                        Quản lý phân công giảng viên chính và trợ giảng theo từng cặp lớp – môn học. Giảng viên được phân công sẽ nhìn thấy lớp học trong danh sách của mình.
                    </p>

                    {subjects.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '14px' }}>Chưa có môn học để hiển thị phân công.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="classes-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '120px' }}>Mã môn</th>
                                        <th>Tên môn học</th>
                                        <th>Giảng viên chính</th>
                                        <th>Trợ giảng</th>
                                        {canManage && <th style={{ textAlign: 'right', width: '200px' }}>Thao tác</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjects.map((sub) => {
                                        const hasAssignment = Boolean(sub.main_instructor || (sub.assistants && sub.assistants.length > 0))
                                        return (
                                            <tr key={sub.id} data-testid={`instructor-row-${sub.id}`}>
                                                <td><strong>{sub.subject_code}</strong></td>
                                                <td>{sub.subject_name}</td>
                                                <td data-testid={`main-instructor-cell-${sub.id}`}>
                                                    {sub.main_instructor ? (
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{sub.main_instructor.name}</div>
                                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{sub.main_instructor.email}</div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa phân công</span>
                                                    )}
                                                </td>
                                                <td data-testid={`assistants-cell-${sub.id}`}>
                                                    {sub.assistants && sub.assistants.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {sub.assistants.map((ast) => (
                                                                <div key={ast.id}>
                                                                    <span style={{ fontWeight: 500, color: '#0f172a' }}>{ast.name}</span>
                                                                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>({ast.email})</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa có trợ giảng</span>
                                                    )}
                                                </td>
                                                {canManage && (
                                                    <td style={{ textAlign: 'right' }}>
                                                        <Link
                                                            to={`/classes/${classData.id}/subjects/${sub.id}/instructors`}
                                                            className={hasAssignment ? 'btn-secondary' : 'btn-primary'}
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 14px' }}
                                                            data-testid={`assign-instructor-btn-${sub.id}`}
                                                        >
                                                            {hasAssignment ? 'Chỉnh sửa phân công' : 'Phân công'}
                                                        </Link>
                                                    </td>
                                                )}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 4: HỌC VIÊN */}
            {activeTab === 'students' && (
                <div className="modal-content" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                            Danh sách học viên ({students.length} / {classData.max_capacity})
                        </h3>
                        {canManage && (
                            <Link to={`/classes/${classData.id}/enrollments/new`} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                                + Ghi danh học viên
                            </Link>
                        )}
                    </div>

                    {students.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                            <p style={{ marginBottom: '12px' }}>Chưa có học viên nào được ghi danh vào lớp học này.</p>
                            {canManage && (
                                <Link to={`/classes/${classData.id}/enrollments/new`} className="btn-secondary">
                                    Thực hiện ghi danh học viên ngay
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="classes-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Mã học viên</th>
                                        <th>Họ và tên</th>
                                        <th>Email</th>
                                        <th>Số điện thoại</th>
                                        <th>Ngày ghi danh</th>
                                        <th>Trạng thái</th>
                                        {canLifecycleManage && <th style={{ textAlign: 'right' }}>Thao tác</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((st, idx) => (
                                        <tr key={st.id || idx}>
                                            <td>{idx + 1}</td>
                                            <td><strong>{st.student_code || '—'}</strong></td>
                                            <td>
                                                <Link to={`/students/${st.student_id}`} style={{ color: '#0284c7', fontWeight: 500 }}>
                                                    {st.full_name || '—'}
                                                </Link>
                                            </td>
                                            <td>{st.email || '—'}</td>
                                            <td>{st.phone || '—'}</td>
                                            <td>{st.enrolled_at ? new Date(st.enrolled_at).toLocaleDateString('vi-VN') : '—'}</td>
                                            <td>
                                                <span className={`badge status-${st.status || 'active'}`}>
                                                    {st.status === 'enrolled' ? 'Đã ghi danh' : (st.status || 'Đang học')}
                                                </span>
                                            </td>
                                            {canLifecycleManage && (
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                        <Link
                                                            to={`/students/${st.student_id}/reserve?classId=${classData.id}`}
                                                            className="btn-secondary"
                                                            style={{ padding: '4px 10px', fontSize: '12px', textDecoration: 'none', borderColor: '#f59e0b', color: '#b45309' }}
                                                        >
                                                            Bảo lưu
                                                        </Link>
                                                        <Link
                                                            to={`/students/${st.student_id}/transfer?classId=${classData.id}`}
                                                            className="btn-secondary"
                                                            style={{ padding: '4px 10px', fontSize: '12px', textDecoration: 'none', borderColor: '#3b82f6', color: '#1d4ed8' }}
                                                        >
                                                            Chuyển lớp
                                                        </Link>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 5: THỜI KHÓA BIỂU */}
            {activeTab === 'schedules' && (
                <div className="modal-content" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                            Thời khóa biểu của lớp ({schedules.length} buổi học)
                        </h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {canManageSchedule && (
                                <Link to={`/classes/${classData.id}/schedules/generate`} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                                    📅 Sinh thời khóa biểu tự động
                                </Link>
                            )}
                        </div>
                    </div>

                    {schedules.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                            <p style={{ marginBottom: '12px' }}>Lớp học này chưa có lịch học nào được thiết lập.</p>
                            {canManageSchedule && (
                                <Link to={`/classes/${classData.id}/schedules/generate`} className="btn-secondary">
                                    Cấu hình sinh thời khóa biểu tự động
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="classes-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>Buổi #</th>
                                        <th>Ngày học</th>
                                        <th>Ca học / Giờ</th>
                                        <th>Môn học</th>
                                        <th>Giảng viên</th>
                                        <th>Phòng học</th>
                                        <th>Trạng thái</th>
                                        <th style={{ textAlign: 'right' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schedules.map((sch) => (
                                        <tr key={sch.id}>
                                            <td><strong>#{sch.session_number}</strong></td>
                                            <td>{sch.learning_date ? new Date(sch.learning_date).toLocaleDateString('vi-VN') : '—'}</td>
                                            <td>{formatShiftLabel(sch.shift, sch.start_time, sch.end_time)}</td>
                                            <td>{sch.topic || (sch as { subject_name?: string }).subject_name || '—'}</td>
                                            <td>{formatInstructorLabel(sch.instructor_name, sch.instructor_id)}</td>
                                            <td>{formatRoomLabel(sch.room_id, sch.room_name, sch.is_online, sch.online_link)}</td>
                                            <td>
                                                {(() => {
                                                    const st = formatScheduleStatus(sch.status)
                                                    return (
                                                        <span className={`status-badge status-${st.className}`}>
                                                            {st.label}
                                                        </span>
                                                    )
                                                })()}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    <Link
                                                        to={`/classes/${classData.id}/schedules/${sch.id}`}
                                                        className="btn-action-view"
                                                        style={{ padding: '4px 8px', fontSize: '12px' }}
                                                    >
                                                        Chi tiết
                                                    </Link>
                                                    {canManageSchedule && sch.status !== 'completed' && sch.status !== 'cancelled' && !sch.attendance_checked && (
                                                        <Link
                                                            to={`/classes/${classData.id}/schedules/${sch.id}/edit`}
                                                            className="btn-action-edit"
                                                            style={{ padding: '4px 8px', fontSize: '12px' }}
                                                        >
                                                            Sửa / Dời
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
