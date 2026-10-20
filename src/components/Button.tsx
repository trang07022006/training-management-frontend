import React from 'react'
import './Button.css'

export type ButtonVariant = 'blue' | 'green' | 'red' | 'orange' | 'gray' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    size?: ButtonSize
    isLoading?: boolean
    loadingText?: string
    icon?: React.ReactNode
    iconPosition?: 'left' | 'right'
}

/**
 * Standardized Button Component for ICTU Training Management
 * Đảm bảo màu đậm, rõ ràng theo đúng quy chuẩn hành động:
 * - blue: Tạo, Thêm, Lưu, Gửi, Xác nhận, Chỉnh sửa, Xem chi tiết
 * - green: Phê duyệt, Chấp nhận, Hoàn tất
 * - red: Xóa, Hủy bỏ, Hủy lớp/buổi học, Từ chối, Thôi học
 * - orange: Bảo lưu, Tạm dừng, Cảnh báo
 * - gray: Quay lại, Đóng
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = 'blue',
            size = 'md',
            isLoading = false,
            loadingText,
            icon,
            iconPosition = 'left',
            className = '',
            disabled,
            type = 'button',
            ...rest
        },
        ref
    ) => {
        const baseClass = 'ictu-btn'
        const variantClass = `ictu-btn-${variant}`
        const sizeClass = size !== 'md' ? `ictu-btn-${size}` : ''
        const loadingClass = isLoading ? 'ictu-btn-loading' : ''

        const fullClassName = [baseClass, variantClass, sizeClass, loadingClass, className]
            .filter(Boolean)
            .join(' ')

        return (
            <button
                ref={ref}
                type={type}
                className={fullClassName}
                disabled={disabled || isLoading}
                aria-busy={isLoading}
                {...rest}
            >
                {isLoading ? (
                    <>
                        <span className="ictu-btn-spinner" aria-hidden="true" />
                        <span>{loadingText || children}</span>
                    </>
                ) : (
                    <>
                        {icon && iconPosition === 'left' && (
                            <span className="ictu-btn-icon" aria-hidden="true">
                                {icon}
                            </span>
                        )}
                        {children && <span>{children}</span>}
                        {icon && iconPosition === 'right' && (
                            <span className="ictu-btn-icon" aria-hidden="true">
                                {icon}
                            </span>
                        )}
                    </>
                )}
            </button>
        )
    }
)

Button.displayName = 'Button'
