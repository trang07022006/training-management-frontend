/**
 * Student API Client (SCRUM-215).
 * Quản lý học viên và chuyển đổi từ Lead sang hồ sơ học viên.
 */

import { getErrorMessage } from '../utils/errorMessages'
import { ApiError, type RequestFunction } from './userApi'
import type { Lead } from './leadApi'

export interface Student {
    id: string
    student_code: string
    full_name: string
    phone: string
    email: string | null
    program_id: string | null
    user_id: string | null
    lead_id: string | null
    status: string
    created_at: string | null
    updated_at: string | null
    program_code?: string | null
    program_name?: string | null
}

export interface ConvertLeadResult {
    student: Student
    lead: Lead
    user_id?: string | null
    account_created?: boolean
    email_sent?: boolean
}

/**
 * Chuyển đổi một Lead đã chốt sang hồ sơ học viên.
 * POST /api/v1/leads/<id>/convert-to-student
 */
export async function convertLeadToStudent(
    requestFn: RequestFunction,
    leadId: string,
): Promise<ConvertLeadResult> {
    const path = `/api/v1/leads/${encodeURIComponent(leadId.trim())}/convert-to-student`

    const res = await requestFn(path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            'Không thể chuyển đổi khách hàng thành học viên.',
        )
        throw new ApiError(message, code, res.status)
    }

    return body.data
}
