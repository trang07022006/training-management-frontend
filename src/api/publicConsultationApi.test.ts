import { describe, expect, it, vi } from 'vitest'
import {
    ApiError,
    getPublicProgramOptions,
    submitPublicConsultation,
    type PublicConsultationInput,
} from './publicConsultationApi'

describe('publicConsultationApi', () => {
    describe('getPublicProgramOptions', () => {
        it('gọi GET /api/v1/public/training-programs thành công và trả về danh sách chương trình', async () => {
            const mockPrograms = [
                { id: 'prog-1', code: 'SE01', name: 'Kỹ thuật phần mềm', description: 'Ngành hot' },
                { id: 'prog-2', code: 'CS01', name: 'Khoa học máy tính', description: null },
            ]

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ status: 'success', data: mockPrograms }),
            })

            const result = await getPublicProgramOptions(mockFetch)

            expect(mockFetch).toHaveBeenCalledWith('/api/v1/public/training-programs', {
                method: 'GET',
            })
            expect(result).toEqual(mockPrograms)
        })

        it('hỗ trợ truyền apiOrigin tùy biến', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ status: 'success', data: [] }),
            })

            await getPublicProgramOptions(mockFetch, 'https://api.ictu.edu.vn')

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.ictu.edu.vn/api/v1/public/training-programs',
                { method: 'GET' },
            )
        })

        it('ném ApiError với thông báo tiếng Việt khi backend trả về lỗi', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                json: async () => ({ code: 'DATABASE_ERROR', message: 'DB Failure' }),
            })

            await expect(getPublicProgramOptions(mockFetch)).rejects.toThrow(ApiError)
        })
    })

    describe('submitPublicConsultation', () => {
        it('gửi POST /api/v1/public/consultations với payload hợp lệ và nhận kết quả thành công', async () => {
            const payload: PublicConsultationInput = {
                full_name: 'Nguyễn Văn A',
                phone: '0912345678',
                email: 'nguyenvana@example.com',
                interested_program_id: '11111111-2222-3333-4444-555555555555',
                message: 'Cần tư vấn tuyển sinh',
            }

            const responseData = {
                status: 'success',
                message: 'Yêu cầu tư vấn của bạn đã được ghi nhận.',
                data: { id: 'lead-123' },
            }

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 201,
                json: async () => responseData,
            })

            const result = await submitPublicConsultation(payload, mockFetch)

            expect(mockFetch).toHaveBeenCalledWith('/api/v1/public/consultations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            expect(result).toEqual(responseData)
        })

        it('ném ApiError khi thiếu họ tên (NAME_REQUIRED - 400)', async () => {
            const payload: PublicConsultationInput = {
                full_name: '',
                phone: '0912345678',
            }

            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                json: async () => ({ code: 'NAME_REQUIRED', message: 'Họ và tên là bắt buộc.' }),
            })

            await expect(submitPublicConsultation(payload, mockFetch)).rejects.toThrow(ApiError)
        })

        it('ném ApiError khi chương trình không tồn tại (PROGRAM_NOT_FOUND - 404)', async () => {
            const payload: PublicConsultationInput = {
                full_name: 'Trần Văn B',
                phone: '0987654321',
                interested_program_id: 'non-existent-uuid',
            }

            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({ code: 'PROGRAM_NOT_FOUND', message: 'Không tìm thấy chương trình' }),
            })

            await expect(submitPublicConsultation(payload, mockFetch)).rejects.toThrow(ApiError)
        })

        it('ném ApiError khi xảy ra lỗi máy chủ (500)', async () => {
            const payload: PublicConsultationInput = {
                full_name: 'Lê Văn C',
                phone: '0905123456',
            }

            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                json: async () => ({ code: 'DATABASE_ERROR', message: 'Lỗi DB' }),
            })

            await expect(submitPublicConsultation(payload, mockFetch)).rejects.toThrow(ApiError)
        })
    })
})
