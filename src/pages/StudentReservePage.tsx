import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import { useSession } from '../auth/SessionProvider'
import { getStudentDetail, type StudentDetail } from '../api/studentApi'
import { reserveStudent, formatClassOptionLabel, type ReserveStudentPayload } from '../api/studentLifecycleApi'
import { PageHeader } from '../components/PageHeader'
import { getErrorMessage } from '../utils/errorMessages'
import { formatVietnamDate } from '../utils/dateUtils'
import { getStudentStatusBadge } from './StudentDetailPage'
import './StudentLifecycle.css'

export function StudentReservePage() {
    const { studentId } = useParams<{ studentId: string }>()
    const [searchParams] = useSearchParams()
    const preselectedClassId = searchParams.get('classId') || ''
    const navigate = useNavigate()
    const { request: requestFn } = useSession()

    const [student, setStudent] = useState<StudentDetail | null>(null)
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
                if (isMounted) {
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
                }
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

        if (!selectedClassId) {
            setErrorMessage('Vui lòng chọn lớp học cần bảo lưu.')
            return
        }
        if (!effectiveDate) {
            setErrorMessage('Vui lòng chọn ngày hiệu lực bảo lưu.')
            return
        }
        if (!reason || reason.trim().length === 0) {
            setErrorMessage('Lý do bảo lưu là bắt buộc và không được chỉ chứa khoảng trắng.')
            return
        }
        if (reason.trim().length < 5) {
            setErrorMessage('Lý do bảo lưu phải có ít nhất 5 ký tự.')
            return
        }

        setShowConfirmModal(true)
    }

    const handleConfirmReserve = async () => {
        if (!studentId || !selectedClassId || !effectiveDate || !reason.trim()) return

        setIsSubmitting(true)
        setErrorMessage(null)

        const payload: ReserveStudentPayload = {
            class_id: selectedClassId,
            effective_date: effectiveDate,
            reason: reason.trim(),
        }

        try {
            await reserveStudent(requestFn, studentId, payload)
            setShowConfirmModal(false)
            setSuccessMessage(
                `Bảo lưu học viên thành công từ ngày ${formatVietnamDate(effectiveDate)}. Học viên sẽ không còn xuất hiện trong danh sách điểm danh của lớp kể từ ngày này.`
            )
        } catch (err: any) {
            setShowConfirmModal(false)
            setErrorMessage(getErrorMessage(err, 'Lỗi khi thực hiện bảo lưu học viên.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="students-container lifecycle-container" data-testid="student-reserve-page">
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    <span>Đang tải thông tin học viên...</span>
                </div>
            </div>
        )
    }

    const studentStatus = student ? getStudentStatusBadge(student.status) : null

    return (
        <div className="students-container lifecycle-container" data-testid="student-reserve-page">
            <PageHeader
                title="Bảo lưu học viên"
                subtitle={student ? `Mã học viên: ${student.student_code} • ${student.full_name}` : ''}
                breadcrumbs={[
                    { label: 'Học viên', path: '/students' },
                    { label: student?.full_name || 'Hồ sơ', path: `/students/${studentId}` },
                    { label: 'Bảo lưu' },
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
                    {/* KHỐI TÓM TẮT HỌC VIÊN THU GỌN */}
                    <div className="lifecycle-student-summary" data-testid="student-summary-card">
                        <div className="lifecycle-summary-main">
                            <div className="lifecycle-summary-avatar">👤</div>
                            <div className="lifecycle-summary-text">
                                <div className="lifecycle-summary-name-row">
                                    <span className="lifecycle-summary-name">{student.full_name}</span>
                                    {studentStatus && (
                                        <span className={`status-badge ${studentStatus.className}`} data-testid="student-status-badge">
                                            {studentStatus.label}
                                        </span>
                                    )}
                                </div>
                                <div className="lifecycle-summary-meta">
                                    <span>Mã HV: <strong>{student.student_code}</strong></span>
                                    <span className="lifecycle-meta-sep">•</span>
                                    <span>Email: {student.email || 'Chưa cập nhật email'}</span>
                                    <span className="lifecycle-meta-sep">•</span>
                                    <span>SĐT: {student.phone || 'Chưa cập nhật SĐT'}</span>
                                    <span className="lifecycle-meta-sep">•</span>
                                    <span>
                                        Chương trình đăng ký của học viên:{' '}
                                        <strong className="lifecycle-program-text">
                                            {student.program_name || student.program_code || 'Chưa phân bổ chương trình'}
                                        </strong>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: '13px', padding: '6px 14px', flexShrink: 0 }}
                            onClick={() => navigate(`/students/${studentId}`)}
                        >
                            Xem hồ sơ
                        </button>
                    </div>

                    {/* FORM BẢO LƯU */}
                    <div className="lifecycle-card">
                        <div className="lifecycle-card-header">
                            <h3 className="lifecycle-card-title">
                                <span>📋</span> Thiết lập bảo lưu theo lớp
                            </h3>
                        </div>

                        {successMessage ? (
                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                <p style={{ fontSize: '15px', color: '#166534', fontWeight: 500, marginBottom: '20px' }}>
                                    Thao tác bảo lưu đã được lưu vào hệ thống và ghi nhận lịch sử hồ sơ học viên.
                                </p>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => navigate(`/students/${studentId}`)}
                                    >
                                        Về hồ sơ học viên
                                    </button>
                                    {selectedClassId && (
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={() => navigate(`/classes/${selectedClassId}`)}
                                        >
                                            Xem chi tiết lớp học
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : availableClasses.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                                <p>Học viên hiện không có lớp nào đang tham gia để thực hiện bảo lưu.</p>
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
                                <div className="lifecycle-form-grid-2">
                                    <div className="lifecycle-form-group">
                                        <label htmlFor="select-class" className="lifecycle-form-label">
                                            Lớp học áp dụng bảo lưu <span className="required">*</span>
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
                                                        {formatClassOptionLabel(cls)}
                                                    </option>
                                                )
                                            })}
                                        </select>
                                        {selectedClass && (
                                            <div className="lifecycle-form-hint">
                                                Khai giảng: {selectedClass.expected_start_date || selectedClass.start_date ? formatVietnamDate(selectedClass.expected_start_date || selectedClass.start_date) : 'Chưa thiết lập ngày khai giảng'}
                                                {selectedClass.program_name ? ` • Chương trình của lớp: ${selectedClass.program_name}` : ''}
                                            </div>
                                        )}
                                    </div>

                                    <div className="lifecycle-form-group">
                                        <label htmlFor="input-effective-date" className="lifecycle-form-label">
                                            Ngày hiệu lực bảo lưu <span className="required">*</span>
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
                                            Từ ngày này trở đi, học viên sẽ không còn xuất hiện trong danh sách điểm danh của lớp. Trước ngày hiệu lực, lịch sử điểm và điểm danh vẫn được giữ nguyên vẹn.
                                        </div>
                                    </div>
                                </div>

                                <div className="lifecycle-form-group">
                                    <label htmlFor="input-reason" className="lifecycle-form-label">
                                        Lý do bảo lưu <span className="required">*</span>
                                    </label>
                                    <textarea
                                        id="input-reason"
                                        data-testid="input-reason"
                                        className="lifecycle-form-control"
                                        placeholder="Nhập lý do bảo lưu cụ thể (ví dụ: lý do cá nhân, điều trị sức khỏe, tạm hoãn công tác...)"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <div className="lifecycle-form-hint">
                                        Lý do là thông tin bắt buộc và sẽ được lưu trữ minh bạch vào lịch sử hồ sơ học viên.
                                    </div>
                                </div>

                                {/* TÁC ĐỘNG NGHIỆP VỤ */}
                                <div className="lifecycle-impact-box">
                                    <div className="lifecycle-impact-title">
                                        <span>ℹ️</span> Tác động nghiệp vụ:
                                    </div>
                                    <ul className="lifecycle-impact-list">
                                        <li>Học viên sẽ được cập nhật trạng thái bảo lưu ở lớp được chọn từ ngày <strong>{effectiveDate ? formatVietnamDate(effectiveDate) : '...'}</strong>.</li>
                                        <li>Học viên sẽ không xuất hiện trong danh sách đủ điều kiện điểm danh từ ngày hiệu lực trở đi.</li>
                                        <li>Các buổi học và điểm danh diễn ra trước ngày hiệu lực vẫn được bảo toàn nguyên vẹn.</li>
                                        <li>Sĩ số lớp học sẽ được giải phóng kể từ ngày hiệu lực.</li>
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
                                        data-testid="btn-preview-reserve"
                                        disabled={isSubmitting}
                                    >
                                        Xem lại & Xác nhận bảo lưu
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </>
            )}

            {/* CONFIRMATION MODAL */}
            {showConfirmModal && (
                <div className="lifecycle-modal-backdrop" data-testid="reserve-modal">
                    <div className="lifecycle-modal-dialog">
                        <div className="lifecycle-modal-header">
                            <h4>Xác nhận yêu cầu bảo lưu học viên</h4>
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
                                Vui lòng kiểm tra kỹ các thông tin bảo lưu trước khi hệ thống lưu thay đổi:
                            </p>

                            <div className="lifecycle-modal-summary">
                                <div className="lifecycle-modal-summary-row">
                                    <span className="lifecycle-modal-summary-label">Học viên:</span>
                                    <span className="lifecycle-modal-summary-val">{student?.full_name} ({student?.student_code})</span>
                                </div>
                                <div className="lifecycle-modal-summary-row">
                                    <span className="lifecycle-modal-summary-label">Lớp học:</span>
                                    <span className="lifecycle-modal-summary-val">{formatClassOptionLabel(selectedClass)}</span>
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

                            <p style={{ margin: 0, fontSize: '13px', color: '#b45309', background: '#fffbeb', padding: '10px 12px', borderRadius: '6px' }}>
                                ⚠️ Thao tác này sẽ ghi nhận lịch sử hồ sơ học viên và cập nhật danh sách điểm danh từ ngày hiệu lực.
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
                                data-testid="btn-confirm-reserve"
                                onClick={handleConfirmReserve}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận bảo lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

