/**
 * Helpers định dạng ca học, phòng học, giảng viên hiển thị thân thiện trên giao diện.
 */

export interface ShiftInfo {
    code: string
    label: string
    start: string
    end: string
}

export const SHIFT_OPTIONS: ShiftInfo[] = [
    { code: 'shift_1', label: 'Ca 1 (07:30 - 09:30)', start: '07:30', end: '09:30' },
    { code: 'shift_2', label: 'Ca 2 (09:45 - 11:45)', start: '09:45', end: '11:45' },
    { code: 'shift_3', label: 'Ca 3 (13:30 - 15:30)', start: '13:30', end: '15:30' },
    { code: 'shift_4', label: 'Ca 4 (15:45 - 17:45)', start: '15:45', end: '17:45' },
    { code: 'shift_5', label: 'Ca 5 (18:00 - 20:30)', start: '18:00', end: '20:30' },
]

export const SHIFT_MAP: Record<string, ShiftInfo> = {
    shift_1: { code: 'shift_1', label: 'Ca 1 (07:30 - 09:30)', start: '07:30', end: '09:30' },
    shift_2: { code: 'shift_2', label: 'Ca 2 (09:45 - 11:45)', start: '09:45', end: '11:45' },
    shift_3: { code: 'shift_3', label: 'Ca 3 (13:30 - 15:30)', start: '13:30', end: '15:30' },
    shift_4: { code: 'shift_4', label: 'Ca 4 (15:45 - 17:45)', start: '15:45', end: '17:45' },
    shift_5: { code: 'shift_5', label: 'Ca 5 (18:00 - 20:30)', start: '18:00', end: '20:30' },
    shift_evening: { code: 'shift_5', label: 'Ca tối (18:00 - 20:30)', start: '18:00', end: '20:30' },
}

/**
 * Chuẩn hóa chuỗi thời gian thành dạng HH:MM có padding zero, tránh lỗi cắt chuỗi "7:30:".
 */
export function formatTimeStr(timeVal?: string | null): string {
    if (!timeVal) return ''
    const parts = timeVal.trim().split(':')
    if (parts.length >= 2) {
        const hour = parts[0].padStart(2, '0')
        const min = parts[1].padStart(2, '0')
        return `${hour}:${min}`
    }
    return timeVal.trim()
}

/**
 * Định dạng nhãn ca học và giờ học.
 * Đảm bảo:
 * - Khi có giờ thực tế khác giờ chuẩn của ca, hiển thị giờ thực tế đó.
 * - Không lặp lại chuỗi giờ hai lần dạng "(07:30 - 09:30) (07:30 - 09:30)".
 */
export function formatShiftLabel(code?: string | null, startTime?: string | null, endTime?: string | null): string {
    const s = startTime ? formatTimeStr(startTime) : null
    const e = endTime ? formatTimeStr(endTime) : null
    const hasCustomTime = Boolean(s && e)

    let shiftBase = ''
    if (code) {
        if (code.startsWith('shift_')) {
            shiftBase = `Ca ${code.replace('shift_', '')}`
        } else if (code === 'morning') {
            shiftBase = 'Ca sáng'
        } else if (code === 'afternoon') {
            shiftBase = 'Ca chiều'
        } else if (code === 'evening') {
            shiftBase = 'Ca tối'
        } else {
            shiftBase = code
        }
    }

    if (hasCustomTime) {
        return shiftBase ? `${shiftBase} (${s} - ${e})` : `${s} - ${e}`
    }

    if (code && SHIFT_MAP[code]) {
        return SHIFT_MAP[code].label
    }

    return shiftBase || 'Chưa xếp ca'
}

/**
 * Định dạng nhãn ca học và khoảng giờ thực tế chuẩn HH:mm, hiển thị đúng một lần duy nhất.
 * Ví dụ: "Ca 1 • 07:30–09:30".
 * Tránh hoàn toàn việc lặp lại giờ dạng "Ca 1 (07:30 - 09:30) • 7:30: - 9:30:".
 */
export function formatSessionShiftAndTime(
    shift?: string | null,
    startTime?: string | null,
    endTime?: string | null
): string {
    const s = startTime ? formatTimeStr(startTime) : ''
    const e = endTime ? formatTimeStr(endTime) : ''
    const timeRange = (s && e) ? `${s}–${e}` : (s || e || '')

    let shiftBase = ''
    if (shift && shift.trim()) {
        const raw = shift.trim()
        // Bỏ phần giờ trong ngoặc nếu chuỗi ca đã bị đính kèm giờ (ví dụ "Ca 1 (07:30 - 09:30)" -> "Ca 1")
        const stripped = raw.replace(/\s*\(.*?\)\s*/g, '').trim()
        if (stripped.startsWith('shift_')) {
            shiftBase = `Ca ${stripped.replace('shift_', '')}`
        } else if (stripped === 'morning') {
            shiftBase = 'Ca sáng'
        } else if (stripped === 'afternoon') {
            shiftBase = 'Ca chiều'
        } else if (stripped === 'evening') {
            shiftBase = 'Ca tối'
        } else if (stripped) {
            shiftBase = stripped
        }
    }

    if (shiftBase && timeRange) {
        return `${shiftBase} • ${timeRange}`
    }
    if (shiftBase) {
        return shiftBase
    }
    if (timeRange) {
        return timeRange
    }
    return 'Chưa xếp ca'
}

export function formatRoomLabel(roomId?: string | null, roomName?: string | null, isOnline?: boolean, onlineLink?: string | null): string {
    if (roomName && roomName.trim() && roomName.trim() !== 'Chưa xếp phòng') {
        return roomName.trim()
    }
    if (isOnline || onlineLink) {
        return 'Phòng học trực tuyến'
    }
    if (roomId && roomId.trim()) {
        const trimmed = roomId.trim()
        if (trimmed.length > 20) {
            return `Phòng ${trimmed.substring(0, 6)}...`
        }
        return trimmed
    }
    return 'Chưa xếp phòng'
}

export function formatInstructorLabel(instructorName?: string | null, instructorId?: string | null): string {
    if (instructorName && instructorName.trim()) return instructorName.trim()
    if (!instructorId) return 'Chưa phân công'
    if (instructorId.length > 20) {
        return `GV ${instructorId.substring(0, 6)}...`
    }
    return instructorId
}

/**
 * Ánh xạ trạng thái buổi học sang tiếng Việt (SCRUM-226).
 * Đảm bảo: updated/rescheduled không bị hiển thị thành "Đã hủy".
 */
export function formatScheduleStatus(status?: string | null): { label: string; className: string } {
    switch (status?.toLowerCase()) {
        case 'scheduled':
            return { label: 'Đã lên lịch', className: 'scheduled' }
        case 'in_progress':
        case 'ongoing':
            return { label: 'Đang diễn ra', className: 'in_progress' }
        case 'completed':
            return { label: 'Đã hoàn thành', className: 'completed' }
        case 'updated':
            return { label: 'Đã cập nhật', className: 'updated' }
        case 'rescheduled':
            return { label: 'Đã dời lịch', className: 'rescheduled' }
        case 'cancelled':
            return { label: 'Đã hủy', className: 'cancelled' }
        default:
            return { label: status || 'Chưa xác định', className: status || 'unknown' }
    }
}
