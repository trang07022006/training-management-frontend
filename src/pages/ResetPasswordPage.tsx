import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { getApiOrigin } from '../utils/apiConfig'
import { getErrorMessage } from '../utils/errorMessages'
import './ResetPasswordPage.css'

export interface ResetPasswordPageProps {
  token?: string
  apiOrigin?: string
  onSubmit?: (newPassword: string, token: string) => Promise<void> | void
}

function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (!password) {
    return { isValid: false, message: 'Mật khẩu mới không được để trống' }
  }
  if (password.length < 8) {
    return { isValid: false, message: 'Mật khẩu phải có tối thiểu 8 ký tự' }
  }
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  if (!hasLetter || !hasNumber) {
    return { isValid: false, message: 'Mật khẩu phải bao gồm cả chữ cái và chữ số' }
  }
  return { isValid: true }
}

export function ResetPasswordPage({
  token: propToken,
  apiOrigin,
  onSubmit,
}: ResetPasswordPageProps) {
  const [searchParams] = useSearchParams()
  const activeToken = propToken ?? (searchParams.get('token') || '')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const isMissingToken = !activeToken || !activeToken.trim()

  // Realtime password checks
  const hasMinLength = newPassword.length >= 8
  const hasLetter = /[a-zA-Z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)
  const isMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword)
  const isFormValid = hasMinLength && hasLetter && hasNumber && isMatch && !isMissingToken

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (isMissingToken) {
      setErrorMessage('Thiếu mã xác thực (token). Vui lòng sử dụng liên kết được gửi trong email.')
      return
    }

    const validation = validatePassword(newPassword)
    if (!validation.isValid) {
      setErrorMessage(validation.message || 'Mật khẩu không hợp lệ')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Xác nhận mật khẩu không trùng khớp')
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      if (onSubmit) {
        await onSubmit(newPassword, activeToken)
        setIsSuccess(true)
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const baseOrigin = apiOrigin || getApiOrigin()
        const response = await fetch(`${baseOrigin}/api/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: activeToken,
            new_password: newPassword,
          }),
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          const code = data?.code
          const message = getErrorMessage(
            { code, message: data?.message },
            'Không thể đặt lại mật khẩu. Vui lòng thử lại sau.',
          )
          setErrorMessage(message)
          return
        }

        setIsSuccess(true)
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, 'Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng kiểm tra lại kết nối mạng.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="reset-password-container">
      {/* Background Decorator Orbs */}
      <div className="reset-password-glow-1" aria-hidden="true" />
      <div className="reset-password-glow-2" aria-hidden="true" />
      <div className="reset-password-glow-3" aria-hidden="true" />

      <main className="reset-password-card">
        {/* Header */}
        <header className="reset-password-header">
          <div className="reset-password-icon-badge" aria-hidden="true">
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
          <h1 className="reset-password-title">Đặt lại mật khẩu</h1>
          <p className="reset-password-subtitle">
            Nhập mật khẩu mới của bạn để hoàn tất đặt lại tài khoản Hệ thống Quản lý Đào tạo ICTU.
          </p>
        </header>

        {/* Missing Token Alert */}
        {isMissingToken && !isSuccess && (
          <div className="reset-banner reset-banner-warning" role="alert">
            <svg
              className="banner-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <div className="banner-content">
              <span className="banner-title">Liên kết không đầy đủ</span>
              <span className="banner-text">
                Không tìm thấy mã xác thực (token) trong liên kết. Vui lòng mở đúng liên kết trong email hoặc gửi lại yêu cầu.
              </span>
              <Link to="/forgot-password" className="banner-action-link">
                Gửi lại yêu cầu đặt lại mật khẩu →
              </Link>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="reset-banner reset-banner-error" role="alert">
            <svg
              className="banner-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <div className="banner-content">
              <span className="banner-title">Không thể đặt lại mật khẩu</span>
              <span className="banner-text">{errorMessage}</span>
              {(errorMessage.includes('hết hạn') || errorMessage.includes('đã được sử dụng')) && (
                <Link to="/forgot-password" className="banner-action-link">
                  Yêu cầu liên kết mới tại đây →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Success Alert */}
        {isSuccess ? (
          <div className="reset-banner reset-banner-success" role="status">
            <svg
              className="banner-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <div className="banner-content">
              <span className="banner-title">Thành công!</span>
              <span className="banner-text">Mật khẩu đã được đặt lại thành công.</span>
              <p style={{ margin: '8px 0 0', fontSize: '0.875rem' }}>
                Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.
              </p>
              <Link
                to="/login"
                className="submit-btn"
                style={{
                  marginTop: '1.25rem',
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                Đăng nhập ngay
              </Link>
            </div>
          </div>
        ) : (
          /* Form */
          <form
            id="resetPasswordForm"
            className="reset-password-form"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* New Password Field */}
            <div className="form-field">
              <div className="field-label-row">
                <label htmlFor="newPassword" className="field-label">
                  MẬT KHẨU MỚI
                </label>
                <span className="field-sublabel">Tối thiểu 8 ký tự</span>
              </div>

              <div className="input-wrapper">
                <div className="input-icon-left" aria-hidden="true">
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

                <input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  disabled={isMissingToken || isLoading}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    if (errorMessage) setErrorMessage(null)
                  }}
                  placeholder="Nhập mật khẩu mới..."
                  className="form-input"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="toggle-visibility-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="form-field">
              <div className="field-label-row">
                <label htmlFor="confirmPassword" className="field-label">
                  XÁC NHẬN MẬT KHẨU
                </label>
                <span className="field-sublabel">Khớp với mật khẩu mới</span>
              </div>

              <div className="input-wrapper">
                <div className="input-icon-left" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  disabled={isMissingToken || isLoading}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (errorMessage) setErrorMessage(null)
                  }}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="form-input"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="toggle-visibility-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Password Validation Checklist */}
            <div className="password-rules">
              <div className="rules-heading">Yêu cầu bảo mật:</div>
              <ul className="rules-list">
                <li className={`rule-item ${hasMinLength ? 'valid' : ''}`}>
                  <span className="rule-icon" aria-hidden="true">
                    {hasMinLength ? '✓' : '•'}
                  </span>
                  Tối thiểu 8 ký tự
                </li>
                <li className={`rule-item ${hasLetter && hasNumber ? 'valid' : ''}`}>
                  <span className="rule-icon" aria-hidden="true">
                    {hasLetter && hasNumber ? '✓' : '•'}
                  </span>
                  Bao gồm cả chữ cái và chữ số
                </li>
                <li className={`rule-item ${isMatch ? 'valid' : ''}`}>
                  <span className="rule-icon" aria-hidden="true">
                    {isMatch ? '✓' : '•'}
                  </span>
                  Mật khẩu xác nhận trùng khớp
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              id="submitResetBtn"
              type="submit"
              disabled={isLoading || !isFormValid}
              className="submit-btn"
            >
              {isLoading ? (
                <>
                  <span className="btn-spinner" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                  </span>
                  <span>Đang cập nhật mật khẩu...</span>
                </>
              ) : (
                <span>Đặt lại mật khẩu</span>
              )}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <footer className="reset-password-footer">
          <Link to="/login" className="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Quay lại đăng nhập
          </Link>
          <div className="secondary-links">
            Chưa nhận được mã?{' '}
            <Link to="/forgot-password">Yêu cầu liên kết mới</Link>
          </div>
        </footer>
      </main>
    </div>
  )
}
