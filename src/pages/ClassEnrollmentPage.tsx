import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getClassDetail, type TrainingClass } from '../api/classApi'
import { enrollStudents, getClassRoster } from '../api/enrollmentApi'
import { listStudents, type Student } from '../api/studentApi'
import { getClassSchedules, type ClassScheduleItem } from '../api/scheduleApi'
import { saveSessionAttendance, type AttendanceStatus } from '../api/attendanceApi'
import { PageHeader } from '../components/PageHeader'
import { DetailNavTabs } from '../components/DetailNavTabs'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './ClassesPage.css'
import './SessionAttendance.css'

export function ClassEnrollmentPage() {
    const { classId } = useParams<{ classId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role, roles } = useSession()

    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const normalizedRoles = effectiveRoles.map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
    const canManage =
        permissions?.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) ||
        normalizedRoles.includes('admin') ||
        normalizedRoles.includes('training_manager')

    const [classData, setClassData] = useState<TrainingClass | null>(null)
    const [alreadyEnrolledIds, setAlreadyEnrolledIds] = useState<Set<string>>(new Set())
    const [allStudents, setAllStudents] = useState<Student[]>([])
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
    const [searchKeyword, setSearchKeyword] = useState('')

    // State phục vụ điểm danh trên danh sách học viên
    const [schedules, setSchedules] = useState<ClassScheduleItem[]>([])
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('')
    const [studentAttendance, setStudentAttendance] = useState<Record<string, AttendanceStatus | null>>({})
    const [isSavingAttendance, setIsSavingAttendance] = useState(false)

    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        if (!classId) return

        setIsLoading(true)
        setErrorMessage(null)

        Promise.all([
            getClassDetail(requestFn, classId),
            getClassRoster(requestFn, classId).catch(() => ({ items: [] })),
            listStudents(requestFn, { page: 1, page_size: 50 }).catch(() => ({ items: [] })),
            getClassSchedules(requestFn, classId).catch(() => ({ schedules: [] })),
        ])
            .then(([cls, roster, studentsRes, schedsRes]) => {
                if (isMounted) {
                    setClassData(cls)
                    const enrolledSet = new Set<string>((roster.items || []).map((i) => i.student_id || '').filter(Boolean))
                    setAlreadyEnrolledIds(enrolledSet)
                    setAllStudents(studentsRes.items || [])
                    const schedList = (schedsRes as { schedules?: ClassScheduleItem[] })?.schedules || []
                    setSchedules(schedList)
                    const firstWithId = schedList.find((s) => Boolean(s.id))
                    if (firstWithId?.id) {
                        setSelectedScheduleId(firstWithId.id)
                    }
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setErrorMessage(getErrorMessage(err, 'Lỗi khi tải thông tin lớp học và học viên.'))
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [classId, requestFn])

    // Tìm kiếm học viên trên server khi từ khóa thay đổi
    useEffect(() => {
        if (!classId || isLoading) return
        const timer = setTimeout(async () => {
            try {
                const res = await listStudents(requestFn, {
                    search: searchKeyword.trim() || undefined,
                    page: 1,
                    page_size: 50,
                })
                setAllStudents(res.items || [])
            } catch (err) {
                console.warn('Lỗi khi tìm kiếm học viên:', err)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [searchKeyword, classId, requestFn, isLoading])

    // Filter available students (excluding already enrolled)
    const availableStudents = useMemo(() => {
        return allStudents.filter((st) => !alreadyEnrolledIds.has(st.id))
    }, [allStudents, alreadyEnrolledIds])

    const remainingCapacity = classData ? Math.max(0, classData.max_capacity - classData.enrolled_count) : 0
    const isExceedingCapacity = selectedStudentIds.length > remainingCapacity

    const handleToggleStudent = (studentId: string) => {
        setSelectedStudentIds((prev) =>
            prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
        )
    }

    const handleSelectAll = () => {
        if (selectedStudentIds.length === availableStudents.length) {
            setSelectedStudentIds([])
        } else {
            setSelectedStudentIds(availableStudents.map((s) => s.id))
        }
    }

    // Thay đổi trạng thái điểm danh cho một học viên (bấm lại trạng thái đang chọn để hủy chọn)
    const handleStudentAttendanceChange = (studentId: string, status: AttendanceStatus) => {
        setStudentAttendance((prev) => {
            const nextStatus = prev[studentId] === status ? null : status
            return {
                ...prev,
                [studentId]: nextStatus,
            }
        })
        // Nếu học viên chưa được chọn trong checkbox, tự động chọn
        if (!selectedStudentIds.includes(studentId)) {
            setSelectedStudentIds((prev) => [...prev, studentId])
        }
    }

    // Lưu riêng kết quả điểm danh cho buổi học đang chọn
    const handleSaveAttendanceOnly = async () => {
        if (!classId || !selectedScheduleId) return
        const attendanceEntries = Object.entries(studentAttendance).filter(([_, st]) => st !== null)
        if (attendanceEntries.length === 0) {
            setErrorMessage('Vui lòng chọn trạng thái điểm danh (Có mặt, Đi muộn, Vắng) cho ít nhất một học viên trước khi lưu.')
            return
        }

        setIsSavingAttendance(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            // Tự động ghi danh các học viên chưa trong lớp để backend chấp nhận bản ghi điểm danh
            const unEnrolledIds = attendanceEntries.map(([sId]) => sId).filter((id) => !alreadyEnrolledIds.has(id))
            if (unEnrolledIds.length > 0) {
                await enrollStudents(requestFn, classId, unEnrolledIds)
                setAlreadyEnrolledIds((prev) => new Set([...prev, ...unEnrolledIds]))
            }

            const items = attendanceEntries.map(([sId, st]) => ({
                student_id: sId,
                status: st as AttendanceStatus,
                notes: 'Điểm danh từ danh sách học viên',
            }))

            await saveSessionAttendance(requestFn, selectedScheduleId, {
                attendances: items,
                reason: `Lưu điểm danh ${items.length} học viên từ danh sách lớp`,
            })

            setSuccessMessage(`Đã lưu kết quả điểm danh thành công cho ${items.length} học viên!`)
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi lưu kết quả điểm danh.'))
        } finally {
            setIsSavingAttendance(false)
        }
    }

    const handleSubmit = async () => {
        if (!classId || selectedStudentIds.length === 0) return

        if (isExceedingCapacity) {
            setErrorMessage(`Số lượng học viên được chọn (${selectedStudentIds.length}) vượt quá số chỗ còn lại của lớp (${remainingCapacity}).`)
            return
        }

        setIsSubmitting(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            await enrollStudents(requestFn, classId, selectedStudentIds)

            // Lưu điểm danh kèm theo nếu có buổi học và trạng thái điểm danh được tích
            const attendanceEntries = Object.entries(studentAttendance).filter(
                ([id, st]) => selectedStudentIds.includes(id) && st !== null,
            )
            if (selectedScheduleId && attendanceEntries.length > 0) {
                try {
                    await saveSessionAttendance(requestFn, selectedScheduleId, {
                        attendances: attendanceEntries.map(([sId, st]) => ({
                            student_id: sId,
                            status: st as AttendanceStatus,
                            notes: 'Điểm danh khi ghi danh vào lớp',
                        })),
                        reason: `Điểm danh ${attendanceEntries.length} học viên khi ghi danh vào lớp`,
                    })
                } catch (attErr) {
                    console.warn('Lỗi lưu điểm danh kèm ghi danh:', attErr)
                }
            }

            setSuccessMessage(getSuccessMessage('ENROLL_SUCCESS', `Ghi danh & lưu trạng thái điểm danh thành công cho ${selectedStudentIds.length} học viên!`))
            setTimeout(() => {
                navigate(`/classes/${classId}/students`)
            }, 800)
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi ghi danh học viên vào lớp.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!canManage) {
        return (
            <div className="classes-page-container" style={{ padding: '0 0 24px 0' }}>
                <PageHeader
                    title="Ghi danh học viên"
                    breadcrumbs={[
                        { label: 'Lớp học', path: '/classes' },
                        { label: 'Ghi danh học viên' },
                    ]}
                />
                <div className="modal-banner banner-error" role="alert" style={{ marginBottom: '16px' }}>
                    <span>Bạn không có quyền thực hiện thao tác ghi danh học viên vào lớp.</span>
                </div>
                <button type="button" className="btn-secondary" onClick={() => navigate('/classes')}>
                    Quay lại danh sách lớp
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
                    title="Ghi danh học viên"
                    breadcrumbs={[
                        { label: 'Lớp học', path: '/classes' },
                        { label: 'Ghi danh' },
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
        <div className="classes-container" data-testid="class-enrollment-page">
            <PageHeader
                title={`Ghi danh học viên: Lớp ${classData.class_code}`}
                subtitle={`Chương trình: ${classData.program_name || classData.program_code || '—'} • Còn trống ${remainingCapacity} chỗ`}
                breadcrumbs={[
                    { label: 'Lớp học', path: '/classes' },
                    { label: `Lớp ${classData.class_code}`, path: `/classes/${classData.id}` },
                    { label: 'Học viên', path: `/classes/${classData.id}/students` },
                    { label: 'Ghi danh' },
                ]}
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

            <div className="modal-content" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                            type="search"
                            className="form-input"
                            placeholder="Tìm kiếm theo mã, họ tên, email..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            style={{ maxWidth: '320px' }}
                        />
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                            Đã chọn: <strong>{selectedStudentIds.length}</strong> / Còn lại <strong>{remainingCapacity}</strong> chỗ
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleSelectAll}
                            disabled={availableStudents.length === 0}
                        >
                            {selectedStudentIds.length === availableStudents.length && availableStudents.length > 0
                                ? 'Bỏ chọn tất cả'
                                : 'Chọn tất cả kết quả'}
                        </button>
                    </div>
                </div>

                {/* Toolbar chọn buổi học để tích điểm danh */}
                {schedules.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                        <label htmlFor="session-select" style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                            📅 Buổi học để điểm danh:
                        </label>
                        <select
                            id="session-select"
                            className="form-input"
                            style={{ maxWidth: '340px', padding: '6px 10px', fontSize: '13px' }}
                            value={selectedScheduleId}
                            onChange={(e) => setSelectedScheduleId(e.target.value)}
                        >
                            {schedules.map((sch) => (
                                <option key={sch.id || sch.session_number} value={sch.id || ''}>
                                    Buổi #{sch.session_number} ({sch.learning_date ? new Date(sch.learning_date).toLocaleDateString('vi-VN') : '—'}) - {sch.shift === 'morning' ? 'Sáng' : sch.shift === 'afternoon' ? 'Chiều' : sch.shift === 'evening' ? 'Tối' : (sch.start_time?.substring(0, 5) || '')}
                                </option>
                            ))}
                        </select>
                        <Link
                            to={`/classes/${classId}/attendance-summary`}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '13px', textDecoration: 'none' }}
                        >
                            📊 Bảng chuyên cần lớp
                        </Link>
                        {selectedScheduleId && (
                            <Link
                                to={`/classes/${classId}/schedules/${selectedScheduleId}/attendance`}
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '13px', textDecoration: 'none' }}
                            >
                                📋 Sổ điểm danh đầy đủ
                            </Link>
                        )}
                    </div>
                )}

                {isExceedingCapacity && (
                    <div className="classes-alert error" style={{ marginBottom: '16px' }} role="alert">
                        <span>Cảnh báo: Bạn đã chọn {selectedStudentIds.length} học viên, vượt quá {remainingCapacity} chỗ còn lại!</span>
                    </div>
                )}

                {availableStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                        <p>Không tìm thấy học viên nào khả dụng để ghi danh.</p>
                    </div>
                ) : (
                    <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px' }}>
                        <table className="classes-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '48px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedStudentIds.length === availableStudents.length && availableStudents.length > 0}
                                            onChange={handleSelectAll}
                                            aria-label="Chọn tất cả học viên"
                                        />
                                    </th>
                                    <th>Mã HV</th>
                                    <th>Họ và tên</th>
                                    <th>Email</th>
                                    <th>Số điện thoại</th>
                                    <th style={{ minWidth: '450px' }}>Trạng thái điểm danh</th>
                                </tr>
                            </thead>
                            <tbody>
                                {availableStudents.map((st) => {
                                    const isSelected = selectedStudentIds.includes(st.id)
                                    const currentAttendance = studentAttendance[st.id]
                                    return (
                                        <tr
                                            key={st.id}
                                            style={{ cursor: 'pointer', background: isSelected ? '#f0f9ff' : undefined }}
                                            onClick={() => handleToggleStudent(st.id)}
                                        >
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleStudent(st.id)}
                                                    aria-label={`Chọn học viên ${st.full_name}`}
                                                />
                                            </td>
                                            <td><strong>{st.student_code}</strong></td>
                                            <td>{st.full_name}</td>
                                            <td>{st.email || '—'}</td>
                                            <td>{st.phone || '—'}</td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div
                                                    className="status-tick-group status-btn-group"
                                                    role="radiogroup"
                                                    aria-label={`Điểm danh cho ${st.full_name}`}
                                                >
                                                    {/* P - Có mặt */}
                                                    <button
                                                        type="button"
                                                        className={`status-tick-btn status-btn present ${currentAttendance === 'present' ? 'active' : ''}`}
                                                        onClick={() => handleStudentAttendanceChange(st.id, 'present')}
                                                        title="Có mặt (P)"
                                                        aria-checked={currentAttendance === 'present'}
                                                    >
                                                        <span className="status-badge-box badge-p">P</span>
                                                        <span className="status-tick-label">Có mặt</span>
                                                        {currentAttendance === 'present' && <span className="tick-check-icon">✓</span>}
                                                    </button>

                                                    {/* L - Đi muộn */}
                                                    <button
                                                        type="button"
                                                        className={`status-tick-btn status-btn late ${currentAttendance === 'late' ? 'active' : ''}`}
                                                        onClick={() => handleStudentAttendanceChange(st.id, 'late')}
                                                        title="Đi muộn (L)"
                                                        aria-checked={currentAttendance === 'late'}
                                                    >
                                                        <span className="status-badge-box badge-l">L</span>
                                                        <span className="status-tick-label">Đi muộn</span>
                                                        {currentAttendance === 'late' && <span className="tick-check-icon">✓</span>}
                                                    </button>

                                                    {/* E - Vắng có phép */}
                                                    <button
                                                        type="button"
                                                        className={`status-tick-btn status-btn excused ${currentAttendance === 'excused' ? 'active' : ''}`}
                                                        onClick={() => handleStudentAttendanceChange(st.id, 'excused')}
                                                        title="Vắng có phép (E)"
                                                        aria-checked={currentAttendance === 'excused'}
                                                    >
                                                        <span className="status-badge-box badge-e">E</span>
                                                        <span className="status-tick-label">Vắng có phép</span>
                                                        {currentAttendance === 'excused' && <span className="tick-check-icon">✓</span>}
                                                    </button>

                                                    {/* U - Vắng không phép */}
                                                    <button
                                                        type="button"
                                                        className={`status-tick-btn status-btn unexcused ${currentAttendance === 'unexcused' ? 'active' : ''}`}
                                                        onClick={() => handleStudentAttendanceChange(st.id, 'unexcused')}
                                                        title="Vắng không phép (U)"
                                                        aria-checked={currentAttendance === 'unexcused'}
                                                    >
                                                        <span className="status-badge-box badge-u">U</span>
                                                        <span className="status-tick-label">Vắng không phép</span>
                                                        {currentAttendance === 'unexcused' && <span className="tick-check-icon">✓</span>}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => navigate(`/classes/${classId}/students`)}
                        disabled={isSubmitting || isSavingAttendance}
                    >
                        Quay lại
                    </button>
                    {selectedScheduleId && (
                        <button
                            type="button"
                            className="btn-secondary"
                            style={{ borderColor: '#16a34a', color: '#15803d', fontWeight: 600 }}
                            onClick={handleSaveAttendanceOnly}
                            disabled={isSubmitting || isSavingAttendance || Object.values(studentAttendance).filter(Boolean).length === 0}
                        >
                            {isSavingAttendance ? 'Đang lưu điểm danh...' : `💾 Lưu điểm danh (${Object.values(studentAttendance).filter(Boolean).length} học viên)`}
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting || isSavingAttendance || selectedStudentIds.length === 0 || isExceedingCapacity}
                    >
                        {isSubmitting ? 'Đang ghi danh...' : `Xác nhận ghi danh (${selectedStudentIds.length} học viên)`}
                    </button>
                </div>
            </div>
        </div>
    )
}
