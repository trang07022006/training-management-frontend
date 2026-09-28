import { useState } from 'react'

import { useSession } from '../auth/SessionProvider'
import { createFormDraftStorage } from './formDraftStorage'

const draftStorage = createFormDraftStorage(
    'scrum42-demo:create',
    ['title', 'description'],
)

type FormValues = {
    title: string
    description: string
}

function DraftForm({ userId }: { userId: string }) {
    const [initialDraft] = useState(() => draftStorage.load(userId))

    const [values, setValues] = useState<FormValues>(() => ({
        title: initialDraft?.title ?? '',
        description: initialDraft?.description ?? '',
    }))

    const [message, setMessage] = useState(
        initialDraft
            ? 'Đã khôi phục bản nháp của tài khoản hiện tại.'
            : 'Chưa có bản nháp. Bạn có thể bắt đầu nhập.',
    )

    function changeField(field: keyof FormValues, value: string) {
        const nextValues = { ...values, [field]: value }

        setValues(nextValues)

        const saved = draftStorage.save(userId, nextValues)

        setMessage(
            saved
                ? 'Đã lưu bản nháp trong tab này.'
                : 'Không lưu được bản nháp. Hãy sao chép nội dung trước khi rời trang.',
        )
    }

    function discardDraft() {
        if (!draftStorage.remove(userId)) {
            setMessage('Chưa xóa được bản nháp. Nội dung vẫn được giữ.')
            return
        }

        setValues({ title: '', description: '' })
        setMessage('Đã bỏ bản nháp.')
    }

    return (
        <div>
            <label htmlFor="draft-title">Tiêu đề</label>
            <input
                id="draft-title"
                value={values.title}
                onChange={(event) => changeField('title', event.target.value)}
                maxLength={200}
                style={{
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    margin: '8px 0 16px',
                }}
            />

            <label htmlFor="draft-description">Nội dung</label>
            <textarea
                id="draft-description"
                value={values.description}
                onChange={(event) =>
                    changeField('description', event.target.value)
                }
                rows={5}
                maxLength={5000}
                style={{
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    margin: '8px 0',
                }}
            />

            <p role="status">{message}</p>

            <button type="button" onClick={discardDraft}>
                Bỏ bản nháp
            </button>
        </div>
    )
}

export default function DraftDevPanel() {
    const { hasSession, userId } = useSession()

    if (!hasSession) {
        return null
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
            <h2>Kiểm thử bản nháp — chỉ dùng khi phát triển</h2>

            {userId === null ? (
                <p>
                    Bấm “Kiểm tra phiên” để xác minh tài khoản trước khi mở bản nháp.
                </p>
            ) : (
                <DraftForm key={userId} userId={userId} />
            )}
        </section>
    )
}