import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getClassDetail, type TrainingClass } from '../api/classApi'
import {
    getClassSchedules,
    cancelClassScheduleItem,
    type ClassScheduleItem,
} from '../api/scheduleApi'
import { PageHeader } from '../components/PageHeader'
import { DetailNavTabs } from '../components/DetailNavTabs'
import { ConfirmModal } from '../components/ConfirmModal'
import { toast } from '../components/ToastPortal'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { formatShiftLabel, formatRoomLabel, formatInstructorLabel, formatScheduleStatus } from '../utils/scheduleDisplayUtils'
import { getRolePermissions, SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './ClassesPage.css'

export function ScheduleSessionDetailPage() {
    const { classId, scheduleId } = useParams<{ classId: string; scheduleId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role, roles } = useSession()

    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const normalizedRoles = effectiveRoles.map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
    const effectivePermissions = permissions?.length ? permissions : getRolePermissions(normalizedRoles)
    const canManage = effectivePermissions.includes(SYSTEM_PERMISSIONS.SCHEDULE_MANAGE)

    const [classData, setClassData] = useState<TrainingClass | null>(null)
    const [schedule, setSchedule] = useState<ClassScheduleItem | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Cancel form state
    const [isCancelling, setIsCancelling] = useState(false)
    const [cancelReason, setCancelReason] = useState('')
    const [cancelError, setCancelError] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        if (!classId || !scheduleId) return

        setIsLoading(true)
        setErrorMessage(null)

        Promise.all([
            getClassDetail(requestFn, classId),
            getClassSchedules(requestFn, classId),
        ])
            .then(([cls, schedRes]) => {
                if (isMounted) {
                    setClassData(cls)
                    const list = schedRes?.schedules || (Array.isArray(schedRes) ? schedRes : [])
                    const found = list.find((s: ClassScheduleItem) => s.id === scheduleId)
                    if (found) {
                        setSchedule(found)
                    } else {
                        setErrorMessage('Không tìm thấy buổi học trong lớp này.')
                    }
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setErrorMessage(getErrorMessage(err, 'Lỗi khi tải thông tin buổi học.'))
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [classId, scheduleId, requestFn])

    const [isConfirmOpen, setIsConfirmOpen] = useState(false)

    const handleCancelSession = () => {
        if (!classId || !scheduleId) return
        const trimmed = cancelReason.trim()
        if (!trimmed) {
            setCancelError('Vui lòng nhập lý do hủy buổi học.')
            return
        }
        setIsConfirmOpen(true)
    }

    const confirmCancelSession = async () => {
        if (!classId || !scheduleId || isCancelling) return
        const trimmed = cancelReason.trim()

        setIsCancelling(true)
        setCancelError(null)

        try {
            const res = await cancelClassScheduleItem(requestFn, classId, scheduleId, { reason: trimmed })
            const msg = getSuccessMessage('CANCEL_SCHEDULE_SUCCESS', `Đã hủy buổi học thành công. Đã ghi nhận thông báo cho ${res.notifications_sent} người liên quan trong hệ thống.`)
            setSuccessMessage(msg)
            toast.success(msg)
            setSchedule(res.schedule)
            setCancelReason('')
            setIsConfirmOpen(false)
        } catch (err: unknown) {
            const errText = getErrorMessage(err, 'Lỗi khi hủy buổi học.')
            setCancelError(errText)
            toast.error(errText)
        } finally {
            setIsCancelling(false)
        }
    }

    if (isLoading) {
        return (
            <div className="classes-container">
                <div className="classes-loading">
                    <div className="spinner" />
                    <span>Đang tải thông tin buổi học...</span>
                </div>
            </div>
        )
    }

    if (!classData || !schedule) {
        return (
            <div className="classes-container">
                <PageHeader
                    title="Chi tiết buổi học"
                    breadcrumbs={[
                        { label: 'Lớp học', path: '/classes' },
                        { label: 'Chi tiết buổi học' },
                    ]}
                />
                <div className="classes-alert error" role="alert">
                    <span>{errorMessage || 'Không tìm thấy thông tin buổi học.'}</span>
                </div>
                <div style={{ marginTop: '16px' }}>
                    <button type="button" className="btn-secondary" onClick={() => navigate(`/classes/${classId || ''}/schedules`)}>
                        Quay lại thời khóa biểu
                    </button>
                </div>
            </div>
        )
    }

    const navItems = [
        { key: 'info', label: 'Thông tin chung', path: `/classes/${classData.id}` },
        { key: 'subjects', label: `Môn học (${classData.copied_subjects_count ?? 0})`, path: `/classes/${classData.id}/subjects` },
        { key: 'instructors', label: 'Giảng viên', path: `/classes/${classData.id}/instructors` },
        { key: 'students', label: `Học viên (${classData.enrolled_count}/${classData.max_capacity})`, path: `/classes/${classData.id}/students` },
        { key: 'schedules', label: 'Thời khóa biểu', path: `/classes/${classData.id}/schedules` },
    ]

    const isCancelled = schedule.status === 'cancelled'
    const isCompleted = schedule.status === 'completed'
    const isAttendanceChecked = Boolean(schedule.attendance_checked)

    return (
        <div className="classes-container" data-testid="schedule-session-detail-page">
            <PageHeader
                title={`Buổi #${schedule.session_number}: ${schedule.topic || 'Buổi học'}`}
                subtitle={`Lớp: ${classData.class_code} • Ngày học: ${schedule.learning_date ? new Date(schedule.learning_date).toLocaleDateString('vi-VN') : '—'}`}
                breadcrumbs={[
                    { label: 'Lớp học', path: '/classes' },
                    { label: `Lớp ${classData.class_code}`, path: `/classes/${classData.id}` },
                    { label: 'Thời khóa biểu', path: `/classes/${classData.id}/schedules` },
                    { label: `Buổi #${schedule.session_number}` },
                ]}
                badge={
                    (() => {
                        const st = formatScheduleStatus(schedule.status)
                        return (
                            <span className={`status-badge status-${st.className}`}>
                                {st.label}
                            </span>
                        )
                    })()
                }
                actions={
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => navigate(`/classes/${classData.id}/schedules`)}
                        >
                            Quay lại lịch lớp
                        </button>
                        {classData && schedule && (
                            <Link
                                to={`/classes/${classData.id}/schedules/${schedule.id}/attendance`}
                                className="btn-secondary"
                                style={{ borderColor: '#0284c7', color: '#0284c7' }}
                                data-testid="btn-go-to-attendance"
                            >
                                📋 Điểm danh buổi học
                            </Link>
                        )}
                        {canManage && !isCancelled && !isCompleted && !isAttendanceChecked && (
                            <Link
                                to={`/classes/${classData.id}/schedules/${schedule.id}/edit`}
                                className="btn-primary"
                            >
                                Sửa / Dời buổi học
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

            {isAttendanceChecked && (
                <div className="classes-alert error" role="alert" style={{ marginBottom: '16px' }}>
                    <span>Buổi học này đã được điểm danh, hệ thống tự động khóa tính năng chỉnh sửa hoặc hủy lịch.</span>
                </div>
            )}

            {isCancelled && schedule.cancellation_reason && (
                <div className="classes-alert error" role="alert" style={{ marginBottom: '16px' }}>
                    <span>Buổi học đã bị hủy. Lý do: <strong>{schedule.cancellation_reason}</strong></span>
                </div>
            )}

            <div className="modal-content" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Số thứ tự buổi</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>Buổi #{schedule.session_number}</strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ngày học</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                            {schedule.learning_date ? new Date(schedule.learning_date).toLocaleDateString('vi-VN') : '—'}
                        </strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ca học & Giờ</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                            {formatShiftLabel(schedule.shift, schedule.start_time, schedule.end_time)}
                        </strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Môn học / Buổi học</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                            {(schedule as { subject_name?: string }).subject_name || schedule.topic || '—'}
                        </strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Giảng viên phụ trách</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                            {formatInstructorLabel(schedule.instructor_name, schedule.instructor_id)}
                        </strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Phòng học</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                            {formatRoomLabel(schedule.room_id, schedule.room_name, schedule.is_online, schedule.online_link)}
                        </strong>
                        {schedule.online_link && (
                            <div style={{ marginTop: '4px' }}>
                                <a
                                    href={schedule.online_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'underline' }}
                                >
                                    🔗 Link phòng học trực tuyến
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Chủ đề bài học</h4>
                    <p style={{ fontSize: '14px', color: '#334155', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', lineHeight: '1.6' }}>
                        {schedule.topic || 'Chưa cập nhật chủ đề chi tiết.'}
                    </p>
                </div>

                {/* FORM HỦY BUỔI HỌC (NẰM TRONG TRANG) */}
                {canManage && !isCancelled && !isAttendanceChecked && (
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px', marginTop: '24px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#ef4444', marginBottom: '8px' }}>
                            Hủy buổi học này
                        </h4>
                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                            Việc hủy buổi học sẽ gửi thông báo đến toàn bộ học viên và giảng viên của lớp. Vui lòng nhập rõ lý do hủy.
                        </p>

                        {cancelError && (
                            <div className="classes-alert error" style={{ marginBottom: '12px' }} role="alert">
                                <span>{cancelError}</span>
                            </div>
                        )}

                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <textarea
                                className="form-textarea"
                                rows={3}
                                placeholder="Nhập lý do hủy buổi học (bắt buộc)..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                disabled={isCancelling}
                            />
                        </div>

                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleCancelSession}
                            disabled={isCancelling || !cancelReason.trim()}
                            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                        >
                            {isCancelling ? 'Đang hủy buổi học...' : 'Xác nhận hủy buổi học'}
                        </button>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={isConfirmOpen}
                title="Xác nhận hủy buổi học"
                message={`Bạn có chắc chắn muốn hủy Buổi #${schedule?.session_number}? Thông báo sẽ được ghi nhận trong hệ thống cho giảng viên và học viên.`}
                confirmText="Hủy buổi học"
                cancelText="Quay lại"
                type="danger"
                isLoading={isCancelling}
                onConfirm={confirmCancelSession}
                onCancel={() => setIsConfirmOpen(false)}
            />
        </div>
    )
}
