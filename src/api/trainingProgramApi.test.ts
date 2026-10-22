// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import {
    getTrainingPrograms,
    getTrainingProgram,
    createTrainingProgram,
    updateTrainingProgram,
    patchTrainingProgram,
    deleteTrainingProgram,
    getProgramStatusLabel,
    type TrainingProgram,
    type RequestFunction,
    ApiError,
} from './trainingProgramApi'

describe('trainingProgramApi - API Client (SCRUM-122 Activity A6)', () => {
    const mockProgram: TrainingProgram = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        code: 'CNTT-K21',
        name: 'Công nghệ thông tin K21',
        description: 'Chương trình chuẩn',
        duration_semesters: 8,
        standard_tuition_fee: null,
        status: 'active',
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
    }

    describe('getProgramStatusLabel', () => {
        it('ánh xạ đúng nhãn trạng thái tiếng Việt', () => {
            expect(getProgramStatusLabel('draft')).toBe('Bản nháp')
            expect(getProgramStatusLabel('active')).toBe('Đang hoạt động')
            expect(getProgramStatusLabel('archived')).toBe('Đã lưu trữ')
            expect(getProgramStatusLabel(null)).toBe('Không xác định')
            expect(getProgramStatusLabel('other')).toBe('other')
        })
    })

    describe('getTrainingPrograms (GET /api/v1/training-programs)', () => {
        it('gọi đúng URL với URLSearchParams phân trang, tìm kiếm và trạng thái', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: {
                        items: [mockProgram],
                        total: 1,
                        page: 2,
                        page_size: 10,
                        total_pages: 1,
                    },
                }),
            }) as unknown as RequestFunction

            const result = await getTrainingPrograms(mockRequest, {
                page: 2,
                page_size: 10,
                status: 'active',
                search: 'CNTT',
            })

            expect(mockRequest).toHaveBeenCalledWith(
                '/api/v1/training-programs?page=2&page_size=10&status=active&search=CNTT',
                { method: 'GET' },
            )
            expect(result.items).toHaveLength(1)
            expect(result.items[0].code).toBe('CNTT-K21')
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

            const result = await getTrainingPrograms(mockRequest)
            expect(mockRequest).toHaveBeenCalledWith('/api/v1/training-programs', { method: 'GET' })
            expect(result.items).toEqual([])
        })

        it('ném ApiError khi gặp 401 Unauthorized', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 401,
                json: async () => ({ code: 'UNAUTHORIZED', message: 'Token expired' }),
            }) as unknown as RequestFunction

            await expect(getTrainingPrograms(mockRequest)).rejects.toThrow(ApiError)
        })

        it('ném ApiError khi gặp 403 Forbidden', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 403,
                json: async () => ({ code: 'FORBIDDEN', message: 'Permission denied' }),
            }) as unknown as RequestFunction

            await expect(getTrainingPrograms(mockRequest)).rejects.toThrow(ApiError)
        })

        it('ném ApiError khi gặp 500 Database Error', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                json: async () => ({ code: 'DATABASE_ERROR', message: 'DB fail' }),
            }) as unknown as RequestFunction

            await expect(getTrainingPrograms(mockRequest)).rejects.toThrow(ApiError)
        })
    })

    describe('getTrainingProgram (GET /api/v1/training-programs/<id>)', () => {
        it('gọi đúng đường dẫn và trả về chi tiết chương trình', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', data: mockProgram }),
            }) as unknown as RequestFunction

            const res = await getTrainingProgram(mockRequest, mockProgram.id)
            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/training-programs/${mockProgram.id}`,
                { method: 'GET' },
            )
            expect(res.id).toBe(mockProgram.id)
        })

        it('ném ApiError với PROGRAM_NOT_FOUND khi 404', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({ code: 'PROGRAM_NOT_FOUND', message: 'Không tìm thấy' }),
            }) as unknown as RequestFunction

            await expect(getTrainingProgram(mockRequest, 'unknown-id')).rejects.toThrow(
                'Không tìm thấy chương trình đào tạo.',
            )
        })
    })

    describe('createTrainingProgram (POST /api/v1/training-programs)', () => {
        it('gọi POST với header JSON và body phù hợp', async () => {
            const input = {
                code: 'KHMT-01',
                name: 'Khoa học máy tính',
                description: 'Mô tả',
                duration_semesters: 8,
                status: 'draft' as const,
            }
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                status: 201,
                json: async () => ({ status: 'success', data: { ...mockProgram, ...input } }),
            }) as unknown as RequestFunction

            const res = await createTrainingProgram(mockRequest, input)
            expect(mockRequest).toHaveBeenCalledWith('/api/v1/training-programs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            })
            expect(res.code).toBe('KHMT-01')
        })

        it('xử lý 409 DUPLICATE_CODE với thông báo tiếng Việt chuẩn', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 409,
                json: async () => ({ code: 'DUPLICATE_CODE', message: 'Mã đã tồn tại' }),
            }) as unknown as RequestFunction

            await expect(
                createTrainingProgram(mockRequest, { code: 'DUPLICATE', name: 'Test' }),
            ).rejects.toThrow('Mã chương trình đào tạo đã tồn tại.')
        })

        it('xử lý 400 validation error', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                json: async () => ({ code: 'CODE_REQUIRED', message: 'Mã chương trình là bắt buộc.' }),
            }) as unknown as RequestFunction

            await expect(
                createTrainingProgram(mockRequest, { code: '', name: 'Test' }),
            ).rejects.toThrow('Mã chương trình là bắt buộc.')
        })
    })

    describe('updateTrainingProgram (PUT /api/v1/training-programs/<id>)', () => {
        it('gọi PUT với payload đầy đủ', async () => {
            const input = {
                code: 'CNTT-K21-NEW',
                name: 'CNTT K21 Mới',
                description: null,
                duration_semesters: 9,
                status: 'active' as const,
            }
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', data: { ...mockProgram, ...input } }),
            }) as unknown as RequestFunction

            const res = await updateTrainingProgram(mockRequest, mockProgram.id, input)
            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/training-programs/${mockProgram.id}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(input),
                },
            )
            expect(res.name).toBe('CNTT K21 Mới')
        })

        it('xử lý 404 PROGRAM_NOT_FOUND', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({ code: 'PROGRAM_NOT_FOUND', message: 'Not found' }),
            }) as unknown as RequestFunction

            await expect(
                updateTrainingProgram(mockRequest, 'unknown-id', { code: 'X', name: 'Y' }),
            ).rejects.toThrow('Không tìm thấy chương trình đào tạo.')
        })
    })

    describe('patchTrainingProgram (PATCH /api/v1/training-programs/<id>)', () => {
        it('gọi PATCH với payload từng phần', async () => {
            const input = { name: 'Tên mới sau PATCH' }
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'success', data: { ...mockProgram, ...input } }),
            }) as unknown as RequestFunction

            const res = await patchTrainingProgram(mockRequest, mockProgram.id, input)
            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/training-programs/${mockProgram.id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(input),
                },
            )
            expect(res.name).toBe('Tên mới sau PATCH')
        })
    })

    describe('deleteTrainingProgram (DELETE /api/v1/training-programs/<id>)', () => {
        it('gọi DELETE thành công', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'success',
                    data: { id: mockProgram.id, deleted: true },
                }),
            }) as unknown as RequestFunction

            const res = await deleteTrainingProgram(mockRequest, mockProgram.id)
            expect(mockRequest).toHaveBeenCalledWith(
                `/api/v1/training-programs/${mockProgram.id}`,
                { method: 'DELETE' },
            )
            expect(res.id).toBe(mockProgram.id)
        })

        it('xử lý 409 PROGRAM_IN_USE với thông báo hướng dẫn tiếng Việt chuẩn', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 409,
                json: async () => ({
                    code: 'PROGRAM_IN_USE',
                    message: 'Đang có dữ liệu môn học liên kết',
                }),
            }) as unknown as RequestFunction

            await expect(deleteTrainingProgram(mockRequest, mockProgram.id)).rejects.toThrow(
                'Không thể xóa chương trình vì đang có dữ liệu liên quan. Hãy chuyển chương trình sang trạng thái Đã lưu trữ nếu không còn sử dụng.',
            )
        })

        it('xử lý 404 khi xóa chương trình không tồn tại', async () => {
            const mockRequest = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({
                    code: 'PROGRAM_NOT_FOUND',
                    message: 'Không tìm thấy',
                }),
            }) as unknown as RequestFunction

            await expect(deleteTrainingProgram(mockRequest, 'unknown-id')).rejects.toThrow(
                'Không tìm thấy chương trình đào tạo.',
            )
        })
    })
})
