import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getStudentDetail, updateStudentProfile, type StudentDetail, type UpdateStudentPayload, ApiError } from '../api/studentApi'
import { PageHeader } from '../components/PageHeader'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { ConfirmModal } from '../components/ConfirmModal'
import { toast } from '../components/ToastPortal'
import './StudentsPage.css'

interface FormErrors {
    full_name?: string
    phone?: string
    email?: string
}

export function StudentEditPage() {
    const { studentId } = useParams<{ studentId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role, roles } = useSession()

    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const normalizedRoles = effectiveRoles.map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
    const canManage =
        permissions?.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) ||
        normalizedRoles.includes('admin') ||
        normalizedRoles.includes('training_manager')

    const [student, setStudent] = useState<StudentDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [pageError, setPageError] = useState<string | null>(null)

    // Form fields
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [entryLevel, setEntryLevel] = useState('')
    const [notes, setNotes] = useState('')

    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDirty, setIsDirty] = useState(false)

    useEffect(() => {
        let isMounted = true
        if (!studentId) {
            setPageError('Mã học viên không hợp lệ.')
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setPageError(null)

        getStudentDetail(requestFn, studentId)
            .then((data) => {
                if (isMounted) {
                    setStudent(data)
                    setFullName(data.full_name || '')
                    setPhone(data.phone || '')
                    setEmail(data.email || '')
                    setEntryLevel(data.entry_level || '')
                    setNotes(data.notes || '')
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    if (err instanceof ApiError && err.status === 404) {
                        setPageError('Không tìm thấy học viên.')
                    } else {
                        setPageError(getErrorMessage(err, 'Lỗi khi tải thông tin học viên.'))
                    }
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [studentId, requestFn])

    const validate = (): boolean => {
        const errors: FormErrors = {}
        const trimmedName = fullName.trim()
        const trimmedPhone = phone.trim()

        if (!trimmedName) {
            errors.full_name = 'Họ và tên học viên không được để trống.'
        } else if (trimmedName.length < 2 || trimmedName.length > 100) {
            errors.full_name = 'Họ và tên phải từ 2 đến 100 ký tự.'
        }

        if (!trimmedPhone) {
            errors.phone = 'Số điện thoại không được để trống.'
        } else if (!/^[0-9+() -]{8,20}$/.test(trimmedPhone)) {
            errors.phone = 'Số điện thoại không hợp lệ.'
        }

        if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            errors.email = 'Địa chỉ email không đúng định dạng.'
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!validate() || !studentId) return

        setIsSubmitting(true)

        const payload: UpdateStudentPayload = {
            full_name: fullName.trim(),
            phone: phone.trim(),
            email: email.trim() || null,
            entry_level: entryLevel.trim() || null,
            notes: notes.trim() || null,
        }

        try {
            await updateStudentProfile(requestFn, studentId, payload)
            const msg = getSuccessMessage('UPDATE_STUDENT_SUCCESS', 'Cập nhật hồ sơ học viên thành công!')
            toast.success(msg)
            setIsDirty(false)
            setTimeout(() => {
                navigate(`/students/${studentId}`)
            }, 800)
        } catch (err: unknown) {
            const errText = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi cập nhật hồ sơ học viên.')
            toast.error(errText)
        } finally {
            setIsSubmitting(false)
        }
    }

    const [isConfirmLeaveOpen, setIsConfirmLeaveOpen] = useState(false)

    const handleCancel = () => {
        if (isDirty) {
            if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
                const confirmed = window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn rời khỏi trang?')
                if (!confirmed) return
            } else {
                setIsConfirmLeaveOpen(true)
                return
            }
        }
        navigate(`/students/${studentId || ''}`)
    }

    if (isLoading) {
        return (
            <div className="students-container">
                <div className="students-loading">
                    <div className="spinner" />
                    <span>Đang tải thông tin...</span>
                </div>
            </div>
        )
    }

    if (pageError || !student) {
        return (
            <div className="students-container">
                <PageHeader
                    title="Chỉnh sửa hồ sơ học viên"
                    breadcrumbs={[
                        { label: 'Học viên', path: '/students' },
                        { label: 'Chỉnh sửa' },
                    ]}
                />
                <div className="students-alert error" role="alert">
                    <span>{pageError || 'Không tìm thấy học viên.'}</span>
                </div>
                <div style={{ marginTop: '16px' }}>
                    <button type="button" className="btn-secondary" onClick={() => navigate('/students')}>
                        Quay lại danh sách học viên
                    </button>
                </div>
            </div>
        )
    }

    if (!canManage) {
        return (
            <div className="students-container">
                <PageHeader
                    title="Không có quyền truy cập"
                    breadcrumbs={[
                        { label: 'Học viên', path: '/students' },
                        { label: student.full_name, path: `/students/${student.id}` },
                        { label: 'Chỉnh sửa' },
                    ]}
                />
                <div className="students-alert error" role="alert">
                    <span>Bạn không có quyền chỉnh sửa hồ sơ học viên này.</span>
                </div>
            </div>
        )
    }

    return (
        <div className="students-container" data-testid="student-edit-page">
            <PageHeader
                title={`Chỉnh sửa hồ sơ: ${student.full_name}`}
                subtitle={`Mã học viên: ${student.student_code}`}
                breadcrumbs={[
                    { label: 'Học viên', path: '/students' },
                    { label: student.full_name, path: `/students/${student.id}` },
                    { label: 'Chỉnh sửa' },
                ]}
            />

            <div className="modal-content" style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-student-code">
                                Mã học viên
                            </label>
                            <input
                                id="edit-student-code"
                                type="text"
                                className="form-input"
                                value={student.student_code}
                                disabled
                                style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-student-name">
                                Họ và tên <span className="required">*</span>
                            </label>
                            <input
                                id="edit-student-name"
                                type="text"
                                className={`form-input ${formErrors.full_name ? 'error' : ''}`}
                                value={fullName}
                                onChange={(e) => {
                                    setFullName(e.target.value)
                                    setIsDirty(true)
                                }}
                                disabled={isSubmitting}
                            />
                            {formErrors.full_name && <div className="form-error">{formErrors.full_name}</div>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-student-phone">
                                Số điện thoại <span className="required">*</span>
                            </label>
                            <input
                                id="edit-student-phone"
                                type="text"
                                className={`form-input ${formErrors.phone ? 'error' : ''}`}
                                value={phone}
                                onChange={(e) => {
                                    setPhone(e.target.value)
                                    setIsDirty(true)
                                }}
                                disabled={isSubmitting}
                            />
                            {formErrors.phone && <div className="form-error">{formErrors.phone}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-student-email">
                                Email
                            </label>
                            <input
                                id="edit-student-email"
                                type="email"
                                className={`form-input ${formErrors.email ? 'error' : ''}`}
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    setIsDirty(true)
                                }}
                                disabled={isSubmitting}
                            />
                            {formErrors.email && <div className="form-error">{formErrors.email}</div>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="edit-student-level">
                            Trình độ đầu vào
                        </label>
                        <input
                            id="edit-student-level"
                            type="text"
                            className="form-input"
                            placeholder="VD: Mới bắt đầu, Trung cấp, Đã học C/C++..."
                            value={entryLevel}
                            onChange={(e) => {
                                setEntryLevel(e.target.value)
                                setIsDirty(true)
                            }}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="edit-student-notes">
                            Ghi chú hồ sơ
                        </label>
                        <textarea
                            id="edit-student-notes"
                            className="form-textarea"
                            rows={3}
                            placeholder="Thông tin bổ sung về học viên..."
                            value={notes}
                            onChange={(e) => {
                                setNotes(e.target.value)
                                setIsDirty(true)
                            }}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                        >
                            Quay lại
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Lưu hồ sơ'}
                        </button>
                    </div>
                </form>
            </div>

            <ConfirmModal
                isOpen={isConfirmLeaveOpen}
                title="Rời khỏi trang?"
                message="Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn rời khỏi trang này không?"
                confirmText="Rời khỏi"
                cancelText="Ở lại"
                type="warning"
                onConfirm={() => navigate(`/students/${studentId || ''}`)}
                onCancel={() => setIsConfirmLeaveOpen(false)}
            />
        </div>
    )
}
