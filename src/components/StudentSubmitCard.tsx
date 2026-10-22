import React, { useState } from 'react'
import {
    submitAssignment,
    type SubmissionDetailItem,
    type RequestFn,
} from '../api/submissionApi'

export interface StudentSubmitCardProps {
    assignmentId: string
    assignmentTitle: string
    dueDate?: string | null
    maxScore?: number
    requestFn: RequestFn
    onSuccess: (created: SubmissionDetailItem) => void
}

export const StudentSubmitCard: React.FC<StudentSubmitCardProps> = ({
    assignmentId,
    assignmentTitle,
    dueDate,
    maxScore = 10,
    requestFn,
    onSuccess,
}) => {
    const [submissionType, setSubmissionType] = useState<'repo_url' | 'file_url' | 'text'>('repo_url')
    const [repoUrl, setRepoUrl] = useState('')
    const [fileUrl, setFileUrl] = useState('')
    const [fileName, setFileName] = useState('')
    const [content, setContent] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const isOverdue = Boolean(dueDate && Date.parse(dueDate) < Date.now())

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)

        const trimmedContent = content.trim()
        const trimmedRepo = repoUrl.trim()
        const trimmedFile = fileUrl.trim()

        if (submissionType === 'repo_url' && !trimmedRepo) {
            setErrorMessage('Vui lòng nhập liên kết kho mã nguồn (GitHub / GitLab).')
            return
        }

        if (submissionType === 'file_url' && !trimmedFile) {
            setErrorMessage('Vui lòng nhập đường dẫn tệp đính kèm hoặc tải tệp lên.')
            return
        }

        if (submissionType === 'text' && !trimmedContent) {
            setErrorMessage('Vui lòng nhập nội dung bài làm của bạn.')
            return
        }

        if (!trimmedContent && !trimmedRepo && !trimmedFile) {
            setErrorMessage('Vui lòng cung cấp nội dung, liên kết kho mã nguồn hoặc tệp nộp bài.')
            return
        }

        if (isOverdue) {
            setErrorMessage('Đã quá thời hạn nộp bài tập.')
            return
        }

        setIsSubmitting(true)
        try {
            const payload = {
                submission_type: submissionType,
                repo_url: trimmedRepo || undefined,
                file_url: trimmedFile || undefined,
                file_name: fileName.trim() || undefined,
                content: trimmedContent || undefined,
            }

            const created = await submitAssignment(requestFn, assignmentId, payload)
            onSuccess(created)
        } catch (err: unknown) {
            if (err instanceof Error) {
                setErrorMessage(err.message)
            } else {
                setErrorMessage('Có lỗi xảy ra khi nộp bài tập.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div
            className="student-submit-card"
            style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                marginTop: '16px',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#1e293b', fontWeight: 600 }}>
                        📤 Nộp Bài Tập Cho Lớp
                    </h4>
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                        Bài tập: <strong>{assignmentTitle}</strong> (Thang điểm: {maxScore} điểm)
                    </p>
                </div>
                {dueDate && (
                    <div style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: isOverdue ? '#fef2f2' : '#f0fdf4',
                        color: isOverdue ? '#b91c1c' : '#15803d',
                        border: `1px solid ${isOverdue ? '#fecaca' : '#bbf7d0'}`,
                        fontSize: '13px',
                        fontWeight: 600,
                    }}>
                        {isOverdue ? '⚠️ Đã hết hạn nộp' : `⏰ Hạn chót: ${new Date(dueDate).toLocaleString('vi-VN')}`}
                    </div>
                )}
            </div>

            {errorMessage && (
                <div
                    style={{
                        padding: '10px 14px',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        borderRadius: '6px',
                        fontSize: '13px',
                        border: '1px solid #fecaca',
                        marginBottom: '16px',
                    }}
                    role="alert"
                >
                    <span>{errorMessage}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* LỰA CHỌN HÌNH THỨC NỘP BÀI */}
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                        Chọn hình thức nộp bài <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => setSubmissionType('repo_url')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: `1.5px solid ${submissionType === 'repo_url' ? '#2563eb' : '#cbd5e1'}`,
                                background: submissionType === 'repo_url' ? '#eff6ff' : '#ffffff',
                                color: submissionType === 'repo_url' ? '#1d4ed8' : '#475569',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                            }}
                        >
                            🔗 Kho mã nguồn (GitHub / GitLab)
                        </button>
                        <button
                            type="button"
                            onClick={() => setSubmissionType('file_url')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: `1.5px solid ${submissionType === 'file_url' ? '#2563eb' : '#cbd5e1'}`,
                                background: submissionType === 'file_url' ? '#eff6ff' : '#ffffff',
                                color: submissionType === 'file_url' ? '#1d4ed8' : '#475569',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                            }}
                        >
                            📎 Tệp đính kèm (URL / File)
                        </button>
                        <button
                            type="button"
                            onClick={() => setSubmissionType('text')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: `1.5px solid ${submissionType === 'text' ? '#2563eb' : '#cbd5e1'}`,
                                background: submissionType === 'text' ? '#eff6ff' : '#ffffff',
                                color: submissionType === 'text' ? '#1d4ed8' : '#475569',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                            }}
                        >
                            📝 Nội dung văn bản
                        </button>
                    </div>
                </div>

                {/* FORM INPUT THEO LOẠI */}
                {submissionType === 'repo_url' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label htmlFor="student-repo-url" style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                            Đường dẫn Repository GitHub / GitLab <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            id="student-repo-url"
                            type="url"
                            placeholder="https://github.com/username/project-repository"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            disabled={isSubmitting || isOverdue}
                            style={{
                                padding: '10px 14px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '14px',
                                outline: 'none',
                            }}
                        />
                    </div>
                )}

                {submissionType === 'file_url' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label htmlFor="student-file-url" style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                                Đường dẫn tệp bài nộp <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                id="student-file-url"
                                type="url"
                                placeholder="https://storage.example.com/files/bai-tap.zip"
                                value={fileUrl}
                                onChange={(e) => setFileUrl(e.target.value)}
                                disabled={isSubmitting || isOverdue}
                                style={{
                                    padding: '10px 14px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label htmlFor="student-file-name" style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                                Tên tệp
                            </label>
                            <input
                                id="student-file-name"
                                type="text"
                                placeholder="bai-tap-lon.zip"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                disabled={isSubmitting || isOverdue}
                                style={{
                                    padding: '10px 14px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                            />
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label htmlFor="student-submission-content" style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        {submissionType === 'text' ? 'Nội dung bài làm' : 'Ghi chú / Thuyết minh bài nộp'}{' '}
                        {submissionType === 'text' && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <textarea
                        id="student-submission-content"
                        rows={5}
                        placeholder={
                            submissionType === 'text'
                                ? 'Nhập toàn bộ nội dung bài tập, câu trả lời, lời giải...'
                                : 'Mô tả cấu trúc thư mục, hướng dẫn chạy thử, tài khoản demo (nếu có)...'
                        }
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isSubmitting || isOverdue}
                        style={{
                            padding: '10px 14px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none',
                            resize: 'vertical',
                        }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                        type="submit"
                        id="btn-submit-assignment"
                        disabled={isSubmitting || isOverdue}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '6px',
                            border: 'none',
                            background: isOverdue ? '#cbd5e1' : '#2563eb',
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: '14px',
                            cursor: isOverdue ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background 0.15s ease',
                        }}
                    >
                        {isSubmitting ? 'Đang gửi bài...' : '🚀 Nộp bài tập'}
                    </button>
                </div>
            </form>
        </div>
    )
}
