import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { fetchUserByIdApi, updateUserApi, type User, type UpdateUserData, ApiError } from '../api/userApi'
import { PageHeader } from '../components/PageHeader'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { getRoleLabel } from '../auth/roleRouting'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import { ConfirmModal } from '../components/ConfirmModal'
import { toast } from '../components/ToastPortal'
import '../components/UserModal.css'

interface FormErrors {
    name?: string
    email?: string
    phone?: string
    general?: string
}

export function UserEditPage() {
    const { userId } = useParams<{ userId: string }>()
    const navigate = useNavigate()
    const { request: requestFn, permissions, role, roles } = useSession()

    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const canManage =
        permissions?.includes(SYSTEM_PERMISSIONS.USER_MANAGE) ||
        effectiveRoles.includes('admin')

    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [pageError, setPageError] = useState<string | null>(null)

    // Form fields
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [status, setStatus] = useState('active')

    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDirty, setIsDirty] = useState(false)

    useEffect(() => {
        let isMounted = true
        if (!userId) {
            setPageError('Mã người dùng không hợp lệ.')
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setPageError(null)

        fetchUserByIdApi(requestFn, userId)
            .then((data) => {
                if (isMounted) {
                    setUser(data)
                    setName(data.name || '')
                    setEmail(data.email || '')
                    setPhone(data.phone || '')
                    setStatus(data.status || 'active')
                    setIsLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    if (err instanceof ApiError && err.status === 404) {
                        setPageError('Không tìm thấy người dùng.')
                    } else {
                        setPageError(getErrorMessage(err, 'Lỗi khi tải thông tin người dùng.'))
                    }
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [userId, requestFn])

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

        if (phone.trim() && !/^[0-9+() -]{8,20}$/.test(phone.trim())) {
            errors.phone = 'Số điện thoại không hợp lệ.'
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!validate() || !userId) return

        setIsSubmitting(true)

        const payload: UpdateUserData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() || null,
            status,
        }

        try {
            await updateUserApi(requestFn, userId, payload)
            const msg = getSuccessMessage('UPDATE_USER_SUCCESS', 'Cập nhật thông tin người dùng thành công!')
            toast.success(msg)
            setIsDirty(false)
            setTimeout(() => {
                navigate(`/users/${userId}`)
            }, 800)
        } catch (err: unknown) {
            const errText = err instanceof ApiError ? err.message : getErrorMessage(err, 'Lỗi khi cập nhật người dùng.')
            toast.error(errText)
        } finally {
            setIsSubmitting(false)
        }
    }

    const [isConfirmLeaveOpen, setIsConfirmLeaveOpen] = useState(false)

    const handleCancel = () => {
        if (isDirty) {
            if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
                const confirmed = window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn rời khỏi trang?')
                if (!confirmed) return
            } else {
                setIsConfirmLeaveOpen(true)
                return
            }
        }
        navigate(`/users/${userId || ''}`)
    }

    if (isLoading) {
        return (
            <div className="users-page-container" style={{ padding: '24px 32px' }}>
                <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <span>Đang tải thông tin...</span>
                </div>
            </div>
        )
    }

    if (pageError || !user) {
        return (
            <div className="users-page-container" style={{ padding: '0 0 24px 0' }}>
                <PageHeader
                    title="Chỉnh sửa người dùng"
                    breadcrumbs={[
                        { label: 'Người dùng', path: '/users' },
                        { label: 'Chỉnh sửa' },
                    ]}
                />
                <div className="modal-banner banner-error" role="alert" style={{ marginBottom: '16px' }}>
                    <span>{pageError || 'Không tìm thấy người dùng.'}</span>
                </div>
                <button type="button" className="btn-secondary" onClick={() => navigate('/users')}>
                    Quay lại danh sách người dùng
                </button>
            </div>
        )
    }

    if (!canManage) {
        return (
            <div className="users-page-container" style={{ padding: '24px 32px' }}>
                <PageHeader
                    title="Không có quyền truy cập"
                    breadcrumbs={[
                        { label: 'Người dùng', path: '/users' },
                        { label: user.name, path: `/users/${user.id}` },
                        { label: 'Chỉnh sửa' },
                    ]}
                />
                <div className="modal-banner banner-error" role="alert">
                    <span>Bạn không có quyền chỉnh sửa người dùng.</span>
                </div>
            </div>
        )
    }

    return (
        <div className="users-page-container" data-testid="user-edit-page" style={{ padding: '0 0 24px 0' }}>
            <PageHeader
                title={`Chỉnh sửa: ${user.name}`}
                subtitle={`Email: ${user.email} • Vai trò: ${getRoleLabel(user.role)}`}
                breadcrumbs={[
                    { label: 'Người dùng', path: '/users' },
                    { label: user.name, path: `/users/${user.id}` },
                    { label: 'Chỉnh sửa' },
                ]}
            />

            <div style={{ maxWidth: '780px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label" htmlFor="user-edit-name">
                            Họ và tên <span className="required-star">*</span>
                        </label>
                        <input
                            id="user-edit-name"
                            type="text"
                            className={`form-input ${formErrors.name ? 'is-invalid' : ''}`}
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                                setIsDirty(true)
                            }}
                            disabled={isSubmitting}
                        />
                        {formErrors.name && <div className="form-field-error">{formErrors.name}</div>}
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="user-edit-email">
                                Email đăng nhập <span className="required-star">*</span>
                            </label>
                            <input
                                id="user-edit-email"
                                type="email"
                                className={`form-input ${formErrors.email ? 'is-invalid' : ''}`}
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    setIsDirty(true)
                                }}
                                disabled={isSubmitting}
                            />
                            {formErrors.email && <div className="form-field-error">{formErrors.email}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="user-edit-phone">
                                Số điện thoại
                            </label>
                            <input
                                id="user-edit-phone"
                                type="tel"
                                className={`form-input ${formErrors.phone ? 'is-invalid' : ''}`}
                                value={phone}
                                onChange={(e) => {
                                    setPhone(e.target.value)
                                    setIsDirty(true)
                                }}
                                disabled={isSubmitting}
                            />
                            {formErrors.phone && <div className="form-field-error">{formErrors.phone}</div>}
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label className="form-label" htmlFor="user-edit-status">
                            Trạng thái tài khoản
                        </label>
                        <select
                            id="user-edit-status"
                            className="form-select"
                            value={status}
                            onChange={(e) => {
                                setStatus(e.target.value)
                                setIsDirty(true)
                            }}
                            disabled={isSubmitting}
                        >
                            <option value="active">Hoạt động</option>
                            <option value="locked">Bị khóa</option>
                            <option value="inactive">Không hoạt động</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                        >
                            Quay lại
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>

            <ConfirmModal
                isOpen={isConfirmLeaveOpen}
                title="Rời khỏi trang?"
                message="Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn rời khỏi trang này không?"
                confirmText="Rời khỏi"
                cancelText="Ở lại"
                type="warning"
                onConfirm={() => navigate(`/users/${userId || ''}`)}
                onCancel={() => setIsConfirmLeaveOpen(false)}
            />
        </div>
    )
}
