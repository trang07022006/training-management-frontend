import React, { useState, useEffect, useCallback } from 'react'
import type { RequestFunction as RequestFn } from '../api/userApi'
import { getClassSubjects, type ClassSubjectItem } from '../api/classApi'
import {
    previewClassSchedule,
    generateClassSchedule,
    getClassSchedules,
    type ClassScheduleItem,
    type SkippedHolidayItem,
    type ScheduleGeneratePayload,
} from '../api/scheduleApi'
import './ScheduleGenerationModal.css'

interface ScheduleGenerationModalProps {
    classItem: {
        id: string
        class_code: string
        expected_start_date?: string | null
    }
    requestFn: RequestFn
    canManage: boolean
    onClose: () => void
    onSuccess?: () => void
}

const PREDEFINED_SHIFTS = [
    { code: 'shift_1', label: 'Ca 1 (07:30 - 09:30)', start: '07:30', end: '09:30' },
    { code: 'shift_2', label: 'Ca 2 (09:45 - 11:45)', start: '09:45', end: '11:45' },
    { code: 'shift_3', label: 'Ca 3 (13:30 - 15:30)', start: '13:30', end: '15:30' },
    { code: 'shift_4', label: 'Ca 4 (15:45 - 17:45)', start: '15:45', end: '17:45' },
    { code: 'shift_5', label: 'Ca 5 (18:00 - 20:30)', start: '18:00', end: '20:30' },
    { code: 'custom', label: 'Tùy chỉnh giờ...', start: '', end: '' },
]

const DAYS_OF_WEEK_OPTIONS = [
    { id: 2, label: 'Thứ 2' },
    { id: 3, label: 'Thứ 3' },
    { id: 4, label: 'Thứ 4' },
    { id: 5, label: 'Thứ 5' },
    { id: 6, label: 'Thứ 6' },
    { id: 7, label: 'Thứ 7' },
    { id: 8, label: 'Chủ nhật' },
]

export const ScheduleGenerationModal: React.FC<ScheduleGenerationModalProps> = ({
    classItem,
    requestFn,
    canManage,
    onClose,
    onSuccess,
}) => {
    const [activeTab, setActiveTab] = useState<'view' | 'generate'>('view')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Dữ liệu môn học của lớp
    const [subjects, setSubjects] = useState<ClassSubjectItem[]>([])
    // Thời khóa biểu hiện có của lớp
    const [existingSchedules, setExistingSchedules] = useState<ClassScheduleItem[]>([])

    // Form cấu hình sinh thời khóa biểu
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
    const [selectedDays, setSelectedDays] = useState<number[]>([2, 4, 6]) // Mặc định Thứ 2, 4, 6
    const [selectedShift, setSelectedShift] = useState<string>('shift_1')
    const [customStartTime, setCustomStartTime] = useState<string>('07:30')
    const [customEndTime, setCustomEndTime] = useState<string>('09:30')
    const [startDate, setStartDate] = useState<string>(
        classItem.expected_start_date || new Date().toISOString().slice(0, 10)
    )
    const [totalSessions, setTotalSessions] = useState<number>(60) // Mặc định 60 buổi theo User Story
    const [overwriteExisting, setOverwriteExisting] = useState<boolean>(false)

    // Kết quả xem trước (Preview)
    const [previewList, setPreviewList] = useState<ClassScheduleItem[]>([])
    const [skippedHolidays, setSkippedHolidays] = useState<SkippedHolidayItem[]>([])
    const [isPreviewDone, setIsPreviewDone] = useState<boolean>(false)
    const [isSaving, setIsSaving] = useState<boolean>(false)

    // Load dữ liệu ban đầu
    const loadData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [subs, schedRes] = await Promise.all([
                getClassSubjects(requestFn, classItem.id).catch(() => []),
                getClassSchedules(requestFn, classItem.id).catch(() => ({ schedules: [] })),
            ])
            setSubjects(subs)
            if (subs.length > 0 && !selectedSubjectId) {
                setSelectedSubjectId(subs[0].subject_id)
            }
            setExistingSchedules(schedRes.schedules || [])
            if ((schedRes.schedules || []).length === 0) {
                // Nếu chưa có lịch, mở tab sinh lịch
                setActiveTab('generate')
            }
        } catch (err: any) {
            setError(err?.message || 'Lỗi khi tải thông tin lịch học của lớp.')
        } finally {
            setLoading(false)
        }
    }, [classItem.id, requestFn])

    useEffect(() => {
        loadData()
    }, [loadData])

    const toggleDay = (day: number) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter((d) => d !== day))
        } else {
            setSelectedDays([...selectedDays, day].sort())
        }
    }

    // Xem trước thời khóa biểu (AC 3)
    const handlePreview = async () => {
        setError(null)
        setSuccessMessage(null)

        if (selectedDays.length === 0) {
            setError('Vui lòng chọn ít nhất một thứ trong tuần.')
            return
        }
        if (!startDate) {
            setError('Vui lòng chọn ngày bắt đầu.')
            return
        }
        if (!totalSessions || totalSessions <= 0) {
            setError('Số buổi học phải lớn hơn 0.')
            return
        }

        const payload: ScheduleGeneratePayload = {
            days_of_week: selectedDays,
            shift: selectedShift !== 'custom' ? selectedShift : undefined,
            start_time: selectedShift === 'custom' ? customStartTime : undefined,
            end_time: selectedShift === 'custom' ? customEndTime : undefined,
            start_date: startDate,
            total_sessions: Number(totalSessions),
            subject_id: selectedSubjectId || undefined,
            overwrite: overwriteExisting,
        }

        setLoading(true)
        try {
            const res = await previewClassSchedule(requestFn, classItem.id, payload)
            setPreviewList(res.schedules || [])
            setSkippedHolidays(res.skipped_holidays || [])
            setIsPreviewDone(true)
        } catch (err: any) {
            setError(err?.message || 'Lỗi khi xem trước thời khóa biểu.')
            setIsPreviewDone(false)
        } finally {
            setLoading(false)
        }
    }

    // Xác nhận lưu thời khóa biểu (AC 1, 2, 4)
    const handleConfirmSave = async () => {
        setError(null)
        setSuccessMessage(null)

        const payload: ScheduleGeneratePayload = {
            days_of_week: selectedDays,
            shift: selectedShift !== 'custom' ? selectedShift : undefined,
            start_time: selectedShift === 'custom' ? customStartTime : undefined,
            end_time: selectedShift === 'custom' ? customEndTime : undefined,
            start_date: startDate,
            total_sessions: Number(totalSessions),
            subject_id: selectedSubjectId || undefined,
            overwrite: overwriteExisting,
        }

        setIsSaving(true)
        try {
            const res = await generateClassSchedule(requestFn, classItem.id, payload)
            setSuccessMessage(`Đã lưu thành công ${res.total_saved} buổi học vào thời khóa biểu!`)
            setExistingSchedules(res.schedules || [])
            setIsPreviewDone(false)
            setActiveTab('view')
            if (onSuccess) onSuccess()
        } catch (err: any) {
            if (err?.code === 'SCHEDULE_ALREADY_EXISTS') {
                setError(err.message + ' Hãy đánh dấu chọn "Ghi đè lịch đã có" để tiếp tục.')
            } else {
                setError(err?.message || 'Lỗi khi lưu thời khóa biểu.')
            }
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="schedule-modal">
            <div className="schedule-modal-card">
                <div className="modal-header">
                    <div className="modal-title-wrap">
                        <h2>Thời khóa biểu lớp {classItem.class_code}</h2>
                        <span className="modal-subtitle">
                            {existingSchedules.length > 0
                                ? `Hiện có ${existingSchedules.length} buổi học`
                                : 'Chưa có lịch học'}
                        </span>
                    </div>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={onClose}
                        data-testid="close-schedule-modal"
                        aria-label="Đóng"
                    >
                        ×
                    </button>
                </div>

                {/* Tabs chuyển đổi */}
                <div className="schedule-modal-tabs">
                    <button
                        type="button"
                        className={`tab-btn ${activeTab === 'view' ? 'active' : ''}`}
                        onClick={() => setActiveTab('view')}
                        data-testid="tab-view-schedule"
                    >
                        📅 Danh sách lịch học ({existingSchedules.length})
                    </button>
                    {canManage && (
                        <button
                            type="button"
                            className={`tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
                            onClick={() => setActiveTab('generate')}
                            data-testid="tab-generate-schedule"
                        >
                            ⚡ Sinh thời khóa biểu tự động (SCRUM-224)
                        </button>
                    )}
                </div>

                {error && (
                    <div className="schedule-alert error" data-testid="schedule-error-alert">
                        <span>⚠️ {error}</span>
                        <button type="button" className="btn-close-alert" onClick={() => setError(null)}>
                            ×
                        </button>
                    </div>
                )}

                {successMessage && (
                    <div className="schedule-alert success" data-testid="schedule-success-alert">
                        <span>✓ {successMessage}</span>
                        <button type="button" className="btn-close-alert" onClick={() => setSuccessMessage(null)}>
                            ×
                        </button>
                    </div>
                )}

                <div className="schedule-modal-body">
                    {/* TAB 1: DANH SÁCH LỊCH HIỆN CÓ */}
                    {activeTab === 'view' && (
                        <div className="schedule-view-tab">
                            {loading ? (
                                <div className="schedule-empty-state">Đang tải danh sách lịch học...</div>
                            ) : existingSchedules.length === 0 ? (
                                <div className="schedule-empty-state" data-testid="empty-schedules-state">
                                    <p>Lớp học chưa có thời khóa biểu.</p>
                                    {canManage && (
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={() => setActiveTab('generate')}
                                            data-testid="btn-go-generate"
                                        >
                                            Sinh thời khóa biểu ngay
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="schedule-table-wrapper">
                                    <table className="schedule-table" data-testid="schedules-list-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '60px' }}>Buổi</th>
                                                <th style={{ width: '120px' }}>Ngày học</th>
                                                <th style={{ width: '100px' }}>Ca / Giờ</th>
                                                <th>Nội dung bài học</th>
                                                <th style={{ width: '100px' }}>Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {existingSchedules.map((item) => (
                                                <tr key={item.id || item.session_number} data-testid={`schedule-row-${item.session_number}`}>
                                                    <td className="text-center font-bold">
                                                        #{item.session_number}
                                                    </td>
                                                    <td>
                                                        <span className="date-badge">{item.learning_date}</span>
                                                    </td>
                                                    <td>
                                                        <div className="time-text">
                                                            {item.shift ? (
                                                                <span className="shift-label">{item.shift}</span>
                                                            ) : (
                                                                `${item.start_time.slice(0, 5)} - ${item.end_time.slice(0, 5)}`
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="topic-text">{item.topic}</span>
                                                    </td>
                                                    <td>
                                                        <span className={`status-tag status-${item.status || 'scheduled'}`}>
                                                            {item.status === 'cancelled'
                                                                ? 'Đã huỷ'
                                                                : item.status === 'rescheduled'
                                                                ? 'Đã dời'
                                                                : 'Đã lên lịch'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: SINH THỜI KHÓA BIỂU TỰ ĐỘNG */}
                    {activeTab === 'generate' && canManage && (
                        <div className="schedule-generate-tab">
                            <div className="generate-form-card">
                                <h3>Khai báo mẫu sinh thời khóa biểu</h3>
                                <p className="form-helper">
                                    Hệ thống sẽ tự động tính toán các buổi học liên tiếp theo các thứ trong tuần đã chọn,
                                    tự động bỏ qua các ngày nghỉ lễ đã khai báo và gắn từng bài học trong môn vào từng buổi.
                                </p>

                                <div className="form-grid">
                                    {/* Môn học */}
                                    <div className="form-field full-width">
                                        <label htmlFor="gen-subject-select">Gắn bài học của môn học (AC 4):</label>
                                        <select
                                            id="gen-subject-select"
                                            className="form-control"
                                            value={selectedSubjectId}
                                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                                            data-testid="schedule-subject-select"
                                        >
                                            <option value="">-- Tự động sinh chủ đề buổi học --</option>
                                            {subjects.map((sub) => (
                                                <option key={sub.id} value={sub.subject_id}>
                                                    {sub.subject_code} - {sub.subject_name} ({sub.credits} tín chỉ)
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Các thứ trong tuần */}
                                    <div className="form-field full-width">
                                        <label>Các thứ trong tuần (AC 1):</label>
                                        <div className="weekday-selector" data-testid="weekday-selector">
                                            {DAYS_OF_WEEK_OPTIONS.map((day) => {
                                                const isSelected = selectedDays.includes(day.id)
                                                return (
                                                    <button
                                                        type="button"
                                                        key={day.id}
                                                        className={`weekday-chip ${isSelected ? 'selected' : ''}`}
                                                        onClick={() => toggleDay(day.id)}
                                                        data-testid={`day-chip-${day.id}`}
                                                    >
                                                        {day.label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Ca học */}
                                    <div className="form-field">
                                        <label htmlFor="gen-shift-select">Ca học (AC 1):</label>
                                        <select
                                            id="gen-shift-select"
                                            className="form-control"
                                            value={selectedShift}
                                            onChange={(e) => setSelectedShift(e.target.value)}
                                            data-testid="schedule-shift-select"
                                        >
                                            {PREDEFINED_SHIFTS.map((sh) => (
                                                <option key={sh.code} value={sh.code}>
                                                    {sh.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Giờ tùy chỉnh nếu chọn custom */}
                                    {selectedShift === 'custom' && (
                                        <div className="form-field time-range-field">
                                            <label>Giờ bắt đầu - Giờ kết thúc:</label>
                                            <div className="time-range-inputs">
                                                <input
                                                    type="time"
                                                    className="form-control"
                                                    value={customStartTime}
                                                    onChange={(e) => setCustomStartTime(e.target.value)}
                                                />
                                                <span>đến</span>
                                                <input
                                                    type="time"
                                                    className="form-control"
                                                    value={customEndTime}
                                                    onChange={(e) => setCustomEndTime(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Ngày bắt đầu */}
                                    <div className="form-field">
                                        <label htmlFor="gen-start-date">Ngày bắt đầu (AC 1):</label>
                                        <input
                                            id="gen-start-date"
                                            type="date"
                                            className="form-control"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            data-testid="schedule-start-date-input"
                                        />
                                    </div>

                                    {/* Tổng số buổi */}
                                    <div className="form-field">
                                        <label htmlFor="gen-total-sessions">Số buổi học cần sinh (AC 1):</label>
                                        <input
                                            id="gen-total-sessions"
                                            type="number"
                                            min={1}
                                            max={200}
                                            className="form-control"
                                            value={totalSessions}
                                            onChange={(e) => setTotalSessions(Number(e.target.value))}
                                            data-testid="schedule-total-sessions-input"
                                        />
                                    </div>

                                    {/* Ghi đè lịch cũ */}
                                    {existingSchedules.length > 0 && (
                                        <div className="form-field full-width checkbox-field">
                                            <label className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={overwriteExisting}
                                                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                                                    data-testid="schedule-overwrite-checkbox"
                                                />
                                                <span>
                                                    Ghi đè / thay thế thời khóa biểu hiện có ({existingSchedules.length} buổi)
                                                </span>
                                            </label>
                                        </div>
                                    )}
                                </div>

                                <div className="form-actions">
                                    <button
                                        type="button"
                                        className="btn-preview"
                                        onClick={handlePreview}
                                        disabled={loading}
                                        data-testid="btn-preview-schedule"
                                    >
                                        {loading ? 'Đang tính toán...' : '🔍 Xem trước thời khóa biểu (AC 3)'}
                                    </button>
                                </div>
                            </div>

                            {/* BẢNG XEM TRƯỚC (PREVIEW) */}
                            {isPreviewDone && (
                                <div className="preview-results-card" data-testid="preview-results-card">
                                    <div className="preview-header">
                                        <h4>Kết quả xem trước ({previewList.length} buổi học)</h4>
                                        <button
                                            type="button"
                                            className="btn-confirm-save"
                                            onClick={handleConfirmSave}
                                            disabled={isSaving}
                                            data-testid="btn-confirm-save-schedule"
                                        >
                                            {isSaving ? 'Đang lưu vào hệ thống...' : '💾 Xác nhận lưu lịch học chính thức'}
                                        </button>
                                    </div>

                                    {/* Banner thông báo ngày nghỉ lễ đã bỏ qua (AC 2) */}
                                    {skippedHolidays.length > 0 && (
                                        <div className="skipped-holidays-banner" data-testid="skipped-holidays-banner">
                                            <div className="banner-title">
                                                🎉 Hệ thống đã tự động bỏ qua {skippedHolidays.length} ngày nghỉ lễ (AC 2):
                                            </div>
                                            <ul className="holiday-list">
                                                {skippedHolidays.map((h, i) => (
                                                    <li key={i}>
                                                        <strong>{h.date}</strong> ({h.day_of_week}): {h.holiday_name}
                                                    </li>
                                                ))}
                                            </ul>
                                            <div className="banner-note">
                                                Lịch học vẫn được dời sang ngày học hợp lệ kế tiếp và đảm bảo sinh đủ {previewList.length} buổi học.
                                            </div>
                                        </div>
                                    )}

                                    <div className="schedule-table-wrapper preview-table-wrapper">
                                        <table className="schedule-table preview-table" data-testid="preview-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '60px' }}>Buổi</th>
                                                    <th style={{ width: '120px' }}>Ngày học</th>
                                                    <th style={{ width: '100px' }}>Thứ</th>
                                                    <th style={{ width: '150px' }}>Ca / Giờ học</th>
                                                    <th>Bài học gắn kèm (AC 4)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewList.map((item) => (
                                                    <tr key={item.session_number} data-testid={`preview-row-${item.session_number}`}>
                                                        <td className="text-center font-bold">#{item.session_number}</td>
                                                        <td>
                                                            <span className="date-badge">{item.learning_date}</span>
                                                        </td>
                                                        <td>{item.day_of_week}</td>
                                                        <td>
                                                            <span className="shift-label">{item.shift || `${item.start_time} - ${item.end_time}`}</span>
                                                        </td>
                                                        <td>
                                                            <span className="topic-text">{item.topic}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
