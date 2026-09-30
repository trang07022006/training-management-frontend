import React from 'react'
import { Link } from 'react-router'
import './ErrorPage.css'

export type ErrorIconType = 'unauthorized' | 'forbidden' | 'not-found' | 'error'

export interface ErrorAction {
    label: string
    to?: string
    onClick?: () => void
    disabled?: boolean
}

export interface ErrorPageProps {
    statusCode?: string | number
    title: string
    description: string
    primaryAction?: ErrorAction
    secondaryAction?: ErrorAction
    icon?: ErrorIconType | React.ReactNode
    children?: React.ReactNode
    className?: string
}

function renderDefaultIcon(type: ErrorIconType) {
    switch (type) {
        case 'unauthorized':
            // Lock / Session Expired
            return (
                <svg
                    className="error-icon-svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
            )
        case 'forbidden':
            // Shield X / Access Denied
            return (
                <svg
                    className="error-icon-svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                </svg>
            )
        case 'not-found':
            // Search / Page Not Found
            return (
                <svg
                    className="error-icon-svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="12" />
                    <line x1="11" y1="14" x2="11.01" y2="14" />
                </svg>
            )
        case 'error':
        default:
            // Alert Triangle / Generic Error
            return (
                <svg
                    className="error-icon-svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
            )
    }
}

function ActionButton({
    action,
    variant,
}: {
    action: ErrorAction
    variant: 'primary' | 'secondary'
}) {
    const className = `error-action-btn error-action-${variant}`

    if (action.to && !action.disabled) {
        return (
            <Link
                to={action.to}
                onClick={action.onClick}
                className={className}
                data-testid={`error-${variant}-action`}
            >
                {action.label}
            </Link>
        )
    }

    return (
        <button
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={className}
            data-testid={`error-${variant}-action`}
        >
            {action.label}
        </button>
    )
}

export function ErrorPage({
    statusCode,
    title,
    description,
    primaryAction,
    secondaryAction,
    icon = 'error',
    children,
    className = '',
}: ErrorPageProps) {
    const isNamedIcon = typeof icon === 'string' && ['unauthorized', 'forbidden', 'not-found', 'error'].includes(icon)

    return (
        <div className={`error-page-container ${className}`.trim()} data-testid="error-page-container">
            <main className="error-card" role="main" aria-labelledby="error-title">
                {statusCode !== undefined && statusCode !== null && (
                    <div className="error-badge-wrapper">
                        <span className="error-status-badge" data-testid="error-status-code">
                            {statusCode}
                        </span>
                    </div>
                )}

                <div className="error-icon-wrapper" aria-hidden="true" data-testid="error-icon-wrapper">
                    {isNamedIcon ? renderDefaultIcon(icon as ErrorIconType) : (icon as React.ReactNode)}
                </div>

                <div className="error-content">
                    <h1 id="error-title" className="error-title" data-testid="error-title">
                        {title}
                    </h1>
                    <p className="error-description" data-testid="error-description">
                        {description}
                    </p>
                </div>

                {children && <div className="error-extra-content">{children}</div>}

                {(primaryAction || secondaryAction) && (
                    <div className="error-actions" data-testid="error-actions-group">
                        {primaryAction && <ActionButton action={primaryAction} variant="primary" />}
                        {secondaryAction && <ActionButton action={secondaryAction} variant="secondary" />}
                    </div>
                )}
            </main>
        </div>
    )
}
