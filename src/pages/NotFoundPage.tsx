import { useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getRoleHomePath } from '../auth/roleRouting'
import { ErrorPage } from './ErrorPage'

export interface NotFoundPageProps {
    title?: string
    description?: string
    homePath?: string
}

export function NotFoundPage({
    title = 'Không tìm thấy trang',
    description = 'Đường dẫn bạn yêu cầu không tồn tại, đã bị xóa hoặc tạm thời không khả dụng.',
    homePath,
}: NotFoundPageProps = {}) {
    const { role, hasSession } = useSession()
    const navigate = useNavigate()

    const targetHome =
        homePath ?? (hasSession ? getRoleHomePath(role) : '/login')

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1)
        } else {
            navigate(targetHome)
        }
    }

    return (
        <ErrorPage
            statusCode="404"
            icon="not-found"
            title={title}
            description={description}
            primaryAction={{
                label: 'Về trang chủ',
                to: targetHome,
            }}
            secondaryAction={{
                label: 'Quay lại',
                onClick: handleBack,
            }}
        />
    )
}
