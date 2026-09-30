import { useState, type FormEvent } from 'react'
import { useSession } from '../auth/SessionProvider'
import { updateUserApi, type User, type UpdateUserData } from '../api/userApi'
import './UserModal.css'

export interface EditUserModalProps {
    isOpen: boolean
    user: User | null
    onClose: () => void
    onSuccess: (updatedUser: User) => void
    customRequest?: (path: string, init?: RequestInit) => Promise<Response>
}

interface FormErrors {
    name?: string
    email?: string
    phone?: string
    general?: string
}

const ROLE_LABELS: Record<string, string> = {
    admin: 'Quản trị viên',
    trainer: 'Giảng viên',
    trainee: 'Học viên',
    user: 'Người dùng',
}

interface EditUserFormContentProps {
    user: User
    onClose: () => void
    onSuccess: (updatedUser: User) => void
    requestFn: (path: string, init?: RequestInit) => Promise<Response>
}

function EditUserFormContent({
    user,
    onClose,
    onSuccess,
    requestFn,
}: EditUserFormContentProps) {
    const [name, setName] = useState(user.name)
    const [email, setEmail] = useState(user.email)
    const [phone, setPhone] = useState(user.phone ?? '')
    const [status, setStatus] = useState(user.status ?? 'active')

    const [errors, setErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    const roleKey = (user.role || 'user').toLowerCase()
    const roleLabel = ROLE_LABELS[roleKey] || user.role || 'Người dùng'

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

        const payload: UpdateUserData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() ? phone.trim() : null,
            status,
        }

        try {
            const updated = await updateUserApi(requestFn, user.id, payload)
            setIsSubmitting(false)
            onSuccess(updated)
            onClose()
        } catch (err: unknown) {
            setIsSubmitting(false)
            const errorMsg = err instanceof Error ? err.message : 'Cập nhật người dùng thất bại.'

            if (errorMsg.includes('DUPLICATE_EMAIL') || errorMsg.includes('đã được sử dụng')) {
                setErrors({ email: 'Email này đã được sử dụng trong hệ thống.' })
            } else if (errorMsg.includes('USER_NOT_FOUND') || errorMsg.includes('không tồn tại')) {
                setErrors({ general: 'Người dùng không tồn tại hoặc đã bị xóa.' })
            } else if (errorMsg.includes('FORBIDDEN') || errorMsg.includes('không có quyền')) {
                setErrors({ general: 'Bạn không có quyền cập nhật người dùng.' })
            } else {
                setErrors({ general: errorMsg })
            }
        }
    }

    return (
        <div
            className="modal-container"
            data-testid="edit-user-modal"
            role="dialog"
            aria-labelledby="edit-user-title"
            aria-modal="true"
        >
            {/* Header */}
            <div className="modal-header">
                <h2 id="edit-user-title" className="modal-title">
                    Chỉnh sửa người dùng #{user.id}
                </h2>
                <button
                    type="button"
                    className="modal-close-btn"
                    data-testid="btn-close-edit-modal"
                    aria-label="Đóng cửa sổ"
                    onClick={onClose}
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
                        <div className="modal-banner-error" data-testid="edit-modal-error-banner" role="alert">
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
                        <label className="form-label" htmlFor="edit-user-name">
                            Họ và tên <span className="label-required">*</span>
                        </label>
                        <input
                            id="edit-user-name"
                            type="text"
                            className={`form-input ${errors.name ? 'input-error' : ''}`}
                            data-testid="input-edit-name"
                            placeholder="Nhập họ và tên"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                            }}
                            disabled={isSubmitting}
                            autoFocus
                        />
                        {errors.name && <p className="field-error-text" data-testid="error-edit-name">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="edit-user-email">
                            Email <span className="label-required">*</span>
                        </label>
                        <input
                            id="edit-user-email"
                            type="email"
                            className={`form-input ${errors.email ? 'input-error' : ''}`}
                            data-testid="input-edit-email"
                            placeholder="example@tms.local"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                            }}
                            disabled={isSubmitting}
                        />
                        {errors.email && <p className="field-error-text" data-testid="error-edit-email">{errors.email}</p>}
                    </div>

                    {/* Số điện thoại */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="edit-user-phone">
                            Số điện thoại
                        </label>
                        <input
                            id="edit-user-phone"
                            type="tel"
                            className={`form-input ${errors.phone ? 'input-error' : ''}`}
                            data-testid="input-edit-phone"
                            placeholder="0901234567 (tùy chọn)"
                            value={phone}
                            onChange={(e) => {
                                setPhone(e.target.value)
                                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }))
                            }}
                            disabled={isSubmitting}
                        />
                        {errors.phone && <p className="field-error-text" data-testid="error-edit-phone">{errors.phone}</p>}
                    </div>

                    {/* Vai trò (Chỉ đọc) và Trạng thái */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-user-role">
                                Vai trò (Chỉ đọc)
                            </label>
                            <input
                                id="edit-user-role"
                                type="text"
                                className="form-input"
                                data-testid="input-edit-role-readonly"
                                value={roleLabel}
                                disabled
                                readOnly
                            />
                            <p className="field-note-text">Phân quyền vai trò được quản lý tại mục Phân quyền.</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-user-status">
                                Trạng thái
                            </label>
                            <select
                                id="edit-user-status"
                                className="form-select"
                                data-testid="select-edit-status"
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
                        className="btn-secondary"
                        data-testid="btn-cancel-edit"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Hủy bỏ
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        data-testid="btn-submit-edit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting && <span className="btn-spinner" aria-hidden="true" />}
                        <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                    </button>
                </div>
            </form>
        </div>
    )
}

export function EditUserModal({
    isOpen,
    user,
    onClose,
    onSuccess,
    customRequest,
}: EditUserModalProps) {
    const { request: sessionRequest } = useSession()
    const requestFn = customRequest ?? sessionRequest

    if (!isOpen || !user) return null

    return (
        <div
            className="modal-backdrop"
            data-testid="edit-user-modal-backdrop"
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <EditUserFormContent
                key={String(user.id)}
                user={user}
                onClose={onClose}
                onSuccess={onSuccess}
                requestFn={requestFn}
            />
        </div>
    )
}
