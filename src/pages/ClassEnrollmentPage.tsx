import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getClassDetail, type TrainingClass } from '../api/classApi'
import { enrollStudents, getClassRoster } from '../api/enrollmentApi'
import { listStudents, type Student } from '../api/studentApi'
import { PageHeader } from '../components/PageHeader'
import { DetailNavTabs } from '../components/DetailNavTabs'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './ClassesPage.css'

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
        ])
            .then(([cls, roster, studentsRes]) => {
                if (isMounted) {
                    setClassData(cls)
                    const enrolledSet = new Set<string>((roster.items || []).map((i) => i.student_id))
                    setAlreadyEnrolledIds(enrolledSet)
                    setAllStudents(studentsRes.items || [])
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
            setSuccessMessage(getSuccessMessage('ENROLL_SUCCESS', `Ghi danh thành công ${selectedStudentIds.length} học viên vào lớp!`))
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
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {availableStudents.map((st) => {
                                    const isSelected = selectedStudentIds.includes(st.id)
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
                                            <td>
                                                <span className="badge badge-success">
                                                    {st.status || 'Hoạt động'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => navigate(`/classes/${classId}/students`)}
                        disabled={isSubmitting}
                    >
                        Quay lại
                    </button>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting || selectedStudentIds.length === 0 || isExceedingCapacity}
                    >
                        {isSubmitting ? 'Đang ghi danh...' : `Xác nhận ghi danh (${selectedStudentIds.length} học viên)`}
                    </button>
                </div>
            </div>
        </div>
    )
}
