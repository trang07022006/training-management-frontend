import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getSubject, getSubjects, type Subject, ApiError } from '../api/subjectApi'
import { getSubjectSessions, cloneSubjectSessions, type SubjectSession } from '../api/subjectSessionApi'
import { PageHeader } from '../components/PageHeader'
import { DetailNavTabs } from '../components/DetailNavTabs'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './SubjectsPage.css'

export function SubjectSessionClonePage() {
    const { subjectId } = useParams<{ subjectId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role } = useSession()

    const canManage = permissions?.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) || role === 'admin'

    const [subject, setSubject] = useState<Subject | null>(null)
    const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([])
    const [selectedSourceId, setSelectedSourceId] = useState<string>('')
    const [previewSessions, setPreviewSessions] = useState<SubjectSession[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)
    const [pageError, setPageError] = useState<string | null>(null)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

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
            getSubjects(requestFn, { page_size: 100 }).catch(() => ({ items: [] })),
        ])
            .then(([subjData, subjectsData]) => {
                if (isMounted) {
                    setSubject(subjData)
                    // Exclude current subject
                    const otherSubjects = (subjectsData.items || []).filter(
                        (s: Subject) => s.id !== subjectId,
                    )
                    setAvailableSubjects(otherSubjects)
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    if (err instanceof ApiError && err.status === 404) {
                        setPageError('Không tìm thấy thông tin môn học.')
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

    const handleSelectSource = async (sourceId: string) => {
        setSelectedSourceId(sourceId)
        setPreviewSessions([])
        setSubmitError(null)

        if (!sourceId) return

        setIsLoadingPreview(true)
        try {
            const data = await getSubjectSessions(requestFn, sourceId)
            setPreviewSessions(data.items || [])
        } catch (err: unknown) {
            setSubmitError(getErrorMessage(err, 'Lỗi khi tải danh sách buổi học nguồn.'))
        } finally {
            setIsLoadingPreview(false)
        }
    }

    const handleClone = async () => {
        if (!subjectId || !selectedSourceId) return

        setIsSubmitting(true)
        setSubmitError(null)

        try {
            await cloneSubjectSessions(requestFn, subjectId, selectedSourceId)
            setSuccessMessage(getSuccessMessage('CLONE_SESSIONS_SUCCESS', 'Sao chép chuỗi buổi học thành công!'))
            setTimeout(() => {
                navigate(`/subjects/${subjectId}/sessions`)
            }, 800)
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setSubmitError(err.message)
            } else {
                setSubmitError(getErrorMessage(err, 'Lỗi khi sao chép chuỗi buổi học.'))
            }
        } finally {
            setIsSubmitting(false)
        }
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
                    title="Sao chép buổi học"
                    breadcrumbs={[
                        { label: 'Môn học', path: '/subjects' },
                        { label: 'Sao chép buổi học' },
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
                        { label: 'Sao chép' },
                    ]}
                />
                <div className="subjects-alert error" role="alert">
                    <span>
                        {subject.status === 'archived'
                            ? 'Môn học đã lưu trữ, không thể sao chép buổi học.'
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

    return (
        <div className="subjects-container" data-testid="subject-session-clone-page">
            <PageHeader
                title="Sao chép chuỗi buổi học"
                subtitle={`Môn đích: ${subject.name} (${subject.code})`}
                breadcrumbs={[
                    { label: 'Môn học', path: '/subjects' },
                    { label: subject.name, path: `/subjects/${subject.id}` },
                    { label: 'Buổi học', path: `/subjects/${subject.id}/sessions` },
                    { label: 'Sao chép buổi học' },
                ]}
            />

            <DetailNavTabs items={navItems} />

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

            <div className="modal-content" style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
                    Chọn một môn học nguồn để kế thừa toàn bộ danh sách chủ đề và mục tiêu của từng buổi học.
                    Các buổi học mới sẽ được thêm tiếp nối vào môn <strong>{subject.name}</strong>.
                </p>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label" htmlFor="source-subject-select">
                        Chọn môn học nguồn <span className="required">*</span>
                    </label>
                    <select
                        id="source-subject-select"
                        className="form-select"
                        value={selectedSourceId}
                        onChange={(e) => handleSelectSource(e.target.value)}
                        disabled={isSubmitting}
                    >
                        <option value="">-- Chọn môn học nguồn --</option>
                        {availableSubjects.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.code} - {s.name} ({s.total_sessions || 0} buổi)
                            </option>
                        ))}
                    </select>
                </div>

                {isLoadingPreview && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                        <span>Đang tải xem trước buổi học của môn nguồn...</span>
                    </div>
                )}

                {selectedSourceId && !isLoadingPreview && (
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
                            Xem trước buổi học ({previewSessions.length} buổi):
                        </h4>

                        {previewSessions.length === 0 ? (
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', color: '#64748b', fontSize: '14px' }}>
                                Môn học nguồn chưa có buổi học nào.
                            </div>
                        ) : (
                            <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                            <th style={{ padding: '8px 12px', width: '80px' }}>Buổi</th>
                                            <th style={{ padding: '8px 12px' }}>Chủ đề</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewSessions.map((s) => (
                                            <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>#{s.session_number}</td>
                                                <td style={{ padding: '8px 12px' }}>{s.topic}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => navigate(`/subjects/${subjectId}/sessions`)}
                        disabled={isSubmitting}
                    >
                        Quay lại
                    </button>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handleClone}
                        disabled={isSubmitting || !selectedSourceId || previewSessions.length === 0}
                    >
                        {isSubmitting ? 'Đang sao chép...' : `Sao chép ${previewSessions.length} buổi học`}
                    </button>
                </div>
            </div>
        </div>
    )
}
