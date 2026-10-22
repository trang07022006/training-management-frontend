import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getTrainingProgram, updateTrainingProgram, type TrainingProgram, type UpdateTrainingProgramInput, type TrainingProgramStatus, ApiError } from '../api/trainingProgramApi'
import { PageHeader } from '../components/PageHeader'
import { DetailNavTabs } from '../components/DetailNavTabs'
import { ConfirmModal } from '../components/ConfirmModal'
import { toast } from '../components/ToastPortal'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './TrainingProgramsPage.css'

interface FormErrors {
    code?: string
    name?: string
    duration_semesters?: string
    standard_tuition_fee?: string
    absence_alert_threshold?: string
    general?: string
}

export function TrainingProgramEditPage() {
    const { programId } = useParams<{ programId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role } = useSession()

    const canManage = permissions?.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) || role === 'admin'

    const [program, setProgram] = useState<TrainingProgram | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [pageError, setPageError] = useState<string | null>(null)

    // Form fields
    const [code, setCode] = useState('')
    const [name, setName] = useState('')
    const [durationSemesters, setDurationSemesters] = useState('8')
    const [standardTuitionFee, setStandardTuitionFee] = useState('')
    const [absenceAlertThreshold, setAbsenceAlertThreshold] = useState('20')
    const [description, setDescription] = useState('')
    const [status, setStatus] = useState<TrainingProgramStatus>('draft')

    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDirty, setIsDirty] = useState(false)

    useEffect(() => {
        let isMounted = true
        if (!programId) {
            setPageError('Mã chương trình không hợp lệ.')
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setPageError(null)

        getTrainingProgram(requestFn, programId)
            .then((data) => {
                if (isMounted) {
                    setProgram(data)
                    setCode(data.code)
                    setName(data.name)
                    setDurationSemesters(data.duration_semesters ? String(data.duration_semesters) : '')
                    setStandardTuitionFee(data.standard_tuition_fee !== null && data.standard_tuition_fee !== undefined ? String(data.standard_tuition_fee) : '')
                    setAbsenceAlertThreshold(data.absence_alert_threshold !== null && data.absence_alert_threshold !== undefined ? String(data.absence_alert_threshold) : '20')
                    setDescription(data.description || '')
                    setStatus(data.status)
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    if (err instanceof ApiError && err.status === 404) {
                        setPageError('Không tìm thấy chương trình đào tạo.')
                    } else {
                        setPageError(getErrorMessage(err, 'Lỗi khi tải thông tin chương trình đào tạo.'))
                    }
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [programId, requestFn])

    const validate = (): boolean => {
        const errors: FormErrors = {}
        const trimmedCode = code.trim()
        const trimmedName = name.trim()

        if (!trimmedCode) {
            errors.code = 'Mã chương trình không được để trống.'
        } else if (!/^[A-Za-z0-9_-]{2,20}$/.test(trimmedCode)) {
            errors.code = 'Mã chương trình chỉ gồm 2-20 ký tự chữ, số, gạch nối (-), gạch dưới (_).'
        }

        if (!trimmedName) {
            errors.name = 'Tên chương trình không được để trống.'
        } else if (trimmedName.length < 2 || trimmedName.length > 255) {
            errors.name = 'Tên chương trình phải từ 2 đến 255 ký tự.'
        }

        if (durationSemesters.trim() !== '') {
            const semestersNum = Number(durationSemesters)
            if (isNaN(semestersNum) || !Number.isInteger(semestersNum) || semestersNum < 1 || semestersNum > 20) {
                errors.duration_semesters = 'Thời lượng học kỳ phải là số nguyên từ 1 đến 20.'
            }
        }

        if (standardTuitionFee.trim() !== '') {
            const feeNum = Number(standardTuitionFee)
            if (isNaN(feeNum) || feeNum < 0) {
                errors.standard_tuition_fee = 'Học phí chuẩn phải là số không âm.'
            }
        }

        if (absenceAlertThreshold.trim() !== '') {
            const thresholdNum = Number(absenceAlertThreshold)
            if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 100) {
                errors.absence_alert_threshold = 'Ngưỡng cảnh báo vắng phải từ 0% đến 100%.'
            } else if (absenceAlertThreshold.includes('.')) {
                const dec = absenceAlertThreshold.split('.')[1].replace(/0+$/, '')
                if (dec.length > 2) {
                    errors.absence_alert_threshold = 'Ngưỡng chỉ được phép có tối đa 2 chữ số thập phân.'
                }
            }
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!validate() || !programId) return

        setIsSubmitting(true)

        const payload: UpdateTrainingProgramInput = {
            code: code.trim().toUpperCase(),
            name: name.trim(),
            description: description.trim() || null,
            duration_semesters: durationSemesters.trim() !== '' ? Number(durationSemesters) : null,
            standard_tuition_fee: standardTuitionFee.trim() !== '' ? Number(standardTuitionFee) : null,
            absence_alert_threshold: absenceAlertThreshold.trim() !== '' ? Number(absenceAlertThreshold) : 20.0,
            status,
        }

        try {
            await updateTrainingProgram(requestFn, programId, payload)
            const msg = getSuccessMessage('UPDATE_PROGRAM_SUCCESS', 'Cập nhật chương trình đào tạo thành công!')
            toast.success(msg)
            setIsDirty(false)
            setTimeout(() => {
                navigate(`/training-programs/${programId}`)
            }, 800)
        } catch (err: unknown) {
            const errText = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi cập nhật chương trình đào tạo.')
            toast.error(errText)
        } finally {
            setIsSubmitting(false)
        }
    }

    const [isConfirmLeaveOpen, setIsConfirmLeaveOpen] = useState(false)

    const handleCancel = () => {
        if (isDirty) {
            setIsConfirmLeaveOpen(true)
            return
        }
        navigate(`/training-programs/${programId || ''}`)
    }

    if (isLoading) {
        return (
            <div className="training-programs-container">
                <div className="programs-loading">
                    <div className="spinner" />
                    <span>Đang tải thông tin...</span>
                </div>
            </div>
        )
    }

    if (pageError || !program) {
        return (
            <div className="training-programs-container">
                <PageHeader
                    title="Chỉnh sửa chương trình đào tạo"
                    breadcrumbs={[
                        { label: 'Chương trình đào tạo', path: '/training-programs' },
                        { label: 'Chỉnh sửa' },
                    ]}
                />
                <div className="programs-alert error" role="alert">
                    <span>{pageError || 'Không tìm thấy chương trình đào tạo.'}</span>
                </div>
                <div style={{ marginTop: '16px' }}>
                    <button type="button" className="btn-secondary" onClick={() => navigate('/training-programs')}>
                        Quay lại danh sách chương trình
                    </button>
                </div>
            </div>
        )
    }

    if (!canManage) {
        return (
            <div className="training-programs-container">
                <PageHeader
                    title="Không có quyền truy cập"
                    breadcrumbs={[
                        { label: 'Chương trình đào tạo', path: '/training-programs' },
                        { label: program.name, path: `/training-programs/${program.id}` },
                        { label: 'Chỉnh sửa' },
                    ]}
                />
                <div className="programs-alert error" role="alert">
                    <span>Bạn không có quyền chỉnh sửa chương trình đào tạo này.</span>
                </div>
            </div>
        )
    }

    const navItems = [
        { key: 'info', label: 'Thông tin chung', path: `/training-programs/${program.id}` },
        { key: 'structure', label: 'Cấu trúc môn học', path: `/training-programs/${program.id}/structure` },
    ]

    return (
        <div className="training-programs-container" data-testid="training-program-edit-page">
            <PageHeader
                title={`Chỉnh sửa: ${program.name}`}
                subtitle={`Mã chương trình: ${program.code}`}
                breadcrumbs={[
                    { label: 'Chương trình đào tạo', path: '/training-programs' },
                    { label: program.name, path: `/training-programs/${program.id}` },
                    { label: 'Chỉnh sửa' },
                ]}
            />

            <DetailNavTabs items={navItems} />

            <div className="modal-content" style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-program-code">
                                Mã chương trình <span className="required">*</span>
                            </label>
                            <input
                                id="edit-program-code"
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
                            <label className="form-label" htmlFor="edit-program-status">
                                Trạng thái
                            </label>
                            <select
                                id="edit-program-status"
                                className="form-select"
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value as TrainingProgramStatus)
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
                        <label className="form-label" htmlFor="edit-program-name">
                            Tên chương trình đào tạo <span className="required">*</span>
                        </label>
                        <input
                            id="edit-program-name"
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
                            <label className="form-label" htmlFor="edit-program-duration">
                                Thời lượng (Học kỳ)
                            </label>
                            <input
                                id="edit-program-duration"
                                type="number"
                                min={1}
                                max={20}
                                className={`form-input ${formErrors.duration_semesters ? 'error' : ''}`}
                                value={durationSemesters}
                                onChange={(e) => {
                                    setDurationSemesters(e.target.value)
                                    setIsDirty(true)
                                }}
                                disabled={isSubmitting}
                            />
                            {formErrors.duration_semesters && <div className="form-error">{formErrors.duration_semesters}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-program-tuition">
                                Học phí chuẩn (VNĐ / kỳ)
                            </label>
                            <input
                                id="edit-program-tuition"
                                type="number"
                                min={0}
                                step="100000"
                                className={`form-input ${formErrors.standard_tuition_fee ? 'error' : ''}`}
                                value={standardTuitionFee}
                                onChange={(e) => {
                                    setStandardTuitionFee(e.target.value)
                                    setIsDirty(true)
                                }}
                                disabled={isSubmitting}
                            />
                            {formErrors.standard_tuition_fee && <div className="form-error">{formErrors.standard_tuition_fee}</div>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="edit-program-absence-threshold">
                            Ngưỡng cảnh báo vắng (%) <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 'normal' }}>(Mặc định: 20%)</span>
                        </label>
                        <input
                            id="edit-program-absence-threshold"
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            className={`form-input ${formErrors.absence_alert_threshold ? 'error' : ''}`}
                            value={absenceAlertThreshold}
                            onChange={(e) => {
                                setAbsenceAlertThreshold(e.target.value)
                                setIsDirty(true)
                            }}
                            disabled={isSubmitting}
                        />
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            💡 Cảnh báo được kích hoạt khi tỷ lệ vắng của học viên trong lớp (A / N × 100) lớn hơn ngưỡng này. Giá trị từ 0.00% đến 100.00%.
                        </div>
                        {formErrors.absence_alert_threshold && <div className="form-error">{formErrors.absence_alert_threshold}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="edit-program-desc">
                            Mô tả chương trình
                        </label>
                        <textarea
                            id="edit-program-desc"
                            className="form-textarea"
                            rows={4}
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
                            className="btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
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
                onConfirm={() => navigate(`/training-programs/${programId || ''}`)}
                onCancel={() => setIsConfirmLeaveOpen(false)}
            />
        </div>
    )
}
