import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import './ForgotPasswordPage.css'

export interface ForgotPasswordPageProps {
  onSubmit?: (email: string) => Promise<void> | void
}

export function ForgotPasswordPage({ onSubmit }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const trimmedEmail = email.trim()
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!trimmedEmail || !isValidEmail || isLoading) return

    setIsLoading(true)

    try {
      if (onSubmit) {
        await onSubmit(trimmedEmail)
      } else {
        // Mô phỏng độ trễ giao diện tự nhiên khi chưa tích hợp API SCRUM-45
        await new Promise((resolve) => setTimeout(resolve, 600))
      }
    } catch {
      // Giữ thông báo đồng nhất để bảo mật chống dò quét tài khoản (SCRUM-50)
    } finally {
      setIsLoading(false)
      setIsSubmitted(true)
    }
  }

  return (
    <div className="forgot-password-container">
      {/* Background Decorator Orbs */}
      <div className="forgot-password-glow-1" aria-hidden="true" />
      <div className="forgot-password-glow-2" aria-hidden="true" />
      <div className="forgot-password-glow-3" aria-hidden="true" />

      <main className="forgot-password-card">
        {/* Header */}
        <header className="forgot-password-header">
          <div className="forgot-password-icon-badge" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              <path d="M21.5 2v4h-4" />
              <path d="M21.5 6A10 10 0 0 0 4.2 8" />
            </svg>
          </div>
          <h1 className="forgot-password-title">Quên mật khẩu?</h1>
          <p className="forgot-password-subtitle">
            Đừng lo lắng, hãy nhập địa chỉ email đã đăng ký của bạn. Chúng tôi sẽ gửi liên kết hướng dẫn đặt lại mật khẩu.
          </p>
        </header>

        {/* Feedback Banner (SCRUM-50 Anti-Enumeration) */}
        {isSubmitted && (
          <div
            id="resetFeedbackBanner"
            className="reset-feedback-banner"
            role="status"
            aria-live="polite"
          >
            <div className="reset-feedback-content">
              <svg
                className="feedback-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <div className="feedback-texts">
                <span className="feedback-heading">Đã tiếp nhận yêu cầu</span>
                <span className="feedback-body">
                  Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi tới email của bạn.
                </span>
              </div>
            </div>

            <div className="anti-enum-note">
              🛡️ <strong>Lưu ý bảo mật:</strong> Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi tới email của bạn.
            </div>
          </div>
        )}

        {/* Form */}
        <form
          id="forgotPasswordForm"
          className="forgot-password-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="form-field">
            <div className="field-label-row">
              <label htmlFor="recoveryEmail" className="field-label">
                ĐỊA CHỈ EMAIL
              </label>
              <span className="field-sublabel">Cá nhân hoặc công việc</span>
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
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>

              <input
                id="recoveryEmail"
                name="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@ictu.edu.vn"
                className="form-input"
                aria-describedby="fieldHelperText"
              />

              {/* Dynamic Validation Status Icon */}
              <div id="validationIcon" className="input-icon-right" aria-hidden="true">
                {!trimmedEmail ? (
                  <svg
                    className="icon-neutral"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ) : isValidEmail ? (
                  <svg
                    className="icon-valid"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                ) : (
                  <svg
                    className="icon-invalid"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                )}
              </div>
            </div>

            {/* Helper Text */}
            <div className="field-helper">
              <span
                id="fieldHelperText"
                className={
                  !trimmedEmail
                    ? 'field-helper-neutral'
                    : isValidEmail
                    ? 'field-helper-valid'
                    : 'field-helper-invalid'
                }
              >
                {!trimmedEmail
                  ? 'Phải trùng khớp với tài khoản chính đã xác thực của bạn'
                  : isValidEmail
                  ? 'Định dạng hợp lệ. Sẵn sàng gửi yêu cầu.'
                  : 'Vui lòng nhập địa chỉ email đầy đủ và hợp lệ'}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="submitButton"
            type="submit"
            disabled={isLoading || !trimmedEmail || !isValidEmail}
            className="submit-btn"
          >
            <span id="buttonText">
              {isLoading
                ? 'Đang gửi mã bảo mật...'
                : isSubmitted
                ? 'Gửi lại liên kết đặt lại'
                : 'Gửi liên kết đặt lại'}
            </span>

            {isLoading ? (
              <span id="buttonSpinner" className="btn-icon btn-spinner" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              </span>
            ) : (
              <span id="buttonArrow" className="btn-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            )}
          </button>
        </form>


        {/* Footer */}
        <footer className="forgot-password-footer">
          <Link to="/login" className="back-to-login-link">
            <svg
              className="back-arrow-icon"
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
            <span>Quay lại Đăng nhập</span>
          </Link>
        </footer>
      </main>
    </div>
  )
}
