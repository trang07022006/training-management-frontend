import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getTrainingProgram, getProgramStatusLabel, type TrainingProgram, ApiError } from '../api/trainingProgramApi'
import { PageHeader } from '../components/PageHeader'
import { DetailNavTabs } from '../components/DetailNavTabs'
import { getErrorMessage } from '../utils/errorMessages'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './TrainingProgramsPage.css'

export function TrainingProgramDetailPage() {
    const { programId } = useParams<{ programId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role } = useSession()

    const canManage = permissions?.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) || role === 'admin'

    const [program, setProgram] = useState<TrainingProgram | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        if (!programId) {
            setErrorMessage('Mã chương trình không hợp lệ.')
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setErrorMessage(null)

        getTrainingProgram(requestFn, programId)
            .then((data) => {
                if (isMounted) {
                    setProgram(data)
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    if (err instanceof ApiError && err.status === 404) {
                        setErrorMessage('Không tìm thấy chương trình đào tạo. Dữ liệu có thể đã bị xóa hoặc không tồn tại.')
                    } else {
                        setErrorMessage(getErrorMessage(err, 'Lỗi khi tải thông tin chương trình đào tạo.'))
                    }
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [programId, requestFn])

    if (isLoading) {
        return (
            <div className="training-programs-container">
                <div className="programs-loading">
                    <div className="spinner" />
                    <span>Đang tải thông tin chương trình đào tạo...</span>
                </div>
            </div>
        )
    }

    if (errorMessage || !program) {
        return (
            <div className="training-programs-container">
                <PageHeader
                    title="Chi tiết chương trình đào tạo"
                    breadcrumbs={[
                        { label: 'Chương trình đào tạo', path: '/training-programs' },
                        { label: 'Chi tiết' },
                    ]}
                />
                <div className="programs-alert error" role="alert">
                    <span>{errorMessage || 'Không tìm thấy chương trình đào tạo.'}</span>
                </div>
                <div style={{ marginTop: '16px' }}>
                    <button type="button" className="btn-secondary" onClick={() => navigate('/training-programs')}>
                        Quay lại danh sách chương trình
                    </button>
                </div>
            </div>
        )
    }

    const navItems = [
        { key: 'info', label: 'Thông tin chung', path: `/training-programs/${program.id}` },
        { key: 'structure', label: 'Cấu trúc môn học', path: `/training-programs/${program.id}/structure` },
    ]

    return (
        <div className="training-programs-container" data-testid="training-program-detail-page">
            <PageHeader
                title={program.name}
                subtitle={`Mã chương trình: ${program.code} • ${program.duration_semesters ?? 8} học kỳ`}
                breadcrumbs={[
                    { label: 'Chương trình đào tạo', path: '/training-programs' },
                    { label: program.name },
                ]}
                badge={
                    <span className={`status-badge ${program.status}`}>
                        {getProgramStatusLabel(program.status)}
                    </span>
                }
                actions={
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => navigate('/training-programs')}
                        >
                            Quay lại danh sách
                        </button>
                        {canManage && (
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={() => navigate(`/training-programs/${program.id}/edit`)}
                            >
                                Chỉnh sửa chương trình
                            </button>
                        )}
                    </div>
                }
            />

            <DetailNavTabs items={navItems} />

            <div className="modal-content" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Mã chương trình</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{program.code}</strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Thời lượng đào tạo</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{program.duration_semesters ? `${program.duration_semesters} học kỳ` : 'Chưa thiết lập'}</strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Học phí chuẩn</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                            {program.standard_tuition_fee !== null && program.standard_tuition_fee !== undefined
                                ? `${program.standard_tuition_fee.toLocaleString('vi-VN')} đ / kỳ`
                                : 'Chưa thiết lập'}
                        </strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Trạng thái</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{getProgramStatusLabel(program.status)}</strong>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Mô tả chương trình đào tạo</h3>
                    <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                        {program.description || 'Chưa có thông tin mô tả chi tiết cho chương trình đào tạo này.'}
                    </p>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8' }}>
                    <span>Ngày tạo: {program.created_at ? new Date(program.created_at).toLocaleDateString('vi-VN') : '—'}</span>
                    <span>Cập nhật lần cuối: {program.updated_at ? new Date(program.updated_at).toLocaleDateString('vi-VN') : '—'}</span>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                    <Link to={`/training-programs/${program.id}/structure`} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span>📂 Quản lý cấu trúc khung chương trình & Môn tiên quyết</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
