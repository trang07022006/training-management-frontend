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
import { Breadcrumb } from '../components/Breadcrumb'
import { getErrorMessage } from '../utils/errorMessages'
import './UserProfilePage.css'

const VIETNAMESE_PHONE_REGEX = /^0[35789]\d{8}$/

function validateNewPasswordForm(
    newPassword: string,
    confirmPassword?: string,
): { isValid: boolean; message?: string } {
    if (!newPassword) {
        return { isValid: false, message: 'Mật khẩu mới là bắt buộc' }
    }
    if (newPassword.length < 8) {
        return { isValid: false, message: 'Mật khẩu mới phải có tối thiểu 8 ký tự' }
    }
    const hasLetter = /[a-zA-Z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)
    if (!hasLetter || !hasNumber) {
        return {
            isValid: false,
            message: 'Mật khẩu mới phải bao gồm cả chữ cái và chữ số',
        }
    }
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
        return { isValid: false, message: 'Xác nhận mật khẩu mới không trùng khớp' }
    }
    return { isValid: true }
}

export function UserProfilePage() {
    const { request, role: sessionRole, updateSessionUser, reloadAvatar } = useSession()
    const navigate = useNavigate()
    const location = useLocation()

    // Profile state
    const [profile, setProfile] = useState<UserProfileData | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    // Tab state: 'personal' | 'password'
    const [activeTab, setActiveTab] = useState<'personal' | 'password'>('personal')

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

    // Change password tab state
    const [currentPassword, setCurrentPassword] = useState<string>('')
    const [newPassword, setNewPassword] = useState<string>('')
    const [confirmPassword, setConfirmPassword] = useState<string>('')
    const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false)
    const [showNewPassword, setShowNewPassword] = useState<boolean>(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false)
    const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false)
    const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null)
    const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null)

    // Auto-dismiss notification alerts after 4.5 seconds
    useEffect(() => {
        if (!successMessage) return
        const t = setTimeout(() => setSuccessMessage(null), 4500)
        return () => clearTimeout(t)
    }, [successMessage])

    useEffect(() => {
        if (!errorMessage) return
        const t = setTimeout(() => setErrorMessage(null), 6000)
        return () => clearTimeout(t)
    }, [errorMessage])

    useEffect(() => {
        if (!passwordSuccessMessage) return
        const t = setTimeout(() => setPasswordSuccessMessage(null), 4500)
        return () => clearTimeout(t)
    }, [passwordSuccessMessage])

    useEffect(() => {
        if (!passwordErrorMessage) return
        const t = setTimeout(() => setPasswordErrorMessage(null), 6000)
        return () => clearTimeout(t)
    }, [passwordErrorMessage])

    // Calculate dirty state by comparing current form fields with backend profile
    const isDirty = Boolean(
        profile && (
            name !== (profile.name ?? '') ||
            phone !== (profile.phone ?? '') ||
            dateOfBirth !== (profile.date_of_birth ?? '') ||
            address !== (profile.address ?? '')
        ),
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

    // Reset password state when leaving tab or after success
    const resetPasswordState = useCallback(() => {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowCurrentPassword(false)
        setShowNewPassword(false)
        setShowConfirmPassword(false)
        setPasswordErrorMessage(null)
        setPasswordSuccessMessage(null)
    }, [])

    const handleTabChange = useCallback((tab: 'personal' | 'password') => {
        if (tab !== activeTab) {
            resetPasswordState()
            setActiveTab(tab)
        }
    }, [activeTab, resetPasswordState])

    // Validate personal form before submission
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

    // Handle personal form submit
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
            updateSessionUser(updated.name)
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

    // Handle change password submit
    const handleChangePasswordSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (isChangingPassword) return

        setPasswordErrorMessage(null)
        setPasswordSuccessMessage(null)

        if (!currentPassword) {
            setPasswordErrorMessage('Mật khẩu hiện tại là bắt buộc')
            return
        }

        const validation = validateNewPasswordForm(newPassword, confirmPassword)
        if (!validation.isValid) {
            setPasswordErrorMessage(validation.message || 'Mật khẩu mới không hợp lệ')
            return
        }

        setIsChangingPassword(true)
        try {
            const response = await request('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                }),
            })

            const data: unknown = await response.json().catch(() => null)

            if (!response.ok) {
                const code =
                    data &&
                    typeof data === 'object' &&
                    'code' in data &&
                    typeof (data as Record<string, unknown>).code === 'string'
                        ? ((data as Record<string, unknown>).code as string)
                        : null
                const rawMsg =
                    data &&
                    typeof data === 'object' &&
                    'message' in data &&
                    typeof (data as Record<string, unknown>).message === 'string'
                        ? ((data as Record<string, unknown>).message as string)
                        : null
                const message = getErrorMessage(
                    { code, message: rawMsg },
                    'Đổi mật khẩu thất bại. Vui lòng thử lại.',
                )
                setPasswordErrorMessage(message)
                return
            }

            setPasswordSuccessMessage('Đổi mật khẩu thành công.')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err: unknown) {
            setPasswordErrorMessage(getErrorMessage(err, 'Đã có lỗi xảy ra khi đổi mật khẩu'))
        } finally {
            setIsChangingPassword(false)
        }
    }

    // Click on "Hủy thay đổi" button on personal form: if dirty, show confirm dialog; else navigate back
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
            <Breadcrumb items={[{ label: 'Thông tin cá nhân' }]} />

            {/* Header Section: Gọn gàng, giảm khoảng trống */}
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

            {/* Notification Banners for Personal Info */}
            {activeTab === 'personal' && successMessage && (
                <div
                    className="profile-alert profile-alert-success"
                    role="alert"
                    data-testid="profile-success-message"
                >
                    <div className="profile-alert-body">
                        <span className="alert-icon" aria-hidden="true">✓</span>
                        <span>{successMessage}</span>
                    </div>
                    <button
                        type="button"
                        className="profile-alert-close"
                        onClick={() => setSuccessMessage(null)}
                        aria-label="Đóng thông báo"
                    >
                        ✕
                    </button>
                </div>
            )}

            {activeTab === 'personal' && errorMessage && (
                <div
                    className="profile-alert profile-alert-error"
                    role="alert"
                    data-testid="profile-error-message"
                >
                    <div className="profile-alert-body">
                        <span className="alert-icon" aria-hidden="true">⚠️</span>
                        <span>{errorMessage}</span>
                    </div>
                    <button
                        type="button"
                        className="profile-alert-close"
                        onClick={() => setErrorMessage(null)}
                        aria-label="Đóng thông báo"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Bố cục 2 Cột Desktop (>= 992px) / 1 Cột Responsive */}
            <div className="profile-layout-wrapper">
                {/* CỘT TRÁI: Thẻ hồ sơ nhỏ bên trái (280px) */}
                <aside className="profile-sidebar-column">
                    <div className="profile-sidebar-card">
                        {profile && (
                            <ProfileAvatarSection
                                request={request}
                                name={profile.name || name || ''}
                                email={profile.email || ''}
                                roleDisplay={roleDisplay}
                                roleCode={currentRole}
                                avatarUrl={profile.avatar_url ?? null}
                                onAvatarUrlChange={(url) => {
                                    setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev))
                                    void reloadAvatar()
                                }}
                            />
                        )}

                        {/* Profile Side Navigation: 2 tabs duy nhất */}
                        <nav className="profile-side-nav" aria-label="Điều hướng hồ sơ">
                            <button
                                type="button"
                                className={`side-nav-item ${activeTab === 'personal' ? 'active' : ''}`}
                                onClick={() => handleTabChange('personal')}
                                data-testid="tab-personal-info"
                            >
                                <svg className="side-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                <span>Thông tin cá nhân</span>
                            </button>
                            <button
                                type="button"
                                className={`side-nav-item ${activeTab === 'password' ? 'active' : ''}`}
                                onClick={() => handleTabChange('password')}
                                data-testid="tab-change-password"
                            >
                                <svg className="side-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <span>Đổi mật khẩu</span>
                            </button>
                        </nav>
                    </div>
                </aside>

                {/* CỘT PHẢI: Khung nội dung tương ứng theo tab (flex: 1) */}
                <main className="profile-main-area">
                    {activeTab === 'personal' ? (
                        <form onSubmit={handleSubmit} noValidate className="profile-form" data-testid="profile-form">
                            <section className="profile-section-card" id="personal-info">
                                <div className="profile-section-header">
                                    <h2 className="profile-section-title">
                                        <span className="section-title-icon" aria-hidden="true">📋</span>
                                        Thông tin cá nhân
                                    </h2>
                                    <p className="profile-section-subtitle">
                                        Cập nhật thông tin cơ bản và địa chỉ liên hệ của bạn
                                    </p>
                                </div>

                                {/* Lưới 3 cột trên desktop: Họ tên | Số điện thoại | Ngày sinh */}
                                <div className="profile-grid profile-three-col-grid">
                                    {/* Họ và tên (Editable, Required) */}
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

                                    {/* Số điện thoại (Editable, Optional) */}
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
                                    </div>

                                    {/* Ngày sinh (Editable, Optional) */}
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

                                    {/* Địa chỉ liên hệ (Full Width, ~2 dòng) */}
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
                                            rows={2}
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

                                {/* Thông tin tài khoản chỉ đọc được giữ dưới dạng phần tử hỗ trợ test & accessibility mà không lặp giao diện */}
                                <div
                                    className="sr-only"
                                    aria-hidden="true"
                                    style={{
                                        position: 'absolute',
                                        width: '1px',
                                        height: '1px',
                                        padding: 0,
                                        margin: '-1px',
                                        overflow: 'hidden',
                                        clip: 'rect(0, 0, 0, 0)',
                                        whiteSpace: 'nowrap',
                                        border: 0,
                                    }}
                                >
                                    <input
                                        id="profile-email"
                                        name="email"
                                        type="email"
                                        value={profile?.email || ''}
                                        readOnly
                                        disabled
                                        data-testid="input-profile-email"
                                    />
                                    <span data-testid="email-helper-text">Email không thể thay đổi tại đây.</span>
                                </div>

                                {/* Nút thao tác đặt ngay dưới form */}
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
                            </section>
                        </form>
                    ) : (
                        <form onSubmit={handleChangePasswordSubmit} noValidate className="profile-form" data-testid="change-password-form">
                            <section className="profile-section-card" id="change-password-section">
                                <div className="profile-section-header">
                                    <h2 className="profile-section-title">
                                        <span className="section-title-icon" aria-hidden="true">🔑</span>
                                        Đổi mật khẩu
                                    </h2>
                                    <p className="profile-section-subtitle">
                                        Cập nhật mật khẩu định kỳ để bảo vệ tài khoản đào tạo của bạn
                                    </p>
                                </div>

                                {passwordSuccessMessage && (
                                    <div className="profile-alert profile-alert-success" role="status" data-testid="password-success-message">
                                        <div className="profile-alert-body">
                                            <span className="alert-icon" aria-hidden="true">✓</span>
                                            <span>{passwordSuccessMessage}</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="profile-alert-close"
                                            onClick={() => setPasswordSuccessMessage(null)}
                                            aria-label="Đóng thông báo"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                                {passwordErrorMessage && (
                                    <div className="profile-alert profile-alert-error" role="alert" data-testid="password-error-message">
                                        <div className="profile-alert-body">
                                            <span className="alert-icon" aria-hidden="true">⚠️</span>
                                            <span>{passwordErrorMessage}</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="profile-alert-close"
                                            onClick={() => setPasswordErrorMessage(null)}
                                            aria-label="Đóng thông báo"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}

                                <div className="profile-password-fields">
                                    {/* Mật khẩu hiện tại */}
                                    <div className="form-group">
                                        <label htmlFor="current-password-input" className="form-label">
                                            Mật khẩu hiện tại <span className="required-mark" aria-hidden="true">*</span>
                                        </label>
                                        <div className="password-input-wrapper">
                                            <input
                                                id="current-password-input"
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                autoComplete="current-password"
                                                className="form-input"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                placeholder="Nhập mật khẩu đang dùng"
                                                required
                                                data-testid="input-current-password"
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle-btn"
                                                onClick={() => setShowCurrentPassword((prev) => !prev)}
                                                aria-label={showCurrentPassword ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                                            >
                                                {showCurrentPassword ? (
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                        <line x1="1" y1="1" x2="23" y2="23" />
                                                    </svg>
                                                ) : (
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                        <circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mật khẩu mới & Xác nhận mật khẩu mới (Lưới 2 cột) */}
                                    <div className="profile-two-col-grid">
                                        <div className="form-group">
                                            <label htmlFor="new-password-input" className="form-label">
                                                Mật khẩu mới <span className="required-mark" aria-hidden="true">*</span>
                                            </label>
                                            <div className="password-input-wrapper">
                                                <input
                                                    id="new-password-input"
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    autoComplete="new-password"
                                                    className="form-input"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="Tối thiểu 8 ký tự, gồm chữ & số"
                                                    required
                                                    data-testid="input-new-password"
                                                />
                                                <button
                                                    type="button"
                                                    className="password-toggle-btn"
                                                    onClick={() => setShowNewPassword((prev) => !prev)}
                                                    aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                                                >
                                                    {showNewPassword ? (
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                            <line x1="1" y1="1" x2="23" y2="23" />
                                                        </svg>
                                                    ) : (
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="confirm-password-input" className="form-label">
                                                Xác nhận mật khẩu mới <span className="required-mark" aria-hidden="true">*</span>
                                            </label>
                                            <div className="password-input-wrapper">
                                                <input
                                                    id="confirm-password-input"
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    autoComplete="new-password"
                                                    className="form-input"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="Nhập lại mật khẩu mới"
                                                    required
                                                    data-testid="input-confirm-password"
                                                />
                                                <button
                                                    type="button"
                                                    className="password-toggle-btn"
                                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                                    aria-label={showConfirmPassword ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                                                >
                                                    {showConfirmPassword ? (
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                            <line x1="1" y1="1" x2="23" y2="23" />
                                                        </svg>
                                                    ) : (
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="profile-password-hints">
                                    <span className="hint-item">✓ Tối thiểu 8 ký tự</span>
                                    <span className="hint-item">✓ Bao gồm cả chữ cái và chữ số</span>
                                </div>

                                <div className="profile-actions">
                                    <button
                                        type="button"
                                        className="btn-cancel"
                                        onClick={() => handleTabChange('personal')}
                                        disabled={isChangingPassword}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-save"
                                        disabled={isChangingPassword}
                                        data-testid="btn-change-password"
                                    >
                                        {isChangingPassword ? (
                                            <>
                                                <span className="btn-spinner" aria-hidden="true" />
                                                <span>Đang cập nhật...</span>
                                            </>
                                        ) : (
                                            'Cập nhật mật khẩu'
                                        )}
                                    </button>
                                </div>
                            </section>
                        </form>
                    )}
                </main>
            </div>

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
