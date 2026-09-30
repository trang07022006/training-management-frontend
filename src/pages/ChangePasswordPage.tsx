import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import './ChangePasswordPage.css'

export interface ChangePasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ChangePasswordPageProps {
  onSubmit?: (data: ChangePasswordFormData) => Promise<void> | void
  isLoading?: boolean
  errorMessage?: string | null
  successMessage?: string | null
}

function validateNewPasswordForm(
  newPassword: string,
  confirmPassword?: string
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

export function ChangePasswordPage({
  onSubmit,
  isLoading: propIsLoading = false,
  errorMessage: propErrorMessage = null,
  successMessage: propSuccessMessage = null,
}: ChangePasswordPageProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [internalLoading, setInternalLoading] = useState(false)
  const [internalError, setInternalError] = useState<string | null>(null)
  const [internalSuccess, setInternalSuccess] = useState<string | null>(null)

  const isLoading = propIsLoading || internalLoading
  const errorMessage = propErrorMessage || internalError
  const successMessage = propSuccessMessage || internalSuccess

  const isFormValid =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isFormValid || isLoading) return

    setInternalError(null)
    setInternalSuccess(null)

    // Kiểm tra điều kiện mật khẩu mới (SCRUM-55)
    const validation = validateNewPasswordForm(newPassword, confirmPassword)
    if (!validation.isValid) {
      setInternalError(validation.message || 'Mật khẩu mới không hợp lệ')
      return
    }

    if (onSubmit) {
      setInternalLoading(true)
      try {
        await onSubmit({
          currentPassword,
          newPassword,
          confirmPassword,
        })
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Đã có lỗi xảy ra khi đổi mật khẩu'
        setInternalError(message)
      } finally {
        setInternalLoading(false)
      }
    }
  }

  return (
    <div className="change-password-container">
      <div className="change-password-glow-1" aria-hidden="true" />
      <div className="change-password-glow-2" aria-hidden="true" />

      <main className="change-password-card">
        <header className="change-password-header">
          <div className="change-password-icon-badge" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="change-password-title">Đổi mật khẩu</h1>
          <p className="change-password-subtitle">
            Cập nhật mật khẩu định kỳ để bảo vệ tài khoản đào tạo của bạn.
          </p>
        </header>

        {/* Error Alert */}
        {errorMessage && (
          <div
            id="changePasswordError"
            className="change-password-alert alert-danger"
            role="alert"
          >
            <svg
              className="alert-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div
            id="changePasswordSuccess"
            className="change-password-alert alert-success"
            role="status"
          >
            <svg
              className="alert-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        <form
          id="changePasswordForm"
          className="change-password-form"
          onSubmit={handleSubmit}
          noValidate
        >
          {/* Mật khẩu hiện tại */}
          <div className="form-group">
            <label htmlFor="currentPasswordInput" className="form-label">
              Mật khẩu hiện tại
            </label>
            <div className="input-wrapper">
              <input
                id="currentPasswordInput"
                name="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu đang dùng"
                className="form-input"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="toggle-password-btn"
                aria-label={
                  showCurrentPassword
                    ? 'Ẩn mật khẩu hiện tại'
                    : 'Hiện mật khẩu hiện tại'
                }
              >
                {showCurrentPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mật khẩu mới */}
          <div className="form-group">
            <label htmlFor="newPasswordInput" className="form-label">
              Mật khẩu mới
            </label>
            <div className="input-wrapper">
              <input
                id="newPasswordInput"
                name="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                className="form-input"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="toggle-password-btn"
                aria-label={
                  showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'
                }
              >
                {showNewPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Xác nhận mật khẩu mới */}
          <div className="form-group">
            <label htmlFor="confirmPasswordInput" className="form-label">
              Xác nhận mật khẩu mới
            </label>
            <div className="input-wrapper">
              <input
                id="confirmPasswordInput"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="form-input"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="toggle-password-btn"
                aria-label={
                  showConfirmPassword
                    ? 'Ẩn xác nhận mật khẩu'
                    : 'Hiện xác nhận mật khẩu'
                }
              >
                {showConfirmPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="changePasswordSubmitBtn"
            type="submit"
            disabled={isLoading || !isFormValid}
            className="submit-btn"
          >
            {isLoading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
          </button>
        </form>

        <footer className="change-password-footer">
          <Link to="/" className="back-link">
            <svg
              className="back-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Quay lại trang chủ</span>
          </Link>
        </footer>
      </main>
    </div>
  )
}
