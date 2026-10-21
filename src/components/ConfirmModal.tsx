import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import './ConfirmModal.css'

export interface ConfirmModalProps {
    isOpen: boolean
    title: string
    message: React.ReactNode
    confirmText?: string
    cancelText?: string
    type?: 'danger' | 'warning' | 'primary'
    isLoading?: boolean
    onConfirm: () => void | Promise<void>
    onCancel: () => void
}

export function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    type = 'danger',
    isLoading = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) {
                onCancel()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, isLoading, onCancel])

    if (!isOpen || typeof document === 'undefined') return null

    return createPortal(
        <div
            className="confirm-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) {
                    onCancel()
                }
            }}
        >
            <div className="confirm-modal-card">
                <div className={`confirm-modal-icon-badge confirm-icon-${type}`}>
                    {type === 'danger' && (
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                    )}
                    {type === 'warning' && (
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    )}
                    {type === 'primary' && (
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                    )}
                </div>

                <div className="confirm-modal-content">
                    <h3 id="confirm-modal-title" className="confirm-modal-title">
                        {title}
                    </h3>
                    <div className="confirm-modal-message">
                        {message}
                    </div>
                </div>

                <div className="confirm-modal-actions">
                    <button
                        type="button"
                        className="btn-confirm-cancel"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={`btn-confirm-action btn-confirm-${type}`}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Đang xử lý...' : confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    )
}
