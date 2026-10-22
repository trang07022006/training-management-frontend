import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    getTrainingProgram,
    getProgramStatusLabel,
    getProgramAbsenceThreshold,
    updateProgramAbsenceThreshold,
    type TrainingProgram,
    type AbsenceThresholdAudit,
    ApiError,
} from '../api/trainingProgramApi'
import { PageHeader } from '../components/PageHeader'
import { DetailNavTabs } from '../components/DetailNavTabs'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { toast } from '../components/ToastPortal'
import './TrainingProgramsPage.css'

export function TrainingProgramDetailPage() {
    const { programId } = useParams<{ programId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role } = useSession()

    const canManage = permissions?.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) || role === 'admin'

    const [program, setProgram] = useState<TrainingProgram | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // SCRUM-257 AC1: Threshold configuration state
    const [audits, setAudits] = useState<AbsenceThresholdAudit[]>([])
    const [isEditThresholdOpen, setIsEditThresholdOpen] = useState(false)
    const [thresholdInput, setThresholdInput] = useState('20')
    const [reasonInput, setReasonInput] = useState('')
    const [thresholdError, setThresholdError] = useState<string | null>(null)
    const [isSavingThreshold, setIsSavingThreshold] = useState(false)

    const fetchAudits = (id: string) => {
        getProgramAbsenceThreshold(requestFn, id)
            .then((res) => {
                setAudits(res.audits || [])
            })
            .catch(() => {
                // non-blocking
            })
    }

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
                    setThresholdInput(String(data.absence_alert_threshold ?? 20))
                    setIsLoading(false)
                    fetchAudits(data.id)
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

    const handleSaveThreshold = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!program) return

        const val = Number(thresholdInput)
        if (isNaN(val) || val < 0 || val > 100) {
            setThresholdError('Ngưỡng phải là số từ 0.00% đến 100.00%.')
            return
        }
        if (thresholdInput.includes('.')) {
            const dec = thresholdInput.split('.')[1].replace(/0+$/, '')
            if (dec.length > 2) {
                setThresholdError('Ngưỡng chỉ được phép có tối đa 2 chữ số thập phân.')
                return
            }
        }

        setThresholdError(null)
        setIsSavingThreshold(true)

        try {
            const updated = await updateProgramAbsenceThreshold(requestFn, program.id, {
                threshold: val,
                reason: reasonInput.trim() || undefined,
            })
            setProgram((prev) => prev ? { ...prev, absence_alert_threshold: updated.absence_alert_threshold } : prev)
            toast.success(getSuccessMessage('UPDATE_THRESHOLD_SUCCESS', 'Cập nhật ngưỡng cảnh báo vắng thành công!'))
            setIsEditThresholdOpen(false)
            setReasonInput('')
            fetchAudits(program.id)
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi cập nhật ngưỡng cảnh báo vắng.')
            toast.error(msg)
            setThresholdError(msg)
        } finally {
            setIsSavingThreshold(false)
        }
    }

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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
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
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ngưỡng cảnh báo vắng</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                            {program.absence_alert_threshold !== undefined && program.absence_alert_threshold !== null
                                ? `${program.absence_alert_threshold}%`
                                : '20% (Mặc định)'}
                        </strong>
                    </div>
                    <div className="detail-item">
                        <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Trạng thái</span>
                        <strong style={{ fontSize: '16px', color: '#0f172a' }}>{getProgramStatusLabel(program.status)}</strong>
                    </div>
                </div>

                {/* SCRUM-257 AC1: Cấu hình ngưỡng cảnh báo vắng */}
                <div style={{
                    border: '1px solid #fed7aa',
                    background: '#fffbeb',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '15px', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>⚠️ Cấu hình ngưỡng cảnh báo học viên vắng (SCRUM-257)</span>
                            </h4>
                            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#78350f', lineHeight: 1.5 }}>
                                Ngưỡng hiện hành: <strong>{program.absence_alert_threshold ?? 20}%</strong> số buổi học. Học viên trong các lớp thuộc chương trình này sẽ được gắn cờ cảnh báo khi tỷ lệ vắng <code>A / N × 100% &gt; {program.absence_alert_threshold ?? 20}%</code>.
                            </p>
                        </div>
                        {canManage && (
                            <button
                                type="button"
                                className="btn-secondary"
                                style={{ background: '#fff', borderColor: '#f97316', color: '#c2410c', fontWeight: 500 }}
                                onClick={() => {
                                    setThresholdInput(String(program.absence_alert_threshold ?? 20))
                                    setThresholdError(null)
                                    setIsEditThresholdOpen(true)
                                }}
                            >
                                ⚙️ Cập nhật ngưỡng
                            </button>
                        )}
                    </div>

                    {/* Audits history list if any */}
                    {audits.length > 0 && (
                        <div style={{ marginTop: '8px', borderTop: '1px dashed #fed7aa', paddingTop: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#9a3412', marginBottom: '6px' }}>
                                📜 Lịch sử thay đổi ngưỡng ({audits.length} lần):
                            </div>
                            <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', color: '#451a03' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #fed7aa', textAlign: 'left', color: '#78350f' }}>
                                            <th style={{ padding: '4px 8px' }}>Thời gian</th>
                                            <th style={{ padding: '4px 8px' }}>Ngưỡng cũ</th>
                                            <th style={{ padding: '4px 8px' }}>Ngưỡng mới</th>
                                            <th style={{ padding: '4px 8px' }}>Lý do</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {audits.map((a) => (
                                            <tr key={a.id} style={{ borderBottom: '1px solid #fef3c7' }}>
                                                <td style={{ padding: '4px 8px' }}>{new Date(a.created_at).toLocaleString('vi-VN')}</td>
                                                <td style={{ padding: '4px 8px' }}>{a.old_threshold}%</td>
                                                <td style={{ padding: '4px 8px', fontWeight: 600, color: '#c2410c' }}>{a.new_threshold}%</td>
                                                <td style={{ padding: '4px 8px' }}>{a.reason || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
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

            {/* Modal cập nhật ngưỡng */}
            {isEditThresholdOpen && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: '12px',
                        padding: '24px',
                        maxWidth: '480px',
                        width: '90%',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>
                            Cấu hình ngưỡng cảnh báo vắng
                        </h3>
                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
                            Chương trình: <strong>{program.name}</strong> ({program.code}).<br />
                            Thay đổi ngưỡng sẽ có hiệu lực ngay cho việc đánh giá cảnh báo học viên trong các lớp thuộc chương trình này.
                        </p>

                        <form onSubmit={handleSaveThreshold}>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label className="form-label" htmlFor="modal-absence-threshold">
                                    Ngưỡng cảnh báo vắng (%) <span className="required">*</span>
                                </label>
                                <input
                                    id="modal-absence-threshold"
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="0.01"
                                    className={`form-input ${thresholdError ? 'error' : ''}`}
                                    value={thresholdInput}
                                    onChange={(e) => setThresholdInput(e.target.value)}
                                    placeholder="VD: 20"
                                    disabled={isSavingThreshold}
                                    autoFocus
                                />
                                {thresholdError && <div className="form-error" style={{ marginTop: '4px' }}>{thresholdError}</div>}
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label className="form-label" htmlFor="modal-threshold-reason">
                                    Lý do điều chỉnh (Audit log)
                                </label>
                                <input
                                    id="modal-threshold-reason"
                                    type="text"
                                    className="form-input"
                                    value={reasonInput}
                                    onChange={(e) => setReasonInput(e.target.value)}
                                    placeholder="VD: Điều chỉnh theo quy chế đào tạo mới..."
                                    disabled={isSavingThreshold}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setIsEditThresholdOpen(false)}
                                    disabled={isSavingThreshold}
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={isSavingThreshold}
                                >
                                    {isSavingThreshold ? 'Đang lưu...' : 'Lưu cấu hình'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
