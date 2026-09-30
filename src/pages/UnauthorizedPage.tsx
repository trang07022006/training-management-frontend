import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { ErrorPage } from './ErrorPage'

export interface UnauthorizedPageProps {
    reason?: string | null
    title?: string
    description?: string
}

export function UnauthorizedPage({
    reason,
    title,
    description,
}: UnauthorizedPageProps = {}) {
    const { endReason } = useSession()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const location = useLocation()

    const queryReason = searchParams.get('reason')
    const stateReason = (location.state as { reason?: string } | null)?.reason

    const effectiveReason =
        reason !== undefined
            ? reason
            : (endReason || queryReason || stateReason || null)

    let resolvedTitle = title
    let resolvedDescription = description
    let primaryActionLabel = 'Đăng nhập lại'

    if (effectiveReason === 'SESSION_EXPIRED') {
        resolvedTitle = resolvedTitle ?? 'Phiên đăng nhập đã hết hạn'
        resolvedDescription =
            resolvedDescription ??
            'Phiên làm việc của bạn đã hết thời gian hiệu lực. Vui lòng đăng nhập lại để tiếp tục sử dụng hệ thống.'
        primaryActionLabel = 'Đăng nhập lại'
    } else if (effectiveReason === 'SESSION_REVOKED') {
        resolvedTitle = resolvedTitle ?? 'Phiên đăng nhập đã kết thúc'
        resolvedDescription =
            resolvedDescription ??
            'Phiên làm việc của bạn đã được kết thúc hoặc bị thu hồi từ thiết bị khác. Vui lòng đăng nhập lại.'
        primaryActionLabel = 'Đăng nhập lại'
    } else if (
        effectiveReason === 'SESSION_INVALID' ||
        effectiveReason === 'AUTH_REQUIRED'
    ) {
        resolvedTitle = resolvedTitle ?? 'Phiên đăng nhập không hợp lệ'
        resolvedDescription =
            resolvedDescription ??
            'Thông tin xác thực không hợp lệ hoặc đã bị thay đổi. Vui lòng đăng nhập lại để tiếp tục.'
        primaryActionLabel = 'Đăng nhập lại'
    } else {
        resolvedTitle = resolvedTitle ?? 'Yêu cầu đăng nhập'
        resolvedDescription =
            resolvedDescription ??
            'Bạn cần đăng nhập với tài khoản hợp lệ để có quyền truy cập vào chức năng này.'
        primaryActionLabel = 'Đăng nhập'
    }

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1)
        } else {
            navigate('/login')
        }
    }

    return (
        <ErrorPage
            statusCode="401"
            icon="unauthorized"
            title={resolvedTitle}
            description={resolvedDescription}
            primaryAction={{
                label: primaryActionLabel,
                to: '/login',
            }}
            secondaryAction={{
                label: 'Quay lại',
                onClick: handleBack,
            }}
        />
    )
}
