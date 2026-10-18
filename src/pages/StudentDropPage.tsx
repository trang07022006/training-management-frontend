import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getStudentDetail, type StudentDetail } from '../api/studentApi'
import { dropStudent, type DropStudentPayload } from '../api/studentLifecycleApi'
import { PageHeader } from '../components/PageHeader'
import { getErrorMessage } from '../utils/errorMessages'
import { formatVietnamDate } from '../utils/dateUtils'
import './StudentLifecycle.css'

export function StudentDropPage() {
    const { studentId } = useParams<{ studentId: string }>()
    const [searchParams] = useSearchParams()
    const preselectedClassId = searchParams.get('classId') || ''
    const navigate = useNavigate()
    const { request: requestFn } = useSession()

    const [student, setStudent] = useState<StudentDetail | null>(null)
    const [scope, setScope] = useState<'single' | 'all'>('single')
    const [selectedClassId, setSelectedClassId] = useState<string>(preselectedClassId)
    const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().slice(0, 10))
    const [reason, setReason] = useState<string>('')

    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)

    useEffect(() => {
        let isMounted = true
        if (!studentId) {
            setErrorMessage('Mã học viên không hợp lệ.')
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setErrorMessage(null)

        getStudentDetail(requestFn, studentId)
            .then((data) => {
                if (!isMounted) return
                setStudent(data)

                const activeClasses = (data.current_classes && data.current_classes.length > 0)
                    ? data.current_classes
                    : (data.current_class ? [data.current_class] : [])

                if (preselectedClassId && activeClasses.some(c => (c.class_id || c.id) === preselectedClassId)) {
                    setSelectedClassId(preselectedClassId)
                } else if (activeClasses.length > 0) {
                    setSelectedClassId(activeClasses[0].class_id || activeClasses[0].id || '')
                }
                setIsLoading(false)
            })
            .catch((err) => {
                if (isMounted) {
                    setErrorMessage(getErrorMessage(err, 'Lỗi khi tải thông tin học viên.'))
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [studentId, preselectedClassId, requestFn])

    const availableClasses = (student?.current_classes && student.current_classes.length > 0)
        ? student.current_classes
        : (student?.current_class ? [student.current_class] : [])

    const selectedClass = availableClasses.find(c => (c.class_id || c.id) === selectedClassId)

    const handleOpenConfirm = (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)

        if (scope === 'single' && !selectedClassId) {
            setErrorMessage('Vui lòng chọn lớp học cần thôi học.')
            return
        }
        if (!effectiveDate) {
            setErrorMessage('Vui lòng chọn ngày hiệu lực thôi học.')
            return
        }
        if (!reason || reason.trim().length === 0) {
            setErrorMessage('Lý do thôi học là bắt buộc và không được chỉ chứa khoảng trắng.')
            return
        }
        if (reason.trim().length < 5) {
            setErrorMessage('Lý do thôi học phải có ít nhất 5 ký tự.')
            return
        }

        setShowConfirmModal(true)
    }

    const handleConfirmDrop = async () => {
        if (!studentId || !effectiveDate || !reason.trim()) return
        if (scope === 'single' && !selectedClassId) return

        setIsSubmitting(true)
        setErrorMessage(null)

        const payload: DropStudentPayload = {
            scope,
            class_id: scope === 'single' ? selectedClassId : undefined,
            effective_date: effectiveDate,
            reason: reason.trim(),
        }

        try {
            await dropStudent(requestFn, studentId, payload)
            setShowConfirmModal(false)
            const targetDesc = scope === 'all'
                ? 'toàn bộ khóa học'
                : `lớp ${selectedClass?.class_code || ''}`
            setSuccessMessage(
                `Xử lý thôi học ${targetDesc} thành công từ ngày ${formatVietnamDate(effectiveDate)}. Lịch sử học tập trước đây được bảo toàn nguyên vẹn.`
            )
        } catch (err: any) {
            setShowConfirmModal(false)
            setErrorMessage(getErrorMessage(err, 'Lỗi khi thực hiện thôi học học viên.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="lifecycle-container" data-testid="student-drop-page">
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    <span>Đang tải thông tin thôi học...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="lifecycle-container" data-testid="student-drop-page">
            <PageHeader
                title="Thôi học học viên"
                subtitle={student ? `${student.full_name} (${student.student_code})` : ''}
                breadcrumbs={[
                    { label: 'Học viên', path: '/students' },
                    { label: student?.full_name || 'Hồ sơ', path: `/students/${studentId}` },
                    { label: 'Thôi học' },
                ]}
            />

            {errorMessage && (
                <div className="lifecycle-alert error" role="alert" data-testid="alert-error">
                    <span>⚠️ {errorMessage}</span>
                </div>
            )}

            {successMessage && (
                <div className="lifecycle-alert success" role="alert" data-testid="alert-success">
                    <span>✓ {successMessage}</span>
                </div>
            )}

            {student && (
                <>
                    {/* THÔNG TIN HỌC VIÊN */}
                    <div className="lifecycle-card">
                        <div className="lifecycle-card-header">
                            <h3 className="lifecycle-card-title">
                                <span>👤</span> Thông tin học viên
                            </h3>
                        </div>
                        <div className="lifecycle-info-grid">
                            <div className="lifecycle-info-item">
                                <span className="lifecycle-info-label">Mã học viên</span>
                                <span className="lifecycle-info-value">{student.student_code}</span>
                            </div>
                            <div className="lifecycle-info-item">
                                <span className="lifecycle-info-label">Họ và tên</span>
                                <span className="lifecycle-info-value">{student.full_name}</span>
                            </div>
                            <div className="lifecycle-info-item">
                                <span className="lifecycle-info-label">Email</span>
                                <span className="lifecycle-info-value">{student.email || 'Chưa cập nhật'}</span>
                            </div>
                            <div className="lifecycle-info-item">
                                <span className="lifecycle-info-label">Chương trình</span>
                                <span className="lifecycle-info-value">{student.program_name || student.program_code || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* FORM THÔI HỌC */}
                    <div className="lifecycle-card">
                        <div className="lifecycle-card-header">
                            <h3 className="lifecycle-card-title">
                                <span>🛑</span> Thiết lập thôi học
                            </h3>
                        </div>

                        {successMessage ? (
                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                <p style={{ fontSize: '15px', color: '#166534', fontWeight: 500, marginBottom: '20px' }}>
                                    Thao tác thôi học đã được ghi nhận. Toàn bộ hồ sơ và lịch sử học tập trước đây vẫn được lưu trữ nguyên vẹn trong hệ thống.
                                </p>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => navigate(`/students/${studentId}`)}
                                    >
                                        Quay lại hồ sơ học viên
                                    </button>
                                </div>
                            </div>
                        ) : availableClasses.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                                <p>Học viên hiện không có lớp học nào đang tham gia để thực hiện thôi học.</p>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => navigate(`/students/${studentId}`)}
                                >
                                    Quay lại hồ sơ học viên
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleOpenConfirm}>
                                {/* CHỌN PHẠM VI */}
                                <div className="lifecycle-form-group">
                                    <label className="lifecycle-form-label">
                                        Phạm vi thôi học <span className="required">*</span>
                                    </label>
                                    <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type="radio"
                                                name="drop-scope"
                                                data-testid="radio-scope-single"
                                                value="single"
                                                checked={scope === 'single'}
                                                onChange={() => setScope('single')}
                                                disabled={isSubmitting}
                                            />
                                            Thôi học một lớp cụ thể
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type="radio"
                                                name="drop-scope"
                                                data-testid="radio-scope-all"
                                                value="all"
                                                checked={scope === 'all'}
                                                onChange={() => setScope('all')}
                                                disabled={isSubmitting}
                                            />
                                            Thôi học toàn bộ khóa học (tất cả các lớp)
                                        </label>
                                    </div>
                                </div>

                                {/* CHỌN LỚP NẾU SCOPE SINGLE */}
                                {scope === 'single' && (
                                    <div className="lifecycle-form-group">
                                        <label htmlFor="select-class" className="lifecycle-form-label">
                                            Lớp học áp dụng thôi học <span className="required">*</span>
                                        </label>
                                        <select
                                            id="select-class"
                                            data-testid="select-class"
                                            className="lifecycle-form-control"
                                            value={selectedClassId}
                                            onChange={(e) => setSelectedClassId(e.target.value)}
                                            disabled={isSubmitting}
                                        >
                                            <option value="">-- Chọn lớp học --</option>
                                            {availableClasses.map((cls, idx) => {
                                                const cid = cls.class_id || cls.id || String(idx)
                                                return (
                                                    <option key={cid} value={cid}>
                                                        {cls.class_code} {cls.name || cls.class_name ? `- ${cls.name || cls.class_name}` : ''}
                                                    </option>
                                                )
                                            })}
                                        </select>
                                        {selectedClass && (
                                            <div className="lifecycle-form-hint">
                                                Khai giảng: {selectedClass.expected_start_date || selectedClass.start_date ? formatVietnamDate(selectedClass.expected_start_date || selectedClass.start_date) : 'Chưa thiết lập'}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* NGÀY HIỆU LỰC */}
                                <div className="lifecycle-form-group">
                                    <label htmlFor="input-effective-date" className="lifecycle-form-label">
                                        Ngày hiệu lực thôi học <span className="required">*</span>
                                    </label>
                                    <input
                                        id="input-effective-date"
                                        data-testid="input-effective-date"
                                        type="date"
                                        className="lifecycle-form-control"
                                        value={effectiveDate}
                                        onChange={(e) => setEffectiveDate(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <div className="lifecycle-form-hint">
                                        Từ ngày này trở đi, học viên sẽ không còn xuất hiện trong danh sách điểm danh. Trước ngày hiệu lực, lịch sử điểm và điểm danh vẫn được giữ nguyên vẹn.
                                    </div>
                                </div>

                                {/* LÝ DO */}
                                <div className="lifecycle-form-group">
                                    <label htmlFor="input-reason" className="lifecycle-form-label">
                                        Lý do thôi học <span className="required">*</span>
                                    </label>
                                    <textarea
                                        id="input-reason"
                                        data-testid="input-reason"
                                        className="lifecycle-form-control"
                                        placeholder="Nhập lý do thôi học cụ thể (ví dụ: lý do cá nhân, điều kiện gia đình, chuyển nơi cư trú...)"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <div className="lifecycle-form-hint">
                                        Lý do là thông tin bắt buộc và được ghi vào lịch sử hồ sơ học viên.
                                    </div>
                                </div>

                                {/* TÁC ĐỘNG NGHIỆP VỤ */}
                                <div className="lifecycle-impact-box" style={{ borderLeftColor: '#ef4444' }}>
                                    <div className="lifecycle-impact-title" style={{ color: '#b91c1c' }}>
                                        <span>⚠️</span> Tác động nghiệp vụ:
                                    </div>
                                    <ul className="lifecycle-impact-list">
                                        {scope === 'single' ? (
                                            <li>Học viên sẽ thôi học tại lớp <strong>{selectedClass?.class_code || 'lớp đã chọn'}</strong> từ ngày <strong>{effectiveDate ? formatVietnamDate(effectiveDate) : '...'}</strong>. Các lớp khác của học viên hoàn toàn không bị ảnh hưởng.</li>
                                        ) : (
                                            <li>Học viên sẽ thôi học tại <strong>tất cả các lớp đang học ({availableClasses.length} lớp)</strong> và trạng thái hồ sơ chuyển sang Đã nghỉ học.</li>
                                        )}
                                        <li>Từ ngày hiệu lực, học viên không còn xuất hiện trong danh sách điểm danh của lớp tương ứng.</li>
                                        <li>Bảo toàn nguyên vẹn hồ sơ, điểm và điểm danh lịch sử đã ghi nhận trước ngày hiệu lực. Không tự xóa tài khoản đăng nhập.</li>
                                    </ul>
                                </div>

                                <div className="lifecycle-actions">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => navigate(`/students/${studentId}`)}
                                        disabled={isSubmitting}
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c' }}
                                        data-testid="btn-preview-drop"
                                        disabled={isSubmitting}
                                    >
                                        Xem lại & Xác nhận thôi học
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </>
            )}

            {/* CONFIRMATION MODAL */}
            {showConfirmModal && (
                <div className="lifecycle-modal-backdrop" data-testid="drop-modal">
                    <div className="lifecycle-modal-dialog">
                        <div className="lifecycle-modal-header">
                            <h4 style={{ color: '#b91c1c' }}>Xác nhận yêu cầu thôi học</h4>
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="lifecycle-modal-body">
                            <p style={{ margin: '0 0 12px 0' }}>
                                Vui lòng kiểm tra kỹ các thông tin thôi học trước khi hệ thống lưu thay đổi:
                            </p>

                            <div className="lifecycle-modal-summary">
                                <div className="lifecycle-modal-summary-row">
                                    <span className="lifecycle-modal-summary-label">Học viên:</span>
                                    <span className="lifecycle-modal-summary-val">{student?.full_name} ({student?.student_code})</span>
                                </div>
                                <div className="lifecycle-modal-summary-row">
                                    <span className="lifecycle-modal-summary-label">Phạm vi:</span>
                                    <span className="lifecycle-modal-summary-val">
                                        {scope === 'all' ? 'Toàn bộ khóa học (tất cả các lớp)' : `Một lớp (${selectedClass?.class_code})`}
                                    </span>
                                </div>
                                <div className="lifecycle-modal-summary-row">
                                    <span className="lifecycle-modal-summary-label">Ngày hiệu lực:</span>
                                    <span className="lifecycle-modal-summary-val">{formatVietnamDate(effectiveDate)}</span>
                                </div>
                                <div className="lifecycle-modal-summary-row">
                                    <span className="lifecycle-modal-summary-label">Lý do:</span>
                                    <span className="lifecycle-modal-summary-val" style={{ maxWidth: '280px', wordBreak: 'break-word', textAlign: 'right' }}>
                                        {reason.trim()}
                                    </span>
                                </div>
                            </div>

                            <p style={{ margin: 0, fontSize: '13px', color: '#b91c1c', background: '#fef2f2', padding: '10px 12px', borderRadius: '6px' }}>
                                ⚠️ Thao tác này sẽ cập nhật trạng thái học viên và danh sách điểm danh từ ngày hiệu lực.
                            </p>
                        </div>
                        <div className="lifecycle-modal-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setShowConfirmModal(false)}
                                disabled={isSubmitting}
                            >
                                Quay lại chỉnh sửa
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c' }}
                                data-testid="btn-confirm-drop"
                                onClick={handleConfirmDrop}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận thôi học'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
