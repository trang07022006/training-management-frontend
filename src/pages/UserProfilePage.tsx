import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import {
    getUserProfileApi,
    updateUserProfileApi,
    type UserProfileData,
    type UpdateProfilePayload,
    ApiError,
} from '../api/userApi'
import { getUserRoleDisplay } from '../navigation/userProfileUtils'
import { ProfileAvatarSection } from '../components/ProfileAvatarSection'
import { getErrorMessage } from '../utils/errorMessages'
import './UserProfilePage.css'

const VIETNAMESE_PHONE_REGEX = /^0[35789]\d{8}$/

export function UserProfilePage() {
    const { request, role: sessionRole } = useSession()
    const navigate = useNavigate()
    const location = useLocation()

    // Profile state
    const [profile, setProfile] = useState<UserProfileData | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    // Form fields (editable)
    const [name, setName] = useState<string>('')
    const [phone, setPhone] = useState<string>('')
    const [dateOfBirth, setDateOfBirth] = useState<string>('')
    const [address, setAddress] = useState<string>('')

    // Form submission & feedback state
    const [isSaving, setIsSaving] = useState<boolean>(false)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false)

    // Calculate dirty state by comparing current form fields with backend profile
    const isDirty = Boolean(
        profile && (
            name !== (profile.name ?? '') ||
            phone !== (profile.phone ?? '') ||
            dateOfBirth !== (profile.date_of_birth ?? '') ||
            address !== (profile.address ?? '')
        )
    )

    // Today's date in YYYY-MM-DD format for max DOB check
    const todayStr = new Date().toISOString().split('T')[0]

    // Navigation back helper with fallback to overview page
    const handleNavigateBack = useCallback(() => {
        const hasHistory =
            (typeof window !== 'undefined' && window.history && (window.history.state?.idx > 0 || window.history.length > 1)) ||
            location.key !== 'default'

        if (hasHistory) {
            navigate(-1)
        } else {
            navigate('/')
        }
    }, [navigate, location.key])

    // Load user profile on mount
    useEffect(() => {
        let isMounted = true
        getUserProfileApi(request)
            .then((data) => {
                if (isMounted) {
                    setProfile(data)
                    setName(data.name || '')
                    setPhone(data.phone || '')
                    setDateOfBirth(data.date_of_birth || '')
                    setAddress(data.address || '')
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    const msg = getErrorMessage(err, 'Không thể tải thông tin hồ sơ cá nhân. Vui lòng thử lại.')
                    setLoadError(msg)
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [request])

    const handleRetry = useCallback(() => {
        setIsLoading(true)
        setLoadError(null)
        getUserProfileApi(request)
            .then((data) => {
                setProfile(data)
                setName(data.name || '')
                setPhone(data.phone || '')
                setDateOfBirth(data.date_of_birth || '')
                setAddress(data.address || '')
                setIsLoading(false)
            })
            .catch((err) => {
                const msg = getErrorMessage(err, 'Không thể tải thông tin hồ sơ cá nhân. Vui lòng thử lại.')
                setLoadError(msg)
                setIsLoading(false)
            })
    }, [request])

    // Validate form before submission
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {}

        // Name: required, trim, max 255 chars
        const trimmedName = name.trim()
        if (!trimmedName) {
            errors.name = 'Họ và tên là bắt buộc.'
        } else if (trimmedName.length > 255) {
            errors.name = 'Họ và tên không được vượt quá 255 ký tự.'
        }

        // Phone: optional, if present must match Vietnamese phone regex
        const trimmedPhone = phone.trim()
        if (trimmedPhone && !VIETNAMESE_PHONE_REGEX.test(trimmedPhone)) {
            errors.phone = 'Số điện thoại không đúng định dạng.'
        }

        // DOB: optional, cannot be a future date
        if (dateOfBirth && dateOfBirth > todayStr) {
            errors.date_of_birth = 'Ngày sinh không được ở thời điểm tương lai.'
        }

        // Address: optional, max 255 chars
        const trimmedAddress = address.trim()
        if (trimmedAddress.length > 255) {
            errors.address = 'Địa chỉ không được vượt quá 255 ký tự.'
        }

        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Handle form submit
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (isSaving || isLoading) {
            return
        }

        setSuccessMessage(null)
        setErrorMessage(null)

        if (!validateForm()) {
            return
        }

        setIsSaving(true)

        // Strictly only send editable fields (no email, role, id, status, password)
        const payload: UpdateProfilePayload = {
            name: name.trim(),
            phone: phone.trim() ? phone.trim() : null,
            date_of_birth: dateOfBirth ? dateOfBirth : null,
            address: address.trim() ? address.trim() : null,
        }

        try {
            const updated = await updateUserProfileApi(request, payload)
            setProfile(updated)
            setName(updated.name || '')
            setPhone(updated.phone || '')
            setDateOfBirth(updated.date_of_birth || '')
            setAddress(updated.address || '')
            setFieldErrors({})
            setSuccessMessage('Cập nhật hồ sơ thành công.')
        } catch (err) {
            if (err instanceof ApiError) {
                setErrorMessage(err.message)
            } else {
                const msg = getErrorMessage(err, 'Lỗi khi cập nhật hồ sơ cá nhân.')
                setErrorMessage(msg)
            }
        } finally {
            setIsSaving(false)
        }
    }

    // Click on "Hủy thay đổi" button on form: if dirty, show confirm dialog; else navigate back
    const handleCancelClick = () => {
        if (isDirty) {
            setShowCancelConfirm(true)
        } else {
            handleNavigateBack()
        }
    }

    // Confirm cancel in modal: discard changes, reset state, and navigate back
    const handleConfirmCancel = () => {
        setShowCancelConfirm(false)
        if (profile) {
            setName(profile.name || '')
            setPhone(profile.phone || '')
            setDateOfBirth(profile.date_of_birth || '')
            setAddress(profile.address || '')
        }
        setFieldErrors({})
        setSuccessMessage(null)
        setErrorMessage(null)
        handleNavigateBack()
    }

    // Dismiss confirm dialog and stay on profile page with edited data intact
    const handleStay = () => {
        setShowCancelConfirm(false)
    }

    // Loading State
    if (isLoading) {
        return (
            <div className="profile-page-container" data-testid="user-profile-page">
                <div className="profile-loading-state" data-testid="profile-loading">
                    <div className="loading-spinner" aria-hidden="true" />
                    <p>Đang tải thông tin hồ sơ...</p>
                </div>
            </div>
        )
    }

    // Error State when initial load fails
    if (loadError) {
        return (
            <div className="profile-page-container" data-testid="user-profile-page">
                <div className="profile-card profile-error-card" data-testid="profile-load-error">
                    <div className="error-icon" aria-hidden="true">⚠️</div>
                    <h2>Không thể tải hồ sơ</h2>
                    <p className="error-description">{loadError}</p>
                    <button
                        type="button"
                        className="btn-retry"
                        onClick={handleRetry}
                        data-testid="btn-retry-load"
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        )
    }

    const currentRole = profile?.role || sessionRole || 'user'
    const roleDisplay = getUserRoleDisplay(currentRole)

    return (
        <div className="profile-page-container" data-testid="user-profile-page">
            {/* Header Section */}
            <header className="profile-header">
                <div className="profile-badge-icon" aria-hidden="true">
                    👤
                </div>
                <div className="profile-title-group">
                    <h1 className="profile-page-title" data-testid="profile-title">
                        Hồ sơ cá nhân
                    </h1>
                    <p className="profile-page-subtitle">
                        Xem và cập nhật thông tin tài khoản của bạn trên hệ thống
                    </p>
                </div>
            </header>

            {/* Avatar Section (SCRUM-121 A6) - độc lập với form hồ sơ */}
            {profile && (
                <ProfileAvatarSection
                    request={request}
                    name={profile.name || ''}
                    email={profile.email || ''}
                    roleDisplay={roleDisplay}
                    avatarUrl={profile.avatar_url ?? null}
                    onAvatarUrlChange={(url) =>
                        setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev))
                    }
                />
            )}

            {/* Notification Banners */}
            {successMessage && (
                <div
                    className="profile-alert profile-alert-success"
                    role="alert"
                    data-testid="profile-success-message"
                >
                    <span className="alert-icon" aria-hidden="true">✓</span>
                    <span>{successMessage}</span>
                </div>
            )}

            {errorMessage && (
                <div
                    className="profile-alert profile-alert-error"
                    role="alert"
                    data-testid="profile-error-message"
                >
                    <span className="alert-icon" aria-hidden="true">⚠️</span>
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* User Hero Summary (Avatar mặc định, Họ tên, Vai trò, Email) */}
            <div className="profile-hero-card">
                <div className="profile-hero-avatar" aria-hidden="true">
                    {name ? name.trim().charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="profile-hero-info">
                    <h2 className="profile-hero-name">{name || profile?.name || 'Người dùng'}</h2>
                    <div className="profile-hero-meta">
                        <span className="profile-hero-email">{profile?.email}</span>
                        <span className="profile-hero-role-badge">{roleDisplay}</span>
                    </div>
                </div>
            </div>

            {/* Main Profile Form Card */}
            <main className="profile-main-area">
                <form onSubmit={handleSubmit} noValidate className="profile-form" data-testid="profile-form">
                    {/* Card 1: Thông tin cá nhân */}
                    <section className="profile-section-card">
                        <div className="profile-section-header">
                            <h3 className="profile-section-title">
                                <span className="section-title-icon" aria-hidden="true">📋</span>
                                Thông tin cá nhân
                            </h3>
                            <p className="profile-section-subtitle">
                                Cập nhật thông tin cơ bản và địa chỉ liên hệ của bạn
                            </p>
                        </div>

                        <div className="profile-grid">
                            {/* Name (Editable, Required) */}
                            <div className="form-group">
                                <label htmlFor="profile-name" className="form-label">
                                    Họ và tên <span className="required-mark" aria-hidden="true">*</span>
                                </label>
                                <input
                                    id="profile-name"
                                    name="name"
                                    type="text"
                                    className={`form-input ${fieldErrors.name ? 'input-error' : ''}`}
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value)
                                        if (fieldErrors.name) {
                                            setFieldErrors((prev) => ({ ...prev, name: '' }))
                                        }
                                    }}
                                    maxLength={255}
                                    required
                                    placeholder="Nhập họ và tên"
                                    data-testid="input-profile-name"
                                />
                                {fieldErrors.name && (
                                    <span className="field-error-text" role="alert" data-testid="error-name">
                                        {fieldErrors.name}
                                    </span>
                                )}
                            </div>

                            {/* Phone (Editable, Optional) */}
                            <div className="form-group">
                                <label htmlFor="profile-phone" className="form-label">
                                    Số điện thoại
                                </label>
                                <input
                                    id="profile-phone"
                                    name="phone"
                                    type="tel"
                                    className={`form-input ${fieldErrors.phone ? 'input-error' : ''}`}
                                    value={phone}
                                    onChange={(e) => {
                                        setPhone(e.target.value)
                                        if (fieldErrors.phone) {
                                            setFieldErrors((prev) => ({ ...prev, phone: '' }))
                                        }
                                    }}
                                    maxLength={20}
                                    placeholder="Ví dụ: 0912345678"
                                    data-testid="input-profile-phone"
                                />
                                {fieldErrors.phone && (
                                    <span className="field-error-text" role="alert" data-testid="error-phone">
                                        {fieldErrors.phone}
                                    </span>
                                )}
                                <span className="field-helper-text">
                                    Định dạng di động Việt Nam 10 chữ số (đầu 03, 05, 07, 08, 09).
                                </span>
                            </div>

                            {/* Date of Birth (Editable, Optional) */}
                            <div className="form-group">
                                <label htmlFor="profile-dob" className="form-label">
                                    Ngày sinh
                                </label>
                                <input
                                    id="profile-dob"
                                    name="date_of_birth"
                                    type="date"
                                    className={`form-input ${fieldErrors.date_of_birth ? 'input-error' : ''}`}
                                    value={dateOfBirth}
                                    max={todayStr}
                                    onChange={(e) => {
                                        setDateOfBirth(e.target.value)
                                        if (fieldErrors.date_of_birth) {
                                            setFieldErrors((prev) => ({ ...prev, date_of_birth: '' }))
                                        }
                                    }}
                                    data-testid="input-profile-dob"
                                />
                                {fieldErrors.date_of_birth && (
                                    <span className="field-error-text" role="alert" data-testid="error-dob">
                                        {fieldErrors.date_of_birth}
                                    </span>
                                )}
                            </div>

                            {/* Address (Editable, Optional) */}
                            <div className="form-group form-group-full">
                                <div className="label-with-counter">
                                    <label htmlFor="profile-address" className="form-label">
                                        Địa chỉ liên hệ
                                    </label>
                                    <span className="char-counter" data-testid="address-char-counter">
                                        {address.length}/255
                                    </span>
                                </div>
                                <textarea
                                    id="profile-address"
                                    name="address"
                                    className={`form-textarea ${fieldErrors.address ? 'input-error' : ''}`}
                                    value={address}
                                    onChange={(e) => {
                                        setAddress(e.target.value)
                                        if (fieldErrors.address) {
                                            setFieldErrors((prev) => ({ ...prev, address: '' }))
                                        }
                                    }}
                                    maxLength={255}
                                    rows={3}
                                    placeholder="Nhập địa chỉ cư trú hoặc nơi làm việc..."
                                    data-testid="input-profile-address"
                                />
                                {fieldErrors.address && (
                                    <span className="field-error-text" role="alert" data-testid="error-address">
                                        {fieldErrors.address}
                                    </span>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Card 2: Thông tin tài khoản */}
                    <section className="profile-section-card">
                        <div className="profile-section-header">
                            <h3 className="profile-section-title">
                                <span className="section-title-icon" aria-hidden="true">🔐</span>
                                Thông tin tài khoản
                            </h3>
                            <p className="profile-section-subtitle">
                                Thông tin định danh và phân quyền hệ thống (chỉ xem)
                            </p>
                        </div>

                        <div className="profile-grid">
                            {/* Email (Read-only, Locked) */}
                            <div className="form-group">
                                <label htmlFor="profile-email" className="form-label">
                                    Địa chỉ email
                                </label>
                                <div className="readonly-input-wrapper">
                                    <input
                                        id="profile-email"
                                        name="email"
                                        type="email"
                                        className="form-input form-input-readonly"
                                        value={profile?.email || ''}
                                        readOnly
                                        disabled
                                        data-testid="input-profile-email"
                                        title="Email không thể thay đổi tại đây"
                                    />
                                    <span className="lock-icon" aria-hidden="true" title="Đã khóa">
                                        🔒
                                    </span>
                                </div>
                                <span className="field-helper-text" data-testid="email-helper-text">
                                    Email không thể thay đổi tại đây.
                                </span>
                            </div>

                            {/* Role (Read-only Badge) */}
                            <div className="form-group">
                                <label className="form-label">
                                    Vai trò hệ thống
                                </label>
                                <div className="role-display-box" data-testid="profile-role-container">
                                    <span className="role-tag" data-testid="profile-role-badge">
                                        {roleDisplay}
                                    </span>
                                    <span className="role-code-badge" data-testid="profile-role-code">
                                        ({currentRole})
                                    </span>
                                </div>
                                <span className="field-helper-text">
                                    Vai trò do Quản trị viên phân quyền và quản lý.
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Action Buttons */}
                    <div className="profile-actions">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={handleCancelClick}
                            disabled={isSaving}
                            data-testid="btn-cancel-profile"
                        >
                            Hủy thay đổi
                        </button>
                        <button
                            type="submit"
                            className="btn-save"
                            disabled={isSaving}
                            data-testid="btn-save-profile"
                        >
                            {isSaving ? (
                                <>
                                    <span className="btn-spinner" aria-hidden="true" />
                                    <span>Đang lưu...</span>
                                </>
                            ) : (
                                'Lưu thay đổi'
                            )}
                        </button>
                    </div>
                </form>
            </main>

            {/* Confirmation Dialog when canceling with unsaved changes */}
            {showCancelConfirm && (
                <div
                    className="profile-modal-backdrop"
                    data-testid="cancel-confirm-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-cancel-title"
                >
                    <div className="profile-modal-card">
                        <div className="profile-modal-header">
                            <span className="profile-modal-icon" aria-hidden="true">⚠️</span>
                            <h3 id="confirm-cancel-title" className="profile-modal-title">
                                Xác nhận hủy thay đổi
                            </h3>
                        </div>
                        <div className="profile-modal-body">
                            <p className="profile-modal-message" data-testid="cancel-confirm-message">
                                Bạn có thay đổi chưa được lưu. Bạn có chắc muốn hủy không?
                            </p>
                        </div>
                        <div className="profile-modal-actions">
                            <button
                                type="button"
                                className="btn-modal-stay"
                                onClick={handleStay}
                                data-testid="btn-stay"
                            >
                                Ở lại
                            </button>
                            <button
                                type="button"
                                className="btn-modal-confirm-cancel"
                                onClick={handleConfirmCancel}
                                data-testid="btn-confirm-cancel"
                            >
                                Hủy thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
