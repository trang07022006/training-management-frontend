// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import {
    getSubjects,
    getSubject,
    createSubject,
    updateSubject,
    patchSubject,
    deleteSubject,
    getSubjectStatusLabel,
    type Subject,
    type RequestFunction,
    ApiError,
    fetchSubjectsApi,
    getSubjectApi,
    createSubjectApi,
    updateSubjectApi,
    patchSubjectApi,
    deleteSubjectApi,
} from './subjectApi'

describe('subjectApi - API Client (SCRUM-123 Activity A6)', () => {
    const mockSubject: Subject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        code: 'CS101',
        name: 'Nhập môn lập trình',
        description: 'Kiến thức cơ bản về lập trình C/C++',
        credits: 3,
        total_sessions: 45,
        status: 'active',
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
    }

    describe('getSubjectStatusLabel', () => {
        it('ánh xạ đúng nhãn trạng thái tiếng Việt', () => {
            expect(getSubjectStatusLabel('draft')).toBe('Bản nháp')
            expect(getSubjectStatusLabel('active')).toBe('Đang hoạt động')
            expect(getSubjectStatusLabel('archived')).toBe('Đã lưu trữ')
            expect(getSubjectStatusLabel(null)).toBe('Không xác định')
            expect(getSubjectStatusLabel('other')).toBe('other')
        })
    })

    describe('getSubjects (GET /api/v1/subjects)', () => {
        it('gọi đúng URL với URLSearchParams phân trang, tìm kiếm và trạng thái', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: [mockSubject],
                        total: 1,
                        page: 2,
                        page_size: 10,
                        total_pages: 1,
                    },
                }),
            }) as unknown as RequestFunction

            const result = await getSubjects(mockRequest, {
                page: 2,
                page_size: 10,
                status: 'active',
                search: 'CS101',
            })

            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/subjects?page=2&page_size=10&status=active&search=CS101',
                { method: 'GET' },
            )
            expect(result.items).toHaveLength(1)
            expect(result.items[0].code).toBe('CS101')
            expect(result.total).toBe(1)
        })

        it('xử lý khi không truyền params -> URL mặc định', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
                }),
            }) as unknown as RequestFunction

            const result = await getSubjects(mockRequest)
            expect(mockRequest).toHaveBeenCalledWith('/api/v1/subjects', { method: 'GET' })
            expect(result.items).toEqual([])
        })

        it('ném ApiError khi gặp 401 Unauthorized', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 401,
                json: async () => ({ code: 'UNAUTHORIZED', message: 'Token expired' }),
            }) as unknown as RequestFunction

            await expect(getSubjects(mockRequest)).rejects.toThrow(ApiError)
        })

        it('ném ApiError khi gặp 403 Forbidden', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 403,
                json: async () => ({ code: 'FORBIDDEN', message: 'Permission denied' }),
            }) as unknown as RequestFunction

            await expect(getSubjects(mockRequest)).rejects.toThrow(ApiError)
        })
    })

    describe('getSubject (GET /api/v1/subjects/<id>)', () => {
        it('lấy chi tiết môn học thành công với đúng ID encode', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', data: mockSubject }),
            }) as unknown as RequestFunction

            const result = await getSubject(mockRequest, '123e4567-e89b-12d3-a456-426614174000')
            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/subjects/123e4567-e89b-12d3-a456-426614174000',
                { method: 'GET' },
            )
            expect(result.name).toBe('Nhập môn lập trình')
        })

        it('ném ApiError khi gặp 404 Not Found', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({ code: 'SUBJECT_NOT_FOUND', message: 'Không tìm thấy môn học yêu cầu.' }),
            }) as unknown as RequestFunction

            await expect(getSubject(mockRequest, 'non-existent-id')).rejects.toThrow(ApiError)
        })

        it('ném ApiError khi gặp 400 Invalid ID', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                json: async () => ({ code: 'INVALID_PARAMS', message: 'Mã định danh môn học không đúng định dạng UUID.' }),
            }) as unknown as RequestFunction

            await expect(getSubject(mockRequest, 'invalid-uuid')).rejects.toThrow(ApiError)
        })
    })

    describe('createSubject (POST /api/v1/subjects)', () => {
        it('gửi payload tạo mới với header application/json', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', data: mockSubject }),
            }) as unknown as RequestFunction

            const payload = {
                code: 'CS101',
                name: 'Nhập môn lập trình',
                credits: 3,
                description: 'Kiến thức cơ bản',
                total_sessions: 45,
                status: 'draft' as const,
            }

            const result = await createSubject(mockRequest, payload)

            expect(mockRequest).toHaveBeenCalledWith('/api/v1/subjects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            expect(result.code).toBe('CS101')
        })

        it('ném ApiError khi gặp 409 Duplicate Code', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 409,
                json: async () => ({ code: 'DUPLICATE_CODE', message: 'Mã môn học đã tồn tại.' }),
            }) as unknown as RequestFunction

            await expect(
                createSubject(mockRequest, { code: 'CS101', name: 'Trùng mã', credits: 3 }),
            ).rejects.toThrow(ApiError)
        })

        it('ném ApiError khi gặp 400 Validation Error', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                json: async () => ({ code: 'INVALID_PARAMS', message: 'Số tín chỉ không hợp lệ.' }),
            }) as unknown as RequestFunction

            await expect(
                createSubject(mockRequest, { code: 'CS101', name: 'Sai tín chỉ', credits: 99 }),
            ).rejects.toThrow(ApiError)
        })
    })

    describe('updateSubject (PUT /api/v1/subjects/<id>)', () => {
        it('gửi payload cập nhật toàn phần thành công', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', data: mockSubject }),
            }) as unknown as RequestFunction

            const payload = {
                code: 'CS101-NEW',
                name: 'Nhập môn lập trình mới',
                credits: 4,
                description: null,
                total_sessions: null,
                status: 'active' as const,
            }

            const result = await updateSubject(mockRequest, mockSubject.id, payload)

            expect(mockRequest).toHaveBeenCalledWith(`/api/v1/subjects/${mockSubject.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            expect(result.id).toBe(mockSubject.id)
        })

        it('ném ApiError khi PUT trả về 404', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({ code: 'SUBJECT_NOT_FOUND', message: 'Không tìm thấy' }),
            }) as unknown as RequestFunction

            await expect(
                updateSubject(mockRequest, 'unknown-id', {
                    code: 'CS101',
                    name: 'Test',
                    credits: 3,
                }),
            ).rejects.toThrow(ApiError)
        })
    })

    describe('patchSubject (PATCH /api/v1/subjects/<id>)', () => {
        it('gửi payload cập nhật từng phần thành công', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { ...mockSubject, status: 'archived' },
                }),
            }) as unknown as RequestFunction

            const result = await patchSubject(mockRequest, mockSubject.id, { status: 'archived' })

            expect(mockRequest).toHaveBeenCalledWith(`/api/v1/subjects/${mockSubject.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'archived' }),
            })
            expect(result.status).toBe('archived')
        })
    })

    describe('deleteSubject (DELETE /api/v1/subjects/<id>)', () => {
        it('xóa môn học thành công với status 200', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    message: 'Xóa môn học thành công.',
                    data: { id: mockSubject.id },
                }),
            }) as unknown as RequestFunction

            const result = await deleteSubject(mockRequest, mockSubject.id)
            expect(mockRequest).toHaveBeenCalledWith(`/api/v1/subjects/${mockSubject.id}`, {
                method: 'DELETE',
            })
            expect(result.id).toBe(mockSubject.id)
        })

        it('ném ApiError với code SUBJECT_IN_USE khi bị xung đột 409', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 409,
                json: async () => ({
                    code: 'SUBJECT_IN_USE',
                    message:
                        'Không thể xóa môn học vì đang có dữ liệu liên quan. Hãy chuyển môn học sang trạng thái Đã lưu trữ nếu không còn sử dụng.',
                }),
            }) as unknown as RequestFunction

            await expect(deleteSubject(mockRequest, mockSubject.id)).rejects.toThrow(ApiError)
            try {
                await deleteSubject(mockRequest, mockSubject.id)
            } catch (err) {
                expect(err).toBeInstanceOf(ApiError)
                expect((err as ApiError).code).toBe('SUBJECT_IN_USE')
                expect((err as ApiError).status).toBe(409)
            }
        })

        it('ném ApiError khi xóa môn học không tồn tại (404)', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({ code: 'SUBJECT_NOT_FOUND', message: 'Không tìm thấy môn học yêu cầu.' }),
            }) as unknown as RequestFunction

            await expect(deleteSubject(mockRequest, 'non-existent-id')).rejects.toThrow(ApiError)
        })

        it('ném ApiError khi gặp 403 Forbidden', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 403,
                json: async () => ({ code: 'FORBIDDEN', message: 'Bạn không có quyền thực hiện thao tác này.' }),
            }) as unknown as RequestFunction

            await expect(deleteSubject(mockRequest, mockSubject.id)).rejects.toThrow(ApiError)
        })
    })

    describe('Aliases', () => {
        it('các aliases trỏ đúng tới các hàm nghiệp vụ', () => {
            expect(fetchSubjectsApi).toBe(getSubjects)
            expect(getSubjectApi).toBe(getSubject)
            expect(createSubjectApi).toBe(createSubject)
            expect(updateSubjectApi).toBe(updateSubject)
            expect(patchSubjectApi).toBe(patchSubject)
            expect(deleteSubjectApi).toBe(deleteSubject)
        })
    })
})
