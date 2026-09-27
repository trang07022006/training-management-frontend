import { useState } from 'react'
import { useSession } from './SessionProvider'
import { SessionApiError } from './sessionClient'

export default function SessionDevPanel() {
    const { hasSession, startSession, request } = useSession()
    const [input, setInput] = useState('')
    const [result, setResult] = useState('')
    const [loading, setLoading] = useState(false)

    function loadTokens() {
        try {
            const data: unknown = JSON.parse(input)

            if (
                typeof data !== 'object' ||
                data === null ||
                !('access_token' in data) ||
                !('refresh_token' in data) ||
                typeof data.access_token !== 'string' ||
                typeof data.refresh_token !== 'string'
            ) {
                throw new Error('Cần access_token và refresh_token dạng chuỗi.')
            }

            startSession({
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
            })

            setInput('')
            setResult('Đã nạp phiên thử.')
        } catch {
            setResult('Dữ liệu không hợp lệ. Kiểm tra lại JSON và hai token.')
        }
    }

    async function checkSession() {
        setLoading(true)
        setResult('Đang kiểm tra...')

        try {
            const response = await request('/api/auth/session')
            setResult(`HTTP ${response.status}: phiên còn hiệu lực.`)
        } catch (error) {
            if (error instanceof SessionApiError) {
                setResult(`${error.code} — HTTP ${error.status}`)
            } else {
                setResult('Không kết nối được API hoặc phản hồi không hợp lệ.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <section
            style={{
                padding: 20,
                marginBottom: 20,
                border: '1px dashed #64748b',
                borderRadius: 8,
                textAlign: 'left',
            }}
        >
            <h2>Kiểm thử phiên — chỉ dùng khi phát triển</h2>

            <p>
                Trạng thái: {hasSession ? 'Đã nạp token' : 'Chưa có phiên'}
            </p>

            <label htmlFor="session-test-tokens">
                JSON chứa access_token và refresh_token
            </label>

            <textarea
                id="session-test-tokens"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={4}
                spellCheck={false}
                autoComplete="off"
                style={{
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    margin: '8px 0',
                }}
            />

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={loadTokens}
                    disabled={loading || !input.trim()}
                >
                    Nạp phiên thử
                </button>

                <button
                    type="button"
                    onClick={checkSession}
                    disabled={loading || !hasSession}
                >
                    {loading ? 'Đang kiểm tra...' : 'Kiểm tra phiên'}
                </button>
            </div>

            <p role="status">{result}</p>
        </section>
    )
}