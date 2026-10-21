import { useState } from 'react'
import './MyAssignmentGradePage.css'

interface StudentCriteriaView {
    name: string
    weight: number
    max_score: number
    score: number
    comment: string
}

export function MyAssignmentGradePage() {
    // Dữ liệu mẫu điểm học viên cho bài tập có Rubric
    const [gradeData] = useState({
        assignmentTitle: 'Báo Cáo Đồ Án Chuyên Ngành',
        className: 'K18 - Kỹ Thuật Phần Mềm A',
        gradedByName: 'ThS. Nguyễn Văn Giảng Viên',
        gradedAt: '22/10/2026',
        totalScore: 8.45,
        feedback: 'Bài làm trình bày mạch lạc, giải quyết tốt bài toán đặt ra. Cần lưu ý tối ưu hóa hiệu năng truy vấn database ở phần backend.',
        criteriaList: [
            {
                name: 'Chất lượng Mã Nguồn & Kiến Trúc',
                weight: 40,
                max_score: 10,
                score: 8.5,
                comment: 'Kiến trúc phân tầng tốt. Bị trừ 1.5 điểm vì chưa viết đủ comment tài liệu cho các hàm phức tạp.',
            },
            {
                name: 'Độ Hoàn Thiện & Tính Năng',
                weight: 35,
                max_score: 10,
                score: 9.0,
                comment: 'Các ca kiểm thử đều pass. Giao diện thân thiện và dễ sử dụng.',
            },
            {
                name: 'Kỹ Năng Trình Bày & Báo Cáo',
                weight: 25,
                max_score: 10,
                score: 7.5,
                comment: 'Báo cáo trình bày rõ ràng nhưng trả lời câu hỏi phản biện về bảo mật còn lúng túng.',
            },
        ] as StudentCriteriaView[],
    })

    const getRank = (score: number) => {
        if (score >= 9.0) return 'Xuất sắc'
        if (score >= 8.0) return 'Giỏi'
        if (score >= 6.5) return 'Khá'
        if (score >= 5.0) return 'Trung bình'
        return 'Yếu'
    }

    return (
        <div className="my-grade-container">
            <div className="my-grade-header">
                <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Kết quả đánh giá học viên &bull; {gradeData.className}
                </div>
                <h1>{gradeData.assignmentTitle}</h1>
                <p style={{ color: '#64748b', margin: 0 }}>
                    Chấm bởi: <strong>{gradeData.gradedByName}</strong> &bull; Ngày chấm: {gradeData.gradedAt}
                </p>
            </div>

            {/* Thẻ Điểm Tổng Hero Card */}
            <div className="total-score-hero">
                <div>
                    <div className="hero-score-label">ĐIỂM TỔNG KẾT (THANG 10)</div>
                    <div className="hero-score-val">{gradeData.totalScore.toFixed(2)}</div>
                    <div style={{ marginTop: 8, fontSize: '0.95rem', opacity: 0.9 }}>
                        Xếp loại: <strong>{getRank(gradeData.totalScore)}</strong>
                    </div>
                </div>
                <div style={{ textAlign: 'right', maxWidth: 300, fontSize: '0.85rem', opacity: 0.85 }}>
                    Điểm tổng được tự động tổng hợp từ điểm số và trọng số của các tiêu chí theo chuẩn Rubric của bài tập.
                </div>
            </div>

            {/* Chi Tiết Từng Tiêu Chí */}
            <h2 style={{ fontSize: '1.25rem', color: '#0f172a', margin: '28px 0 16px 0' }}>
                Bảng Điểm Chi Tiết Theo Từng Tiêu Chí
            </h2>

            {gradeData.criteriaList.map((crit, idx) => {
                const percentage = Math.round((crit.score / crit.max_score) * 100)
                return (
                    <div key={idx} className="criteria-card-item">
                        <div className="criteria-card-top">
                            <div>
                                <div className="criteria-name-text">
                                    {idx + 1}. {crit.name}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>
                                    Trọng số bài tập: <strong style={{ color: '#2563eb' }}>{crit.weight}%</strong> &bull; Điểm tối đa: {crit.max_score}
                                </div>
                            </div>
                            <div className="criteria-score-display">
                                {crit.score} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 400 }}>/ {crit.max_score}</span>
                            </div>
                        </div>

                        {/* Progress Bar tỉ lệ hoàn thành tiêu chí */}
                        <div style={{ background: '#f1f5f9', height: 8, borderRadius: 4, overflow: 'hidden', margin: '10px 0' }}>
                            <div
                                style={{
                                    height: '100%',
                                    width: `${percentage}%`,
                                    backgroundColor: percentage >= 80 ? '#10b981' : percentage >= 60 ? '#3b82f6' : '#f59e0b',
                                    borderRadius: 4,
                                }}
                            />
                        </div>

                        {/* Giải thích của Giảng viên vì sao mất điểm */}
                        {crit.comment && (
                            <div className="criteria-comment-box">
                                <strong style={{ color: '#1e40af' }}>Giải thích mất điểm & nhận xét:</strong>{' '}
                                <span>{crit.comment}</span>
                            </div>
                        )}
                    </div>
                )
            })}

            {/* Lời Nhận Xét Tổng Quát */}
            {gradeData.feedback && (
                <div className="feedback-section">
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#854d0e' }}>
                        Lời Nhận Xét Tổng Quan Từ Giảng Viên
                    </h3>
                    <p style={{ margin: 0, color: '#713f12', lineHeight: 1.5 }}>
                        "{gradeData.feedback}"
                    </p>
                </div>
            )}
        </div>
    )
}
