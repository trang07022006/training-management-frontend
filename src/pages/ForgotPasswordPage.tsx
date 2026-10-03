import { useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router'
import './ForgotPasswordPage.css'

export interface ForgotPasswordPageProps {
  onSubmit?: (email: string) => Promise<void> | void
  apiOrigin?: string
}

export function ForgotPasswordPage({ onSubmit, apiOrigin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(() => {
    try {
      const stored = sessionStorage.getItem('forgot_password_cooldown_until')
      if (stored) {
        const until = parseInt(stored, 10)
        const diff = Math.ceil((until - Date.now()) / 1000)
        if (diff > 0) return diff
      }
    } catch {
      // Bỏ qua lỗi storage
    }
    return 0
  })
  const [isSubmitted, setIsSubmitted] = useState<boolean>(() => {
    try {
      const stored = sessionStorage.getItem('forgot_password_cooldown_until')
      if (stored) {
        const until = parseInt(stored, 10)
        if (until > Date.now()) return true
      }
    } catch {
      // Bỏ qua lỗi storage
    }
    return false
  })
  const [cooldownError, setCooldownError] = useState<string | null>(null)

  const trimmedEmail = email.trim()
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)

  useEffect(() => {
    if (cooldownSeconds <= 0) return

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          try {
            sessionStorage.removeItem('forgot_password_cooldown_until')
          } catch {
            // Bỏ qua lỗi storage
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldownSeconds])

  const triggerCooldown = (seconds: number) => {
    setCooldownSeconds(seconds)
    try {
      sessionStorage.setItem(
        'forgot_password_cooldown_until',
        String(Date.now() + seconds * 1000)
      )
    } catch {
      // Bỏ qua lỗi storage
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!trimmedEmail || !isValidEmail || isLoading || cooldownSeconds > 0) return

    setIsLoading(true)
    setCooldownError(null)

    try {
      if (onSubmit) {
        try {
          await onSubmit(trimmedEmail)
          setIsSubmitted(true)
          triggerCooldown(60)
        } catch (err: unknown) {
          const errObj = err as { code?: string; status?: number; retry_after_seconds?: number }
          if (errObj?.code === 'FORGOT_PASSWORD_COOLDOWN' || errObj?.status === 429) {
            const sec = Number(errObj?.retry_after_seconds) || 60
            triggerCooldown(sec)
            setCooldownError('Bạn vừa yêu cầu đặt lại mật khẩu. Vui lòng chờ trước khi gửi lại.')
            setIsSubmitted(true)
          } else {
            setIsSubmitted(true)
            triggerCooldown(60)
          }
        }
      } else {
        try {
          const origin =
            apiOrigin ||
            import.meta.env.VITE_API_ORIGIN ||
            import.meta.env.VITE_API_BASE_URL ||
            (typeof window !== 'undefined' && window.location.port === '5173'
              ? `http://${window.location.hostname}:5000`
              : (typeof window !== 'undefined' ? window.location.origin : ''))
          const url = new URL('/api/auth/forgot-password', origin || 'http://localhost:5000').href
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: trimmedEmail }),
          })

          if (res.status === 429) {
            const data = await res.json().catch(() => null)
            const retryHeader = res.headers.get('Retry-After')
            const sec =
              Number(data?.retry_after_seconds) ||
              (retryHeader ? parseInt(retryHeader, 10) : 60) ||
              60
            triggerCooldown(sec)
            setCooldownError('Bạn vừa yêu cầu đặt lại mật khẩu. Vui lòng chờ trước khi gửi lại.')
            setIsSubmitted(true)
          } else {
            const data = await res.json().catch(() => null)
            const sec = Number(data?.retry_after_seconds) || 60
            triggerCooldown(sec)
            setCooldownError(null)
            setIsSubmitted(true)
          }
        } catch {
          // Bảo vệ nguyên tắc anti-enumeration khi gặp lỗi kết nối
          setIsSubmitted(true)
          triggerCooldown(60)
        }
      }
    } finally {
      setIsLoading(false)
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

        {cooldownError && (
          <div
            id="cooldownErrorBanner"
            className="cooldown-error-banner"
            role="alert"
            aria-live="polite"
          >
            <div className="reset-feedback-content">
              <svg
                className="feedback-warning-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="feedback-texts">
                <span className="feedback-heading">Yêu cầu quá nhanh</span>
                <span className="feedback-body">{cooldownError}</span>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Banner (SCRUM-50 Anti-Enumeration) */}
        {isSubmitted && !cooldownError && (
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

          {/* Cooldown Countdown (Section 7) */}
          {cooldownSeconds > 0 && (
            <div
              id="cooldownCountdown"
              className="cooldown-countdown"
              role="status"
              aria-live="polite"
            >
              <svg
                className="cooldown-clock-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>
                Có thể gửi lại sau{' '}
                {String(Math.floor(cooldownSeconds / 60)).padStart(2, '0')}:
                {String(cooldownSeconds % 60).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            id="submitButton"
            type="submit"
            disabled={isLoading || !trimmedEmail || !isValidEmail || cooldownSeconds > 0}
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
