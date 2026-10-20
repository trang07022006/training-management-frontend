import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getClassDetail, type TrainingClass } from '../api/classApi'
import { fetchUsersApi, type User } from '../api/userApi'
import {
    getClassSchedules,
    updateClassScheduleItem,
    type ClassScheduleItem,
    type UpdateSchedulePayload,
    type ScheduleConflictItem,
    ApiError,
} from '../api/scheduleApi'
import { PageHeader } from '../components/PageHeader'
import { DetailNavTabs } from '../components/DetailNavTabs'
import { ClassroomSelect } from '../components/ClassroomSelect'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { SHIFT_OPTIONS } from '../utils/scheduleDisplayUtils'
import { getRolePermissions, SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { ToastPortal } from '../components/ToastPortal'
import './ClassesPage.css'

export function ScheduleSessionEditPage() {
    const { classId, scheduleId } = useParams<{ classId: string; scheduleId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role, roles } = useSession()

    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const normalizedRoles = effectiveRoles.map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
    const effectivePermissions = permissions?.length ? permissions : getRolePermissions(normalizedRoles)
    const canManage = effectivePermissions.includes(SYSTEM_PERMISSIONS.SCHEDULE_MANAGE)

    const [classData, setClassData] = useState<TrainingClass | null>(null)
    const [schedule, setSchedule] = useState<ClassScheduleItem | null>(null)
    const [instructors, setInstructors] = useState<User[]>([])

    // Form fields
    const [learningDate, setLearningDate] = useState('')
    const [shift, setShift] = useState('shift_1')
    const [startTime, setStartTime] = useState('07:30')
    const [endTime, setEndTime] = useState('09:30')
    const [roomId, setRoomId] = useState('')
    const [instructorId, setInstructorId] = useState('')
    const [topic, setTopic] = useState('')
    const [allowConflictOverride, setAllowConflictOverride] = useState(false)

    const [conflicts, setConflicts] = useState<ScheduleConflictItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [isDirty, setIsDirty] = useState(false)

    useEffect(() => {
        let isMounted = true
        if (!classId || !scheduleId) return

        setIsLoading(true)
        setErrorMessage(null)

        Promise.all([
            getClassDetail(requestFn, classId),
            getClassSchedules(requestFn, classId),
            fetchUsersApi(requestFn, { role: 'trainer', page_size: 100 }).catch(() => ({ items: [] })),
        ])
            .then(([cls, schedRes, instRes]) => {
                if (isMounted) {
                    setClassData(cls)
                    setInstructors(instRes?.items || [])
                    const list = schedRes?.schedules || (Array.isArray(schedRes) ? schedRes : [])
                    const found = list.find((s: ClassScheduleItem) => s.id === scheduleId)
                    if (found) {
                        setSchedule(found)
                        setLearningDate(found.learning_date || '')
                        setShift(found.shift || 'shift_1')
                        setStartTime(found.start_time || '07:30')
                        setEndTime(found.end_time || '09:30')
                        setRoomId(found.classroom_id || found.room_id || '')
                        setInstructorId(found.instructor_id || '')
                        setTopic(found.topic || '')
                        if (found.status === 'cancelled') {
                            setErrorMessage('Buổi học này đã bị hủy. Hệ thống không cho phép chỉnh sửa buổi học đã bị hủy.')
                        } else if (found.attendance_checked) {
                            setErrorMessage('Buổi học này đã được điểm danh. Hệ thống không cho phép chỉnh sửa buổi học đã điểm danh.')
                        }
                    } else {
                        setErrorMessage('Không tìm thấy buổi học.')
                    }
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                console.error('ScheduleSessionEditPage load error:', err)
                if (isMounted) {
                    setErrorMessage(getErrorMessage(err, 'Lỗi khi tải thông tin buổi học.'))
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [classId, scheduleId, requestFn])

    const isBlocked = schedule?.status === 'cancelled' || Boolean(schedule?.attendance_checked)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!classId || !scheduleId) return

        if (schedule?.status === 'cancelled') {
            setErrorMessage('Không thể chỉnh sửa buổi học đã bị hủy.')
            return
        }
        if (schedule?.attendance_checked) {
            setErrorMessage('Không thể chỉnh sửa buổi học đã được điểm danh.')
            return
        }

        if (!learningDate) {
            setErrorMessage('Vui lòng chọn ngày học mới.')
            return
        }

        setIsSubmitting(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        const payload: UpdateSchedulePayload = {
            learning_date: learningDate,
            shift,
            room_id: roomId.trim() ? roomId.trim() : null,
            instructor_id: instructorId ? instructorId : null,
            topic: topic.trim() || undefined,
            allow_conflict_override: allowConflictOverride,
        }

        if (shift === 'custom') {
            payload.start_time = startTime
            payload.end_time = endTime
        }

        try {
            const res = await updateClassScheduleItem(requestFn, classId, scheduleId, payload)
            let successMsg = `Cập nhật buổi học thành công! Đã ghi nhận thông báo cho ${res.notifications_sent} người liên quan trong hệ thống.`
            if (res.capacity_warning) {
                successMsg += ` (${res.capacity_warning})`
            }
            setSuccessMessage(getSuccessMessage('UPDATE_SCHEDULE_SUCCESS', successMsg))
            setIsDirty(false)
            setTimeout(() => {
                navigate(`/classes/${classId}/schedules/${scheduleId}`)
            }, 800)
        } catch (err: unknown) {
            const errDetails = err as { details?: { conflicts?: ScheduleConflictItem[] }; data?: { conflicts?: ScheduleConflictItem[] } }
            const conflictList = errDetails.details?.conflicts || errDetails.data?.conflicts
            if (err instanceof ApiError && conflictList) {
                setConflicts(conflictList)
                setErrorMessage('Phát hiện xung đột lịch học. Bạn có thể bật "Cho phép ghi đè xung đột" để tiếp tục.')
            } else {
                setErrorMessage(getErrorMessage(err, 'Lỗi khi cập nhật buổi học.'))
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCancel = () => {
        if (isDirty) {
            const confirmed = window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn rời khỏi trang?')
            if (!confirmed) return
        }
        navigate(`/classes/${classId}/schedules/${scheduleId}`)
    }

    if (!canManage) {
        return (
            <div className="classes-container">
                <PageHeader
                    title="Sửa buổi học"
                    breadcrumbs={[
                        { label: 'Lớp học', path: '/classes' },
                        { label: 'Lịch học', path: `/classes/${classId}/schedules` },
                        { label: 'Sửa buổi học' },
                    ]}
                />
                <div className="classes-alert error" role="alert" style={{ marginBottom: '16px' }}>
                    <span>Bạn không có quyền chỉnh sửa thời khóa biểu lớp học.</span>
                </div>
                <button type="button" className="btn-secondary" onClick={() => navigate(`/classes/${classId}/schedules/${scheduleId}`)}>
                    Quay lại chi tiết buổi học
                </button>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="classes-container">
                <div className="classes-loading">
                    <div className="spinner" />
                    <span>Đang tải thông tin...</span>
                </div>
            </div>
        )
    }

    if (!classData || !schedule) {
        return (
            <div className="classes-container">
                <PageHeader
                    title="Sửa buổi học"
                    breadcrumbs={[
                        { label: 'Lớp học', path: '/classes' },
                        { label: 'Sửa buổi học' },
                    ]}
                />
                <div className="classes-alert error" role="alert">
                    <span>{errorMessage || 'Không tìm thấy buổi học.'}</span>
                </div>
            </div>
        )
    }

    const isAttendanceChecked = Boolean(schedule.attendance_checked)
    if (isAttendanceChecked) {
        return (
            <div className="classes-container">
                <PageHeader
                    title="Không thể chỉnh sửa"
                    breadcrumbs={[
                        { label: 'Lớp học', path: '/classes' },
                        { label: `Lớp ${classData.class_code}`, path: `/classes/${classData.id}` },
                        { label: 'Thời khóa biểu', path: `/classes/${classData.id}/schedules` },
                        { label: `Buổi #${schedule.session_number}`, path: `/classes/${classData.id}/schedules/${schedule.id}` },
                        { label: 'Sửa' },
                    ]}
                />
                <div className="classes-alert error" role="alert">
                    <span>Buổi học này đã được điểm danh, hệ thống tự động khóa tính năng chỉnh sửa.</span>
                </div>
                <div style={{ marginTop: '16px' }}>
                    <button type="button" className="btn-back" onClick={() => navigate(`/classes/${classData.id}/schedules/${schedule.id}`)}>
                        Quay lại chi tiết buổi học
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

    return (
        <div className="classes-container" data-testid="schedule-session-edit-page">
            <PageHeader
                title={`Sửa / Dời Buổi #${schedule.session_number}`}
                subtitle={`Lớp: ${classData.class_code}`}
                breadcrumbs={[
                    { label: 'Lớp học', path: '/classes' },
                    { label: `Lớp ${classData.class_code}`, path: `/classes/${classData.id}` },
                    { label: 'Thời khóa biểu', path: `/classes/${classData.id}/schedules` },
                    { label: `Buổi #${schedule.session_number}`, path: `/classes/${classData.id}/schedules/${schedule.id}` },
                    { label: 'Sửa / Dời' },
                ]}
            />

            <DetailNavTabs items={navItems} />

            {/* Toast Notifications */}
            {(errorMessage || successMessage) && (
                <ToastPortal
                    success={successMessage}
                    error={errorMessage}
                    onCloseSuccess={() => setSuccessMessage(null)}
                    onCloseError={() => setErrorMessage(null)}
                />
            )}

            {conflicts.length > 0 && (
                <div className="classes-alert error" style={{ marginBottom: '16px' }} role="alert">
                    <strong>Phát hiện xung đột lịch:</strong>
                    <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                        {conflicts.map((c, i) => (
                            <li key={i}>{c.message}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="modal-content" style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-learn-date">
                                Ngày học <span className="required">*</span>
                            </label>
                            <input
                                id="edit-learn-date"
                                type="date"
                                className="form-input"
                                value={learningDate}
                                onChange={(e) => {
                                    setLearningDate(e.target.value)
                                    setIsDirty(true)
                                }}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-shift">
                                Ca học
                            </label>
                            <select
                                id="edit-shift"
                                className="form-select"
                                value={shift}
                                onChange={(e) => {
                                    setShift(e.target.value)
                                    setIsDirty(true)
                                }}
                                disabled={isSubmitting}
                            >
                                {SHIFT_OPTIONS.map((s) => (
                                    <option key={s.code} value={s.code}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {shift === 'custom' && (
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="edit-start-time">
                                    Giờ bắt đầu
                                </label>
                                <input
                                    id="edit-start-time"
                                    type="time"
                                    className="form-input"
                                    value={startTime}
                                    onChange={(e) => {
                                        setStartTime(e.target.value)
                                        setIsDirty(true)
                                    }}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="edit-end-time">
                                    Giờ kết thúc
                                </label>
                                <input
                                    id="edit-end-time"
                                    type="time"
                                    className="form-input"
                                    value={endTime}
                                    onChange={(e) => {
                                        setEndTime(e.target.value)
                                        setIsDirty(true)
                                    }}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-instructor">
                                Giảng viên
                            </label>
                            <select
                                id="edit-instructor"
                                className="form-select"
                                value={instructorId}
                                onChange={(e) => {
                                    setInstructorId(e.target.value)
                                    setIsDirty(true)
                                }}
                                disabled={isSubmitting}
                            >
                                <option value="">-- Chưa chỉ định --</option>
                                {instructors.map((ins) => (
                                    <option key={ins.id} value={ins.id}>
                                        {ins.name} ({ins.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-room">
                                Phòng học
                            </label>
                            <ClassroomSelect
                                id="edit-room"
                                value={roomId}
                                onChange={(newId) => {
                                    setRoomId(newId || '')
                                    setIsDirty(true)
                                }}
                                classId={classId}
                                classSize={classData ? (classData.enrolled_count || classData.max_capacity) : undefined}
                                disabled={isSubmitting || isBlocked}
                                initialRoomName={schedule?.room_name || schedule?.legacy_room_raw || roomId}
                                isLegacyRoom={schedule?.is_legacy_room}
                                testId="edit-room-select"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="edit-topic">
                            Chủ đề buổi học
                        </label>
                        <input
                            id="edit-topic"
                            type="text"
                            className="form-input"
                            value={topic}
                            onChange={(e) => {
                                setTopic(e.target.value)
                                setIsDirty(true)
                            }}
                            disabled={isSubmitting}
                        />
                    </div>

                    {canManage && (
                        <div style={{ marginTop: '16px', marginBottom: '24px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: isBlocked ? 'not-allowed' : 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={allowConflictOverride}
                                    onChange={(e) => setAllowConflictOverride(e.target.checked)}
                                    disabled={isSubmitting || isBlocked}
                                />
                                <span>Cho phép ghi đè khi phát hiện trùng lịch (Quyền Quản trị/Quản lý)</span>
                            </label>
                        </div>
                    )}

                    <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            className="btn-primary btn-save"
                            disabled={isSubmitting || isBlocked}
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
