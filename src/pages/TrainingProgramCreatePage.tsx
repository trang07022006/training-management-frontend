import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { createTrainingProgram, type CreateTrainingProgramInput, type TrainingProgramStatus, ApiError } from '../api/trainingProgramApi'
import { PageHeader } from '../components/PageHeader'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { toast } from '../components/ToastPortal'
import './TrainingProgramsPage.css'

interface FormErrors {
    code?: string
    name?: string
    duration_semesters?: string
    standard_tuition_fee?: string
    general?: string
}

export function TrainingProgramCreatePage() {
    const navigate = useNavigate()
    const { request: requestFn, permissions, role } = useSession()

    const canManage = permissions?.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) || role === 'admin'

    const [code, setCode] = useState('')
    const [name, setName] = useState('')
    const [durationSemesters, setDurationSemesters] = useState('8')
    const [standardTuitionFee, setStandardTuitionFee] = useState('')
    const [description, setDescription] = useState('')
    const [status, setStatus] = useState<TrainingProgramStatus>('draft')

    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

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

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!validate()) return

        setIsSubmitting(true)

        const payload: CreateTrainingProgramInput = {
            code: code.trim().toUpperCase(),
            name: name.trim(),
            description: description.trim() || null,
            duration_semesters: durationSemesters.trim() !== '' ? Number(durationSemesters) : null,
            standard_tuition_fee: standardTuitionFee.trim() !== '' ? Number(standardTuitionFee) : null,
            status,
        }

        try {
            const created = await createTrainingProgram(requestFn, payload)
            const msg = getSuccessMessage('CREATE_PROGRAM_SUCCESS', 'Tạo chương trình đào tạo thành công!')
            toast.success(msg)
            setTimeout(() => {
                navigate(`/training-programs/${created.id}`)
            }, 800)
        } catch (err: unknown) {
            const errText = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi tạo chương trình đào tạo.')
            toast.error(errText)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!canManage) {
        return (
            <div className="training-programs-container">
                <PageHeader
                    title="Không có quyền truy cập"
                    breadcrumbs={[
                        { label: 'Chương trình đào tạo', path: '/training-programs' },
                        { label: 'Thêm mới' },
                    ]}
                />
                <div className="programs-alert error" role="alert">
                    <span>Bạn không có quyền tạo chương trình đào tạo.</span>
                </div>
            </div>
        )
    }

    return (
        <div className="training-programs-container" data-testid="training-program-create-page">
            <PageHeader
                title="Thêm chương trình đào tạo mới"
                subtitle="Nhập thông tin chi tiết để tạo chương trình đào tạo mới trong hệ thống"
                breadcrumbs={[
                    { label: 'Chương trình đào tạo', path: '/training-programs' },
                    { label: 'Thêm mới' },
                ]}
            />

            <div className="modal-content" style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="create-program-code">
                                Mã chương trình <span className="required">*</span>
                            </label>
                            <input
                                id="create-program-code"
                                type="text"
                                className={`form-input ${formErrors.code ? 'error' : ''}`}
                                placeholder="VD: CNTT-2026, KTPM"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                disabled={isSubmitting}
                            />
                            {formErrors.code && <div className="form-error">{formErrors.code}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="create-program-status">
                                Trạng thái
                            </label>
                            <select
                                id="create-program-status"
                                className="form-select"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as TrainingProgramStatus)}
                                disabled={isSubmitting}
                            >
                                <option value="active">Đang hoạt động</option>
                                <option value="draft">Bản nháp</option>
                                <option value="archived">Đã lưu trữ</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="create-program-name">
                            Tên chương trình đào tạo <span className="required">*</span>
                        </label>
                        <input
                            id="create-program-name"
                            type="text"
                            className={`form-input ${formErrors.name ? 'error' : ''}`}
                            placeholder="Nhập tên chương trình..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isSubmitting}
                        />
                        {formErrors.name && <div className="form-error">{formErrors.name}</div>}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="create-program-duration">
                                Thời lượng (Học kỳ)
                            </label>
                            <input
                                id="create-program-duration"
                                type="number"
                                min={1}
                                max={20}
                                className={`form-input ${formErrors.duration_semesters ? 'error' : ''}`}
                                placeholder="VD: 8, 9, 10"
                                value={durationSemesters}
                                onChange={(e) => setDurationSemesters(e.target.value)}
                                disabled={isSubmitting}
                            />
                            {formErrors.duration_semesters && <div className="form-error">{formErrors.duration_semesters}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="create-program-tuition">
                                Học phí chuẩn (VNĐ / kỳ)
                            </label>
                            <input
                                id="create-program-tuition"
                                type="number"
                                min={0}
                                step="100000"
                                className={`form-input ${formErrors.standard_tuition_fee ? 'error' : ''}`}
                                placeholder="VD: 12000000"
                                value={standardTuitionFee}
                                onChange={(e) => setStandardTuitionFee(e.target.value)}
                                disabled={isSubmitting}
                            />
                            {formErrors.standard_tuition_fee && <div className="form-error">{formErrors.standard_tuition_fee}</div>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="create-program-desc">
                            Mô tả chương trình
                        </label>
                        <textarea
                            id="create-program-desc"
                            className="form-textarea"
                            rows={4}
                            placeholder="Mô tả mục tiêu, định hướng và chuẩn đào tạo..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={() => navigate('/training-programs')}
                            disabled={isSubmitting}
                        >
                            Quay lại
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Lưu chương trình'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
