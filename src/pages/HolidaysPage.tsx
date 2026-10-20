import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { listHolidays, createHoliday, deleteHoliday, type HolidayItem } from '../api/scheduleApi'
import { PageHeader } from '../components/PageHeader'
import { ToastPortal } from '../components/ToastPortal'
import { getErrorMessage, getSuccessMessage } from '../utils/errorMessages'
import { SYSTEM_PERMISSIONS } from '../navigation/menuConfig'
import './ClassesPage.css'

export function HolidaysPage() {
    const navigate = useNavigate()
    const { request: requestFn, permissions, role, roles } = useSession()

    const effectiveRoles = roles && roles.length > 0 ? roles : (role ? [role] : [])
    const normalizedRoles = effectiveRoles.map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
    const canManage =
        permissions?.includes(SYSTEM_PERMISSIONS.COURSE_MANAGE) ||
        normalizedRoles.includes('admin') ||
        normalizedRoles.includes('training_manager')

    const [holidays, setHolidays] = useState<HolidayItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Form states
    const [holidayDate, setHolidayDate] = useState('')
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const loadHolidays = useCallback(async () => {
        setIsLoading(true)
        setLoadError(null)
        try {
            const data = await listHolidays(requestFn)
            const items = Array.isArray(data) ? data : ((data as any)?.items || [])
            setHolidays(items)
        } catch (err: unknown) {
            const msg = getErrorMessage(err, 'Lỗi khi tải danh sách ngày nghỉ lễ.')
            setLoadError(msg)
            setErrorMessage(msg)
        } finally {
            setIsLoading(false)
        }
    }, [requestFn])

    useEffect(() => {
        loadHolidays()
    }, [loadHolidays])

    const handleCreateHoliday = async (e: FormEvent) => {
        e.preventDefault()
        if (!holidayDate || !name.trim()) {
            setErrorMessage('Vui lòng chọn ngày và nhập tên ngày lễ.')
            return
        }

        setIsSubmitting(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            await createHoliday(requestFn, {
                holiday_date: holidayDate,
                name: name.trim(),
                description: description.trim() || undefined,
            })
            setSuccessMessage(`Đã thêm ngày nghỉ lễ "${name.trim()}" (${holidayDate}) thành công!`)
            setHolidayDate('')
            setName('')
            setDescription('')
            await loadHolidays()
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi thêm ngày nghỉ lễ.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteHoliday = async (holiday: HolidayItem) => {
        const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa ngày nghỉ "${holiday.name}" (${holiday.holiday_date})?`)
        if (!confirmed) return

        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            await deleteHoliday(requestFn, holiday.id)
            setSuccessMessage(getSuccessMessage('DELETE_HOLIDAY_SUCCESS', 'Đã xóa ngày nghỉ lễ thành công!'))
            await loadHolidays()
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, 'Lỗi khi xóa ngày nghỉ lễ.'))
        }
    }

    return (
        <div className="classes-container" data-testid="holidays-page">
            <ToastPortal
                error={errorMessage}
                success={successMessage}
                onCloseError={() => setErrorMessage(null)}
                onCloseSuccess={() => setSuccessMessage(null)}
                errorTestId="holidays-error-alert"
                successTestId="holidays-success-alert"
            />

            <PageHeader
                title="Quản lý ngày nghỉ lễ"
                subtitle="Cấu hình danh mục các ngày nghỉ lễ để thuật toán tự động bỏ qua khi sinh thời khóa biểu lớp học"
                breadcrumbs={[
                    { label: 'Lớp học', path: '/classes' },
                    { label: 'Ngày nghỉ lễ' },
                ]}
                actions={
                    <button
                        type="button"
                        className="btn-back"
                        onClick={() => navigate('/classes')}
                    >
                        Quay lại danh sách lớp
                    </button>
                }
            />

            <div style={{ display: 'grid', gridTemplateColumns: canManage ? '1fr 340px' : '1fr', gap: '24px', alignItems: 'start' }}>
                {/* BẢNG DANH SÁCH NGÀY NGHỈ LỄ */}
                <div className="modal-content" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                            Danh sách ngày nghỉ lễ {loadError ? '(Lỗi tải)' : `(${holidays.length})`}
                        </h3>
                    </div>

                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                            <span>Đang tải danh sách ngày nghỉ...</span>
                        </div>
                    ) : loadError ? (
                        <div
                            style={{ textAlign: 'center', padding: '32px', color: '#ef4444' }}
                            data-testid="holidays-load-error"
                        >
                            <p style={{ fontWeight: 600, marginBottom: '8px' }}>Không thể tải danh sách ngày nghỉ lễ</p>
                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>{loadError}</p>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={loadHolidays}
                                data-testid="btn-retry-load-holidays"
                            >
                                🔄 Thử lại
                            </button>
                        </div>
                    ) : holidays.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }} data-testid="empty-holidays-state">
                            <p>Chưa có ngày nghỉ lễ nào được cấu hình trong hệ thống.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="classes-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>Ngày nghỉ</th>
                                        <th>Tên ngày lễ</th>
                                        <th>Mô tả</th>
                                        {canManage && <th style={{ textAlign: 'right' }}>Thao tác</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {holidays.map((h) => (
                                        <tr key={h.id}>
                                            <td><strong>{h.holiday_date}</strong></td>
                                            <td>{h.name}</td>
                                            <td>{h.description || '—'}</td>
                                            {canManage && (
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        type="button"
                                                        className="btn-action-delete"
                                                        onClick={() => handleDeleteHoliday(h)}
                                                    >
                                                        Xóa
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

                {/* FORM THÊM NGÀY NGHỈ LỄ MỚI */}
                {canManage && (
                    <div className="modal-content" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                            Khai báo ngày nghỉ lễ mới
                        </h3>

                        <form onSubmit={handleCreateHoliday} noValidate>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label className="form-label" htmlFor="new-holiday-date">
                                    Ngày nghỉ lễ <span className="required">*</span>
                                </label>
                                <input
                                    id="new-holiday-date"
                                    type="date"
                                    className="form-input"
                                    value={holidayDate}
                                    onChange={(e) => setHolidayDate(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label className="form-label" htmlFor="new-holiday-name">
                                    Tên ngày lễ <span className="required">*</span>
                                </label>
                                <input
                                    id="new-holiday-name"
                                    type="text"
                                    className="form-input"
                                    placeholder="VD: Tết Nguyên Đán, Giỗ Tổ Hùng Vương..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label className="form-label" htmlFor="new-holiday-desc">
                                    Mô tả chi tiết
                                </label>
                                <textarea
                                    id="new-holiday-desc"
                                    className="form-textarea"
                                    rows={3}
                                    placeholder="Ghi chú thêm về ngày nghỉ..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn-primary"
                                style={{ width: '100%', justifyContent: 'center' }}
                                disabled={isSubmitting || !holidayDate || !name.trim()}
                            >
                                {isSubmitting ? 'Đang lưu...' : '+ Thêm ngày nghỉ lễ'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}
