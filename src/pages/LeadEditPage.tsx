import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getLead, updateLead, checkLeadPhone, LEAD_SOURCES, type Lead } from '../api/leadApi'
import { getTrainingPrograms, type TrainingProgram } from '../api/trainingProgramApi'
import { Breadcrumb } from '../components/Breadcrumb'
import { getErrorMessage } from '../utils/errorMessages'
import { ToastPortal } from '../components/ToastPortal'
import './LeadsPage.css'

export function LeadEditPage() {
    const { leadId } = useParams<{ leadId: string }>()
    const navigate = useNavigate()
    const { request } = useSession()

    const [lead, setLead] = useState<Lead | null>(null)
    const [loading, setLoading] = useState(true)

    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [source, setSource] = useState('direct')
    const [interestedProgramId, setInterestedProgramId] = useState('')

    const [trainingPrograms, setTrainingPrograms] = useState<TrainingProgram[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formErrors, setFormErrors] = useState<{
        full_name?: string
        phone?: string
        email?: string
    }>({})
    const [duplicatePhoneWarning, setDuplicatePhoneWarning] = useState<string | null>(null)
    const [apiError, setApiError] = useState<string | null>(null)

    useEffect(() => {
        if (!leadId) return
        let isMounted = true

        getLead(request, leadId)
            .then((data) => {
                if (!isMounted) return
                setLead(data)
                setFullName(data.full_name || '')
                setPhone(data.phone || '')
                setEmail(data.email || '')
                setSource(data.source || 'direct')
                setInterestedProgramId(data.interested_program_id || '')
                setLoading(false)
            })
            .catch((err: unknown) => {
                if (!isMounted) return
                setApiError(getErrorMessage(err, 'Không thể tải thông tin khách hàng.'))
                setLoading(false)
            })

        getTrainingPrograms(request, { page_size: 100 })
            .then((res) => {
                if (isMounted) setTrainingPrograms(res.items || [])
            })
            .catch(() => {})

        return () => {
            isMounted = false
        }
    }, [leadId, request])

    useEffect(() => {
        const trimmedPhone = phone.trim()
        if (trimmedPhone.length < 8 || !leadId) {
            setDuplicatePhoneWarning(null)
            return
        }

        const timer = setTimeout(() => {
            checkLeadPhone(request, trimmedPhone, leadId)
                .then((res) => {
                    if (res.exists) {
                        const extra = res.lead?.full_name
                            ? ` (Đã tồn tại: ${res.lead.full_name}${res.lead.phone ? ` – ${res.lead.phone}` : ''})`
                            : ''
                        setDuplicatePhoneWarning(`Số điện thoại này đã tồn tại trong danh sách khách hàng tiềm năng.${extra}`)
                    } else {
                        setDuplicatePhoneWarning(null)
                    }
                })
                .catch(() => {})
        }, 350)

        return () => clearTimeout(timer)
    }, [phone, leadId, request])

    const validateForm = () => {
        const errors: { full_name?: string; phone?: string; email?: string } = {}

        if (!fullName.trim()) {
            errors.full_name = 'Họ và tên không được để trống.'
        } else if (fullName.trim().length > 100) {
            errors.full_name = 'Họ và tên không được vượt quá 100 ký tự.'
        }

        const phoneTrim = phone.trim()
        if (!phoneTrim) {
            errors.phone = 'Số điện thoại không được để trống.'
        } else if (!/^(0|\+84)[0-9]{9,10}$/.test(phoneTrim.replace(/\s+/g, ''))) {
            errors.phone = 'Số điện thoại không đúng định dạng (bắt đầu bằng 0 hoặc +84, 10-11 số).'
        }

        const emailTrim = email.trim()
        if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
            errors.email = 'Email không đúng định dạng.'
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!leadId) return
        setApiError(null)

        if (!validateForm()) return

        setIsSubmitting(true)
        try {
            await updateLead(request, leadId, {
                full_name: fullName.trim(),
                phone: phone.trim(),
                email: email.trim() || undefined,
                source: source || 'direct',
                interested_program_id: interestedProgramId || undefined,
            })
            navigate(`/leads/${leadId}`)
        } catch (err: unknown) {
            setApiError(getErrorMessage(err, 'Lỗi khi cập nhật thông tin khách hàng.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div style={{ padding: '24px 32px' }}>
                <div className="table-loading" style={{ padding: '40px', textAlign: 'center' }}>
                    <div className="spinner" />
                    <span>Đang tải thông tin khách hàng...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="leads-page" style={{ padding: '24px 32px' }}>
            <Breadcrumb
                items={[
                    { label: 'Tư vấn tuyển sinh', path: '/leads' },
                    { label: lead?.full_name || 'Chi tiết khách hàng', path: `/leads/${leadId}` },
                    { label: 'Chỉnh sửa' },
                ]}
            />

            <div style={{ marginTop: '20px', maxWidth: '800px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#0B1F3A' }}>
                        Chỉnh sửa khách hàng: {lead?.full_name}
                    </h1>
                    <button
                        type="button"
                        className="btn-back"
                        onClick={() => navigate(`/leads/${leadId}`)}
                        disabled={isSubmitting}
                    >
                        Quay lại chi tiết
                    </button>
                </div>

                <ToastPortal
                    error={apiError}
                    onCloseError={() => setApiError(null)}
                />

                <div className="lead-detail-section" style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label htmlFor="lead-edit-name" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                                Họ và tên <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                id="lead-edit-name"
                                type="text"
                                className={`form-control ${formErrors.full_name ? 'is-invalid' : ''}`}
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                maxLength={100}
                                disabled={isSubmitting}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            {formErrors.full_name && (
                                <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                                    {formErrors.full_name}
                                </span>
                            )}
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label htmlFor="lead-edit-phone" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                                Số điện thoại <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                id="lead-edit-phone"
                                type="tel"
                                className={`form-control ${formErrors.phone ? 'is-invalid' : ''}`}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={isSubmitting}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            {formErrors.phone && (
                                <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                                    {formErrors.phone}
                                </span>
                            )}
                            {duplicatePhoneWarning && (
                                <div style={{ color: '#d97706', fontSize: '0.85rem', marginTop: '4px' }}>
                                    ⚠️ {duplicatePhoneWarning}
                                </div>
                            )}
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label htmlFor="lead-edit-email" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                                Email
                            </label>
                            <input
                                id="lead-edit-email"
                                type="email"
                                className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isSubmitting}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            {formErrors.email && (
                                <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                                    {formErrors.email}
                                </span>
                            )}
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label htmlFor="lead-edit-source" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                                Nguồn tiếp nhận
                            </label>
                            <select
                                id="lead-edit-source"
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                                disabled={isSubmitting}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            >
                                {LEAD_SOURCES.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label htmlFor="lead-edit-program" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                                Chương trình quan tâm
                            </label>
                            <select
                                id="lead-edit-program"
                                value={interestedProgramId}
                                onChange={(e) => setInterestedProgramId(e.target.value)}
                                disabled={isSubmitting}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            >
                                <option value="">-- Chọn chương trình đào tạo --</option>
                                {trainingPrograms.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.code} - {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => navigate(`/leads/${leadId}`)}
                                disabled={isSubmitting}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={isSubmitting}
                                style={{ minWidth: '120px' }}
                            >
                                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
export default LeadEditPage
