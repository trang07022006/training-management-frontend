import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { createClass, type CreateClassInput, ApiError } from '../api/classApi'
import { getTrainingPrograms, type TrainingProgram } from '../api/trainingProgramApi'
import { PageHeader } from '../components/PageHeader'
import { TrainingProgramSelect } from '../components/TrainingProgramSelect'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './ClassesPage.css'

interface FormErrors {
    class_code?: string
    program_id?: string
    max_capacity?: string
    expected_start_date?: string
    general?: string
}

export function ClassCreatePage() {
    const navigate = useNavigate()
    const { request: requestFn, permissions, role, roles } = useSession()

    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const normalizedRoles = effectiveRoles.map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
    const canManage =
        permissions?.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) ||
        normalizedRoles.includes('admin') ||
        normalizedRoles.includes('training_manager')

    const [programs, setPrograms] = useState<TrainingProgram[]>([])
    const [isLoadingPrograms, setIsLoadingPrograms] = useState(true)

    // Form fields
    const [classCode, setClassCode] = useState('')
    const [programId, setProgramId] = useState('')
    const [expectedStartDate, setExpectedStartDate] = useState('')
    const [maxCapacity, setMaxCapacity] = useState('30')
    const [learningMode, setLearningMode] = useState('offline')

    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        setIsLoadingPrograms(true)
        getTrainingPrograms(requestFn, { page_size: 100 })
            .then((res) => {
                if (isMounted) {
                    setPrograms(res.items || [])
                    if (res.items && res.items.length > 0) {
                        setProgramId(res.items[0].id)
                    }
                    setIsLoadingPrograms(false)
                }
            })
            .catch(() => {
                if (isMounted) setIsLoadingPrograms(false)
            })

        return () => {
            isMounted = false
        }
    }, [requestFn])

    const validate = (): boolean => {
        const errors: FormErrors = {}
        const trimmedCode = classCode.trim()

        if (!trimmedCode) {
            errors.class_code = 'Mã lớp học không được để trống.'
        } else if (!/^[A-Za-z0-9_-]{2,30}$/.test(trimmedCode)) {
            errors.class_code = 'Mã lớp gồm 2-30 ký tự chữ, số, gạch nối (-), gạch dưới (_).'
        }

        if (!programId) {
            errors.program_id = 'Vui lòng chọn chương trình đào tạo.'
        }

        const capacityNum = Number(maxCapacity)
        if (!maxCapacity || isNaN(capacityNum) || capacityNum < 1 || capacityNum > 200) {
            errors.max_capacity = 'Sĩ số tối đa phải là số nguyên từ 1 đến 200.'
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!validate()) return

        setIsSubmitting(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        const payload: CreateClassInput = {
            class_code: classCode.trim().toUpperCase(),
            program_id: programId,
            expected_start_date: expectedStartDate || null,
            max_capacity: Number(maxCapacity),
            learning_mode: learningMode,
            status: 'preparing',
        }

        try {
            const created = await createClass(requestFn, payload)
            setSuccessMessage(getSuccessMessage('CREATE_CLASS_SUCCESS', 'Mở lớp học thành công! Các môn học đã được sao chép tự động.'))
            setTimeout(() => {
                navigate(`/classes/${created.id}`)
            }, 800)
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setErrorMessage(err.message)
            } else {
                setErrorMessage(getErrorMessage(err, 'Lỗi khi mở lớp học mới.'))
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!canManage) {
        return (
            <div className="classes-container">
                <PageHeader
                    title="Không có quyền truy cập"
                    breadcrumbs={[
                        { label: 'Lớp học', path: '/classes' },
                        { label: 'Mở lớp mới' },
                    ]}
                />
                <div className="classes-alert error" role="alert">
                    <span>Bạn không có quyền mở lớp học mới.</span>
                </div>
            </div>
        )
    }

    return (
        <div className="classes-container" data-testid="class-create-page">
            <PageHeader
                title="Mở lớp học mới"
                subtitle="Khai báo thông tin lớp học và tự động sao chép danh sách môn học từ chương trình đào tạo"
                breadcrumbs={[
                    { label: 'Lớp học', path: '/classes' },
                    { label: 'Mở lớp mới' },
                ]}
            />

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

            <div className="modal-content" style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="create-class-code">
                                Mã lớp học <span className="required">*</span>
                            </label>
                            <input
                                id="create-class-code"
                                type="text"
                                className={`form-input ${formErrors.class_code ? 'error' : ''}`}
                                placeholder="VD: CNTT-K20A, SE2026-01"
                                value={classCode}
                                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                                disabled={isSubmitting}
                            />
                            {formErrors.class_code && <div className="form-error">{formErrors.class_code}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="create-class-program">
                                Chương trình đào tạo <span className="required">*</span>
                            </label>
                            <TrainingProgramSelect
                                id="create-class-program"
                                value={programId}
                                onChange={(val) => setProgramId(val)}
                                programs={programs}
                                placeholder="-- Chọn chương trình đào tạo --"
                                disabled={isSubmitting || isLoadingPrograms}
                                hasError={Boolean(formErrors.program_id)}
                            />
                            {formErrors.program_id && <div className="form-error">{formErrors.program_id}</div>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="create-class-date">
                                Ngày dự kiến bắt đầu
                            </label>
                            <input
                                id="create-class-date"
                                type="date"
                                className="form-input"
                                value={expectedStartDate}
                                onChange={(e) => setExpectedStartDate(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="create-class-capacity">
                                Sĩ số tối đa <span className="required">*</span>
                            </label>
                            <input
                                id="create-class-capacity"
                                type="number"
                                min={1}
                                max={200}
                                className={`form-input ${formErrors.max_capacity ? 'error' : ''}`}
                                value={maxCapacity}
                                onChange={(e) => setMaxCapacity(e.target.value)}
                                disabled={isSubmitting}
                            />
                            {formErrors.max_capacity && <div className="form-error">{formErrors.max_capacity}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="create-class-mode">
                                Hình thức đào tạo
                            </label>
                            <select
                                id="create-class-mode"
                                className="form-select"
                                value={learningMode}
                                onChange={(e) => setLearningMode(e.target.value)}
                                disabled={isSubmitting}
                            >
                                <option value="offline">Trực tiếp (Offline)</option>
                                <option value="online">Trực tuyến (Online)</option>
                                <option value="blended">Kết hợp (Blended)</option>
                            </select>
                        </div>
                    </div>

                    <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={() => navigate('/classes')}
                            disabled={isSubmitting}
                        >
                            Quay lại
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang mở lớp...' : 'Mở lớp học'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
