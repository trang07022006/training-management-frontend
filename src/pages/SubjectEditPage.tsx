import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getSubject, updateSubject, type Subject, type UpdateSubjectInput, type SubjectStatus, ApiError } from '../api/subjectApi'
import { PageHeader } from '../components/PageHeader'
import { DetailNavTabs } from '../components/DetailNavTabs'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './SubjectsPage.css'

interface FormErrors {
    code?: string
    name?: string
    credits?: string
    total_sessions?: string
    weight?: string
    learning_outcomes?: string
    general?: string
}

export function SubjectEditPage() {
    const { subjectId } = useParams<{ subjectId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role } = useSession()

    const canManage = permissions?.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) || role === 'admin'

    const [subject, setSubject] = useState<Subject | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [pageError, setPageError] = useState<string | null>(null)

    // Form states
    const [code, setCode] = useState('')
    const [name, setName] = useState('')
    const [credits, setCredits] = useState('3')
    const [totalSessions, setTotalSessions] = useState('')
    const [weight, setWeight] = useState('')
    const [learningOutcomes, setLearningOutcomes] = useState('')
    const [description, setDescription] = useState('')
    const [status, setStatus] = useState<SubjectStatus>('draft')

    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [isDirty, setIsDirty] = useState(false)

    useEffect(() => {
        let isMounted = true
        if (!subjectId) {
            setPageError('Mã môn học không hợp lệ.')
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setPageError(null)

        getSubject(requestFn, subjectId)
            .then((data) => {
                if (isMounted) {
                    setSubject(data)
                    setCode(data.code)
                    setName(data.name)
                    setCredits(String(data.credits))
                    setTotalSessions(data.total_sessions !== null && data.total_sessions !== undefined ? String(data.total_sessions) : '')
                    setWeight(data.weight !== null && data.weight !== undefined ? String(data.weight) : '')
                    setLearningOutcomes(data.learning_outcomes || '')
                    setDescription(data.description || '')
                    setStatus(data.status)
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    if (err instanceof ApiError && err.status === 404) {
                        setPageError('Không tìm thấy môn học yêu cầu. Môn học có thể đã bị xóa hoặc không tồn tại.')
                    } else {
                        setPageError(getErrorMessage(err, 'Lỗi khi tải thông tin môn học.'))
                    }
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [subjectId, requestFn])

    const validate = (): boolean => {
        const errors: FormErrors = {}
        const trimmedCode = code.trim()
        const trimmedName = name.trim()

        if (!trimmedCode) {
            errors.code = 'Mã môn học không được để trống.'
        } else if (!/^[A-Za-z0-9_-]{2,20}$/.test(trimmedCode)) {
            errors.code = 'Mã môn học chỉ gồm 2-20 ký tự chữ, số, gạch nối (-), gạch dưới (_).'
        }

        if (!trimmedName) {
            errors.name = 'Tên môn học không được để trống.'
        } else if (trimmedName.length < 2 || trimmedName.length > 255) {
            errors.name = 'Tên môn học phải từ 2 đến 255 ký tự.'
        }

        const creditsNum = Number(credits)
        if (!credits || isNaN(creditsNum) || !Number.isInteger(creditsNum) || creditsNum < 1 || creditsNum > 10) {
            errors.credits = 'Số tín chỉ phải là số nguyên từ 1 đến 10.'
        }

        if (totalSessions.trim() !== '') {
            const sessionsNum = Number(totalSessions)
            if (isNaN(sessionsNum) || !Number.isInteger(sessionsNum) || sessionsNum < 1 || sessionsNum > 100) {
                errors.total_sessions = 'Số buổi học phải là số nguyên từ 1 đến 100.'
            }
        }

        if (weight.trim() !== '') {
            const weightNum = Number(weight)
            if (isNaN(weightNum) || weightNum < 0 || weightNum > 100) {
                errors.weight = 'Trọng số môn học phải là số từ 0 đến 100%.'
            }
        }

        if (learningOutcomes.length > 5000) {
            errors.learning_outcomes = 'Chuẩn đầu ra không được vượt quá 5000 ký tự.'
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!validate() || !subjectId) return

        setIsSubmitting(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        const payload: UpdateSubjectInput = {
            code: code.trim().toUpperCase(),
            name: name.trim(),
            credits: Number(credits),
            description: description.trim() || null,
            total_sessions: totalSessions.trim() !== '' ? Number(totalSessions) : null,
            weight: weight.trim() !== '' ? Number(weight) : null,
            learning_outcomes: learningOutcomes.trim() || null,
            status,
        }

        try {
            await updateSubject(requestFn, subjectId, payload)
            setSuccessMessage(getSuccessMessage('UPDATE_SUBJECT_SUCCESS', 'Cập nhật môn học thành công!'))
            setIsDirty(false)
            setTimeout(() => {
                navigate(`/subjects/${subjectId}`)
            }, 800)
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setErrorMessage(err.message)
            } else {
                setErrorMessage(getErrorMessage(err, 'Lỗi khi cập nhật môn học.'))
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
        navigate(`/subjects/${subjectId || ''}`)
    }

    if (isLoading) {
        return (
            <div className="subjects-container">
                <div className="subjects-loading">
                    <div className="spinner" />
                    <span>Đang tải thông tin môn học...</span>
                </div>
            </div>
        )
    }

    if (pageError || !subject) {
        return (
            <div className="subjects-container">
                <PageHeader
                    title="Chỉnh sửa môn học"
                    breadcrumbs={[
                        { label: 'Môn học', path: '/subjects' },
                        { label: 'Chỉnh sửa' },
                    ]}
                />
                <div className="subjects-alert error" role="alert">
                    <span>{pageError || 'Không tìm thấy môn học.'}</span>
                </div>
                <div style={{ marginTop: '16px' }}>
                    <button type="button" className="btn-secondary" onClick={() => navigate('/subjects')}>
                        Quay lại danh sách môn học
                    </button>
                </div>
            </div>
        )
    }

    if (!canManage) {
        return (
            <div className="subjects-container">
                <PageHeader
                    title="Không có quyền truy cập"
                    breadcrumbs={[
                        { label: 'Môn học', path: '/subjects' },
                        { label: subject.name, path: `/subjects/${subject.id}` },
                        { label: 'Chỉnh sửa' },
                    ]}
                />
                <div className="subjects-alert error" role="alert">
                    <span>Bạn không có quyền chỉnh sửa môn học này.</span>
                </div>
            </div>
        )
    }

    const navItems = [
        { key: 'info', label: 'Thông tin chung', path: `/subjects/${subject.id}` },
        { key: 'sessions', label: 'Danh sách buổi học', path: `/subjects/${subject.id}/sessions` },
    ]

    return (
        <div className="subjects-container" data-testid="subject-edit-page">
            <PageHeader
                title={`Chỉnh sửa: ${subject.name}`}
                subtitle={`Mã môn: ${subject.code}`}
                breadcrumbs={[
                    { label: 'Môn học', path: '/subjects' },
                    { label: subject.name, path: `/subjects/${subject.id}` },
                    { label: 'Chỉnh sửa' },
                ]}
            />

            <DetailNavTabs items={navItems} />

            {errorMessage && (
                <div className="subjects-alert error" role="alert">
                    <span>{errorMessage}</span>
                </div>
            )}
            {successMessage && (
                <div className="subjects-alert success" role="alert">
                    <span>{successMessage}</span>
                </div>
            )}

            <div className="modal-content" style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-subject-code">
                                Mã môn học <span className="required">*</span>
                            </label>
                            <input
                                id="edit-subject-code"
                                type="text"
                                className={`form-input ${formErrors.code ? 'error' : ''}`}
                                value={code}
                                onChange={(e) => {
                                    setCode(e.target.value.toUpperCase())
                                    setIsDirty(true)
                                }}
                                disabled={isSubmitting}
                            />
                            {formErrors.code && <div className="form-error">{formErrors.code}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-subject-credits">
                                Số tín chỉ <span className="required">*</span>
                            </label>
                            <input
                                id="edit-subject-credits"
                                type="number"
                                min={1}
                                max={10}
                                className={`form-input ${formErrors.credits ? 'error' : ''}`}
                                value={credits}
                                onChange={(e) => {
                                    setCredits(e.target.value)
                                    setIsDirty(true)
                                }}
                                disabled={isSubmitting}
                            />
                            {formErrors.credits && <div className="form-error">{formErrors.credits}</div>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="edit-subject-name">
                            Tên môn học <span className="required">*</span>
                        </label>
                        <input
                            id="edit-subject-name"
                            type="text"
                            className={`form-input ${formErrors.name ? 'error' : ''}`}
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                                setIsDirty(true)
                            }}
                            disabled={isSubmitting}
                        />
                        {formErrors.name && <div className="form-error">{formErrors.name}</div>}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-subject-sessions">
                                Số buổi học
                            </label>
                            <input
                                id="edit-subject-sessions"
                                type="number"
                                min={1}
                                max={100}
                                className={`form-input ${formErrors.total_sessions ? 'error' : ''}`}
                                value={totalSessions}
                                onChange={(e) => {
                                    setTotalSessions(e.target.value)
                                    setIsDirty(true)
                                }}
                                disabled={isSubmitting}
                            />
                            {formErrors.total_sessions && <div className="form-error">{formErrors.total_sessions}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-subject-weight">
                                Trọng số (%)
                            </label>
                            <input
                                id="edit-subject-weight"
                                type="number"
                                min={0}
                                max={100}
                                step="0.1"
                                className={`form-input ${formErrors.weight ? 'error' : ''}`}
                                value={weight}
                                onChange={(e) => {
                                    setWeight(e.target.value)
                                    setIsDirty(true)
                                }}
                                disabled={isSubmitting}
                            />
                            {formErrors.weight && <div className="form-error">{formErrors.weight}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-subject-status">
                                Trạng thái
                            </label>
                            <select
                                id="edit-subject-status"
                                className="form-select"
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value as SubjectStatus)
                                    setIsDirty(true)
                                }}
                                disabled={isSubmitting}
                            >
                                <option value="active">Đang hoạt động</option>
                                <option value="draft">Bản nháp</option>
                                <option value="archived">Đã lưu trữ</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="edit-subject-outcomes">
                            Chuẩn đầu ra môn học
                        </label>
                        <textarea
                            id="edit-subject-outcomes"
                            className={`form-textarea ${formErrors.learning_outcomes ? 'error' : ''}`}
                            rows={3}
                            value={learningOutcomes}
                            onChange={(e) => {
                                setLearningOutcomes(e.target.value)
                                setIsDirty(true)
                            }}
                            disabled={isSubmitting}
                        />
                        {formErrors.learning_outcomes && <div className="form-error">{formErrors.learning_outcomes}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="edit-subject-desc">
                            Mô tả học phần
                        </label>
                        <textarea
                            id="edit-subject-desc"
                            className="form-textarea"
                            rows={3}
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value)
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
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            className="btn-primary btn-save"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
