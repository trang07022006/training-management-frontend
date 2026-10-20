import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getSubject, type Subject, ApiError } from '../api/subjectApi'
import { getSubjectSessions, createSubjectSession, type SubjectSession } from '../api/subjectSessionApi'
import { PageHeader } from '../components/PageHeader'
import { DetailNavTabs } from '../components/DetailNavTabs'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { validateSessionNumber } from '../utils/subjectSessionValidation'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './SubjectsPage.css'

export function SubjectSessionCreatePage() {
    const { subjectId } = useParams<{ subjectId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role } = useSession()

    const canManage = permissions?.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) || role === 'admin'

    const [subject, setSubject] = useState<Subject | null>(null)
    const [existingSessions, setExistingSessions] = useState<SubjectSession[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [pageError, setPageError] = useState<string | null>(null)

    // Form state
    const [sessionNumber, setSessionNumber] = useState('1')
    const [topic, setTopic] = useState('')
    const [objective, setObjective] = useState('')
    const [formErrors, setFormErrors] = useState<{ number?: string; topic?: string; objective?: string }>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
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

        Promise.all([
            getSubject(requestFn, subjectId),
            getSubjectSessions(requestFn, subjectId).catch(() => ({ subject: { id: subjectId, code: '', name: '', total_sessions: null }, items: [] })),
        ])
            .then(([subjData, sessData]) => {
                if (isMounted) {
                    setSubject(subjData)
                    const sessionList = Array.isArray(sessData) ? (sessData as unknown as SubjectSession[]) : (sessData?.items || [])
                    setExistingSessions(sessionList)
                    const nextNum = sessionList.length + 1
                    setSessionNumber(String(nextNum))
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    if (err instanceof ApiError && err.status === 404) {
                        setPageError('Không tìm thấy môn học.')
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
        const errors: { number?: string; topic?: string; objective?: string } = {}

        const numberErr = validateSessionNumber(sessionNumber, subject?.total_sessions)
        if (numberErr) {
            errors.number = numberErr
        }

        const trimmedTopic = topic.trim()
        if (!trimmedTopic) {
            errors.topic = 'Vui lòng nhập chủ đề buổi học.'
        } else if (trimmedTopic.length > 255) {
            errors.topic = 'Chủ đề buổi học không được vượt quá 255 ký tự.'
        }

        const trimmedObjective = objective.trim()
        if (!trimmedObjective) {
            errors.objective = 'Vui lòng nhập mục tiêu buổi học.'
        } else if (trimmedObjective.length > 1000) {
            errors.objective = 'Mục tiêu buổi học không được vượt quá 1000 ký tự.'
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!validate() || !subjectId) return

        setIsSubmitting(true)
        setSubmitError(null)

        try {
            await createSubjectSession(requestFn, subjectId, {
                session_number: Number.parseInt(sessionNumber.trim(), 10),
                topic: topic.trim(),
                objective: objective.trim(),
            })

            setSuccessMessage(getSuccessMessage('CREATE_SESSION_SUCCESS', 'Thêm buổi học thành công!'))
            setIsDirty(false)
            setTimeout(() => {
                navigate(`/subjects/${subjectId}/sessions`)
            }, 800)
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setSubmitError(err.message)
            } else {
                setSubmitError(getErrorMessage(err, 'Lỗi khi thêm buổi học mới.'))
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
        navigate(`/subjects/${subjectId}/sessions`)
    }

    if (isLoading) {
        return (
            <div className="subjects-container">
                <div className="subjects-loading">
                    <div className="spinner" />
                    <span>Đang tải thông tin...</span>
                </div>
            </div>
        )
    }

    if (pageError || !subject) {
        return (
            <div className="subjects-container">
                <PageHeader
                    title="Thêm buổi học"
                    breadcrumbs={[
                        { label: 'Môn học', path: '/subjects' },
                        { label: 'Thêm buổi học' },
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

    if (!canManage || subject.status === 'archived') {
        return (
            <div className="subjects-container">
                <PageHeader
                    title="Không có quyền thực hiện"
                    breadcrumbs={[
                        { label: 'Môn học', path: '/subjects' },
                        { label: subject.name, path: `/subjects/${subject.id}` },
                        { label: 'Buổi học', path: `/subjects/${subject.id}/sessions` },
                        { label: 'Thêm buổi học' },
                    ]}
                />
                <div className="subjects-alert error" role="alert">
                    <span>
                        {subject.status === 'archived'
                            ? 'Môn học đã lưu trữ, không thể thêm buổi học.'
                            : 'Bạn không có quyền quản lý buổi học của môn này.'}
                    </span>
                </div>
                <div style={{ marginTop: '16px' }}>
                    <button type="button" className="btn-secondary" onClick={() => navigate(`/subjects/${subject.id}/sessions`)}>
                        Quay lại danh sách buổi học
                    </button>
                </div>
            </div>
        )
    }

    const navItems = [
        { key: 'info', label: 'Thông tin chung', path: `/subjects/${subject.id}` },
        { key: 'sessions', label: 'Danh sách buổi học', path: `/subjects/${subject.id}/sessions` },
    ]

    const isFullSessions =
        subject.total_sessions !== null &&
        subject.total_sessions !== undefined &&
        subject.total_sessions > 0 &&
        existingSessions.length >= subject.total_sessions

    return (
        <div className="subjects-container" data-testid="subject-session-create-page">
            <PageHeader
                title="Thêm buổi học mới"
                subtitle={`Môn học: ${subject.name} (${subject.code})`}
                breadcrumbs={[
                    { label: 'Môn học', path: '/subjects' },
                    { label: subject.name, path: `/subjects/${subject.id}` },
                    { label: 'Buổi học', path: `/subjects/${subject.id}/sessions` },
                    { label: 'Thêm buổi học' },
                ]}
            />

            <DetailNavTabs items={navItems} />

            {isFullSessions && (
                <div className="subjects-alert error" style={{ marginBottom: '16px' }} role="alert">
                    <span>Môn học này đã đạt số buổi học tối đa ({subject.total_sessions} buổi).</span>
                </div>
            )}

            {submitError && (
                <div className="subjects-alert error" role="alert">
                    <span>{submitError}</span>
                </div>
            )}
            {successMessage && (
                <div className="subjects-alert success" role="alert">
                    <span>{successMessage}</span>
                </div>
            )}

            <div className="modal-content" style={{ maxWidth: '700px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                        <label className="form-label" htmlFor="session-number">
                            Số thứ tự buổi học <span className="required">*</span>
                        </label>
                        <input
                            id="session-number"
                            type="number"
                            min={1}
                            max={subject.total_sessions || 100}
                            className={`form-input ${formErrors.number ? 'error' : ''}`}
                            value={sessionNumber}
                            onChange={(e) => {
                                setSessionNumber(e.target.value)
                                setIsDirty(true)
                            }}
                            disabled={isSubmitting || isFullSessions}
                        />
                        {formErrors.number && <div className="form-error">{formErrors.number}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="session-topic">
                            Chủ đề buổi học <span className="required">*</span>
                        </label>
                        <input
                            id="session-topic"
                            type="text"
                            className={`form-input ${formErrors.topic ? 'error' : ''}`}
                            placeholder="Ví dụ: Giới thiệu lập trình C & Cài đặt môi trường..."
                            value={topic}
                            onChange={(e) => {
                                setTopic(e.target.value)
                                setIsDirty(true)
                            }}
                            disabled={isSubmitting || isFullSessions}
                            maxLength={255}
                        />
                        {formErrors.topic && <div className="form-error">{formErrors.topic}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="session-objective">
                            Mục tiêu buổi học <span className="required">*</span>
                        </label>
                        <textarea
                            id="session-objective"
                            className={`form-textarea ${formErrors.objective ? 'error' : ''}`}
                            rows={4}
                            placeholder="Mô tả kiến thức, kỹ năng mà sinh viên cần nắm được trong buổi này..."
                            value={objective}
                            onChange={(e) => {
                                setObjective(e.target.value)
                                setIsDirty(true)
                            }}
                            disabled={isSubmitting || isFullSessions}
                            maxLength={1000}
                        />
                        {formErrors.objective && <div className="form-error">{formErrors.objective}</div>}
                    </div>

                    <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                        <button
                            type="button"
                            className="btn-back"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                        >
                            Quay lại
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSubmitting || isFullSessions}
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Thêm buổi học'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
