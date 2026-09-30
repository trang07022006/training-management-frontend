import { useState } from 'react'

export interface LoginFormProps {
    onSubmit?: (email: string, password: string, remember: boolean) => void
    isLoading?: boolean
    errorMessage?: string | null
}

export function LoginForm({ onSubmit, isLoading = false, errorMessage }: LoginFormProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [remember, setRemember] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (onSubmit) {
            onSubmit(email, password, remember)
        }
    }

    return (
        <form className="login-form" onSubmit={handleSubmit} noValidate={false}>
            {errorMessage && (
                <div className="login-error-alert" role="alert">
                    <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span>{errorMessage}</span>
                </div>
            )}

            <div className="form-group">
                <label htmlFor="login-email" className="form-label">
                    Email
                </label>
                <div className="input-wrapper">
                    <span className="input-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                    </span>
                    <input
                        id="login-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="form-input"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                    />
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="login-password" className="form-label">
                    Mật khẩu
                </label>
                <div className="input-wrapper">
                    <span className="input-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path
                                fillRule="evenodd"
                                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </span>
                    <input
                        id="login-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        className="form-input form-input-password"
                        placeholder="Nhập mật khẩu"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        tabIndex={0}
                    >
                        {showPassword ? (
                            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                                <path
                                    fillRule="evenodd"
                                    d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                                    clipRule="evenodd"
                                />
                                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path
                                    fillRule="evenodd"
                                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            <div className="form-actions-row">
                <label className="checkbox-container">
                    <input
                        type="checkbox"
                        id="remember-me"
                        name="remember"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        disabled={isLoading}
                    />
                    <span className="checkbox-custom" aria-hidden="true" />
                    <span className="checkbox-label">Ghi nhớ đăng nhập</span>
                </label>

                <a href="#forgot-password" className="forgot-password-link">
                    Quên mật khẩu?
                </a>
            </div>

            <button
                type="submit"
                className="submit-btn"
                disabled={isLoading}
            >
                {isLoading ? (
                    <span className="loading-state">
                        <span className="spinner" aria-hidden="true" />
                        <span>Đang xử lý...</span>
                    </span>
                ) : (
                    <span>Đăng nhập</span>
                )}
            </button>
        </form>
    )
}
