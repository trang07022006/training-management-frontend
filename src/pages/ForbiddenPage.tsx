import { useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getRoleHomePath } from '../auth/roleRouting'
import { ErrorPage } from './ErrorPage'

export interface ForbiddenPageProps {
    title?: string
    description?: string
    homePath?: string
}

export function ForbiddenPage({
    title = 'Không có quyền truy cập',
    description = 'Bạn không có quyền truy cập chức năng này.',
    homePath,
}: ForbiddenPageProps = {}) {
    const { role, hasSession } = useSession()
    const navigate = useNavigate()

    const targetHome = homePath ?? (hasSession ? getRoleHomePath(role) : '/login')

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1)
        } else {
            navigate(targetHome)
        }
    }

    return (
        <ErrorPage
            statusCode="403"
            icon="forbidden"
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
