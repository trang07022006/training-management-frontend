import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { createSubject, type CreateSubjectInput, type SubjectStatus, ApiError } from '../api/subjectApi'
import { PageHeader } from '../components/PageHeader'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { toast } from '../components/ToastPortal'
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

export function SubjectCreatePage() {
    const navigate = useNavigate()
    const { request: requestFn } = useSession()

    const [code, setCode] = useState('')
    const [name, setName] = useState('')
    const [credits, setCredits] = useState('3')
    const [totalSessions, setTotalSessions] = useState('')
    const [weight, setWeight] = useState('')
    const [learningOutcomes, setLearningOutcomes] = useState('')
    const [description, setDescription] = useState('')
    const [status, setStatus] = useState<SubjectStatus>('active')

    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

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
        if (!validate()) return

        setIsSubmitting(true)

        const payload: CreateSubjectInput = {
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
            const created = await createSubject(requestFn, payload)
            const msg = getSuccessMessage('CREATE_SUBJECT_SUCCESS', 'Tạo môn học thành công!')
            toast.success(msg)
            setTimeout(() => {
                navigate(`/subjects/${created.id}`)
            }, 800)
        } catch (err: unknown) {
            const errText = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi tạo môn học.')
            toast.error(errText)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="subjects-container" data-testid="subject-create-page">
            <PageHeader
                title="Thêm môn học mới"
                subtitle="Nhập thông tin chi tiết để tạo học phần mới trong hệ thống"
                breadcrumbs={[
                    { label: 'Môn học', path: '/subjects' },
                    { label: 'Thêm mới' },
                ]}
            />

            <div className="modal-content" style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="create-subject-code">
                                Mã môn học <span className="required">*</span>
                            </label>
                            <input
                                id="create-subject-code"
                                type="text"
                                className={`form-input ${formErrors.code ? 'error' : ''}`}
                                placeholder="VD: INT1001, SE01"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                disabled={isSubmitting}
                            />
                            {formErrors.code && <div className="form-error">{formErrors.code}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="create-subject-credits">
                                Số tín chỉ <span className="required">*</span>
                            </label>
                            <input
                                id="create-subject-credits"
                                type="number"
                                min={1}
                                max={10}
                                className={`form-input ${formErrors.credits ? 'error' : ''}`}
                                value={credits}
                                onChange={(e) => setCredits(e.target.value)}
                                disabled={isSubmitting}
                            />
                            {formErrors.credits && <div className="form-error">{formErrors.credits}</div>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="create-subject-name">
                            Tên môn học <span className="required">*</span>
                        </label>
                        <input
                            id="create-subject-name"
                            type="text"
                            className={`form-input ${formErrors.name ? 'error' : ''}`}
                            placeholder="Nhập tên môn học..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isSubmitting}
                        />
                        {formErrors.name && <div className="form-error">{formErrors.name}</div>}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="create-subject-sessions">
                                Số buổi học
                            </label>
                            <input
                                id="create-subject-sessions"
                                type="number"
                                min={1}
                                max={100}
                                className={`form-input ${formErrors.total_sessions ? 'error' : ''}`}
                                placeholder="VD: 15, 30, 45"
                                value={totalSessions}
                                onChange={(e) => setTotalSessions(e.target.value)}
                                disabled={isSubmitting}
                            />
                            {formErrors.total_sessions && <div className="form-error">{formErrors.total_sessions}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="create-subject-weight">
                                Trọng số (%)
                            </label>
                            <input
                                id="create-subject-weight"
                                type="number"
                                min={0}
                                max={100}
                                step="0.1"
                                className={`form-input ${formErrors.weight ? 'error' : ''}`}
                                placeholder="VD: 20, 30"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                disabled={isSubmitting}
                            />
                            {formErrors.weight && <div className="form-error">{formErrors.weight}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="create-subject-status">
                                Trạng thái
                            </label>
                            <select
                                id="create-subject-status"
                                className="form-select"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as SubjectStatus)}
                                disabled={isSubmitting}
                            >
                                <option value="active">Đang hoạt động</option>
                                <option value="draft">Bản nháp</option>
                                <option value="archived">Đã lưu trữ</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="create-subject-outcomes">
                            Chuẩn đầu ra môn học
                        </label>
                        <textarea
                            id="create-subject-outcomes"
                            className={`form-textarea ${formErrors.learning_outcomes ? 'error' : ''}`}
                            rows={3}
                            placeholder="Mô tả kiến thức, kỹ năng sinh viên đạt được sau khi hoàn thành..."
                            value={learningOutcomes}
                            onChange={(e) => setLearningOutcomes(e.target.value)}
                            disabled={isSubmitting}
                        />
                        {formErrors.learning_outcomes && <div className="form-error">{formErrors.learning_outcomes}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="create-subject-desc">
                            Mô tả học phần
                        </label>
                        <textarea
                            id="create-subject-desc"
                            className="form-textarea"
                            rows={3}
                            placeholder="Mô tả nội dung tóm tắt học phần..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={() => navigate('/subjects')}
                            disabled={isSubmitting}
                        >
                            Quay lại
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Lưu môn học'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
