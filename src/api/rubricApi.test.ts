import { describe, expect, it, vi } from 'vitest'
import {
    getRubricTemplates,
    createRubricTemplate,
    deleteRubricTemplate,
    listAssignmentGrades,
    gradeStudentByRubric,
    getMyAssignmentGrade,
    type CreateRubricPayload,
    type GradeStudentPayload,
} from './rubricApi'

describe('rubricApi tests - SCRUM-268', () => {
    describe('getRubricTemplates', () => {
        it('gọi GET /api/v1/rubric-templates và trả về danh sách template', async () => {
            const mockTemplates = [
                { id: 'rt-1', name: 'Rubric Báo cáo', criteria: [] },
                { id: 'rt-2', name: 'Rubric Đồ án', criteria: [] },
            ]
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', data: mockTemplates }),
            })

            const res = await getRubricTemplates(mockRequest)
            expect(mockRequest).toHaveBeenCalledWith('/api/v1/rubric-templates', { method: 'GET' })
            expect(res).toEqual(mockTemplates)
        })

        it('ném lỗi khi backend phản hồi status != success', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                json: async () => ({ status: 'error', message: 'Không có quyền truy cập.' }),
            })

            await expect(getRubricTemplates(mockRequest)).rejects.toThrow('Không có quyền truy cập.')
        })
    })

    describe('createRubricTemplate', () => {
        it('gửi POST /api/v1/rubric-templates với payload hợp lệ', async () => {
            const payload: CreateRubricPayload = {
                name: 'Rubric Mới',
                description: 'Mô tả',
                criteria: [
                    { name: 'Tiêu chí 1', weight: 40, max_score: 10 },
                    { name: 'Tiêu chí 2', weight: 60, max_score: 10 },
                ],
            }
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', data: { id: 'rt-new', ...payload } }),
            })

            const res = await createRubricTemplate(mockRequest, payload)
            expect(mockRequest).toHaveBeenCalledWith('/api/v1/rubric-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            expect(res.id).toBe('rt-new')
        })
    })

    describe('deleteRubricTemplate', () => {
        it('gọi DELETE /api/v1/rubric-templates/:id thành công', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', message: 'Đã xóa thành công.' }),
            })

            const res = await deleteRubricTemplate(mockRequest, 'rt-1')
            expect(mockRequest).toHaveBeenCalledWith('/api/v1/rubric-templates/rt-1', {
                method: 'DELETE',
            })
            expect(res.message).toBe('Đã xóa thành công.')
        })
    })

    describe('gradeStudentByRubric', () => {
        it('gửi POST chấm điểm học viên và nhận điểm tổng tự động', async () => {
            const payload: GradeStudentPayload = {
                criteria_scores: [
                    { criteria_id: 'crit-1', score: 8, comment: 'Tốt' },
                    { criteria_id: 'crit-2', score: 9, comment: 'Xuất sắc' },
                ],
                feedback: 'Làm tốt',
            }

            const mockGradeResult = {
                id: 'grade-1',
                assignment_id: 'asgn-1',
                student_id: 'std-1',
                total_score: 8.5,
            }

            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', data: mockGradeResult }),
            })

            const res = await gradeStudentByRubric(mockRequest, 'class-1', 'asgn-1', 'std-1', payload)
            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/classes/class-1/assignments/asgn-1/grades/std-1',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
            )
            expect(res.total_score).toBe(8.5)
        })
    })
})
