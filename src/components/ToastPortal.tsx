import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './ToastPortal.css'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
    id: string
    type: ToastType
    message: string
    duration?: number
}

type ToastListener = (toast: ToastItem) => void
const listeners = new Set<ToastListener>()

export const toast = {
    show: (type: ToastType, message: string, duration = 4000) => {
        if (!message) return
        const item: ToastItem = {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type,
            message,
            duration,
        }
        listeners.forEach((listener) => listener(item))
    },
    success: (message: string, duration = 4000) => toast.show('success', message, duration),
    error: (message: string, duration = 5000) => toast.show('error', message, duration),
    warning: (message: string, duration = 4500) => toast.show('warning', message, duration),
    info: (message: string, duration = 4000) => toast.show('info', message, duration),
}

export function useToast() {
    return toast
}

/**
 * GlobalToastContainer Component
 * Rendered at application root / AppLayout to display global notifications.
 */
export function GlobalToastContainer() {
    const [toasts, setToasts] = useState<ToastItem[]>([])

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    useEffect(() => {
        const listener: ToastListener = (newToast) => {
            setToasts((prev) => [...prev, newToast])
        }
        listeners.add(listener)
        return () => {
            listeners.delete(listener)
        }
    }, [])

    useEffect(() => {
        if (toasts.length === 0) return

        const timers = toasts.map((t) => {
            if (!t.duration) return null
            return setTimeout(() => {
                removeToast(t.id)
            }, t.duration)
        })

        return () => {
            timers.forEach((timer) => {
                if (timer) clearTimeout(timer)
            })
        }
    }, [toasts, removeToast])

    if (typeof document === 'undefined' || toasts.length === 0) return null

    return createPortal(
        <div
            className="leads-toast-container"
            role="region"
            aria-live="polite"
            data-testid="global-toast-container"
        >
            {toasts.map((item) => (
                <div
                    key={item.id}
                    className={`leads-toast leads-toast-${item.type}`}
                    role={item.type === 'error' ? 'alert' : 'status'}
                    data-testid={`toast-${item.type}`}
                >
                    <span className="leads-toast-icon" aria-hidden="true" data-testid={`toast-icon-${item.type}`}>
                        {item.type === 'success' && (
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        )}
                        {item.type === 'error' && (
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        )}
                        {item.type === 'warning' && (
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        )}
                        {item.type === 'info' && (
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                        )}
                    </span>
                    <span className="leads-toast-message">{item.message}</span>
                    <button
                        type="button"
                        className="leads-toast-close"
                        onClick={() => removeToast(item.id)}
                        aria-label="Đóng thông báo"
                    >
                        &times;
                    </button>
                </div>
            ))}
        </div>,
        document.body,
    )
}

export interface ToastPortalProps {
    success?: string | null
    error?: string | null
    warning?: string | null
    onCloseSuccess?: () => void
    onCloseError?: () => void
    onCloseWarning?: () => void
    autoDismiss?: boolean
    dismissTime?: number
}

/**
 * ToastPortal Component
 * Backward-compatible declarative component rendered directly into document.body.
 */
export function ToastPortal({
    success,
    error,
    warning,
    onCloseSuccess,
    onCloseError,
    onCloseWarning,
    autoDismiss = true,
    dismissTime = 4500,
}: ToastPortalProps) {
    useEffect(() => {
        if (!autoDismiss || !success || !onCloseSuccess) return
        const timer = setTimeout(() => {
            onCloseSuccess()
        }, dismissTime)
        return () => clearTimeout(timer)
    }, [success, onCloseSuccess, autoDismiss, dismissTime])

    useEffect(() => {
        if (!autoDismiss || !error || !onCloseError) return
        const timer = setTimeout(() => {
            onCloseError()
        }, dismissTime + 1000)
        return () => clearTimeout(timer)
    }, [error, onCloseError, autoDismiss, dismissTime])

    useEffect(() => {
        if (!autoDismiss || !warning || !onCloseWarning) return
        const timer = setTimeout(() => {
            onCloseWarning()
        }, dismissTime)
        return () => clearTimeout(timer)
    }, [warning, onCloseWarning, autoDismiss, dismissTime])

    if (typeof document === 'undefined') return null

    const hasAnyToast = Boolean(success || error || warning)
    if (!hasAnyToast) return null

    return createPortal(
        <div
            className="leads-toast-container"
            role="region"
            aria-live="polite"
            data-testid="toast-container"
        >
            {success && (
                <div
                    className="leads-toast leads-toast-success"
                    role="status"
                    data-testid="page-success"
                >
                    <span className="leads-toast-icon" aria-hidden="true" data-testid="toast-icon-success">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </span>
                    <span className="leads-toast-message" data-testid="toast-success">{success}</span>
                    {onCloseSuccess && (
                        <button
                            type="button"
                            className="leads-toast-close"
                            data-testid="close-toast-btn"
                            onClick={onCloseSuccess}
                            aria-label="Đóng thông báo thành công"
                        >
                            &times;
                        </button>
                    )}
                </div>
            )}

            {error && (
                <div
                    className="leads-toast leads-toast-error"
                    role="alert"
                    data-testid="toast-error"
                >
                    <span className="leads-toast-icon" aria-hidden="true" data-testid="toast-icon-error">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </span>
                    <span className="leads-toast-message" data-testid="page-error">{error}</span>
                    {onCloseError && (
                        <button
                            type="button"
                            className="leads-toast-close"
                            data-testid="close-error-toast-btn"
                            onClick={onCloseError}
                            aria-label="Đóng thông báo lỗi"
                        >
                            &times;
                        </button>
                    )}
                </div>
            )}

            {warning && (
                <div
                    className="leads-toast leads-toast-warning"
                    role="status"
                    data-testid="page-warning"
                >
                    <span className="leads-toast-icon" aria-hidden="true" data-testid="toast-icon-warning">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </span>
                    <span className="leads-toast-message" data-testid="toast-warning">{warning}</span>
                    {onCloseWarning && (
                        <button
                            type="button"
                            className="leads-toast-close"
                            data-testid="close-warning-toast-btn"
                            onClick={onCloseWarning}
                            aria-label="Đóng thông báo cảnh báo"
                        >
                            &times;
                        </button>
                    )}
                </div>
            )}
        </div>,
        document.body,
    )
}
