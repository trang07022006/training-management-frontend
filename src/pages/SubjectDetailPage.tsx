import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getSubject, getSubjectStatusLabel, type Subject, ApiError } from '../api/subjectApi'
import { PageHeader } from '../components/PageHeader'
import { DetailNavTabs } from '../components/DetailNavTabs'
import { getErrorMessage } from '../utils/errorMessages'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './SubjectsPage.css'

export function SubjectDetailPage() {
    const { subjectId } = useParams<{ subjectId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role } = useSession()

    const canManage = permissions?.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) || role === 'admin'

    const [subject, setSubject] = useState<Subject | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        if (!subjectId) {
            setErrorMessage('Mã môn học không hợp lệ.')
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setErrorMessage(null)

        getSubject(requestFn, subjectId)
            .then((data) => {
                if (isMounted) {
                    setSubject(data)
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    if (err instanceof ApiError && err.status === 404) {
                        setErrorMessage('Không tìm thấy môn học yêu cầu. Môn học có thể đã bị xóa hoặc không tồn tại.')
                    } else {
                        setErrorMessage(getErrorMessage(err, 'Lỗi khi tải thông tin môn học.'))
                    }
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [subjectId, requestFn])

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

    if (errorMessage || !subject) {
        return (
            <div className="subjects-container">
                <PageHeader
                    title="Chi tiết môn học"
                    breadcrumbs={[
                        { label: 'Môn học', path: '/subjects' },
                        { label: 'Chi tiết' },
                    ]}
                />
                <div className="subjects-alert error" role="alert">
                    <span>{errorMessage || 'Không tìm thấy môn học.'}</span>
                </div>
                <div style={{ marginTop: '16px' }}>
                    <button type="button" className="btn-secondary" onClick={() => navigate('/subjects')}>
                        Quay lại danh sách môn học
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
        <div className="subjects-container" data-testid="subject-detail-page">
            <PageHeader
                title={subject.name}
                subtitle={`Mã môn: ${subject.code} • ${subject.credits} tín chỉ`}
                breadcrumbs={[
                    { label: 'Môn học', path: '/subjects' },
                    { label: subject.name },
                ]}
                badge={
                    <span className={`status-badge ${subject.status}`}>
                        {getSubjectStatusLabel(subject.status)}
                    </span>
                }
                actions={
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => navigate('/subjects')}
                        >
                            Quay lại danh sách
                        </button>
                        {canManage && (
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={() => navigate(`/subjects/${subject.id}/edit`)}
                            >
                                Chỉnh sửa môn học
                            </button>
                        )}
                    </div>
                }
            />

            <DetailNavTabs items={navItems} />

            <div className="modal-content" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Mã môn học</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{subject.code}</strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Số tín chỉ</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{subject.credits} tín chỉ</strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Tổng số buổi học</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{subject.total_sessions ?? 'Chưa xác định'} buổi</strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Trọng số môn</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{subject.weight !== null && subject.weight !== undefined ? `${subject.weight}%` : 'Chưa thiết lập'}</strong>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Chuẩn đầu ra môn học</h3>
                    <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
                        {subject.learning_outcomes || 'Chưa cập nhật chuẩn đầu ra cho học phần này.'}
                    </p>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Mô tả học phần</h3>
                    <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {subject.description || 'Chưa có mô tả chi tiết.'}
                    </p>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8' }}>
                    <span>Ngày tạo: {subject.created_at ? new Date(subject.created_at).toLocaleDateString('vi-VN') : '—'}</span>
                    <span>Cập nhật lần cuối: {subject.updated_at ? new Date(subject.updated_at).toLocaleDateString('vi-VN') : '—'}</span>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                    <Link to={`/subjects/${subject.id}/sessions`} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span>📚 Quản lý chuỗi buổi học của môn ({subject.total_sessions || 0} buổi)</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
