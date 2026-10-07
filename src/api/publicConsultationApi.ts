/**
 * Public Consultation API Client (SCRUM-125 - Activity A6).
 * Đăng ký / Gửi yêu cầu tư vấn công khai và lấy danh sách chương trình đào tạo mở công khai.
 * Hoàn toàn KHÔNG yêu cầu xác thực / Bearer token.
 */

import { getErrorMessage } from '../utils/errorMessages'
import { ApiError, type RequestFunction } from './userApi'

export { ApiError, type RequestFunction }

export interface PublicProgramOption {
    id: string
    code: string
    name: string
    description?: string | null
}

export interface PublicConsultationInput {
    full_name: string
    phone: string
    email?: string | null
    interested_program_id?: string | null
    message?: string | null
}

export interface PublicConsultationResponse {
    status: string
    message: string
    data: {
        id: string
    }
}

/**
 * Lấy danh sách chương trình đào tạo mở công khai cho form tư vấn.
 * GET /api/v1/public/training-programs
 * Không yêu cầu đăng nhập.
 */
export async function getPublicProgramOptions(
    requestFn?: RequestFunction,
    apiOrigin?: string,
): Promise<PublicProgramOption[]> {
    const fn = requestFn || fetch
    const basePath = '/api/v1/public/training-programs'
    const path = apiOrigin ? `${apiOrigin.replace(/\/$/, '')}${basePath}` : basePath

    const res = await fn(path, { method: 'GET' })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (res.status === 404 ? 'PROGRAM_NOT_FOUND' : 'DATABASE_ERROR')
        const message = getErrorMessage(
            { code, message: body.message },
            'Lỗi khi tải danh sách chương trình đào tạo.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data ?? []
}

/**
 * Gửi yêu cầu tư vấn tuyển sinh công khai.
 * POST /api/v1/public/consultations
 * Không yêu cầu đăng nhập.
 */
export async function submitPublicConsultation(
    payload: PublicConsultationInput,
    requestFn?: RequestFunction,
    apiOrigin?: string,
): Promise<PublicConsultationResponse> {
    const fn = requestFn || fetch
    const basePath = '/api/v1/public/consultations'
    const path = apiOrigin ? `${apiOrigin.replace(/\/$/, '')}${basePath}` : basePath

    const res = await fn(path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || (
            res.status === 400 ? 'INVALID_PARAMS' :
            res.status === 404 ? 'PROGRAM_NOT_FOUND' :
            'DATABASE_ERROR'
        )
        const message = getErrorMessage(
            { code, message: body.message },
            'Không thể gửi yêu cầu tư vấn. Vui lòng thử lại.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body as PublicConsultationResponse
}
