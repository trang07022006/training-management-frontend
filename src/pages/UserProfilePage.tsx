import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useSession } from '../auth/SessionProvider'
import {
    getUserProfileApi,
    updateUserProfileApi,
    type UserProfileData,
    type UpdateProfilePayload,
    ApiError,
} from '../api/userApi'
import { getUserRoleDisplay } from '../navigation/userProfileUtils'
import { getErrorMessage } from '../utils/errorMessages'
import './UserProfilePage.css'

const VIETNAMESE_PHONE_REGEX = /^0[35789]\d{8}$/

export function UserProfilePage() {
    const { request, role: sessionRole } = useSession()

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

    // Today's date in YYYY-MM-DD format for max DOB check
    const todayStr = new Date().toISOString().split('T')[0]

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

    // Cancel / reset changes
    const handleCancel = () => {
        if (!profile) return
        setName(profile.name || '')
        setPhone(profile.phone || '')
        setDateOfBirth(profile.date_of_birth || '')
        setAddress(profile.address || '')
        setFieldErrors({})
        setSuccessMessage(null)
        setErrorMessage(null)
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

            {/* Main Profile Form Card */}
            <main className="profile-card">
                <form onSubmit={handleSubmit} noValidate className="profile-form" data-testid="profile-form">
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

                    {/* Action Buttons */}
                    <div className="profile-actions">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={handleCancel}
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
        </div>
    )
}
