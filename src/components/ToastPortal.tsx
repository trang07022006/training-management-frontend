import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './ToastPortal.css'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ContextToastItem {
    id: string
    type: ToastVariant
    message: string
    duration?: number
    createdAt?: number
}

export interface ToastPortalProps {
    success?: string | null
    error?: string | null
    warning?: string | null
    info?: string | null
    onCloseSuccess?: () => void
    onCloseError?: () => void
    onCloseWarning?: () => void
    onCloseInfo?: () => void
    // Optional custom testids for backwards-compatibility with existing tests
    successTestId?: string
    successMsgTestId?: string
    errorTestId?: string
    errorMsgTestId?: string
    // Dành cho tích hợp với ToastContext
    contextToasts?: ContextToastItem[]
    onRemoveContextToast?: (id: string) => void
}

/**
 * ToastPortal Component
 * Chuẩn hóa thông báo nổi góc trên bên phải viewport, dưới header 12-14px.
 * Nền đậm, icon trái, nội dung giữa, nút đóng phải.
 * Hỗ trợ tối đa 3 toast cùng lúc, hàng đợi, tự đóng (5s cho success/info),
 * tạm dừng tự đóng khi hover/focus, không bị cắt bởi overflow hay modal backdrop.
 */
export function ToastPortal({
    success,
    error,
    warning,
    info,
    onCloseSuccess,
    onCloseError,
    onCloseWarning,
    onCloseInfo,
    successTestId,
    successMsgTestId,
    errorTestId,
    errorMsgTestId,
    contextToasts,
    onRemoveContextToast,
}: ToastPortalProps) {
    const [isPaused, setIsPaused] = useState(false)
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

    // 1. Chuyển đổi các props đơn lẻ (nếu có truyền) thành danh sách toast chuẩn
    const propToasts: ContextToastItem[] = []
    if (success) {
        propToasts.push({ id: 'prop-success', type: 'success', message: success })
    }
    if (error) {
        propToasts.push({ id: 'prop-error', type: 'error', message: error })
    }
    if (warning) {
        propToasts.push({ id: 'prop-warning', type: 'warning', message: warning })
    }
    if (info) {
        propToasts.push({ id: 'prop-info', type: 'info', message: info })
    }

    // 2. Tổng hợp toasts từ context và từ props
    const allToasts: ContextToastItem[] = [...(contextToasts || []), ...propToasts]

    // 3. Giới hạn hiển thị tối đa 3 toast cùng lúc (hàng đợi tự động)
    const visibleToasts = allToasts.slice(0, 3)

    // 4. Xử lý auto-dismiss cho các contextToasts (success & info tự đóng sau 5s; tạm dừng khi hover/focus)
    useEffect(() => {
        if (!contextToasts || !onRemoveContextToast) return

        // Dọn dẹp các timer của các toast không còn hiển thị
        const currentVisibleIds = new Set(visibleToasts.map((t) => t.id))
        for (const [id, timer] of timersRef.current.entries()) {
            if (!currentVisibleIds.has(id)) {
                clearTimeout(timer)
                timersRef.current.delete(id)
            }
        }

        // Nếu đang pause (người dùng hover hoặc focus vào toast container), không thiết lập timer mới
        if (isPaused) {
            for (const [, timer] of timersRef.current.entries()) {
                clearTimeout(timer)
            }
            timersRef.current.clear()
            return
        }

        visibleToasts.forEach((t) => {
            // Chỉ auto-dismiss nếu duration > 0 (mặc định success & info là 5000ms)
            const duration = t.duration !== undefined ? t.duration : ((t.type === 'success' || t.type === 'info') ? 5000 : 0)
            if (duration > 0 && !timersRef.current.has(t.id)) {
                const timer = setTimeout(() => {
                    onRemoveContextToast(t.id)
                    timersRef.current.delete(t.id)
                }, duration)
                timersRef.current.set(t.id, timer)
            }
        })

        const timers = timersRef.current
        return () => {
            // cleanup on unmount
            for (const [, timer] of timers.entries()) {
                clearTimeout(timer)
            }
            timers.clear()
        }
    }, [visibleToasts, isPaused, contextToasts, onRemoveContextToast])

    if (typeof document === 'undefined') return null
    if (visibleToasts.length === 0) return null

    const handleClose = (toast: ContextToastItem) => {
        if (toast.id.startsWith('prop-')) {
            if (toast.type === 'success' && onCloseSuccess) onCloseSuccess()
            else if (toast.type === 'error' && onCloseError) onCloseError()
            else if (toast.type === 'warning' && onCloseWarning) onCloseWarning()
            else if (toast.type === 'info' && onCloseInfo) onCloseInfo()
        } else if (onRemoveContextToast) {
            onRemoveContextToast(toast.id)
        }
    }

    return createPortal(
        <div
            className="leads-toast-container"
            role="region"
            aria-live="polite"
            data-testid="toast-container"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={(e) => {
                // Chỉ resume nếu focus rời hẳn khỏi toast container
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setIsPaused(false)
                }
            }}
        >
            {visibleToasts.map((t) => {
                const isError = t.type === 'error'
                const role = isError ? 'alert' : 'status'
                const toastClass = `leads-toast leads-toast-${t.type}`

                // TestIDs duy trì tương thích 100% với các test hiện có
                let toastTestId = `page-${t.type}`
                let msgTestId = `toast-${t.type}`
                let closeBtnTestId = `close-${t.type}-toast-btn`

                if (t.type === 'success') {
                    toastTestId = successTestId || 'page-success'
                    msgTestId = successMsgTestId || 'toast-success'
                    closeBtnTestId = 'close-toast-btn'
                } else if (t.type === 'error') {
                    toastTestId = errorTestId || 'toast-error'
                    msgTestId = errorMsgTestId || 'page-error'
                    closeBtnTestId = 'close-error-toast-btn'
                } else if (t.type === 'warning') {
                    toastTestId = 'page-warning'
                    msgTestId = 'toast-warning'
                    closeBtnTestId = 'close-warning-toast-btn'
                }

                return (
                    <div
                        key={t.id}
                        className={toastClass}
                        role={role}
                        data-testid={toastTestId}
                        tabIndex={0}
                    >
                        {/* Hidden aliases for test compatibility */}
                        {t.type === 'success' && successTestId && successTestId !== 'page-success' && (
                            <span data-testid="page-success" style={{ display: 'none' }} />
                        )}
                        {t.type === 'error' && errorTestId && errorTestId !== 'toast-error' && (
                            <span data-testid="toast-error" style={{ display: 'none' }} />
                        )}

                        {/* Icon bên trái */}
                        <span className="leads-toast-icon" aria-hidden="true" data-testid={`toast-icon-${t.type}`}>
                            {t.type === 'success' && (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            )}
                            {t.type === 'error' && (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            )}
                            {t.type === 'warning' && (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                            )}
                            {t.type === 'info' && (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                            )}
                        </span>

                        {/* Nội dung thông điệp giữa */}
                        <span className="leads-toast-message" data-testid={msgTestId}>
                            {t.message}
                            {t.type === 'success' && successMsgTestId && successMsgTestId !== 'toast-success' && (
                                <span data-testid="toast-success" style={{ display: 'none' }}>{t.message}</span>
                            )}
                            {t.type === 'error' && errorMsgTestId && errorMsgTestId !== 'page-error' && (
                                <span data-testid="page-error" style={{ display: 'none' }}>{t.message}</span>
                            )}
                        </span>

                        {/* Nút đóng bên phải */}
                        <button
                            type="button"
                            className="leads-toast-close"
                            data-testid={closeBtnTestId}
                            onClick={() => handleClose(t)}
                            aria-label={`Đóng thông báo ${t.type}`}
                        >
                            &times;
                        </button>
                    </div>
                )
            })}
        </div>,
        document.body
    )
}
