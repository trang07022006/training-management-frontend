import React, { useState, useEffect, useCallback } from 'react'
import type { RequestFunction as RequestFn } from '../api/userApi'
import { listHolidays, createHoliday, deleteHoliday, type HolidayItem } from '../api/scheduleApi'
import './HolidaysManagementModal.css'

interface HolidaysManagementModalProps {
    requestFn: RequestFn
    canManage: boolean
    onClose: () => void
}

export const HolidaysManagementModal: React.FC<HolidaysManagementModalProps> = ({
    requestFn,
    canManage,
    onClose,
}) => {
    const [holidays, setHolidays] = useState<HolidayItem[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Form thêm ngày nghỉ lễ mới
    const [newDate, setNewDate] = useState('')
    const [newName, setNewName] = useState('')
    const [newDesc, setNewDesc] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const loadHolidays = useCallback(async () => {
        setLoading(true)
        setLoadError(null)
        setError(null)
        try {
            const data = await listHolidays(requestFn)
            const items = Array.isArray(data) ? data : ((data as any)?.items || [])
            setHolidays(items)
        } catch (err: any) {
            const msg = err?.message || 'Lỗi khi tải danh sách ngày nghỉ lễ.'
            setLoadError(msg)
            setError(msg)
        } finally {
            setLoading(false)
        }
    }, [requestFn])

    useEffect(() => {
        loadHolidays()
    }, [loadHolidays])

    const handleCreateHoliday = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newDate || !newName.trim()) {
            setError('Vui lòng chọn ngày và nhập tên ngày lễ.')
            return
        }

        setIsSubmitting(true)
        setError(null)
        setSuccessMessage(null)
        try {
            const created = await createHoliday(requestFn, {
                holiday_date: newDate,
                name: newName.trim(),
                description: newDesc.trim() || undefined,
            })
            setSuccessMessage(`Đã thêm ngày nghỉ lễ '${created.name}' (${created.holiday_date}) thành công.`)
            setNewDate('')
            setNewName('')
            setNewDesc('')
            await loadHolidays()
        } catch (err: any) {
            if (err?.code === 'HOLIDAY_ALREADY_EXISTS' || err?.code === 'HOLIDAY_DATE_ALREADY_EXISTS') {
                setError('Ngày này đã được khai báo là ngày nghỉ lễ trong hệ thống.')
            } else {
                setError(err?.message || 'Lỗi khi thêm ngày nghỉ lễ.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteHoliday = async (id: string, name: string, dateStr: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xoá ngày nghỉ '${name}' (${dateStr}) không?`)) {
            return
        }

        try {
            await deleteHoliday(requestFn, id)
            setHolidays(holidays.filter((h) => h.id !== id))
            setSuccessMessage(`Đã xoá ngày nghỉ '${name}' thành công.`)
        } catch (err: any) {
            setError(err?.message || 'Lỗi khi xoá ngày nghỉ lễ.')
        }
    }

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" data-testid="holidays-modal">
            <div className="holidays-modal-card">
                <div className="modal-header">
                    <div className="modal-title-wrap">
                        <h2>Quản lý ngày nghỉ lễ</h2>
                        <span className="modal-subtitle">
                            Các ngày nghỉ lễ được khai báo tại đây sẽ được tự động bỏ qua khi sinh thời khóa biểu
                        </span>
                    </div>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={onClose}
                        data-testid="close-holidays-modal"
                        aria-label="Đóng"
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <div className="holiday-alert error" data-testid="holiday-error-alert">
                        <span>⚠️ {error}</span>
                        <button type="button" className="btn-close-alert" onClick={() => setError(null)}>
                            ×
                        </button>
                    </div>
                )}

                {successMessage && (
                    <div className="holiday-alert success" data-testid="holiday-success-alert">
                        <span>✓ {successMessage}</span>
                        <button type="button" className="btn-close-alert" onClick={() => setSuccessMessage(null)}>
                            ×
                        </button>
                    </div>
                )}

                <div className="holidays-modal-body">
                    {/* Form thêm mới */}
                    {canManage && (
                        <form className="holiday-add-form" onSubmit={handleCreateHoliday} data-testid="create-holiday-form">
                            <h4>Khai báo ngày nghỉ lễ mới</h4>
                            <div className="holiday-form-row">
                                <div className="form-group">
                                    <label htmlFor="holiday-date-input">Ngày nghỉ (YYYY-MM-DD):</label>
                                    <input
                                        id="holiday-date-input"
                                        type="date"
                                        className="form-control"
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        data-testid="holiday-date-input"
                                        required
                                    />
                                </div>
                                <div className="form-group flex-2">
                                    <label htmlFor="holiday-name-input">Tên ngày nghỉ lễ:</label>
                                    <input
                                        id="holiday-name-input"
                                        type="text"
                                        className="form-control"
                                        placeholder="Ví dụ: Tết Dương lịch, Ngày Nhà giáo..."
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        data-testid="holiday-name-input"
                                        required
                                    />
                                </div>
                                <div className="form-group flex-2">
                                    <label htmlFor="holiday-desc-input">Ghi chú (tuỳ chọn):</label>
                                    <input
                                        id="holiday-desc-input"
                                        type="text"
                                        className="form-control"
                                        placeholder="Ghi chú thêm..."
                                        value={newDesc}
                                        onChange={(e) => setNewDesc(e.target.value)}
                                    />
                                </div>
                                <div className="form-group btn-col">
                                    <button
                                        type="submit"
                                        className="btn-add-holiday"
                                        disabled={isSubmitting}
                                        data-testid="btn-submit-holiday"
                                    >
                                        {isSubmitting ? 'Đang thêm...' : '+ Khai báo'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* Bảng danh sách */}
                    <div className="holiday-list-section">
                        <h4>Danh sách ngày nghỉ lễ đã khai báo {loadError ? '(Lỗi tải)' : `(${holidays.length})`}</h4>
                        {loading ? (
                            <div className="holiday-empty">Đang tải danh sách...</div>
                        ) : loadError ? (
                            <div className="holiday-empty error-text" data-testid="load-error-state" style={{ color: '#ef4444', textAlign: 'center', padding: '24px' }}>
                                <p style={{ fontWeight: 600, marginBottom: '6px' }}>Không thể tải danh sách ngày nghỉ lễ</p>
                                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>{loadError}</p>
                                <button
                                    type="button"
                                    onClick={loadHolidays}
                                    className="btn-secondary"
                                    data-testid="btn-retry-load-holidays"
                                >
                                    🔄 Thử lại
                                </button>
                            </div>
                        ) : holidays.length === 0 ? (
                            <div className="holiday-empty" data-testid="empty-holidays-state">
                                Chưa có ngày nghỉ lễ nào được khai báo.
                            </div>
                        ) : (
                            <div className="holiday-table-wrapper">
                                <table className="holiday-table" data-testid="holidays-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '130px' }}>Ngày nghỉ</th>
                                            <th>Tên ngày lễ</th>
                                            <th>Mô tả / Ghi chú</th>
                                            {canManage && <th style={{ width: '80px' }}>Thao tác</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {holidays.map((h) => (
                                            <tr key={h.id} data-testid={`holiday-row-${h.id}`}>
                                                <td>
                                                    <span className="holiday-date-badge">{h.holiday_date}</span>
                                                </td>
                                                <td>
                                                    <strong>{h.name}</strong>
                                                </td>
                                                <td>{h.description || '-'}</td>
                                                {canManage && (
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn-del-holiday"
                                                            onClick={() => handleDeleteHoliday(h.id, h.name, h.holiday_date)}
                                                            data-testid={`delete-holiday-${h.id}`}
                                                            title="Xoá ngày nghỉ"
                                                        >
                                                            🗑️ Xoá
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
