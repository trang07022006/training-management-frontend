import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { createUserApi, fetchAvailableRolesApi, type CreateUserData, ApiError } from '../api/userApi'
import { PageHeader } from '../components/PageHeader'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { toast } from '../components/ToastPortal'
import '../components/UserModal.css'

interface FormErrors {
    name?: string
    email?: string
    password?: string
    phone?: string
    general?: string
}

const DEFAULT_AVAILABLE_ROLES = [
    { code: 'user', name: 'Người dùng' },
    { code: 'trainee', name: 'Học viên' },
    { code: 'trainer', name: 'Giảng viên' },
    { code: 'consultant', name: 'Tư vấn tuyển sinh' },
    { code: 'training_manager', name: 'Quản lý đào tạo' },
    { code: 'admin', name: 'Quản trị viên' },
]

export function UserCreatePage() {
    const navigate = useNavigate()
    const { request: requestFn, permissions, role, roles } = useSession()

    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const canManage =
        permissions?.includes(SYSTEM_PERMISSIONS.USER_MANAGE) ||
        effectiveRoles.includes('admin')

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [phone, setPhone] = useState('')
    const [selectedRole, setSelectedRole] = useState('user')
    const [status, setStatus] = useState('active')
    const [availableRoles, setAvailableRoles] = useState(DEFAULT_AVAILABLE_ROLES)

    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        let isMounted = true
        fetchAvailableRolesApi(requestFn)
            .then((res) => {
                if (isMounted && res && res.length > 0) {
                    setAvailableRoles(res)
                }
            })
            .catch(() => {})

        return () => {
            isMounted = false
        }
    }, [requestFn])

    const validate = (): boolean => {
        const errors: FormErrors = {}
        const trimmedName = name.trim()
        const trimmedEmail = email.trim()

        if (!trimmedName) {
            errors.name = 'Họ và tên không được để trống.'
        } else if (trimmedName.length < 2 || trimmedName.length > 100) {
            errors.name = 'Họ và tên phải từ 2 đến 100 ký tự.'
        }

        if (!trimmedEmail) {
            errors.email = 'Email không được để trống.'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            errors.email = 'Địa chỉ email không đúng định dạng.'
        }

        if (!password) {
            errors.password = 'Mật khẩu không được để trống.'
        } else if (password.length < 8) {
            errors.password = 'Mật khẩu phải có ít nhất 8 ký tự.'
        } else if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
            errors.password = 'Mật khẩu phải chứa ít nhất 1 chữ cái và 1 chữ số.'
        }

        if (phone.trim() && !/^[0-9+() -]{8,20}$/.test(phone.trim())) {
            errors.phone = 'Số điện thoại không hợp lệ.'
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!validate()) return

        setIsSubmitting(true)

        const payload: CreateUserData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            phone: phone.trim() || null,
            role: selectedRole,
            status,
        }

        try {
            const created = await createUserApi(requestFn, payload)
            const msg = getSuccessMessage('CREATE_USER_SUCCESS', 'Tạo tài khoản người dùng thành công!')
            toast.success(msg)
            setTimeout(() => {
                navigate(`/users/${created.id}`)
            }, 800)
        } catch (err: unknown) {
            const errText = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi tạo người dùng.')
            toast.error(errText)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!canManage) {
        return (
            <div className="users-page-container" style={{ padding: '24px 32px' }}>
                <PageHeader
                    title="Không có quyền truy cập"
                    breadcrumbs={[
                        { label: 'Người dùng', path: '/users' },
                        { label: 'Thêm mới' },
                    ]}
                />
                <div className="modal-banner banner-error" role="alert">
                    <span>Bạn không có quyền quản lý người dùng.</span>
                </div>
            </div>
        )
    }

    return (
        <div className="users-page-container" data-testid="user-create-page" style={{ padding: '0 0 24px 0' }}>
            <PageHeader
                title="Tạo người dùng mới"
                subtitle="Khai báo thông tin tài khoản và phân quyền vai trò ban đầu cho người dùng"
                breadcrumbs={[
                    { label: 'Người dùng', path: '/users' },
                    { label: 'Thêm mới' },
                ]}
            />

            <div style={{ maxWidth: '780px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label" htmlFor="user-create-name">
                            Họ và tên <span className="required-star">*</span>
                        </label>
                        <input
                            id="user-create-name"
                            type="text"
                            className={`form-input ${formErrors.name ? 'is-invalid' : ''}`}
                            placeholder="Nhập họ và tên đầy đủ..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isSubmitting}
                        />
                        {formErrors.name && <div className="form-field-error">{formErrors.name}</div>}
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="user-create-email">
                                Email đăng nhập <span className="required-star">*</span>
                            </label>
                            <input
                                id="user-create-email"
                                type="email"
                                className={`form-input ${formErrors.email ? 'is-invalid' : ''}`}
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isSubmitting}
                            />
                            {formErrors.email && <div className="form-field-error">{formErrors.email}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="user-create-phone">
                                Số điện thoại
                            </label>
                            <input
                                id="user-create-phone"
                                type="tel"
                                className={`form-input ${formErrors.phone ? 'is-invalid' : ''}`}
                                placeholder="0912345678"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={isSubmitting}
                            />
                            {formErrors.phone && <div className="form-field-error">{formErrors.phone}</div>}
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label" htmlFor="user-create-password">
                            Mật khẩu khởi tạo <span className="required-star">*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="user-create-password"
                                type={showPassword ? 'text' : 'password'}
                                className={`form-input ${formErrors.password ? 'is-invalid' : ''}`}
                                placeholder="Tối thiểu 8 ký tự, bao gồm cả chữ và số"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isSubmitting}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#64748b' }}
                            >
                                {showPassword ? 'Ẩn' : 'Hiện'}
                            </button>
                        </div>
                        {formErrors.password && <div className="form-field-error">{formErrors.password}</div>}
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="user-create-role">
                                Vai trò ban đầu <span className="required-star">*</span>
                            </label>
                            <select
                                id="user-create-role"
                                className="form-select"
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                disabled={isSubmitting}
                            >
                                {availableRoles.map((r) => (
                                    <option key={r.code} value={r.code}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="user-create-status">
                                Trạng thái tài khoản
                            </label>
                            <select
                                id="user-create-status"
                                className="form-select"
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

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={() => navigate('/users')}
                            disabled={isSubmitting}
                        >
                            Quay lại
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang tạo...' : 'Tạo người dùng'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
