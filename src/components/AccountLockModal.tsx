import { useState } from 'react'
import { useSession } from '../auth/SessionProvider'
import { lockUserApi, unlockUserApi, type User, type RequestFunction } from '../api/userApi'
import { getErrorMessage } from '../utils/errorMessages'
import './UserModal.css'

export interface AccountLockModalProps {
    isOpen: boolean
    user: User | null
    action: 'lock' | 'unlock'
    onClose: () => void
    onSuccess: (updatedUser: User, message: string) => void
    customRequest?: RequestFunction
}

interface AccountLockModalContentProps {
    user: User
    action: 'lock' | 'unlock'
    onClose: () => void
    onSuccess: (updatedUser: User, message: string) => void
    requestFn: RequestFunction
}

function AccountLockModalContent({
    user,
    action,
    onClose,
    onSuccess,
    requestFn,
}: AccountLockModalContentProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const isLock = action === 'lock'
    const modalTitle = isLock ? 'Khóa tài khoản' : 'Mở khóa tài khoản'
    const confirmButtonText = isLock ? 'Khóa tài khoản' : 'Mở khóa'

    const handleConfirm = async () => {
        setIsLoading(true)
        setErrorMessage(null)

        try {
            if (isLock) {
                const res = await lockUserApi(requestFn, user.id)
                const updatedUser: User = {
                    ...user,
                    status: res.status || 'locked',
                }
                onSuccess(updatedUser, `Khóa tài khoản ${user.name} thành công.`)
            } else {
                const res = await unlockUserApi(requestFn, user.id)
                const updatedUser: User = {
                    ...user,
                    status: res.status || 'active',
                }
                onSuccess(updatedUser, `Mở khóa tài khoản ${user.name} thành công.`)
            }
            onClose()
        } catch (err: unknown) {
            const msg = getErrorMessage(err, 'Đã có lỗi xảy ra trong quá trình xử lý.')
            setErrorMessage(msg)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div
            className="modal-backdrop"
            data-testid="account-lock-modal-backdrop"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) {
                    onClose()
                }
            }}
        >
            <div
                className="modal-container"
                data-testid="account-lock-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lock-modal-title"
            >
                <div className="modal-header">
                    <h2 id="lock-modal-title" className="modal-title">
                        {modalTitle}
                    </h2>
                    <button
                        type="button"
                        className="modal-close-btn"
                        data-testid="btn-close-lock-modal"
                        onClick={onClose}
                        disabled={isLoading}
                        aria-label="Đóng hộp thoại"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    {errorMessage && (
                        <div className="modal-banner-error" data-testid="lock-modal-error" role="alert">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <div style={{ lineHeight: 1.6, color: '#334155' }}>
                        <p style={{ margin: '0 0 10px 0' }}>
                            {isLock ? (
                                <>
                                    Bạn có chắc chắn muốn khóa tài khoản của người dùng{' '}
                                    <strong data-testid="lock-user-name">{user.name}</strong> ({user.email})?
                                </>
                            ) : (
                                <>
                                    Bạn có chắc chắn muốn mở khóa tài khoản của người dùng{' '}
                                    <strong data-testid="lock-user-name">{user.name}</strong> ({user.email})?
                                </>
                            )}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: isLock ? '#b91c1c' : '#475569' }}>
                            {isLock
                                ? 'Cảnh báo: Người dùng sẽ bị thu hồi phiên làm việc hiện tại ngay lập tức và không thể đăng nhập lại vào hệ thống cho đến khi được mở khóa.'
                                : 'Lưu ý: Sau khi mở khóa, người dùng có thể đăng nhập bình thường bằng thông tin tài khoản hiện có.'}
                        </p>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn-secondary"
                        data-testid="btn-cancel-lock"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className={isLock ? 'btn-danger' : 'btn-primary'}
                        data-testid={isLock ? 'btn-confirm-lock' : 'btn-confirm-unlock'}
                        onClick={() => void handleConfirm()}
                        disabled={isLoading}
                    >
                        {isLoading && <span className="btn-spinner" aria-hidden="true" />}
                        <span>{isLoading ? 'Đang xử lý...' : confirmButtonText}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export function AccountLockModal({
    isOpen,
    user,
    action,
    onClose,
    onSuccess,
    customRequest,
}: AccountLockModalProps) {
    const { request: sessionRequest } = useSession()
    const requestFn = customRequest ?? sessionRequest

    if (!isOpen || !user) {
        return null
    }

    return (
        <AccountLockModalContent
            key={`${user.id}-${action}`}
            user={user}
            action={action}
            onClose={onClose}
            onSuccess={onSuccess}
            requestFn={requestFn}
        />
    )
}
