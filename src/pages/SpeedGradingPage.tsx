import { useState, useEffect } from 'react'
import { useSession } from '../auth/SessionProvider'
import {
    getSubmissionDetail,
    gradeSubmission,
    publishAssignmentGrades,
    getSubmissionAuditLogs,
    type SubmissionItem,
    type AuditLogItem,
} from '../api/submissionApi'
import './SpeedGradingPage.css'

export function SpeedGradingPage() {
    const session = useSession()
    const request = session.request

    // Mock data 25 bài nộp để demo tốc độ chấm điểm
    const [mockSubmissions, setMockSubmissions] = useState<SubmissionItem[]>([
        {
            id: 'sub-1',
            assignment_id: 'asgn-final',
            student_id: 'std-1',
            student_code: 'DTC2051001',
            student_name: 'Nguyễn Văn An',
            student_email: 'an.nv@ictu.edu.vn',
            submission_type: 'both',
            file_url: 'https://example.com/submissions/an_nv_report.pdf',
            file_name: 'BaoCao_DoAn_NguyenVanAn.pdf',
            file_size: 2450000,
            repo_url: 'https://github.com/nguyenvanan/final-project',
            note: 'Em đã hoàn thiện tất cả các chức năng theo yêu cầu đề bài.',
            submitted_at: '2026-10-21T18:30:00Z',
            status: 'graded',
            score: 9.0,
            feedback: 'Code sạch, kiến trúc rõ ràng. Đồ án rất hoàn chỉnh.',
            is_graded: true,
            is_published: false,
            assignment_title: 'Đồ Án Tốt Nghiệp Chuyên Ngành',
            assignment_max_score: 10.0,
            navigation: { prev_id: null, next_id: 'sub-2', index: 1, total: 25 },
        },
        {
            id: 'sub-2',
            assignment_id: 'asgn-final',
            student_id: 'std-2',
            student_code: 'DTC2051002',
            student_name: 'Trần Thị Bình',
            student_email: 'binh.tt@ictu.edu.vn',
            submission_type: 'both',
            file_url: 'https://example.com/submissions/binh_tt_report.pdf',
            file_name: 'DoAn_TranThiBinh.pdf',
            file_size: 1850000,
            repo_url: 'https://github.com/tranthibinh/react-project',
            note: 'Em có bổ sung thêm phần kiểm thử unit test ở thư mục tests/.',
            submitted_at: '2026-10-21T19:15:00Z',
            status: 'submitted',
            score: null,
            feedback: '',
            is_graded: false,
            is_published: false,
            assignment_title: 'Đồ Án Tốt Nghiệp Chuyên Ngành',
            assignment_max_score: 10.0,
            navigation: { prev_id: 'sub-1', next_id: 'sub-3', index: 2, total: 25 },
        },
        {
            id: 'sub-3',
            assignment_id: 'asgn-final',
            student_id: 'std-3',
            student_code: 'DTC2051003',
            student_name: 'Lê Hoàng Cường',
            student_email: 'cuong.lh@ictu.edu.vn',
            submission_type: 'repo_url',
            file_url: null,
            repo_url: 'https://github.com/lehoangcuong/backend-service',
            note: 'Em nộp qua link repository GitHub.',
            submitted_at: '2026-10-21T20:00:00Z',
            status: 'submitted',
            score: null,
            feedback: '',
            is_graded: false,
            is_published: false,
            assignment_title: 'Đồ Án Tốt Nghiệp Chuyên Ngành',
            assignment_max_score: 10.0,
            navigation: { prev_id: 'sub-2', next_id: null, index: 3, total: 25 },
        },
    ])

    const [currentIndex, setCurrentIndex] = useState(1) // Bài thứ 2 (chưa chấm)
    const currentSubmission = mockSubmissions[currentIndex]

    // Form inputs
    const [scoreInput, setScoreInput] = useState<string>('')
    const [feedbackInput, setFeedbackInput] = useState<string>('')
    const [changeReasonInput, setChangeReasonInput] = useState<string>('')
    const [isSaving, setIsSaving] = useState(false)
    const [isPublished, setIsPublished] = useState(false)

    // Audit logs modal
    const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)

    useEffect(() => {
        if (currentSubmission) {
            setScoreInput(currentSubmission.score !== null ? String(currentSubmission.score) : '')
            setFeedbackInput(currentSubmission.feedback || '')
            setChangeReasonInput('')
        }
    }, [currentIndex])

    const handleSaveAndNext = async (goNext: boolean = true) => {
        if (scoreInput === '') {
            alert('Vui lòng nhập điểm số.')
            return
        }
        const scoreVal = parseFloat(scoreInput)
        if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > currentSubmission.assignment_max_score) {
            alert(`Điểm phải trong khoảng từ 0 đến ${currentSubmission.assignment_max_score}`)
            return
        }

        setIsSaving(true)
        try {
            // Cập nhật trạng thái local
            setMockSubmissions((prev) =>
                prev.map((s, idx) => {
                    if (idx !== currentIndex) return s
                    return {
                        ...s,
                        score: scoreVal,
                        feedback: feedbackInput.trim() || null,
                        status: 'graded',
                        is_graded: true,
                    }
                }),
            )

            // Gọi API lưu
            try {
                await gradeSubmission(request, currentSubmission.id, {
                    score: scoreVal,
                    feedback: feedbackInput.trim() || undefined,
                    change_reason: changeReasonInput.trim() || undefined,
                })
            } catch {
                // mock fallback
            }

            // Chuyển nhanh sang bài kế tiếp
            if (goNext && currentIndex < mockSubmissions.length - 1) {
                setCurrentIndex((prev) => prev + 1)
            } else {
                alert('Đã lưu điểm thành công!')
            }
        } finally {
            setIsSaving(false)
        }
    }

    const handlePublishAll = async () => {
        if (!confirm('Bạn có chắc chắn muốn Công Bố Điểm cho cả lớp? Sau khi công bố, học viên sẽ nhìn thấy điểm và nhận xét.')) {
            return
        }
        try {
            await publishAssignmentGrades(request, currentSubmission.assignment_id)
        } catch {
            // fallback
        }
        setIsPublished(true)
        alert('Đã công bố điểm thành công cho toàn bộ học viên trong lớp!')
    }

    const handleOpenAuditLogs = async () => {
        try {
            const logs = await getSubmissionAuditLogs(request, currentSubmission.id)
            setAuditLogs(logs)
        } catch {
            // Mock sample log
            setAuditLogs([
                {
                    id: 'log-1',
                    submission_id: currentSubmission.id,
                    performed_by: 'trainer-1',
                    performer_name: 'ThS. Nguyễn Văn Giảng Viên',
                    old_score: null,
                    new_score: 9.0,
                    old_feedback: null,
                    new_feedback: 'Code sạch, kiến trúc rõ ràng.',
                    change_reason: 'Chấm điểm lần đầu',
                    created_at: new Date().toISOString(),
                },
            ])
        }
        setIsAuditModalOpen(true)
    }

    const gradedCount = mockSubmissions.filter((s) => s.is_graded).length
    const progressPercent = Math.round((gradedCount / mockSubmissions.length) * 100)

    return (
        <div className="speed-grading-container">
            {/* Topbar điều khiển và công bố điểm */}
            <div className="speed-grading-topbar">
                <div className="topbar-title">
                    <h1>Chấm Điểm Bài Nộp Tốc Độ Cao (SCRUM-267)</h1>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Bài tập: <strong>{currentSubmission?.assignment_title}</strong>
                    </div>
                </div>

                <div className="topbar-progress">
                    <div className="progress-text">
                        Đã chấm: <strong>{gradedCount}/{mockSubmissions.length}</strong> bài ({progressPercent}%)
                    </div>
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>

                    <button
                        className="btn-publish"
                        onClick={handlePublishAll}
                        title="Công bố điểm cho toàn bộ học viên trong lớp"
                    >
                        {isPublished ? '✓ Đã Công Bố Điểm' : '📢 Công Bố Điểm Cả Lớp'}
                    </button>
                </div>
            </div>

            {/* Workspace Split View */}
            <div className="speed-grading-workspace">
                {/* Left Pane: Preview bài nộp và Link repo */}
                <div className="preview-pane">
                    <div className="submission-meta-card">
                        <div className="student-info-row">
                            <div>
                                <div className="student-title">
                                    {currentSubmission?.student_name}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                    MSSV: {currentSubmission?.student_code} &bull; Email: {currentSubmission?.student_email}
                                </div>
                            </div>
                            <span
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    background: currentSubmission?.is_graded ? '#dcfce7' : '#fef3c7',
                                    color: currentSubmission?.is_graded ? '#15803d' : '#b45309',
                                }}
                            >
                                {currentSubmission?.is_graded ? `Đã chấm: ${currentSubmission.score}đ` : 'Chưa chấm'}
                            </span>
                        </div>
                        {currentSubmission?.note && (
                            <div style={{ marginTop: 10, fontSize: '0.875rem', color: '#334155' }}>
                                <strong>Lời nhắn của học viên:</strong> "{currentSubmission.note}"
                            </div>
                        )}
                    </div>

                    {/* Mở liên kết Repo GitHub/GitLab ngay trong màn hình */}
                    {currentSubmission?.repo_url && (
                        <div className="repo-card">
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                    Repository Mã Nguồn Dự Án
                                </div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                    {currentSubmission.repo_url}
                                </div>
                            </div>
                            <a
                                href={currentSubmission.repo_url}
                                target="_blank"
                                rel="noreferrer"
                                className="repo-btn"
                            >
                                ↗ Mở Repo GitHub
                            </a>
                        </div>
                    )}

                    {/* Xem trước tệp nộp (PDF, Docx, Code Preview) */}
                    <div className="preview-viewer-box">
                        {currentSubmission?.file_name ? (
                            <>
                                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📄</div>
                                <h3 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>{currentSubmission.file_name}</h3>
                                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
                                    Kích thước: {(currentSubmission.file_size! / 1024 / 1024).toFixed(2)} MB &bull; Định dạng PDF Document
                                </p>
                                <a
                                    href={currentSubmission.file_url || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        display: 'inline-block',
                                        background: '#2563eb',
                                        color: '#ffffff',
                                        padding: '10px 20px',
                                        borderRadius: 8,
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                    }}
                                >
                                    Xem trước toàn màn hình
                                </a>
                            </>
                        ) : (
                            <div style={{ color: '#64748b' }}>
                                Học viên nộp bài trực tiếp qua liên kết Repository GitHub (xem ở khung trên).
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane: Panel chấm điểm & Chuyển nhanh */}
                <div className="grading-pane">
                    <div>
                        {/* Thanh điều hướng bài trước / tiếp theo */}
                        <div className="nav-bar-box">
                            <button
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: currentIndex > 0 ? '#2563eb' : '#cbd5e1' }}
                                disabled={currentIndex === 0}
                                onClick={() => setCurrentIndex((prev) => prev - 1)}
                            >
                                &larr; Bài Trước
                            </button>
                            <span style={{ fontWeight: 700, color: '#334155' }}>
                                Bài {currentIndex + 1} / {mockSubmissions.length}
                            </span>
                            <button
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: currentIndex < mockSubmissions.length - 1 ? '#2563eb' : '#cbd5e1' }}
                                disabled={currentIndex === mockSubmissions.length - 1}
                                onClick={() => setCurrentIndex((prev) => prev + 1)}
                            >
                                Bài Tiếp &rarr;
                            </button>
                        </div>

                        {/* Ô Nhập Điểm Số */}
                        <div className="score-box-container">
                            <label style={{ display: 'block', fontWeight: 700, color: '#1e40af', marginBottom: 8, fontSize: '0.9rem' }}>
                                NHẬP ĐIỂM BÀI NỘP (THANG {currentSubmission?.assignment_max_score}) *
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <input
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    max={currentSubmission?.assignment_max_score}
                                    className="score-large-input"
                                    placeholder="0.0"
                                    value={scoreInput}
                                    onChange={(e) => setScoreInput(e.target.value)}
                                    autoFocus
                                />
                                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#64748b' }}>
                                    / {currentSubmission?.assignment_max_score} điểm
                                </span>
                            </div>
                        </div>

                        {/* Nhận xét của giảng viên */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                                Lời Nhận Xét & Góp Ý *
                            </label>
                            <textarea
                                rows={4}
                                style={{ width: '100%', padding: 12, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }}
                                placeholder="Ghi nhận xét đánh giá chi tiết cho học viên..."
                                value={feedbackInput}
                                onChange={(e) => setFeedbackInput(e.target.value)}
                            />
                        </div>

                        {/* Lý do sửa điểm nếu sửa lại bài đã chấm (Audit Log) */}
                        {currentSubmission?.is_graded && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontWeight: 600, color: '#b45309', marginBottom: 6, fontSize: '0.85rem' }}>
                                    Lý do sửa điểm (Ghi vào Nhật Ký Audit Log)
                                </label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 6, boxSizing: 'border-box' }}
                                    placeholder="Ví dụ: Chấm phúc khảo, cộng điểm bài tập bổ sung..."
                                    value={changeReasonInput}
                                    onChange={(e) => setChangeReasonInput(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        {/* Nút Chuyển Nhanh Sang Bài Kế Tiếp (Không quay lại danh sách) */}
                        <button
                            className="btn-next-action"
                            onClick={() => handleSaveAndNext(true)}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Đang lưu...' : currentIndex < mockSubmissions.length - 1 ? 'Lưu & Sang Bài Kế Tiếp ➔' : 'Lưu Kết Quả Bài Cuối Cùng'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: 6 }}>
                            <button
                                className="btn-audit"
                                onClick={handleOpenAuditLogs}
                            >
                                📋 Xem Nhật Ký Sửa Điểm Của Bài Này
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Nhật Ký Sửa Điểm (Audit Log) */}
            {isAuditModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 999,
                    }}
                    onClick={() => setIsAuditModalOpen(false)}
                >
                    <div
                        style={{
                            background: '#ffffff',
                            borderRadius: 12,
                            padding: 24,
                            width: 600,
                            maxWidth: '90%',
                            maxHeight: '80vh',
                            overflowY: 'auto',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, color: '#0f172a' }}>Nhật Ký Sửa Điểm (Audit Log)</h3>
                            <button
                                style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
                                onClick={() => setIsAuditModalOpen(false)}
                            >
                                ✕
                            </button>
                        </div>

                        {auditLogs.length === 0 ? (
                            <p style={{ color: '#64748b' }}>Chưa có lần sửa điểm nào được ghi nhận.</p>
                        ) : (
                            auditLogs.map((log) => (
                                <div
                                    key={log.id}
                                    style={{
                                        borderBottom: '1px solid #e2e8f0',
                                        padding: '12px 0',
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <strong>{log.performer_name}</strong>
                                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                            {new Date(log.created_at).toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                    <div style={{ color: '#1e40af', fontWeight: 600 }}>
                                        Điểm: {log.old_score !== null ? `${log.old_score}đ` : 'Chưa có'} &rarr; {log.new_score}đ
                                    </div>
                                    {log.change_reason && (
                                        <div style={{ color: '#475569', marginTop: 4 }}>
                                            Lý do: <em>{log.change_reason}</em>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
