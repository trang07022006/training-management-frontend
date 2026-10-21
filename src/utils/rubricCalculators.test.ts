import { describe, expect, it } from 'vitest'
import {
    calculateWeightedTotalScore,
    getAcademicClassification,
    type CriteriaScoreItem,
} from './rubricCalculators'

describe('rubricCalculators - SCRUM-268', () => {
    describe('calculateWeightedTotalScore', () => {
        it('tính đúng điểm tổng kết khi đạt điểm tối đa', () => {
            const items: CriteriaScoreItem[] = [
                { criteria_id: 'c1', score: 10, max_score: 10, weight: 40 },
                { criteria_id: 'c2', score: 10, max_score: 10, weight: 60 },
            ]
            expect(calculateWeightedTotalScore(items)).toBe(10.0)
        })

        it('tính đúng điểm theo trọng số thập phân', () => {
            const items: CriteriaScoreItem[] = [
                { criteria_id: 'c1', score: 8.5, max_score: 10, weight: 40 }, // 34%
                { criteria_id: 'c2', score: 7.0, max_score: 10, weight: 60 }, // 42%
            ]
            // Tổng % = 76% => điểm thang 10 = 7.6
            expect(calculateWeightedTotalScore(items)).toBe(7.6)
        })

        it('trả về 0 khi danh sách tiêu chí rỗng', () => {
            expect(calculateWeightedTotalScore([])).toBe(0.0)
        })
    })

    describe('getAcademicClassification', () => {
        it('xếp loại Xuất sắc cho điểm >= 9.0', () => {
            expect(getAcademicClassification(9.5).rank).toBe('Xuất sắc')
        })

        it('xếp loại Giỏi cho điểm trong khoảng [8.0, 9.0)', () => {
            expect(getAcademicClassification(8.2).rank).toBe('Giỏi')
        })

        it('xếp loại Khá cho điểm trong khoảng [6.5, 8.0)', () => {
            expect(getAcademicClassification(7.0).rank).toBe('Khá')
        })

        it('xếp loại Yếu cho điểm < 5.0', () => {
            expect(getAcademicClassification(4.5).rank).toBe('Yếu')
        })
    })
})
