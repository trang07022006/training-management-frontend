import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useSession } from '../auth/SessionProvider'
import { createUserApi, fetchAvailableRolesApi, type User, type CreateUserData } from '../api/userApi'
import { getErrorMessage } from '../utils/errorMessages'
import { getRoleDisplayName } from '../auth/roleRouting'
import './UserModal.css'

export interface CreateUserModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (createdUser: User) => void
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>
    customRolesRequest?: (path: string, init?: RequestInit) => Promise<Response>
}

interface FormErrors {
    name?: string
    email?: string
    password?: string
    phone?: string
    general?: string
}

const ROLE_DISPLAY_ORDER: Record<string, number> = {
    user: 1,
    trainee: 2,
    trainer: 3,
    consultant: 4,
    training_manager: 5,
    admin: 6,
}

const DEFAULT_AVAILABLE_ROLES = [
    { code: 'user', name: 'Người dùng' },
    { code: 'trainee', name: 'Học viên' },
    { code: 'trainer', name: 'Giảng viên' },
    { code: 'consultant', name: 'Tư vấn tuyển sinh' },
    { code: 'training_manager', name: 'Quản lý đào tạo' },
    { code: 'admin', name: 'Quản trị viên' },
]

export function CreateUserModal({
    isOpen,
    onClose,
    onSuccess,
    customRequest,
    customRolesRequest,
}: CreateUserModalProps) {
    const { request: sessionRequest } = useSession()
    const requestFn = customRequest ?? sessionRequest
    const rolesRequestFn = customRolesRequest ?? sessionRequest

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [phone, setPhone] = useState('')
    const [role, setRole] = useState('user')
    const [status, setStatus] = useState('active')
    const [availableRoles, setAvailableRoles] = useState<{ code: string; name: string }[]>(DEFAULT_AVAILABLE_ROLES)

    const [errors, setErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    /**
     * Reset toàn bộ form state, validation errors và mật khẩu về giá trị ban đầu.
     */
    const resetForm = useCallback(() => {
        setName('')
        setEmail('')
        setPassword('')
        setShowPassword(false)
        setPhone('')
        setRole('user')
        setStatus('active')
        setErrors({})
        setIsSubmitting(false)
    }, [])

    /**
     * Theo dõi thay đổi isOpen: Khi modal mở hoặc đóng lại,
     * tự động reset state ngay trong render phase (chuẩn React pattern).
     */
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen)
        setName('')
        setEmail('')
        setPassword('')
        setShowPassword(false)
        setPhone('')
        setRole('user')
        setStatus('active')
        setErrors({})
        setIsSubmitting(false)
    }

    const handleClose = useCallback(() => {
        resetForm()
        onClose()
    }, [resetForm, onClose])

    /**
     * Tải danh mục vai trò từ Backend API (SCRUM-97 / Business Roles).
     */
    useEffect(() => {
        if (!isOpen) return
        let isMounted = true

        fetchAvailableRolesApi(rolesRequestFn)
            .then((roles) => {
                if (isMounted && roles && roles.length > 0) {
                    const sorted = [...roles].sort((a, b) => {
                        const orderA = ROLE_DISPLAY_ORDER[a.code.toLowerCase()] ?? 99
                        const orderB = ROLE_DISPLAY_ORDER[b.code.toLowerCase()] ?? 99
                        return orderA - orderB
                    })
                    setAvailableRoles(sorted)
                }
            })
            .catch(() => {
                // Giữ danh sách mặc định nếu gặp lỗi kết nối API
            })

        return () => {
            isMounted = false
        }
    }, [isOpen, rolesRequestFn])

    /**
     * Hỗ trợ phím Escape đóng modal an toàn và reset form.
     */
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSubmitting) {
                handleClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, isSubmitting, handleClose])

    if (!isOpen) return null

    const validate = (): boolean => {
        const nextErrors: FormErrors = {}

        if (!name.trim()) {
            nextErrors.name = 'Họ và tên không được để trống.'
        } else if (name.trim().length < 2) {
            nextErrors.name = 'Họ và tên phải có ít nhất 2 ký tự.'
        }

        const emailTrim = email.trim()
        if (!emailTrim) {
            nextErrors.email = 'Email không được để trống.'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
            nextErrors.email = 'Email không đúng định dạng.'
        }

        if (!password) {
            nextErrors.password = 'Mật khẩu không được để trống.'
        } else if (password.length < 8) {
            nextErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự.'
        }

        if (phone.trim() && !/^[0-9+()-\s]{8,20}$/.test(phone.trim())) {
            nextErrors.phone = 'Số điện thoại không đúng định dạng.'
        }

        setErrors(nextErrors)
        return Object.keys(nextErrors).length === 0
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (isSubmitting) return

        if (!validate()) return

        setIsSubmitting(true)
        setErrors({})

        const payload: CreateUserData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            phone: phone.trim() ? phone.trim() : null,
            role,
            status,
        }

        try {
            const created = await createUserApi(requestFn, payload)
            resetForm()
            onSuccess(created)
            onClose()
        } catch (err: unknown) {
            setIsSubmitting(false)
            const errorMsg = getErrorMessage(err, 'Tạo người dùng thất bại.')

            // Phân loại lỗi đặc thù
            if (errorMsg.includes('DUPLICATE_EMAIL') || errorMsg.includes('đã được sử dụng')) {
                setErrors({ email: getErrorMessage('DUPLICATE_EMAIL') })
            } else {
                setErrors({ general: errorMsg })
            }
        }
    }

    return (
        <div
            className="modal-backdrop"
            data-testid="create-user-modal-backdrop"
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) handleClose()
            }}
        >
            <div
                className="modal-container"
                data-testid="create-user-modal"
                role="dialog"
                aria-labelledby="create-user-title"
                aria-modal="true"
            >
                {/* Header */}
                <div className="modal-header">
                    <h2 id="create-user-title" className="modal-title">Thêm người dùng mới</h2>
                    <button
                        type="button"
                        className="modal-close-btn"
                        data-testid="btn-close-create-modal"
                        aria-label="Đóng cửa sổ"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} noValidate>
                    <div className="modal-body">
                        {errors.general && (
                            <div className="modal-banner-error" data-testid="create-modal-error-banner" role="alert">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>{errors.general}</span>
                            </div>
                        )}

                        {/* Họ và tên */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="create-user-name">
                                Họ và tên <span className="label-required">*</span>
                            </label>
                            <input
                                id="create-user-name"
                                type="text"
                                className={`form-input ${errors.name ? 'input-error' : ''}`}
                                data-testid="input-create-name"
                                placeholder="Nhập họ và tên"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value)
                                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                                }}
                                disabled={isSubmitting}
                                autoFocus
                            />
                            {errors.name && <p className="field-error-text" data-testid="error-create-name">{errors.name}</p>}
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="create-user-email">
                                Email <span className="label-required">*</span>
                            </label>
                            <input
                                id="create-user-email"
                                type="email"
                                className={`form-input ${errors.email ? 'input-error' : ''}`}
                                data-testid="input-create-email"
                                placeholder="example@tms.local"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                                }}
                                disabled={isSubmitting}
                            />
                            {errors.email && <p className="field-error-text" data-testid="error-create-email">{errors.email}</p>}
                        </div>

                        {/* Mật khẩu */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="create-user-password">
                                Mật khẩu ban đầu <span className="label-required">*</span>
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    id="create-user-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className={`form-input ${errors.password ? 'input-error' : ''}`}
                                    data-testid="input-create-password"
                                    placeholder="Tối thiểu 8 ký tự"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value)
                                        if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                                    }}
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    data-testid="btn-toggle-create-password"
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isSubmitting}
                                >
                                    {showPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {errors.password && <p className="field-error-text" data-testid="error-create-password">{errors.password}</p>}
                        </div>

                        {/* Số điện thoại */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="create-user-phone">
                                Số điện thoại
                            </label>
                            <input
                                id="create-user-phone"
                                type="tel"
                                className={`form-input ${errors.phone ? 'input-error' : ''}`}
                                data-testid="input-create-phone"
                                placeholder="0901234567 (tùy chọn)"
                                value={phone}
                                onChange={(e) => {
                                    setPhone(e.target.value)
                                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }))
                                }}
                                disabled={isSubmitting}
                            />
                            {errors.phone && <p className="field-error-text" data-testid="error-create-phone">{errors.phone}</p>}
                        </div>

                        {/* Vai trò và Trạng thái */}
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="create-user-role">
                                    Vai trò
                                </label>
                                <select
                                    id="create-user-role"
                                    className="form-select"
                                    data-testid="select-create-role"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    disabled={isSubmitting}
                                >
                                    {availableRoles.map((r) => (
                                        <option key={r.code} value={r.code}>
                                            {getRoleDisplayName(r)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="create-user-status">
                                    Trạng thái
                                </label>
                                <select
                                    id="create-user-status"
                                    className="form-select"
                                    data-testid="select-create-status"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    disabled={isSubmitting}
                                >
                                    <option value="active">Hoạt động</option>
                                    <option value="locked">Bị khóa</option>
                                    <option value="inactive">Không hoạt động</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn-cancel"
                            data-testid="btn-cancel-create"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            data-testid="btn-submit-create"
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <span className="btn-spinner" aria-hidden="true" />}
                            <span>{isSubmitting ? 'Đang lưu...' : 'Thêm người dùng'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
