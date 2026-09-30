import { useSession } from './SessionProvider'

export function SessionNotice() {
    const { endReason } = useSession()

    if (endReason === null) {
        return null
    }

    let message = 'Phiên đăng nhập không còn hợp lệ.'

    if (endReason === 'SESSION_EXPIRED') {
        message = 'Phiên đăng nhập đã hết hạn.'
    } else if (endReason === 'SESSION_REVOKED') {
        message = 'Phiên đăng nhập đã được kết thúc.'
    }

    return (
        <div
            role="alert"
            style={{
                padding: '12px 16px',
                marginBottom: 16,
                border: '1px solid #d97706',
                borderRadius: 8,
                backgroundColor: '#fffbeb',
                color: '#78350f',
            }}
        >
            <strong>{message}</strong>{' '}
            Vui lòng đăng nhập lại để tiếp tục.
        </div>
    )
}