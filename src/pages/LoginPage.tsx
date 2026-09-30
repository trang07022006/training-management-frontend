import { Link } from 'react-router'

import { useSession } from '../auth/SessionProvider'

export function LoginPage() {
    const { hasSession } = useSession()

    return (
        <main style={{ padding: 24 }}>
            <h1>Đăng nhập</h1>

            {hasSession ? (
                <Link to="/">Tiếp tục vào hệ thống</Link>
            ) : (
                <>
                    <p>Đăng nhập để tiếp tục sử dụng hệ thống.</p>
                    <p style={{ marginTop: 12 }}>
                        <Link to="/forgot-password">Quên mật khẩu?</Link>
                    </p>
                </>
            )}

            {/* Tích hợp form đăng nhập của SCRUM-18 tại đây. */}
        </main>
    )
}