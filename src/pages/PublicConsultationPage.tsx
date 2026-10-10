/**
 * Trang Đăng ký / Gửi yêu cầu tư vấn công khai (SCRUM-125 - Activity A6 / Redesign V2).
 * Giao diện 2 cột chuẩn Academic ICTU:
 * - Cột trái (40-45%): Giới thiệu, ảnh thật ICTU, danh sách lợi ích, cam kết tin cậy.
 * - Cột phải (55-60%): Form đăng ký tư vấn 2 cột desktop, validation SCRUM-125, success/error states.
 */

import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
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
    initialProgramId?: string
    onSuccess?: (response: PublicConsultationResponse) => void
}

const PHONE_REGEX = /^\+?[0-9\s\-.()]{6,30}$/
const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/

export function PublicConsultationPage({
    apiOrigin,
    requestFn,
    initialProgramId,
    onSuccess,
}: PublicConsultationPageProps) {
    let queryProgramId: string | null = null
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [searchParams] = useSearchParams()
        queryProgramId = searchParams.get('program')
    } catch {
        queryProgramId = null
    }

    const targetProgramId = initialProgramId || queryProgramId

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

                    // Tiền chọn chương trình nếu query ?program=<valid-id> hợp lệ
                    if (targetProgramId) {
                        const matched = programs.find((p) => String(p.id) === String(targetProgramId))
                        if (matched) {
                            setFormData((prev) => ({
                                ...prev,
                                interested_program_id: matched.id,
                            }))
                        }
                    }
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
    }, [requestFn, apiOrigin, targetProgramId])

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
        <main className="consultation-page-wrapper">
            <div className="consultation-content-container">
                {/* ================================================== */}
                {/* CỘT TRÁI: THÔNG TIN GIỚI THIỆU & LỢI ÍCH (40-45%) */}
                {/* ================================================== */}
                <aside className="consultation-info-panel" aria-label="Thông tin tư vấn tuyển sinh ICTU">
                    <div className="info-panel-card">
                        {/* Ảnh ICTU thật trong dự án */}
                        <div className="info-media-wrapper">
                            <img
                                src="/branding/ictu/ictu-building.jpg"
                                alt="Tòa nhà điều hành Trường Đại học Công nghệ Thông tin và Truyền thông - ICTU"
                                className="info-media-img"
                                loading="lazy"
                            />
                            <div className="info-media-badge">
                                <span className="badge-dot" aria-hidden="true" />
                                <span>Khuôn viên Đại học ICTU</span>
                            </div>
                        </div>

                        <div className="info-content-section">
                            <div className="info-eyebrow-tag">ĐĂNG KÝ TƯ VẤN</div>
                            <h2 className="info-main-heading">
                                Bạn cần hỗ trợ lựa chọn<br className="heading-br" /> chương trình phù hợp?
                            </h2>
                            <p className="info-main-desc">
                                Để lại thông tin, bộ phận tư vấn ICTU sẽ liên hệ và hỗ trợ bạn tìm hiểu chương trình đào tạo phù hợp.
                            </p>

                            {/* Danh sách lợi ích */}
                            <div className="info-benefits-block">
                                <div className="benefits-label">Lợi ích khi nhận tư vấn:</div>
                                <ul className="benefits-list">
                                    <li className="benefit-item">
                                        <span className="benefit-check" aria-hidden="true">✓</span>
                                        <span className="benefit-text">Tìm hiểu chương trình đào tạo</span>
                                    </li>
                                    <li className="benefit-item">
                                        <span className="benefit-check" aria-hidden="true">✓</span>
                                        <span className="benefit-text">Định hướng ngành học</span>
                                    </li>
                                    <li className="benefit-item">
                                        <span className="benefit-check" aria-hidden="true">✓</span>
                                        <span className="benefit-text">Hỗ trợ thông tin tuyển sinh</span>
                                    </li>
                                    <li className="benefit-item">
                                        <span className="benefit-check" aria-hidden="true">✓</span>
                                        <span className="benefit-text">Giải đáp các thắc mắc trước khi đăng ký</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Cam kết tin cậy / Trust messages */}
                            <div className="info-trust-card">
                                <div className="trust-item">
                                    <svg className="trust-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>Tư vấn hoàn toàn miễn phí</span>
                                </div>
                                <div className="trust-item">
                                    <svg className="trust-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                    <span>Không cần tạo tài khoản</span>
                                </div>
                                <div className="trust-item">
                                    <svg className="trust-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>Thông tin của bạn chỉ được sử dụng để hỗ trợ tư vấn.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ================================================== */}
                {/* CỘT PHẢI: FORM CARD TƯ VẤN (55-60%)                */}
                {/* ================================================== */}
                <div className="consultation-form-panel">
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
                                    aria-hidden="true"
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
                                    aria-hidden="true"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
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
                                    Cảm ơn bạn đã đăng ký tư vấn. Yêu cầu của bạn đã được ghi nhận.
                                    <br />
                                    Bộ phận tư vấn ICTU sẽ liên hệ lại với bạn <strong>trong vòng 24 giờ làm việc</strong>.
                                </p>
                                {submittedId && (
                                    <div className="success-reference">
                                        Mã tham chiếu: <strong>{submittedId}</strong>
                                    </div>
                                )}
                                <div className="success-actions">
                                    <button
                                        type="button"
                                        className="reset-btn"
                                        onClick={handleReset}
                                        id="btn-send-another"
                                    >
                                        Gửi yêu cầu khác
                                    </button>
                                    <Link to="/programs" className="success-link-btn outline">
                                        Xem chương trình đào tạo
                                    </Link>
                                    <Link to="/" className="success-link-btn text">
                                        Về trang chủ
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <form
                                className="consultation-form"
                                onSubmit={handleSubmit}
                                noValidate
                                data-testid="consultation-form"
                            >
                                {/* Grid 2 cột: Họ tên & Số điện thoại */}
                                <div className="form-grid-row">
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
                                </div>

                                {/* Grid 2 cột: Email & Chương trình */}
                                <div className="form-grid-row">
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
                                </div>

                                {/* Full width: Nội dung cần tư vấn */}
                                <div className="form-group">
                                    <label htmlFor="consultation-message" className="form-label">
                                        Nội dung cần tư vấn
                                    </label>
                                    <textarea
                                        id="consultation-message"
                                        name="message"
                                        className={`form-textarea ${fieldErrors.message ? 'is-invalid' : ''}`}
                                        placeholder="Ghi chú thêm về định hướng ngành học, phương thức xét tuyển học bạ, học phí..."
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

                                {/* Nút gửi yêu cầu tư vấn */}
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
                                        <>
                                            <span>Gửi yêu cầu tư vấn</span>
                                            <svg
                                                className="btn-send-icon"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                                aria-hidden="true"
                                            >
                                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                            </svg>
                                        </>
                                    )}
                                </button>

                                {/* Thông điệp bảo mật riêng tư dưới submit */}
                                <div className="consultation-privacy-notice">
                                    <svg
                                        className="privacy-lock-icon"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4zm-2 5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span>
                                        Thông tin của bạn được sử dụng để phục vụ việc tư vấn và không hiển thị công khai.
                                    </span>
                                </div>
                            </form>
                        )}

                        <footer className="consultation-footer">
                            <Link to="/login" className="login-link">
                                ← Quay lại trang Đăng nhập hệ thống
                            </Link>
                        </footer>
                    </div>
                </div>
            </div>
        </main>
    )
}
