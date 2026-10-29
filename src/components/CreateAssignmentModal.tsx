import React, { useState } from 'react'
import {
    createAssignment,
    type AssignmentItem,
    type RequestFn,
} from '../api/submissionApi'
import './ClassAssignmentsView.css'

interface CreateAssignmentModalProps {
    isOpen: boolean
    onClose: () => void
    classId: string
    classCode: string
    requestFn: RequestFn
    onSuccess: (newAssignment: AssignmentItem) => void
}

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
    isOpen,
    onClose,
    classId,
    classCode,
    requestFn,
    onSuccess,
}) => {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [maxScore, setMaxScore] = useState('10')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)

        if (!title.trim()) {
            setErrorMessage('Vui lòng nhập tiêu đề bài tập.')
            return
        }

        const scoreNum = parseFloat(maxScore)
        if (isNaN(scoreNum) || scoreNum <= 0 || scoreNum > 100) {
            setErrorMessage('Thang điểm phải là số lớn hơn 0 và không vượt quá 100.')
            return
        }

        try {
            setIsSubmitting(true)
            const payload = {
                title: title.trim(),
                description: description.trim() || undefined,
                due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
                max_score: scoreNum,
            }
            const created = await createAssignment(requestFn, classId, payload)
            onSuccess(created)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Lỗi khi giao bài tập mới.'
            setErrorMessage(msg)
        } finally {
            setIsSubmitting(false)
        }
    }

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
                    maxWidth: '560px',
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
                            Giao Bài Tập Mới Cho Lớp
                        </h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                            Lớp: <strong>{classCode}</strong>
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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label htmlFor="assignment-title" style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                            Tiêu đề bài tập <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            id="assignment-title"
                            type="text"
                            placeholder="Ví dụ: Bài tập Lập trình Web: Xây dựng RESTful API"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
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
                        <label htmlFor="assignment-description" style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                            Nội dung & Hướng dẫn làm bài
                        </label>
                        <textarea
                            id="assignment-description"
                            rows={4}
                            placeholder="Mô tả chi tiết yêu cầu bài tập, tài liệu tham khảo, các tiêu chí cần hoàn thành..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label htmlFor="assignment-due-date" style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                                Hạn nộp bài
                            </label>
                            <input
                                id="assignment-due-date"
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                disabled={isSubmitting}
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
                            <label htmlFor="assignment-max-score" style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                                Thang điểm tối đa
                            </label>
                            <input
                                id="assignment-max-score"
                                type="number"
                                step="0.5"
                                min="1"
                                max="100"
                                value={maxScore}
                                onChange={(e) => setMaxScore(e.target.value)}
                                disabled={isSubmitting}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                            />
                        </div>
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
                            id="btn-confirm-create-assignment"
                            disabled={isSubmitting}
                            style={{
                                padding: '8px 18px',
                                border: 'none',
                                borderRadius: '6px',
                                background: '#2563eb',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            {isSubmitting ? 'Đang tạo...' : '🚀 Xác nhận giao bài'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
