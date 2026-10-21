import { createPortal } from 'react-dom'
import './ToastPortal.css'

export interface ToastPortalProps {
    success?: string | null
    error?: string | null
    warning?: string | null
    onCloseSuccess?: () => void
    onCloseError?: () => void
    onCloseWarning?: () => void
}

/**
 * ToastPortal Component
 * Rendered directly into document.body via React Portal.
 * Positioned fixed relative to viewport, placed 12-16px directly below the header.
 * Completely immune to container scroll, overflow clipping, or ancestor transform/filter/perspective.
 */
export function ToastPortal({
    success,
    error,
    warning,
    onCloseSuccess,
    onCloseError,
    onCloseWarning,
}: ToastPortalProps) {
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
