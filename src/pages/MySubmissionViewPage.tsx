import { useState } from 'react'

export function MySubmissionViewPage() {
    // Mock trạng thái học viên xem bài nộp của chính mình
    const [isPublished, setIsPublished] = useState(true)

    const submissionData = {
        assignmentTitle: 'Đồ Án Tốt Nghiệp Chuyên Ngành',
        submittedAt: '21/10/2026 18:30',
        fileName: 'BaoCao_DoAn_NguyenVanAn.pdf',
        fileSize: '2.34 MB',
        repoUrl: 'https://github.com/nguyenvanan/final-project',
        score: 9.0,
        maxScore: 10.0,
        gradedByName: 'ThS. Nguyễn Văn Giảng Viên',
        gradedAt: '22/10/2026',
        feedback: 'Code sạch, kiến trúc rõ ràng. Đồ án rất hoàn chỉnh, xử lý tốt các trường hợp biên.',
    }

    return (
        <div style={{ maxWidth: 800, margin: '30px auto', padding: 24, background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 16, marginBottom: 24 }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Bài nộp của tôi &bull; Kết quả đánh giá
                </span>
                <h1 style={{ margin: '4px 0', fontSize: '1.5rem', color: '#0f172a' }}>{submissionData.assignmentTitle}</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Nộp lúc: {submissionData.submittedAt}</p>
            </div>

            {/* Toggle demo để kiểm tra Acceptance Criteria: Chưa công bố vs Đã công bố */}
            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Chế độ kiểm thử công bố điểm:</span>
                <button
                    style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => setIsPublished(!isPublished)}
                >
                    {isPublished ? 'Chuyển sang: CHƯA CÔNG BỐ' : 'Chuyển sang: ĐÃ CÔNG BỐ'}
                </button>
            </div>

            {/* Phần hiển thị Điểm: Chỉ hiện khi ĐÃ CÔNG BỐ */}
            {isPublished ? (
                <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', padding: 24, borderRadius: 12, marginBottom: 24 }}>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        KẾT QUẢ ĐÃ ĐƯỢC GIẢNG VIÊN CÔNG BỐ
                    </div>
                    <div style={{ fontSize: '3rem', fontWeight: 900, margin: '6px 0' }}>
                        {submissionData.score} <span style={{ fontSize: '1.25rem', fontWeight: 400 }}>/ {submissionData.maxScore} điểm</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.95 }}>
                        Chấm bởi: <strong>{submissionData.gradedByName}</strong> &bull; Ngày: {submissionData.gradedAt}
                    </div>
                    {submissionData.feedback && (
                        <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 8 }}>
                            <strong>Nhận xét của giảng viên:</strong> "{submissionData.feedback}"
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ background: '#fefce8', border: '1px solid #fef08a', color: '#854d0e', padding: 20, borderRadius: 12, marginBottom: 24 }}>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem' }}>⏳ Bài tập đang được Giảng viên chấm điểm</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
                        Điểm số và lời nhận xét sẽ tự động hiển thị tại đây ngay sau khi Giảng viên hoàn tất chấm bài và bấm <strong>Công bố điểm</strong> cho cả lớp.
                    </p>
                </div>
            )}

            {/* Thông tin tệp nộp và Repo */}
            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: 12 }}>Tệp Nộp & Liên Kết Mã Nguồn</h3>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>📄 {submissionData.fileName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Kích thước: {submissionData.fileSize}</div>
                    </div>
                    <span style={{ color: '#15803d', fontWeight: 600, fontSize: '0.85rem' }}>✓ Đã tải lên</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                    <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>🔗 GitHub Repository</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{submissionData.repoUrl}</div>
                    </div>
                    <a
                        href={submissionData.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}
                    >
                        ↗ Mở Repo
                    </a>
                </div>
            </div>
        </div>
    )
}
