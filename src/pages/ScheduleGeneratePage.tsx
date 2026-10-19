import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getClassDetail, getClassSubjects, type TrainingClass, type ClassSubjectItem } from '../api/classApi'
import { fetchUsersApi, type User } from '../api/userApi'
import {
    previewClassSchedule,
    generateClassSchedule,
    type ClassScheduleItem,
    type SkippedHolidayItem,
    type ScheduleConflictItem,
    type ScheduleGeneratePayload,
    ApiError,
} from '../api/scheduleApi'
import { PageHeader } from '../components/PageHeader'
import { DetailNavTabs } from '../components/DetailNavTabs'
import { ClassroomSelect } from '../components/ClassroomSelect'
import { ToastPortal } from '../components/ToastPortal'
import { getErrorMessage, getSuccessMessage, isNetworkError, NETWORK_ERROR_MESSAGE } from '../utils/errorMessages'
import { formatShiftLabel, formatRoomLabel, formatInstructorLabel, SHIFT_OPTIONS } from '../utils/scheduleDisplayUtils'
import { getRolePermissions, SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './ClassesPage.css'

const DAYS_OF_WEEK_OPTIONS = [
    { id: 2, label: 'Thứ 2' },
    { id: 3, label: 'Thứ 3' },
    { id: 4, label: 'Thứ 4' },
    { id: 5, label: 'Thứ 5' },
    { id: 6, label: 'Thứ 6' },
    { id: 7, label: 'Thứ 7' },
    { id: 8, label: 'Chủ nhật' },
]

export function ScheduleGeneratePage() {
    const { classId } = useParams<{ classId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role, roles } = useSession()

    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const normalizedRoles = effectiveRoles.map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
    const effectivePermissions = permissions?.length ? permissions : getRolePermissions(normalizedRoles)
    const canManage = effectivePermissions.includes(SYSTEM_PERMISSIONS.SCHEDULE_MANAGE)

    const [classData, setClassData] = useState<TrainingClass | null>(null)
    const [subjects, setSubjects] = useState<ClassSubjectItem[]>([])
    const [instructors, setInstructors] = useState<User[]>([])

    // Form inputs
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
    const [selectedDays, setSelectedDays] = useState<number[]>([2, 4, 6]) // Mặc định Thứ 2, 4, 6
    const [selectedShift, setSelectedShift] = useState<string>('shift_1')
    const [customStartTime, setCustomStartTime] = useState<string>('07:30')
    const [customEndTime, setCustomEndTime] = useState<string>('09:30')
    const [startDate, setStartDate] = useState<string>('')
    const [totalSessions, setTotalSessions] = useState<number>(60)
    const [selectedInstructorId, setSelectedInstructorId] = useState<string>('')
    const [selectedRoomId, setSelectedRoomId] = useState<string>('')
    const [overwriteExisting, setOverwriteExisting] = useState<boolean>(false)
    const [allowConflictOverride, setAllowConflictOverride] = useState<boolean>(false)

    // Preview state
    const [isPreviewing, setIsPreviewing] = useState<boolean>(false)
    const [isSaving, setIsSaving] = useState<boolean>(false)
    const [previewSchedules, setPreviewSchedules] = useState<ClassScheduleItem[]>([])
    const [skippedHolidays, setSkippedHolidays] = useState<SkippedHolidayItem[]>([])
    const [conflicts, setConflicts] = useState<ScheduleConflictItem[]>([])
    const [hasPreviewed, setHasPreviewed] = useState<boolean>(false)
    const [previewSnapshot, setPreviewSnapshot] = useState<string | null>(null)

    const canOverrideConflict = normalizedRoles.includes('admin') || normalizedRoles.includes('training_manager')

    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({})

    useEffect(() => {
        let isMounted = true
        if (!classId) return

        setIsLoading(true)
        setErrorMessage(null)

        Promise.all([
            getClassDetail(requestFn, classId),
            getClassSubjects(requestFn, classId).catch(() => []),
            fetchUsersApi(requestFn, { role: 'trainer', page_size: 100 }).catch(() => ({ items: [] })),
        ])
            .then(([cls, subs, instRes]) => {
                if (isMounted) {
                    setClassData(cls)
                    const validSubs = Array.isArray(subs) ? subs : ((subs as { items?: ClassSubjectItem[] })?.items || [])
                    setSubjects(validSubs)
                    setInstructors(instRes.items || [])
                    if (validSubs.length > 0) {
                        setSelectedSubjectId(validSubs[0].subject_id)
                    }
                    setStartDate(cls.expected_start_date || new Date().toISOString().slice(0, 10))
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setErrorMessage(getErrorMessage(err, 'Lỗi khi tải thông tin lớp học.'))
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [classId, requestFn])

    const handleToggleDay = (dayId: number) => {
        setFieldErrors((prev) => ({ ...prev, days_of_week: undefined }))
        setSelectedDays((prev) =>
            prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort(),
        )
    }

    const buildPayload = (): ScheduleGeneratePayload => {
        const payload: ScheduleGeneratePayload = {
            days_of_week: selectedDays,
            shift: selectedShift,
            start_date: startDate,
            total_sessions: totalSessions,
            subject_id: selectedSubjectId || undefined,
            room_id: selectedRoomId.trim() || undefined,
            instructor_id: selectedInstructorId || undefined,
            overwrite: overwriteExisting,
            allow_conflict_override: allowConflictOverride,
        }

        if (selectedShift === 'custom') {
            payload.start_time = customStartTime
            payload.end_time = customEndTime
        }

        return payload
    }

    const handlePreview = async () => {
        if (!classId) return
        setFieldErrors({})

        setIsPreviewing(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            const currentPayload = buildPayload()
            const data = await previewClassSchedule(requestFn, classId, currentPayload)
            setPreviewSchedules(data.schedules || [])
            setSkippedHolidays(data.skipped_holidays || [])
            setConflicts(data.conflicts || [])
            setHasPreviewed(true)
            setPreviewSnapshot(JSON.stringify(currentPayload))
        } catch (err: unknown) {
            setHasPreviewed(false)
            setPreviewSnapshot(null)
            setPreviewSchedules([])
            setSkippedHolidays([])
            setConflicts([])
            const errMsg = err instanceof Error ? err.message : String(err)
            if (isNetworkError(errMsg)) {
                setErrorMessage(NETWORK_ERROR_MESSAGE)
                return
            }

            if (err instanceof ApiError) {
                const errField = (err.details as { field?: string })?.field
                const targetField = errField || (
                    err.code === 'DAYS_OF_WEEK_REQUIRED' || err.code === 'INVALID_DAYS_OF_WEEK' ? 'days_of_week' :
                    err.code === 'START_DATE_REQUIRED' || err.code === 'INVALID_START_DATE' ? 'start_date' :
                    err.code === 'TOTAL_SESSIONS_REQUIRED' || err.code === 'INVALID_TOTAL_SESSIONS' ? 'total_sessions' :
                    err.code === 'SHIFT_REQUIRED' || err.code === 'INVALID_SHIFT_TIME' ? 'shift' :
                    err.code === 'SUBJECT_NOT_IN_CLASS' ? 'subject_id' : undefined
                )
                if (targetField) {
                    setFieldErrors({ [targetField]: err.message })
                }
                setErrorMessage(err.message)
            } else {
                setErrorMessage(getErrorMessage(err, 'Lỗi khi xem trước thời khóa biểu.'))
            }
        } finally {
            setIsPreviewing(false)
        }
    }

    const isConfigChanged = hasPreviewed && previewSnapshot !== JSON.stringify(buildPayload())
    const canConfirmSave = hasPreviewed && !isConfigChanged && previewSchedules.length > 0 && !isSaving

    const handleSave = async () => {
        if (!classId) return

        if (!canConfirmSave) {
            setErrorMessage('Cấu hình đã thay đổi so với kết quả xem trước. Vui lòng bấm Xem trước lại trước khi lưu.')
            return
        }

        setIsSaving(true)
        setErrorMessage(null)
        setSuccessMessage(null)
        setFieldErrors({})

        try {
            const res = await generateClassSchedule(requestFn, classId, buildPayload())
            setSuccessMessage(getSuccessMessage('GENERATE_SCHEDULE_SUCCESS', `Lưu thời khóa biểu thành công! Đã sinh ${res.total_saved} buổi học.`))
            setTimeout(() => {
                navigate(`/classes/${classId}/schedules`)
            }, 800)
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err)
            if (isNetworkError(errMsg)) {
                setErrorMessage(NETWORK_ERROR_MESSAGE)
                return
            }

            if (err instanceof ApiError) {
                const conflictList = (err.details as { conflicts?: ScheduleConflictItem[] })?.conflicts
                if (conflictList && conflictList.length > 0) {
                    setConflicts(conflictList)
                }

                const errField = (err.details as { field?: string })?.field
                const targetField = errField || (
                    err.code === 'DAYS_OF_WEEK_REQUIRED' || err.code === 'INVALID_DAYS_OF_WEEK' ? 'days_of_week' :
                    err.code === 'START_DATE_REQUIRED' || err.code === 'INVALID_START_DATE' ? 'start_date' :
                    err.code === 'TOTAL_SESSIONS_REQUIRED' || err.code === 'INVALID_TOTAL_SESSIONS' ? 'total_sessions' :
                    err.code === 'SHIFT_REQUIRED' || err.code === 'INVALID_SHIFT_TIME' ? 'shift' :
                    err.code === 'SUBJECT_NOT_IN_CLASS' ? 'subject_id' : undefined
                )
                if (targetField) {
                    setFieldErrors({ [targetField]: err.message })
                }

                setErrorMessage(err.message)
            } else {
                setErrorMessage(getErrorMessage(err, 'Lỗi khi lưu thời khóa biểu.'))
            }
        } finally {
            setIsSaving(false)
        }
    }

    if (!canManage) {
        return (
            <div className="classes-container" style={{ padding: '0 0 24px 0' }}>
                <PageHeader
                    title="Sinh thời khóa biểu tự động"
                    breadcrumbs={[
                        { label: 'Lớp học', path: '/classes' },
                        { label: 'Thời khóa biểu', path: `/classes/${classId}/schedules` },
                        { label: 'Sinh lịch' },
                    ]}
                />
                <div className="classes-alert error" role="alert" style={{ marginBottom: '16px' }}>
                    <span>Bạn không có quyền sinh thời khóa biểu cho lớp học.</span>
                </div>
                <button type="button" className="btn-secondary" onClick={() => navigate(`/classes/${classId}/schedules`)}>
                    Quay lại lịch lớp
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

    if (!classData) {
        return (
            <div className="classes-container">
                <PageHeader
                    title="Sinh thời khóa biểu"
                    breadcrumbs={[
                        { label: 'Lớp học', path: '/classes' },
                        { label: 'Sinh lịch' },
                    ]}
                />
                <div className="classes-alert error" role="alert">
                    <span>{errorMessage || 'Không tìm thấy lớp học.'}</span>
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
        <div className="classes-container" data-testid="schedule-generate-page">
            <ToastPortal
                error={errorMessage}
                success={successMessage}
                onCloseError={() => setErrorMessage(null)}
                onCloseSuccess={() => setSuccessMessage(null)}
            />

            <PageHeader
                title={`Sinh thời khóa biểu tự động: Lớp ${classData.class_code}`}
                subtitle={`Chương trình: ${classData.program_name || classData.program_code || '—'}`}
                breadcrumbs={[
                    { label: 'Lớp học', path: '/classes' },
                    { label: `Lớp ${classData.class_code}`, path: `/classes/${classData.id}` },
                    { label: 'Thời khóa biểu', path: `/classes/${classData.id}/schedules` },
                    { label: 'Sinh lịch tự động' },
                ]}
            />

            <DetailNavTabs items={navItems} />

            {errorMessage && (
                <div className="classes-alert error" role="alert" style={{ marginBottom: '16px' }} data-testid="schedule-error-alert">
                    <span>{errorMessage}</span>
                </div>
            )}
            {successMessage && (
                <div className="classes-alert success" role="alert" style={{ marginBottom: '16px' }} data-testid="schedule-success-alert">
                    <span>{successMessage}</span>
                </div>
            )}

            <div className="modal-content" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                    Cấu hình quy tắc sinh thời khóa biểu
                </h3>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label" htmlFor="gen-subject">
                            Môn học áp dụng
                        </label>
                        <select
                            id="gen-subject"
                            className={`form-select ${fieldErrors.subject_id ? 'is-invalid' : ''}`}
                            style={fieldErrors.subject_id ? { borderColor: '#ef4444' } : undefined}
                            value={selectedSubjectId}
                            onChange={(e) => {
                                setSelectedSubjectId(e.target.value)
                                setFieldErrors((prev) => ({ ...prev, subject_id: undefined }))
                            }}
                        >
                            <option value="">-- Tất cả hoặc chọn môn --</option>
                            {(subjects || []).map((sub) => (
                                <option key={sub.id} value={sub.subject_id}>
                                    {sub.subject_code} - {sub.subject_name} ({sub.credits} tín chỉ)
                                </option>
                            ))}
                        </select>
                        {fieldErrors.subject_id && (
                            <span className="field-error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                {fieldErrors.subject_id}
                            </span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="gen-start-date">
                            Ngày bắt đầu <span className="required">*</span>
                        </label>
                        <input
                            id="gen-start-date"
                            type="date"
                            className={`form-input ${fieldErrors.start_date ? 'is-invalid' : ''}`}
                            style={fieldErrors.start_date ? { borderColor: '#ef4444' } : undefined}
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value)
                                setFieldErrors((prev) => ({ ...prev, start_date: undefined }))
                            }}
                        />
                        {fieldErrors.start_date && (
                            <span className="field-error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                {fieldErrors.start_date}
                            </span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="gen-total-sessions">
                            Số buổi cần sinh <span className="required">*</span>
                        </label>
                        <input
                            id="gen-total-sessions"
                            type="number"
                            min={1}
                            max={200}
                            className={`form-input ${fieldErrors.total_sessions ? 'is-invalid' : ''}`}
                            style={fieldErrors.total_sessions ? { borderColor: '#ef4444' } : undefined}
                            value={totalSessions}
                            onChange={(e) => {
                                setTotalSessions(Number(e.target.value))
                                setFieldErrors((prev) => ({ ...prev, total_sessions: undefined }))
                            }}
                        />
                        {fieldErrors.total_sessions && (
                            <span className="field-error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                {fieldErrors.total_sessions}
                            </span>
                        )}
                    </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">
                        Các ngày học trong tuần <span className="required">*</span>
                    </label>
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        padding: fieldErrors.days_of_week ? '6px' : '0',
                        borderRadius: '8px',
                        border: fieldErrors.days_of_week ? '1px solid #ef4444' : 'none',
                    }}>
                        {DAYS_OF_WEEK_OPTIONS.map((d) => {
                            const isChecked = selectedDays.includes(d.id)
                            return (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => handleToggleDay(d.id)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        border: isChecked ? '1px solid #0284c7' : '1px solid #cbd5e1',
                                        background: isChecked ? '#0284c7' : '#fff',
                                        color: isChecked ? '#fff' : '#334155',
                                        fontWeight: 500,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {d.label}
                                </button>
                            )
                        })}
                    </div>
                    {fieldErrors.days_of_week && (
                        <span className="field-error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            {fieldErrors.days_of_week}
                        </span>
                    )}
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label" htmlFor="gen-shift">
                            Ca học
                        </label>
                        <select
                            id="gen-shift"
                            className={`form-select ${fieldErrors.shift ? 'is-invalid' : ''}`}
                            style={fieldErrors.shift ? { borderColor: '#ef4444' } : undefined}
                            value={selectedShift}
                            onChange={(e) => {
                                setSelectedShift(e.target.value)
                                setFieldErrors((prev) => ({ ...prev, shift: undefined }))
                            }}
                        >
                            {SHIFT_OPTIONS.map((s) => (
                                <option key={s.code} value={s.code}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                        {fieldErrors.shift && (
                            <span className="field-error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                {fieldErrors.shift}
                            </span>
                        )}
                    </div>

                    {selectedShift === 'custom' && (
                        <>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gen-start-time">
                                    Giờ bắt đầu
                                </label>
                                <input
                                    id="gen-start-time"
                                    type="time"
                                    className="form-input"
                                    value={customStartTime}
                                    onChange={(e) => setCustomStartTime(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="gen-end-time">
                                    Giờ kết thúc
                                </label>
                                <input
                                    id="gen-end-time"
                                    type="time"
                                    className="form-input"
                                    value={customEndTime}
                                    onChange={(e) => setCustomEndTime(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="gen-instructor">
                            Giảng viên giảng dạy
                        </label>
                        <select
                            id="gen-instructor"
                            className="form-select"
                            value={selectedInstructorId}
                            onChange={(e) => setSelectedInstructorId(e.target.value)}
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
                        <label className="form-label" htmlFor="gen-room">
                            Phòng học
                        </label>
                        <ClassroomSelect
                            id="gen-room"
                            value={selectedRoomId}
                            onChange={(roomId) => setSelectedRoomId(roomId || '')}
                            classId={classId}
                            classSize={classData ? (classData.enrolled_count || classData.max_capacity) : undefined}
                            placeholder="Chọn phòng học cho lớp..."
                            disabled={isPreviewing || isSaving}
                            testId="gen-room-select"
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginTop: '16px', alignItems: 'center' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={overwriteExisting}
                            onChange={(e) => setOverwriteExisting(e.target.checked)}
                        />
                        <span>Ghi đè thời khóa biểu đã tồn tại</span>
                    </label>

                    {canOverrideConflict && (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={allowConflictOverride}
                                onChange={(e) => setAllowConflictOverride(e.target.checked)}
                            />
                            <span>Cho phép ghi đè khi có xung đột trùng lịch (Quyền Quản trị/Quản lý)</span>
                        </label>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => navigate(`/classes/${classId}/schedules`)}
                        disabled={isPreviewing || isSaving}
                    >
                        Quay lại
                    </button>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handlePreview}
                        disabled={isPreviewing || isSaving}
                        data-testid="btn-preview-schedule"
                    >
                        {isPreviewing ? 'Đang phân tích lịch...' : '🔍 Xem trước thời khóa biểu (Preview)'}
                    </button>
                </div>
            </div>

            {/* PREVIEW SECTION */}
            {hasPreviewed && (
                <div className="modal-content" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                            Kết quả xem trước ({previewSchedules.length} buổi học)
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            {isConfigChanged && (
                                <span style={{ fontSize: '13px', color: '#b91c1c', fontWeight: 500 }}>
                                    ⚠️ Cấu hình đã thay đổi. Vui lòng bấm Xem trước lại.
                                </span>
                            )}
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleSave}
                                disabled={!canConfirmSave}
                                data-testid="btn-confirm-save-schedule"
                                style={{
                                    background: canConfirmSave ? '#16a34a' : '#94a3b8',
                                    cursor: canConfirmSave ? 'pointer' : 'not-allowed',
                                }}
                            >
                                {isSaving ? 'Đang lưu...' : '✓ Xác nhận lưu thời khóa biểu chính thức'}
                            </button>
                        </div>
                    </div>

                    {/* Conflicts Alert */}
                    {conflicts.length > 0 && (
                        <div className="classes-alert error" style={{ marginBottom: '16px' }} role="alert">
                            <strong>Phát hiện {conflicts.length} xung đột thời khóa biểu:</strong>
                            <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                                {conflicts.map((c, i) => (
                                    <li key={i}>{c.message}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Skipped Holidays Alert */}
                    {skippedHolidays.length > 0 && (
                        <div className="classes-alert success" style={{ marginBottom: '16px' }} role="status" data-testid="skipped-holidays-banner">
                            <strong>Đã tự động bỏ qua {skippedHolidays.length} ngày nghỉ lễ theo cấu hình hệ thống:</strong>
                            <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                                {skippedHolidays.map((h, i) => (
                                    <li key={i}>{h.date} ({h.day_of_week}): <strong>{h.holiday_name}</strong></li>
                                ))}
                            </ul>
                            <div style={{ marginTop: '8px', fontSize: '13px' }}>
                                <a
                                    href="/holidays"
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: '#0369a1', textDecoration: 'underline', fontWeight: 500 }}
                                >
                                    Xem hoặc quản lý toàn bộ danh mục ngày nghỉ lễ ↗
                                </a>
                            </div>
                        </div>
                    )}

                    <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <table className="classes-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>Buổi #</th>
                                    <th>Ngày học</th>
                                    <th>Ca / Giờ</th>
                                    <th>Chủ đề</th>
                                    <th>Giảng viên</th>
                                    <th>Phòng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewSchedules.map((sch, idx) => (
                                    <tr key={idx}>
                                        <td><strong>#{sch.session_number}</strong></td>
                                        <td>{sch.learning_date} ({sch.day_of_week || '—'})</td>
                                        <td>{formatShiftLabel(sch.shift, sch.start_time, sch.end_time)}</td>
                                        <td>{sch.topic || 'Buổi học'}</td>
                                        <td>{formatInstructorLabel(sch.instructor_name)}</td>
                                        <td>{formatRoomLabel(sch.room_id)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
