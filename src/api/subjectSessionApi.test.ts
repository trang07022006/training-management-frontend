// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import {
    getSubjectSessions,
    getSubjectSession,
    createSubjectSession,
    updateSubjectSession,
    reorderSubjectSessions,
    deleteSubjectSession,
    cloneSubjectSessions,
    type SubjectSession,
    type RequestFunction,
    ApiError,
} from './subjectSessionApi'

describe('subjectSessionApi - API Client (SCRUM-129 Activity A6)', () => {
    const mockSubjectId = '123e4567-e89b-12d3-a456-426614174000'
    const mockSession: SubjectSession = {
        id: '987e6543-e21b-12d3-a456-426614174000',
        subject_id: mockSubjectId,
        session_number: 1,
        topic: 'Buổi 1: Giới thiệu môn học',
        objective: 'Nắm được đề cương chi tiết và phương pháp đánh giá',
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
    }

    describe('getSubjectSessions (GET /api/v1/subjects/<subject_id>/sessions)', () => {
        it('gọi đúng URL và trả về danh sách buổi học cùng thông tin môn học', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: {
                        subject: {
                            id: mockSubjectId,
                            code: 'CS101',
                            name: 'Nhập môn lập trình',
                            total_sessions: 15,
                        },
                        items: [mockSession],
                    },
                }),
            }) as unknown as RequestFunction

            const result = await getSubjectSessions(mockRequest, mockSubjectId)

            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/subjects/${mockSubjectId}/sessions`,
                { method: 'GET' },
            )
            expect(result.subject.code).toBe('CS101')
            expect(result.items).toHaveLength(1)
            expect(result.items[0].session_number).toBe(1)
        })

        it('ném ApiError 401 khi chưa xác thực', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 401,
                json: async () => ({ code: 'UNAUTHORIZED', message: 'Unauthorized' }),
            }) as unknown as RequestFunction

            await expect(getSubjectSessions(mockRequest, mockSubjectId)).rejects.toThrow(ApiError)
        })

        it('ném ApiError 403 khi không có quyền course.view', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 403,
                json: async () => ({ code: 'FORBIDDEN', message: 'Forbidden' }),
            }) as unknown as RequestFunction

            await expect(getSubjectSessions(mockRequest, mockSubjectId)).rejects.toThrow(ApiError)
        })

        it('ném ApiError 404 khi không tìm thấy môn học', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({ code: 'SUBJECT_NOT_FOUND', message: 'Not found' }),
            }) as unknown as RequestFunction

            await expect(getSubjectSessions(mockRequest, mockSubjectId)).rejects.toThrow(
                'Không tìm thấy môn học yêu cầu.',
            )
        })
    })

    describe('getSubjectSession (GET /api/v1/subjects/<subject_id>/sessions/<session_id>)', () => {
        it('lấy chi tiết một buổi học thành công', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: mockSession,
                }),
            }) as unknown as RequestFunction

            const result = await getSubjectSession(mockRequest, mockSubjectId, mockSession.id)

            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/subjects/${mockSubjectId}/sessions/${mockSession.id}`,
                { method: 'GET' },
            )
            expect(result.topic).toBe(mockSession.topic)
        })

        it('ném ApiError 404 khi không tìm thấy buổi học', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({ code: 'SUBJECT_SESSION_NOT_FOUND', message: 'Not found' }),
            }) as unknown as RequestFunction

            await expect(getSubjectSession(mockRequest, mockSubjectId, 'non-existent')).rejects.toThrow(
                'Không tìm thấy buổi học của môn học.',
            )
        })
    })

    describe('createSubjectSession (POST /api/v1/subjects/<subject_id>/sessions)', () => {
        it('gửi payload tạo mới buổi học thành công', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: mockSession,
                }),
            }) as unknown as RequestFunction

            const input = {
                session_number: 1,
                topic: mockSession.topic,
                objective: mockSession.objective,
            }
            const result = await createSubjectSession(mockRequest, mockSubjectId, input)

            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/subjects/${mockSubjectId}/sessions`,
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(input),
                }),
            )
            expect(result.id).toBe(mockSession.id)
        })

        it('ném ApiError 409 khi số thứ tự buổi học bị trùng lặp', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 409,
                json: async () => ({ code: 'DUPLICATE_SESSION_NUMBER', message: 'Duplicate' }),
            }) as unknown as RequestFunction

            await expect(
                createSubjectSession(mockRequest, mockSubjectId, {
                    session_number: 1,
                    topic: 'Topic',
                    objective: 'Objective',
                }),
            ).rejects.toThrow('Số thứ tự buổi học đã tồn tại trong môn học.')
        })
    })

    describe('updateSubjectSession (PATCH /api/v1/subjects/<subject_id>/sessions/<session_id>)', () => {
        it('gửi payload cập nhật chủ đề và mục tiêu thành công', async () => {
            const updated = { ...mockSession, topic: 'Topic mới' }
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: updated,
                }),
            }) as unknown as RequestFunction

            const input = { topic: 'Topic mới' }
            const result = await updateSubjectSession(mockRequest, mockSubjectId, mockSession.id, input)

            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/subjects/${mockSubjectId}/sessions/${mockSession.id}`,
                expect.objectContaining({
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(input),
                }),
            )
            expect(result.topic).toBe('Topic mới')
        })
    })

    describe('reorderSubjectSessions (PATCH /api/v1/subjects/<subject_id>/sessions/reorder)', () => {
        it('gửi mảng session_ids sắp xếp thành công', async () => {
            const reordered = [mockSession]
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: reordered,
                }),
            }) as unknown as RequestFunction

            const ids = [mockSession.id]
            const result = await reorderSubjectSessions(mockRequest, mockSubjectId, ids)

            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/subjects/${mockSubjectId}/sessions/reorder`,
                expect.objectContaining({
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_ids: ids }),
                }),
            )
            expect(result).toHaveLength(1)
        })
    })

    describe('deleteSubjectSession (DELETE /api/v1/subjects/<subject_id>/sessions/<session_id>)', () => {
        it('gọi DELETE xóa buổi học thành công', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    message: 'Xóa buổi học thành công.',
                }),
            }) as unknown as RequestFunction

            const result = await deleteSubjectSession(mockRequest, mockSubjectId, mockSession.id)

            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/subjects/${mockSubjectId}/sessions/${mockSession.id}`,
                { method: 'DELETE' },
            )
            expect(result.id).toBe(mockSession.id)
            expect(result.message).toBe('Xóa buổi học thành công.')
        })
    })

    describe('cloneSubjectSessions (POST /api/v1/subjects/<subject_id>/sessions/clone)', () => {
        const mockSourceId = 'source-subj-123'

        it('gọi POST clone thành công với source_subject_id trong body', async () => {
            const mockClonedSessions = [
                {
                    id: 'new-sess-1',
                    subject_id: mockSubjectId,
                    session_number: 1,
                    topic: 'Tổng quan môn học',
                    objective: 'Nắm được nội dung và mục tiêu',
                    created_at: '2026-03-05T00:00:00Z',
                    updated_at: '2026-03-05T00:00:00Z',
                },
            ]
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    message: 'Đã nhân bản 1 buổi học thành công.',
                    data: {
                        cloned_count: 1,
                        total_sessions: 1,
                        items: mockClonedSessions,
                    },
                }),
            }) as unknown as RequestFunction

            const result = await cloneSubjectSessions(mockRequest, mockSubjectId, mockSourceId)

            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/subjects/${mockSubjectId}/sessions/clone`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source_subject_id: mockSourceId }),
                },
            )
            expect(result.cloned_count).toBe(1)
            expect(result.items).toHaveLength(1)
            expect(result.message).toBe('Đã nhân bản 1 buổi học thành công.')
        })

        it('ném ApiError khi backend trả về lỗi 400 (vượt quá giới hạn)', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                json: async () => ({
                    code: 'SESSION_LIMIT_EXCEEDED',
                    message: 'Không thể nhân bản vì số buổi sau khi nhân bản sẽ vượt quá giới hạn của môn học.',
                }),
            }) as unknown as RequestFunction

            await expect(cloneSubjectSessions(mockRequest, mockSubjectId, mockSourceId)).rejects.toThrow(
                'Không thể nhân bản vì số buổi sau khi nhân bản sẽ vượt quá giới hạn của môn học.',
            )
        })

        it('ném ApiError 403 khi không có quyền course.manage', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 403,
                json: async () => ({ code: 'FORBIDDEN', message: 'Forbidden' }),
            }) as unknown as RequestFunction

            await expect(cloneSubjectSessions(mockRequest, mockSubjectId, mockSourceId)).rejects.toThrow(ApiError)
        })
    })
})
