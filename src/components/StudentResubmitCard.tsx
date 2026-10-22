import React, { useState, useEffect } from 'react'
import {
    resubmitAssignment,
    type SubmissionDetailItem,
    type RequestFn,
} from '../api/submissionApi'

export interface StudentResubmitCardProps {
    submission: SubmissionDetailItem
    requestFn: RequestFn
    onSuccess: (updated: SubmissionDetailItem) => void
}

export const StudentResubmitCard: React.FC<StudentResubmitCardProps> = ({
    submission,
    requestFn,
    onSuccess,
}) => {
    const [content, setContent] = useState('')
    const [repoUrl, setRepoUrl] = useState('')
    const [fileUrl, setFileUrl] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)

    const isNeedsRework = submission.status === 'needs_rework'
    const openRequest = submission.current_rework_request

    const [isOverdue, setIsOverdue] = useState(() => {
        return Boolean(openRequest && Date.parse(openRequest.new_deadline) < Date.now())
    })

    useEffect(() => {
        const timer = setTimeout(() => {
            if (openRequest) {
                setIsOverdue(Date.parse(openRequest.new_deadline) < Date.now())
            }
        }, 0)
        return () => clearTimeout(timer)
    }, [openRequest])

    const handleResubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)

        const trimmedContent = content.trim()
        const trimmedRepo = repoUrl.trim()
        const trimmedFile = fileUrl.trim()

        if (!trimmedContent && !trimmedRepo && !trimmedFile) {
            setErrorMessage('Vui lòng nhập nội dung, liên kết GitHub hoặc đường dẫn tệp nộp bài.')
            return
        }

        if (isOverdue) {
            setErrorMessage('Đã quá hạn nộp lại bài tập theo yêu cầu của giảng viên.')
            return
        }

        setIsSubmitting(true)
        try {
            const updated = await resubmitAssignment(requestFn, submission.id, {
                submission_type: trimmedRepo ? 'repo_url' : trimmedFile ? 'file' : 'text',
                content: trimmedContent || undefined,
                repo_url: trimmedRepo || undefined,
                file_url: trimmedFile || undefined,
            })
            onSuccess(updated)
            setShowForm(false)
        } catch (err: unknown) {
            if (err instanceof Error) {
                setErrorMessage(err.message)
            } else {
                setErrorMessage('Có lỗi xảy ra khi nộp lại bài.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="student-resubmit-card" style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: '#ffffff',
            marginTop: '16px',
        }}>
            {/* Header trạng thái */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#111827' }}>
                    {submission.assignment_title}
                </h3>
                <span
                    data-testid="status-badge"
                    style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: isNeedsRework ? '#fef3c7' : '#dcfce7',
                        color: isNeedsRework ? '#92400e' : '#166534',
                    }}
                >
                    {isNeedsRework ? 'Cần làm lại' : submission.status === 'resubmitted' ? 'Đã nộp lại' : submission.status_label}
                </span>
            </div>

            {/* Thông báo yêu cầu làm lại của giảng viên */}
            {isNeedsRework && openRequest && (
                <div style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '6px',
                    padding: '14px',
                    marginBottom: '16px',
                }}>
                    <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '6px' }}>
                        Yêu cầu làm lại (Lần {openRequest.request_number}):
                    </div>
                    <div style={{ color: '#78350f', fontSize: '0.875rem', marginBottom: '8px', whiteSpace: 'pre-wrap' }}>
                        {openRequest.comment}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#b45309' }}>
                        <strong>Hạn nộp mới:</strong> {new Date(openRequest.new_deadline).toLocaleString('vi-VN')}
                    </div>
                    {isOverdue && (
                        <div role="alert" style={{
                            marginTop: '8px',
                            color: '#dc2626',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                        }}>
                            Đã quá hạn nộp lại bài tập theo yêu cầu của giảng viên.
                        </div>
                    )}
                </div>
            )}

            {/* Nút mở form nộp lại */}
            {isNeedsRework && !showForm && (
                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    disabled={isOverdue}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: isOverdue ? '#9ca3af' : '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: isOverdue ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                    }}
                >
                    Nộp lại bài tập
                </button>
            )}

            {/* Form nộp lại bài */}
            {isNeedsRework && showForm && (
                <form onSubmit={handleResubmit} style={{ marginTop: '16px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1f2937' }}>
                        Thông tin nộp lại (Lần nộp thứ {submission.versions.length + 1})
                    </h4>

                    {errorMessage && (
                        <div role="alert" style={{
                            padding: '8px 12px',
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            borderRadius: '6px',
                            marginBottom: '12px',
                            fontSize: '0.875rem',
                        }}>
                            {errorMessage}
                        </div>
                    )}

                    <div style={{ marginBottom: '12px' }}>
                        <label htmlFor="resubmit-content" style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px', color: '#374151' }}>
                            Nội dung / Ghi chú sửa đổi
                        </label>
                        <textarea
                            id="resubmit-content"
                            rows={3}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Mô tả các nội dung bạn đã chỉnh sửa theo nhận xét..."
                            disabled={isSubmitting}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label htmlFor="resubmit-file" style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px', color: '#374151' }}>
                            Đường dẫn tệp đính kèm (nếu có)
                        </label>
                        <input
                            id="resubmit-file"
                            type="text"
                            value={fileUrl}
                            onChange={(e) => setFileUrl(e.target.value)}
                            placeholder="/uploads/assignments/my_assignment.zip"
                            disabled={isSubmitting}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label htmlFor="resubmit-repo" style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px', color: '#374151' }}>
                            Liên kết Repository GitHub
                        </label>
                        <input
                            id="resubmit-repo"
                            type="url"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            placeholder="https://github.com/username/repository"
                            disabled={isSubmitting}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            disabled={isSubmitting}
                            style={{
                                padding: '8px 14px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                background: '#ffffff',
                                color: '#374151',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                            }}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || isOverdue}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: isOverdue ? '#9ca3af' : '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: isSubmitting || isOverdue ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                            }}
                        >
                            {isSubmitting ? 'Đang gửi...' : 'Gửi bài nộp lại'}
                        </button>
                    </div>
                </form>
            )}

            {/* Lịch sử các lần nộp */}
            {submission.versions && submission.versions.length > 0 && (
                <div style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9375rem', color: '#374151' }}>
                        Lịch sử các lần nộp bài ({submission.versions.length} lần nộp):
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {submission.versions.map((ver) => (
                            <li
                                key={ver.id}
                                style={{
                                    padding: '10px 12px',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '6px',
                                    marginBottom: '8px',
                                    fontSize: '0.875rem',
                                    color: '#4b5563',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                    <span>Lần nộp thứ {ver.version_number}</span>
                                    <span>{new Date(ver.submitted_at).toLocaleString('vi-VN')}</span>
                                </div>
                                {ver.content && <div style={{ marginTop: '4px' }}>{ver.content}</div>}
                                {ver.repo_url && (
                                    <div style={{ marginTop: '4px' }}>
                                        Link: <a href={ver.repo_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{ver.repo_url}</a>
                                    </div>
                                )}
                                {ver.file_name && (
                                    <div style={{ marginTop: '4px' }}>Tệp: {ver.file_name}</div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
