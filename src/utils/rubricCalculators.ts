/**
 * Tiện ích tính toán điểm số và xếp loại học viên theo Rubric - SCRUM-268.
 */

export interface CriteriaScoreItem {
    criteria_id: string
    score: number
    max_score: number
    weight: number
}

/**
 * Tính điểm tổng kết quy về thang điểm 10 theo công thức:
 * total_score = Σ(score_i / max_score_i * weight_i) / 10
 */
export function calculateWeightedTotalScore(items: CriteriaScoreItem[]): number {
    if (!items || items.length === 0) return 0.0

    let total = 0.0
    for (const item of items) {
        const maxScore = item.max_score > 0 ? item.max_score : 10.0
        const score = Math.max(0, Math.min(item.score, maxScore))
        total += (score / maxScore) * item.weight
    }

    return Math.round((total / 10.0) * 100) / 100
}

/**
 * Xếp loại học lực dựa theo điểm tổng kết thang 10.
 */
export function getAcademicClassification(score: number): {
    rank: string
    color: string
} {
    if (score >= 9.0) return { rank: 'Xuất sắc', color: '#15803d' }
    if (score >= 8.0) return { rank: 'Giỏi', color: '#1d4ed8' }
    if (score >= 6.5) return { rank: 'Khá', color: '#0284c7' }
    if (score >= 5.0) return { rank: 'Trung bình', color: '#d97706' }
    return { rank: 'Yếu', color: '#dc2626' }
}
