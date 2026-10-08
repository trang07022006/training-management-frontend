/**
 * Trang Đăng ký / Gửi yêu cầu tư vấn công khai (SCRUM-125 - Activity A6).
 * Cho phép khách vãng lai, học viên tiềm năng gửi thông tin tư vấn tuyển sinh
 * mà KHÔNG cần đăng nhập hay tài khoản.
 */

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
    getPublicProgramOptions,
    submitPublicConsultation,
    type PublicConsultationInput,
    type PublicConsultationResponse,
    type PublicProgramOption,
    type RequestFunction,
} from '../api/publicConsultationApi'
import './PublicConsultationPage.css'

export interface PublicConsultationPageProps {
    apiOrigin?: string
    requestFn?: RequestFunction
    onSuccess?: (response: PublicConsultationResponse) => void
}

const PHONE_REGEX = /^\+?[0-9\s\-.()]{6,30}$/
const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/

export function PublicConsultationPage({
    apiOrigin,
    requestFn,
    onSuccess,
}: PublicConsultationPageProps) {
    const [formData, setFormData] = useState<PublicConsultationInput>({
        full_name: '',
        phone: '',
        email: '',
        interested_program_id: '',
        message: '',
    })

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [programOptions, setProgramOptions] = useState<PublicProgramOption[]>([])
    const [isLoadingPrograms, setIsLoadingPrograms] = useState<boolean>(true)
    const [programNotice, setProgramNotice] = useState<string | null>(null)

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
    const [submittedId, setSubmittedId] = useState<string | null>(null)

    // Tải danh sách chương trình đào tạo mở công khai khi trang được tải
    useEffect(() => {
        let isMounted = true

        getPublicProgramOptions(requestFn, apiOrigin)
            .then((programs) => {
                if (isMounted) {
                    setProgramOptions(programs)
                    setIsLoadingPrograms(false)
                }
            })
            .catch(() => {
                if (isMounted) {
                    setProgramOptions([])
                    setIsLoadingPrograms(false)
                    setProgramNotice(
                        'Danh sách chương trình đào tạo hiện không khả dụng. Bạn vẫn có thể gửi nội dung tư vấn.',
                    )
                }
            })

        return () => {
            isMounted = false
        }
    }, [requestFn, apiOrigin])

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))

        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const next = { ...prev }
                delete next[name]
                return next
            })
        }
    }

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {}
        const nameVal = formData.full_name.trim()
        const phoneVal = formData.phone.trim()
        const emailVal = (formData.email || '').trim()
        const msgVal = (formData.message || '').trim()

        if (!nameVal) {
            errors.full_name = 'Họ và tên là bắt buộc.'
        } else if (nameVal.length > 255) {
            errors.full_name = 'Họ và tên không được vượt quá 255 ký tự.'
        }

        if (!phoneVal) {
            errors.phone = 'Số điện thoại là bắt buộc.'
        } else if (phoneVal.length > 30 || !PHONE_REGEX.test(phoneVal)) {
            errors.phone = 'Số điện thoại không đúng định dạng hợp lệ.'
        }

        if (emailVal) {
            if (emailVal.length > 255 || !EMAIL_REGEX.test(emailVal)) {
                errors.email = 'Định dạng email không hợp lệ.'
            }
        }

        if (msgVal && msgVal.length > 5000) {
            errors.message = 'Nội dung tư vấn không được vượt quá 5000 ký tự.'
        }

        setFieldErrors(errors)

        if (Object.keys(errors).length > 0) {
            // Tự động focus vào trường lỗi đầu tiên
            const firstErrorField = Object.keys(errors)[0]
            const fieldIdMap: Record<string, string> = {
                full_name: 'consultation-name',
                phone: 'consultation-phone',
                email: 'consultation-email',
                message: 'consultation-message',
            }
            const targetId = fieldIdMap[firstErrorField]
            if (targetId) {
                const el = document.getElementById(targetId)
                if (el) el.focus()
            }
            return false
        }

        return true
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setFormError(null)

        if (!validateForm() || isSubmitting) {
            return
        }

        setIsSubmitting(true)

        const payload: PublicConsultationInput = {
            full_name: formData.full_name.trim(),
            phone: formData.phone.trim(),
            email: formData.email ? formData.email.trim() : null,
            interested_program_id: formData.interested_program_id ? formData.interested_program_id.trim() : null,
            message: formData.message ? formData.message.trim() : null,
        }

        try {
            const res = await submitPublicConsultation(payload, requestFn, apiOrigin)
            setIsSubmitted(true)
            setSubmittedId(res.data?.id || null)
            setFormData({
                full_name: '',
                phone: '',
                email: '',
                interested_program_id: '',
                message: '',
            })
            if (onSuccess) {
                onSuccess(res)
            }
        } catch (err: unknown) {
            const errObj = err as { message?: string }
            setFormError(
                errObj.message || 'Không thể gửi yêu cầu tư vấn lúc này. Vui lòng thử lại sau.',
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleReset = () => {
        setIsSubmitted(false)
        setSubmittedId(null)
        setFormError(null)
        setFieldErrors({})
    }

    return (
        <main className="consultation-container">
            <div className="consultation-glow-1" />
            <div className="consultation-glow-2" />

            <div className="consultation-card">
                <header className="consultation-header">
                    <div className="consultation-icon-badge" aria-hidden="true">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <h1 className="consultation-title">Đăng ký tư vấn</h1>
                    <p className="consultation-subtitle">
                        Vui lòng để lại thông tin, ban tư vấn tuyển sinh ICTU sẽ liên hệ và giải đáp
                        chi tiết cho bạn.
                    </p>
                </header>

                {formError && (
                    <div
                        className="consultation-error-banner"
                        role="alert"
                        data-testid="consultation-error-banner"
                    >
                        <svg
                            className="banner-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{formError}</span>
                    </div>
                )}

                {programNotice && (
                    <div className="consultation-info-banner" role="status">
                        <svg
                            className="banner-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <span>{programNotice}</span>
                    </div>
                )}

                {isSubmitted ? (
                    <div
                        className="consultation-success-card"
                        data-testid="consultation-success-card"
                        role="status"
                    >
                        <div className="success-icon-badge" aria-hidden="true">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h2 className="success-title">Gửi yêu cầu thành công!</h2>
                        <p className="success-message">
                            Yêu cầu tư vấn của bạn đã được ghi nhận. Chúng tôi sẽ liên hệ lại trong
                            thời gian phù hợp.
                        </p>
                        {submittedId && (
                            <div className="success-reference">
                                Mã tham chiếu: <strong>{submittedId}</strong>
                            </div>
                        )}
                        <button
                            type="button"
                            className="reset-btn"
                            onClick={handleReset}
                            id="btn-send-another"
                        >
                            Gửi yêu cầu khác
                        </button>
                    </div>
                ) : (
                    <form
                        className="consultation-form"
                        onSubmit={handleSubmit}
                        noValidate
                        data-testid="consultation-form"
                    >
                        {/* Họ và tên */}
                        <div className="form-group">
                            <label htmlFor="consultation-name" className="form-label">
                                Họ và tên <span className="required-mark">*</span>
                            </label>
                            <input
                                type="text"
                                id="consultation-name"
                                name="full_name"
                                className={`form-input ${fieldErrors.full_name ? 'is-invalid' : ''}`}
                                placeholder="Ví dụ: Nguyễn Văn An"
                                value={formData.full_name}
                                onChange={handleInputChange}
                                autoComplete="name"
                                aria-required="true"
                                aria-invalid={!!fieldErrors.full_name}
                                aria-describedby={
                                    fieldErrors.full_name ? 'consultation-name-error' : undefined
                                }
                                disabled={isSubmitting}
                            />
                            {fieldErrors.full_name && (
                                <span
                                    id="consultation-name-error"
                                    className="field-error"
                                    role="alert"
                                >
                                    {fieldErrors.full_name}
                                </span>
                            )}
                        </div>

                        {/* Số điện thoại */}
                        <div className="form-group">
                            <label htmlFor="consultation-phone" className="form-label">
                                Số điện thoại <span className="required-mark">*</span>
                            </label>
                            <input
                                type="tel"
                                id="consultation-phone"
                                name="phone"
                                className={`form-input ${fieldErrors.phone ? 'is-invalid' : ''}`}
                                placeholder="Ví dụ: 0912345678"
                                value={formData.phone}
                                onChange={handleInputChange}
                                autoComplete="tel"
                                aria-required="true"
                                aria-invalid={!!fieldErrors.phone}
                                aria-describedby={
                                    fieldErrors.phone ? 'consultation-phone-error' : undefined
                                }
                                disabled={isSubmitting}
                            />
                            {fieldErrors.phone && (
                                <span
                                    id="consultation-phone-error"
                                    className="field-error"
                                    role="alert"
                                >
                                    {fieldErrors.phone}
                                </span>
                            )}
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <label htmlFor="consultation-email" className="form-label">
                                Địa chỉ Email
                            </label>
                            <input
                                type="email"
                                id="consultation-email"
                                name="email"
                                className={`form-input ${fieldErrors.email ? 'is-invalid' : ''}`}
                                placeholder="Ví dụ: nguyenvana@gmail.com"
                                value={formData.email || ''}
                                onChange={handleInputChange}
                                autoComplete="email"
                                aria-invalid={!!fieldErrors.email}
                                aria-describedby={
                                    fieldErrors.email ? 'consultation-email-error' : undefined
                                }
                                disabled={isSubmitting}
                            />
                            {fieldErrors.email && (
                                <span
                                    id="consultation-email-error"
                                    className="field-error"
                                    role="alert"
                                >
                                    {fieldErrors.email}
                                </span>
                            )}
                        </div>

                        {/* Chương trình đào tạo quan tâm */}
                        <div className="form-group">
                            <label htmlFor="consultation-program" className="form-label">
                                Chương trình đào tạo quan tâm
                            </label>
                            <select
                                id="consultation-program"
                                name="interested_program_id"
                                className="form-select"
                                value={formData.interested_program_id || ''}
                                onChange={handleInputChange}
                                disabled={isSubmitting || isLoadingPrograms || programOptions.length === 0}
                            >
                                <option value="">
                                    {isLoadingPrograms
                                        ? 'Đang tải danh sách chương trình...'
                                        : programOptions.length === 0
                                          ? '-- Hiện chưa có chương trình mở đăng ký --'
                                          : '-- Chọn chương trình quan tâm (nếu có) --'}
                                </option>
                                {programOptions.map((prog) => (
                                    <option key={prog.id} value={prog.id}>
                                        {prog.name} ({prog.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Nội dung cần tư vấn */}
                        <div className="form-group">
                            <label htmlFor="consultation-message" className="form-label">
                                Nội dung cần tư vấn
                            </label>
                            <textarea
                                id="consultation-message"
                                name="message"
                                className={`form-textarea ${fieldErrors.message ? 'is-invalid' : ''}`}
                                placeholder="Ghi chú thêm về định hướng ngành học, học phí, xét tuyển học bạ..."
                                value={formData.message || ''}
                                onChange={handleInputChange}
                                rows={4}
                                aria-invalid={!!fieldErrors.message}
                                aria-describedby={
                                    fieldErrors.message ? 'consultation-message-error' : 'message-hint'
                                }
                                disabled={isSubmitting}
                            />
                            {fieldErrors.message ? (
                                <span
                                    id="consultation-message-error"
                                    className="field-error"
                                    role="alert"
                                >
                                    {fieldErrors.message}
                                </span>
                            ) : (
                                <span id="message-hint" className="field-hint">
                                    Tối đa 5.000 ký tự
                                </span>
                            )}
                        </div>

                        {/* Nút gửi */}
                        <button
                            type="submit"
                            className="submit-consultation-btn"
                            disabled={isSubmitting}
                            id="btn-submit-consultation"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="btn-spinner" aria-hidden="true" />
                                    <span>Đang gửi yêu cầu...</span>
                                </>
                            ) : (
                                <span>Gửi yêu cầu tư vấn</span>
                            )}
                        </button>
                    </form>
                )}

                <footer className="consultation-footer">
                    <Link to="/login" className="login-link">
                        ← Quay lại trang Đăng nhập hệ thống
                    </Link>
                </footer>
            </div>
        </main>
    )
}
