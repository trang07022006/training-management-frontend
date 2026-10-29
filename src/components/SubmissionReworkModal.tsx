import React, { useState } from 'react'
import { requestSubmissionRework, type SubmissionDetailItem, type RequestFn } from '../api/submissionApi'

export interface SubmissionReworkModalProps {
    isOpen: boolean
    onClose: () => void
    submission: SubmissionDetailItem
    requestFn: RequestFn
    onSuccess: (updated: SubmissionDetailItem) => void
}

export const SubmissionReworkModal: React.FC<SubmissionReworkModalProps> = ({
    isOpen,
    onClose,
    submission,
    requestFn,
    onSuccess,
}) => {
    const [comment, setComment] = useState('')
    const [newDeadline, setNewDeadline] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<{ comment?: string; newDeadline?: string }>({})

    if (!isOpen) return null

    const currentVersionNumber = submission.versions.length > 0
        ? submission.versions[submission.versions.length - 1].version_number
        : 1

    const validate = (): boolean => {
        const errors: { comment?: string; newDeadline?: string } = {}
        const trimmedComment = comment.trim()

        if (!trimmedComment) {
            errors.comment = 'Nhận xét yêu cầu làm lại là bắt buộc.'
        } else if (trimmedComment.length > 2000) {
            errors.comment = 'Nhận xét không được vượt quá 2000 ký tự.'
        }

        if (!newDeadline) {
            errors.newDeadline = 'Vui lòng chọn hạn nộp mới.'
        } else {
            const selectedTime = new Date(newDeadline).getTime()
            const now = Date.now()
            if (isNaN(selectedTime) || selectedTime <= now) {
                errors.newDeadline = 'Hạn nộp mới phải ở tương lai so với thời điểm hiện tại.'
            }
        }

        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)

        if (!validate()) {
            return
        }

        setIsSubmitting(true)
        try {
            // Chuẩn hóa deadline sang chuẩn ISO string có UTC
            const isoDeadline = new Date(newDeadline).toISOString()
            const updated = await requestSubmissionRework(requestFn, submission.id, {
                comment: comment.trim(),
                new_deadline: isoDeadline,
            })
            onSuccess(updated)
            onClose()
        } catch (err: unknown) {
            if (err instanceof Error) {
                setErrorMessage(err.message)
            } else {
                setErrorMessage('Có lỗi xảy ra khi gửi yêu cầu làm lại.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="rework-modal-title" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div className="modal-content" style={{
                background: '#ffffff',
                borderRadius: '8px',
                width: '100%',
                maxWidth: '560px',
                padding: '24px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 id="rework-modal-title" style={{ margin: 0, fontSize: '1.25rem', color: '#1f2937' }}>
                        Yêu cầu làm lại bài tập (SCRUM-269)
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            fontSize: '1.25rem',
                            cursor: 'pointer',
                            color: '#6b7280',
                        }}
                        aria-label="Đóng"
                    >
                        ✕
                    </button>
                </div>

                {errorMessage && (
                    <div role="alert" style={{
                        padding: '10px 14px',
                        backgroundColor: '#fef2f2',
                        color: '#b91c1c',
                        borderRadius: '6px',
                        marginBottom: '16px',
                        fontSize: '0.875rem',
                    }}>
                        {errorMessage}
                    </div>
                )}

                {/* Thông tin ngữ cảnh chỉ đọc */}
                <div style={{
                    backgroundColor: '#f9fafb',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '0.875rem',
                    color: '#374151',
                    lineHeight: '1.5',
                }}>
                    <div><strong>Học viên:</strong> {submission.student_name} ({submission.student_code})</div>
                    <div><strong>Bài tập:</strong> {submission.assignment_title}</div>
                    <div><strong>Lần nộp đang xem xét:</strong> Lần nộp thứ {currentVersionNumber}</div>
                    <div><strong>Số lần đã yêu cầu:</strong> {submission.rework_count}</div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Nhận xét bắt buộc */}
                    <div style={{ marginBottom: '16px' }}>
                        <label htmlFor="rework-comment" style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.875rem', color: '#374151' }}>
                            Nhận xét giảng viên <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <textarea
                            id="rework-comment"
                            rows={4}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            maxLength={2000}
                            placeholder="Nhập chi tiết các lỗi cần sửa và hướng dẫn học viên làm lại..."
                            disabled={isSubmitting}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '8px 12px',
                                border: fieldErrors.comment ? '1px solid #dc2626' : '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                resize: 'vertical',
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                            {fieldErrors.comment ? (
                                <span style={{ color: '#dc2626' }}>{fieldErrors.comment}</span>
                            ) : <span></span>}
                            <span>{comment.length}/2000 ký tự</span>
                        </div>
                    </div>

                    {/* Hạn nộp mới */}
                    <div style={{ marginBottom: '24px' }}>
                        <label htmlFor="rework-deadline" style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.875rem', color: '#374151' }}>
                            Hạn nộp lại mới <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                            id="rework-deadline"
                            type="datetime-local"
                            value={newDeadline}
                            onChange={(e) => setNewDeadline(e.target.value)}
                            disabled={isSubmitting}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '8px 12px',
                                border: fieldErrors.newDeadline ? '1px solid #dc2626' : '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                            }}
                        />
                        {fieldErrors.newDeadline && (
                            <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>
                                {fieldErrors.newDeadline}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            style={{
                                padding: '8px 16px',
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
                            disabled={isSubmitting}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '6px',
                                background: '#ea580c',
                                color: '#ffffff',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                            }}
                        >
                            {isSubmitting ? 'Đang gửi...' : 'Xác nhận yêu cầu làm lại'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
