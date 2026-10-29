/**
 * Absence Alert API Client - SCRUM-257
 * Cảnh báo học viên vắng vượt ngưỡng và thông báo (AC1, AC2, AC3).
 */

import { getErrorMessage } from '../utils/errorMessages'
import { ApiError, type RequestFunction } from './userApi'
import type { AbsenceAlertInfo } from './attendanceSummaryApi'

export { ApiError, type RequestFunction }

export interface AbsenceAlertNotificationItem {
    id: string
    alert_id: string
    alert_round: number
    recipient_id: string
    recipient_role: string
    title: string
    message: string
    is_read: boolean
    read_at?: string | null
    created_at: string
}

export async function getMyAbsenceAlertNotifications(
    requestFn: RequestFunction,
    unreadOnly = false
): Promise<AbsenceAlertNotificationItem[]> {
    const query = unreadOnly ? '?unread_only=true' : ''
    const res = await requestFn(`/api/v1/absence-alerts/notifications/my${query}`, { method: 'GET' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            body.message || 'Không thể tải thông báo cảnh báo vắng.'
        )
        throw new ApiError(message, code, res.status)
    }
    return body.data || []
}

export async function markAbsenceAlertNotificationRead(
    requestFn: RequestFunction,
    notifId: string
): Promise<void> {
    const res = await requestFn(`/api/v1/absence-alerts/notifications/${notifId}/read`, { method: 'POST' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            body.message || 'Không thể cập nhật trạng thái thông báo.'
        )
        throw new ApiError(message, code, res.status)
    }
}

export async function getClassAbsenceAlerts(
    requestFn: RequestFunction,
    classId: string
): Promise<AbsenceAlertInfo[]> {
    const res = await requestFn(`/api/v1/classes/${classId}/absence-alerts`, { method: 'GET' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
        const code = body.code || 'API_ERROR'
        const message = getErrorMessage(
            { code, message: body.message, status: res.status },
            body.message || 'Không thể tải danh sách cảnh báo vắng của lớp.'
        )
        throw new ApiError(message, code, res.status)
    }
    return body.data || []
}
