import React, { useState } from 'react'
import {
    gradeSubmission,
    type SubmissionDetailItem,
    type RequestFn,
} from '../api/submissionApi'
import './ClassAssignmentsView.css'

interface SubmissionGradeModalProps {
    isOpen: boolean
    onClose: () => void
    submission: SubmissionDetailItem
    requestFn: RequestFn
    onSuccess: (updated: SubmissionDetailItem) => void
}

export const SubmissionGradeModal: React.FC<SubmissionGradeModalProps> = ({
    isOpen,
    onClose,
    submission,
    requestFn,
    onSuccess,
}) => {
    const [score, setScore] = useState<string>(
        submission.score !== null && submission.score !== undefined ? String(submission.score) : ''
    )
    const [feedback, setFeedback] = useState<string>(submission.feedback || '')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    if (!isOpen) return null

    const maxScore = submission.assignment_max_score || 10

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)

        if (score.trim() === '') {
            setErrorMessage('Vui lòng nhập điểm số đánh giá.')
            return
        }

        const scoreNum = parseFloat(score)
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxScore) {
            setErrorMessage(`Điểm số phải nằm trong khoảng từ 0 đến ${maxScore}.`)
            return
        }

        try {
            setIsSubmitting(true)
            const updated = await gradeSubmission(requestFn, submission.id, {
                score: scoreNum,
                feedback: feedback.trim() || undefined,
            })
            onSuccess(updated)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Lỗi khi chấm điểm bài nộp.'
            setErrorMessage(msg)
        } finally {
            setIsSubmitting(false)
        }
    }

    const latestVersion = submission.versions?.length
        ? submission.versions[submission.versions.length - 1]
        : null

    return (
        <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            style={{
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
            }}
        >
            <div
                className="modal-content"
                style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    width: '100%',
                    maxWidth: '600px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '90vh',
                }}
            >
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                }}>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                            🎯 Đánh Giá & Xác Nhận Bài Nộp
                        </h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                            Học viên: <strong>{submission.student_name}</strong> ({submission.student_code})
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '18px',
                            cursor: 'pointer',
                            color: '#64748b',
                        }}
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {errorMessage && (
                        <div style={{
                            padding: '10px 14px',
                            background: '#fef2f2',
                            color: '#b91c1c',
                            borderRadius: '6px',
                            fontSize: '13px',
                            border: '1px solid #fecaca',
                        }} role="alert">
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* CHI TIẾT BÀI NỘP CỦA HỌC VIÊN */}
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                                Phiên bản #{latestVersion?.version_number || 1}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                {latestVersion ? new Date(latestVersion.submitted_at).toLocaleString('vi-VN') : '—'}
                            </span>
                        </div>
                        {latestVersion?.content && (
                            <div style={{ fontSize: '13px', color: '#1e293b', whiteSpace: 'pre-wrap', marginBottom: '6px' }}>
                                <strong>Nội dung:</strong> {latestVersion.content}
                            </div>
                        )}
                        {latestVersion?.file_url && (
                            <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                                <strong>Tệp đính kèm:</strong>{' '}
                                <a href={latestVersion.file_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                                    📎 {latestVersion.file_name || 'Tải tệp nộp bài'}
                                </a>
                            </div>
                        )}
                        {latestVersion?.repo_url && (
                            <div style={{ fontSize: '13px' }}>
                                <strong>Repository:</strong>{' '}
                                <a href={latestVersion.repo_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                                    🔗 {latestVersion.repo_url}
                                </a>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label htmlFor="submission-score" style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                            Điểm số (Thang điểm: 0 — {maxScore}) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            id="submission-score"
                            type="number"
                            step="0.1"
                            min="0"
                            max={maxScore}
                            placeholder={`Nhập điểm (tối đa ${maxScore})`}
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            disabled={isSubmitting}
                            required
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '14px',
                                outline: 'none',
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label htmlFor="submission-feedback" style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                            Nhận xét & Đánh giá của Giảng viên
                        </label>
                        <textarea
                            id="submission-feedback"
                            rows={4}
                            placeholder="Nhận xét ưu điểm, những điểm cần khắc phục, lời khuyên dành cho học viên..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            disabled={isSubmitting}
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '14px',
                                outline: 'none',
                                resize: 'vertical',
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            style={{
                                padding: '8px 16px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                background: '#ffffff',
                                color: '#475569',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            id="btn-confirm-grade-submission"
                            disabled={isSubmitting}
                            style={{
                                padding: '8px 18px',
                                border: 'none',
                                borderRadius: '6px',
                                background: '#059669',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            {isSubmitting ? 'Đang lưu...' : '✅ Xác nhận đánh giá'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
